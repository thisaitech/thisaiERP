/**
 * Profit Margin Display Component
 *
 * Shows profit margin with visual indicators for sales invoices
 * Helps users quickly identify profitable vs. loss-making sales
 */

import React from 'react'
import { TrendUp, TrendDown, Minus, ChartBar } from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { getProfitColorClass, getProfitStatus } from '../utils/profitCalculator'

interface ProfitMarginDisplayProps {
  profitMargin: number
  profitPercent: number
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  showIcon?: boolean
  className?: string
}

export const ProfitMarginDisplay: React.FC<ProfitMarginDisplayProps> = ({
  profitMargin,
  profitPercent,
  size = 'md',
  showStatus = false,
  showIcon = true,
  className
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  }

  const getIcon = () => {
    if (!showIcon) return null

    const iconSize = iconSizes[size]

    if (profitPercent > 0) {
      return <TrendUp size={iconSize} weight="bold" className="text-success" />
    } else if (profitPercent < 0) {
      return <TrendDown size={iconSize} weight="bold" className="text-destructive" />
    } else {
      return <Minus size={iconSize} weight="bold" className="text-muted-foreground" />
    }
  }

  const colorClass = getProfitColorClass(profitPercent)
  const status = getProfitStatus(profitPercent)

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {getIcon()}
      <div className={cn('flex items-baseline gap-1', sizeClasses[size])}>
        <span className={cn('font-semibold', colorClass)}>
          ₹{profitMargin.toFixed(2)}
        </span>
        <span className="text-muted-foreground">
          ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)
        </span>
      </div>
      {showStatus && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            profitPercent >= 20
              ? 'bg-success/10 text-success'
              : profitPercent >= 10
              ? 'bg-warning/10 text-warning'
              : profitPercent >= 0
              ? 'bg-orange-500/10 text-orange-500'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {status}
        </span>
      )}
    </div>
  )
}

interface ProfitSummaryCardProps {
  totalProfit: number
  totalProfitPercent: number
  grandTotal: number
  className?: string
}

export const ProfitSummaryCard: React.FC<ProfitSummaryCardProps> = ({
  totalProfit,
  totalProfitPercent,
  grandTotal,
  className
}) => {
  const colorClass = getProfitColorClass(totalProfitPercent)
  const status = getProfitStatus(totalProfitPercent)

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        totalProfitPercent >= 20
          ? 'bg-success/5 border-success/20'
          : totalProfitPercent >= 10
          ? 'bg-warning/5 border-warning/20'
          : totalProfitPercent >= 0
          ? 'bg-orange-500/5 border-orange-500/20'
          : 'bg-destructive/5 border-destructive/20',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2.5 rounded-lg',
              totalProfitPercent >= 20
                ? 'bg-success/10'
                : totalProfitPercent >= 10
                ? 'bg-warning/10'
                : totalProfitPercent >= 0
                ? 'bg-orange-500/10'
                : 'bg-destructive/10'
            )}
          >
            <ChartBar
              size={24}
              weight="duotone"
              className={colorClass}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Total Profit Margin
            </p>
            <div className="flex items-baseline gap-2">
              <p className={cn('text-2xl font-bold', colorClass)}>
                ₹{totalProfit.toFixed(2)}
              </p>
              <span className="text-sm text-muted-foreground">
                ({totalProfitPercent >= 0 ? '+' : ''}{totalProfitPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold',
            totalProfitPercent >= 20
              ? 'bg-success/10 text-success'
              : totalProfitPercent >= 10
              ? 'bg-warning/10 text-warning'
              : totalProfitPercent >= 0
              ? 'bg-orange-500/10 text-orange-500'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {status}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Invoice Total:</span>
          <span className="font-medium">₹{grandTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-muted-foreground">Cost Price:</span>
          <span className="font-medium">₹{(grandTotal - totalProfit).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default ProfitMarginDisplay
