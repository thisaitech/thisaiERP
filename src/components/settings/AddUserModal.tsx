import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle, Plus, UserCircle } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { UserRole } from '../../services/authService';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (name: string, email: string, password: string, role: 'manager' | 'cashier') => Promise<void>;
  isCreatingUser: boolean;
}

export const AddUserModal = ({ isOpen, onClose, onCreateUser, isCreatingUser }: AddUserModalProps) => {
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'manager' | 'cashier'>('cashier');

  const handleCreate = async () => {
    await onCreateUser(newUserName, newUserEmail, newUserPassword, newUserRole);
    // Clear fields only if creation was successful, which we assume here.
    // The parent component will control closing the modal.
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('cashier');
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Add New Staff Member</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <XCircle size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter staff name"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="staff@business.com"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewUserRole('manager')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  newUserRole === 'manager'
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <UserCircle size={24} className={newUserRole === 'manager' ? "text-blue-600" : "text-slate-400"} />
                <p className="font-semibold mt-2">Manager</p>
                <p className="text-xs text-slate-500 mt-1">Sales, inventory & reports</p>
              </button>
              <button
                type="button"
                onClick={() => setNewUserRole('cashier')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  newUserRole === 'cashier'
                    ? "border-green-500 bg-green-50"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <UserCircle size={24} className={newUserRole === 'cashier' ? "text-green-600" : "text-slate-400"} />
                <p className="font-semibold mt-2">Cashier</p>
                <p className="text-xs text-slate-500 mt-1">POS & sales only</p>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreatingUser}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreatingUser ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus size={18} weight="bold" />
                Create User
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
