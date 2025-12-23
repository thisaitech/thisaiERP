// Create Lead Modal Component
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, Building, CurrencyDollar, Calendar, Tag, CheckCircle } from '@phosphor-icons/react';
import { useCRM } from '../contexts/CRMContext';
import { CRMLead } from '../types';
import { CRM_PRIORITIES, CRM_DEFAULTS } from '../constants';
import { createLead } from '../services/crmService';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (lead: CRMLead) => void;
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addLead } = useCRM();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    projectName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    source: 'website',
    priority: 'medium' as keyof typeof CRM_PRIORITIES,
    budgetMin: '',
    budgetMax: '',
    expectedValue: '',
    sqft: '',
    projectType: '',
    timeline: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required';

    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Budget validation
    if (formData.budgetMin && formData.budgetMax) {
      const min = parseFloat(formData.budgetMin);
      const max = parseFloat(formData.budgetMax);
      if (min >= max) {
        newErrors.budgetMax = 'Maximum budget must be greater than minimum';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Clean the data - only include fields that have values
      const leadData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        projectName: formData.projectName.trim(),
        city: formData.city.trim(),
        source: formData.source,
        priority: formData.priority,
        createdBy: 'user',
        updatedBy: 'user'
      };

      // Only add optional fields if they have values
      if (formData.email.trim()) leadData.email = formData.email.trim();
      if (formData.address.trim()) leadData.address = formData.address.trim();
      if (formData.state.trim()) leadData.state = formData.state.trim();
      if (formData.pincode.trim()) leadData.pincode = formData.pincode.trim();
      if (formData.budgetMin) leadData.budgetMin = parseFloat(formData.budgetMin);
      if (formData.budgetMax) leadData.budgetMax = parseFloat(formData.budgetMax);
      if (formData.expectedValue) leadData.expectedValue = parseFloat(formData.expectedValue);
      if (formData.sqft) leadData.sqft = parseFloat(formData.sqft);
      if (formData.projectType.trim()) leadData.projectType = formData.projectType.trim();
      if (formData.timeline.trim()) leadData.timeline = formData.timeline.trim();
      if (formData.description.trim()) leadData.description = formData.description.trim();

      console.log('📝 Creating lead with data:', leadData);
      const newLead = await createLead(leadData);
      console.log('✅ Lead created:', newLead);
      addLead(newLead);

      onSuccess?.(newLead);
      onClose();

      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        projectName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        source: 'website',
        priority: 'medium',
        budgetMin: '',
        budgetMax: '',
        expectedValue: '',
        sqft: '',
        projectType: '',
        timeline: '',
        description: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to create lead:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create lead' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setErrors({});
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white dark:bg-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col h-full max-h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <User size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Create New Lead
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Add a new customer inquiry to your pipeline
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <User size={20} />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-slate-300 dark:border-slate-600'}`}
                          placeholder="Enter customer's full name"
                        />
                        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-300' : 'border-slate-300 dark:border-slate-600'}`}
                          placeholder="Enter 10-digit phone number"
                        />
                        {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-300' : 'border-slate-300 dark:border-slate-600'}`}
                          placeholder="Enter email address"
                        />
                        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Project Name *
                        </label>
                        <input
                          type="text"
                          value={formData.projectName}
                          onChange={(e) => handleInputChange('projectName', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.projectName ? 'border-red-300' : 'border-slate-300 dark:border-slate-600'}`}
                          placeholder="Enter project name"
                        />
                        {errors.projectName && <p className="text-sm text-red-600 mt-1">{errors.projectName}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <MapPin size={20} />
                      Address Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter full address"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="City"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="State"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Pincode
                          </label>
                          <input
                            type="text"
                            value={formData.pincode}
                            onChange={(e) => handleInputChange('pincode', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Pincode"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <Building size={20} />
                      Project Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Project Type
                        </label>
                        <select
                          value={formData.projectType}
                          onChange={(e) => handleInputChange('projectType', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select project type</option>
                          <option value="residential">Residential</option>
                          <option value="commercial">Commercial</option>
                          <option value="industrial">Industrial</option>
                          <option value="institutional">Institutional</option>
                          <option value="renovation">Renovation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Area (Sqft)
                        </label>
                        <input
                          type="number"
                          value={formData.sqft}
                          onChange={(e) => handleInputChange('sqft', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter area in square feet"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Budget Range (Min)
                        </label>
                        <input
                          type="number"
                          value={formData.budgetMin}
                          onChange={(e) => handleInputChange('budgetMin', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Minimum budget"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Budget Range (Max)
                        </label>
                        <input
                          type="number"
                          value={formData.budgetMax}
                          onChange={(e) => handleInputChange('budgetMax', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.budgetMax ? 'border-red-300' : 'border-slate-300 dark:border-slate-600'}`}
                          placeholder="Maximum budget"
                        />
                        {errors.budgetMax && <p className="text-sm text-red-600 mt-1">{errors.budgetMax}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Expected Value
                        </label>
                        <input
                          type="number"
                          value={formData.expectedValue}
                          onChange={(e) => handleInputChange('expectedValue', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Expected project value"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Timeline
                        </label>
                        <select
                          value={formData.timeline}
                          onChange={(e) => handleInputChange('timeline', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select timeline</option>
                          <option value="1-3 months">1-3 months</option>
                          <option value="3-6 months">3-6 months</option>
                          <option value="6-12 months">6-12 months</option>
                          <option value="1-2 years">1-2 years</option>
                          <option value="2+ years">2+ years</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Lead Classification */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <Tag size={20} />
                      Lead Classification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Lead Source
                        </label>
                        <select
                          value={formData.source}
                          onChange={(e) => handleInputChange('source', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {CRM_DEFAULTS.LEAD_SOURCES.map((source) => (
                            <option key={source} value={source.toLowerCase().replace(/\s+/g, '_')}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Priority
                        </label>
                        <select
                          value={formData.priority}
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {Object.entries(CRM_PRIORITIES).map(([key, priority]) => (
                            <option key={key} value={key}>
                              {priority.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
                      Additional Notes
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Any additional notes about this lead..."
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Create Lead
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateLeadModal;
