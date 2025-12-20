import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  getInvoiceTableColumnSettings,
  saveInvoiceTableColumnSettings,
  InvoiceTableColumnSettings,
} from '../../services/settingsService';

export const InvoiceTableSettingsSection = () => {
  const [invoiceTableColumnSettings, setInvoiceTableColumnSettings] = useState<InvoiceTableColumnSettings>(getInvoiceTableColumnSettings());

  const handleSaveInvoiceTableColumnSettings = () => {
    saveInvoiceTableColumnSettings(invoiceTableColumnSettings);
    toast.success('Invoice table column settings saved successfully!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Invoice Table Column Settings</h2>
      <p className="text-sm text-muted-foreground mb-6">Customize the column headings and visibility for the invoice item table in the Sales page.</p>

      <div className="space-y-6">
        {/* Column Labels Section */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h3 className="font-medium mb-4">Column Labels</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-2">Serial No Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.serialNoLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, serialNoLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="#"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Item Name Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.itemNameLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, itemNameLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Item Name"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">HSN Code Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.hsnCodeLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, hsnCodeLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="HSN"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Description Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.descriptionLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, descriptionLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Description"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Quantity Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.qtyLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, qtyLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Qty"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Unit Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.unitLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, unitLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Unit"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Tax Mode Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.taxModeLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, taxModeLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Tax Mode"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">MRP Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.mrpLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, mrpLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="MRP"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Taxable Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.taxableLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, taxableLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Taxable"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Discount % Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.discountPercentLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, discountPercentLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Disc %"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Discount Amount Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.discountAmountLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, discountAmountLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Disc ₹"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">GST % Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.gstPercentLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, gstPercentLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="GST %"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">GST Amount Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.gstAmountLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, gstAmountLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="GST ₹"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">CGST Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.cgstLabel}
                onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, cgstLabel: e.target.value})}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="CGST%"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">SGST Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.sgstLabel}
                onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, sgstLabel: e.target.value})}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="SGST%"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">IGST Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.igstLabel}
                onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, igstLabel: e.target.value})}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="IGST%"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Total Label</label>
              <input
                type="text"
                value={invoiceTableColumnSettings.totalLabel}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, totalLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 text-sm"
                placeholder="Total"
              />
            </div>
          </div>
        </div>

        {/* Column Visibility Section */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-4">Default Column Visibility</h3>
          <p className="text-xs text-muted-foreground mb-4">Set which columns are visible by default when creating a new invoice.</p>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
              <div>
                <p className="font-medium text-sm">HSN Code</p>
                <p className="text-xs text-muted-foreground">Show HSN/SAC code column</p>
              </div>
              <input
                type="checkbox"
                checked={invoiceTableColumnSettings.showHsnCode}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, showHsnCode: e.target.checked })}
                className="rounded w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
              <div>
                <p className="font-medium text-sm">Description</p>
                <p className="text-xs text-muted-foreground">Show item description column</p>
              </div>
              <input
                type="checkbox"
                checked={invoiceTableColumnSettings.showDescription}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, showDescription: e.target.checked })}
                className="rounded w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
              <div>
                <p className="font-medium text-sm">Tax Mode</p>
                <p className="text-xs text-muted-foreground">Show inclusive/exclusive tax mode column</p>
              </div>
              <input
                type="checkbox"
                checked={invoiceTableColumnSettings.showTaxMode}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, showTaxMode: e.target.checked })}
                className="rounded w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
              <div>
                <p className="font-medium text-sm">Discount</p>
                <p className="text-xs text-muted-foreground">Show discount % and amount columns</p>
              </div>
              <input
                type="checkbox"
                checked={invoiceTableColumnSettings.showDiscount}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, showDiscount: e.target.checked })}
                className="rounded w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
              <div>
                <p className="font-medium text-sm">GST Breakdown</p>
                <p className="text-xs text-muted-foreground">Show CGST/SGST/IGST separate columns</p>
              </div>
              <input
                type="checkbox"
                checked={invoiceTableColumnSettings.showGstBreakdown}
                onChange={(e) => setInvoiceTableColumnSettings({ ...invoiceTableColumnSettings, showGstBreakdown: e.target.checked })}
                className="rounded w-5 h-5"
              />
            </label>
          </div>
        </div>

        <button
          onClick={handleSaveInvoiceTableColumnSettings}
          className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors transition-colors"
        >
          Save Invoice Table Settings
        </button>
      </div>
    </motion.div>
  );
};
