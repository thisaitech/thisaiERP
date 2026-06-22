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
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open actions"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] min-w-[190px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-1.5 z-[9999]">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left whitespace-nowrap transition-colors',
                (action.tone === 'danger' || action.tone === 'primary')
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              )}
              onClick={() => {
                setOpen(false)
                action.onClick()
              }}
            >
              {action.icon && <span className="flex items-center">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default MobileActionMenu

