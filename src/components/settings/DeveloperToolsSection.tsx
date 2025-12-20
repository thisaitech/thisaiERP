import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { generateAllDummyData } from '../../services/dummyDataService';
import { clearAllData } from '../../utils/clearAllData';

export const DeveloperToolsSection = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDummyData = async () => {
    setIsGenerating(true);
    toast.loading('Generating dummy data...');

    try {
      const result = await generateAllDummyData();
      toast.success(`Successfully generated ${result.total} records!\n- ${result.parties} Parties\n- ${result.items} Items\n- ${result.sales} Sales\n- ${result.purchases} Purchases\n- ${result.challans} Delivery Challans\n- ${result.purchaseOrders} Purchase Orders`);
    } catch (error) {
      console.error('Error generating dummy data:', error);
      toast.error('Failed to generate dummy data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will DELETE ALL data including:\n\n• All Parties/Customers\n• All Items/Products\n• All Invoices\n• All Delivery Challans\n• All Purchase Orders\n• Local Storage data\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?')) {
      return;
    }

    if (!confirm('🚨 FINAL CONFIRMATION\n\nThis is your last chance to cancel.\n\nClick OK to permanently delete all data.')) {
      return;
    }

    const loadingToast = toast.loading('Clearing all data...');

    try {
      await clearAllData();
      toast.success('All data cleared successfully!', { id: loadingToast });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data', { id: loadingToast });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-sm font-semibold mb-2 text-slate-800">Developer Tools</h2>
        <div className="space-y-6">
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
            <Database size={32} weight="duotone" className="text-primary" />
            <div>
                <h3 className="font-bold text-lg">Generate Dummy Data</h3>
                <p className="text-sm text-muted-foreground">
                Generate comprehensive dummy data to test all features and reports
                </p>
            </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Customers</p>
                <p className="text-lg font-bold">15</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Suppliers</p>
                <p className="text-lg font-bold">10</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Items</p>
                <p className="text-lg font-bold">15</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="text-lg font-bold">50</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Purchases</p>
                <p className="text-lg font-bold">40</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Challans</p>
                <p className="text-lg font-bold">20</p>
            </div>
            </div>

            <button
            onClick={handleGenerateDummyData}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
            <Database size={20} />
            {isGenerating ? 'Generating...' : 'Generate Dummy Data'}
            </button>

            <p className="text-xs text-muted-foreground mt-3">
            ⚠️ This will add dummy parties, items, sales, purchases, delivery challans, and purchase orders to your database for testing.
            </p>
        </div>

        <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
            <Trash size={32} weight="duotone" className="text-destructive" />
            <div>
                <h3 className="font-bold text-lg">Clear All Data</h3>
                <p className="text-sm text-muted-foreground">
                Remove all data from local storage (parties, items, transactions, etc.)
                </p>
            </div>
            </div>

            <button
            onClick={handleClearAllData}
            className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 flex items-center justify-center gap-2"
            >
            <Trash size={20} />
            Clear All Data
            </button>

            <p className="text-xs text-destructive mt-3">
            ⚠️ Warning: This action is irreversible and will delete ALL your data!
            </p>
        </div>

        <div className="p-6 bg-accent/5 border border-accent/20 rounded-lg">
            <h3 className="font-bold mb-3">Available Reports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-background rounded">✓ Sale Report</div>
            <div className="p-2 bg-background rounded">✓ Purchase Report</div>
            <div className="p-2 bg-background rounded">✓ Day Book</div>
            <div className="p-2 bg-background rounded">✓ Bill-wise Profit</div>
            <div className="p-2 bg-background rounded">✓ Profit & Loss</div>
            <div className="p-2 bg-background rounded">✓ Cash Flow</div>
            <div className="p-2 bg-background rounded">✓ Balance Sheet</div>
            <div className="p-2 bg-background rounded">✓ Trial Balance</div>
            <div className="p-2 bg-background rounded">✓ Party Statement</div>
            <div className="p-2 bg-background rounded">✓ Party-wise P&L</div>
            <div className="p-2 bg-background rounded">✓ GSTR-1</div>
            <div className="p-2 bg-background rounded">✓ GSTR-3B</div>
            <div className="p-2 bg-background rounded">✓ HSN Summary</div>
            <div className="p-2 bg-background rounded">✓ Stock Summary</div>
            <div className="p-2 bg-background rounded">✓ Item-wise P&L</div>
            <div className="p-2 bg-background rounded">✓ Discount Report</div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
            Navigate to Reports page to view all these reports with the generated dummy data.
            </p>
        </div>
        </div>
    </motion.div>
  );
};
