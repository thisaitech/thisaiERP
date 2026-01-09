// SuperAdmin Panel - Manage all company subscriptions
// Access: Only for users with email in SUPER_ADMIN_EMAILS list
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Buildings,
  Clock,
  Crown,
  MagnifyingGlass,
  Plus,
  Warning,
  CheckCircle,
  ArrowLeft,
  Calendar,
  CurrencyCircleDollar
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  where
} from 'firebase/firestore'
import { db, COLLECTIONS } from '../services/firebase'
import { extendTrial, activateSubscription } from '../services/subscriptionService'
import type { CompanySubscription } from '../types'
import { SubscriptionStatus, BillingCycle } from '../types/enums'

// List of super admin emails - ADD YOUR EMAIL HERE
const SUPER_ADMIN_EMAILS = [
  'admin@annaerp.com',
  'superadmin@annaerp.com',
  // Add your email here
]

interface CompanyWithSubscription {
  companyId: string
  companyName: string
  adminEmail: string
  subscription: CompanySubscription | null
  userCount: number
}

const SuperAdmin = () => {
  const navigate = useNavigate()
  const { userData } = useAuth()
  const [companies, setCompanies] = useState<CompanyWithSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithSubscription | null>(null)
  const [extendDays, setExtendDays] = useState(7)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [showActivateModal, setShowActivateModal] = useState(false)

  // Check if current user is super admin
  const isSuperAdmin = userData?.email && SUPER_ADMIN_EMAILS.includes(userData.email.toLowerCase())

  // Load all companies and their subscriptions
  useEffect(() => {
    const loadCompanies = async () => {
      if (!db || !isSuperAdmin) return

      try {
        setIsLoading(true)

        // Get all users grouped by companyId
        const usersRef = collection(db, COLLECTIONS.USERS)
        const usersSnapshot = await getDocs(usersRef)

        const companyMap = new Map<string, {
          companyId: string
          companyName: string
          adminEmail: string
          userCount: number
        }>()

        usersSnapshot.forEach((doc) => {
          const user = doc.data()
          if (user.companyId) {
            const existing = companyMap.get(user.companyId)
            if (existing) {
              existing.userCount++
              // Prefer admin email
              if (user.role === 'admin') {
                existing.adminEmail = user.email
                existing.companyName = user.companyName || existing.companyName
              }
            } else {
              companyMap.set(user.companyId, {
                companyId: user.companyId,
                companyName: user.companyName || user.companyId,
                adminEmail: user.email,
                userCount: 1
              })
            }
          }
        })

        // Get subscriptions for each company
        const subscriptionsRef = collection(db, COLLECTIONS.SUBSCRIPTIONS)
        const subscriptionsSnapshot = await getDocs(subscriptionsRef)

        const subscriptionMap = new Map<string, CompanySubscription>()
        subscriptionsSnapshot.forEach((doc) => {
          const sub = doc.data() as CompanySubscription
          subscriptionMap.set(sub.companyId, sub)
        })

        // Combine data
        const companiesData: CompanyWithSubscription[] = []
        companyMap.forEach((company) => {
          companiesData.push({
            ...company,
            subscription: subscriptionMap.get(company.companyId) || null
          })
        })

        // Sort by company name
        companiesData.sort((a, b) => a.companyName.localeCompare(b.companyName))

        setCompanies(companiesData)
      } catch (error) {
        console.error('Error loading companies:', error)
        toast.error('Failed to load companies')
      } finally {
        setIsLoading(false)
      }
    }

    loadCompanies()
  }, [isSuperAdmin])

  // Filter companies by search
  const filteredCompanies = companies.filter((company) =>
    company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.companyId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle extend trial
  const handleExtendTrial = async () => {
    if (!selectedCompany?.subscription) return

    try {
      await extendTrial(selectedCompany.subscription.id, extendDays)
      toast.success(`Extended trial by ${extendDays} days for ${selectedCompany.companyName}`)
      setShowExtendModal(false)

      // Reload companies
      const subscriptionRef = doc(db!, COLLECTIONS.SUBSCRIPTIONS, selectedCompany.subscription.id)
      const newEndDate = new Date(selectedCompany.subscription.trialEndDate)
      newEndDate.setDate(newEndDate.getDate() + extendDays)

      setCompanies(prev => prev.map(c => {
        if (c.companyId === selectedCompany.companyId && c.subscription) {
          return {
            ...c,
            subscription: {
              ...c.subscription,
              trialEndDate: newEndDate.toISOString(),
              trialDays: c.subscription.trialDays + extendDays
            }
          }
        }
        return c
      }))
    } catch (error: any) {
      toast.error(error.message || 'Failed to extend trial')
    }
  }

  // Handle manual activation
  const handleManualActivation = async (cycle: BillingCycle) => {
    if (!selectedCompany?.subscription) return

    try {
      await activateSubscription(
        selectedCompany.subscription.id,
        cycle,
        'manual_activation',
        'manual'
      )
      toast.success(`Activated ${cycle} subscription for ${selectedCompany.companyName}`)
      setShowActivateModal(false)

      // Reload companies
      setCompanies(prev => prev.map(c => {
        if (c.companyId === selectedCompany.companyId && c.subscription) {
          return {
            ...c,
            subscription: {
              ...c.subscription,
              status: SubscriptionStatus.ACTIVE,
              billingCycle: cycle
            }
          }
        }
        return c
      }))
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate subscription')
    }
  }

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Calculate days remaining
  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return 0
    const end = new Date(endDate)
    const today = new Date()
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  // Get status badge color
  const getStatusColor = (status?: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'bg-green-100 text-green-700'
      case SubscriptionStatus.TRIALING:
        return 'bg-blue-100 text-blue-700'
      case SubscriptionStatus.EXPIRED:
        return 'bg-red-100 text-red-700'
      case SubscriptionStatus.GRACE_PERIOD:
        return 'bg-orange-100 text-orange-700'
      case SubscriptionStatus.CANCELLED:
        return 'bg-slate-100 text-slate-700'
      default:
        return 'bg-slate-100 text-slate-500'
    }
  }

  // Access denied
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-4">
            You don't have permission to access the Super Admin panel.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield size={28} weight="duotone" className="text-indigo-500" />
              Super Admin Panel
            </h1>
            <p className="text-slate-500 text-sm">Manage all company subscriptions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Buildings size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-slate-500">Total Companies</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {companies.filter(c => c.subscription?.status === SubscriptionStatus.TRIALING).length}
                </p>
                <p className="text-sm text-slate-500">On Trial</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Crown size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {companies.filter(c => c.subscription?.status === SubscriptionStatus.ACTIVE).length}
                </p>
                <p className="text-sm text-slate-500">Active Paid</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Warning size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {companies.filter(c => c.subscription?.status === SubscriptionStatus.EXPIRED).length}
                </p>
                <p className="text-sm text-slate-500">Expired</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name, email, or ID..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading companies...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-8 text-center">
              <Buildings size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No companies found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expires</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Users</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map((company) => {
                    const daysLeft = getDaysRemaining(
                      company.subscription?.status === SubscriptionStatus.TRIALING
                        ? company.subscription?.trialEndDate
                        : company.subscription?.subscriptionEndDate
                    )

                    return (
                      <tr key={company.companyId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{company.companyName}</p>
                            <p className="text-sm text-slate-500">{company.adminEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            getStatusColor(company.subscription?.status)
                          )}>
                            {company.subscription?.status || 'No subscription'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className={cn(
                              "font-medium",
                              daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-orange-600" : "text-slate-800"
                            )}>
                              {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(
                                company.subscription?.status === SubscriptionStatus.TRIALING
                                  ? company.subscription?.trialEndDate
                                  : company.subscription?.subscriptionEndDate
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-600">{company.userCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedCompany(company)
                                setShowExtendModal(true)
                              }}
                              disabled={!company.subscription}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} className="inline mr-1" />
                              Extend
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCompany(company)
                                setShowActivateModal(true)
                              }}
                              disabled={!company.subscription || company.subscription.status === SubscriptionStatus.ACTIVE}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle size={14} className="inline mr-1" />
                              Activate
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Extend Trial Modal */}
      {showExtendModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold mb-2">Extend Trial</h3>
            <p className="text-slate-600 text-sm mb-4">
              Extend trial for <strong>{selectedCompany.companyName}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Days to add
              </label>
              <div className="flex gap-2">
                {[7, 14, 30, 60].map((days) => (
                  <button
                    key={days}
                    onClick={() => setExtendDays(days)}
                    className={cn(
                      "flex-1 py-2 rounded-lg font-medium text-sm border-2 transition-colors",
                      extendDays === days
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current end date:</span>
                <span className="font-medium">{formatDate(selectedCompany.subscription?.trialEndDate)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">New end date:</span>
                <span className="font-medium text-green-600">
                  {formatDate(
                    new Date(
                      new Date(selectedCompany.subscription?.trialEndDate || new Date()).getTime() +
                      extendDays * 24 * 60 * 60 * 1000
                    ).toISOString()
                  )}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTrial}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600"
              >
                Extend Trial
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Activate Subscription Modal */}
      {showActivateModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold mb-2">Manual Activation</h3>
            <p className="text-slate-600 text-sm mb-4">
              Activate subscription for <strong>{selectedCompany.companyName}</strong>
            </p>

            <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg mb-4">
              <Warning size={16} className="inline mr-1" />
              Use this only for manual payments (bank transfer, cash, etc.)
            </p>

            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleManualActivation(BillingCycle.MONTHLY)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Monthly Plan</p>
                    <p className="text-sm text-slate-500">30 days access</p>
                  </div>
                  <span className="text-lg font-bold">₹499</span>
                </div>
              </button>
              <button
                onClick={() => handleManualActivation(BillingCycle.YEARLY)}
                className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Yearly Plan</p>
                    <p className="text-sm text-slate-500">365 days access</p>
                  </div>
                  <span className="text-lg font-bold">₹4,999</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowActivateModal(false)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default SuperAdmin
