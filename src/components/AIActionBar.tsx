// AIActionBar.tsx - Anna 2025
// Fixed AI Action Bar for mobile with Voice, Scan, Chat

import React from 'react'
import { motion } from 'framer-motion'
import { Microphone, Camera, ChatCircleDots, Sparkle } from '@phosphor-icons/react'
import { cn } from '../lib/utils'

interface AIActionBarProps {
  onVoiceCommand?: () => void
  onScanBill?: () => void
  onAIChat?: () => void
  className?: string
  isListening?: boolean
}

const AIActionBar: React.FC<AIActionBarProps> = ({
  onVoiceCommand,
  onScanBill,
  onAIChat,
  className,
  isListening = false
}) => {
  const triggerAIAssistant = () => {
    const event = new CustomEvent('toggle-ai-assistant')
    window.dispatchEvent(event)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed bottom-20 left-4 right-4 lg:relative lg:bottom-auto lg:left-auto lg:right-auto",
        "bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-xl",
        "p-2 z-30 lg:z-auto",
        className
      )}
    >
      <div className="flex items-center justify-around gap-2">
        {/* Voice Command Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onVoiceCommand || triggerAIAssistant}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all",
            isListening
              ? "bg-red-500 text-white"
              : "bg-brand-gradient-soft hover:bg-primary/20"
          )}
        >
          <motion.div
            animate={isListening ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
          >
            <Microphone
              size={22}
              weight={isListening ? "fill" : "duotone"}
              className={isListening ? "text-white" : "text-primary"}
            />
          </motion.div>
          <span className={cn(
            "text-sm font-medium",
            isListening ? "text-white" : "text-foreground"
          )}>
            {isListening ? 'Listening...' : 'Voice'}
          </span>
        </motion.button>

        {/* Scan Bill Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onScanBill}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted hover:bg-muted/80 transition-all"
        >
          <Camera size={22} weight="duotone" className="text-foreground" />
          <span className="text-sm font-medium">Scan</span>
        </motion.button>

        {/* AI Chat Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAIChat || triggerAIAssistant}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted hover:bg-muted/80 transition-all"
        >
          <ChatCircleDots size={22} weight="duotone" className="text-foreground" />
          <span className="text-sm font-medium">AI Chat</span>
        </motion.button>
      </div>

      {/* Hint text */}
      <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-border/30">
        <Sparkle size={12} weight="fill" className="text-primary" />
        <p className="text-[10px] text-muted-foreground">
          Say "Siva ku manjal 2 kg podu" or scan any bill
        </p>
      </div>
    </motion.div>
  )
}

export default AIActionBar
