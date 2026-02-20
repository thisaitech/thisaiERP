import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import type { MobileListCardField } from './types'

type Props = {
  title: string
  subtitle?: string
  fields?: MobileListCardField[]
  status?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  className?: string
}

const MobileListCard = ({ title, subtitle, fields = [], status, actions, footer, className }: Props) => {
  return (
    <article className={cn('mobile-list-card', className)}>
      <header className="mobile-list-card-header">
        <div className="mobile-list-card-head-main">
          <h3 className="mobile-list-card-title">{title}</h3>
          {subtitle && <p className="mobile-list-card-subtitle">{subtitle}</p>}
        </div>
        <div className="mobile-list-card-head-right">
          {status}
          {actions}
        </div>
      </header>

      {fields.length > 0 && (
        <div className="mobile-list-card-grid">
          {fields.map((field) => (
            <div key={field.id} className="mobile-list-card-field">
              <span className="mobile-list-card-label">{field.label}</span>
              <span className="mobile-list-card-value">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {footer && <footer className="mobile-list-card-footer">{footer}</footer>}
    </article>
  )
}

export default MobileListCard

