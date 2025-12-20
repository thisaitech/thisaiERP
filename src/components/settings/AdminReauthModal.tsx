import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from '@phosphor-icons/react';
import { UserData, reauthenticate } from '../../services/authService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { toast } from 'sonner';

interface AdminReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReauthSuccess: () => void;
  pendingNewUser: UserData | null;
  adminEmail: string | undefined;
}

export const AdminReauthModal = ({ isOpen, onClose, onReauthSuccess, pendingNewUser, adminEmail }: AdminReauthModalProps) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [isReauthing, setIsReauthing] = useState(false);
  const { handleError } = useErrorHandler();

  const handleReauth = async () => {
    if (!adminPassword) {
      toast.error('Please enter your password');
      return;
    }
    setIsReauthing(true);
    try {
      await reauthenticate(adminPassword);
      toast.success('Re-authenticated successfully');
      onReauthSuccess();
    } catch (error) {
      handleError(error, 'AdminReauthModal.handleReauth');
    } finally {
      setAdminPassword('');
      setIsReauthing(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">User Created Successfully!</h3>
          {pendingNewUser && (
            <p className="text-slate-500 mt-2">
              <span className="font-medium">{pendingNewUser.displayName}</span> has been added as a <span className="font-medium capitalize">{pendingNewUser.role}</span>
            </p>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You've been signed out. Please enter your password to sign back in as admin.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Email</label>
            <input
              type="email"
              value={adminEmail || ''}
              disabled
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter your admin password"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleReauth()}
            />
          </div>
        </div>

        <button
          onClick={handleReauth}
          disabled={isReauthing}
          className="w-full mt-6 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isReauthing ? 'Signing In...' : 'Sign Back In'}
        </button>
      </motion.div>
    </div>
  );
};
