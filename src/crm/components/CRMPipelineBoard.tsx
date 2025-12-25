// CRM Pipeline Board Component with Kanban functionality
import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  User,
  Phone,
  MapPin,
  CurrencyDollar,
  Clock,
  Warning,
  DotsThree,
  Eye,
  XCircle,
  Upload
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { CRMLead, CRMStage } from '../types';
import { CRM_STAGES } from '../constants';
import { getLeads, updateLead } from '../services/crmService';
import { useModal } from './Modal';

// Pipeline Column Component
interface PipelineColumnProps {
  id: CRMStage;
  title: string;
  leads: CRMLead[];
  color: string;
  onLeadClick: (lead: CRMLead) => void;
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({ id, title, leads, color, onLeadClick }) => {
  // Make the column droppable so cards can be dropped even on empty columns
  const { setNodeRef, isOver } = useDroppable({
    id: id, // Use the stage ID as the droppable ID
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-50 dark:bg-slate-800 rounded-lg p-4 min-h-[600px] transition-all duration-200 ${
        isOver ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${color}`}>
          {title}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          {leads.length}
        </span>
      </div>

      <SortableContext items={leads.map((lead, index) => lead.id || `lead-${index}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {leads.map((lead, index) => (
            <LeadCard key={lead.id || `lead-card-${index}`} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
          {leads.length === 0 && (
            <div className={`text-center py-8 text-slate-400 dark:text-slate-500 text-sm ${isOver ? 'text-blue-500' : ''}`}>
              {isOver ? 'Drop here' : 'No leads'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// Lead Card Component for Pipeline
interface LeadCardProps {
  lead: CRMLead;
  onClick: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  const [showMenu, setShowMenu] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id || `lead-${lead.name}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-gray-500'
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    // Use the onClick callback to open lead details instead of navigating to non-existent route
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm border-l-4 cursor-grab active:cursor-grabbing
        hover:shadow-md transition-all duration-200
        ${priorityColors[lead.priority]}
        ${isDragging ? 'opacity-50 rotate-2 z-50' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
          {lead.name}
        </h4>
        <div className="flex items-center gap-1">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            lead.priority === 'urgent' ? 'bg-red-100 text-red-800' :
            lead.priority === 'high' ? 'bg-orange-100 text-orange-800' :
            lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {lead.priority}
          </span>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
            >
              <DotsThree size={14} weight="bold" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 w-40">
                <button
                  onClick={handleViewDetails}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Eye size={14} />
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    // Open lead details - attachments can be handled in the detail view
                    onClick();
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Upload size={14} />
                  Upload Files
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 truncate">
        {lead.projectName}
      </p>

      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Phone size={12} className="text-slate-400" />
          <span className="text-xs text-slate-600 dark:text-slate-400">{lead.phone}</span>
        </div>

        {lead.expectedValue && (
          <div className="flex items-center gap-1">
            <CurrencyDollar size={12} className="text-slate-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              ₹{lead.expectedValue.toLocaleString()}
            </span>
          </div>
        )}

        {lead.city && (
          <div className="flex items-center gap-1">
            <MapPin size={12} className="text-slate-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">{lead.city}</span>
          </div>
        )}
      </div>

      {lead.nextFollowUpAt && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {format(lead.nextFollowUpAt, 'MMM dd')}
            </span>
          </div>
        </div>
      )}

      {lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date() && (
        <div className="mt-1 flex items-center gap-1">
          <Warning size={12} className="text-red-500" />
          <span className="text-xs text-red-600 dark:text-red-400">Overdue</span>
        </div>
      )}
    </div>
  );
};

// Props interface for Pipeline Board
interface CRMPipelineBoardProps {
  onViewLead?: (lead: CRMLead) => void;
}

// Main Pipeline Board Component
const CRMPipelineBoard: React.FC<CRMPipelineBoardProps> = ({ onViewLead }) => {
  const { leads, updateLead: updateCRMLead, loading, error, refreshLeads, settings } = useCRM();
  const { showAlert } = useModal();

  const [columns, setColumns] = useState<Record<CRMStage, CRMLead[]>>(() => {
    const initial: Record<CRMStage, CRMLead[]> = {} as Record<CRMStage, CRMLead[]>;
    Object.keys(CRM_STAGES).forEach(stage => {
      initial[stage as CRMStage] = [];
    });
    return initial;
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);

  // Get custom stage label from settings or fallback to default
  const getStageLabel = (stageKey: string): string => {
    if (settings?.pipelineStages && settings.pipelineStages[stageKey]) {
      return settings.pipelineStages[stageKey];
    }
    return CRM_STAGES[stageKey as CRMStage]?.label || stageKey;
  };

  // Configure dnd-kit sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load leads on mount only once
  useEffect(() => {
    if (leads.length === 0 && !loading.leads) {
      refreshLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group leads by stage - only when leads array reference changes
  useEffect(() => {
    const groupedLeads = {} as Record<CRMStage, CRMLead[]>;

    // Initialize all stages with empty arrays
    Object.keys(CRM_STAGES).forEach(stage => {
      groupedLeads[stage as CRMStage] = [];
    });

    // Group leads into their stages
    leads.forEach(lead => {
      const stageKey = lead.stage;
      if (stageKey in CRM_STAGES) {
        groupedLeads[stageKey].push(lead);
      } else {
        // Put unknown stages in lead_created as fallback
        groupedLeads.lead_created.push(lead);
      }
    });

    setColumns(groupedLeads);
  }, [leads]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the lead being dragged and which column it's currently in
    let draggedLead: CRMLead | undefined;
    let sourceStage: CRMStage | null = null;

    for (const [stage, stageLeads] of Object.entries(columns)) {
      const found = stageLeads.find(lead => lead.id === activeId);
      if (found) {
        draggedLead = found;
        sourceStage = stage as CRMStage;
        break;
      }
    }

    if (!draggedLead || !sourceStage) {
      setActiveId(null);
      return;
    }

    // Determine target stage
    let targetStage: CRMStage | null = null;

    // Check if dropped on a column (droppable zone) - the overId matches a stage key
    if (Object.keys(CRM_STAGES).includes(overId)) {
      targetStage = overId as CRMStage;
    } else {
      // Dropped on another lead card - find which column it belongs to
      for (const [stage, stageLeads] of Object.entries(columns)) {
        if (stageLeads.some(lead => lead.id === overId)) {
          targetStage = stage as CRMStage;
          break;
        }
      }
    }

    if (!targetStage || targetStage === sourceStage) {
      setActiveId(null);
      return;
    }

    // Validate stage transition
    const currentStageInfo = CRM_STAGES[sourceStage] || { category: 'active' };
    const targetStageInfo = CRM_STAGES[targetStage] || { category: 'active' };

    if (currentStageInfo.category === 'closed' && targetStageInfo.category !== 'closed') {
      showAlert('Cannot Move Lead', 'Cannot move a closed lead back to active stages');
      setActiveId(null);
      return;
    }

    try {
      // Create activities for significant stage changes
      try {
        const { createActivity } = await import('../services/crmService');

        if (targetStage === 'site_visit_scheduled') {
          const { createSiteVisit } = await import('../services/crmService');

          // Create a generic site visit (since we don't have specific details from drag)
          const visitDateTime = new Date();
          visitDateTime.setDate(visitDateTime.getDate() + 7); // Schedule for 1 week from now

          await createSiteVisit({
            leadId: activeId,
            engineerId: 'unassigned',
            engineerName: 'Unassigned',
            visitAt: visitDateTime,
            notes: 'Site visit scheduled via pipeline',
            checklist: {},
            createdBy: 'system'
          });

          await createActivity({
            leadId: activeId,
            type: 'site_visit',
            title: 'Site visit scheduled via pipeline',
            description: 'Site visit scheduled by moving lead to scheduled stage',
            scheduledAt: visitDateTime,
            createdBy: 'system'
          });

        } else if (targetStage === 'qualified') {
          await createActivity({
            leadId: activeId,
            type: 'call',
            title: 'Lead qualified',
            description: `Lead moved to qualified stage from ${sourceStage}`,
            createdBy: 'system'
          });

        } else {
          const targetLabel = getStageLabel(targetStage);
          const fromLabel = getStageLabel(sourceStage);
          await createActivity({
            leadId: activeId,
            type: 'note',
            title: `Stage changed to ${targetLabel}`,
            description: `Lead moved from ${fromLabel} to ${targetLabel}`,
            createdBy: 'system'
          });
        }

      } catch (activityError) {
        console.error('Failed to create activity record:', activityError);
        // Continue with stage update even if activity creation fails
      }

      // Update lead stage - skip transition validation for drag-and-drop
      await updateLead(activeId, { stage: targetStage, skipValidation: true } as any, 'system');

      // Update local state
      setColumns(prev => {
        const newColumns = { ...prev };
        // Ensure the source stage array exists before filtering
        if (newColumns[sourceStage]) {
          newColumns[sourceStage] = newColumns[sourceStage].filter(
            lead => lead.id !== activeId
          );
        }
        // Ensure the target stage array exists before adding
        if (!newColumns[targetStage]) {
          newColumns[targetStage] = [];
        }
        newColumns[targetStage] = [...newColumns[targetStage], {
          ...draggedLead,
          stage: targetStage
        }];
        return newColumns;
      });

      // Update CRM context
      updateCRMLead({ ...draggedLead, stage: targetStage });

    } catch (error) {
      console.error('Failed to update lead stage:', error);
    }

    setActiveId(null);
  };

  const handleLeadClick = (lead: CRMLead) => {
    if (onViewLead) {
      onViewLead(lead);
    }
  };

  const activeLead = activeId ? Object.values(columns).flat().find(lead => lead.id === activeId) : null;

  // Show loading state
  if (loading.leads) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || componentError) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Pipeline Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error || componentError}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="p-6 space-y-6">
        {/* Pipeline Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Sales Pipeline ({leads.length} leads total)
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Drag and drop leads between stages to track your sales progress
          </p>
        </div>

        {/* Pipeline Board with Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 overflow-x-auto pb-6">
            {Object.entries(CRM_STAGES)
              .filter(([, stage]) => stage.category !== 'closed') // Only show active stages
              .map(([stageKey, stageInfo]) => (
                <PipelineColumn
                  key={`pipeline-${stageKey}`}
                  id={stageKey as CRMStage}
                  title={getStageLabel(stageKey)}
                  leads={columns[stageKey as CRMStage] || []}
                  color={stageInfo.color.split(' ')[1]} // Extract text color class
                  onLeadClick={handleLeadClick}
                />
              ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <LeadCard lead={activeLead} onClick={() => {}} />
            ) : null}
          </DragOverlay>
        </DndContext>

      {/* Closed Leads Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Closed Leads Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Won Deals</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {columns.confirmed?.length || 0} confirmed leads
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {columns.confirmed?.length || 0}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Lost Leads</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {columns.lost?.length || 0} lost opportunities
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              {columns.lost?.length || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (err) {
    setComponentError(err instanceof Error ? err.message : 'Unknown error in pipeline component');
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Pipeline Component Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {err instanceof Error ? err.message : 'Unknown error occurred'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback render in case everything fails
  return (
    <div className="p-6 space-y-6" style={{ minHeight: '400px', backgroundColor: '#f8fafc' }}>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-center">
          <Warning className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Pipeline Component Fallback
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              The pipeline component reached an unexpected state. Check console for details.
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
              Leads: {leads.length}, Loading: {JSON.stringify(loading)}, Error: {error || 'none'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMPipelineBoard;
