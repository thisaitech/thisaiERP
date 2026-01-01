// QuickActionFAB.tsx - Anna 2025
// Floating Action Button with vertical menu for quick actions

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plus, X, Receipt, ShoppingCart, Money,
  FileText, Users, Package
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'

interface QuickAction {
  id: string
  label: string
  labelTamil: string
  icon: React.ReactNode
  color: string
  path?: string
  onClick?: () => void
}

interface QuickActionFABProps {
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
}

const QuickActionFAB: React.FC<QuickActionFABProps> = ({
  className,
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const quickActions: QuickAction[] = [
    {
      id: 'invoice',
      label: 'New Sale',
      labelTamil: 'புதிய விற்பனை',
      icon: <Receipt size={20} weight="duotone" />,
      color: 'text-green-600',
      path: '/sales'
    },
    {
      id: 'purchase',
      label: 'Purchase',
      labelTamil: 'கொள்முதல்',
      icon: <ShoppingCart size={20} weight="duotone" />,
      color: 'text-blue-600',
      path: '/purchases'
    },
    {
      id: 'expense',
      label: 'Expense',
      labelTamil: 'செலவு',
      icon: <Money size={20} weight="duotone" />,
      color: 'text-red-600',
      path: '/banking'
    },
    {
      id: 'quotation',
      label: 'Quotation',
      labelTamil: 'மதிப்பீடு',
      icon: <FileText size={20} weight="duotone" />,
      color: 'text-purple-600',
      path: '/quotations'
    },
    {
      id: 'customer',
      label: 'Add Party',
      labelTamil: 'புதிய வாடிக்கையாளர்',
      icon: <Users size={20} weight="duotone" />,
      color: 'text-amber-600',
      onClick: () => {
        if (window.location.pathname === '/parties') {
          window.dispatchEvent(new CustomEvent('open-add-party-modal'))
        } else {
          navigate('/parties')
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-add-party-modal'))
          }, 100)
        }
      }
    },
    {
      id: 'item',
      label: 'Add Item',
      labelTamil: 'புதிய பொருள்',
      icon: <Package size={20} weight="duotone" />,
      color: 'text-teal-600',
      path: '/inventory'
    }
  ]

  const handleAction = (action: QuickAction) => {
    setIsOpen(false)
    if (action.onClick) {
      action.onClick()
    } else if (action.path) {
      navigate(action.path)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div
        className={cn(
          "fixed z-50",
          position === 'bottom-right' && "bottom-20 right-4 lg:bottom-6 lg:right-6",
          position === 'bottom-left' && "bottom-20 left-4 lg:bottom-6 lg:left-6",
          position === 'bottom-center' && "bottom-20 left-1/2 -translate-x-1/2",
          className
        )}
      >
        {/* Vertical Menu Items */}
        <AnimatePresence>
          {isOpen && (
            <div
              className={cn(
                "absolute bottom-16 mb-2 flex flex-col gap-3",
                position === 'bottom-right' ? "right-0 items-end" : "left-0 items-start"
              )}
            >
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  whileHover={{ scale: 1.1, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-2 px-2 py-1 cursor-pointer"
                >
                  {/* Icon */}
                  <span className={action.color}>{action.icon}</span>
                  
                  {/* Label */}
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap drop-shadow-sm">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all",
            isOpen
              ? "bg-red-500"
              : "bg-brand-gradient"
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X size={28} weight="bold" className="text-white" />
            ) : (
              <Plus size={28} weight="bold" className="text-white" />
            )}
          </motion.div>
        </motion.button>

        {/* Hint Label */}
        {!isOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-medium text-muted-foreground whitespace-nowrap"
          >
            Quick Add
          </motion.span>
        )}
      </div>
    </>
  )
}

export default QuickActionFAB
