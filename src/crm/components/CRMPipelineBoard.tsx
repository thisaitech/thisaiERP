import React, { useMemo, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Phone, Warning } from '@phosphor-icons/react'
import { CRM_PRIORITIES, CRM_STAGES, getStageLabel } from '../constants'
import { useCRM } from '../contexts/CRMContext'
import type { CRMLead, CRMStage } from '../types'
import { saveLead } from '../services/admissionsCrmApi'
import { useToast } from './Toast'

function stageToStatus(stage: CRMStage): CRMLead['status'] {
  if (stage === 'admitted') return 'admitted'
  if (stage === 'lost') return 'lost'
  if (stage === 'waiting') return 'waiting'
  return 'open'
}

const LeadCardContent: React.FC<{ lead: CRMLead }> = ({ lead }) => {
  const priority = CRM_PRIORITIES[lead.priority]

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
            {lead.courseInterest ? `Course: ${lead.courseInterest}` : 'Course: -'}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${priority.color}`}>{priority.label}</span>
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-slate-600 dark:text-slate-400">
        <Phone size={12} className="text-slate-400" />
        <span className="truncate">{lead.phone || '-'}</span>
      </div>
    </div>
  )
}

const DraggableLeadCard: React.FC<{ lead: CRMLead }> = ({ lead }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  })

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50' : undefined}
    >
      <LeadCardContent lead={lead} />
    </div>
  )
}

const StageColumn: React.FC<{
  stage: CRMStage
  title: string
  count: number
  leads: CRMLead[]
}> = ({ stage, title, count, leads }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 rounded-xl p-4 border ${
        isOver
          ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="px-2 py-1 bg-white dark:bg-slate-700 rounded-full text-sm text-slate-700 dark:text-slate-200">
          {count}
        </span>
      </div>

      <div className="space-y-3 min-h-[40px]">
        {leads.length === 0 ? (
          <p className="text-center py-4 text-sm text-slate-400">No leads</p>
        ) : (
          leads.map((lead) => <DraggableLeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  )
}

const CRMPipelineBoard: React.FC = () => {
  const { showToast } = useToast()
  const { leads, loading, error, settings, updateLead, refreshDashboard, refreshLeads } = useCRM()
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const orderedStages = useMemo(() => {
    return (Object.entries(CRM_STAGES) as Array<[CRMStage, (typeof CRM_STAGES)[CRMStage]]>).sort(
      (a, b) => a[1].order - b[1].order
    )
  }, [])

  const groupedLeads = useMemo(() => {
    const initial = {} as Record<CRMStage, CRMLead[]>
    for (const stageKey of Object.keys(CRM_STAGES) as CRMStage[]) initial[stageKey] = []

    for (const lead of leads) {
      const stage = lead.stage in CRM_STAGES ? lead.stage : 'enquiry_received'
      initial[stage as CRMStage].push(lead)
    }

    // Stable ordering: newest updates first inside each column.
    for (const stageKey of Object.keys(initial) as CRMStage[]) {
      initial[stageKey].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    }

    return initial
  }, [leads])

  const activeLead = useMemo(() => (activeLeadId ? leads.find((l) => l.id === activeLeadId) : null), [activeLeadId, leads])

  const onDragStart = (event: DragStartEvent) => {
    setActiveLeadId(String(event.active.id))
  }

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveLeadId(null)

    const overId = event.over?.id
    if (!overId) return

    const leadId = String(event.active.id)
    const nextStage = String(overId) as CRMStage
    if (!(nextStage in CRM_STAGES)) return

    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    if (lead.stage === nextStage) return

    const prev = lead
    const optimistic: CRMLead = { ...lead, stage: nextStage, status: stageToStatus(nextStage) }
    updateLead(optimistic)

    try {
      const saved = await saveLead(optimistic)
      updateLead(saved)
      await Promise.all([refreshLeads(), refreshDashboard()])
      showToast('success', 'Lead moved successfully')
    } catch (err: any) {
      updateLead(prev)
      showToast('error', err?.message || 'Failed to move lead')
    }
  }

  if (loading.leads) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
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
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Pipeline failed to load</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Admissions Pipeline ({leads.length} leads total)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Drag and drop leads between stages to track your admissions progress
        </p>

        <div className="overflow-x-auto pb-4 mt-6">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-4 min-w-max">
              {orderedStages.map(([stageKey]) => (
                <StageColumn
                  key={stageKey}
                  stage={stageKey}
                  title={getStageLabel(stageKey, settings?.stageLabels)}
                  count={groupedLeads[stageKey]?.length || 0}
                  leads={groupedLeads[stageKey] || []}
                />
              ))}
            </div>

            <DragOverlay>
              {activeLead ? (
                <div className="w-72">
                  <LeadCardContent lead={activeLead} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  )
}

export default CRMPipelineBoard

