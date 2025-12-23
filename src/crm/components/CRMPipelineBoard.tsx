// CRM Pipeline Board Component with Kanban functionality
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  User,
  Phone,
  MapPin,
  CurrencyDollar,
  Calendar,
  Clock,
  Warning,
  XCircle
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { CRMLead, CRMStage } from '../types';
import { CRM_STAGES } from '../constants';
import { getLeads, updateLead } from '../services/crmService';

// Pipeline Column Component
interface PipelineColumnProps {
  id: CRMStage;
  title: string;
  leads: CRMLead[];
  color: string;
  onLeadClick: (lead: CRMLead) => void;
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({ id, title, leads, color, onLeadClick }) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 min-h-[600px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${color}`}>
          {title}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          {leads.length}
        </span>
      </div>

      <SortableContext items={leads.map((lead, index) => lead.id || `lead-${index}`)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {leads.map((lead, index) => (
            <LeadCard key={lead.id || `lead-card-${index}`} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
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
  const [isDragging, setIsDragging] = useState(false);

  const priorityColors = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-gray-500'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        bg-white dark:bg-slate-700 rounded-lg p-3 shadow-sm border-l-4 cursor-pointer
        hover:shadow-md transition-all duration-200
        ${priorityColors[lead.priority]}
        ${isDragging ? 'opacity-50 rotate-2' : ''}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
          {lead.name}
        </h4>
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
          lead.priority === 'urgent' ? 'bg-red-100 text-red-800' :
          lead.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {lead.priority}
        </span>
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
    </motion.div>
  );
};

// Main Pipeline Board Component
const CRMPipelineBoard: React.FC = () => {
  const { leads, updateLead: updateCRMLead, loading, error, refreshLeads } = useCRM();
  const [columns, setColumns] = useState<Record<CRMStage, CRMLead[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);

  // Debug logging (after state declarations)
  console.log('🚀 CRMPipelineBoard render:', {
    leadsCount: leads.length,
    loading,
    error,
    columnsCount: Object.keys(columns).length,
    sampleLeads: leads.slice(0, 2).map(l => ({ name: l.name, stage: l.stage }))
  });

  // Try to use dnd-kit, fallback to basic version if it fails
  let sensors;
  try {
    sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      })
    );
  } catch (err) {
    console.warn('DnD sensors not available, using basic pipeline view');
    sensors = [];
  }

  // Load leads when component mounts
  useEffect(() => {
    if (leads.length === 0 && !loading.leads) {
      console.log('🔄 Pipeline: No leads loaded, refreshing...');
      refreshLeads();
    }
  }, [leads.length, loading.leads, refreshLeads]);

  // Force re-grouping when leads change
  useEffect(() => {
    console.log('🔄 Leads changed, forcing re-grouping...');
    // This will trigger the grouping useEffect
  }, [leads]);

  // Group leads by stage
  useEffect(() => {
    console.log('🔄 Pipeline: Processing leads:', leads.length);
    console.log('📊 Available CRM_STAGES keys:', Object.keys(CRM_STAGES));

    // Log each lead's details
    leads.forEach((lead, index) => {
      console.log(`📋 Lead ${index + 1}:`, {
        id: lead.id,
        name: lead.name,
        stage: `"${lead.stage}"`,
        stageType: typeof lead.stage,
        hasStage: !!lead.stage,
        stageInCRM_STAGES: lead.stage in CRM_STAGES
      });
    });

    const groupedLeads = leads.reduce((acc, lead) => {
      const stageKey = lead.stage;
      console.log(`🔄 Grouping lead "${lead.name}" into stage "${stageKey}"`);

      // Check if stage exists in CRM_STAGES
      if (!(stageKey in CRM_STAGES)) {
        console.error('❌ Unknown stage:', stageKey, '- Available:', Object.keys(CRM_STAGES));
        // Put unknown stages in lead_created as fallback
        if (!acc.lead_created) acc.lead_created = [];
        acc.lead_created.push(lead);
        return acc;
      }

      if (!acc[stageKey]) {
        acc[stageKey] = [];
      }
      acc[stageKey].push(lead);
      console.log(`✅ Added "${lead.name}" to ${stageKey} (now ${acc[stageKey].length} leads)`);
      return acc;
    }, {} as Record<CRMStage, CRMLead[]>);

    // Ensure all stages exist
    Object.keys(CRM_STAGES).forEach(stage => {
      if (!groupedLeads[stage as CRMStage]) {
        groupedLeads[stage as CRMStage] = [];
      }
      console.log(`📊 Final: Stage "${stage}": ${groupedLeads[stage as CRMStage].length} leads`);
    });

    console.log('🎯 Final columns object:', groupedLeads);
    console.log('🔄 Setting columns state...');
    setColumns(prevColumns => {
      console.log('📝 Previous columns state:', prevColumns);
      console.log('📝 New columns state:', groupedLeads);
      return groupedLeads;
    });
  }, [leads]);

  // Initialize columns only when leads are empty and not loading
  useEffect(() => {
    if (leads.length === 0 && !loading.leads) {
      const initialColumns = {} as Record<CRMStage, CRMLead[]>;
      Object.keys(CRM_STAGES).forEach(stage => {
        initialColumns[stage as CRMStage] = [];
      });
      console.log('🏁 Initializing columns with empty arrays (no leads)');
      setColumns(initialColumns);
    }
  }, [leads.length, loading.leads]);

  // Monitor columns state changes
  useEffect(() => {
    console.log('🔄 Columns state changed:', Object.entries(columns).map(([stage, leads]) => `${stage}: ${leads.length} leads`));
  }, [columns]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the lead being dragged
    const draggedLead = Object.values(columns).flat().find(lead => lead.id === activeId);
    if (!draggedLead) return;

    // Determine target stage
    let targetStage: CRMStage | null = null;

    // Check if dropped on a column
    if (Object.keys(CRM_STAGES).includes(overId)) {
      targetStage = overId as CRMStage;
    } else {
      // Find which column the item was dropped in
      for (const [stage, stageLeads] of Object.entries(columns)) {
        if (stageLeads.some(lead => lead.id === overId)) {
          targetStage = stage as CRMStage;
          break;
        }
      }
    }

    if (!targetStage || targetStage === draggedLead.stage) {
      setActiveId(null);
      return;
    }

    // Validate stage transition
    const currentStageInfo = CRM_STAGES[draggedLead.stage];
    const targetStageInfo = CRM_STAGES[targetStage];

    if (currentStageInfo.category === 'closed' && targetStageInfo.category !== 'closed') {
      alert('Cannot move a closed lead back to active stages');
      setActiveId(null);
      return;
    }

    try {
      // Update lead stage
      await updateLead(activeId, { stage: targetStage }, 'system');

      // Update local state
      setColumns(prev => {
        const newColumns = { ...prev };
        // Remove from old stage
        newColumns[draggedLead.stage] = newColumns[draggedLead.stage].filter(
          lead => lead.id !== activeId
        );
        // Add to new stage
        newColumns[targetStage] = [...(newColumns[targetStage] || []), {
          ...draggedLead,
          stage: targetStage
        }];
        return newColumns;
      });

      // Update CRM context
      updateCRMLead({ ...draggedLead, stage: targetStage });

    } catch (error) {
      console.error('Failed to update lead stage:', error);
      alert('Failed to update lead stage. Please try again.');
    }

    setActiveId(null);
  };

  const handleLeadClick = (lead: CRMLead) => {
    setSelectedLead(lead);
    // Navigate to lead detail
    window.history.pushState(null, '', `/crm/leads/${lead.id}`);
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
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
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
    console.log('📊 Rendering pipeline with columns:', Object.entries(columns).map(([stage, stageLeads]) => `${stage}: ${stageLeads.length} leads`));

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

          {/* Debug: Show raw leads data */}
          {leads.length === 0 && (
            <div key="debug-no-leads" className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">No leads found</p>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                Try clicking "Seed Sample Data" from the main CRM page to add test leads.
              </p>
            </div>
          )}
          {leads.length > 0 && (
            <div key="debug-found-leads" className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 font-medium">Debug: Found {leads.length} leads</p>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                {leads.slice(0, 3).map((lead, index) => (
                  <div key={`debug-lead-${lead.id || index}`} className="mb-1">
                    {index + 1}. {lead.name} - {lead.stage || 'no stage'}
                  </div>
                ))}
                {leads.length > 3 && <div key="debug-more-leads">... and {leads.length - 3} more</div>}
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Board */}
        {sensors && sensors.length > 0 ? (
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
                .map(([stageKey, stageInfo]) => {
                  const stageLeads = columns[stageKey as CRMStage] || [];
                  console.log(`🎯 Rendering column ${stageKey} (key: "${stageKey}"): ${stageLeads.length} leads`);
                  return (
                    <PipelineColumn
                      key={`pipeline-${stageKey}`}
                      id={stageKey as CRMStage}
                      title={stageInfo.label}
                      leads={stageLeads}
                      color={stageInfo.color.split(' ')[1]} // Extract text color class
                      onLeadClick={handleLeadClick}
                    />
                  );
                })}

            </div>

            <DragOverlay>
              {activeLead ? (
                <LeadCard lead={activeLead} onClick={() => {}} />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          // Fallback: Basic pipeline without drag-and-drop
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 overflow-x-auto pb-6">
            {Object.entries(CRM_STAGES)
              .filter(([, stage]) => stage.category !== 'closed') // Only show active stages
                .map(([stageKey, stageInfo]) => {
                const stageLeads = columns[stageKey as CRMStage] || [];
                console.log(`🎯 Rendering fallback column ${stageKey} (key: "fallback-${stageKey}"): ${stageLeads.length} leads`);
                return (
                  <PipelineColumn
                    key={`fallback-${stageKey}`}
                    id={stageKey as CRMStage}
                    title={stageInfo.label}
                    leads={stageLeads}
                    color={stageInfo.color.split(' ')[1]} // Extract text color class
                    onLeadClick={handleLeadClick}
                  />
                );
              })}
          </div>
        )}

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
    console.error('Pipeline component error:', err);
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
};

export default CRMPipelineBoard;
