import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Buildings,
  Envelope,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Gear,
  SignOut,
  Receipt,
  Package,
  ChartLine,
  Users,
  Clock,
  CheckCircle,
  Warning,
  CaretRight,
  Crown,
  Lightning,
  Star,
  Heart,
  ArrowRight,
  Bell,
  Lock,
  Palette,
  Info,
  PencilSimple,
  Camera
} from '@phosphor-icons/react'
import { motion as m } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { signOut } from '../services/authService'
import { getCompanySettings, CompanySettings } from '../services/settingsService'
import { toast } from 'sonner'
import { cn } from '../lib/utils'

// Quick stat card component
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  color: string
}

const StatCard = ({ icon, label, value, trend, trendUp, color }: StatCardProps) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
  >
    <div className="flex items-start justify-between">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold mt-3">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </motion.div>
)

// Quick action card component
interface QuickActionProps {
  icon: React.ReactNode
  label: string
  description: string
  to: string
  color: string
}

const QuickAction = ({ icon, label, description, to, color }: QuickActionProps) => (
  <Link to={to}>
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 group-hover:text-primary transition-colors">{label}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <CaretRight size={20} className="text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </motion.div>
  </Link>
)

const Profile = () => {
  const navigate = useNavigate()
  const { userData, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'settings'>('overview')

  // Load company settings
  useEffect(() => {
    const settings = getCompanySettings()
    setCompanySettings(settings)
  }, [])

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Handle logout
  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return

    setIsLoggingOut(true)
    try {
      await signOut()
      localStorage.removeItem('user')
      toast.success('Signed out successfully')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Get role badge color
  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'cashier': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  // Get initials from name
  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Recent activity items (mock data)
  const recentActivity = [
    { action: 'Created invoice', detail: 'INV-2025-0042', time: '2 hours ago', icon: Receipt },
    { action: 'Added new item', detail: 'Product SKU-1234', time: '5 hours ago', icon: Package },
    { action: 'Updated party', detail: 'ABC Traders', time: '1 day ago', icon: Users },
    { action: 'Generated report', detail: 'Sales Summary', time: '2 days ago', icon: ChartLine },
  ]

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User size={28} weight="duotone" className="text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/settings">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
            >
              <Gear size={18} />
              Settings
            </motion.button>
          </Link>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            <SignOut size={18} />
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </motion.button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-accent rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold shadow-lg">
              {companySettings?.logoUrl ? (
                <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                getInitials(userData?.displayName)
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-lg text-primary hover:bg-slate-50 transition-colors">
              <Camera size={16} weight="bold" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold">{userData?.displayName || 'User'}</h2>
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full border capitalize",
                getRoleBadgeColor(userData?.role)
              )}>
                {userData?.role === 'admin' && <Crown size={12} className="inline mr-1" weight="fill" />}
                {userData?.role || 'User'}
              </span>
            </div>
            <p className="text-white/80 flex items-center gap-2">
              <Buildings size={16} />
              {userData?.companyName || companySettings?.companyName || 'No company set'}
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <Envelope size={14} />
                {userData?.email || 'No email'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Joined {formatDate(userData?.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                Last login {formatDate(userData?.lastLogin)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex flex-col items-end gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1",
              userData?.status === 'active' ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                userData?.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              )} />
              {userData?.status === 'active' ? 'Active' : 'Inactive'}
            </div>
            {companySettings?.gstin && (
              <div className="px-3 py-1 bg-white/10 rounded-full text-xs flex items-center gap-1">
                <ShieldCheck size={14} />
                GST Verified
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {['overview', 'activity', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize transition-colors relative",
              activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Receipt size={20} className="text-blue-600" />}
                label="Total Invoices"
                value="247"
                trend="+12%"
                trendUp={true}
                color="bg-blue-100"
              />
              <StatCard
                icon={<Users size={20} className="text-green-600" />}
                label="Active Customers"
                value="156"
                trend="+8%"
                trendUp={true}
                color="bg-green-100"
              />
              <StatCard
                icon={<Package size={20} className="text-orange-600" />}
                label="Products"
                value="89"
                color="bg-orange-100"
              />
              <StatCard
                icon={<ChartLine size={20} className="text-purple-600" />}
                label="This Month Sales"
                value="₹4.2L"
                trend="+23%"
                trendUp={true}
                color="bg-purple-100"
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <QuickAction
                  icon={<Receipt size={20} className="text-blue-600" />}
                  label="Create Invoice"
                  description="Generate a new sales invoice"
                  to="/sales"
                  color="bg-blue-100"
                />
                <QuickAction
                  icon={<Package size={20} className="text-orange-600" />}
                  label="Add Product"
                  description="Add new item to inventory"
                  to="/inventory"
                  color="bg-orange-100"
                />
                <QuickAction
                  icon={<Users size={20} className="text-green-600" />}
                  label="Add Customer"
                  description="Register a new party/customer"
                  to="/parties"
                  color="bg-green-100"
                />
                <QuickAction
                  icon={<ChartLine size={20} className="text-purple-600" />}
                  label="View Reports"
                  description="Analyze business performance"
                  to="/reports"
                  color="bg-purple-100"
                />
              </div>
            </div>

            {/* Company Info Summary */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Company Information</h3>
                <Link to="/company-info" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Edit <PencilSimple size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Buildings size={20} className="text-slate-400" />
                  <div>
                    <p className="text-slate-500">Company Name</p>
                    <p className="font-medium">{companySettings?.companyName || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <ShieldCheck size={20} className="text-slate-400" />
                  <div>
                    <p className="text-slate-500">GSTIN</p>
                    <p className="font-medium">{companySettings?.gstin || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone size={20} className="text-slate-400" />
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p className="font-medium">{companySettings?.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <MapPin size={20} className="text-slate-400" />
                  <div>
                    <p className="text-slate-500">Location</p>
                    <p className="font-medium">{companySettings?.city || companySettings?.state || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              <div className="p-4">
                <h3 className="font-semibold">Recent Activity</h3>
              </div>
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
                >
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <activity.icon size={18} className="text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{activity.action}</p>
                    <p className="text-sm text-slate-500">{activity.detail}</p>
                  </div>
                  <span className="text-xs text-slate-400">{activity.time}</span>
                </motion.div>
              ))}
              <div className="p-4 text-center">
                <button className="text-sm text-primary hover:underline">
                  View all activity
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              <Link to="/settings" className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Gear size={18} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">General Settings</p>
                  <p className="text-sm text-slate-500">App preferences, language, theme</p>
                </div>
                <CaretRight size={20} className="text-slate-400" />
              </Link>

              <Link to="/company-info" className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Buildings size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Company Information</p>
                  <p className="text-sm text-slate-500">Business details, GST, PAN</p>
                </div>
                <CaretRight size={20} className="text-slate-400" />
              </Link>

              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 cursor-pointer">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Bell size={18} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Notifications</p>
                  <p className="text-sm text-slate-500">Manage alerts and reminders</p>
                </div>
                <CaretRight size={20} className="text-slate-400" />
              </div>

              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 cursor-pointer">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Lock size={18} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Security</p>
                  <p className="text-sm text-slate-500">Password, 2FA, sessions</p>
                </div>
                <CaretRight size={20} className="text-slate-400" />
              </div>

              <div className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 cursor-pointer">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Palette size={18} className="text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Appearance</p>
                  <p className="text-sm text-slate-500">Theme, colors, display</p>
                </div>
                <CaretRight size={20} className="text-slate-400" />
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <Warning size={18} weight="fill" />
                Danger Zone
              </h3>
              <p className="text-sm text-red-600 mb-3">
                These actions are irreversible. Please proceed with caution.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                  Delete Account
                </button>
                <button className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                  Clear All Data
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Crown size={28} weight="duotone" className="text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-amber-800">Free Plan</h3>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
                Current
              </span>
            </div>
            <p className="text-sm text-amber-700">
              Upgrade to Pro for unlimited invoices, advanced reports, and priority support.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            <Lightning size={18} weight="fill" />
            Upgrade to Pro
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default Profile
