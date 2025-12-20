
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { getItemSettings, saveItemSettings, ItemSettings } from '../../services/settingsService';
import { Trash, X, Tag, Package } from '@phosphor-icons/react';
import { ReusableModal } from '../ui/ReusableModal';

export const ItemSettingsSection = () => {
  const { t } = useLanguage();
  const [itemSettings, setItemSettings] = useState<ItemSettings>(getItemSettings());
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);
  const [newProductCategoryName, setNewProductCategoryName] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const handleSaveItemSettings = () => {
    saveItemSettings(itemSettings);
    toast.success('Item settings saved successfully!');
  };

  const handleAddUnit = () => {
    const trimmedUnitName = newUnitName.trim().toUpperCase();
    if (trimmedUnitName) {
      if (!itemSettings.itemUnits.includes(trimmedUnitName)) {
        setItemSettings(prev => ({ ...prev, itemUnits: [...prev.itemUnits, trimmedUnitName] }));
        toast.success(`Unit "${trimmedUnitName}" added successfully`);
      } else {
        toast.error('Unit already exists');
      }
      setShowAddUnitModal(false);
      setNewUnitName('');
    }
  };

  const handleAddProductCategory = () => {
    const trimmedCategoryName = newProductCategoryName.trim();
    if (trimmedCategoryName) {
      if (!(itemSettings.productCategories || []).includes(trimmedCategoryName)) {
        setItemSettings(prev => ({
          ...prev,
          productCategories: [...(prev.productCategories || []), trimmedCategoryName]
        }));
        toast.success(`Category "${trimmedCategoryName}" added`);
        setShowAddCategoryModal(false);
        setNewProductCategoryName('');
      } else {
        toast.error('Category already exists');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Item Settings</h2>
      <div className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Item Preferences</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={itemSettings.autoGenerateSKU}
              onChange={(e) => setItemSettings({ ...itemSettings, autoGenerateSKU: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Auto-generate SKU codes</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={itemSettings.trackInventory}
              onChange={(e) => setItemSettings({ ...itemSettings, trackInventory: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Track inventory for all items</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={itemSettings.enableBarcode}
              onChange={(e) => setItemSettings({ ...itemSettings, enableBarcode: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Enable barcode scanning</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={itemSettings.allowNegativeStock}
              onChange={(e) => setItemSettings({ ...itemSettings, allowNegativeStock: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Allow negative stock</span>
          </label>
        </div>

        <div>
          <label className="block text-[10px] font-medium mb-1 text-slate-600">Default Tax Rate</label>
          <select
            value={itemSettings.defaultTaxRate}
            onChange={(e) => setItemSettings({ ...itemSettings, defaultTaxRate: parseFloat(e.target.value) })}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100"
          >
            <option value="0">GST 0%</option>
            <option value="5">GST 5%</option>
            <option value="12">GST 12%</option>
            <option value="18">GST 18%</option>
            <option value="28">GST 28%</option>
          </select>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h3 className="font-medium">Item Units</h3>
          <div className="space-y-2">
            {itemSettings.itemUnits.map((unit) => (
              <div key={unit} className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border">
                <span className="text-sm font-medium">{unit}</span>
                <button
                  onClick={() => {
                    setUnitToDelete(unit);
                    setShowDeleteUnitModal(true);
                  }}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                setNewUnitName('');
                setShowAddUnitModal(true);
              }}
              className="w-full px-3 py-2.5 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20 font-medium transition-colors"
            >
              + Add Unit
            </button>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={20} className="text-emerald-600" />
            <h3 className="font-bold text-emerald-800">Product Categories</h3>
          </div>
          <p className="text-xs text-emerald-600 mb-3">
            Manage categories for your inventory items. These will appear in POS and Inventory.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(itemSettings.productCategories || []).map((category) => (
              <div key={category} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-emerald-500" />
                  <span className="text-sm font-medium">{category}</span>
                </div>
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
          </div>
          <button
            onClick={() => {
              setNewProductCategoryName('');
              setShowAddCategoryModal(true);
            }}
            className="w-full px-3 py-2.5 bg-emerald-500/10 text-emerald-600 text-sm rounded-lg hover:bg-emerald-500/20 font-medium transition-colors"
          >
            + Add Category
          </button>
        </div>

        <button
          onClick={handleSaveItemSettings}
          className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium text-xs hover:bg-purple-700 transition-colors"
        >
          Save Item Settings
        </button>
      </div>

      <ReusableModal
        isOpen={showAddUnitModal}
        onClose={() => setShowAddUnitModal(false)}
        title="Add New Unit"
        footer={
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                setShowAddUnitModal(false);
                setNewUnitName('');
              }}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddUnit}
              disabled={!newUnitName.trim()}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Add Unit
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Name</label>
            <input
              type="text"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="e.g., KG, LTR, PCS, BOX"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddUnit();
                }
              }}
            />
            <p className="text-xs text-slate-500 mt-1.5">Enter unit abbreviation (e.g., KG, LTR). It will be saved in uppercase.</p>
          </div>
        </div>
      </ReusableModal>

      <ReusableModal
        isOpen={showDeleteUnitModal && unitToDelete !== null}
        onClose={() => setShowDeleteUnitModal(false)}
        title="Delete Unit?"
        footer={
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => {
                setShowDeleteUnitModal(false);
                setUnitToDelete(null);
              }}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if(unitToDelete){
                  setItemSettings({ ...itemSettings, itemUnits: itemSettings.itemUnits.filter(u => u !== unitToDelete) });
                  toast.success(`Unit "${unitToDelete}" deleted`);
                  setShowDeleteUnitModal(false);
                  setUnitToDelete(null);
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
            Are you sure you want to delete the unit <span className="font-semibold text-slate-700">"{unitToDelete}"</span>? This action cannot be undone.
          </p>
        </div>
      </ReusableModal>

      <ReusableModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        title="Add New Category"
        footer={
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                setShowAddCategoryModal(false);
                setNewProductCategoryName('');
              }}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProductCategory}
              disabled={!newProductCategoryName.trim()}
              className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg font-medium text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
              value={newProductCategoryName}
              onChange={(e) => setNewProductCategoryName(e.target.value)}
              placeholder="e.g., Electronics, Clothing"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddProductCategory();
                }
              }}
            />
            <p className="text-xs text-slate-500 mt-1.5">Enter the full name of the category.</p>
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
                  setItemSettings({ ...itemSettings, productCategories: (itemSettings.productCategories || []).filter(c => c !== categoryToDelete) });
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
