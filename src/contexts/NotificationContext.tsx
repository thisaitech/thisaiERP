import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import {
  applyNotificationState,
  dismissNotification,
  fetchErpNotifications,
  groupNotificationsByCategory,
  markAllNotificationsRead,
  markNotificationRead,
  type ErpNotification,
  type NotificationCategory,
} from '../services/notificationService'

export type NotificationItem = ErpNotification & { isRead: boolean }

interface NotificationContextValue {
  notifications: NotificationItem[]
  groupedNotifications: Record<NotificationCategory, NotificationItem[]>
  unreadCount: number
  isLoading: boolean
  isPanelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  refreshNotifications: () => Promise<void>
  markRead: (notificationId: string) => void
  markAllRead: () => void
  dismiss: (notificationId: string) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { userData, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const companyId = userData?.companyId || ''
  const userId = userData?.uid || ''

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !companyId || !userId) {
      setNotifications([])
      return
    }

    setIsLoading(true)
    try {
      const generated = await fetchErpNotifications()
      setNotifications(applyNotificationState(generated, companyId, userId))
    } catch {
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [companyId, isAuthenticated, userId])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    const interval = window.setInterval(() => {
      refreshNotifications()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [isAuthenticated, refreshNotifications])

  const markRead = useCallback((notificationId: string) => {
    if (!companyId || !userId) return
    markNotificationRead(companyId, userId, notificationId)
    setNotifications((prev) => prev.map((item) => (
      item.id === notificationId ? { ...item, isRead: true } : item
    )))
  }, [companyId, userId])

  const markAllRead = useCallback(() => {
    if (!companyId || !userId) return
    const ids = notifications.map((item) => item.id)
    markAllNotificationsRead(companyId, userId, ids)
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
  }, [companyId, notifications, userId])

  const dismiss = useCallback((notificationId: string) => {
    if (!companyId || !userId) return
    dismissNotification(companyId, userId, notificationId)
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId))
  }, [companyId, userId])

  const groupedNotifications = useMemo(
    () => groupNotificationsByCategory(notifications),
    [notifications]
  )

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  )

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    groupedNotifications,
    unreadCount,
    isLoading,
    isPanelOpen,
    openPanel: () => setIsPanelOpen(true),
    closePanel: () => setIsPanelOpen(false),
    togglePanel: () => setIsPanelOpen((open) => !open),
    refreshNotifications,
    markRead,
    markAllRead,
    dismiss,
  }), [
    dismiss,
    groupedNotifications,
    isLoading,
    isPanelOpen,
    markAllRead,
    markRead,
    notifications,
    refreshNotifications,
    unreadCount,
  ])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
