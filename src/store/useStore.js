import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { calcTargets } from '../data/foods'

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
  // Todos: three buckets
  todos: [],                      // [{ id, text, bucket: 'today'|'week'|'someday', createdAt, completedAt, dueDate }]
  // Inventory: rare item drops
  inventory: [],                  // [{ id, name, obtainedAt }]
  openaiKey: '',
  xpHistory: [],
  notifications: [],
  bestWeekXP: 0,
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

      // Switch cut / maintain / bulk — recalculates targets AND fixes contradicting habits
      switchMode: (newGoalType) => set((s) => {
        const { weightKg, activityLevel, deficitMode } = s.nutrition
        const t = weightKg
          ? calcTargets(weightKg, activityLevel, deficitMode, newGoalType)
          : null

        // Habits that directly contradict a mode — remove them when switching away
        const SURPLUS_KEYWORDS = ['calorie surplus', 'eat more calories', 'caloric surplus']
        const DEFICIT_KEYWORDS = ['calorie deficit', 'stay in deficit', 'caloric deficit']
        const TARGET_KEYWORDS  = ['hit calorie target', 'calorie target today']

        // The correct nutrition habit for each mode
        const MODE_HABITS = {
          lose:     { id: 'mode_cal', name: 'Stay in calorie deficit today', type: 'positive', frequency: 'daily', category: 'nutrition' },
          bulk:     { id: 'mode_cal', name: 'Eat calorie surplus today',      type: 'positive', frequency: 'daily', category: 'nutrition' },
          maintain: { id: 'mode_cal', name: 'Hit calorie target today',       type: 'positive', frequency: 'daily', category: 'nutrition' },
        }

        const allConflictKeywords = [...SURPLUS_KEYWORDS, ...DEFICIT_KEYWORDS, ...TARGET_KEYWORDS]

        // Remove any habits whose names contain a mode-specific calorie keyword
        const filteredHabits = s.habits.filter(h =>
          !allConflictKeywords.some(kw => h.name.toLowerCase().includes(kw))
        )

        // Only inject a replacement habit if user already had one of these (i.e. they care about it)
        const hadCalorieHabit = s.habits.some(h =>
          allConflictKeywords.some(kw => h.name.toLowerCase().includes(kw))
        )

        const newHabit = hadCalorieHabit ? {
          ...MODE_HABITS[newGoalType],
          id: Date.now(),
          streak: 0,
          completions: {},
          skips: {},
          createdAt: today(),
        } : null

        const updatedHabits = newHabit ? [...filteredHabits, newHabit] : filteredHabits

        return {
          habits: updatedHabits,
          nutrition: {
            ...s.nutrition,
            goalType: newGoalType,
            ...(t ? {
              dailyCalories: t.calories,
              proteinTarget:  t.protein,
              carbTarget:     t.carbs,
              fatTarget:      t.fat,
              maintenanceCalories: t.maintenance,
            } : {}),
          },
          notifications: [...s.notifications, {
            id: Date.now(), type: 'antagonist',
            message: newGoalType === 'lose'
              ? 'Switched to Cut. Surplus habit removed. Deficit habit added.'
              : newGoalType === 'bulk'
              ? 'Switched to Bulk. Deficit habit removed. Surplus habit added.'
              : 'Switched to Maintain. Calorie habit updated.',
          }]
        }
      }),

      // Penalise going over daily calorie target — called from Diet on meal log
      penalizeCalorieOverage: (totalCalories) => set((s) => {
        const target = s.nutrition.dailyCalories
        if (!target || totalCalories <= target) return {}
        const overage = totalCalories - target
        const alreadyPenalized = s.nutrition.caloriePenaltyDate === today()
        if (alreadyPenalized) return {}

        const hpLoss = Math.min(20, Math.floor(overage / 100) * 5) // -5 HP per 100 kcal over, max -20
        const hp = Math.max(0, s.character.hp - hpLoss)
        return {
          character: { ...s.character, hp },
          nutrition: { ...s.nutrition, caloriePenaltyDate: today() },
          notifications: [...s.notifications, {
            id: Date.now(), type: 'antagonist',
            message: `${overage} kcal over target. -${hpLoss} HP. The body keeps score.`,
          }]
        }
      }),

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

      // ── Todos ──────────────────────────────────────────────────────
      addTodo: (text, bucket = 'today') => set((s) => {
        const todayTodos = s.todos.filter(t => t.bucket === 'today' && !t.completedAt)
        if (bucket === 'today' && todayTodos.length >= 5) {
          return {
            notifications: [...s.notifications, {
              id: Date.now(), type: 'antagonist',
              message: "You're not that productive. Pick 3.",
            }]
          }
        }
        const todayCount = s.todos.filter(t => t.createdAt === today()).length
        if (todayCount >= 5) {
          return {
            notifications: [...s.notifications, {
              id: Date.now(), type: 'antagonist',
              message: "You're not that productive. Pick 3.",
            }]
          }
        }
        return {
          todos: [...s.todos, {
            id: Date.now(),
            text,
            bucket,
            createdAt: today(),
            completedAt: null,
            dueDate: bucket === 'today' ? today() : null,
          }]
        }
      }),

      completeTodo: (todoId) => set((s) => {
        const todos = s.todos.map(t => t.id === todoId ? { ...t, completedAt: new Date().toISOString() } : t)
        return { todos }
      }),

      deleteTodo: (todoId) => set((s) => ({
        todos: s.todos.filter(t => t.id !== todoId)
      })),

      moveTodo: (todoId, bucket) => set((s) => ({
        todos: s.todos.map(t => t.id === todoId ? { ...t, bucket } : t)
      })),

      // Check overdue todos — called on app open
      checkOverdueTodos: () => set((s) => {
        const d = today()
        let hp = s.character.hp
        const notifs = [...s.notifications]
        const todos = s.todos.map(t => {
          if (t.completedAt || !t.dueDate) return t
          const daysOverdue = Math.floor((new Date(d) - new Date(t.dueDate)) / 86400000)
          if (daysOverdue <= 0) return t

          // -5 HP per overdue today todo, once per day
          if (t.bucket === 'today' && daysOverdue === 1 && t.overdueHpDeducted !== d) {
            hp = Math.max(0, hp - 5)
            notifs.push({ id: Date.now() + Math.random(), type: 'antagonist', message: `"${t.text}" missed midnight. -5 HP.` })
            return { ...t, overdueHpDeducted: d }
          }

          // 7-day nag
          if (daysOverdue >= 7 && !t.naggedAt7) {
            notifs.push({ id: Date.now() + Math.random(), type: 'antagonist', message: `"${t.text}" — 7 days sitting here. Delete it or do it. Pick one.` })
            return { ...t, naggedAt7: true }
          }

          return t
        })
        return { todos, character: { ...s.character, hp }, notifications: notifs }
      }),

      // ── Inventory ──────────────────────────────────────────────────
      addInventoryItem: (name) => set((s) => ({
        inventory: [...(s.inventory || []), { id: Date.now(), name, obtainedAt: today() }],
        notifications: [...s.notifications, {
          id: Date.now(), type: 'drop',
          message: `Item dropped: ${name}. Rare. Don't lose it.`,
        }]
      })),

      // ── Best week XP ───────────────────────────────────────────────
      updateBestWeekXP: (weekXP) => set((s) => ({
        bestWeekXP: Math.max(s.bestWeekXP || 0, weekXP)
      })),

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
      version: 3,
      migrate: (persisted, version) => {
        if (version < 2) return { ...persisted, nutrition: defaultState.nutrition, gut: defaultState.gut, weightLogs: [] }
        if (version < 3) return { ...persisted, todos: [], inventory: [], bestWeekXP: 0 }
        return persisted
      },
    }
  )
)

export default useStore
