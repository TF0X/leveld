import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const XP_BASE = 100
const XP_EXPONENT = 1.5

export function xpForLevel(level) {
  return Math.floor(XP_BASE * Math.pow(XP_EXPONENT, level))
}

export function getTier(level) {
  if (level <= 10) return { name: 'Civilian', color: '#94a3b8' }
  if (level <= 20) return { name: 'Apprentice', color: '#60a5fa' }
  if (level <= 35) return { name: 'Warrior', color: '#a78bfa' }
  if (level <= 50) return { name: 'Elite', color: '#f59e0b' }
  return { name: 'Legend', color: '#f97316' }
}

export function getStreakMultiplier(streak) {
  if (streak >= 30) return 2.0
  if (streak >= 14) return 1.5
  if (streak >= 7) return 1.25
  if (streak >= 3) return 1.1
  return 1.0
}

export function getSeason() {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function weekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

const defaultState = {
  onboarding_complete: false,
  character: {
    name: '',
    realName: '',
    age: '',
    gender: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    class: null,
    level: 1,
    xp: 0,
    hp: 100,
    maxHp: 100,
    gold: 0,
    willpower: 0,
    streak: 0,
    lastActiveDate: null,
    goals: [],
    cosmetics: {
      clothes: true, cloak: false, armor: false, weapon: false,
      aura: false, legendaryWeapon: false, goldTrim: false, partnerBadge: false,
      gutHealthBadge: false, refeedBadge: false,
    },
    gearDegradation: 0,
  },
  // Nutrition targets — from Rohan Gupta's Fat Loss Fuel System
  nutrition: {
    deficitMode: 'easy',          // 'extreme' | 'easy'
    goalType: 'lose',             // 'lose' | 'bulk' | 'maintain'
    weightKg: 0,
    activityLevel: 'moderate',
    dailyCalories: 0,
    proteinTarget: 0,
    carbTarget: 0,
    fatTarget: 0,
    maintenanceCalories: 0,
    workoutProgram: null,         // selected template id
    workoutProgramData: null,     // full template object
    currentWeek: 1,
    weekStartDate: null,
    dietBreakActive: false,
    dietBreakStartDate: null,
    refeedEarned: false,
    refeedUsed: false,
    milestoneConsistentDays: 0,
    milestoneWeightLost: 0,
    waterGlasses: 0,
    waterDate: null,
  },
  // Gut health tracking
  gut: {
    score: 0,
    superSeedsThisWeek: [],       // seed ids logged this week
    superSeedsWeekStart: null,
    gutBadgeEarned: false,
  },
  habits: [],
  routines: {
    morning: [],
    night: [],
  },
  cravings: [],
  dietLogs: [],
  workoutLogs: [],
  weightLogs: [],                 // [{ date, weight }]
  quests: [],
  openaiKey: '',
  xpHistory: [],
  notifications: [],
}

const useStore = create(
  persist(
    (set, get) => ({
      ...defaultState,

      completeOnboarding: () => set({ onboarding_complete: true }),

      setCharacter: (updates) => set((s) => ({
        character: { ...s.character, ...updates }
      })),

      setOpenaiKey: (key) => set({ openaiKey: key }),

      setNutrition: (updates) => set((s) => ({
        nutrition: { ...s.nutrition, ...updates }
      })),

      gainXP: (amount, source = 'action') => set((s) => {
        const { character } = s
        const multiplier = getStreakMultiplier(character.streak)
        let bonus = 1
        if (source === 'workout' && character.class === 'Warrior') bonus = 1.5
        if (source === 'routine' && character.class === 'Mage') bonus = 1.5
        if (source === 'habit_streak' && character.class === 'Rogue') bonus = 1.5

        const gained = Math.floor(amount * multiplier * bonus)
        let { xp, level } = character
        xp += gained

        let leveledUp = false
        while (xp >= xpForLevel(level)) {
          xp -= xpForLevel(level)
          level++
          leveledUp = true
        }

        const newMaxHp = 100 + (level - 1) * 5
        const newHp = leveledUp ? newMaxHp : Math.min(character.hp + 10, newMaxHp)
        const xpHistory = [...(s.xpHistory || []), { date: today(), amount: gained, source }]

        return {
          character: { ...character, xp, level, maxHp: newMaxHp, hp: newHp },
          xpHistory,
          notifications: leveledUp
            ? [...(s.notifications || []), { id: Date.now(), type: 'levelup', level, message: `Level ${level} reached! You grow stronger, warrior.` }]
            : s.notifications,
        }
      }),

      loseXP: (amount, source = 'penalty') => set((s) => {
        const { character } = s
        let hp = character.hp
        let gearDegradation = character.gearDegradation || 0
        if (source === 'craving') gearDegradation = Math.min(100, gearDegradation + 10)
        else if (source === 'negative_habit') hp = Math.max(0, hp - 5)
        return { character: { ...character, hp, gearDegradation } }
      }),

      addHabit: (habit) => set((s) => ({
        habits: [...s.habits, {
          id: Date.now() + Math.random(),
          name: habit.name,
          type: habit.type || 'positive',
          frequency: habit.frequency || 'daily',
          category: habit.category || 'general',
          streak: 0,
          completions: {},
          skips: {},
          createdAt: today(),
          ...habit,
        }]
      })),

      completeHabit: (habitId) => set((s) => {
        const d = today()
        const habits = s.habits.map((h) => {
          if (h.id !== habitId) return h
          if (h.type === 'negative') {
            return { ...h, completions: { ...h.completions, [d]: (h.completions[d] || 0) + 1 } }
          }
          const streak = h.completions[d] ? h.streak : h.streak + 1
          return { ...h, completions: { ...h.completions, [d]: (h.completions[d] || 0) + 1 }, streak }
        })
        return { habits }
      }),

      skipHabit: (habitId, reason = '') => set((s) => {
        const d = today()
        const habits = s.habits.map((h) => {
          if (h.id !== habitId) return h
          return { ...h, skips: { ...h.skips, [d]: reason }, streak: 0 }
        })
        return { habits }
      }),

      updateHabit: (habitId, updates) => set((s) => ({
        habits: s.habits.map((h) => h.id === habitId ? { ...h, ...updates } : h)
      })),

      deleteHabit: (habitId) => set((s) => ({
        habits: s.habits.filter((h) => h.id !== habitId)
      })),

      setRoutine: (type, steps) => set((s) => ({
        routines: { ...s.routines, [type]: steps }
      })),

      completeRoutineStep: (type, stepId) => set((s) => {
        const d = today()
        const steps = s.routines[type].map((step) => {
          if (step.id !== stepId) return step
          return { ...step, completions: { ...(step.completions || {}), [d]: true } }
        })
        return { routines: { ...s.routines, [type]: steps } }
      }),

      logCraving: (craving) => set((s) => ({
        cravings: [...s.cravings, {
          id: Date.now(),
          date: new Date().toISOString(),
          type: craving.type,
          intensity: craving.intensity,
          resisted: craving.resisted,
          note: craving.note || '',
        }]
      })),

      addWillpower: () => set((s) => ({
        character: { ...s.character, willpower: s.character.willpower + 1 }
      })),

      logDiet: (entry) => set((s) => {
        const d = today()
        const newLog = { id: Date.now(), date: new Date().toISOString(), ...entry }
        // Update consistency tracking for milestone system
        const lastDietDate = s.dietLogs.length
          ? s.dietLogs[s.dietLogs.length - 1].date.split('T')[0]
          : null
        const isNewDay = lastDietDate !== d
        const nutrition = isNewDay
          ? { ...s.nutrition, milestoneConsistentDays: (s.nutrition.milestoneConsistentDays || 0) + 1 }
          : s.nutrition
        return { dietLogs: [...s.dietLogs, newLog], nutrition }
      }),

      logWorkout: (entry) => set((s) => ({
        workoutLogs: [...s.workoutLogs, { id: Date.now(), date: new Date().toISOString(), ...entry }]
      })),

      logWeight: (weight) => set((s) => {
        const d = today()
        const existing = s.weightLogs.filter(w => w.date !== d)
        const logs = [...existing, { date: d, weight }].sort((a, b) => a.date.localeCompare(b.date))
        // Calculate weight lost from first log
        const firstWeight = logs[0]?.weight || weight
        const milestoneWeightLost = Math.max(0, firstWeight - weight)
        return {
          weightLogs: logs,
          nutrition: { ...s.nutrition, milestoneWeightLost },
        }
      }),

      setWater: (glasses) => set((s) => ({
        nutrition: { ...s.nutrition, waterGlasses: glasses, waterDate: today() }
      })),

      logSuperSeed: (seedId) => set((s) => {
        const ws = weekStart()
        // Reset if new week
        const currentWeekStart = s.gut.superSeedsWeekStart
        const seeds = currentWeekStart === ws
          ? s.gut.superSeedsThisWeek
          : []
        if (seeds.includes(seedId)) return {} // already logged
        const newSeeds = [...seeds, seedId]
        const allSevenDone = newSeeds.length >= 7
        const newNotifications = allSevenDone && !s.gut.gutBadgeEarned
          ? [...s.notifications, {
              id: Date.now(), type: 'badge',
              message: 'Gut Microbiome Protocol complete! Digestion Stat +1. Gut Health Badge unlocked! 🌱'
            }]
          : s.notifications
        return {
          gut: {
            ...s.gut,
            superSeedsThisWeek: newSeeds,
            superSeedsWeekStart: ws,
            score: s.gut.score + 10,
            gutBadgeEarned: allSevenDone || s.gut.gutBadgeEarned,
          },
          character: allSevenDone && !s.gut.gutBadgeEarned
            ? { ...s.character, cosmetics: { ...s.character.cosmetics, gutHealthBadge: true } }
            : s.character,
          notifications: newNotifications,
        }
      }),

      // Check and unlock diet break / refeed
      checkMilestones: () => set((s) => {
        const { nutrition } = s
        const { deficitMode, milestoneConsistentDays, milestoneWeightLost } = nutrition
        const notifs = [...s.notifications]
        let updates = {}

        if (deficitMode === 'extreme' && milestoneConsistentDays >= 14 && milestoneWeightLost >= 2 && !nutrition.dietBreakActive && !nutrition.refeedEarned) {
          updates = { dietBreakActive: true, dietBreakStartDate: today() }
          notifs.push({
            id: Date.now(), type: 'milestone',
            message: '⚔️ Diet Break Unlocked! 14 days consistent + 2kg lost. Eat at maintenance for 7 days — it\'s not weakness, it\'s strategy.'
          })
        }
        if (deficitMode === 'easy' && milestoneConsistentDays >= 28 && milestoneWeightLost >= 2 && !nutrition.refeedEarned) {
          updates = { refeedEarned: true }
          notifs.push({
            id: Date.now(), type: 'milestone',
            message: '⚡ Refeed Day Unlocked! 4 weeks consistent + 2kg lost. Fuel your body with extra carbs today — warrior strategy.'
          })
        }

        if (!Object.keys(updates).length) return {}
        return { nutrition: { ...nutrition, ...updates }, notifications: notifs }
      }),

      completeRefeed: () => set((s) => ({
        nutrition: { ...s.nutrition, refeedUsed: true, refeedEarned: false, milestoneConsistentDays: 0 },
        character: { ...s.character, cosmetics: { ...s.character.cosmetics, refeedBadge: true } },
        notifications: [...s.notifications, { id: Date.now(), type: 'badge', message: '🏆 Refeed Challenge Complete! Recovery Badge earned.' }]
      })),

      setQuests: (quests) => set({ quests }),

      clearNotification: (id) => set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id)
      })),

      repairGear: () => set((s) => ({
        character: { ...s.character, gearDegradation: Math.max(0, s.character.gearDegradation - 20) }
      })),

      updateStreak: () => set((s) => {
        const { character } = s
        const d = today()
        if (character.lastActiveDate === d) return {}
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        const newStreak = character.lastActiveDate === yesterdayStr ? character.streak + 1 : 1
        return { character: { ...character, streak: newStreak, lastActiveDate: d } }
      }),

      getPhilosopher: () => {
        const cls = get().character.class
        return { Warrior: 'Marcus Aurelius', Mage: 'Epictetus', Rogue: 'Seneca' }[cls] || 'Marcus Aurelius'
      },
    }),
    {
      name: 'ascendrpg-v1',
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          return {
            ...persisted,
            nutrition: defaultState.nutrition,
            gut: defaultState.gut,
            weightLogs: [],
          }
        }
        return persisted
      },
    }
  )
)

export default useStore
