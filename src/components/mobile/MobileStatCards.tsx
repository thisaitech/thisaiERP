import { cn } from '../../lib/utils'
import type { MobileStatCardItem } from './types'

type Props = {
  items: MobileStatCardItem[]
  compact?: boolean
}

const toneClassMap: Record<NonNullable<MobileStatCardItem['tone']>, string> = {
  primary: 'mobile-stat-card-primary',
  success: 'mobile-stat-card-success',
  warning: 'mobile-stat-card-warning',
  danger: 'mobile-stat-card-danger',
  neutral: 'mobile-stat-card-neutral',
}

const MobileStatCards = ({ items, compact = true }: Props) => {
  return (
    <div className={cn('mobile-stat-grid', compact && 'mobile-stat-grid-compact')}>
      {items.map((item) => {
        const tone = toneClassMap[item.tone || 'neutral']
        const Wrapper = item.onClick ? 'button' : 'div'
        return (
          <Wrapper
            key={item.id}
            className={cn('mobile-stat-card', tone, item.onClick && 'mobile-stat-clickable')}
            onClick={item.onClick}
            type={item.onClick ? 'button' : undefined}
          >
            {item.icon && <div className="mobile-stat-icon">{item.icon}</div>}
            <div className="mobile-stat-body">
              <p className="mobile-stat-title">{item.title}</p>
              <p className="mobile-stat-value">{item.value}</p>
              {item.subtitle && <p className="mobile-stat-subtitle">{item.subtitle}</p>}
            </div>
          </Wrapper>
        )
      })}
    </div>
  )
}

export default MobileStatCards

