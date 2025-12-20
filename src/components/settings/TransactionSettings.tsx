import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  getTransactionSettings,
  saveTransactionSettings,
  TransactionSettings,
} from '../../services/settingsService';

export const TransactionSettingsSection = () => {
  const [transactionSettings, setTransactionSettings] = useState<TransactionSettings>(getTransactionSettings());

  const handleSaveTransactionSettings = () => {
    saveTransactionSettings(transactionSettings);
    toast.success('Transaction settings saved successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Transaction Settings</h2>
      <div className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Invoice Preferences</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={transactionSettings.autoGenerateInvoiceNumbers}
              onChange={(e) => setTransactionSettings({ ...transactionSettings, autoGenerateInvoiceNumbers: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Auto-generate invoice numbers</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={transactionSettings.showTermsOnInvoice}
              onChange={(e) => setTransactionSettings({ ...transactionSettings, showTermsOnInvoice: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Show terms and conditions on invoice</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={transactionSettings.requireApproval}
              onChange={(e) => setTransactionSettings({ ...transactionSettings, requireApproval: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Require approval before finalizing</span>
          </label>
        </div>

        <div>
          <label className="block text-[10px] font-medium mb-1 text-slate-600">Invoice Prefix</label>
          <input
            type="text"
            value={transactionSettings.invoicePrefix}
            onChange={(e) => setTransactionSettings({ ...transactionSettings, invoicePrefix: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium mb-1 text-slate-600">Next Invoice Number</label>
          <input
            type="number"
            value={transactionSettings.nextInvoiceNumber}
            onChange={(e) => setTransactionSettings({ ...transactionSettings, nextInvoiceNumber: parseInt(e.target.value) || 0 })}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Payment Terms</h3>
          <div>
            <label className="block text-sm mb-2">Default Payment Terms</label>
            <select
              value={transactionSettings.defaultPaymentTerms}
              onChange={(e) => setTransactionSettings({ ...transactionSettings, defaultPaymentTerms: e.target.value as 'due_on_receipt' | 'net_15' | 'net_30' | 'net_45' | 'net_60' })}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
            >
              <option value="due_on_receipt">Due on Receipt</option>
              <option value="net_15">Net 15 Days</option>
              <option value="net_30">Net 30 Days</option>
              <option value="net_45">Net 45 Days</option>
              <option value="net_60">Net 60 Days</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSaveTransactionSettings}
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-xs hover:bg-purple-700 transition-colors"
        >
          Save Transaction Settings
        </button>
      </div>
    </motion.div>
  );
};
