// useSubscription Hook - Easy access to subscription state and edit permissions
import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export const useSubscription = () => {
  const navigate = useNavigate()
  const {
    subscription,
    subscriptionState,
    refreshSubscription,
    showSubscriptionNotification,
    dismissSubscriptionNotification
  } = useAuth()

  // Check if user can edit (not expired)
  const canEdit = subscriptionState.canEdit

  // Check if in trial
  const isTrialing = subscriptionState.isTrialing

  // Check if subscription is active
  const isActive = subscriptionState.isActive

  // Check if expired (view-only mode)
  const isExpired = subscriptionState.isExpired

  // Days remaining
  const daysRemaining = subscriptionState.daysRemaining

  // Should show expiry warning (< 5 days)
  const showExpiryWarning = subscriptionState.showExpiryWarning

  // Navigate to subscription page
  const goToSubscription = useCallback(() => {
    navigate('/settings?tab=subscription')
  }, [navigate])

  // Guard function for edit actions
  // Returns true if action allowed, false if blocked (shows toast and redirects)
  const guardEdit = useCallback((action?: string) => {
    if (!canEdit) {
      toast.error(
        `Cannot ${action || 'perform this action'}. Your subscription has expired.`,
        {
          description: 'Upgrade to continue editing.',
          action: {
            label: 'Upgrade',
            onClick: goToSubscription
          }
        }
      )
      return false
    }
    return true
  }, [canEdit, goToSubscription])

  // Wrapper for edit handlers - blocks if expired
  const withEditGuard = useCallback(<T extends (...args: any[]) => any>(
    handler: T,
    actionName?: string
  ): T => {
    return ((...args: Parameters<T>) => {
      if (!guardEdit(actionName)) {
        return
      }
      return handler(...args)
    }) as T
  }, [guardEdit])

  return {
    // State
    subscription,
    subscriptionState,
    canEdit,
    isTrialing,
    isActive,
    isExpired,
    daysRemaining,
    showExpiryWarning,

    // Notification
    showSubscriptionNotification,
    dismissSubscriptionNotification,

    // Actions
    refreshSubscription,
    goToSubscription,

    // Guards
    guardEdit,
    withEditGuard
  }
}

export default useSubscription
