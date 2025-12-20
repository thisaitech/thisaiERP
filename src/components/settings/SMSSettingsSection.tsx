
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSMSSettings, saveSMSSettings, SMSSettings } from '../../services/settingsService';

export const SMSSettingsSection = () => {
  const { t } = useLanguage();
  const [smsSettings, setSmsSettings] = useState<SMSSettings>(getSMSSettings());

  const handleSaveSMSSettings = () => {
    saveSMSSettings(smsSettings);
    toast.success('SMS settings saved successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Transactional SMS</h2>
      <div className="space-y-6">
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">SMS Credits</h3>
            <span className="text-2xl font-bold text-primary">{smsSettings.smsCredits}</span>
          </div>
          <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            Buy More Credits
          </button>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">SMS Notifications</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smsSettings.sendOnInvoiceCreation}
              onChange={(e) => setSmsSettings({ ...smsSettings, sendOnInvoiceCreation: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Send SMS on invoice creation</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smsSettings.sendPaymentReminders}
              onChange={(e) => setSmsSettings({ ...smsSettings, sendPaymentReminders: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Send payment reminders</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smsSettings.sendDeliveryUpdates}
              onChange={(e) => setSmsSettings({ ...smsSettings, sendDeliveryUpdates: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Send delivery updates</span>
          </label>
        </div>

        <div>
          <label className="block text-[10px] font-medium mb-1 text-slate-600">SMS Template</label>
          <textarea
            rows={4}
            value={smsSettings.smsTemplate}
            onChange={(e) => setSmsSettings({ ...smsSettings, smsTemplate: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          ></textarea>
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: {'{customer}, {invoice_no}, {amount}, {link}'}
          </p>
        </div>

        <button
          onClick={handleSaveSMSSettings}
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-xs hover:bg-purple-700 transition-colors"
        >
          Save SMS Settings
        </button>
      </div>
    </motion.div>
  );
};
