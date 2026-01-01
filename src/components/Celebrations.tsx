// Celebrations.tsx - Anna 2025
// Confetti, coin animations, level-up celebrations

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Coin } from '@phosphor-icons/react'
import { cn } from '../lib/utils'

// ============================================
// CONFETTI COMPONENT
// ============================================
interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  rotation: number
}

export const Confetti: React.FC<{ show: boolean; duration?: number }> = ({
  show,
  duration = 3000
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (show) {
      const colors = ['#5A18C9', '#FF6B00', '#FFD700', '#00B894', '#FF4757', '#3742FA']
      const newPieces: ConfettiPiece[] = []

      for (let i = 0; i < 50; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.5,
          rotation: Math.random() * 360
        })
      }

      setPieces(newPieces)

      const timer = setTimeout(() => {
        setPieces([])
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration])

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                y: -20,
                x: `${piece.x}vw`,
                rotate: 0,
                opacity: 1
              }}
              animate={{
                y: '100vh',
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 3,
                delay: piece.delay,
                ease: 'easeIn'
              }}
              className="absolute top-0"
              style={{
                width: Math.random() * 8 + 6,
                height: Math.random() * 8 + 6,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '0'
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// FLOATING COINS ANIMATION
// ============================================
interface FloatingCoin {
  id: number
  startX: number
  startY: number
}

export const FloatingCoins: React.FC<{
  show: boolean
  count?: number
  originX?: number
  originY?: number
}> = ({ show, count = 5, originX = 50, originY = 50 }) => {
  const [coins, setCoins] = useState<FloatingCoin[]>([])

  useEffect(() => {
    if (show) {
      const newCoins: FloatingCoin[] = []
      for (let i = 0; i < count; i++) {
        newCoins.push({
          id: i,
          startX: originX + (Math.random() - 0.5) * 20,
          startY: originY
        })
      }
      setCoins(newCoins)

      const timer = setTimeout(() => setCoins([]), 1500)
      return () => clearTimeout(timer)
    }
  }, [show, count, originX, originY])

  return (
    <AnimatePresence>
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{
            x: coin.startX,
            y: coin.startY,
            scale: 1,
            opacity: 1
          }}
          animate={{
            y: coin.startY - 100,
            scale: 0.5,
            opacity: 0
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1,
            delay: coin.id * 0.1,
            ease: 'easeOut'
          }}
          className="fixed z-[100] pointer-events-none"
        >
          <Coin size={24} weight="fill" className="text-amber-500" />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// ============================================
// LEVEL UP CELEBRATION
// ============================================
interface LevelUpProps {
  show: boolean
  level: number
  onComplete?: () => void
}

export const LevelUpCelebration: React.FC<LevelUpProps> = ({
  show,
  level,
  onComplete
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[100]"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex flex-col items-center"
          >
            {/* Trophy Icon */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 0.5, repeat: 3 }}
              className="w-24 h-24 bg-brand-gradient rounded-full flex items-center justify-center shadow-2xl mb-4"
            >
              <Trophy size={48} weight="fill" className="text-white" />
            </motion.div>

            {/* Level Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-white/80 text-sm font-medium mb-1">LEVEL UP!</p>
              <h2 className="text-5xl font-bold text-white mb-2">Level {level}</h2>
              <p className="text-white/60 text-sm">Keep billing to unlock rewards!</p>
            </motion.div>

            {/* Stars */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="flex gap-2 mt-4"
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                >
                  <Star size={24} weight="fill" className="text-amber-400" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Background confetti */}
          <Confetti show={true} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// ACHIEVEMENT UNLOCKED TOAST
// ============================================
interface AchievementToastProps {
  show: boolean
  title: string
  description: string
  icon?: string
  onComplete?: () => void
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  show,
  title,
  description,
  icon = '🏆',
  onComplete
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-96 z-[100]"
        >
          <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-xl flex items-center gap-3">
            {/* Icon */}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
              className="text-3xl"
            >
              {icon}
            </motion.span>

            {/* Content */}
            <div className="flex-1">
              <p className="text-xs text-primary font-semibold uppercase tracking-wide">
                Achievement Unlocked!
              </p>
              <h4 className="font-bold text-foreground">{title}</h4>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>

            {/* Shimmer effect */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl pointer-events-none"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// SUCCESS FLASH (for invoice save, etc.)
// ============================================
export const SuccessFlash: React.FC<{ show: boolean }> = ({ show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 bg-green-500 pointer-events-none z-[90]"
        />
      )}
    </AnimatePresence>
  )
}

// ============================================
// CELEBRATION CONTEXT (Global state)
// ============================================
interface CelebrationContextType {
  triggerConfetti: () => void
  triggerCoins: (x?: number, y?: number) => void
  triggerLevelUp: (level: number) => void
  triggerAchievement: (title: string, description: string, icon?: string) => void
  triggerSuccess: () => void
}

export const CelebrationContext = React.createContext<CelebrationContextType>({
  triggerConfetti: () => {},
  triggerCoins: () => {},
  triggerLevelUp: () => {},
  triggerAchievement: () => {},
  triggerSuccess: () => {}
})

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCoins, setShowCoins] = useState(false)
  const [coinPosition, setCoinPosition] = useState({ x: 50, y: 50 })
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState(1)
  const [showAchievement, setShowAchievement] = useState(false)
  const [achievementData, setAchievementData] = useState({ title: '', description: '', icon: '🏆' })
  const [showSuccess, setShowSuccess] = useState(false)

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)
  }, [])

  const triggerCoins = useCallback((x = 50, y = 50) => {
    setCoinPosition({ x, y })
    setShowCoins(true)
    setTimeout(() => setShowCoins(false), 1500)
  }, [])

  const triggerLevelUp = useCallback((level: number) => {
    setLevelUpLevel(level)
    setShowLevelUp(true)
  }, [])

  const triggerAchievement = useCallback((title: string, description: string, icon = '🏆') => {
    setAchievementData({ title, description, icon })
    setShowAchievement(true)
  }, [])

  const triggerSuccess = useCallback(() => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 500)
  }, [])

  return (
    <CelebrationContext.Provider
      value={{
        triggerConfetti,
        triggerCoins,
        triggerLevelUp,
        triggerAchievement,
        triggerSuccess
      }}
    >
      {children}
      <Confetti show={showConfetti} />
      <FloatingCoins show={showCoins} originX={coinPosition.x} originY={coinPosition.y} />
      <LevelUpCelebration
        show={showLevelUp}
        level={levelUpLevel}
        onComplete={() => setShowLevelUp(false)}
      />
      <AchievementToast
        show={showAchievement}
        {...achievementData}
        onComplete={() => setShowAchievement(false)}
      />
      <SuccessFlash show={showSuccess} />
    </CelebrationContext.Provider>
  )
}

// Hook for easy access
export const useCelebration = () => React.useContext(CelebrationContext)
