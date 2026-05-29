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
      clothes: true,
      cloak: false,
      armor: false,
      weapon: false,
      aura: false,
      legendaryWeapon: false,
      goldTrim: false,
      partnerBadge: false,
    },
    gearDegradation: 0,
  },
  habits: [],
  routines: {
    morning: [],
    night: [],
  },
  cravings: [],
  dietLogs: [],
  workoutLogs: [],
  quests: [],
  openaiKey: '',
  xpHistory: [],
  notifications: [],
}

const CLASS_PHILOSOPHERS = {
  Warrior: 'Marcus Aurelius',
  Mage: 'Epictetus',
  Rogue: 'Seneca',
}

const CLASS_XP_BONUSES = {
  Warrior: { workout: 1.5 },
  Mage: { routine: 1.5, plan: 1.5 },
  Rogue: { streak: 1.5 },
}

function today() {
  return new Date().toISOString().split('T')[0]
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
            ? [...(s.notifications || []), { id: Date.now(), type: 'levelup', level, message: `Level up! You are now level ${level}!` }]
            : s.notifications,
        }
      }),

      loseXP: (amount, source = 'penalty') => set((s) => {
        const { character } = s
        let hp = character.hp
        let gearDegradation = character.gearDegradation || 0

        if (source === 'craving') {
          gearDegradation = Math.min(100, gearDegradation + 10)
        } else if (source === 'negative_habit') {
          hp = Math.max(0, hp - 5)
        }

        return {
          character: { ...character, hp, gearDegradation },
        }
      }),

      addHabit: (habit) => set((s) => ({
        habits: [...s.habits, {
          id: Date.now(),
          name: habit.name,
          type: habit.type || 'positive',
          frequency: habit.frequency || 'daily',
          streak: 0,
          completions: {},
          skips: {},
          todayCount: 0,
          createdAt: today(),
          ...habit,
        }]
      })),

      completeHabit: (habitId) => set((s) => {
        const d = today()
        const habits = s.habits.map((h) => {
          if (h.id !== habitId) return h
          const alreadyDone = h.completions[d]
          if (h.type === 'negative') {
            const count = (h.completions[d] || 0) + 1
            return { ...h, completions: { ...h.completions, [d]: count } }
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
          return {
            ...h,
            skips: { ...h.skips, [d]: reason },
            streak: 0,
          }
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

      logDiet: (entry) => set((s) => ({
        dietLogs: [...s.dietLogs, { id: Date.now(), date: new Date().toISOString(), ...entry }]
      })),

      logWorkout: (entry) => set((s) => ({
        workoutLogs: [...s.workoutLogs, { id: Date.now(), date: new Date().toISOString(), ...entry }]
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
        return {
          character: { ...character, streak: newStreak, lastActiveDate: d }
        }
      }),

      getPhilosopher: () => {
        const cls = get().character.class
        return CLASS_PHILOSOPHERS[cls] || 'Marcus Aurelius'
      },
    }),
    {
      name: 'ascendrpg-v1',
      version: 1,
    }
  )
)

export default useStore
