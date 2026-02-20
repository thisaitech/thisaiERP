import { cn } from '../../lib/utils'
import type { MobileFilterChipItem } from './types'

type Props = {
  items: MobileFilterChipItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

const MobileFilterChips = ({ items, activeId, onChange, className }: Props) => {
  return (
    <div className={cn('mobile-filter-chip-row', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn('mobile-filter-chip', activeId === item.id && 'is-active')}
          onClick={() => onChange(item.id)}
        >
          <span>{item.label}</span>
          {typeof item.count === 'number' && <span className="mobile-filter-chip-count">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}

export default MobileFilterChips

