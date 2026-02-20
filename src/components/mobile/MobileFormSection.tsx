import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

const MobileFormSection = ({ title, subtitle, children, className }: Props) => {
  return (
    <section className={cn('mobile-form-section', className)}>
      <header className="mobile-form-section-header">
        <h3 className="mobile-form-section-title">{title}</h3>
        {subtitle && <p className="mobile-form-section-subtitle">{subtitle}</p>}
      </header>
      <div className="mobile-form-section-body">{children}</div>
    </section>
  )
}

export default MobileFormSection

