import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { HardDrive, Users, Receipt, CloudArrowUp, CloudArrowDown, Trash, WifiHigh, ArrowsClockwise } from '@phosphor-icons/react';
import {
  getOfflineSyncSettings,
  saveOfflineSyncSettings,
  OfflineSyncSettings
} from '../../services/settingsService';
import {
  getCacheStats,
  clearAllOfflineData,
  cacheItems,
  cacheParties,
  cacheInvoices,
} from '../../services/offlineSyncService';
import { getItems } from '../../services/itemService';
import { getParties } from '../../services/partyService';
import { getInvoices } from '../../services/invoiceService';

export const OfflineSyncSettingsSection = () => {
  const [offlineSyncSettings, setOfflineSyncSettings] = useState<OfflineSyncSettings>(getOfflineSyncSettings());
  const [cacheStats, setCacheStats] = useState({ items: 0, parties: 0, invoices: 0, pendingSync: 0, lastSync: null as string | null });
  const [isCaching, setIsCaching] = useState(false);

  // Load cache statistics
  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleSaveOfflineSettings = () => {
    saveOfflineSyncSettings(offlineSyncSettings);
    toast.success('Offline & Sync settings saved successfully!');
  };

  const handleCacheAllData = async () => {
    setIsCaching(true);
    toast.loading('Caching data for offline use...');
    try {
      const [items, parties, invoices] = await Promise.all([
        getItems(),
        getParties(),
        getInvoices()
      ]);
      await Promise.all([
        cacheItems(items),
        cacheParties(parties),
        cacheInvoices(invoices)
      ]);
      await loadCacheStats();
      toast.dismiss();
      toast.success(`Cached ${items.length} items, ${parties.length} parties, ${invoices.length} invoices`);
    } catch (error) {
      console.error('Failed to cache data:', error);
      toast.dismiss();
      toast.error('Failed to cache data for offline use');
    } finally {
      setIsCaching(false);
    }
  };

  const handleClearOfflineCache = async () => {
    if (confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        toast.loading('Clearing offline cache...');
        await clearAllOfflineData();
        await loadCacheStats();
        toast.dismiss();
        toast.success('Offline cache cleared successfully');
      } catch (error) {
        console.error('Failed to clear offline cache:', error);
        toast.dismiss();
        toast.error('Failed to clear offline cache');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-sm font-semibold mb-2 text-slate-800">Offline & Sync Settings</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Configure offline mode and data synchronization settings. Enable offline-first mode to work without internet and sync when connected.
      </p>

      {/* Cache Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <HardDrive size={24} className="mx-auto mb-2 text-blue-600" weight="duotone" />
          <div className="text-2xl font-bold text-blue-700">{cacheStats.items}</div>
          <div className="text-xs text-blue-600">Cached Items</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <Users size={24} className="mx-auto mb-2 text-green-600" weight="duotone" />
          <div className="text-2xl font-bold text-green-700">{cacheStats.parties}</div>
          <div className="text-xs text-green-600">Cached Parties</div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
          <Receipt size={24} className="mx-auto mb-2 text-purple-600" weight="duotone" />
          <div className="text-2xl font-bold text-purple-700">{cacheStats.invoices}</div>
          <div className="text-xs text-purple-600">Cached Invoices</div>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <CloudArrowUp size={24} className="mx-auto mb-2 text-yellow-600" weight="duotone" />
          <div className="text-2xl font-bold text-yellow-700">{cacheStats.pendingSync}</div>
          <div className="text-xs text-yellow-600">Pending Sync</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={handleCacheAllData}
          disabled={isCaching}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          <CloudArrowDown size={18} weight="bold" />
          {isCaching ? 'Caching...' : 'Cache All Data Now'}
        </button>
        <button
          onClick={handleClearOfflineCache}
          className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
        >
          <Trash size={18} weight="bold" />
          Clear Offline Cache
        </button>
      </div>

      {/* Offline Mode Settings */}
      <div className="space-y-6">
        <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <WifiHigh size={28} weight="duotone" className="text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">Work Offline First</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={offlineSyncSettings.offlineFirstMode}
                    onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, offlineFirstMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Save all data locally first, then sync to cloud when internet is available. Best for areas with unreliable internet.
              </p>
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="p-6 border border-border rounded-lg space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ArrowsClockwise size={20} weight="duotone" />
            Sync Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Auto Sync</span>
              <input
                type="checkbox"
                checked={offlineSyncSettings.autoSync}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, autoSync: e.target.checked })}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Sync Only on WiFi</span>
              <input
                type="checkbox"
                checked={offlineSyncSettings.syncOnlyOnWifi}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, syncOnlyOnWifi: e.target.checked })}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Instant Sync</span>
              <input
                type="checkbox"
                checked={offlineSyncSettings.instantSync}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, instantSync: e.target.checked })}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <div className="p-3 bg-muted/30 rounded-lg">
              <label className="block text-sm font-medium mb-1">Sync Interval</label>
              <select
                value={offlineSyncSettings.syncInterval}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, syncInterval: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 bg-background text-sm"
              >
                <option value={15}>Every 15 seconds</option>
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
                <option value={300}>Every 5 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cache Settings */}
        <div className="p-6 border border-border rounded-lg space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <HardDrive size={20} weight="duotone" />
            Cache Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Cache Items</span>
              <input
                type="checkbox"
                checked={offlineSyncSettings.cacheItems}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, cacheItems: e.target.checked })}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Cache Parties</span>
              <input
                type="checkbox"
                checked={offlineSyncSettings.cacheParties}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, cacheParties: e.target.checked })}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Cache Invoices</span>
              <input
                type="checkbox"
                checked={offlineSyncSettings.cacheInvoices}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, cacheInvoices: e.target.checked })}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            <div className="p-3 bg-muted/30 rounded-lg">
              <label className="block text-sm font-medium mb-1">Cache Size Limit</label>
              <select
                value={offlineSyncSettings.localCacheSize}
                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, localCacheSize: parseInt(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 bg-background text-sm"
              >
                <option value={100}>100 MB</option>
                <option value={250}>250 MB</option>
                <option value={500}>500 MB</option>
                <option value={1000}>1 GB</option>
              </select>
            </div>
          </div>
        </div>

        {/* Last Sync Info */}
        {cacheStats.lastSync && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Last synced:</strong> {new Date(cacheStats.lastSync).toLocaleString()}
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSaveOfflineSettings}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Save Offline & Sync Settings
        </button>
      </div>
    </motion.div>
  );
};
