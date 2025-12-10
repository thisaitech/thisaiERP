// VoiceWaveform.tsx - Animated voice waveform for AI Assistant
// 2025 Modern Design with Purple/Orange gradient

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface VoiceWaveformProps {
  isActive: boolean
  className?: string
  barCount?: number
  size?: 'sm' | 'md' | 'lg'
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive,
  className,
  barCount = 9,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: { height: 'h-6', barWidth: 'w-0.5', gap: 'gap-0.5' },
    md: { height: 'h-10', barWidth: 'w-1', gap: 'gap-1' },
    lg: { height: 'h-14', barWidth: 'w-1.5', gap: 'gap-1.5' }
  }

  const { height, barWidth, gap } = sizeClasses[size]

  // Generate random delays for more natural animation
  const bars = Array.from({ length: barCount }, (_, i) => ({
    id: i,
    delay: i * 0.1,
    initialHeight: 20 + (Math.sin(i * 0.8) * 30)
  }))

  return (
    <div className={cn('flex items-center justify-center', gap, height, className)}>
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className={cn(
            barWidth,
            'rounded-full bg-gradient-to-t from-[#5A18C9] to-[#FF6B00]'
          )}
          initial={{ height: '20%' }}
          animate={isActive ? {
            height: ['20%', '80%', '40%', '100%', '30%', '70%', '20%'],
          } : {
            height: '20%'
          }}
          transition={isActive ? {
            duration: 1.2,
            repeat: Infinity,
            delay: bar.delay,
            ease: 'easeInOut'
          } : {
            duration: 0.3
          }}
          style={{
            boxShadow: isActive ? '0 0 8px rgba(90, 24, 201, 0.5)' : 'none'
          }}
        />
      ))}
    </div>
  )
}

// Circular pulsing waveform for recording state
export const CircularWaveform: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className
}) => {
  return (
    <div className={cn('relative', className)}>
      {/* Outer pulse rings */}
      {isActive && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#5A18C9]/20 to-[#FF6B00]/20"
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.6, 0, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#5A18C9]/30 to-[#FF6B00]/30"
            animate={{
              scale: [1, 1.3, 1.3],
              opacity: [0.8, 0, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.3,
              ease: 'easeOut'
            }}
          />
        </>
      )}

      {/* Inner circle with gradient */}
      <motion.div
        className="relative w-full h-full rounded-full bg-brand-gradient flex items-center justify-center"
        animate={isActive ? {
          scale: [1, 1.05, 1],
        } : {}}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {/* Waveform bars inside circle */}
        <div className="flex items-center gap-0.5 h-1/2">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-white/90"
              initial={{ height: '30%' }}
              animate={isActive ? {
                height: ['30%', '90%', '50%', '100%', '40%', '80%', '30%'],
              } : {
                height: '30%'
              }}
              transition={isActive ? {
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut'
              } : {
                duration: 0.3
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default VoiceWaveform
