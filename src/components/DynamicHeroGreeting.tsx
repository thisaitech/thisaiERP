// DynamicHeroGreeting.tsx - Billi 2025
// Time-based & performance-based dynamic greetings for Indian SMBs

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, CloudSun, Sparkle, TrendUp, Target, Trophy } from '@phosphor-icons/react'
import { cn } from '../lib/utils'

interface HeroStats {
  todaySales: number
  dailyTarget: number
  userName: string
  streak?: number
  level?: number
}

interface DynamicHeroGreetingProps {
  stats: HeroStats
  className?: string
}

// Get time-based greeting in Tamil + English
function getTimeGreeting(): { text: string; textTamil: string; icon: React.ReactNode; period: string } {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return {
      text: 'Good Morning',
      textTamil: 'காலை வணக்கம்',
      icon: <Sun size={24} weight="duotone" className="text-amber-500" />,
      period: 'morning'
    }
  } else if (hour >= 12 && hour < 17) {
    return {
      text: 'Good Afternoon',
      textTamil: 'மதிய வணக்கம்',
      icon: <CloudSun size={24} weight="duotone" className="text-orange-500" />,
      period: 'afternoon'
    }
  } else if (hour >= 17 && hour < 21) {
    return {
      text: 'Good Evening',
      textTamil: 'மாலை வணக்கம்',
      icon: <Moon size={24} weight="duotone" className="text-indigo-500" />,
      period: 'evening'
    }
  } else {
    return {
      text: 'Good Night',
      textTamil: 'இரவு வணக்கம்',
      icon: <Moon size={24} weight="duotone" className="text-purple-500" />,
      period: 'night'
    }
  }
}

// Get motivational message based on performance
function getMotivationalMessage(stats: HeroStats): { text: string; textTamil: string; type: 'encourage' | 'celebrate' | 'push' } {
  const { todaySales, dailyTarget, streak } = stats
  const progress = dailyTarget > 0 ? (todaySales / dailyTarget) * 100 : 0
  const remaining = dailyTarget - todaySales

  // Morning messages (before significant sales)
  if (todaySales < 1000) {
    const messages = [
      { text: `Ready for ₹${(dailyTarget / 1000).toFixed(0)}K sales today?`, textTamil: 'இன்று நல்ல விற்பனை ஆகும்!', type: 'encourage' as const },
      { text: 'New day, new opportunities!', textTamil: 'புதிய நாள், புதிய வாய்ப்புகள்!', type: 'encourage' as const },
      { text: `Let's beat yesterday's record!`, textTamil: 'நேற்றை விட சிறப்பாக செய்வோம்!', type: 'encourage' as const },
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  // Target achieved - celebrate!
  if (progress >= 100) {
    return {
      text: `Target smashed! ₹${(todaySales / 1000).toFixed(1)}K done!`,
      textTamil: 'இலக்கை தாண்டிவிட்டீர்கள்! சூப்பர்!',
      type: 'celebrate'
    }
  }

  // Close to target - push!
  if (progress >= 80) {
    return {
      text: `Almost there! Just ₹${(remaining / 1000).toFixed(1)}K more!`,
      textTamil: `இன்னும் ₹${(remaining / 1000).toFixed(1)}K மட்டுமே!`,
      type: 'push'
    }
  }

  // Good progress
  if (progress >= 50) {
    return {
      text: `Great going! ₹${(todaySales / 1000).toFixed(1)}K done`,
      textTamil: 'நல்ல வேகம்! தொடருங்கள்!',
      type: 'encourage'
    }
  }

  // Streak message
  if (streak && streak > 3) {
    return {
      text: `${streak} day streak! Keep it burning!`,
      textTamil: `${streak} நாள் streak! அருமை!`,
      type: 'celebrate'
    }
  }

  // Default
  return {
    text: `₹${(todaySales / 1000).toFixed(1)}K sales so far`,
    textTamil: 'நல்ல வேகம்!',
    type: 'encourage'
  }
}

const DynamicHeroGreeting: React.FC<DynamicHeroGreetingProps> = ({ stats, className }) => {
  const [greeting, setGreeting] = useState(getTimeGreeting())
  const [motivation, setMotivation] = useState(getMotivationalMessage(stats))

  useEffect(() => {
    // Update greeting every minute
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting())
      setMotivation(getMotivationalMessage(stats))
    }, 60000)

    return () => clearInterval(interval)
  }, [stats])

  // Update motivation when stats change
  useEffect(() => {
    setMotivation(getMotivationalMessage(stats))
  }, [stats.todaySales, stats.dailyTarget])

  const progress = stats.dailyTarget > 0 ? Math.min((stats.todaySales / stats.dailyTarget) * 100, 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Content */}
      <div className="relative z-10">
        {/* Greeting Row */}
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            {greeting.icon}
          </motion.div>
          <div>
            <p className="text-white/80 text-sm">{greeting.text}</p>
            <h2 className="text-xl font-bold">{stats.userName} ji!</h2>
          </div>
        </div>

        {/* Motivational Message */}
        <motion.div
          key={motivation.text}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mt-3"
        >
          {motivation.type === 'celebrate' && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            >
              <Trophy size={20} weight="fill" className="text-amber-300" />
            </motion.div>
          )}
          {motivation.type === 'push' && (
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Target size={20} weight="duotone" className="text-green-300" />
            </motion.div>
          )}
          {motivation.type === 'encourage' && (
            <TrendUp size={20} weight="duotone" className="text-white/80" />
          )}
          <p className="text-white/90 font-medium">{motivation.text}</p>
        </motion.div>

        {/* Progress Bar to Target */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/70 mb-1">
            <span>Today's Progress</span>
            <span>₹{(stats.todaySales / 1000).toFixed(1)}K / ₹{(stats.dailyTarget / 1000).toFixed(0)}K</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                progress >= 100 ? "bg-green-400" : "bg-white"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Quick Stats Row */}
        {(stats.streak || stats.level) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
            {stats.level && (
              <div className="flex items-center gap-1">
                <Sparkle size={14} weight="fill" className="text-amber-300" />
                <span className="text-xs font-medium">Level {stats.level}</span>
              </div>
            )}
            {stats.streak && stats.streak > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-medium">{stats.streak} day streak</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default DynamicHeroGreeting
