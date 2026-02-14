import React, { useEffect, useMemo } from 'react'
import { Clock, Warning } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { CRM_STAGES, getStageLabel } from '../constants'
import { useCRM } from '../contexts/CRMContext'
import type { CRMLead, CRMStage } from '../types'

const StageCard: React.FC<{
  stage: CRMStage
  label: string
  count: number
  total: number
  colorText: string
}> = ({ label, count, total, colorText }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  const barColor = colorText.replace('text-', 'bg-').replace('-800', '-500').replace('-700', '-500').replace('-600', '-500')

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</h3>
        <span className={`text-lg font-bold ${colorText}`}>{count}</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{percentage}% of total</p>
    </div>
  )
}

const CRMDashboard: React.FC = () => {
  const { leads, dashboardMetrics, loading, error, refreshDashboard, settings } = useCRM()

  useEffect(() => {
    void refreshDashboard()
  }, [])

  const totalLeads = dashboardMetrics?.totalLeads ?? leads.length
  const stageCounts = dashboardMetrics?.stageCounts
  const statusCounts = dashboardMetrics?.statusCounts

  const recentLeads = useMemo(() => {
    const rows = [...leads]
    rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    return rows.slice(0, 5)
  }, [leads])

  const upcomingFollowUps = useMemo(() => {
    const now = Date.now()
    const rows = leads
      .filter((l) => l.nextFollowUpAt && !Number.isNaN(Date.parse(l.nextFollowUpAt)) && Date.parse(l.nextFollowUpAt) >= now)
      .sort((a, b) => Date.parse(a.nextFollowUpAt!) - Date.parse(b.nextFollowUpAt!))
    return rows.slice(0, 5)
  }, [leads])

  const overdueFollowUps = useMemo(() => {
    const now = Date.now()
    const rows = leads
      .filter((l) => l.nextFollowUpAt && !Number.isNaN(Date.parse(l.nextFollowUpAt)) && Date.parse(l.nextFollowUpAt) < now)
      .sort((a, b) => Date.parse(b.nextFollowUpAt!) - Date.parse(a.nextFollowUpAt!))
    return rows.slice(0, 3)
  }, [leads])

  const performance = useMemo(() => {
    const admitted = statusCounts?.admitted ?? leads.filter((l) => l.status === 'admitted').length
    const lost = statusCounts?.lost ?? leads.filter((l) => l.status === 'lost').length
    const averageFee =
      leads.length > 0
        ? Math.round(
            leads.reduce((sum, l) => sum + (typeof l.expectedFee === 'number' ? l.expectedFee : 0), 0) / Math.max(leads.length, 1)
          )
        : 0
    const admissionRate = totalLeads > 0 ? Math.round((admitted / totalLeads) * 100) : 0
    const lossRate = totalLeads > 0 ? Math.round((lost / totalLeads) * 100) : 0
    return { admitted, lost, averageFee, admissionRate, lossRate }
  }, [leads, statusCounts, totalLeads])

  const currencySymbol = settings?.currencySymbol || '\u20B9'

  if (loading.dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Warning size={20} className="text-red-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading dashboard</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Pipeline Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(Object.keys(CRM_STAGES) as CRMStage[]).map((stageKey) => {
            const stage = CRM_STAGES[stageKey]
            const count = stageCounts?.[stageKey] ?? leads.filter((l) => l.stage === stageKey).length
            const colorText = stage.color.split(' ')[1] || 'text-slate-700'
            return (
              <StageCard
                key={stageKey}
                stage={stageKey}
                label={getStageLabel(stageKey, settings?.stageLabels)}
                count={count}
                total={totalLeads}
                colorText={colorText}
              />
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Activities</h2>
          <div className="space-y-3">
            {recentLeads.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-10">No recent activities</p>
            ) : (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      Updated: {lead.updatedAt ? format(new Date(lead.updatedAt), 'MMM dd, hh:mm a') : '-'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {getStageLabel(lead.stage, settings?.stageLabels)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Upcoming Follow-ups</h2>
          <div className="space-y-3">
            {upcomingFollowUps.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-10">No upcoming follow-ups</p>
            ) : (
              upcomingFollowUps.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {lead.nextFollowUpAt ? format(new Date(lead.nextFollowUpAt), 'MMM dd, hh:mm a') : '-'}
                    </p>
                  </div>
                  <Clock size={18} className="text-yellow-700 dark:text-yellow-400" />
                </div>
              ))
            )}

            {overdueFollowUps.length > 0 ? (
              <div className="pt-4">
                <p className="text-xs font-semibold text-red-600 dark:text-red-300 mb-2">Overdue</p>
                <div className="space-y-2">
                  {overdueFollowUps.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                      <span className="truncate">{lead.name}</span>
                      <span className="text-red-600 dark:text-red-300">
                        {lead.nextFollowUpAt ? format(new Date(lead.nextFollowUpAt), 'MMM dd') : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Performance Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {currencySymbol}
              {performance.averageFee.toLocaleString('en-IN')}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Average Expected Fee</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">{performance.admissionRate}%</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Admission Rate</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">{performance.lossRate}%</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Loss Rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CRMDashboard
