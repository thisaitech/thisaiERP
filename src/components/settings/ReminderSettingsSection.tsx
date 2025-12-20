
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { getReminderSettings, saveReminderSettings, ReminderSettings } from '../../services/settingsService';

export const ReminderSettingsSection = () => {
  const { t } = useLanguage();
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(getReminderSettings());

  const handleSaveReminderSettings = () => {
    saveReminderSettings(reminderSettings);
    toast.success('Reminder settings saved successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Reminder Settings</h2>
      <div className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Payment Reminders</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminderSettings.sendOverdueReminders}
              onChange={(e) => setReminderSettings({ ...reminderSettings, sendOverdueReminders: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Send reminders for overdue payments</span>
          </label>
          <div className="ml-6">
            <label className="block text-sm mb-2">Remind before (days)</label>
            <input
              type="number"
              value={reminderSettings.remindBeforeDays}
              onChange={(e) => setReminderSettings({ ...reminderSettings, remindBeforeDays: parseInt(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Stock Reminders</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminderSettings.alertLowStock}
              onChange={(e) => setReminderSettings({ ...reminderSettings, alertLowStock: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Alert for low stock items</span>
          </label>
          <div className="ml-6">
            <label className="block text-sm mb-2">Low stock threshold</label>
            <input
              type="number"
              value={reminderSettings.lowStockThreshold}
              onChange={(e) => setReminderSettings({ ...reminderSettings, lowStockThreshold: parseInt(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            />
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Notification Channels</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminderSettings.emailNotifications}
              onChange={(e) => setReminderSettings({ ...reminderSettings, emailNotifications: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Email notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminderSettings.smsNotifications}
              onChange={(e) => setReminderSettings({ ...reminderSettings, smsNotifications: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">SMS notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminderSettings.whatsappNotifications}
              onChange={(e) => setReminderSettings({ ...reminderSettings, whatsappNotifications: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">WhatsApp notifications</span>
          </label>
        </div>

        <button
          onClick={handleSaveReminderSettings}
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-xs hover:bg-purple-700 transition-colors"
        >
          Save Reminder Settings
        </button>
      </div>
    </motion.div>
  );
};
