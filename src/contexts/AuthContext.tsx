import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { User } from 'firebase/auth'
import { onAuthChange, getUserData, getCurrentUser } from '../services/authService'
import type { UserData } from '../services/authService'
import { getOrCreateSubscription, updateSubscriptionStatus, getSubscriptionState } from '../services/subscriptionService'
import type { CompanySubscription, SubscriptionState } from '../types'

interface AuthContextType {
  user: User | null
  userData: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
  // Subscription
  subscription: CompanySubscription | null
  subscriptionState: SubscriptionState
  refreshSubscription: () => Promise<void>
  // Login notification state
  showSubscriptionNotification: boolean
  dismissSubscriptionNotification: () => void
}

// Default subscription state
const defaultSubscriptionState: SubscriptionState = {
  isActive: false,
  isTrialing: false,
  isExpired: true,
  isGracePeriod: false,
  daysRemaining: 0,
  canEdit: false,
  showExpiryWarning: false,
  subscription: null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isLoading: true,
  isAuthenticated: false,
  subscription: null,
  subscriptionState: defaultSubscriptionState,
  refreshSubscription: async () => {},
  showSubscriptionNotification: false,
  dismissSubscriptionNotification: () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null)
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>(defaultSubscriptionState)
  const [showSubscriptionNotification, setShowSubscriptionNotification] = useState(false)

  // Load subscription for a company
  const loadSubscription = useCallback(async (companyId: string) => {
    try {
      // Get or create subscription (creates trial if none exists)
      let sub = await getOrCreateSubscription(companyId)

      // Update status based on dates (check if expired)
      sub = await updateSubscriptionStatus(sub)

      setSubscription(sub)

      // Calculate subscription state
      const state = getSubscriptionState(sub)
      setSubscriptionState(state)

      // Check if we should show notification (< 5 days remaining)
      // Only show once per session (check localStorage)
      const today = new Date().toISOString().split('T')[0]
      const lastNotificationDate = localStorage.getItem(`sub_notification_${companyId}`)

      if (state.showExpiryWarning && lastNotificationDate !== today) {
        setShowSubscriptionNotification(true)
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
      setSubscription(null)
      setSubscriptionState(defaultSubscriptionState)
    }
  }, [])

  // Refresh subscription (can be called from other components)
  const refreshSubscription = useCallback(async () => {
    if (userData?.companyId) {
      await loadSubscription(userData.companyId)
    }
  }, [userData?.companyId, loadSubscription])

  // Dismiss notification (stores in localStorage so it doesn't show again today)
  const dismissSubscriptionNotification = useCallback(() => {
    setShowSubscriptionNotification(false)
    if (userData?.companyId) {
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem(`sub_notification_${userData.companyId}`, today)
    }
  }, [userData?.companyId])

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
      }
    }

    // Listen to auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // Get user data from Firestore
        const data = await getUserData(firebaseUser.uid)
        if (data) {
          setUserData(data)
          localStorage.setItem('user', JSON.stringify(data))

          // Load subscription for the company
          if (data.companyId) {
            await loadSubscription(data.companyId)
          }
        }
      } else {
        setUserData(null)
        setSubscription(null)
        setSubscriptionState(defaultSubscriptionState)
        localStorage.removeItem('user')
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [loadSubscription])

  const value: AuthContextType = {
    user,
    userData,
    isLoading,
    isAuthenticated: !!user,
    subscription,
    subscriptionState,
    refreshSubscription,
    showSubscriptionNotification,
    dismissSubscriptionNotification
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
