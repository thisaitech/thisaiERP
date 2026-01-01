// GamificationBadge.tsx - Compact reward display for Anna 2025
// Shows level, streak, and coins in a pill format

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Coin, Trophy, Star } from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import {
  getUserStats,
  getLevelProgress,
  getDailyChallenge,
  getNextAchievements,
  type UserStats,
  type Achievement
} from '../services/gamificationService'

interface GamificationBadgeProps {
  className?: string
  showDetails?: boolean
  compact?: boolean
}

const GamificationBadge: React.FC<GamificationBadgeProps> = ({
  className,
  showDetails = false,
  compact = true
}) => {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    setStats(getUserStats())

    // Listen for stats updates
    const handleUpdate = () => setStats(getUserStats())
    window.addEventListener('gamification-update', handleUpdate)
    return () => window.removeEventListener('gamification-update', handleUpdate)
  }, [])

  if (!stats) return null

  const levelProgress = getLevelProgress(stats.xp, stats.level)
  const dailyChallenge = getDailyChallenge()

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Level Badge */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1 px-2 py-1 bg-brand-gradient-soft rounded-full cursor-pointer"
          onClick={() => setShowPopup(!showPopup)}
        >
          <Star size={14} weight="fill" className="text-[#FF6B00]" />
          <span className="text-xs font-bold gradient-text">Lv.{stats.level}</span>
        </motion.div>

        {/* Streak Badge - Only show if streak > 0 */}
        {stats.streak > 0 && (
          <motion.div
            className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Flame size={14} weight="fill" className="text-orange-500 streak-fire" />
            <span className="text-xs font-bold text-orange-600">{stats.streak}</span>
          </motion.div>
        )}

        {/* Coins Badge */}
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full">
          <Coin size={14} weight="fill" className="text-amber-500" />
          <span className="text-xs font-bold text-amber-600">{stats.coins}</span>
        </div>

        {/* Popup Details */}
        <AnimatePresence>
          {showPopup && (
            <GamificationPopup
              stats={stats}
              levelProgress={levelProgress}
              dailyChallenge={dailyChallenge}
              onClose={() => setShowPopup(false)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full display
  return (
    <div className={cn('p-4 bg-card rounded-xl border border-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-gradient rounded-full flex items-center justify-center">
            <Trophy size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">Level {stats.level}</p>
            <p className="text-xs text-muted-foreground">{stats.xp} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Flame size={16} weight="fill" className="text-orange-500" />
              <span className="font-bold">{stats.streak}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Coin size={16} weight="fill" className="text-amber-500" />
              <span className="font-bold">{stats.coins}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Coins</p>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress to Level {stats.level + 1}</span>
          <span className="font-medium">{Math.round(levelProgress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${levelProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="p-3 bg-brand-gradient-soft rounded-lg border border-primary/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Daily Challenge</span>
          {dailyChallenge.completed ? (
            <span className="text-xs text-green-600 font-medium">✓ Completed!</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              +{dailyChallenge.reward.xp} XP, +{dailyChallenge.reward.coins} coins
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2">Create {dailyChallenge.target} bills today</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                dailyChallenge.completed ? "bg-green-500" : "bg-brand-gradient"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((dailyChallenge.current / dailyChallenge.target) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium">
            {dailyChallenge.current}/{dailyChallenge.target}
          </span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold">{stats.totalBills}</p>
          <p className="text-[10px] text-muted-foreground">Total Bills</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold">{stats.badges.length}</p>
          <p className="text-[10px] text-muted-foreground">Badges</p>
        </div>
      </div>
    </div>
  )
}

// Popup component for detailed view
const GamificationPopup: React.FC<{
  stats: UserStats
  levelProgress: number
  dailyChallenge: ReturnType<typeof getDailyChallenge>
  onClose: () => void
}> = ({ stats, levelProgress, dailyChallenge, onClose }) => {
  const nextAchievements = getNextAchievements(2)

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Popup */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute top-full right-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl p-4 z-50"
      >
        {/* Level & Progress */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-brand-gradient rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-white">{stats.level}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold">Level {stats.level}</p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-brand-gradient"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.xp} XP</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-around py-2 border-y border-border/50 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame size={14} className="text-orange-500" />
              <span className="font-bold">{stats.streak}</span>
            </div>
            <p className="text-[9px] text-muted-foreground">Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Coin size={14} className="text-amber-500" />
              <span className="font-bold">{stats.coins}</span>
            </div>
            <p className="text-[9px] text-muted-foreground">Coins</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Trophy size={14} className="text-[#5A18C9]" />
              <span className="font-bold">{stats.badges.length}</span>
            </div>
            <p className="text-[9px] text-muted-foreground">Badges</p>
          </div>
        </div>

        {/* Daily Challenge */}
        <div className="mb-3">
          <p className="text-xs font-medium mb-1">
            Daily Challenge {dailyChallenge.completed && '✓'}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full",
                  dailyChallenge.completed ? "bg-green-500" : "bg-brand-gradient"
                )}
                style={{ width: `${Math.min((dailyChallenge.current / dailyChallenge.target) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs">{dailyChallenge.current}/{dailyChallenge.target}</span>
          </div>
        </div>

        {/* Next Achievements */}
        {nextAchievements.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Next Achievements</p>
            {nextAchievements.map((achievement: any) => (
              <div key={achievement.id} className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{achievement.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{achievement.title}</p>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-gradient"
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{Math.round(achievement.progress)}%</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}

export default GamificationBadge
