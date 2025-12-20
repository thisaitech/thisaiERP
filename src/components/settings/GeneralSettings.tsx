import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GeneralSettings, getGeneralSettings, saveGeneralSettings } from '../../services/settingsService';
import { cn } from '../../lib/utils';

export const GeneralSettingsSection = () => {
  const { t } = useLanguage();
  const { isDarkMode, setDarkMode } = useTheme();
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(getGeneralSettings());

  const handleSaveGeneralSettings = () => {
    saveGeneralSettings(generalSettings);
    toast.success('General settings saved successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">{t.settings.generalSettings}</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-medium mb-1 text-slate-600">{t.settings.businessName}</label>
          <input
            type="text"
            value={generalSettings.businessName}
            onChange={(e) => setGeneralSettings({ ...generalSettings, businessName: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium mb-1 text-slate-600">{t.settings.financialYear}</label>
            <select
              value={generalSettings.financialYear}
              onChange={(e) => setGeneralSettings({ ...generalSettings, financialYear: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            >
              <option>2023-2024</option>
              <option>2024-2025</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1 text-slate-600">{t.settings.currency}</label>
            <select
              value={generalSettings.currency}
              onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value as 'INR' | 'USD' | 'EUR', currencySymbol: e.target.value === 'INR' ? '₹' : e.target.value === 'USD' ? '$' : '€' })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium mb-1 text-slate-600">{t.settings.dateFormat}</label>
            <select
              value={generalSettings.dateFormat}
              onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-1 text-slate-600">{t.settings.timeFormat}</label>
            <select
              value={generalSettings.timeFormat}
              onChange={(e) => setGeneralSettings({ ...generalSettings, timeFormat: e.target.value as '12' | '24' })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            >
              <option value="12">{t.settings.hour12}</option>
              <option value="24">{t.settings.hour24}</option>
            </select>
          </div>
        </div>

        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="font-medium mb-1.5 text-xs text-slate-700">{t.settings.appearance}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isDarkMode ? <Moon size={14} weight="duotone" className="text-slate-600" /> : <Sun size={14} weight="duotone" className="text-slate-600" />}
              <span className="text-[10px] text-slate-600">{t.settings.darkMode}</span>
            </div>
            <label className="relative inline-block w-9 h-4.5">
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={() => {
                  const newValue = !isDarkMode;
                  setDarkMode(newValue);
                  setGeneralSettings(prevSettings => {
                    const newSettings = { ...prevSettings, darkMode: newValue };
                    saveGeneralSettings(newSettings);
                    return newSettings;
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-full h-full bg-slate-300 rounded-full peer peer-checked:bg-purple-600 transition-colors cursor-pointer"></div>
              <div className={cn(
                "absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform shadow-sm",
                isDarkMode && "translate-x-4.5"
              )}></div>
            </label>
          </div>
        </div>

        <button
          onClick={handleSaveGeneralSettings}
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-xs hover:bg-purple-700 transition-colors"
        >
          {t.settings.saveChanges}
        </button>
      </div>
    </motion.div>
  );
};
