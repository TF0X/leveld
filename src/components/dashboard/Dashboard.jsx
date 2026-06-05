import React, { useEffect, useState } from 'react'
import useStore, { xpForLevel, getTier, getStreakMultiplier, getSeason } from '../../store/useStore'
import PixelCharacter from '../character/PixelCharacter'
import { getDailyCoachMessage, generateWeeklyTitle } from '../../utils/ai'
import { fetchFreshQuote } from '../../utils/quotes'
import { ANTAGONIST, getPerformanceState, getWorstStreak, getWeekXP, getBestWeekXP, getTodayBonusChallenge, rollXPMultiplier } from '../../utils/antagonist'
import { getTodayWorkout } from '../../data/workoutTemplates'

function getWeekKey() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

function SeasonBadge({ season }) {
  const map = { spring: '🌸 Spring', summer: '🌿 Summer', autumn: '🍂 Autumn', winter: '❄️ Winter' }
  return <span className="text-xs text-slate-500">{map[season]}</span>
}

const MODE_CONFIG = {
  lose:     { label: 'Cut',      color: '#ef4444', bg: 'bg-red-900',    border: 'border-red-600',    icon: '🔥', desc: 'Calorie deficit' },
  maintain: { label: 'Maintain', color: '#f59e0b', bg: 'bg-amber-900',  border: 'border-amber-600',  icon: '⚖️', desc: 'At maintenance' },
  bulk:     { label: 'Bulk',     color: '#10b981', bg: 'bg-emerald-900',border: 'border-emerald-600',icon: '💪', desc: 'Calorie surplus' },
}

function ModeSwitcher({ current, onSwitch, targets }) {
  const [open, setOpen] = useState(false)
  const cfg = MODE_CONFIG[current] || MODE_CONFIG.maintain

  return (
    <div className="relative">
      <button
        className={`flex items-center gap-2 px-3 py-2 rounded border text-xs transition-all ${cfg.border} ${cfg.bg}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>{cfg.icon}</span>
        <span className="font-pixel" style={{ fontSize: '9px', color: cfg.color }}>{cfg.label}</span>
        {targets?.dailyCalories > 0 && (
          <span className="text-slate-400">{targets.dailyCalories} kcal</span>
        )}
        <span className="text-slate-500">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-rpg-panel border border-rpg-border rounded shadow-xl w-48">
          {Object.entries(MODE_CONFIG).map(([key, m]) => (
            <button
              key={key}
              className={`flex items-center gap-3 w-full px-4 py-3 text-left text-xs hover:bg-slate-800 ${current === key ? 'bg-slate-800' : ''}`}
              onClick={() => { onSwitch(key); setOpen(false) }}
            >
              <span>{m.icon}</span>
              <div>
                <div className="font-pixel" style={{ fontSize: '9px', color: m.color }}>{m.label}</div>
                <div className="text-slate-500">{m.desc}</div>
              </div>
              {current === key && <span className="ml-auto text-green-400">✓</span>}
            </button>
          ))}
          {targets?.maintenanceCalories > 0 && (
            <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-600">
              Maintenance: {targets.maintenanceCalories} kcal
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TodayWorkoutCard({ program, customDays }) {
  const [expanded, setExpanded] = useState(false)
  const result = getTodayWorkout(program, customDays)
  if (!result) return null

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = DAY_NAMES[new Date().getDay()]

  if (!result.isTrainingDay) {
    return (
      <div className="rpg-panel p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-pixel text-xs text-slate-500 mb-1" style={{ fontSize: '9px' }}>TODAY — {today.toUpperCase()}</div>
            <div className="text-sm text-slate-400">Rest Day</div>
            <div className="text-xs text-slate-600 mt-1">Next session: {result.nextTrainingDay}</div>
          </div>
          <span className="text-2xl">🛌</span>
        </div>
        {program?.cardioNote && (
          <div className="text-xs text-amber-600 mt-2 border-t border-slate-800 pt-2">{program.cardioNote}</div>
        )}
      </div>
    )
  }

  const { dayData, cardioNote } = result

  return (
    <div className="rpg-panel p-4 border border-violet-800">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-pixel text-xs text-violet-400 mb-1" style={{ fontSize: '9px' }}>TODAY — {today.toUpperCase()}</div>
          <div className="text-sm text-slate-200">{dayData.label}</div>
          <div className="text-xs text-slate-500">{dayData.exercises.length} exercises • {program?.name}</div>
        </div>
        <button className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setExpanded(v => !v)}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Preview — first 3 exercises always shown */}
      <div className="space-y-1">
        {dayData.exercises.slice(0, expanded ? 99 : 3).map((ex, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-slate-300">{ex.name}</span>
            <span className="text-slate-600">{ex.sets}×{ex.reps}</span>
          </div>
        ))}
        {!expanded && dayData.exercises.length > 3 && (
          <div className="text-xs text-slate-600">+{dayData.exercises.length - 3} more</div>
        )}
      </div>

      {cardioNote && (
        <div className="text-xs text-amber-600 mt-3 border-t border-slate-800 pt-2">🏃 {cardioNote}</div>
      )}
    </div>
  )
}

function StatBar({ value, max, color, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }}>{value} / {max}</span>
      </div>
      <div className="stat-bar">
        <div className="stat-bar-fill transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

const SEASON_SCENES = {
  spring: { bg: 'linear-gradient(180deg, #0d2b0d 0%, #1a3a1a 50%, #0f1a0f 100%)', particles: ['🌸','🌸','🌿','🌸'], ground: '#2d4a1e' },
  summer: { bg: 'linear-gradient(180deg, #0a1f2e 0%, #0d3040 50%, #1a2e1a 100%)', particles: ['🌟','☀️','🌿','🌊'], ground: '#1e3a1a' },
  autumn: { bg: 'linear-gradient(180deg, #2e1a05 0%, #3d2008 50%, #1a0f05 100%)', particles: ['🍂','🍁','🍂','🍁'], ground: '#3d1e08' },
  winter: { bg: 'linear-gradient(180deg, #050f1e 0%, #0a1535 50%, #050a14 100%)', particles: ['❄️','❄️','⭐','❄️'], ground: '#0d1a2e' },
}

function SeasonalScene({ season }) {
  const scene = SEASON_SCENES[season] || SEASON_SCENES.winter
  return (
    <div className="absolute inset-0 overflow-hidden rounded-l">
      <div className="absolute inset-0" style={{ background: scene.bg }} />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute w-0.5 h-0.5 rounded-full bg-white star"
          style={{ left: `${10 + i * 14}%`, top: `${8 + (i % 3) * 12}%`, '--dur': `${2 + i * 0.5}s`, '--delay': `${i * 0.3}s` }} />
      ))}
      <div className="absolute bottom-0 left-0 right-0 h-6 rounded-bl" style={{ background: scene.ground, opacity: 0.6 }} />
      {scene.particles.map((p, i) => (
        <div key={i} className="absolute text-xs"
          style={{ left: `${5 + i * 22}%`, top: `${20 + (i % 2) * 30}%`, animation: `float ${2.5 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.5}s`, fontSize: '10px', opacity: 0.7 }}>
          {p}
        </div>
      ))}
    </div>
  )
}

function CharacterCard({ character, season, performance }) {
  const tier = getTier(character.level)
  const xpNeeded = xpForLevel(character.level)
  const multiplier = getStreakMultiplier(character.streak)

  return (
    <div className="rpg-panel overflow-hidden">
      <div className="flex gap-0 items-stretch">
        <div className="relative flex-shrink-0 w-28 flex items-end justify-center pb-2" style={{ minHeight: '140px' }}>
          <SeasonalScene season={season} />
          <div className="relative z-10">
            <PixelCharacter character={character} size={90} degradation={character.gearDegradation} performance={performance} />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div>
            <div className="font-pixel text-xs text-white">{character.name}</div>
            <div className="font-pixel text-xs mt-0.5" style={{ color: tier.color, fontSize: '9px' }}>{tier.name} • Lv.{character.level}</div>
          </div>
          <StatBar value={character.hp} max={character.maxHp} color="#ef4444" label="HP" />
          <StatBar value={character.xp} max={xpNeeded} color="#10b981" label="XP" />
          <div className="flex gap-3 flex-wrap text-xs">
            <span className="text-amber-400">💰 {character.gold || 0}</span>
            <span className="text-blue-400">⚡ {character.willpower || 0}</span>
            {character.streak > 0 && <span className="fire-streak">🔥 {character.streak}d</span>}
          </div>
          {multiplier > 1 && <div className="text-xs text-amber-400 font-pixel" style={{ fontSize: '9px' }}>×{multiplier} XP BONUS</div>}
        </div>
      </div>
      {/* Performance state line */}
      {performance !== 'ok' && (
        <div className={`px-4 py-2 border-t border-slate-800 text-xs font-pixel ${performance === 'great' ? 'text-green-500' : performance === 'bad' ? 'text-amber-500' : 'text-red-500'}`} style={{ fontSize: '8px' }}>
          {ANTAGONIST.performanceState(performance)}
        </div>
      )}
    </div>
  )
}

function PersonalLeaderboard({ xpHistory, bestWeekXP }) {
  const current = getWeekXP(xpHistory)
  const best = bestWeekXP || getBestWeekXP(xpHistory)
  const msg = ANTAGONIST.weeklyCompare(current, best)
  const pct = best > 0 ? Math.min(100, Math.round((current / best) * 100)) : 0

  return (
    <div className="rpg-panel p-4">
      <div className="font-pixel text-xs text-slate-400 mb-3">THIS WEEK VS YOUR BEST</div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Personal Best</span>
            <span className="text-amber-400">{best} XP</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill bg-amber-600 opacity-40" style={{ width: '100%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">This Week</span>
            <span className="text-violet-400">{current} XP</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill bg-violet-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      {msg && <div className="text-xs text-slate-500 italic mt-3">{msg}</div>}
    </div>
  )
}

function WorstStreakBanner({ habits }) {
  const worst = getWorstStreak(habits)
  if (!worst) return null
  return (
    <div className="rpg-panel p-3 border border-red-900">
      <div className="font-pixel text-xs text-red-400 mb-1" style={{ fontSize: '8px' }}>SHAME COUNTER</div>
      <div className="text-xs text-slate-400 italic">{ANTAGONIST.worstStreak(worst.habit.name, worst.days)}</div>
    </div>
  )
}

function BonusChallengeBar({ habits, onComplete }) {
  const challenge = getTodayBonusChallenge(habits)
  const [dismissed, setDismissed] = useState(false)

  if (!challenge || dismissed) return null

  const now = new Date()
  const start = new Date(challenge.startTime)
  const expires = new Date(challenge.expiresAt)

  if (now < start || now > expires || challenge.completed) return null

  const minsLeft = Math.max(0, Math.round((expires - now) / 60000))
  const pct = Math.max(0, ((expires - now) / (2 * 60 * 60 * 1000)) * 100)

  return (
    <div className="rpg-panel p-4 border border-amber-600">
      <div className="flex items-center justify-between mb-2">
        <div className="font-pixel text-xs text-amber-400" style={{ fontSize: '9px' }}>⚡ BONUS CHALLENGE</div>
        <span className="text-xs text-amber-400">{minsLeft}m left</span>
      </div>
      <div className="text-xs text-slate-300 mb-2">{challenge.habitName}</div>
      <div className="stat-bar mb-3">
        <div className="stat-bar-fill bg-amber-500" style={{ width: `${pct}%`, transition: 'none' }} />
      </div>
      <div className="text-xs text-slate-500 mb-3">2× XP if completed now. Or don't.</div>
      <div className="flex gap-2">
        <button className="rpg-btn-gold flex-1 text-xs" onClick={() => onComplete(challenge)}>Complete (2× XP)</button>
        <button className="text-xs text-slate-600 px-3" onClick={() => setDismissed(true)}>Skip</button>
      </div>
    </div>
  )
}

function QuoteBanner() {
  const [quote, setQuote] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchFreshQuote().then(setQuote).catch(() => {})
  }, [])

  if (!quote || dismissed) return null

  return (
    <div className="rpg-panel p-4 border-l-2 border-violet-600 relative">
      <button className="absolute top-2 right-2 text-slate-600 text-xs hover:text-slate-400" onClick={() => setDismissed(true)}>✕</button>
      <div className="text-xs text-slate-400 italic leading-relaxed mb-2 pr-4">"{quote.content}"</div>
      <div className="text-xs text-violet-400 font-pixel" style={{ fontSize: '9px' }}>— {quote.author}</div>
    </div>
  )
}

function QuestList({ habits, gainXP, completeHabit, loseXP }) {
  const today = new Date().toISOString().split('T')[0]
  const todayDay = new Date().getDay()
  const dailyHabits = habits.filter(h =>
    h.frequency === 'daily' && (!h.days?.length || h.days.includes(todayDay))
  )
  const [xpPop, setXpPop] = useState(null)
  const [multiplierReveal, setMultiplierReveal] = useState(null)

  const handleComplete = (habitId) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit || habit.completions?.[today]) return
    completeHabit(habitId)
    if (habit.type === 'positive') {
      const mult = rollXPMultiplier()
      const base = 15
      const earned = Math.floor(base * mult)
      gainXP(earned, 'habit')
      setMultiplierReveal({ id: Date.now(), mult, base, earned })
      setTimeout(() => setMultiplierReveal(null), 2500)
      setXpPop({ id: Date.now(), text: `+${earned} XP` })
      setTimeout(() => setXpPop(null), 1500)
    } else {
      const count = (habit.completions?.[today] || 0) + 1
      loseXP(count === 1 ? 10 : count === 2 ? 25 : 50, 'negative_habit')
    }
  }

  return (
    <div className="rpg-panel p-4 relative">
      <div className="font-pixel text-xs text-amber-400 mb-3">TODAY'S QUESTS</div>
      {xpPop && (
        <div className="absolute top-4 right-4 text-green-400 font-pixel text-xs xp-float pointer-events-none" style={{ fontSize: '9px' }}>
          {xpPop.text}
        </div>
      )}
      {multiplierReveal && (
        <div className="absolute top-10 right-4 z-10 rpg-panel p-2 border border-amber-600 text-center" style={{ minWidth: '120px' }}>
          <div className="font-pixel text-xs text-amber-400" style={{ fontSize: '8px' }}>
            {multiplierReveal.mult === 2 ? '🎰 2× LUCKY!' : multiplierReveal.mult === 1.5 ? '✨ 1.5× BONUS' : '1× Standard'}
          </div>
          <div className="text-xs text-slate-300">{ANTAGONIST.xpMultiplierReveal(multiplierReveal.mult, multiplierReveal.base)}</div>
        </div>
      )}
      {dailyHabits.length === 0 ? (
        <div className="text-xs text-slate-500">No habits. Add some in the Habits tab.</div>
      ) : (
        <div className="space-y-2">
          {dailyHabits.map(h => {
            const done = h.completions?.[today]
            const isNeg = h.type === 'negative'
            return (
              <div key={h.id} className={`flex items-center gap-3 p-2 rounded border transition-all ${done ? 'border-green-800 bg-green-950 opacity-70' : isNeg ? 'border-red-800 bg-red-950' : 'border-slate-700 hover:border-violet-600'}`}>
                <button
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 ${done ? 'bg-green-600 border-green-500' : isNeg ? 'bg-red-900 border-red-600' : 'border-slate-600 hover:border-violet-500'}`}
                  onClick={() => !done && handleComplete(h.id)}
                  disabled={!!done}
                >
                  {done ? '✓' : isNeg ? '✗' : '◎'}
                </button>
                <span className="text-xs flex-1 text-slate-200">{h.name}</span>
                {h.streak > 0 && <span className="text-xs fire-streak">🔥{h.streak}</span>}
                {done && <span className="text-xs text-green-400">Done</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TOAST_CONFIG = {
  levelup:    { icon: '⭐', label: 'LEVEL UP!',     border: 'border-amber-600',   btn: 'rpg-btn-gold' },
  milestone:  { icon: '⚔️', label: 'MILESTONE!',   border: 'border-violet-600',  btn: 'rpg-btn-primary' },
  badge:      { icon: '🏆', label: 'BADGE EARNED!', border: 'border-emerald-600', btn: 'rpg-btn-secondary' },
  drop:       { icon: '💎', label: 'ITEM DROP!',    border: 'border-blue-600',    btn: 'rpg-btn-secondary' },
  antagonist: { icon: '😐', label: 'NOTE.',         border: 'border-slate-600',   btn: 'rpg-btn-secondary' },
}

function NotificationToast({ notifications, onDismiss }) {
  if (!notifications?.length) return null
  const n = notifications[0]
  const cfg = TOAST_CONFIG[n.type] || TOAST_CONFIG.levelup
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-80 px-4">
      <div className={`rpg-panel p-4 border ${cfg.border} text-center`}>
        <div className="text-xl mb-1">{cfg.icon}</div>
        <div className="font-pixel text-xs text-slate-300 mb-2" style={{ fontSize: '9px' }}>{cfg.label}</div>
        <div className="text-xs text-slate-300 leading-relaxed">{n.message}</div>
        <button className={`${cfg.btn} mt-3 text-xs`} onClick={() => onDismiss(n.id)}>OK</button>
      </div>
    </div>
  )
}

const TITLE_COLORS = {
  positive: { text: 'text-green-400', border: 'border-green-800', bg: 'bg-green-950' },
  negative: { text: 'text-red-400',   border: 'border-red-900',   bg: 'bg-red-950'   },
  neutral:  { text: 'text-amber-400', border: 'border-amber-800', bg: 'bg-amber-950' },
}

export default function Dashboard() {
  const {
    character, habits, notifications, clearNotification, openaiKey,
    updateStreak, checkMilestones, nutrition, xpHistory, bestWeekXP,
    updateBestWeekXP, completeHabit, gainXP, loseXP, checkOverdueTodos, switchMode,
    weeklyTitle, setWeeklyTitle, workoutLogs, cravings,
  } = useStore()
  const [coachMsg, setCoachMsg] = useState('')
  const season = getSeason()
  const weekKey = getWeekKey()

  const performance = getPerformanceState(habits, xpHistory)
  const currentWeekXP = getWeekXP(xpHistory)

  useEffect(() => {
    updateStreak()
    checkMilestones()
    checkOverdueTodos()
    updateBestWeekXP(currentWeekXP)
  }, [])

  // Weekly performance title
  useEffect(() => {
    if (!openaiKey || !character.class) return
    if (weeklyTitle?.weekKey === weekKey) return
    const cacheKey = `weekly_title_${weekKey}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setWeeklyTitle({ ...JSON.parse(cached), weekKey }); return } catch (e) {}
    }
    // Compute stats for this week
    const ws = new Date(weekKey)
    const we = new Date(ws); we.setDate(we.getDate() + 7)
    const todayStr = new Date().toISOString().split('T')[0]
    const todayDay = new Date().getDay()

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws); d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    }).filter(d => d <= todayStr)

    const dailyHabits = habits.filter(h => h.frequency === 'daily' && h.type === 'positive')
    const totalPossible = weekDays.length * dailyHabits.length || 1
    const totalDone = weekDays.reduce((acc, d) => acc + dailyHabits.filter(h => h.completions?.[d]).length, 0)
    const habitsCompletedPct = Math.round((totalDone / totalPossible) * 100)

    const workoutsThisWeek = (workoutLogs || []).filter(l => l.date >= ws.toISOString() && l.date < we.toISOString()).length
    const cravingsResisted = (cravings || []).filter(c => c.resisted && c.date >= ws.toISOString()).length
    const negativeDays = weekDays.filter(d => {
      const done = dailyHabits.filter(h => h.completions?.[d]).length
      return dailyHabits.length > 0 && done / dailyHabits.length < 0.5
    }).length

    generateWeeklyTitle(openaiKey, { character, stats: { habitsCompletedPct, workoutsThisWeek, cravingsResisted, negativeDays } })
      .then(t => {
        const full = { ...t, weekKey }
        setWeeklyTitle(full)
        localStorage.setItem(cacheKey, JSON.stringify(t))
      })
      .catch(() => {})
  }, [openaiKey, character.class, weekKey])

  useEffect(() => {
    if (!openaiKey || !character.class) return
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `coach_${today}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setCoachMsg(cached); return }
    const habitsCompleted = habits.filter(h => h.completions?.[today]).length
    getDailyCoachMessage(openaiKey, { character, stats: { habitsCompleted }, nutrition })
      .then(msg => { setCoachMsg(msg); localStorage.setItem(cacheKey, msg) })
      .catch(() => {})
  }, [openaiKey, character.class])

  const handleBonusComplete = (challenge) => {
    const habit = habits.find(h => h.id === challenge.habitId)
    if (!habit) return
    completeHabit(habit.id)
    gainXP(30, 'bonus_challenge') // 2× of base 15
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `bonus_challenge_${today}`
    try {
      const c = JSON.parse(localStorage.getItem(cacheKey) || '{}')
      localStorage.setItem(cacheKey, JSON.stringify({ ...c, completed: true }))
    } catch {}
  }

  return (
    <div className="space-y-4 pb-6">
      <NotificationToast notifications={notifications} onDismiss={clearNotification} />

      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">DASHBOARD</h1>
        <div className="flex items-center gap-2">
          {nutrition?.weightKg > 0 && (
            <ModeSwitcher current={nutrition.goalType || 'lose'} onSwitch={switchMode} targets={nutrition} />
          )}
          <SeasonBadge season={season} />
        </div>
      </div>

      {/* Weekly title */}
      {weeklyTitle?.weekKey === weekKey && (() => {
        const cfg = TITLE_COLORS[weeklyTitle.sentiment] || TITLE_COLORS.neutral
        return (
          <div className={`rpg-panel px-4 py-2 border ${cfg.border} ${cfg.bg} flex items-center justify-between`}>
            <span className={`font-pixel text-xs ${cfg.text}`} style={{ fontSize: '9px' }}>{weeklyTitle.title}</span>
            <span className="text-xs text-slate-600">This Week</span>
          </div>
        )
      })()}

      <CharacterCard character={character} season={season} performance={performance} />

      {/* Today's recommended workout */}
      {nutrition?.workoutProgramData && (
        <TodayWorkoutCard program={nutrition.workoutProgramData} customDays={nutrition?.customTrainingDays} />
      )}

      <WorstStreakBanner habits={habits} />

      <PersonalLeaderboard xpHistory={xpHistory} bestWeekXP={bestWeekXP} />

      <BonusChallengeBar habits={habits} onComplete={handleBonusComplete} />

      {coachMsg && (
        <div className="rpg-panel p-4 border-l-2 border-blue-600">
          <div className="font-pixel text-xs text-blue-400 mb-2" style={{ fontSize: '9px' }}>AI COACH</div>
          <div className="text-xs text-slate-300 leading-relaxed">{coachMsg}</div>
        </div>
      )}

      <QuestList habits={habits} gainXP={gainXP} completeHabit={completeHabit} loseXP={loseXP} />

      <QuoteBanner />
    </div>
  )
}
