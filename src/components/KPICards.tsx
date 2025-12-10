// KPICards.tsx - Billi 2025
// Swipeable 4 KPI Cards with animated numbers

import React, { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  CurrencyInr, ShoppingCart, TrendingUp, Bank,
  ArrowUp, ArrowDown, CaretLeft, CaretRight
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'

interface KPIData {
  id: string
  label: string
  labelTamil: string
  value: number
  previousValue?: number
  prefix?: string
  suffix?: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

interface KPICardsProps {
  sales: number
  purchases: number
  profit: number
  cashBank: number
  previousSales?: number
  previousPurchases?: number
  previousProfit?: number
  previousCashBank?: number
  className?: string
}

// Animated number counter
const AnimatedNumber: React.FC<{ value: number; prefix?: string; suffix?: string }> = ({
  value,
  prefix = '',
  suffix = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1,
      ease: "easeOut",
      onUpdate: (v) => setDisplayValue(Math.round(v))
    })
    return () => controls.stop()
  }, [value])

  // Format Indian number system (lakhs, crores)
  const formatIndianNumber = (num: number): string => {
    if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr'
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <span className="tabular-nums">
      {prefix}{formatIndianNumber(displayValue)}{suffix}
    </span>
  )
}

// Single KPI Card
const KPICard: React.FC<{ kpi: KPIData; isActive: boolean }> = ({ kpi, isActive }) => {
  const change = kpi.previousValue
    ? ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100
    : 0
  const isPositive = change >= 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex-shrink-0 w-[calc(50%-8px)] lg:w-[calc(25%-12px)] p-4 rounded-xl border transition-all cursor-pointer",
        "hover:shadow-lg hover:-translate-y-0.5",
        isActive ? "ring-2 ring-primary/50" : "",
        kpi.bgColor
      )}
    >
      {/* Icon & Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-2 rounded-lg", kpi.color)}>
          {kpi.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
          <p className="text-[10px] text-muted-foreground/70 truncate">{kpi.labelTamil}</p>
        </div>
      </div>

      {/* Value */}
      <div className="text-xl font-bold mb-1">
        <AnimatedNumber value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
      </div>

      {/* Change Indicator */}
      {kpi.previousValue !== undefined && change !== 0 && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium",
          isPositive ? "text-green-600" : "text-red-500"
        )}>
          {isPositive ? (
            <ArrowUp size={12} weight="bold" />
          ) : (
            <ArrowDown size={12} weight="bold" />
          )}
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span className="text-muted-foreground font-normal">vs yesterday</span>
        </div>
      )}
    </motion.div>
  )
}

const KPICards: React.FC<KPICardsProps> = ({
  sales,
  purchases,
  profit,
  cashBank,
  previousSales,
  previousPurchases,
  previousProfit,
  previousCashBank,
  className
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const kpis: KPIData[] = [
    {
      id: 'sales',
      label: "Today's Sales",
      labelTamil: 'இன்றைய விற்பனை',
      value: sales,
      previousValue: previousSales,
      prefix: '₹',
      icon: <CurrencyInr size={18} weight="duotone" className="text-green-600" />,
      color: 'bg-green-100',
      bgColor: 'bg-card border-green-200'
    },
    {
      id: 'purchases',
      label: 'Purchases',
      labelTamil: 'கொள்முதல்',
      value: purchases,
      previousValue: previousPurchases,
      prefix: '₹',
      icon: <ShoppingCart size={18} weight="duotone" className="text-blue-600" />,
      color: 'bg-blue-100',
      bgColor: 'bg-card border-blue-200'
    },
    {
      id: 'profit',
      label: 'Profit',
      labelTamil: 'லாபம்',
      value: profit,
      previousValue: previousProfit,
      prefix: '₹',
      icon: <TrendingUp size={18} weight="duotone" className="text-purple-600" />,
      color: 'bg-purple-100',
      bgColor: 'bg-card border-purple-200'
    },
    {
      id: 'cashbank',
      label: 'Cash + Bank',
      labelTamil: 'கையிருப்பு',
      value: cashBank,
      previousValue: previousCashBank,
      prefix: '₹',
      icon: <Bank size={18} weight="duotone" className="text-amber-600" />,
      color: 'bg-amber-100',
      bgColor: 'bg-card border-amber-200'
    }
  ]

  // Check scroll position
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.6
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
      setTimeout(checkScroll, 300)
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Scroll Buttons (Mobile) */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-card/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center lg:hidden"
        >
          <CaretLeft size={16} weight="bold" className="text-foreground" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-card/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center lg:hidden"
        >
          <CaretRight size={16} weight="bold" className="text-foreground" />
        </button>
      )}

      {/* Cards Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory lg:overflow-visible lg:flex-wrap"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {kpis.map((kpi, index) => (
          <div key={kpi.id} className="snap-start">
            <KPICard kpi={kpi} isActive={false} />
          </div>
        ))}
      </div>

      {/* Scroll Indicators (Mobile) */}
      <div className="flex justify-center gap-1.5 mt-3 lg:hidden">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.id}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              index === 0 ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  )
}

export default KPICards
