import type { ReactNode } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rightSlot?: ReactNode
  className?: string
}

const MobileSearchBar = ({ value, onChange, placeholder = 'Search...', rightSlot, className }: Props) => {
  return (
    <div className={cn('mobile-search-wrap', className)}>
      <div className="mobile-search-input-wrap">
        <MagnifyingGlass size={18} className="mobile-search-icon" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mobile-search-input"
        />
      </div>
      {rightSlot && <div className="mobile-search-right">{rightSlot}</div>}
    </div>
  )
}

export default MobileSearchBar

