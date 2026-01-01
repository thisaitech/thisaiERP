// Main CRM Page Component
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChartBar,
  Users,
  Kanban,
  Gear,
  Plus,
  Buildings,
  Target,
  CheckCircle,
  TrendUp
} from '@phosphor-icons/react';
import { CRMProvider, useCRM } from '../contexts/CRMContext';
import CRMDashboard from '../components/CRMDashboard';
import CRMLeadsList from '../components/CRMLeadsList';
import CRMLeadDetail from './CRMLeadDetail';
import CRMPipelineBoard from '../components/CRMPipelineBoard';
import CRMSettings from './CRMSettings';
import CreateLeadModal from '../components/CreateLeadModal';
import { ToastProvider, useToast } from '../components/Toast';
import { ModalProvider, useModal } from '../components/Modal';
import { CRMLead } from '../types';
import { createSiteVisit, updateLead, getEngineers, CRMEngineer } from '../services/crmService';

// Schedule Visit Modal Component
interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CRMLead | null;
  engineers: CRMEngineer[];
  onSuccess: () => void;
  onRefresh: () => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({ isOpen, onClose, lead, engineers, onSuccess, onRefresh, showToast }) => {
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [engineer, setEngineer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!lead || !visitDate || !visitTime) {
      showToast('warning', 'Please fill in all required fields (date and time)');
      return;
    }

    if (!lead.id) {
      showToast('error', 'Lead ID is missing. Cannot schedule visit.');
      return;
    }

    setLoading(true);
    try {
      const visitDateTime = new Date(`${visitDate}T${visitTime}`);

      // Get engineer details
      const selectedEngineer = engineers.find(eng => eng.id === engineer);
      const engineerId = engineer && engineer.trim() !== '' ? engineer : 'unassigned';
      const engineerName = selectedEngineer?.name || 'Unassigned';

      // Create the site visit with empty checklist
      await createSiteVisit({
        leadId: lead.id,
        engineerId: engineerId,
        engineerName: engineerName,
        visitAt: visitDateTime,
        notes: notes.trim() || '',
        checklist: {},
        createdBy: 'user'
      });

      // Also create an activity for the site visit
      const { createActivity } = await import('../services/crmService');
      const createdActivity = await createActivity({
        leadId: lead.id,
        type: 'site_visit',
        title: `Site visit scheduled with ${engineerName}`,
        description: notes.trim() || 'Site visit scheduled',
        scheduledAt: visitDateTime,
        createdBy: 'user'
      });

      // Update lead stage to site_visit_scheduled
      await updateLead(lead.id, {
        stage: 'site_visit_scheduled',
        nextFollowUpAt: visitDateTime
      }, 'user');

      // Refresh data to show updates
      onRefresh();

      showToast('success', 'Site visit scheduled successfully!');
      onSuccess();
    } catch (error) {
      showToast('error', `Failed to schedule visit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setVisitDate('');
      setVisitTime('');
      setEngineer('');
      setNotes('');
    }
  };

  if (!lead) return null;

  return (
    <>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={handleClose} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Schedule Site Visit
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Schedule a site visit for <strong>{lead.name}</strong> - {lead.projectName}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Visit Date *
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Visit Time *
                    </label>
                    <input
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Engineer
                    </label>
                    <select
                      value={engineer}
                      onChange={(e) => setEngineer(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select Engineer</option>
                      {engineers.map((eng, index) => (
                        <option key={eng.id || `eng-${index}`} value={eng.id}>
                          {eng.name} ({eng.specialization})
                        </option>
                      ))}
                      {engineers.length === 0 && (
                        <>
                          <option key="eng1" value="engineer1">John Smith (Senior Engineer)</option>
                          <option key="eng2" value="engineer2">Sarah Johnson (Project Engineer)</option>
                          <option key="eng3" value="engineer3">Mike Davis (Site Engineer)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      placeholder="Additional notes for the site visit..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedule}
                    disabled={loading || !visitDate || !visitTime}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Scheduling...' : 'Schedule Visit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Tab definitions
const crmTabs = [
  {
    id: 'overview',
    label: 'Overview',
    icon: ChartBar,
    component: CRMDashboard
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: Users,
    component: CRMLeadsList
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: Kanban,
    component: CRMPipelineBoard
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Gear,
    component: CRMSettings
  }
];

// CRM Layout Component
interface CRMLayoutProps {
  children: React.ReactNode;
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
};

// Inner CRM Page Component with tabs (needs to be inside provider)
const CRMPageInner: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const crmContext = useCRM();
  const { refreshLeads, refreshDashboard, leads, deleteLead: deleteLeadFromContext, error: contextError } = crmContext;
  const { showToast } = useToast();
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [leadToSchedule, setLeadToSchedule] = useState<CRMLead | null>(null);
  const [engineers, setEngineers] = useState<CRMEngineer[]>([]);

  // Show error if context is not available (should only happen during hot reload)
  if (contextError === 'CRM Context not available - please refresh the page') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
            CRM is loading... If this persists, please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Check if we're viewing a specific lead
  const isViewingLead = !!id;

  // If viewing a lead, make sure we're on leads tab when we go back
  useEffect(() => {
    if (!isViewingLead && window.location.pathname === '/crm') {
      setActiveTab('leads');
    }
  }, [isViewingLead]);

  // Load engineers on mount and when active tab changes to dashboard (to refresh after adding in settings)
  useEffect(() => {
    const loadEngineers = async () => {
      try {
        const engineersData = await getEngineers();
        setEngineers(engineersData);
      } catch (error) {
        // Failed to load engineers
      }
    };

    loadEngineers();
  }, [activeTab]); // Reload when tab changes (including when returning from Settings)

  const handleCreateLead = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewLead = (lead: CRMLead) => {
    if (!lead.id) {
      showAlert('Error', 'Lead ID is missing. Cannot view details.');
      return;
    }

    navigate(`/crm/leads/${lead.id}`);
  };

  const handleEditLead = async (lead: CRMLead) => {
    if (!lead.id) {
      await showAlert('Error', 'Lead ID is missing. Cannot edit.');
      return;
    }
    // Navigate to lead detail page in edit mode
    navigate(`/crm/leads/${lead.id}?edit=true`);
  };

  const handleDeleteLead = async (lead: CRMLead) => {
    if (!lead || !lead.id) {
      showToast('error', 'Cannot delete: Lead ID is missing');
      return;
    }

    const confirmed = await showConfirm('Delete Lead', `Are you sure you want to delete the lead "${lead.name}"? This action cannot be undone.`);
    if (confirmed) {
      try {
        const { deleteLead } = await import('../services/crmService');
        await deleteLead(lead.id, 'user');

        // Immediately update local state to remove the lead from UI
        deleteLeadFromContext(lead.id);

        // Small delay to ensure Firebase delete is propagated
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force refresh leads from server to ensure sync
        await refreshLeads();

        showToast('success', `Lead "${lead.name}" deleted successfully!`);
      } catch (error) {
        showToast('error', `Failed to delete lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleQuickAction = (action: string, lead: CRMLead) => {
    switch (action) {
      case 'call':
        window.open(`tel:${lead.phone}`, '_self');
        break;
      case 'whatsapp':
        const message = encodeURIComponent(`Hi ${lead.name}, regarding your project "${lead.projectName}"`);
        window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
        break;
      case 'schedule_visit':
        setLeadToSchedule(lead);
        setIsScheduleModalOpen(true);
        break;
    }
  };

  const handleCreateLeadSuccess = (lead: CRMLead) => {
    setSelectedLead(lead);
    // Switch to leads tab to show the new lead
    setActiveTab('leads');
  };

  const handleRefreshData = async () => {
    await refreshLeads();
    await refreshDashboard();
  };

  const activeTabData = crmTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  // If we're viewing a specific lead, show the lead detail page
  if (isViewingLead && id) {
    return (
      <CRMLayout>
        <CRMLeadDetail />
      </CRMLayout>
    );
  }

  return (
    <>
      <CRMLayout>
        {/* Top Row: KPI Cards (Left) + Actions (Right) */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-2 md:gap-4 mb-4">
          {/* Left Side: KPI Cards - Rectangular filling space */}
          <div className="flex-1 grid grid-cols-4 gap-1.5 md:gap-3">
            {/* Total Leads Card - Blue Theme */}
            <div className="p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-500 shadow-[6px_6px_12px_rgba(59,130,246,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(59,130,246,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <div className="w-full h-full bg-[#e4ebf5] dark:bg-slate-800 rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] dark:bg-slate-700 items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff] dark:shadow-none">
                  <Users size={20} weight="duotone" className="text-blue-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">Total Leads</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {crmContext.dashboardMetrics?.totalLeads || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Leads Card - Green Theme */}
            <div className="p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 shadow-[6px_6px_12px_rgba(34,197,94,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(34,197,94,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <div className="w-full h-full bg-[#e4ebf5] dark:bg-slate-800 rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] dark:bg-slate-700 items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff] dark:shadow-none">
                  <Target size={20} weight="duotone" className="text-green-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Active Leads</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {crmContext.dashboardMetrics?.activeLeads || (crmContext.dashboardMetrics?.totalLeads || 0) - (crmContext.dashboardMetrics?.wonDeals || 0) - (crmContext.dashboardMetrics?.lostDeals || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Won Deals Card - Emerald Theme */}
            <div className="p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[6px_6px_12px_rgba(16,185,129,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(16,185,129,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <div className="w-full h-full bg-[#e4ebf5] dark:bg-slate-800 rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] dark:bg-slate-700 items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff] dark:shadow-none">
                  <CheckCircle size={20} weight="duotone" className="text-emerald-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-semibold">Won Deals</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {crmContext.dashboardMetrics?.wonDeals || crmContext.dashboardMetrics?.statusCounts?.won || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Conversion Rate Card - Purple Theme */}
            <div className="p-[1px] md:p-[2px] rounded-lg md:rounded-2xl bg-gradient-to-r from-purple-400 to-violet-500 shadow-[6px_6px_12px_rgba(139,92,246,0.12),-6px_-6px_12px_#ffffff] hover:shadow-[8px_8px_16px_rgba(139,92,246,0.18),-8px_-8px_16px_#ffffff] transition-all">
              <div className="w-full h-full bg-[#e4ebf5] dark:bg-slate-800 rounded-[6px] md:rounded-[14px] px-1.5 md:px-4 py-1.5 md:py-3 flex flex-col md:flex-row items-center md:gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-[#e4ebf5] dark:bg-slate-700 items-center justify-center shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff] dark:shadow-none">
                  <TrendUp size={20} weight="duotone" className="text-purple-500" />
                </div>
                <div className="flex flex-col items-center md:items-start flex-1">
                  <span className="text-[8px] md:text-xs bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent font-semibold">Conversion</span>
                  <span className="text-xs md:text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                    {Math.round(crmContext.dashboardMetrics?.conversionRate || 0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Action Button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              onClick={handleCreateLead}
              className="h-9 px-4 rounded-xl bg-blue-600 text-xs text-white font-semibold flex items-center gap-1.5
                shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff]
                dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                hover:shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff]
                active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15)]
                transition-all duration-200"
            >
              <Plus size={14} weight="bold" />
              <span>New Lead</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {crmTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon size={18} weight={activeTab === tab.id ? "fill" : "regular"} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          {(() => {
            if (ActiveComponent && activeTab === 'leads') {
              return (
                <ActiveComponent
                  onCreateLead={handleCreateLead}
                  onViewLead={handleViewLead}
                  onEditLead={handleEditLead}
                  onDeleteLead={handleDeleteLead}
                  onQuickAction={handleQuickAction}
                />
              );
            } else if (ActiveComponent && activeTab === 'pipeline') {
              return <ActiveComponent onViewLead={handleViewLead} />;
            } else if (ActiveComponent) {
              return <ActiveComponent />;
            } else {
              return (
                <div className="p-6 text-center">
                  <p className="text-slate-600 dark:text-slate-400">
                    Component not found for tab: {activeTab}
                  </p>
                </div>
              );
            }
          })()}
        </motion.div>

        {/* Create Lead Modal */}
        <CreateLeadModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateLeadSuccess}
        />

        {/* Schedule Visit Modal */}
        <ScheduleVisitModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          lead={leadToSchedule}
          engineers={engineers}
          onSuccess={() => {
            setIsScheduleModalOpen(false);
            setLeadToSchedule(null);
          }}
          onRefresh={handleRefreshData}
          showToast={showToast}
        />
      </CRMLayout>
    </>
  );
};

// Main CRM Page Component (wraps everything with provider)
const CRMPage: React.FC = () => {
  return (
    <ToastProvider>
      <ModalProvider>
        <CRMProvider>
          <CRMPageInner />
        </CRMProvider>
      </ModalProvider>
    </ToastProvider>
  );
};

export default CRMPage;
