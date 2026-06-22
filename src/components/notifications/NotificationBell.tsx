import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'
import { useNotifications } from '../../contexts/NotificationContext'
import useIsMobileViewport from '../../hooks/useIsMobileViewport'
import NotificationPanel from './NotificationPanel'

interface NotificationBellProps {
  className?: string
  buttonClassName?: string
  panelClassName?: string
}

const OUTSIDE_CLOSE_DELAY_MS = 200
const NOTIFICATION_PANEL_SELECTOR = '[data-notification-panel="true"]'

function isInsideNotificationUi(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(NOTIFICATION_PANEL_SELECTOR)
    || target.closest('[data-notification-bell="true"]')
  )
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className,
  buttonClassName,
  panelClassName,
}) => {
  const isMobileViewport = useIsMobileViewport()
  const {
    unreadCount,
    isPanelOpen,
    openPanel,
    closePanel,
  } = useNotifications()
  const outsideCloseEnabledRef = useRef(false)

  useEffect(() => {
    if (!isPanelOpen) {
      outsideCloseEnabledRef.current = false
      return undefined
    }

    outsideCloseEnabledRef.current = false
    const enableTimer = window.setTimeout(() => {
      outsideCloseEnabledRef.current = true
    }, OUTSIDE_CLOSE_DELAY_MS)

    const handleOutside = (event: Event) => {
      if (!outsideCloseEnabledRef.current) return
      if (isInsideNotificationUi(event.target)) return
      closePanel()
    }

    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('touchstart', handleOutside, true)

    return () => {
      window.clearTimeout(enableTimer)
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('touchstart', handleOutside, true)
    }
  }, [closePanel, isPanelOpen])

  useEffect(() => {
    if (!isPanelOpen || !isMobileViewport) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileViewport, isPanelOpen])

  const handleBellClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (isPanelOpen) closePanel()
    else openPanel()
  }

  const handleBackdropClose = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!outsideCloseEnabledRef.current) return
    closePanel()
  }

  const mobilePanel = isPanelOpen && isMobileViewport ? createPortal(
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Close notifications"
        className="absolute inset-0 bg-black/35"
        onClick={handleBackdropClose}
      />
      <div
        data-notification-panel="true"
        className="absolute left-3 right-3 top-[4.5rem] z-[121] max-h-[calc(100dvh-5.5rem)]"
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <NotificationPanel onClose={closePanel} />
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <div className={cn('relative', className)} data-notification-bell="true">
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onClick={handleBellClick}
          title="Notifications"
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-amber-500 shadow-sm hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all duration-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-amber-400 dark:hover:bg-slate-700/50',
            buttonClassName
          )}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={isPanelOpen}
        >
          <Bell size={20} weight="fill" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isPanelOpen && !isMobileViewport && (
          <div
            data-notification-panel="true"
            className={cn(
              'absolute right-0 top-full mt-2 z-[70] w-[min(92vw,380px)]',
              panelClassName
            )}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <NotificationPanel onClose={closePanel} />
          </div>
        )}
      </div>
      {mobilePanel}
    </>
  )
}

export default NotificationBell
