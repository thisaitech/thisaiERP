// SmartFeed.tsx - Billi 2025
// Smart alerts: Low stock, Payment reminders, Insights, Tips

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Warning, WhatsappLogo, TrendingUp, Lightbulb,
  Package, CurrencyInr, ArrowRight, X, ShoppingCart
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'

export interface FeedItem {
  id: string
  type: 'low_stock' | 'payment_due' | 'insight' | 'tip' | 'achievement'
  title: string
  titleTamil?: string
  description: string
  value?: string | number
  actionLabel?: string
  actionLabelTamil?: string
  onAction?: () => void
  onDismiss?: () => void
  priority?: 'high' | 'medium' | 'low'
  icon?: React.ReactNode
  color?: string
}

interface SmartFeedProps {
  items: FeedItem[]
  className?: string
  maxItems?: number
}

// Get icon for feed type
const getFeedIcon = (type: FeedItem['type']) => {
  switch (type) {
    case 'low_stock':
      return <Package size={20} weight="duotone" className="text-red-500" />
    case 'payment_due':
      return <CurrencyInr size={20} weight="duotone" className="text-amber-500" />
    case 'insight':
      return <TrendingUp size={20} weight="duotone" className="text-green-500" />
    case 'tip':
      return <Lightbulb size={20} weight="duotone" className="text-blue-500" />
    case 'achievement':
      return <span className="text-lg">🏆</span>
    default:
      return <Lightbulb size={20} weight="duotone" className="text-primary" />
  }
}

// Get background color for feed type
const getFeedBg = (type: FeedItem['type'], priority?: FeedItem['priority']) => {
  if (priority === 'high') return 'bg-red-50 border-red-200'

  switch (type) {
    case 'low_stock':
      return 'bg-red-50 border-red-200'
    case 'payment_due':
      return 'bg-amber-50 border-amber-200'
    case 'insight':
      return 'bg-green-50 border-green-200'
    case 'tip':
      return 'bg-blue-50 border-blue-200'
    case 'achievement':
      return 'bg-brand-gradient-soft border-primary/20'
    default:
      return 'bg-card border-border'
  }
}

// Single Feed Card
const FeedCard: React.FC<{ item: FeedItem; index: number }> = ({ item, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all",
        "hover:shadow-md",
        getFeedBg(item.type, item.priority),
        item.priority === 'high' && "animate-pulse-subtle"
      )}
    >
      {/* Dismiss Button */}
      {item.onDismiss && (
        <button
          onClick={item.onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {item.icon || getFeedIcon(item.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
            {item.value && (
              <span className="text-xs font-bold text-primary">{item.value}</span>
            )}
          </div>
          {item.titleTamil && (
            <p className="text-[10px] text-muted-foreground">{item.titleTamil}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>

          {/* Action Button */}
          {item.actionLabel && item.onAction && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={item.onAction}
              className={cn(
                "mt-3 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                item.type === 'payment_due' && "bg-green-500 text-white hover:bg-green-600",
                item.type === 'low_stock' && "bg-red-500 text-white hover:bg-red-600",
                item.type === 'insight' && "bg-primary text-white hover:bg-primary/90",
                item.type === 'tip' && "bg-blue-500 text-white hover:bg-blue-600",
                item.type === 'achievement' && "bg-brand-gradient text-white"
              )}
            >
              {item.type === 'payment_due' && <WhatsappLogo size={14} weight="fill" />}
              {item.type === 'low_stock' && <ShoppingCart size={14} weight="fill" />}
              <span>{item.actionLabel}</span>
              <ArrowRight size={12} weight="bold" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Low Stock Alert Banner (full-width, sticky)
export const LowStockBanner: React.FC<{
  count: number
  onAction?: () => void
  onDismiss?: () => void
}> = ({ count, onAction, onDismiss }) => {
  if (count === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-red-500 text-white px-4 py-3 rounded-xl flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Warning size={24} weight="fill" />
        </motion.div>
        <div>
          <p className="font-semibold text-sm">{count} items running low!</p>
          <p className="text-xs text-white/80">{count} பொருட்கள் குறைவாக உள்ளன</p>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onAction}
        className="px-4 py-2 bg-white text-red-500 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
      >
        Reorder Now
      </motion.button>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/20"
        >
          <X size={14} />
        </button>
      )}
    </motion.div>
  )
}

// WhatsApp Blast Success Card
export const WhatsAppBlastCard: React.FC<{
  sent: number
  opened: number
  openRate: number
}> = ({ sent, opened, openRate }) => {
  const isGoodRate = openRate >= 25

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-4 rounded-xl border",
        isGoodRate
          ? "bg-green-50 border-green-200"
          : "bg-card border-border"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <WhatsappLogo size={24} weight="fill" className="text-white" />
        </div>
        <div>
          <h4 className="font-semibold">WhatsApp Campaign</h4>
          <p className="text-xs text-muted-foreground">Last 24 hours</p>
        </div>
        {isGoodRate && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto text-2xl"
          >
            🎉
          </motion.span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{sent}</p>
          <p className="text-[10px] text-muted-foreground">Sent</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{opened}</p>
          <p className="text-[10px] text-muted-foreground">Opened</p>
        </div>
        <div className="text-center">
          <p className={cn(
            "text-lg font-bold",
            isGoodRate ? "text-green-600" : "text-amber-600"
          )}>
            {openRate}%
          </p>
          <p className="text-[10px] text-muted-foreground">Open Rate</p>
        </div>
      </div>

      {isGoodRate && (
        <p className="text-xs text-green-600 mt-3 text-center font-medium">
          Great engagement! Keep it up! 🚀
        </p>
      )}
    </motion.div>
  )
}

const SmartFeed: React.FC<SmartFeedProps> = ({
  items,
  className,
  maxItems = 5
}) => {
  const displayItems = items.slice(0, maxItems)

  if (displayItems.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <span className="text-4xl mb-2 block">✨</span>
        <p className="text-sm text-muted-foreground">All caught up!</p>
        <p className="text-xs text-muted-foreground">No alerts right now</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Smart Alerts</h3>
        <span className="text-xs text-muted-foreground">{items.length} alerts</span>
      </div>

      <AnimatePresence mode="popLayout">
        {displayItems.map((item, index) => (
          <FeedCard key={item.id} item={item} index={index} />
        ))}
      </AnimatePresence>

      {items.length > maxItems && (
        <button className="w-full py-2 text-xs text-primary font-medium hover:underline">
          View all {items.length} alerts →
        </button>
      )}
    </div>
  )
}

export default SmartFeed
