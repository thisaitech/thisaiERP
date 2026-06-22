import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  X,
  UserPlus,
  UserList,
  ChartLine,
  Package,
  Check,
  Trash,
  CurrencyCircleDollar,
  FileText,
} from '@phosphor-icons/react'
import { cn } from '../../lib/utils'
import { useNotifications } from '../../contexts/NotificationContext'
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationCategory,
  type ErpNotification,
} from '../../utils/notificationGenerators'

type NotificationItem = ErpNotification & { isRead: boolean }

const CATEGORY_ICONS: Record<NotificationCategory, React.ElementType> = {
  payments: CurrencyCircleDollar,
  admissions: UserPlus,
  visitors: UserList,
  profit: ChartLine,
  reports: FileText,
  inventory: Package,
}

const CATEGORY_ORDER = NOTIFICATION_CATEGORY_ORDER

const priorityStyles: Record<string, string> = {
  high: 'border-l-red-500 bg-red-50/70 dark:bg-red-950/20',
  medium: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/15',
  low: 'border-l-blue-500 bg-white dark:bg-slate-800',
}

interface NotificationPanelProps {
  onClose?: () => void
  className?: string
  showHeader?: boolean
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  onClose,
  className,
  showHeader = true,
}) => {
  const navigate = useNavigate()
  const {
    notifications,
    groupedNotifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    dismiss,
    refreshNotifications,
  } = useNotifications()
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | 'all'>('all')

  const visibleNotifications = useMemo(() => {
    if (activeCategory === 'all') return notifications
    return groupedNotifications[activeCategory] || []
  }, [activeCategory, groupedNotifications, notifications])

  const categoryCounts = useMemo(() => (
    CATEGORY_ORDER.reduce((counts, category) => {
      counts[category] = groupedNotifications[category]?.length || 0
      return counts
    }, {} as Record<NotificationCategory, number>)
  ), [groupedNotifications])

  const handleOpen = (notification: NotificationItem) => {
    markRead(notification.id)
    if (notification.link) {
      navigate(notification.link)
      onClose?.()
    }
  }

  const renderNotificationCard = (notification: NotificationItem) => {
    const CategoryIcon = CATEGORY_ICONS[notification.category]
    return (
      <div
        key={notification.id}
        className={cn(
          'rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 p-3 transition-colors',
          priorityStyles[notification.priority],
          !notification.isRead && 'ring-1 ring-blue-200 dark:ring-blue-900/40'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-900/60">
            <CategoryIcon size={16} weight="duotone" className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => handleOpen(notification)}
                className="text-left"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{notification.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{notification.message}</p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {NOTIFICATION_CATEGORY_LABELS[notification.category]}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(notification.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-green-600 dark:hover:bg-slate-800"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(notification.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600 dark:hover:bg-slate-800"
                  title="Dismiss"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-notification-panel="true"
      className={cn(
      'flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl',
      className
    )}>
      {showHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Bell size={18} weight="fill" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
              >
                Mark all read
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            activeCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          )}
        >
          All ({notifications.length})
        </button>
        {CATEGORY_ORDER.map((category) => {
          const count = categoryCounts[category]
          if (count === 0) return null
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                activeCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {NOTIFICATION_CATEGORY_LABELS[category]} ({count})
            </button>
          )
        })}
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto p-3">
        {isLoading && (
          <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading notifications...</p>
        )}

        {!isLoading && visibleNotifications.length === 0 && (
          <div className="px-4 py-10 text-center">
            <Bell size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No notifications</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Important ERP updates will appear here when available.
            </p>
            <button
              type="button"
              onClick={() => refreshNotifications()}
              className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>
        )}

        {!isLoading && visibleNotifications.length > 0 && (
          <div className="space-y-2">
            {activeCategory === 'all' ? (
              <div className="space-y-4">
                {CATEGORY_ORDER.map((category) => {
                  const categoryItems = groupedNotifications[category] || []
                  if (categoryItems.length === 0) return null
                  const CategoryIcon = CATEGORY_ICONS[category]
                  return (
                    <section key={category} className="space-y-2">
                      <div className="sticky top-0 z-[1] flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/80">
                        <CategoryIcon size={14} weight="duotone" className="text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                          {NOTIFICATION_CATEGORY_LABELS[category]}
                        </h3>
                        <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {categoryItems.length}
                        </span>
                      </div>
                      {categoryItems.map(renderNotificationCard)}
                    </section>
                  )
                })}
              </div>
            ) : (
              visibleNotifications.map(renderNotificationCard)
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationPanel
