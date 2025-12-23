// CRM Settings Page Component
import React, { useState, useEffect } from 'react';
import { FloppyDisk, Gear, Plus, Trash, UserPlus, Pencil } from '@phosphor-icons/react';
import { useCRM } from '../contexts/CRMContext';
import { CRMSettings, CRMEngineer } from '../types';
import { updateCRMSettings, getCRMSettings, createEngineer, getEngineers } from '../services/crmService';

const CRMSettingsPage: React.FC = () => {
  const { settings, refreshSettings } = useCRM();
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

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Load engineers
  useEffect(() => {
    const loadEngineers = async () => {
      try {
        const engineersData = await getEngineers();
        setEngineers(engineersData);
      } catch (error) {
        console.error('Failed to load engineers:', error);
      }
    };
    loadEngineers();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCRMSettings(formData, 'user');
      await refreshSettings();
      // Show success message
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Show error message
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
        console.log('Update engineer not implemented yet');
      } else {
        // Create new engineer
        await createEngineer({
          ...engineerForm,
          companyId: '' // Will be set by the service
        });
        // Reload engineers
        const engineersData = await getEngineers();
        setEngineers(engineersData);
      }
      setShowEngineerModal(false);
    } catch (error) {
      console.error('Failed to save engineer:', error);
      alert('Failed to save engineer. Please try again.');
    }
  };

  const handleDeleteEngineer = async (engineerId: string) => {
    if (window.confirm('Are you sure you want to delete this engineer?')) {
      // Delete engineer (not implemented yet)
      console.log('Delete engineer not implemented yet');
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
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
            Lead Sources
          </h3>
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
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
            Lost Reasons
          </h3>
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

        {/* Project Types */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
            Project Types
          </h3>
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
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
            Site Visit Checklist
          </h3>
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

        {/* Workflow Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
            Workflow Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Quote Validity (Days)
              </label>
              <input
                type="number"
                value={30} // Default value
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Follow-up Reminder (Hours)
              </label>
              <input
                type="number"
                value={24} // Default value
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              />
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
