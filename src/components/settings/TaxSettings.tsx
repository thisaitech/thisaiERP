import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  getTaxSettings,
  saveTaxSettings,
  TaxSettings,
} from '../../services/settingsService';

export const TaxSettingsSection = () => {
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(getTaxSettings());

  const handleSaveTaxSettings = () => {
    saveTaxSettings(taxSettings);
    toast.success('Tax settings saved successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Taxes & GST Settings</h2>
      <div className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="font-medium mb-4 text-lg">GST Registration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">GSTIN</label>
              <input
                type="text"
                value={taxSettings.gstin}
                onChange={(e) => setTaxSettings({ ...taxSettings, gstin: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              />
            </div>
            <div>
              <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">Registration Type</label>
              <select
                value={taxSettings.registrationType}
                onChange={(e) => setTaxSettings({ ...taxSettings, registrationType: e.target.value as 'regular' | 'composition' })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              >
                <option value="regular">Regular</option>
                <option value="composition">Composition</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-4 text-lg">Tax Rates</h3>
          <div className="space-y-3">
            {[
              { rate: '0%', desc: 'Zero-rated supplies', key: 'enableGST0' as const },
              { rate: '5%', desc: 'Essential goods & services', key: 'enableGST5' as const },
              { rate: '12%', desc: 'Standard goods', key: 'enableGST12' as const },
              { rate: '18%', desc: 'Most goods & services', key: 'enableGST18' as const },
              { rate: '28%', desc: 'Luxury items', key: 'enableGST28' as const }
            ].map((tax) => (
              <div key={tax.rate} className="flex items-center justify-between p-4 bg-background rounded">
                <div>
                  <p className="font-medium text-lg">GST {tax.rate}</p>
                  <p className="text-base text-muted-foreground">{tax.desc}</p>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={taxSettings[tax.key]}
                    onChange={(e) => setTaxSettings({ ...taxSettings, [tax.key]: e.target.checked })}
                    className="rounded w-5 h-5"
                  />
                  <span className="text-base">Enable</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-muted/50 rounded-lg space-y-4">
          <h3 className="font-medium text-lg">Additional Tax Settings</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={taxSettings.applyReverseCharge}
              onChange={(e) => setTaxSettings({ ...taxSettings, applyReverseCharge: e.target.checked })}
              className="rounded w-5 h-5"
            />
            <span className="text-lg">Apply reverse charge mechanism</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={taxSettings.includeCess}
              onChange={(e) => setTaxSettings({ ...taxSettings, includeCess: e.target.checked })}
              className="rounded w-5 h-5"
            />
            <span className="text-lg">Include cess in calculations</span>
          </label>
        </div>

        <div className="p-4 bg-success/5 rounded-lg border border-success/20">
          <h3 className="font-medium mb-4 flex items-center gap-2 text-lg">
            <span className="text-success">⚡</span>
            Default Tax Mode (Vyapar Style)
          </h3>
          <p className="text-base text-muted-foreground mb-4">
            Choose how prices are entered by default. This affects new items and invoices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">Selling Price (Default)</label>
              <select
                value={taxSettings.defaultTaxMode}
                onChange={(e) => setTaxSettings({ ...taxSettings, defaultTaxMode: e.target.value as 'inclusive' | 'exclusive' })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              >
                <option value="exclusive">Without GST (GST alag se) - ₹100 + GST = ₹118</option>
                <option value="inclusive">With GST (Final amount) - ₹100 with GST included</option>
              </select>
            </div>
            <div>
              <label className="block text-base font-medium mb-2 text-slate-600 dark:text-slate-400">Purchase Price (Default)</label>
              <select
                value={taxSettings.defaultPurchaseTaxMode}
                onChange={(e) => setTaxSettings({ ...taxSettings, defaultPurchaseTaxMode: e.target.value as 'inclusive' | 'exclusive' })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              >
                <option value="exclusive">Without GST (GST alag se) - ₹100 + GST = ₹118</option>
                <option value="inclusive">With GST (Final amount) - ₹100 with GST included</option>
              </select>
            </div>
          </div>

          <div className="mt-4 p-4 bg-info/10 rounded-lg">
            <p className="text-base text-muted-foreground">
              <strong>How it works:</strong><br />
              • <strong>Without GST:</strong> You enter ₹100 → App adds GST → Final = ₹118 (Most common)<br />
              • <strong>With GST:</strong> You enter ₹100 → App calculates base ₹84.75 + GST ₹15.25 = ₹100<br />
              • "Without GST" means GST alag se add hoga | "With GST" means final amount customer ko pay karna hai
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveTaxSettings}
          className="w-full px-5 py-3.5 bg-purple-600 text-white rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors"
        >
          Save Tax Settings
        </button>
      </div>
    </motion.div>
  );
};
