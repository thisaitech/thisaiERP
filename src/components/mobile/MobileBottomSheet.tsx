import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  fullHeight?: boolean
}

const clearBodyScrollLock = (body: HTMLBodyElement) => {
  body.style.overflow = body.dataset.mobileSheetOverflowPrev || ''
  delete body.dataset.mobileSheetLockCount
  delete body.dataset.mobileSheetOverflowPrev
}

const MobileBottomSheet = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
  fullHeight = true,
}: Props) => {
  useEffect(() => {
    if (open) return

    const body = document.body
    const hasVisibleSheet = document.querySelector('.mobile-sheet-root') !== null

    // Recover from stale locks left behind by abrupt unmounts/hot reloads.
    if (!hasVisibleSheet && (body.dataset.mobileSheetLockCount || body.style.overflow === 'hidden')) {
      clearBodyScrollLock(body)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const body = document.body
    const lockCount = Number(body.dataset.mobileSheetLockCount || '0')

    if (lockCount === 0) {
      body.dataset.mobileSheetOverflowPrev = body.style.overflow || ''
      body.style.overflow = 'hidden'
    }
    body.dataset.mobileSheetLockCount = String(lockCount + 1)

    return () => {
      const currentLockCount = Number(body.dataset.mobileSheetLockCount || '0')
      const nextLockCount = Math.max(0, currentLockCount - 1)

      if (nextLockCount === 0) {
        clearBodyScrollLock(body)
      } else {
        body.dataset.mobileSheetLockCount = String(nextLockCount)
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="mobile-sheet-root" role="dialog" aria-modal="true">
      <button type="button" className="mobile-sheet-backdrop" onClick={onClose} aria-label="Close" />
      <section className={cn('mobile-sheet-panel', fullHeight && 'is-full-height', className)}>
        <header className="mobile-sheet-header">
          <div>
            <h2 className="mobile-sheet-title">{title}</h2>
            {subtitle && <p className="mobile-sheet-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="mobile-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="mobile-sheet-content">{children}</div>
        {footer && <footer className="mobile-sheet-footer">{footer}</footer>}
      </section>
    </div>
  )
}

export default MobileBottomSheet
