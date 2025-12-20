import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Database, Receipt, Users, Package, Bell } from '@phosphor-icons/react';
import {
  exportCompleteData,
  exportInvoicesOnly,
  exportPartiesOnly,
  exportItemsOnly,
  createBackupJSON
} from '../../services/dataExportService';

export const BackupExportSettingsSection = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Data Export & Backup</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Export your business data for backup, migration, or analysis. All exports include complete data with proper formatting.
      </p>

      <div className="space-y-3">
        {/* Complete Data Export */}
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Database size={28} weight="duotone" className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Complete Data Export</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Export all your business data including invoices, customers, suppliers, and inventory in a single Excel file with multiple sheets. Perfect for complete backup or migration to other systems.
              </p>
              <button
                onClick={async () => {
                  try {
                    toast.loading('Preparing complete export...');
                    const result = await exportCompleteData('My Business');
                    toast.success(`✅ Export Complete!\n📊 ${result.invoices} Invoices\n👥 ${result.parties} Parties\n📦 ${result.items} Items\n\nFile: ${result.fileName}`);
                  } catch (error) {
                    toast.error('Export failed. Please try again.');
                  }
                }}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Database size={20} />
                Export Complete Data
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                📥 Exports as multi-sheet Excel file with Summary, Invoices, Customers & Suppliers, and Inventory
              </p>
            </div>
          </div>
        </div>

        {/* Individual Exports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Invoices */}
          <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={24} weight="duotone" className="text-accent" />
              <h3 className="font-semibold">Export Invoices</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Download all sales and purchase invoices with payment details, tax breakdown, and status.
            </p>
            <button
              onClick={async () => {
                try {
                  toast.loading('Exporting invoices...');
                  const result = await exportInvoicesOnly();
                  toast.success(`✅ Exported ${result.count} invoices!\n\nFile: ${result.fileName}`);
                } catch (error) {
                  toast.error('Export failed');
                }
              }}
              className="w-full px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg font-medium hover:bg-accent/20 transition-colors"
            >
              📄 Export Invoices
            </button>
          </div>

          {/* Export Parties */}
          <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Users size={24} weight="duotone" className="text-success" />
              <h3 className="font-semibold">Export Customers & Suppliers</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Export all customer and supplier details including contact info, GSTIN, and current balance.
            </p>
            <button
              onClick={async () => {
                try {
                  toast.loading('Exporting parties...');
                  const result = await exportPartiesOnly();
                  toast.success(`✅ Exported ${result.count} customers & suppliers!\n\nFile: ${result.fileName}`);
                } catch (error) {
                  toast.error('Export failed');
                }
              }}
              className="w-full px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg font-medium hover:bg-success/20 transition-colors"
            >
              👥 Export Parties
            </button>
          </div>

          {/* Export Items */}
          <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Package size={24} weight="duotone" className="text-warning" />
              <h3 className="font-semibold">Export Inventory</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Download complete inventory list with pricing, stock levels, HSN codes, and tax rates.
            </p>
            <button
              onClick={async () => {
                try {
                  toast.loading('Exporting inventory...');
                  const result = await exportItemsOnly();
                  toast.success(`✅ Exported ${result.count} items!\n\nFile: ${result.fileName}`);
                } catch (error) {
                  toast.error('Export failed');
                }
              }}
              className="w-full px-4 py-2 bg-warning/10 text-warning border border-warning/20 rounded-lg font-medium hover:bg-warning/20 transition-colors"
            >
              📦 Export Items
            </button>
          </div>

          {/* JSON Backup */}
          <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Database size={24} weight="duotone" className="text-info" />
              <h3 className="font-semibold">JSON Backup</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Create exact JSON backup for precise data restore. Includes all metadata and relationships.
            </p>
            <button
              onClick={async () => {
                try {
                  toast.loading('Creating JSON backup...');
                  const result = await createBackupJSON();
                  toast.success(`✅ Backup created!\n\nFile: ${result.fileName}\nTotal Records: ${result.totalRecords}`);
                } catch (error) {
                  toast.error('Backup failed');
                }
              }}
              className="w-full px-4 py-2 bg-info/10 text-info border border-info/20 rounded-lg font-medium hover:bg-info/20 transition-colors"
            >
              💾 Create JSON Backup
            </button>
          </div>
        </div>

        {/* Export Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Bell size={18} weight="duotone" />
            Export Information
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Excel Format:</strong> Easy to open in Excel, Google Sheets, or any spreadsheet software</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>JSON Format:</strong> For exact data backup and restore, or for developers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Migration Ready:</strong> Exported data can be imported into Zoho, Tally, or other CRM systems</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Data Safety:</strong> Regular backups recommended for data security</span>
            </li>
          </ul>
        </div>

        {/* Coming Soon: Import */}
        <div className="p-5 bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <Database size={24} weight="duotone" className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                Data Import
                <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">Coming Soon</span>
              </h3>
              <p className="text-sm text-muted-foreground">
                Import data from Zoho, Tally, Excel, or JSON backups. Bulk upload customers, suppliers, items, and invoices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
