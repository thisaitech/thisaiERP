import { useEffect, useRef, useState } from 'react'
import { DotsThreeVertical } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'
import type { MobileActionItem } from './types'

type Props = {
  actions: MobileActionItem[]
  className?: string
}

const MobileActionMenu = ({ actions, className }: Props) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick, true)
    return () => document.removeEventListener('mousedown', onDocClick, true)
  }, [])

  return (
    <div ref={rootRef} className={cn('mobile-action-menu', className)}>
      <button
        type="button"
        className="mobile-action-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open actions"
      >
        <DotsThreeVertical size={18} />
      </button>
      {open && (
        <div className="mobile-action-menu-panel">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn('mobile-action-menu-item', action.tone === 'danger' && 'is-danger')}
              onClick={() => {
                setOpen(false)
                action.onClick()
              }}
            >
              {action.icon && <span className="mobile-action-menu-icon">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MobileActionMenu

