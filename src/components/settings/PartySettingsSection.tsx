
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { getPartySettings, savePartySettings, PartySettings } from '../../services/settingsService';
import { Trash } from '@phosphor-icons/react';
import { ReusableModal } from '../ui/ReusableModal';

export const PartySettingsSection = () => {
  const { t } = useLanguage();
  const [partySettings, setPartySettings] = useState<PartySettings>(getPartySettings());
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const handleSavePartySettings = () => {
    savePartySettings(partySettings);
    toast.success('Party settings saved successfully!');
  };

  const handleAddPartyCategory = () => {
    const trimmedCategoryName = newCategoryName.trim();
    if (trimmedCategoryName) {
      if (!partySettings.partyCategories.includes(trimmedCategoryName)) {
        setPartySettings(prev => ({ ...prev, partyCategories: [...prev.partyCategories, trimmedCategoryName] }));
        toast.success(`Category "${trimmedCategoryName}" added successfully`);
      } else {
        toast.error('Category already exists');
      }
      setShowAddCategoryModal(false);
      setNewCategoryName('');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Party Settings</h2>
      <div className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Party Preferences</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={partySettings.requireGSTIN}
              onChange={(e) => setPartySettings({ ...partySettings, requireGSTIN: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Require GSTIN for all parties</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={partySettings.enableCreditLimit}
              onChange={(e) => setPartySettings({ ...partySettings, enableCreditLimit: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Enable credit limit management</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={partySettings.trackLedgerAutomatically}
              onChange={(e) => setPartySettings({ ...partySettings, trackLedgerAutomatically: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Track party ledger automatically</span>
          </label>
        </div>

        <div>
          <label className="block text-[10px] font-medium mb-1 text-slate-600">Default Credit Period (Days)</label>
          <input
            type="number"
            value={partySettings.defaultCreditPeriod}
            onChange={(e) => setPartySettings({ ...partySettings, defaultCreditPeriod: parseInt(e.target.value) || 0 })}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Party Categories</h3>
          <div className="space-y-2">
            {partySettings.partyCategories.map((category) => (
              <div key={category} className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border">
                <span className="text-sm font-medium">{category}</span>
                <button
                  onClick={() => {
                    setCategoryToDelete(category);
                    setShowDeleteCategoryModal(true);
                  }}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                setNewCategoryName('');
                setShowAddCategoryModal(true);
              }}
              className="w-full px-3 py-2.5 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20 font-medium transition-colors"
            >
              + Add Category
            </button>
          </div>
        </div>

        <button
          onClick={handleSavePartySettings}
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-xs hover:bg-purple-700 transition-colors"
        >
          Save Party Settings
        </button>
      </div>

      <ReusableModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        title="Add Party Category"
        footer={
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                setShowAddCategoryModal(false);
                setNewCategoryName('');
              }}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPartyCategory}
              disabled={!newCategoryName.trim()}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Add Category
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category Name</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Wholesale, Retail, VIP"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPartyCategory();
                }
              }}
            />
            <p className="text-xs text-slate-500 mt-1.5">Enter a name to categorize your parties/customers</p>
          </div>
        </div>
      </ReusableModal>

      <ReusableModal
        isOpen={showDeleteCategoryModal && categoryToDelete !== null}
        onClose={() => setShowDeleteCategoryModal(false)}
        title="Delete Category?"
        footer={
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => {
                setShowDeleteCategoryModal(false);
                setCategoryToDelete(null);
              }}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if(categoryToDelete){
                  setPartySettings({ ...partySettings, partyCategories: partySettings.partyCategories.filter(c => c !== categoryToDelete) });
                  toast.success(`Category "${categoryToDelete}" deleted`);
                  setShowDeleteCategoryModal(false);
                  setCategoryToDelete(null);
                }
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 text-sm"
            >
              Delete
            </button>
          </div>
        }
      >
        <div className="text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash size={28} className="text-red-600" />
          </div>
          <p className="text-sm text-slate-500">
            Are you sure you want to delete the category <span className="font-semibold text-slate-700">"{categoryToDelete}"</span>? This action cannot be undone.
          </p>
        </div>
      </ReusableModal>
    </motion.div>
  );
};
