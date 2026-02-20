import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Props = {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

const MobilePageScaffold = ({
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
}: Props) => {
  return (
    <section className={cn('mobile-page-scaffold', className)}>
      <header className="mobile-page-header">
        <div className="mobile-page-header-text">
          <h1 className="mobile-page-title">{title}</h1>
          {subtitle && <p className="mobile-page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="mobile-page-actions">{actions}</div>}
      </header>
      <div className={cn('mobile-page-content', contentClassName)}>{children}</div>
    </section>
  )
}

export default MobilePageScaffold

