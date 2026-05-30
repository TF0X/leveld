// Antagonistic app personality — dry, slightly unimpressed

export const ANTAGONIST = {
  // Habit miss
  missedHabit: (name) => {
    const lines = [
      `"${name}" again. Noted.`,
      `Still skipping "${name}". Bold strategy.`,
      `"${name}" not done. Again. Fine.`,
      `Avoiding "${name}" I see. Very brave.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  },

  // Broken streak
  brokenStreak: (days) => {
    const lines = [
      `Back to zero. Shocking.`,
      `${days} days, gone. You know the drill.`,
      `Streak dead. Build another one.`,
      `That streak is done. Start over.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  },

  // Good streak
  goodStreak: (days) => {
    const lines = [
      `${days} days. Fine. You did okay. Don't get cocky.`,
      `${days} days straight. Still not impressive, but okay.`,
      `${days} days. Technically consistent. Keep going.`,
      `${days} days. Acceptable. Don't stop now.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  },

  // Worst streak shame
  worstStreak: (habitName, days) => {
    const lines = [
      `Day ${days} of skipping "${habitName}". Embarrassing.`,
      `"${habitName}" — ${days} days ignored. Impressive avoidance.`,
      `Still haven't done "${habitName}" in ${days} days. Just saying.`,
      `${days} days without "${habitName}". A personal achievement.`,
    ]
    return lines[Math.floor(Math.random() * lines.length)]
  },

  // XP multiplier reveals
  xpMultiplierReveal: (multiplier, baseXP) => {
    if (multiplier === 2) return `Lucky. 2× multiplier. ${baseXP * 2} XP. Don't expect this every time.`
    if (multiplier === 1.5) return `1.5× today. ${Math.floor(baseXP * 1.5)} XP. Could be worse.`
    return `1× multiplier. ${baseXP} XP. Standard.`
  },

  // Item drops
  itemDrop: (item) => `Item dropped: ${item}. Rare. Don't lose it.`,
  noItemDrop: () => `No drop. Try again tomorrow.`,

  // Boss dialogue
  bossDialogue: {
    monday: () => `You have 6 days. I'm not worried.`,
    thursday_high_hp: (hp) => `Boss still at ${hp}% HP. Concerning.`,
    thursday_low_hp: (hp) => `Down to ${hp}%. Getting closer. Surprising.`,
    sunday_alive: () => `Same time next week, then.`,
    sunday_dead: () => `Fine. You earned this one.`,
    daily_taunt: (hp) => {
      if (hp > 80) return `Boss is barely scratched. At this rate...`
      if (hp > 50) return `Halfway. Don't celebrate yet.`
      if (hp > 20) return `Almost. Don't mess this up.`
      return `Nearly done. Finish it.`
    },
  },

  // Todo antagonism
  todo: {
    tooMany: () => `You're not that productive. Pick 3.`,
    sevenDaysOld: (name) => `"${name}" has been sitting here 7 days. Delete it or do it. Pick one.`,
    overdue: (name) => `"${name}" missed midnight. -5 HP. Consequences exist.`,
    threedayDebuff: (name) => `"${name}" 3 days overdue. Character debuff applied. Distracted.`,
    completed: () => {
      const lines = [
        `Done. Finally.`,
        `Took you long enough. +5 XP.`,
        `One less thing to avoid. +5 XP.`,
        `About time. +5 XP.`,
      ]
      return lines[Math.floor(Math.random() * lines.length)]
    },
  },

  // Personal leaderboard
  weeklyCompare: (current, best) => {
    if (!best || best === 0) return null
    const pct = Math.round((current / best) * 100)
    if (pct >= 90) return `This week: ${current} XP. Near your best. Fine.`
    if (pct >= 50) return `Your best: ${best} XP. This week: ${current} XP. Room to improve.`
    return `Your best: ${best} XP. This week: ${current} XP. What happened?`
  },

  // Bonus challenge
  bonusChallenge: {
    appeared: (name) => `Bonus available: "${name}". 2 hours. 2× XP. Or don't.`,
    expired: () => `Bonus challenge expired. Maybe next time.`,
    completed: (name) => `"${name}" done. 2× XP. Unexpected.`,
  },

  // Performance state messages
  performanceState: (state) => {
    const map = {
      great:    `Current form: acceptable.`,
      ok:       `Average week. Average results.`,
      bad:      `Below average. You know it.`,
      terrible: `This is a rough week. Get it together.`,
    }
    return map[state] || map.ok
  },
}

// Weighted random XP multiplier: 70% = 1x, 20% = 1.5x, 10% = 2x
export function rollXPMultiplier() {
  const r = Math.random()
  if (r < 0.70) return 1
  if (r < 0.90) return 1.5
  return 2
}

// Rare item drop chance 5-15%
const RARE_ITEMS = [
  'Shadow Cloak Fragment',
  'Ember Rune',
  'Iron Will Token',
  'Ancient Scroll',
  'Phantom Boots',
  'Willpower Crystal',
  'Streak Seal',
  'Discipline Badge',
  'Stoic Pendant',
  'Quest Stone',
]

export function rollItemDrop() {
  const chance = 0.05 + Math.random() * 0.10 // 5-15%
  if (Math.random() < chance) {
    return RARE_ITEMS[Math.floor(Math.random() * RARE_ITEMS.length)]
  }
  return null
}

// Determine character performance state from this week's habit completion
export function getPerformanceState(habits, xpHistory) {
  const ws = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })()
  const today = new Date().toISOString().split('T')[0]

  const weekXP = (xpHistory || []).filter(x => x.date >= ws).reduce((a, x) => a + x.amount, 0)
  const dailyHabits = habits.filter(h => h.frequency === 'daily' && h.type === 'positive')
  if (!dailyHabits.length) return 'ok'

  const daysThisWeek = Math.max(1, Math.ceil((new Date() - new Date(ws)) / 86400000))
  const totalPossible = dailyHabits.length * daysThisWeek
  const totalDone = dailyHabits.reduce((acc, h) => {
    const daysCompleted = Object.keys(h.completions || {}).filter(d => d >= ws && d <= today).length
    return acc + daysCompleted
  }, 0)

  const rate = totalDone / totalPossible
  if (rate >= 0.8) return 'great'
  if (rate >= 0.5) return 'ok'
  if (rate >= 0.2) return 'bad'
  return 'terrible'
}

// Find the worst-performing habit (most consecutive days missed)
export function getWorstStreak(habits) {
  const today = new Date()
  let worst = null
  let worstDays = 2 // only show if at least 2 days missed

  habits.filter(h => h.frequency === 'daily' && h.type === 'positive').forEach(h => {
    let missed = 0
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (!h.completions?.[dateStr]) missed++
      else break
    }
    if (missed > worstDays) {
      worstDays = missed
      worst = { habit: h, days: missed }
    }
  })

  return worst
}

// Generate today's bonus challenge (deterministic per day but random hour)
export function getTodayBonusChallenge(habits) {
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `bonus_challenge_${today}`
  let cached
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null') } catch {}

  if (cached) return cached

  // Pick a random daily habit
  const daily = habits.filter(h => h.frequency === 'daily' && h.type === 'positive')
  if (!daily.length) return null

  // Deterministic random hour 9-19 using date as seed
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0)
  const hour = 9 + (seed % 11) // 9am–7pm
  const startTime = new Date(today)
  startTime.setHours(hour, 0, 0, 0)
  const expiresAt = new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // +2 hours

  const habitIndex = seed % daily.length
  const challenge = {
    date: today,
    habitId: daily[habitIndex].id,
    habitName: daily[habitIndex].name,
    startTime: startTime.toISOString(),
    expiresAt: expiresAt.toISOString(),
    completed: false,
  }

  localStorage.setItem(cacheKey, JSON.stringify(challenge))
  return challenge
}

export function getWeekXP(xpHistory) {
  const ws = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })()
  return (xpHistory || []).filter(x => x.date >= ws).reduce((a, x) => a + x.amount, 0)
}

export function getBestWeekXP(xpHistory) {
  if (!xpHistory?.length) return 0
  // Group by week start
  const weeks = {}
  xpHistory.forEach(x => {
    const d = new Date(x.date)
    d.setDate(d.getDate() - d.getDay())
    const ws = d.toISOString().split('T')[0]
    weeks[ws] = (weeks[ws] || 0) + x.amount
  })
  return Math.max(0, ...Object.values(weeks))
}
