import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { MapPin, Phone, Envelope } from '@phosphor-icons/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanySettings, getCompanySettings, saveCompanySettings } from '../../services/settingsService';
import { INDIAN_STATES_WITH_CODES, getStateCode } from '../../services/taxCalculations';

export const CompanySettingsSection = () => {
  const { t } = useLanguage();
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getCompanySettings());

  const handleSaveCompanySettings = () => {
    saveCompanySettings(companySettings);
    toast.success('Company information updated successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">{t.settings.companyInfo}</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">{t.settings.companyName}</label>
          <input
            type="text"
            value={companySettings.companyName}
            onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">{t.settings.gstin}</label>
            <input
              type="text"
              value={companySettings.gstin}
              onChange={(e) => setCompanySettings({ ...companySettings, gstin: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
          <div>
            <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">{t.settings.panNumber}</label>
            <input
              type="text"
              value={companySettings.pan}
              onChange={(e) => setCompanySettings({ ...companySettings, pan: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">{t.settings.address}</label>
          <textarea
            rows={3}
            value={companySettings.address}
            onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
            className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          ></textarea>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <MapPin size={16} />
              City
            </label>
            <input
              type="text"
              value={companySettings.city || ''}
              onChange={(e) => setCompanySettings({ ...companySettings, city: e.target.value })}
              placeholder="Enter city"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
          <div>
            <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <MapPin size={16} />
              State <span className="text-red-500">*</span>
            </label>
            <select
              value={companySettings.state || ''}
              onChange={(e) => {
                const selectedState = e.target.value;
                const stateCode = getStateCode(selectedState);
                setCompanySettings({
                  ...companySettings,
                  state: selectedState,
                  stateCode: stateCode
                });
              }}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 bg-white dark:bg-slate-700"
            >
              <option value="">Select State</option>
              {INDIAN_STATES_WITH_CODES.map((state) => (
                <option key={state.code} value={state.name}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
            {companySettings.state && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                State Code: {companySettings.stateCode || getStateCode(companySettings.state)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">Pincode</label>
            <input
              type="text"
              value={companySettings.pincode || ''}
              onChange={(e) => setCompanySettings({ ...companySettings, pincode: e.target.value })}
              placeholder="Enter pincode"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Phone size={16} />
              {t.settings.phone}
            </label>
            <input
              type="tel"
              value={companySettings.phone}
              onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
          <div>
            <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Envelope size={16} />
              {t.settings.email}
            </label>
            <input
              type="email"
              value={companySettings.email}
              onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
        </div>
        <button
          onClick={handleSaveCompanySettings}
          className="w-full px-5 py-3.5 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors"
        >
          {t.settings.updateCompanyInfo}
        </button>
      </div>
    </motion.div>
  );
};
