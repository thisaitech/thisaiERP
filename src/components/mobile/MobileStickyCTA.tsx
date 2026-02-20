import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Props = {
  children: ReactNode
  className?: string
}

const MobileStickyCTA = ({ children, className }: Props) => {
  return <div className={cn('mobile-sticky-cta', className)}>{children}</div>
}

export default MobileStickyCTA

