// Main CRM Page Component
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBar,
  Users,
  Kanban,
  Gear,
  Plus,
  Buildings,
  ArrowClockwise
} from '@phosphor-icons/react';
import { CRMProvider, useCRM } from '../contexts/CRMContext';
import CRMDashboard from '../components/CRMDashboard';
import CRMLeadsList from '../components/CRMLeadsList';
import CRMLeadDetail from './CRMLeadDetail';
import CRMPipelineBoard from '../components/CRMPipelineBoard';
import CRMSettings from './CRMSettings';
import CreateLeadModal from '../components/CreateLeadModal';
import { CRMLead } from '../types';
import { createSiteVisit, updateLead, seedCRMData, debugCRMCollections, getEngineers, CRMEngineer, seedTestDataWithoutCompanyId } from '../services/crmService';

// Schedule Visit Modal Component
interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CRMLead | null;
  engineers: CRMEngineer[];
  onSuccess: () => void;
  onRefresh: () => void;
}

const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({ isOpen, onClose, lead, engineers, onSuccess, onRefresh }) => {
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [engineer, setEngineer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!lead || !visitDate || !visitTime) return;

    setLoading(true);
    try {
      const visitDateTime = new Date(`${visitDate}T${visitTime}`);

      // Get engineer details
      const selectedEngineer = engineers.find(eng => eng.id === engineer);

      // Create the site visit
      await createSiteVisit({
        leadId: lead.id,
        engineerId: engineer || 'engineer1',
        engineerName: selectedEngineer?.name || engineer || 'Default Engineer',
        visitAt: visitDateTime,
        notes: notes.trim() || undefined,
        createdBy: 'user'
      });

      // Update lead stage to site_visit_scheduled
      await updateLead(lead.id, {
        stage: 'site_visit_scheduled',
        nextFollowUpAt: visitDateTime
      }, 'user');

      // Refresh data to show updates
      onRefresh();

      console.log('✅ Site visit scheduled and lead updated');
      onSuccess();
    } catch (error) {
      console.error('❌ Failed to schedule visit:', error);
      alert('Failed to schedule visit. Please try again.');
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
                      {engineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>
                          {eng.name} ({eng.specialization})
                        </option>
                      ))}
                      {engineers.length === 0 && (
                        <>
                          <option value="engineer1">John Smith (Senior Engineer)</option>
                          <option value="engineer2">Sarah Johnson (Project Engineer)</option>
                          <option value="engineer3">Mike Davis (Site Engineer)</option>
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
    id: 'dashboard',
    label: 'Dashboard',
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
  console.log('🔄 CRMPageInner rendering...');

  const { refreshLeads, refreshDashboard, leads } = useCRM();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [leadToSchedule, setLeadToSchedule] = useState<CRMLead | null>(null);
  const [engineers, setEngineers] = useState<CRMEngineer[]>([]);

  console.log('📊 CRMPageInner state:', { activeTab, selectedLead, isCreateModalOpen });

  // Load engineers on mount
  useEffect(() => {
    const loadEngineers = async () => {
      try {
        const engineersData = await getEngineers();
        setEngineers(engineersData);
        console.log('👷 Loaded engineers:', engineersData.length);
      } catch (error) {
        console.error('Failed to load engineers:', error);
      }
    };

    loadEngineers();
  }, []);

  const handleCreateLead = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewLead = (lead: CRMLead) => {
    setSelectedLead(lead);
    // For now, we'll show lead details in a modal or overlay
    // In future, we could add a detailed view within the tabs
    console.log('View lead:', lead.id);
  };

  const handleEditLead = (lead: CRMLead) => {
    setSelectedLead(lead);
    console.log('Edit lead:', lead.id);
  };

  const handleDeleteLead = (lead: CRMLead) => {
    if (window.confirm(`Are you sure you want to delete the lead "${lead.name}"?`)) {
      console.log('Delete lead:', lead.id);
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
      default:
        console.log('Unknown action:', action);
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

  const handleSeedData = async () => {
    if (window.confirm('This will add sample CRM data for testing. Continue?')) {
      try {
        await seedCRMData();
        await handleRefreshData();
        alert('Sample CRM data added successfully!');
      } catch (error) {
        console.error('Failed to seed data:', error);
        alert('Failed to add sample data. Check console for details.');
      }
    }
  };

  const handleDebugCollections = async () => {
    console.log('🔍 Starting CRM collections debug...');
    try {
      await debugCRMCollections();
      alert('Debug information logged to console. Check F12 console for details.');
    } catch (error) {
      console.error('Failed to debug collections:', error);
      alert('Failed to debug collections. Check console for details.');
    }
  };

  const activeTabData = crmTabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  console.log('🎯 Active tab:', activeTab, 'Component:', ActiveComponent?.name || 'undefined');

  return (
    <>
      <CRMLayout>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Buildings size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                CRM System
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage your construction leads and sales pipeline
              </p>
            </div>
          </div>

          {/* Action Buttons - Always visible on right */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              title="Refresh"
            >
              <ArrowClockwise size={16} />
            </button>
            <button
              onClick={handleDebugCollections}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title="Debug CRM Collections"
            >
              🔍 Debug
            </button>
            <button
              onClick={async () => {
                if (window.confirm('This will add test data without company restrictions. Use only for debugging! Continue?')) {
                  try {
                    await seedTestDataWithoutCompanyId();
                    await handleRefreshData();
                    alert('Test data added! Check console for details.');
                  } catch (error) {
                    console.error('Failed to seed test data:', error);
                    alert('Failed to add test data. Check console.');
                  }
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              title="Seed Test Data (Debug Only)"
            >
              🧪 Test Data
            </button>
            {!leads.length && (
              <button
                onClick={handleSeedData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
              >
                <Plus size={16} />
                Seed Sample Data
              </button>
            )}
            <button
              onClick={handleCreateLead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Plus size={16} />
              New Lead
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
            try {
              if (ActiveComponent && activeTab === 'leads') {
                console.log('📋 Rendering Leads component');
                return (
                  <ActiveComponent
                    onCreateLead={handleCreateLead}
                    onViewLead={handleViewLead}
                    onEditLead={handleEditLead}
                    onDeleteLead={handleDeleteLead}
                    onQuickAction={handleQuickAction}
                  />
                );
              } else if (ActiveComponent) {
                console.log('📊 Rendering', activeTab, 'component');
                return <ActiveComponent />;
              } else {
                console.log('❌ No ActiveComponent found');
                return (
                  <div className="p-6 text-center">
                    <p className="text-slate-600 dark:text-slate-400">
                      Component not found for tab: {activeTab}
                    </p>
                  </div>
                );
              }
            } catch (error) {
              console.error('❌ Error rendering component:', error);
              return (
                <div className="p-6 text-center">
                  <p className="text-red-600 dark:text-red-400">
                    Error loading {activeTab} component: {error instanceof Error ? error.message : 'Unknown error'}
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
        />
      </CRMLayout>
    </>
  );
};

// Main CRM Page Component (wraps everything with provider)
const CRMPage: React.FC = () => {
  console.log('🏢 CRMPage (wrapper) rendering...');

  return (
    <CRMProvider>
      <CRMPageInner />
    </CRMProvider>
  );
};

export default CRMPage;
