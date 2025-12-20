
import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Tag, ShareNetwork, ArrowsClockwise, Database } from '@phosphor-icons/react';

export const UtilitiesSettingsSection = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Utilities</h2>
      <div className="space-y-6">
        {/* Bulk Update Tax Slab */}
        <div className="p-4 sm:p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2 mb-4">
            <Tag size={28} weight="duotone" className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">Bulk Update Tax Slab</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Update tax rates for all items at once
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">From Tax Rate</label>
              <select className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white">
                <option value="">Select current rate</option>
                <option value="0">GST 0%</option>
                <option value="5">GST 5%</option>
                <option value="12">GST 12%</option>
                <option value="18">GST 18%</option>
                <option value="28">GST 28%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">To Tax Rate</label>
              <select className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white">
                <option value="">Select new rate</option>
                <option value="0">GST 0%</option>
                <option value="5">GST 5%</option>
                <option value="12">GST 12%</option>
                <option value="18">GST 18%</option>
                <option value="28">GST 28%</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => toast.info('Bulk tax update feature coming soon!')}
            className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 text-sm sm:text-base"
          >
            Update Tax Rates
          </button>
        </div>

        {/* Team Sharing */}
        <div className="p-4 sm:p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2 mb-4">
            <ShareNetwork size={28} weight="duotone" className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base sm:text-lg">Team Sharing</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Invite team members to collaborate on your business
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter team member email"
                className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-white"
              />
              <select className="px-3 py-2.5 text-sm border border-border rounded-lg bg-white sm:w-28">
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              onClick={() => toast.info('Team invite feature coming soon!')}
              className="w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 text-sm sm:text-base"
            >
              Send Invite
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 sm:p-6 bg-muted/50 rounded-lg">
          <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-2">
            <button
              onClick={() => toast.info('Recalculating balances...')}
              className="p-3 sm:p-4 bg-background border border-border rounded-lg text-xs sm:text-sm font-medium hover:bg-muted text-left"
            >
              <ArrowsClockwise size={20} className="mb-1.5 sm:mb-2 text-primary" />
              <span className="block leading-tight">Recalculate Balances</span>
            </button>
            <button
              onClick={() => toast.info('Verifying stock levels...')}
              className="p-3 sm:p-4 bg-background border border-border rounded-lg text-xs sm:text-sm font-medium hover:bg-muted text-left"
            >
              <Database size={20} className="mb-1.5 sm:mb-2 text-primary" />
              <span className="block leading-tight">Verify Stock</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
