import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Chat, CheckCircle, Funnel, MagnifyingGlass, Phone, Trash, User } from '@phosphor-icons/react'
import { useCRM } from '../contexts/CRMContext'
import { CRM_PRIORITIES, CRM_STAGES, getStageLabel } from '../constants'
import type { CRMFilters, CRMLead, CRMStage } from '../types'

interface LeadsFiltersProps {
  filters: CRMFilters
  stageLabels?: Partial<Record<CRMStage, string>>
  onChange: (filters: CRMFilters) => void
  onClear: () => void
}

const LeadsFilters: React.FC<LeadsFiltersProps> = ({ filters, stageLabels, onChange, onClear }) => {
  const [open, setOpen] = useState(false)
  const count = (filters.stage?.length || 0) + (filters.priority?.length || 0)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <Funnel size={16} />
        Filters
        {count > 0 ? <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{count}</span> : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50"
          >
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Stage</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(Object.keys(CRM_STAGES) as CRMStage[]).map((stageKey) => (
                    <label key={stageKey} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={filters.stage?.includes(stageKey) || false}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...(filters.stage || []), stageKey]
                            : (filters.stage || []).filter((s) => s !== stageKey)
                          onChange({ ...filters, stage: next })
                        }}
                      />
                      <span>{getStageLabel(stageKey, stageLabels)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Priority</p>
                <div className="space-y-2">
                  {Object.entries(CRM_PRIORITIES).map(([key, priority]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(key as any) || false}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...(filters.priority || []), key as any]
                            : (filters.priority || []).filter((p) => p !== (key as any))
                          onChange({ ...filters, priority: next })
                        }}
                      />
                      <span>{priority.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    onClear()
                    setOpen(false)
                  }}
                  className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Clear
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

const LeadCard: React.FC<{
  lead: CRMLead
  stageLabel: string
  onDelete: (lead: CRMLead) => void
  onQuickAction: (action: string, lead: CRMLead) => void
}> = ({ lead, stageLabel, onDelete, onQuickAction }) => {
  const priorityInfo = CRM_PRIORITIES[lead.priority]
  const stageInfo = CRM_STAGES[lead.stage]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
            {lead.courseInterest ? `Course: ${lead.courseInterest}` : 'Course: -'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${priorityInfo.color}`}>
            {priorityInfo.label}
          </span>
          <button
            onClick={() => onDelete(lead)}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-slate-400" />
          <span className="truncate">{lead.phone || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${stageInfo.color}`}>{stageLabel}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={() => onQuickAction('call', lead)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          title="Call"
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => onQuickAction('whatsapp', lead)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          title="WhatsApp"
        >
          <Chat size={18} />
        </button>
        <button
          onClick={() => onQuickAction('mark_admitted', lead)}
          className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
          title="Mark Admitted"
        >
          <CheckCircle size={18} weight="fill" />
        </button>
      </div>
    </motion.div>
  )
}

const CRMLeadsList: React.FC<{
  onCreateLead: () => void
  onDeleteLead: (lead: CRMLead) => void
  onQuickAction: (action: string, lead: CRMLead) => void
}> = ({ onCreateLead, onDeleteLead, onQuickAction }) => {
  const { leads, loading, filters, setFilters, settings } = useCRM()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = [...leads]

    if (filters.stage?.length) rows = rows.filter((l) => filters.stage!.includes(l.stage))
    if (filters.priority?.length) rows = rows.filter((l) => filters.priority!.includes(l.priority))

    if (!q) return rows
    return rows.filter((l) => {
      const hay = `${l.name} ${l.phone} ${l.email || ''} ${l.courseInterest || ''} ${l.source || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [filters.priority, filters.stage, leads, search])

  const clearFilters = () => setFilters({})

  if (loading.leads) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, phone, email, course..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <LeadsFilters filters={filters} stageLabels={settings?.stageLabels} onChange={setFilters} onClear={clearFilters} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
          <User size={54} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No leads found</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Get started by creating your first lead</p>
          <button
            onClick={onCreateLead}
            className="mt-5 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Create First Lead
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stageLabel={getStageLabel(lead.stage, settings?.stageLabels)}
              onDelete={onDeleteLead}
              onQuickAction={onQuickAction}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CRMLeadsList
