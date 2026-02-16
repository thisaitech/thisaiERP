import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChartBar, CheckCircle, Gear, Kanban, Plus, Target, TrendUp, Users } from '@phosphor-icons/react'
import CRMDashboard from '../components/CRMDashboard'
import CRMLeadsList from '../components/CRMLeadsList'
import CRMPipelineBoard from '../components/CRMPipelineBoard'
import CreateLeadModal from '../components/CreateLeadModal'
import { ToastProvider, useToast } from '../components/Toast'
import { CRMProvider, useCRM } from '../contexts/CRMContext'
import CRMSettings from './CRMSettings'
import type { CRMLead } from '../types'
import { deleteLead as apiDeleteLead, saveLead } from '../services/admissionsCrmApi'

type CRMTabId = 'overview' | 'leads' | 'pipeline' | 'settings'

const crmTabs: Array<{
  id: CRMTabId
  label: string
  icon: React.ElementType
}> = [
  { id: 'overview', label: 'Overview', icon: ChartBar },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'settings', label: 'Settings', icon: Gear },
]

const KPI: React.FC<{
  title: string
  value: string | number
  icon: React.ElementType
  borderClass: string
  valueClass: string
  iconClass: string
}> = ({ title, value, icon: Icon, borderClass, valueClass, iconClass }) => {
  return (
    <div className={`erp-module-stat-card ${borderClass}`}>
      <div className="flex items-center gap-3">
        <div className={`erp-module-stat-icon ${iconClass}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="erp-module-stat-title text-slate-600 dark:text-slate-400">{title}</p>
          <p className={`erp-module-stat-value mt-1 ${valueClass}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

const CRMPageInner: React.FC = () => {
  const { showToast } = useToast()
  const { leads, dashboardMetrics, refreshLeads, refreshDashboard, deleteLead: deleteLeadFromState, updateLead } = useCRM()
  const [activeTab, setActiveTab] = useState<CRMTabId>('overview')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const metrics = useMemo(() => {
    const totalLeads = dashboardMetrics?.totalLeads ?? leads.length
    const admitted = dashboardMetrics?.statusCounts?.admitted ?? leads.filter((l) => l.status === 'admitted').length
    const lost = dashboardMetrics?.statusCounts?.lost ?? leads.filter((l) => l.status === 'lost').length
    const active = Math.max(totalLeads - admitted - lost, 0)
    const conversionRate =
      totalLeads > 0 ? Math.round((admitted / totalLeads) * 100) : Math.round(dashboardMetrics?.conversionRate ?? 0)
    return { totalLeads, active, admitted, conversionRate }
  }, [dashboardMetrics, leads])

  const handleCreateLead = () => setIsCreateOpen(true)

  const handleDeleteLead = async (lead: CRMLead) => {
    if (!lead?.id) return
    const ok = window.confirm(`Delete lead "${lead.name}"?`)
    if (!ok) return

    try {
      await apiDeleteLead(lead.id)
      deleteLeadFromState(lead.id)
      await Promise.all([refreshLeads(), refreshDashboard()])
      showToast('success', 'Lead deleted')
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete lead')
    }
  }

  const handleQuickAction = async (action: string, lead: CRMLead) => {
    if (action === 'call') return void window.open(`tel:${lead.phone}`, '_self')
    if (action === 'whatsapp') {
      const msg = encodeURIComponent(`Hi ${lead.name}, regarding admission enquiry.`)
      return void window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${msg}`, '_blank')
    }

    if (action === 'mark_admitted') {
      try {
        const next: CRMLead = { ...lead, stage: 'admitted', status: 'admitted' }
        const saved = await saveLead(next)
        updateLead(saved)
        await Promise.all([refreshLeads(), refreshDashboard()])
        showToast('success', 'Marked as admitted')
      } catch (err: any) {
        showToast('error', err?.message || 'Failed to update lead')
      }
    }
  }

  return (
    <div className="erp-module-page">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
          <KPI
            title="Total Leads"
            value={metrics.totalLeads}
            icon={Users}
            borderClass="border-blue-300"
            valueClass="text-blue-600"
            iconClass="bg-blue-50 text-blue-600"
          />
          <KPI
            title="Active Leads"
            value={metrics.active}
            icon={Target}
            borderClass="border-emerald-300"
            valueClass="text-emerald-600"
            iconClass="bg-emerald-50 text-emerald-600"
          />
          <KPI
            title="Admissions"
            value={metrics.admitted}
            icon={CheckCircle}
            borderClass="border-teal-300"
            valueClass="text-teal-700"
            iconClass="bg-teal-50 text-teal-700"
          />
          <KPI
            title="Conversion"
            value={`${metrics.conversionRate}%`}
            icon={TrendUp}
            borderClass="border-violet-300"
            valueClass="text-violet-600"
            iconClass="bg-violet-50 text-violet-600"
          />

          <button
            onClick={handleCreateLead}
            className="erp-module-primary-btn h-full justify-center text-base"
          >
            <Plus size={24} weight="bold" />
            New Lead
          </button>
        </div>

        {/* Tabs */}
        <div className="erp-module-panel mb-5">
          <div className="flex overflow-x-auto">
            {crmTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`erp-module-filter-chip flex items-center gap-2 m-2 whitespace-nowrap ${
                    isActive
                      ? 'is-active'
                      : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="erp-module-panel overflow-hidden"
        >
          {activeTab === 'overview' && <CRMDashboard />}
          {activeTab === 'leads' && (
            <CRMLeadsList onCreateLead={handleCreateLead} onDeleteLead={handleDeleteLead} onQuickAction={handleQuickAction} />
          )}
          {activeTab === 'pipeline' && <CRMPipelineBoard />}
          {activeTab === 'settings' && <CRMSettings />}
        </motion.div>

        <CreateLeadModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </div>
    </div>
  )
}

const CRMPage: React.FC = () => {
  return (
    <ToastProvider>
      <CRMProvider>
        <CRMPageInner />
      </CRMProvider>
    </ToastProvider>
  )
}

export default CRMPage
