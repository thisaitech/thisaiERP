// CRM Lead Detail Page Component
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Envelope as Mail,
  ArrowsClockwise
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
  getLeadAttachments,
  debugLeadData
} from '../services/crmService';
import { useModal } from '../components/Modal';

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

const ActivitiesTab: React.FC<{ leadId: string; refreshTrigger?: number }> = ({ leadId, refreshTrigger = 0 }) => {
  const { showAlert, showConfirm } = useModal();
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [leadId, refreshTrigger]);

  const loadActivities = async () => {
    setError(null);
    setLoading(true);

    try {
      const data = await getLeadActivities(leadId);
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
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
      // Activity creation failed
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>Error: {error}</p>
        <button onClick={loadActivities} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Activities & Timeline ({activities.length} activities)
        </h2>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <List size={48} className="mx-auto mb-4 opacity-50" />
          <p>No activities recorded yet</p>
          <p className="text-sm mt-2">Activities are automatically created when you schedule visits or make changes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  {activity.type === 'call' && <Phone size={20} className="text-blue-600" />}
                  {activity.type === 'meeting' && <Calendar size={20} className="text-green-600" />}
                  {activity.type === 'email' && <Mail size={20} className="text-purple-600" />}
                  {activity.type === 'site_visit' && <MapPin size={20} className="text-orange-600" />}
                  {activity.type === 'whatsapp' && <Chat size={20} className="text-emerald-600" />}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activity.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{format(new Date(activity.createdAt), 'MMM dd, yyyy hh:mm a')}</span>
                  {activity.scheduledAt && (
                    <span>Scheduled: {format(new Date(activity.scheduledAt), 'MMM dd, yyyy hh:mm a')}</span>
                  )}
                  {activity.completedAt && (
                    <span className="text-green-600">Completed: {format(new Date(activity.completedAt), 'MMM dd, yyyy hh:mm a')}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Site Visits Tab Component
const SiteVisitsTab: React.FC<{ leadId: string; refreshTrigger?: number }> = ({ leadId, refreshTrigger = 0 }) => {
  const { showAlert, showConfirm } = useModal();
  const [visits, setVisits] = useState<CRMSiteVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [savingVisit, setSavingVisit] = useState<string | null>(null);

  // Load checklist items from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getCRMSettings } = await import('../services/crmService');
        const settings = await getCRMSettings();
        if (settings?.siteVisitChecklist?.length) {
          setChecklistItems(settings.siteVisitChecklist);
        } else {
          // Use default checklist from constants
          const { CRM_DEFAULTS } = await import('../constants');
          setChecklistItems(CRM_DEFAULTS.SITE_VISIT_CHECKLIST);
        }
      } catch (err) {
        // Use default checklist
        const { CRM_DEFAULTS } = await import('../constants');
        setChecklistItems(CRM_DEFAULTS.SITE_VISIT_CHECKLIST);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    loadVisits();
  }, [leadId, refreshTrigger]);

  const loadVisits = async () => {
    setError(null);
    setLoading(true);

    try {
      const data = await getLeadSiteVisits(leadId);
      setVisits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load site visits');
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = async (visitId: string, item: string, checked: boolean) => {
    // Update local state first for immediate UI feedback
    setVisits(prevVisits =>
      prevVisits.map(visit => {
        if (visit.id === visitId) {
          return {
            ...visit,
            checklist: {
              ...visit.checklist,
              [item]: checked
            }
          };
        }
        return visit;
      })
    );
  };

  const handleSaveChecklist = async (visit: CRMSiteVisit) => {
    setSavingVisit(visit.id);
    try {
      const { updateSiteVisit } = await import('../services/crmService');
      await updateSiteVisit(visit.id, {
        checklist: visit.checklist
      });
      await showAlert('Success', 'Checklist saved successfully!');
    } catch (err) {
      console.error('Failed to save checklist:', err);
      await showAlert('Error', 'Failed to save checklist. Please try again.');
    } finally {
      setSavingVisit(null);
    }
  };

  const handleCompleteVisit = async (visit: CRMSiteVisit) => {
    const checkedCount = Object.values(visit.checklist || {}).filter(Boolean).length;
    const totalItems = checklistItems.length;

    if (checkedCount < totalItems) {
      const proceed = await showConfirm(
        'Incomplete Checklist',
        `Only ${checkedCount} of ${totalItems} items are checked. Are you sure you want to mark this visit as completed?`
      );
      if (!proceed) return;
    }

    setSavingVisit(visit.id);
    try {
      const { updateSiteVisit, createActivity } = await import('../services/crmService');
      await updateSiteVisit(visit.id, {
        status: 'completed',
        checklist: visit.checklist
      });

      // Create activity for completion
      await createActivity({
        leadId: visit.leadId,
        type: 'site_visit',
        title: 'Site visit completed',
        description: `Site visit with ${visit.engineerName} has been completed. ${checkedCount}/${totalItems} checklist items verified.`,
        completedAt: new Date(),
        createdBy: 'user'
      });

      await loadVisits();
      await showAlert('Success', 'Site visit marked as completed!');
    } catch (err) {
      console.error('Failed to complete visit:', err);
      await showAlert('Error', 'Failed to complete visit. Please try again.');
    } finally {
      setSavingVisit(null);
    }
  };

  const handleCancelVisit = async (visit: CRMSiteVisit) => {
    const confirmed = await showConfirm(
      'Cancel Site Visit',
      'Are you sure you want to cancel this site visit?'
    );
    if (!confirmed) return;

    setSavingVisit(visit.id);
    try {
      const { updateSiteVisit, createActivity } = await import('../services/crmService');
      await updateSiteVisit(visit.id, {
        status: 'cancelled'
      });

      // Create activity for cancellation
      await createActivity({
        leadId: visit.leadId,
        type: 'site_visit',
        title: 'Site visit cancelled',
        description: `Site visit with ${visit.engineerName} has been cancelled.`,
        createdBy: 'user'
      });

      await loadVisits();
      await showAlert('Cancelled', 'Site visit has been cancelled.');
    } catch (err) {
      console.error('Failed to cancel visit:', err);
      await showAlert('Error', 'Failed to cancel visit. Please try again.');
    } finally {
      setSavingVisit(null);
    }
  };

  const getChecklistProgress = (checklist: Record<string, boolean> | undefined) => {
    if (!checklist || !checklistItems.length) return { checked: 0, total: checklistItems.length };
    const checked = checklistItems.filter(item => checklist[item]).length;
    return { checked, total: checklistItems.length };
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>Error: {error}</p>
        <button onClick={loadVisits} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Site Visits ({visits.length} visits)
        </h2>
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <MapPin size={48} className="mx-auto mb-4 opacity-50" />
          <p>No site visits scheduled yet</p>
          <p className="text-sm mt-2">Schedule a site visit from the leads list</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map((visit, index) => {
            const progress = getChecklistProgress(visit.checklist);
            const isExpanded = expandedVisitId === visit.id;
            const isSaving = savingVisit === visit.id;

            return (
              <div key={visit.id || `visit-${index}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Visit Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">
                        Site Visit with {visit.engineerName}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {format(new Date(visit.visitAt), 'EEEE, MMMM dd, yyyy • hh:mm a')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      visit.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      visit.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {visit.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {visit.status !== 'cancelled' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                        <span>Checklist Progress</span>
                        <span>{progress.checked}/{progress.total} items</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            progress.checked === progress.total ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress.total > 0 ? (progress.checked / progress.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {visit.notes && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{visit.notes}</p>
                    </div>
                  )}

                  {visit.photos && visit.photos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Photos ({visit.photos.length})</p>
                      <div className="grid grid-cols-4 gap-2">
                        {visit.photos.map((photo, idx) => (
                          <img key={idx} src={photo} alt={`Visit photo ${idx + 1}`} className="rounded h-20 w-full object-cover" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {visit.status === 'scheduled' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <CheckCircle size={16} />
                        {isExpanded ? 'Hide Checklist' : 'Complete Visit'}
                      </button>
                      <button
                        onClick={() => handleCancelVisit(visit)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Cancel Visit
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Checklist Section */}
                <AnimatePresence>
                  {isExpanded && visit.status === 'scheduled' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-200 dark:border-slate-700"
                    >
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-4">
                          Site Visit Checklist
                        </h4>
                        <div className="space-y-3">
                          {checklistItems.map((item, idx) => (
                            <label
                              key={idx}
                              className="flex items-start gap-3 cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                checked={visit.checklist?.[item] || false}
                                onChange={(e) => handleChecklistChange(visit.id, item, e.target.checked)}
                                className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                              />
                              <span className={`text-sm ${
                                visit.checklist?.[item]
                                  ? 'text-slate-500 dark:text-slate-400 line-through'
                                  : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                              }`}>
                                {item}
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            onClick={() => handleSaveChecklist(visit)}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                          >
                            <FloppyDisk size={16} />
                            {isSaving ? 'Saving...' : 'Save Checklist'}
                          </button>
                          <button
                            onClick={() => handleCompleteVisit(visit)}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle size={16} />
                            {isSaving ? 'Completing...' : 'Mark as Completed'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Completed Visit Checklist (read-only) */}
                {visit.status === 'completed' && visit.checklist && Object.keys(visit.checklist).length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 text-sm">
                      Completed Checklist
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {checklistItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {visit.checklist?.[item] ? (
                            <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-red-400 flex-shrink-0" />
                          )}
                          <span className={visit.checklist?.[item] ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Quotations Tab Component
const QuotationsTab: React.FC<{ leadId: string; refreshTrigger?: number }> = ({ leadId, refreshTrigger = 0 }) => {
  const { showAlert } = useModal();
  const [quotations, setQuotations] = useState<CRMAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadQuotations();
  }, [leadId, refreshTrigger]);

  const loadQuotations = async () => {
    try {
      const allAttachments = await getLeadAttachments(leadId);
      // Filter only quotation attachments
      const quotationAttachments = allAttachments.filter(a => a.category === 'Quotation');
      setQuotations(quotationAttachments);
    } catch (error) {
      console.error('Failed to load quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAttachment(file, leadId, 'lead', leadId, 'Quotation', 'user');
      await loadQuotations();
      await showAlert('Success', 'Quotation uploaded successfully!');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to upload quotation:', error);
      await showAlert('Error', 'Failed to upload quotation. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Quotations</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <CurrencyDollar size={16} />
            {uploading ? 'Uploading...' : 'Upload Quotation'}
          </button>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <CurrencyDollar size={48} className="mx-auto mb-4 opacity-50" />
          <p>Click "Upload Quotation" to add price quotes</p>
          <p className="text-sm mt-2">Supported: PDF, Word, Excel</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotations.map((quotation) => (
            <div
              key={quotation.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CurrencyDollar size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {quotation.fileName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {quotation.description || 'Price quotation'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {quotation.fileSize ? `${(quotation.fileSize / 1024).toFixed(1)} KB` : ''}
                    {quotation.createdAt && ` • ${format(new Date(quotation.createdAt), 'MMM dd, yyyy')}`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {quotation.fileUrl && (
                  <button
                    onClick={() => downloadFile(quotation.fileUrl, quotation.fileName)}
                    className="flex-1 text-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Drawings Tab Component
const DrawingsTab: React.FC<{ leadId: string; refreshTrigger?: number }> = ({ leadId, refreshTrigger = 0 }) => {
  const { showAlert } = useModal();
  const [drawings, setDrawings] = useState<CRMAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDrawings();
  }, [leadId, refreshTrigger]);

  const loadDrawings = async () => {
    try {
      const allAttachments = await getLeadAttachments(leadId);
      // Filter only drawing attachments
      const drawingAttachments = allAttachments.filter(a => a.category === 'Drawing');
      setDrawings(drawingAttachments);
    } catch (error) {
      console.error('Failed to load drawings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAttachment(file, leadId, 'lead', leadId, 'Drawing', 'user');
      await loadDrawings();
      await showAlert('Success', 'Drawing uploaded successfully!');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to upload drawing:', error);
      await showAlert('Error', 'Failed to upload drawing. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isImageFile = (mimeType: string) => {
    return mimeType?.startsWith('image/');
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Drawings</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.dwg,.dxf"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Camera size={16} />
            {uploading ? 'Uploading...' : 'Upload Drawing'}
          </button>
        </div>
      </div>

      {drawings.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Camera size={48} className="mx-auto mb-4 opacity-50" />
          <p>Click "Upload Drawing" to add architectural plans</p>
          <p className="text-sm mt-2">Supported: Images, PDF, DWG, DXF</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drawings.map((drawing) => (
            <div
              key={drawing.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Preview area */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                {isImageFile(drawing.mimeType) && drawing.fileUrl ? (
                  <img
                    src={drawing.fileUrl}
                    alt={drawing.fileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Camera size={48} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">{drawing.mimeType?.split('/')[1]?.toUpperCase() || 'File'}</p>
                  </div>
                )}
              </div>
              {/* Info area */}
              <div className="p-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {drawing.fileName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {drawing.description || 'Architectural drawing'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {drawing.fileSize ? `${(drawing.fileSize / 1024).toFixed(1)} KB` : ''}
                  {drawing.createdAt && ` • ${format(new Date(drawing.createdAt), 'MMM dd, yyyy')}`}
                </p>
                <div className="mt-3 flex gap-2">
                  {drawing.fileUrl && (
                    <button
                      onClick={() => downloadFile(drawing.fileUrl, drawing.fileName)}
                      className="flex-1 text-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to download files from base64 data URLs
const downloadFile = (fileUrl: string, fileName: string) => {
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Attachments Tab Component
const AttachmentsTab: React.FC<{ leadId: string; refreshTrigger?: number }> = ({ leadId, refreshTrigger = 0 }) => {
  const { showAlert } = useModal();
  const [attachments, setAttachments] = useState<CRMAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
  }, [leadId, refreshTrigger]);

  const loadAttachments = async () => {
    try {
      const data = await getLeadAttachments(leadId);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAttachment(file, leadId, 'lead', leadId, 'General', 'user');
      await loadAttachments();
      await showAlert('Success', 'File uploaded successfully!');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to upload file:', error);
      await showAlert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Attachments</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Upload size={48} className="mx-auto mb-4 opacity-50" />
          <p>No attachments yet</p>
          <p className="text-sm mt-2">Upload files like drawings, documents, or photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {attachment.fileName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {(attachment.fileSize / 1024).toFixed(1)} KB • {format(new Date(attachment.createdAt), 'MMM dd, yyyy')}
                  </p>
                  {attachment.category && (
                    <span className="inline-block mt-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs rounded">
                      {attachment.category}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => downloadFile(attachment.fileUrl, attachment.fileName)}
                className="mt-3 block w-full text-center text-sm text-blue-600 hover:text-blue-700"
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
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
  const [searchParams] = useSearchParams();
  const { updateLead: updateCRMLead } = useCRM();
  const { showAlert, showPrompt, showSelect } = useModal();

  // Check if edit mode is set via URL query parameter
  const isEditModeFromUrl = searchParams.get('edit') === 'true';

  const [lead, setLead] = useState<CRMLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tab);
  const [isInEditMode, setIsInEditMode] = useState(editMode || isEditModeFromUrl);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefreshTabs = () => {
    setRefreshTrigger(prev => prev + 1);
  };

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
    } else {
      setLoading(false);
    }
  }, [id]);

  // Refresh tabs when component mounts
  useEffect(() => {
    if (lead?.id) {
      handleRefreshTabs();
    }
  }, [lead?.id]);

  const loadLead = async () => {
    if (!id) return;

    try {
      const leadData = await getLead(id);
      setLead(leadData);
    } catch (error) {
      // Failed to load lead
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
      // Failed to update lead
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
          onClick={() => navigate('/crm')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to CRM
        </button>
      </div>
    );
  }

  const stageInfo = CRM_STAGES[lead.stage] || { label: lead.stage || 'Unknown', color: 'bg-gray-100 text-gray-800', category: 'active', description: '', icon: '', order: 0 };
  const priorityInfo = CRM_PRIORITIES[lead.priority] || { label: lead.priority || 'medium', color: 'bg-gray-100 text-gray-800', icon: '', value: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/crm')}
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

        <div className="flex gap-2 flex-wrap">
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
          {lead.stage !== 'confirmed' && lead.stage !== 'lost' && (
            <>
              <button
                onClick={async () => {
                  // Load won reasons from settings or use defaults
                  const { getCRMSettings } = await import('../services/crmService');
                  const { CRM_DEFAULTS } = await import('../constants');
                  const settings = await getCRMSettings();
                  const wonReasons = settings?.wonReasons?.length
                    ? settings.wonReasons
                    : CRM_DEFAULTS.WON_REASONS;

                  const reason = await showSelect(
                    'Mark as Won',
                    'Select the reason for winning this deal:',
                    wonReasons,
                    true // Allow custom input
                  );
                  if (reason) {
                    try {
                      await handleUpdateLead({ stage: 'confirmed', status: 'won', wonReason: reason });
                      await showAlert('Success', 'Lead marked as Won! Congratulations!');
                    } catch (error) {
                      await showAlert('Error', 'Failed to update lead. Please try again.');
                    }
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <CheckCircle size={16} />
                Mark Won
              </button>
              <button
                onClick={async () => {
                  // Load lost reasons from settings or use defaults
                  const { getCRMSettings } = await import('../services/crmService');
                  const { CRM_DEFAULTS } = await import('../constants');
                  const settings = await getCRMSettings();
                  const lostReasons = settings?.lostReasons?.length
                    ? settings.lostReasons
                    : CRM_DEFAULTS.LOST_REASONS;

                  const reason = await showSelect(
                    'Mark as Lost',
                    'Select the reason for losing this deal:',
                    lostReasons,
                    true // Allow custom input
                  );
                  if (reason) {
                    try {
                      await handleUpdateLead({ stage: 'lost', status: 'lost', lostReason: reason });
                      await showAlert('Lead Lost', 'Lead has been marked as lost.');
                    } catch (error) {
                      await showAlert('Error', 'Failed to update lead. Please try again.');
                    }
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle size={16} />
                Mark Lost
              </button>
            </>
          )}
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

        <div className="overflow-x-auto">
          <div className="flex items-start min-w-max">
            {Object.entries(CRM_STAGES).map(([key, stage], index) => (
              <div key={key} className="flex flex-col items-center">
                <div className="flex items-center">
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
                    <div className={`w-16 h-0.5 ${
                      Object.values(CRM_STAGES).findIndex(s => s.label === stageInfo.label) > index
                        ? 'bg-green-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`} />
                  )}
                </div>
                <span className={`mt-2 text-xs text-center w-20 leading-tight ${
                  lead.stage === key
                    ? 'text-blue-600 font-medium'
                    : Object.values(CRM_STAGES).findIndex(s => s.label === stageInfo.label) > index
                    ? 'text-green-600 font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
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
                <ActivitiesTab leadId={lead.id} refreshTrigger={refreshTrigger} />
              )}
              {activeTab === 'site-visits' && (
                <SiteVisitsTab leadId={lead.id} refreshTrigger={refreshTrigger} />
              )}
              {activeTab === 'requirements' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Project Requirements</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Project Type</h3>
                      <p className="text-slate-900 dark:text-slate-100">{lead.projectType || 'Not specified'}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Area</h3>
                      <p className="text-slate-900 dark:text-slate-100">{lead.sqft ? `${lead.sqft} sqft` : 'Not specified'}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Budget Range</h3>
                      <p className="text-slate-900 dark:text-slate-100">
                        {lead.budgetMin && lead.budgetMax ? `₹${lead.budgetMin.toLocaleString()} - ₹${lead.budgetMax.toLocaleString()}` : 'Not specified'}
                      </p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Timeline</h3>
                      <p className="text-slate-900 dark:text-slate-100">{lead.timeline || 'Not specified'}</p>
                    </div>
                  </div>
                  {lead.notes && (
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Notes</h3>
                      <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'drawings' && (
                <DrawingsTab leadId={lead.id} refreshTrigger={refreshTrigger} />
              )}
              {activeTab === 'quotations' && (
                <QuotationsTab leadId={lead.id} refreshTrigger={refreshTrigger} />
              )}
              {activeTab === 'attachments' && (
                <AttachmentsTab leadId={lead.id} refreshTrigger={refreshTrigger} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CRMLeadDetail;
