// CRM Settings Page Component
import React, { useState, useEffect } from 'react';
import { FloppyDisk, Plus, Trash, UserPlus, Pencil, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useCRM } from '../contexts/CRMContext';
import { CRMSettings, CRMEngineer } from '../types';
import { updateCRMSettings, createEngineer, getEngineers } from '../services/crmService';
import { useModal } from '../components/Modal';
import { CRM_DEFAULTS, CRM_STAGES } from '../constants';

const CRMSettingsPage: React.FC = () => {
  const { settings, refreshSettings } = useCRM();
  const { showAlert, showConfirm, showPrompt } = useModal();
  const [formData, setFormData] = useState<Partial<CRMSettings>>({});
  const [loading, setLoading] = useState(false);
  const [engineers, setEngineers] = useState<CRMEngineer[]>([]);
  const [showEngineerModal, setShowEngineerModal] = useState(false);
  const [editingEngineer, setEditingEngineer] = useState<CRMEngineer | null>(null);
  const [engineerForm, setEngineerForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: 0,
    status: 'active' as const
  });

  // Get default pipeline stages as key-value mapping from constants
  const getDefaultPipelineStages = (): Record<string, string> => {
    const stages: Record<string, string> = {};
    Object.entries(CRM_STAGES).forEach(([key, stage]) => {
      stages[key] = stage.label;
    });
    return stages;
  };
  const defaultPipelineStages = getDefaultPipelineStages();

  useEffect(() => {
    if (settings) {
      // Merge settings with defaults to ensure all fields have values
      // Handle migration from old array format to new key-value format
      let pipelineStages = settings.pipelineStages;
      if (!pipelineStages || typeof pipelineStages !== 'object' || Array.isArray(pipelineStages)) {
        pipelineStages = defaultPipelineStages;
      }

      setFormData({
        ...settings,
        leadSources: settings.leadSources?.length ? settings.leadSources : CRM_DEFAULTS.LEAD_SOURCES,
        lostReasons: settings.lostReasons?.length ? settings.lostReasons : CRM_DEFAULTS.LOST_REASONS,
        wonReasons: settings.wonReasons?.length ? settings.wonReasons : CRM_DEFAULTS.WON_REASONS,
        projectTypes: settings.projectTypes?.length ? settings.projectTypes : CRM_DEFAULTS.PROJECT_TYPES,
        siteVisitChecklist: settings.siteVisitChecklist?.length ? settings.siteVisitChecklist : CRM_DEFAULTS.SITE_VISIT_CHECKLIST,
        pipelineStages: pipelineStages
      });
    } else {
      // Set default values from constants
      setFormData({
        leadSources: CRM_DEFAULTS.LEAD_SOURCES,
        lostReasons: CRM_DEFAULTS.LOST_REASONS,
        wonReasons: CRM_DEFAULTS.WON_REASONS,
        projectTypes: CRM_DEFAULTS.PROJECT_TYPES,
        siteVisitChecklist: CRM_DEFAULTS.SITE_VISIT_CHECKLIST,
        pipelineStages: defaultPipelineStages,
        areaUnit: 'sqft',
        currency: '₹',
        businessType: 'construction'
      });
    }
  }, [settings]);

  // Load engineers
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
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCRMSettings(formData, 'user');
      await refreshSettings();
      await showAlert('Settings Saved', 'Your CRM settings have been saved successfully.');
    } catch (error) {
      await showAlert('Error', `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Engineer management functions
  const handleAddEngineer = () => {
    setEditingEngineer(null);
    setEngineerForm({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      experience: 0,
      status: 'active'
    });
    setShowEngineerModal(true);
  };

  const handleEditEngineer = (engineer: CRMEngineer) => {
    setEditingEngineer(engineer);
    setEngineerForm({
      name: engineer.name,
      email: engineer.email,
      phone: engineer.phone,
      specialization: engineer.specialization,
      experience: engineer.experience,
      status: engineer.status
    });
    setShowEngineerModal(true);
  };

  const handleSaveEngineer = async () => {
    try {
      if (editingEngineer) {
        // Update existing engineer (not implemented yet)
        await showAlert('Not Implemented', 'Update functionality not implemented yet. Please delete and re-add the engineer.');
      } else {
        // Create new engineer
        await createEngineer({
          ...engineerForm,
          companyId: ''
        });

        // Reload engineers
        const engineersData = await getEngineers();
        setEngineers(engineersData);

        // Reset form
        setEngineerForm({
          name: '',
          email: '',
          phone: '',
          specialization: '',
          experience: 0,
          status: 'active'
        });
      }
      setShowEngineerModal(false);
    } catch (error) {
      await showAlert('Error', `Failed to save engineer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteEngineer = async (engineerId: string) => {
    const confirmed = await showConfirm('Delete Engineer', 'Are you sure you want to delete this engineer?');
    if (confirmed) {
      // TODO: Implement delete engineer functionality
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FloppyDisk size={16} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Lead Sources
            </h3>
            <button
              onClick={() => updateSetting('leadSources', CRM_DEFAULTS.LEAD_SOURCES)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Reset to defaults"
            >
              <ArrowCounterClockwise size={12} />
              Reset
            </button>
          </div>
          <div className="space-y-3">
            {(formData.leadSources || []).map((source, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={source}
                  onChange={(e) => {
                    const newSources = [...(formData.leadSources || [])];
                    newSources[index] = e.target.value;
                    updateSetting('leadSources', newSources);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
                <button
                  onClick={() => {
                    const newSources = (formData.leadSources || []).filter((_, i) => i !== index);
                    updateSetting('leadSources', newSources);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newSources = [...(formData.leadSources || []), ''];
                updateSetting('leadSources', newSources);
              }}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              <Plus size={16} />
              Add Source
            </button>
          </div>
        </div>

        {/* Lost Reasons */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Lost Reasons
            </h3>
            <button
              onClick={() => updateSetting('lostReasons', CRM_DEFAULTS.LOST_REASONS)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Reset to defaults"
            >
              <ArrowCounterClockwise size={12} />
              Reset
            </button>
          </div>
          <div className="space-y-3">
            {(formData.lostReasons || []).map((reason, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => {
                    const newReasons = [...(formData.lostReasons || [])];
                    newReasons[index] = e.target.value;
                    updateSetting('lostReasons', newReasons);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
                <button
                  onClick={() => {
                    const newReasons = (formData.lostReasons || []).filter((_, i) => i !== index);
                    updateSetting('lostReasons', newReasons);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newReasons = [...(formData.lostReasons || []), ''];
                updateSetting('lostReasons', newReasons);
              }}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              <Plus size={16} />
              Add Reason
            </button>
          </div>
        </div>

        {/* Won Reasons */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Won Reasons
            </h3>
            <button
              onClick={() => updateSetting('wonReasons', CRM_DEFAULTS.WON_REASONS)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Reset to defaults"
            >
              <ArrowCounterClockwise size={12} />
              Reset
            </button>
          </div>
          <div className="space-y-3">
            {(formData.wonReasons || CRM_DEFAULTS.WON_REASONS).map((reason, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => {
                    const newReasons = [...(formData.wonReasons || CRM_DEFAULTS.WON_REASONS)];
                    newReasons[index] = e.target.value;
                    updateSetting('wonReasons', newReasons);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
                <button
                  onClick={() => {
                    const newReasons = (formData.wonReasons || CRM_DEFAULTS.WON_REASONS).filter((_: any, i: number) => i !== index);
                    updateSetting('wonReasons', newReasons);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newReasons = [...(formData.wonReasons || CRM_DEFAULTS.WON_REASONS), ''];
                updateSetting('wonReasons', newReasons);
              }}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              <Plus size={16} />
              Add Reason
            </button>
          </div>
        </div>

        {/* Project Types */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Project Types
            </h3>
            <button
              onClick={() => updateSetting('projectTypes', CRM_DEFAULTS.PROJECT_TYPES)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Reset to defaults"
            >
              <ArrowCounterClockwise size={12} />
              Reset
            </button>
          </div>
          <div className="space-y-3">
            {(formData.projectTypes || []).map((type, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={type}
                  onChange={(e) => {
                    const newTypes = [...(formData.projectTypes || [])];
                    newTypes[index] = e.target.value;
                    updateSetting('projectTypes', newTypes);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
                <button
                  onClick={() => {
                    const newTypes = (formData.projectTypes || []).filter((_, i) => i !== index);
                    updateSetting('projectTypes', newTypes);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newTypes = [...(formData.projectTypes || []), ''];
                updateSetting('projectTypes', newTypes);
              }}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              <Plus size={16} />
              Add Type
            </button>
          </div>
        </div>

        {/* Site Visit Checklist */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Site Visit Checklist
            </h3>
            <button
              onClick={() => updateSetting('siteVisitChecklist', CRM_DEFAULTS.SITE_VISIT_CHECKLIST)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Reset to defaults"
            >
              <ArrowCounterClockwise size={12} />
              Reset
            </button>
          </div>
          <div className="space-y-3">
            {(formData.siteVisitChecklist || []).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newChecklist = [...(formData.siteVisitChecklist || [])];
                    newChecklist[index] = e.target.value;
                    updateSetting('siteVisitChecklist', newChecklist);
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
                <button
                  onClick={() => {
                    const newChecklist = (formData.siteVisitChecklist || []).filter((_, i) => i !== index);
                    updateSetting('siteVisitChecklist', newChecklist);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newChecklist = [...(formData.siteVisitChecklist || []), ''];
                updateSetting('siteVisitChecklist', newChecklist);
              }}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>
        </div>

        {/* Pipeline Stages - Customizable Labels */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Pipeline Stages
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Customize the display labels for pipeline stages. Changes will reflect in the Pipeline board and Dashboard.
              </p>
            </div>
            <button
              onClick={() => updateSetting('pipelineStages', defaultPipelineStages)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Reset to default labels"
            >
              <ArrowCounterClockwise size={14} />
              Reset
            </button>
          </div>
          <div className="space-y-3">
            {Object.entries(CRM_STAGES).map(([stageKey, stageInfo], index) => {
              const currentStages = (formData.pipelineStages as Record<string, string>) || defaultPipelineStages;
              const customLabel = currentStages[stageKey] || stageInfo.label;

              return (
                <div key={stageKey} className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-sm w-8">{index + 1}.</span>
                  <div className={`w-3 h-3 rounded-full ${stageInfo.color.split(' ')[0]}`} title={stageKey}></div>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => {
                      const newStages = { ...currentStages, [stageKey]: e.target.value };
                      updateSetting('pipelineStages', newStages);
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    placeholder={stageInfo.label}
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono w-36 truncate" title={stageKey}>
                    {stageKey}
                  </span>
                  {stageInfo.category === 'closed' && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                      closed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Note: Stage keys (shown in monospace) are fixed and used internally. Only the display labels can be customized.
            Stages marked as "closed" (Confirmed, Lost) don't appear in the drag-and-drop pipeline but are accessible via lead actions.
          </p>
        </div>

        {/* Project Detail Fields - Customizable */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
            Project Detail Fields
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Customize the fields shown in project details. Currently optimized for construction business.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Area Unit Label
              </label>
              <input
                type="text"
                value={formData.areaUnitLabel || 'sqft'}
                onChange={(e) => updateSetting('areaUnitLabel', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                placeholder="e.g., sqft, sq.m, acres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol || '₹'}
                onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                placeholder="e.g., ₹, $, €"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Business Type
              </label>
              <select
                value={formData.businessType || 'construction'}
                onChange={(e) => updateSetting('businessType', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              >
                <option value="construction">Construction</option>
                <option value="real_estate">Real Estate</option>
                <option value="architecture">Architecture & Design</option>
                <option value="interior">Interior Design</option>
                <option value="consulting">Consulting Services</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="services">General Services</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Engineer Management */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Engineers
            </h3>
            <button
              onClick={handleAddEngineer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus size={16} />
              Add Engineer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {engineers.map((engineer) => (
              <div key={engineer.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{engineer.name}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{engineer.specialization}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditEngineer(engineer)}
                      className="p-1 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteEngineer(engineer.id)}
                      className="p-1 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <div>📧 {engineer.email}</div>
                  <div>📞 {engineer.phone}</div>
                  <div>💼 {engineer.experience} years experience</div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    engineer.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {engineer.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {engineers.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
              <p>No engineers added yet.</p>
              <p className="text-sm">Click "Add Engineer" to get started.</p>
            </div>
          )}
        </div>

        {/* Engineer Modal */}
        {showEngineerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                {editingEngineer ? 'Edit Engineer' : 'Add Engineer'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={engineerForm.name}
                    onChange={(e) => setEngineerForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={engineerForm.email}
                    onChange={(e) => setEngineerForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={engineerForm.phone}
                    onChange={(e) => setEngineerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={engineerForm.specialization}
                    onChange={(e) => setEngineerForm(prev => ({ ...prev, specialization: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    placeholder="e.g., Senior Engineer, Project Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={engineerForm.experience}
                    onChange={(e) => setEngineerForm(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={engineerForm.status}
                    onChange={(e) => setEngineerForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEngineerModal(false)}
                  className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEngineer}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingEngineer ? 'Update' : 'Add'} Engineer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMSettingsPage;
