// Gamification Service - Anna 2025
// Tracks user achievements, streaks, and rewards

export interface UserStats {
  totalBills: number
  todayBills: number
  streak: number
  lastActiveDate: string
  totalRevenue: number
  level: number
  xp: number
  coins: number
  badges: string[]
}

export interface Achievement {
  id: string
  title: string
  titleTamil: string
  description: string
  icon: string
  xpReward: number
  coinsReward: number
  requirement: number
  type: 'bills' | 'revenue' | 'streak' | 'voice' | 'special'
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Bill milestones
  { id: 'first_bill', title: 'First Steps', titleTamil: 'முதல் அடி', description: 'Create your first bill', icon: '🎯', xpReward: 10, coinsReward: 5, requirement: 1, type: 'bills' },
  { id: 'bill_10', title: 'Getting Started', titleTamil: 'தொடக்கம்', description: 'Create 10 bills', icon: '📝', xpReward: 25, coinsReward: 10, requirement: 10, type: 'bills' },
  { id: 'bill_50', title: 'Bill Master', titleTamil: 'பில் மாஸ்டர்', description: 'Create 50 bills', icon: '💪', xpReward: 100, coinsReward: 50, requirement: 50, type: 'bills' },
  { id: 'bill_100', title: 'Century Club', titleTamil: 'நூற்றாண்டு', description: 'Create 100 bills', icon: '🏆', xpReward: 250, coinsReward: 100, requirement: 100, type: 'bills' },
  { id: 'bill_500', title: 'Bill Legend', titleTamil: 'பில் லெஜண்ட்', description: 'Create 500 bills', icon: '👑', xpReward: 1000, coinsReward: 500, requirement: 500, type: 'bills' },

  // Streak achievements
  { id: 'streak_3', title: 'Hat Trick', titleTamil: 'ஹாட் ட்ரிக்', description: '3-day billing streak', icon: '🔥', xpReward: 30, coinsReward: 15, requirement: 3, type: 'streak' },
  { id: 'streak_7', title: 'Week Warrior', titleTamil: 'வாரம் வீரர்', description: '7-day billing streak', icon: '⚡', xpReward: 75, coinsReward: 50, requirement: 7, type: 'streak' },
  { id: 'streak_30', title: 'Month Master', titleTamil: 'மாத மாஸ்டர்', description: '30-day billing streak', icon: '🌟', xpReward: 500, coinsReward: 250, requirement: 30, type: 'streak' },

  // Voice billing achievements
  { id: 'voice_first', title: 'Voice Pioneer', titleTamil: 'குரல் முன்னோடி', description: 'First voice bill', icon: '🎤', xpReward: 20, coinsReward: 10, requirement: 1, type: 'voice' },
  { id: 'voice_10', title: 'Voice Pro', titleTamil: 'குரல் ப்ரோ', description: '10 voice bills', icon: '🎙️', xpReward: 50, coinsReward: 25, requirement: 10, type: 'voice' },
  { id: 'voice_50', title: 'Voice Master', titleTamil: 'குரல் மாஸ்டர்', description: '50 voice bills', icon: '🔊', xpReward: 200, coinsReward: 100, requirement: 50, type: 'voice' },

  // Revenue milestones
  { id: 'revenue_10k', title: 'Rising Star', titleTamil: 'உயரும் நட்சத்திரம்', description: '₹10,000 total revenue', icon: '💰', xpReward: 50, coinsReward: 25, requirement: 10000, type: 'revenue' },
  { id: 'revenue_1l', title: 'Business Pro', titleTamil: 'பிசினஸ் ப்ரோ', description: '₹1,00,000 total revenue', icon: '💎', xpReward: 200, coinsReward: 100, requirement: 100000, type: 'revenue' },
  { id: 'revenue_10l', title: 'Million Club', titleTamil: 'மில்லியன் கிளப்', description: '₹10,00,000 total revenue', icon: '🏅', xpReward: 1000, coinsReward: 500, requirement: 1000000, type: 'revenue' },

  // Special achievements
  { id: 'diwali_bill', title: 'Diwali Spirit', titleTamil: 'தீபாவளி ஸ்பிரிட்', description: 'Bill during Diwali', icon: '🪔', xpReward: 100, coinsReward: 50, requirement: 1, type: 'special' },
  { id: 'pongal_bill', title: 'Pongal Pride', titleTamil: 'பொங்கல் பெருமை', description: 'Bill during Pongal', icon: '🌾', xpReward: 100, coinsReward: 50, requirement: 1, type: 'special' },
]

// Level thresholds
const LEVEL_XP = [0, 50, 150, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000]

// Get user stats from localStorage
export function getUserStats(): UserStats {
  const stored = localStorage.getItem('billi_user_stats')
  if (stored) {
    return JSON.parse(stored)
  }

  // Default stats
  return {
    totalBills: 0,
    todayBills: 0,
    streak: 0,
    lastActiveDate: '',
    totalRevenue: 0,
    level: 1,
    xp: 0,
    coins: 0,
    badges: []
  }
}

// Save user stats to localStorage
export function saveUserStats(stats: UserStats): void {
  localStorage.setItem('billi_user_stats', JSON.stringify(stats))
}

// Calculate level from XP
export function calculateLevel(xp: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) {
      return i + 1
    }
  }
  return 1
}

// Get XP needed for next level
export function getXpForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_XP.length) {
    return LEVEL_XP[LEVEL_XP.length - 1] * 2
  }
  return LEVEL_XP[currentLevel]
}

// Get XP progress percentage for current level
export function getLevelProgress(xp: number, level: number): number {
  const currentLevelXp = LEVEL_XP[level - 1] || 0
  const nextLevelXp = getXpForNextLevel(level)
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
  return Math.min(Math.max(progress, 0), 100)
}

// Record a bill creation and update stats
export function recordBillCreated(amount: number, isVoiceBill: boolean = false): {
  stats: UserStats
  newAchievements: Achievement[]
  levelUp: boolean
} {
  const stats = getUserStats()
  const today = new Date().toISOString().split('T')[0]

  // Update bill counts
  stats.totalBills += 1
  stats.totalRevenue += amount

  // Update streak
  if (stats.lastActiveDate !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (stats.lastActiveDate === yesterdayStr) {
      // Continue streak
      stats.streak += 1
    } else if (stats.lastActiveDate !== today) {
      // Reset streak (but give 1 for today)
      stats.streak = 1
    }

    stats.lastActiveDate = today
    stats.todayBills = 1
  } else {
    stats.todayBills += 1
  }

  // Check for new achievements
  const newAchievements: Achievement[] = []
  const oldLevel = stats.level

  for (const achievement of ACHIEVEMENTS) {
    if (stats.badges.includes(achievement.id)) continue

    let earned = false

    switch (achievement.type) {
      case 'bills':
        earned = stats.totalBills >= achievement.requirement
        break
      case 'streak':
        earned = stats.streak >= achievement.requirement
        break
      case 'revenue':
        earned = stats.totalRevenue >= achievement.requirement
        break
      case 'voice':
        if (isVoiceBill) {
          const voiceBills = parseInt(localStorage.getItem('billi_voice_bills') || '0') + 1
          localStorage.setItem('billi_voice_bills', voiceBills.toString())
          earned = voiceBills >= achievement.requirement
        }
        break
      case 'special':
        // Special achievements checked separately
        break
    }

    if (earned) {
      stats.badges.push(achievement.id)
      stats.xp += achievement.xpReward
      stats.coins += achievement.coinsReward
      newAchievements.push(achievement)
    }
  }

  // Update level
  stats.level = calculateLevel(stats.xp)
  const levelUp = stats.level > oldLevel

  // Save stats
  saveUserStats(stats)

  return { stats, newAchievements, levelUp }
}

// Check for festival-based achievements
export function checkFestivalAchievement(festivalTheme: string): Achievement | null {
  const stats = getUserStats()

  const festivalAchievementMap: Record<string, string> = {
    'diwali': 'diwali_bill',
    'pongal': 'pongal_bill'
  }

  const achievementId = festivalAchievementMap[festivalTheme]
  if (!achievementId || stats.badges.includes(achievementId)) {
    return null
  }

  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (achievement) {
    stats.badges.push(achievement.id)
    stats.xp += achievement.xpReward
    stats.coins += achievement.coinsReward
    saveUserStats(stats)
    return achievement
  }

  return null
}

// Get unlocked achievements
export function getUnlockedAchievements(): Achievement[] {
  const stats = getUserStats()
  return ACHIEVEMENTS.filter(a => stats.badges.includes(a.id))
}

// Get next achievable achievements (for motivation)
export function getNextAchievements(limit: number = 3): Achievement[] {
  const stats = getUserStats()
  const voiceBills = parseInt(localStorage.getItem('billi_voice_bills') || '0')

  const unlockedIds = new Set(stats.badges)
  const locked = ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id))

  // Calculate progress for each
  const withProgress = locked.map(achievement => {
    let progress = 0

    switch (achievement.type) {
      case 'bills':
        progress = (stats.totalBills / achievement.requirement) * 100
        break
      case 'streak':
        progress = (stats.streak / achievement.requirement) * 100
        break
      case 'revenue':
        progress = (stats.totalRevenue / achievement.requirement) * 100
        break
      case 'voice':
        progress = (voiceBills / achievement.requirement) * 100
        break
    }

    return { ...achievement, progress: Math.min(progress, 99) }
  })

  // Sort by progress (closest to completion first)
  return withProgress
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit)
}

// Get daily challenge
export function getDailyChallenge(): {
  target: number
  current: number
  reward: { xp: number; coins: number }
  completed: boolean
} {
  const stats = getUserStats()
  const today = new Date().toISOString().split('T')[0]
  const storedDate = localStorage.getItem('billi_daily_challenge_date')

  // Reset challenge if new day
  if (storedDate !== today) {
    localStorage.setItem('billi_daily_challenge_date', today)
    localStorage.setItem('billi_daily_challenge_completed', 'false')
  }

  const completed = localStorage.getItem('billi_daily_challenge_completed') === 'true'
  const target = 5 // 5 bills per day challenge

  // Mark completed if reached
  if (stats.todayBills >= target && !completed) {
    localStorage.setItem('billi_daily_challenge_completed', 'true')
    stats.xp += 15
    stats.coins += 10
    saveUserStats(stats)
  }

  return {
    target,
    current: stats.todayBills,
    reward: { xp: 15, coins: 10 },
    completed: stats.todayBills >= target
  }
}
