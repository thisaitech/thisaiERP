import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Lock,
  Plus,
  Trash,
  UserCircle,
  ShieldCheck,
  Warning,
  XCircle,
  CheckCircle,
  WifiHigh,
  X
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  createStaffUser,
  getCompanyUsers,
  updateUserRole,
  updateUserStatus,
  deleteStaffUser,
  reauthenticate,
  type UserData,
  type UserRole
} from '../../services/authService';
import {
  PagePermissions,
  PAGE_INFO,
  DEFAULT_ROLE_PERMISSIONS,
  getUserPermissionsSync,
  saveUserPermissions,
  deleteUserPermissions
} from '../../services/permissionsService';
import { isDeviceOnline } from '../../services/offlineSyncService';
import { AddUserModal } from './AddUserModal';
import { AdminReauthModal } from './AdminReauthModal';

export const UserManagementSettingsSection = () => {
  const { t } = useLanguage();
  const { userData } = useAuth();
  const [companyUsers, setCompanyUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showAdminReauth, setShowAdminReauth] = useState(false);
  const [pendingNewUser, setPendingNewUser] = useState<UserData | null>(null);

  const [selectedPermissionUser, setSelectedPermissionUser] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<PagePermissions | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const [userManagementTab, setUserManagementTab] = useState<'users' | 'permissions'>('users');
  const [isOffline, setIsOffline] = useState(!isDeviceOnline());

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!isDeviceOnline());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheUsersToLocalStorage = (users: UserData[]) => {
    try {
      localStorage.setItem('cached_company_users', JSON.stringify({
        data: users,
        cachedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to cache users:', error);
    }
  };

  const getCachedUsers = (): UserData[] => {
    try {
      const cached = localStorage.getItem('cached_company_users');
      if (cached) {
        const { data } = JSON.parse(cached);
        return data || [];
      }
    } catch (error) {
      console.error('Failed to get cached users:', error);
    }
    return [];
  };

  const loadCompanyUsers = async () => {
    if (!userData?.companyId || !isAdmin) return;

    setIsLoadingUsers(true);

    if (!isDeviceOnline()) {
      const cachedUsers = getCachedUsers();
      setCompanyUsers(cachedUsers);
      setIsLoadingUsers(false);
      if (cachedUsers.length === 0) {
        toast.info('You are offline. User data is not available.');
      } else {
        toast.info('Showing cached user data (offline mode)');
      }
      return;
    }

    try {
      const users = await getCompanyUsers(userData.companyId);
      setCompanyUsers(users);
      cacheUsersToLocalStorage(users);
    } catch (error) {
      console.error('Failed to load users:', error);
      const cachedUsers = getCachedUsers();
      if (cachedUsers.length > 0) {
        setCompanyUsers(cachedUsers);
        toast.warning('Using cached user data (connection error)');
      } else {
        toast.error('Failed to load users');
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadCompanyUsers();
    }
  }, [isAdmin]);

  const handleCreateUser = async (name: string, email: string, password: string, role: 'manager' | 'cashier') => {
    if (!userData) {
      toast.error('You must be logged in');
      return;
    }

    if (!email || !password || !name) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsCreatingUser(true);
    try {
      const newUser = await createStaffUser(
        email,
        password,
        name,
        role,
        userData
      );

      setShowAddUserModal(false);
      // No need for re-auth modal - we use secondary auth that doesn't affect admin session
      loadCompanyUsers();
      toast.success(`User ${name} created successfully!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleReauthSuccess = () => {
    setShowAdminReauth(false);
    setPendingNewUser(null);
    loadCompanyUsers();
  };

  const handleChangeRole = async (targetUid: string, newRole: 'manager' | 'cashier') => {
    if (!userData) return;

    try {
      await updateUserRole(targetUid, newRole, userData);
      toast.success('User role updated');
      loadCompanyUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleChangeStatus = async (targetUid: string, newStatus: 'active' | 'inactive') => {
    if (!userData) return;

    try {
      await updateUserStatus(targetUid, newStatus, userData);
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      loadCompanyUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDeleteUser = async (targetUid: string, userName: string) => {
    if (!userData) return;

    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteStaffUser(targetUid, userData);
      toast.success('User deleted');
      loadCompanyUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cashier': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleSelectPermissionUser = (userId: string) => {
    setSelectedPermissionUser(userId);
    if (userId) {
      const selectedUser = companyUsers.find(u => u.uid === userId);
      if (selectedUser) {
        const permissions = getUserPermissionsSync(userId, selectedUser.role);
        setUserPermissions(permissions);
        setShowPermissionModal(true);
      }
    } else {
      setUserPermissions(null);
      setShowPermissionModal(false);
    }
  };

  const handleClosePermissionModal = () => {
    setShowPermissionModal(false);
    setSelectedPermissionUser('');
    setUserPermissions(null);
  };

  const handleTogglePagePermission = (pageKey: keyof PagePermissions) => {
    if (!userPermissions) return;
    setUserPermissions({
      ...userPermissions,
      [pageKey]: !userPermissions[pageKey]
    });
  };

  const handleSavePagePermissions = async () => {
    const selectedUser = companyUsers.find(u => u.uid === selectedPermissionUser);
    if (!selectedUser || !userPermissions || !userData) return;

    setIsSavingPermissions(true);
    try {
      const success = await saveUserPermissions(
        selectedUser.uid,
        selectedUser.email,
        selectedUser.role as 'admin' | 'manager' | 'cashier',
        userPermissions,
        userData.uid,
        selectedUser.displayName
      );
      if (success) {
        toast.success('Page permissions saved successfully!');
      } else {
        toast.error('Failed to save permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleResetToRoleDefaults = async () => {
    const selectedUser = companyUsers.find(u => u.uid === selectedPermissionUser);
    if (!selectedUser) return;

    if (confirm('Reset permissions to role defaults? This will remove any custom permissions.')) {
      await deleteUserPermissions(selectedUser.uid);
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || DEFAULT_ROLE_PERMISSIONS.cashier;
      setUserPermissions(defaultPerms);
      toast.success('Permissions reset to role defaults');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {!isAdmin ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Warning size={32} className="text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Admin Access Required</h3>
          <p className="text-slate-500">Only administrators can manage users. Please contact your admin for access.</p>
        </div>
      ) : (
        <>
          {isOffline && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <WifiHigh size={20} className="text-amber-600" weight="bold" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-800">You're Offline</h4>
                <p className="text-xs text-amber-600">Viewing cached user data. Some features are disabled until you're back online.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">User Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Add and manage staff members for your business</p>
            </div>
            {userManagementTab === 'users' && (
              <button
                onClick={() => setShowAddUserModal(true)}
                disabled={isOffline}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto",
                  isOffline
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                <Plus size={18} weight="bold" />
                Add Staff Member
              </button>
            )}
          </div>

          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => setUserManagementTab('users')}
              className={cn(
                "px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                userManagementTab === 'users'
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Users size={14} className="inline-block mr-1.5 sm:mr-2 -mt-0.5" />
              Users
            </button>
            <button
              onClick={() => setUserManagementTab('permissions')}
              className={cn(
                "px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                userManagementTab === 'permissions'
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Lock size={14} className="inline-block mr-1.5 sm:mr-2 -mt-0.5" />
              Permissions
            </button>
          </div>

          {userManagementTab === 'users' && (
            <>
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : companyUsers.length === 0 ? (
                <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                  <UserCircle size={48} className="mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No staff members yet. Add your first staff member to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companyUsers.filter(user => {
                    if (!userSearchQuery) return true;
                    const query = userSearchQuery.toLowerCase();
                    return (user.displayName || '').toLowerCase().includes(query) ||
                           (user.email || '').toLowerCase().includes(query);
                  }).length === 0 ? (
                    <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                      <p className="text-muted-foreground">No users match your search.</p>
                    </div>
                  ) : companyUsers.filter(user => {
                    if (!userSearchQuery) return true;
                    const query = userSearchQuery.toLowerCase();
                    return (user.displayName || '').toLowerCase().includes(query) ||
                           (user.email || '').toLowerCase().includes(query);
                  }).map((user) => (
                    <div key={user.uid} className="p-3 sm:p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold flex-shrink-0",
                            user.role === 'admin' ? "bg-purple-100 text-purple-600" :
                            user.role === 'manager' ? "bg-blue-100 text-blue-600" :
                            "bg-green-100 text-green-600"
                          )}>
                            {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{user.displayName || 'Unnamed User'}</p>
                              {user.uid === userData?.uid && (
                                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-slate-100 text-slate-500 rounded">(You)</span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                              <span className={cn(
                                "text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium border capitalize",
                                getRoleBadgeColor(user.role)
                              )}>
                                {user.role === 'admin' && <ShieldCheck size={10} className="inline mr-0.5 sm:mr-1" />}
                                {user.role}
                              </span>
                              <span className={cn(
                                "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full",
                                user.status === 'active'
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              )}>
                                {user.status || 'active'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {user.role !== 'admin' && user.uid !== userData?.uid && (
                          <div className="flex items-center gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user.uid, e.target.value as 'manager' | 'cashier')}
                              disabled={isOffline}
                              className={cn(
                                "text-xs sm:text-sm px-2 sm:px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-primary/20 flex-1 sm:flex-none",
                                isOffline ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"
                              )}
                            >
                              <option value="manager">Manager</option>
                              <option value="cashier">Cashier</option>
                            </select>

                            <button
                              onClick={() => handleChangeStatus(user.uid, user.status === 'active' ? 'inactive' : 'active')}
                              disabled={isOffline}
                              className={cn(
                                "px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors flex-1 sm:flex-none",
                                isOffline
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : user.status === 'active'
                                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                              )}
                            >
                              {user.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user.uid, user.displayName || user.email)}
                              disabled={isOffline}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                isOffline ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:bg-red-50"
                              )}
                              title={isOffline ? "Offline - Cannot delete" : "Delete user"}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-2 sm:mb-3 text-sm sm:text-base">Role Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <ShieldCheck size={14} className="text-purple-600" />
                      <span className="font-medium text-purple-700 text-xs sm:text-sm">Admin</span>
                    </div>
                    <p className="text-slate-600 text-[11px] sm:text-sm">Full access to all features, settings, reports, and user management</p>
                  </div>
                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <UserCircle size={14} className="text-blue-600" />
                      <span className="font-medium text-blue-700 text-xs sm:text-sm">Manager</span>
                    </div>
                    <p className="text-slate-600 text-[11px] sm:text-sm">Access to sales, purchases, inventory, reports, and limited settings</p>
                  </div>
                  <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <UserCircle size={14} className="text-green-600" />
                      <span className="font-medium text-green-700 text-xs sm:text-sm">Cashier</span>
                    </div>
                    <p className="text-slate-600 text-[11px] sm:text-sm">Access to POS, sales, and basic operations only</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {userManagementTab === 'permissions' && (
            <>
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
                  <div className="col-span-5">User</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-2 text-center">Pages</div>
                  <div className="col-span-2 text-center">Action</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {(() => {
                    const filteredUsers = companyUsers.filter(u => {
                      if (!userSearchQuery) return true;
                      const query = userSearchQuery.toLowerCase();
                      return (u.displayName || '').toLowerCase().includes(query) ||
                             (u.email || '').toLowerCase().includes(query);
                    });

                    if (filteredUsers.length === 0) {
                      return (
                        <div className="px-4 py-8 text-center text-slate-500">
                          {companyUsers.length === 0
                            ? 'No users found. Add staff members in User Management first.'
                            : 'No matching users found'}
                        </div>
                      );
                    }

                    return filteredUsers.map((user) => {
                      const permissions = getUserPermissionsSync(user.uid, user.role);
                      const enabledCount = PAGE_INFO.filter(p => permissions[p.key]).length;

                      return (
                        <div
                          key={user.uid}
                          className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors"
                        >
                          <div className="col-span-5">
                            <p className="font-medium text-slate-800">{user.displayName || 'No Name'}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>

                          <div className="col-span-3">
                            <span className={cn(
                              "inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                              user.role === 'admin' && "bg-purple-100 text-purple-700",
                              user.role === 'manager' && "bg-blue-100 text-blue-700",
                              user.role === 'cashier' && "bg-green-100 text-green-700"
                            )}>
                              {user.role}
                            </span>
                          </div>

                          <div className="col-span-2 text-center">
                            {user.role === 'admin' ? (
                              <span className="text-sm text-purple-600 font-medium">All</span>
                            ) : (
                              <span className="text-sm text-slate-600">{enabledCount}/{PAGE_INFO.length}</span>
                            )}
                          </div>

                          <div className="col-span-2 text-center">
                            {user.role === 'admin' ? (
                              <span className="text-xs text-slate-400">Full Access</span>
                            ) : (
                              <button
                                onClick={() => handleSelectPermissionUser(user.uid)}
                                disabled={isOffline}
                                className={cn(
                                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                                  isOffline
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "text-primary hover:bg-primary/10"
                                )}
                              >
                                {isOffline ? 'Offline' : 'Edit'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-2">How it works</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Click Edit to manage page access for each user</li>
                  <li>• Toggle pages ON or OFF using checkboxes</li>
                  <li>• Changes take effect immediately after saving</li>
                  <li>• Admins always have full access to all pages</li>
                </ul>
              </div>
            </>
          )}

          {showPermissionModal && selectedPermissionUser && userPermissions && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Edit Page Permissions</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-slate-600">
                        {companyUsers.find(u => u.uid === selectedPermissionUser)?.displayName || 'User'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {companyUsers.find(u => u.uid === selectedPermissionUser)?.email}
                      </span>
                      <span className={cn(
                        "ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        companyUsers.find(u => u.uid === selectedPermissionUser)?.role === 'manager'
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      )}>
                        {companyUsers.find(u => u.uid === selectedPermissionUser)?.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleClosePermissionModal}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <XCircle size={24} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PAGE_INFO.map((page) => (
                      <label
                        key={page.key}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                          userPermissions[page.key]
                            ? "bg-green-50 border-green-300"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={userPermissions[page.key]}
                          onChange={() => handleTogglePagePermission(page.key)}
                          className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{page.label}</p>
                          <p className="text-xs text-slate-500">{page.labelTa}</p>
                        </div>
                        {userPermissions[page.key] ? (
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                        ) : (
                          <XCircle size={20} weight="fill" className="text-slate-300" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                  <button
                    onClick={handleResetToRoleDefaults}
                    className="text-sm px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Reset to Defaults
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClosePermissionModal}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleSavePagePermissions();
                        handleClosePermissionModal();
                      }}
                      disabled={isSavingPermissions}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {isSavingPermissions ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} weight="bold" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}

      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onCreateUser={handleCreateUser}
        isCreatingUser={isCreatingUser}
      />

      <AdminReauthModal
        isOpen={showAdminReauth}
        onClose={() => setShowAdminReauth(false)}
        onReauthSuccess={handleReauthSuccess}
        pendingNewUser={pendingNewUser}
        adminEmail={userData?.email}
      />
    </motion.div>
  );
};