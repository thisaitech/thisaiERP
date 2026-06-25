import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FunnelSimple, CaretDown, Check } from '@phosphor-icons/react'
import { cn } from '../lib/utils'

export type PeriodFilterValue = 'today' | 'week' | 'month' | 'year' | 'all'

export const PERIOD_FILTER_OPTIONS: { id: PeriodFilterValue; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All' },
]

type MenuPosition = {
  top: number
  left: number
  minWidth: number
}

type Props = {
  value: PeriodFilterValue
  onChange: (value: PeriodFilterValue) => void
  className?: string
  compact?: boolean
}

const MENU_MIN_WIDTH = 152

const PeriodFilterDropdown = ({ value, onChange, className, compact = false }: Props) => {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const left = Math.min(
      Math.max(8, rect.right - MENU_MIN_WIDTH),
      window.innerWidth - MENU_MIN_WIDTH - 8
    )

    setMenuPosition({
      top: rect.bottom + 8,
      left,
      minWidth: MENU_MIN_WIDTH,
    })
  }, [])

  useEffect(() => {
    if (!open) {
      setMenuPosition(null)
      return
    }

    updateMenuPosition()

    const handleScrollOrResize = () => updateMenuPosition()
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) return

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)

    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  const menu = open && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl py-1 overflow-hidden"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            minWidth: menuPosition.minWidth,
          }}
        >
          {PERIOD_FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id)
                setOpen(false)
              }}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-left transition-colors',
                'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                value === option.id
                  ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-900/25'
                  : 'text-slate-700 dark:text-slate-200'
              )}
            >
              {option.label}
              {value === option.id && <Check size={14} weight="bold" />}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  const selectedOption = PERIOD_FILTER_OPTIONS.find((option) => option.id === value)
  const buttonLabel = selectedOption ? `Filter: ${selectedOption.label}` : 'Filter'

  return (
    <>
      <div className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200',
            'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
            compact ? 'gap-1 px-2 py-1.5 text-xs' : 'gap-2 px-3 py-2 text-sm',
            open && 'ring-2 ring-blue-100 dark:ring-blue-900/40 border-blue-400'
          )}
        >
          <FunnelSimple size={compact ? 14 : 16} weight="bold" className="text-slate-500 shrink-0" />
          {!compact && <span>{buttonLabel}</span>}
          <CaretDown
            size={compact ? 12 : 14}
            className={cn('text-slate-500 transition-transform shrink-0', open && 'rotate-180')}
          />
        </button>
      </div>
      {menu}
    </>
  )
}

export default PeriodFilterDropdown
