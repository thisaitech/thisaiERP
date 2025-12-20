import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CreditCard, Lock, Eye, EyeSlash, CheckCircle, XCircle, Database, Link } from '@phosphor-icons/react';
import {
  getRazorpayConfig,
  saveRazorpayConfig,
  validateRazorpayKeys,
  isRazorpayConfigured,
  RazorpayConfig
} from '../../services/razorpayService';
import { cn } from '../../lib/utils';

export const RazorpaySettingsSection = () => {
  const [razorpayConfig, setRazorpayConfig] = useState<RazorpayConfig>(getRazorpayConfig());
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [isValidatingRazorpay, setIsValidatingRazorpay] = useState(false);
  const [razorpayValidationStatus, setRazorpayValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard size={24} weight="duotone" className="text-blue-600" />
            Razorpay Payment Gateway
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Accept payments via UPI, Cards, Net Banking, and Wallets
          </p>
        </div>
        {isRazorpayConfigured() && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle size={16} weight="fill" />
            Connected
          </div>
        )}
      </div>

      {/* Getting Started Guide */}
      {!isRazorpayConfigured() && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">🚀 Quick Setup Guide</h3>
          <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
            <li>Sign up at <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">razorpay.com</a> (free, takes 5 mins)</li>
            <li>Go to Account & Settings → API Keys</li>
            <li>Generate Test or Live keys</li>
            <li>Paste Key ID and Secret below</li>
          </ol>
        </div>
      )}

      <div className="space-y-6">
        {/* API Keys Section */}
        <div className="bg-muted/30 rounded-xl p-5 border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            API Credentials
          </h3>
          
          <div className="space-y-3">
            {/* Key ID */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Key ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={razorpayConfig.keyId}
                onChange={(e) => setRazorpayConfig(prev => ({ ...prev, keyId: e.target.value }))}
                placeholder="rzp_test_xxxxxxxxxxxxx or rzp_live_xxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Starts with rzp_test_ (test mode) or rzp_live_ (live mode)
              </p>
            </div>

            {/* Key Secret */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Key Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showRazorpaySecret ? 'text' : 'password'}
                  value={razorpayConfig.keySecret}
                  onChange={(e) => setRazorpayConfig(prev => ({ ...prev, keySecret: e.target.value }))}
                  placeholder="Enter your Razorpay Key Secret"
                  className="w-full px-4 py-2.5 pr-12 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showRazorpaySecret ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Keep this secret secure. Never share it publicly.
              </p>
            </div>

            {/* Mode Indicator */}
            <div className="flex items-center gap-4 pt-2">
              <div className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2",
                razorpayConfig.keyId.includes('_live_') 
                  ? "bg-green-100 text-green-700" 
                  : "bg-amber-100 text-amber-700"
              )}>
                {razorpayConfig.keyId.includes('_live_') ? (
                  <>
                    <CheckCircle size={16} weight="fill" />
                    Live Mode
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    Test Mode
                  </>
                )}
              </div>
              
              {razorpayValidationStatus === 'valid' && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle size={16} weight="fill" />
                  Keys validated
                </span>
              )}
              {razorpayValidationStatus === 'invalid' && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle size={16} weight="fill" />
                  Invalid keys
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-muted/30 rounded-xl p-5 border border-border">
          <h3 className="font-semibold mb-4">Enabled Payment Methods</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: 'upi', label: 'UPI', icon: '📱' },
              { key: 'card', label: 'Card', icon: '💳' },
              { key: 'netbanking', label: 'Net Banking', icon: '🏦' },
              { key: 'wallet', label: 'Wallet', icon: '👛' }
            ].map((method) => (
              <label
                key={method.key}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                  razorpayConfig.enabledMethods[method.key as keyof typeof razorpayConfig.enabledMethods]
                    ? "bg-primary/10 border-primary"
                    : "bg-background border-border hover:border-primary/50"
                )}
              >
                <input
                  type="checkbox"
                  checked={razorpayConfig.enabledMethods[method.key as keyof typeof razorpayConfig.enabledMethods]}
                  onChange={(e) => setRazorpayConfig(prev => ({
                    ...prev,
                    enabledMethods: { ...prev.enabledMethods, [method.key]: e.target.checked }
                  }))}
                  className="sr-only"
                />
                <span className="text-xl">{method.icon}</span>
                <span className="font-medium text-sm">{method.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="bg-muted/30 rounded-xl p-5 border border-border">
          <h3 className="font-semibold mb-4">Additional Options</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-medium">Auto-generate Payment Links</span>
                <p className="text-sm text-muted-foreground">
                  Automatically create payment links when saving invoices
                </p>
              </div>
              <input
                type="checkbox"
                checked={razorpayConfig.autoGenerateLinks}
                onChange={(e) => setRazorpayConfig(prev => ({ ...prev, autoGenerateLinks: e.target.checked }))}
                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
            </label>

            {/* Webhook Secret */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Webhook Secret (Optional)
              </label>
              <input
                type="text"
                value={razorpayConfig.webhookSecret || ''}
                onChange={(e) => setRazorpayConfig(prev => ({ ...prev, webhookSecret: e.target.value }))}
                placeholder="For auto-syncing payment status"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find this in Razorpay Dashboard → Webhooks → Add Endpoint
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={async () => {
              setIsValidatingRazorpay(true);
              const result = await validateRazorpayKeys(razorpayConfig.keyId, razorpayConfig.keySecret);
              setRazorpayValidationStatus(result.valid ? 'valid' : 'invalid');
              setIsValidatingRazorpay(false);
              
              if (result.valid) {
                toast.success(result.message);
              } else {
                toast.error(result.message);
              }
            }}
            disabled={isValidatingRazorpay || !razorpayConfig.keyId || !razorpayConfig.keySecret}
            className="px-4 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isValidatingRazorpay ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Test Connection
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              if (saveRazorpayConfig(razorpayConfig)) {
                toast.success('Razorpay settings saved successfully!');
              } else {
                toast.error('Failed to save settings');
              }
            }}
            disabled={!razorpayConfig.keyId || !razorpayConfig.keySecret}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Settings
          </button>

          <a
            href="https://dashboard.razorpay.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 text-blue-600 hover:underline flex items-center gap-1 text-sm"
          >
            <Link size={16} />
            Open Razorpay Dashboard
          </a>
        </div>

        {/* Fees Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-amber-800">
            <strong>💡 Note:</strong> Razorpay charges ~2% + GST per transaction. No setup or monthly fees.
            Test mode transactions are free.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
