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
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Taxes & GST Settings</h2>
      <div className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="font-medium mb-3">GST Registration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2">GSTIN</label>
              <input
                type="text"
                value={taxSettings.gstin}
                onChange={(e) => setTaxSettings({ ...taxSettings, gstin: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Registration Type</label>
              <select
                value={taxSettings.registrationType}
                onChange={(e) => setTaxSettings({ ...taxSettings, registrationType: e.target.value as 'regular' | 'composition' })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              >
                <option value="regular">Regular</option>
                <option value="composition">Composition</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-3">Tax Rates</h3>
          <div className="space-y-2">
            {[
              { rate: '0%', desc: 'Zero-rated supplies', key: 'enableGST0' as const },
              { rate: '5%', desc: 'Essential goods & services', key: 'enableGST5' as const },
              { rate: '12%', desc: 'Standard goods', key: 'enableGST12' as const },
              { rate: '18%', desc: 'Most goods & services', key: 'enableGST18' as const },
              { rate: '28%', desc: 'Luxury items', key: 'enableGST28' as const }
            ].map((tax) => (
              <div key={tax.rate} className="flex items-center justify-between p-2 bg-background rounded">
                <div>
                  <p className="font-medium text-sm">GST {tax.rate}</p>
                  <p className="text-xs text-muted-foreground">{tax.desc}</p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={taxSettings[tax.key]}
                    onChange={(e) => setTaxSettings({ ...taxSettings, [tax.key]: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-xs">Enable</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Additional Tax Settings</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={taxSettings.applyReverseCharge}
              onChange={(e) => setTaxSettings({ ...taxSettings, applyReverseCharge: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Apply reverse charge mechanism</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={taxSettings.includeCess}
              onChange={(e) => setTaxSettings({ ...taxSettings, includeCess: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Include cess in calculations</span>
          </label>
        </div>

        <div className="p-4 bg-success/5 rounded-lg border border-success/20">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <span className="text-success">⚡</span>
            Default Tax Mode (Vyapar Style)
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Choose how prices are entered by default. This affects new items and invoices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-medium mb-1 text-slate-600">Selling Price (Default)</label>
              <select
                value={taxSettings.defaultTaxMode}
                onChange={(e) => setTaxSettings({ ...taxSettings, defaultTaxMode: e.target.value as 'inclusive' | 'exclusive' })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              >
                <option value="exclusive">Without GST (GST alag se) - ₹100 + GST = ₹118</option>
                <option value="inclusive">With GST (Final amount) - ₹100 with GST included</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium mb-1 text-slate-600">Purchase Price (Default)</label>
              <select
                value={taxSettings.defaultPurchaseTaxMode}
                onChange={(e) => setTaxSettings({ ...taxSettings, defaultPurchaseTaxMode: e.target.value as 'inclusive' | 'exclusive' })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
              >
                <option value="exclusive">Without GST (GST alag se) - ₹100 + GST = ₹118</option>
                <option value="inclusive">With GST (Final amount) - ₹100 with GST included</option>
              </select>
            </div>
          </div>

          <div className="mt-3 p-3 bg-info/10 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong><br />
              • <strong>Without GST:</strong> You enter ₹100 → App adds GST → Final = ₹118 (Most common)<br />
              • <strong>With GST:</strong> You enter ₹100 → App calculates base ₹84.75 + GST ₹15.25 = ₹100<br />
              • "Without GST" means GST alag se add hoga | "With GST" means final amount customer ko pay karna hai
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveTaxSettings}
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-xs hover:bg-purple-700 transition-colors"
        >
          Save Tax Settings
        </button>
      </div>
    </motion.div>
  );
};
