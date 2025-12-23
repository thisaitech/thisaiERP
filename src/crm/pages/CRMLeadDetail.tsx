// CRM Lead Detail Page Component
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Chat,
  Calendar,
  MapPin,
  CurrencyDollar,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  Pencil,
  FloppyDisk,
  X,
  Plus,
  Eye,
  FileText,
  Camera,
  Upload,
  List,
  MapPin as LocationIcon,
  Envelope as Mail
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useCRM } from '../contexts/CRMContext';
import { CRMLead, CRMActivity, CRMSiteVisit, CRMAttachment } from '../types';
import { CRM_STAGES, CRM_PRIORITIES, CRM_ACTIVITY_TYPES } from '../constants';
import {
  getLead,
  updateLead,
  getLeadActivities,
  getLeadSiteVisits,
  createActivity,
  uploadAttachment,
  getLeadAttachments
} from '../services/crmService';

// Tab components
const OverviewTab: React.FC<{ lead: CRMLead; onUpdate: (updates: Partial<CRMLead>) => void }> = ({ lead, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(lead);

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(lead);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Lead Overview</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Pencil size={16} />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FloppyDisk size={16} />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              ) : (
                <p className="text-slate-900 dark:text-slate-100">{lead.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              ) : (
                <p className="text-slate-900 dark:text-slate-100">{lead.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              ) : (
                <p className="text-slate-900 dark:text-slate-100">{lead.email || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Project Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              ) : (
                <p className="text-slate-900 dark:text-slate-100">{lead.projectName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expected Value
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.expectedValue || ''}
                  onChange={(e) => setFormData({ ...formData, expectedValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              ) : (
                <p className="text-slate-900 dark:text-slate-100">
                  {lead.expectedValue ? `₹${lead.expectedValue.toLocaleString()}` : 'Not specified'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Area (sqft)
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.sqft || ''}
                    onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                ) : (
                  <p className="text-slate-900 dark:text-slate-100">{lead.sqft || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project Type
                </label>
                {isEditing ? (
                  <select
                    value={formData.projectType || ''}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  >
                    <option value="">Select type</option>
                    <option value="Residential House">Residential House</option>
                    <option value="Commercial Building">Commercial Building</option>
                    <option value="Villa">Villa</option>
                    <option value="Apartment Complex">Apartment Complex</option>
                    <option value="Office Building">Office Building</option>
                  </select>
                ) : (
                  <p className="text-slate-900 dark:text-slate-100">{lead.projectType || 'Not specified'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm md:col-span-2">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Address
              </label>
              {isEditing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              ) : (
                <p className="text-slate-900 dark:text-slate-100">{lead.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                City
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              ) : (
                <p className="text-slate-900 dark:text-slate-100">{lead.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Source
              </label>
              {isEditing ? (
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  <option value="Website">Website</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Walk-in">Walk-in</option>
                </select>
              ) : (
                <p className="text-slate-900 dark:text-slate-100">{lead.source}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivitiesTab: React.FC<{ leadId: string }> = ({ leadId }) => {
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddActivity, setShowAddActivity] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [leadId]);

  const loadActivities = async () => {
    try {
      const data = await getLeadActivities(leadId);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (activityData: any) => {
    try {
      await createActivity({
        ...activityData,
        leadId,
        createdBy: 'user', // TODO: Get from auth context
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await loadActivities();
      setShowAddActivity(false);
    } catch (error) {
      console.error('Failed to add activity:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Activities & Timeline</h2>
        <button
          onClick={() => setShowAddActivity(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Activity
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                {activity.type === 'call' && <Phone size={20} className="text-blue-600" />}
                {activity.type === 'meeting' && <Users size={20} className="text-green-600" />}
                {activity.type === 'email' && <Mail size={20} className="text-purple-600" />}
                {activity.type === 'site_visit' && <MapPin size={20} className="text-orange-600" />}
                {activity.type === 'whatsapp' && <Chat size={20} className="text-emerald-600" />}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activity.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{format(activity.createdAt, 'MMM dd, yyyy hh:mm a')}</span>
                {activity.scheduledAt && (
                  <span>Scheduled: {format(activity.scheduledAt, 'MMM dd, yyyy hh:mm a')}</span>
                )}
                {activity.completedAt && (
                  <span className="text-green-600">Completed: {format(activity.completedAt, 'MMM dd, yyyy hh:mm a')}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Lead Detail Component
interface CRMLeadDetailProps {
  editMode?: boolean;
  tab?: string;
}

const CRMLeadDetail: React.FC<CRMLeadDetailProps> = ({ editMode = false, tab = 'overview' }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateLead: updateCRMLead } = useCRM();

  const [lead, setLead] = useState<CRMLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tab);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'activities', label: 'Activities', icon: List },
    { id: 'site-visits', label: 'Site Visits', icon: LocationIcon },
    { id: 'requirements', label: 'Requirements', icon: FileText },
    { id: 'drawings', label: 'Drawings', icon: Camera },
    { id: 'quotations', label: 'Quotations', icon: CurrencyDollar },
    { id: 'attachments', label: 'Attachments', icon: Upload }
  ];

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  const loadLead = async () => {
    if (!id) return;

    try {
      const leadData = await getLead(id);
      setLead(leadData);
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLead = async (updates: Partial<CRMLead>) => {
    if (!lead) return;

    try {
      await updateLead(lead.id, updates, 'user');
      setLead({ ...lead, ...updates });
      updateCRMLead({ ...lead, ...updates });
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Lead not found</h2>
        <button
          onClick={() => navigate('/crm/leads')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  const stageInfo = CRM_STAGES[lead.stage];
  const priorityInfo = CRM_PRIORITIES[lead.priority];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/crm/leads')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {lead.name}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageInfo.color}`}>
              {stageInfo.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityInfo.color}`}>
              {priorityInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Phone size={16} />
              {lead.phone}
            </span>
            {lead.email && (
              <span className="flex items-center gap-2">
                <Mail size={16} />
                {lead.email}
              </span>
            )}
            <span className="flex items-center gap-2">
              <MapPin size={16} />
              {lead.city}
            </span>
            <span className="flex items-center gap-2">
              <CurrencyDollar size={16} />
              {lead.expectedValue ? `₹${lead.expectedValue.toLocaleString()}` : 'Not set'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.open(`tel:${lead.phone}`, '_self')}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Phone size={16} />
            Call
          </button>
          <button
            onClick={() => {
              const message = encodeURIComponent(`Hi ${lead.name}, regarding your project "${lead.projectName}"`);
              window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Chat size={16} />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Pipeline Progress</h3>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Stage {Object.values(CRM_STAGES).findIndex(s => s.label === stageInfo.label) + 1} of {Object.keys(CRM_STAGES).length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {Object.entries(CRM_STAGES).map(([key, stage], index) => (
            <div key={key} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                lead.stage === key
                  ? 'bg-blue-600 text-white'
                  : Object.values(CRM_STAGES).findIndex(s => s.label === stageInfo.label) > index
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
              }`}>
                {index + 1}
              </div>
              {index < Object.keys(CRM_STAGES).length - 1 && (
                <div className={`w-12 h-0.5 ${
                  Object.values(CRM_STAGES).findIndex(s => s.label === stageInfo.label) > index
                    ? 'bg-green-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
          {Object.values(CRM_STAGES).map((stage, index) => (
            <span key={index} className="text-center w-8">{index + 1}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <OverviewTab lead={lead} onUpdate={handleUpdateLead} />
              )}
              {activeTab === 'activities' && (
                <ActivitiesTab leadId={lead.id} />
              )}
              {activeTab === 'site-visits' && (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  Site Visits tab - Coming soon
                </div>
              )}
              {activeTab === 'requirements' && (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  Requirements tab - Coming soon
                </div>
              )}
              {activeTab === 'drawings' && (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  Drawings tab - Coming soon
                </div>
              )}
              {activeTab === 'quotations' && (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  Quotations tab - Coming soon
                </div>
              )}
              {activeTab === 'attachments' && (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  Attachments tab - Coming soon
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CRMLeadDetail;
