import React, { useEffect, useState } from 'react'
import useStore, { xpForLevel, getTier, getStreakMultiplier, getSeason } from '../../store/useStore'
import PixelCharacter from '../character/PixelCharacter'
import { getDailyQuote } from '../../data/quotes'
import { getDailyCoachMessage } from '../../utils/ai'

function SeasonBadge({ season }) {
  const map = { spring: '🌸 Spring', summer: '🌿 Summer', autumn: '🍂 Autumn', winter: '❄️ Winter' }
  return <span className="text-xs text-slate-400">{map[season]}</span>
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
  spring: {
    bg: 'linear-gradient(180deg, #0d2b0d 0%, #1a3a1a 50%, #0f1a0f 100%)',
    particles: ['🌸', '🌸', '🌿', '🌸'],
    ground: '#2d4a1e',
    sky: '#1a3a2e',
    label: 'Spring',
  },
  summer: {
    bg: 'linear-gradient(180deg, #0a1f2e 0%, #0d3040 50%, #1a2e1a 100%)',
    particles: ['🌟', '☀️', '🌿', '🌊'],
    ground: '#1e3a1a',
    sky: '#0a2040',
    label: 'Summer',
  },
  autumn: {
    bg: 'linear-gradient(180deg, #2e1a05 0%, #3d2008 50%, #1a0f05 100%)',
    particles: ['🍂', '🍁', '🍂', '🍁'],
    ground: '#3d1e08',
    sky: '#2a1005',
    label: 'Autumn',
  },
  winter: {
    bg: 'linear-gradient(180deg, #050f1e 0%, #0a1535 50%, #050a14 100%)',
    particles: ['❄️', '❄️', '⭐', '❄️'],
    ground: '#0d1a2e',
    sky: '#050f20',
    label: 'Winter',
  },
}

function SeasonalScene({ season }) {
  const scene = SEASON_SCENES[season] || SEASON_SCENES.winter
  return (
    <div className="absolute inset-0 overflow-hidden rounded-l">
      <div className="absolute inset-0" style={{ background: scene.bg }} />
      {/* Stars / sky dots */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full bg-white star"
          style={{
            left: `${10 + i * 14}%`,
            top: `${8 + (i % 3) * 12}%`,
            '--dur': `${2 + i * 0.5}s`,
            '--delay': `${i * 0.3}s`,
          }}
        />
      ))}
      {/* Ground line */}
      <div className="absolute bottom-0 left-0 right-0 h-6 rounded-bl" style={{ background: scene.ground, opacity: 0.6 }} />
      {/* Floating particles */}
      {scene.particles.map((p, i) => (
        <div
          key={i}
          className="absolute text-xs"
          style={{
            left: `${5 + i * 22}%`,
            top: `${20 + (i % 2) * 30}%`,
            animation: `float ${2.5 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            fontSize: '10px',
            opacity: 0.7,
          }}
        >
          {p}
        </div>
      ))}
    </div>
  )
}

function CharacterCard({ character, season }) {
  const tier = getTier(character.level)
  const xpNeeded = xpForLevel(character.level)
  const multiplier = getStreakMultiplier(character.streak)

  return (
    <div className="rpg-panel overflow-hidden">
      <div className="flex gap-0 items-stretch">
        {/* Left — seasonal scene + character */}
        <div className="relative flex-shrink-0 w-28 flex items-end justify-center pb-2" style={{ minHeight: '140px' }}>
          <SeasonalScene season={season} />
          <div className="relative z-10">
            <PixelCharacter character={character} size={90} degradation={character.gearDegradation} />
          </div>
        </div>
        {/* Right — stats */}
        <div className="flex-1 p-4 space-y-3">
          <div>
            <div className="font-pixel text-xs text-white">{character.name}</div>
            <div className="font-pixel text-xs mt-0.5" style={{ color: tier.color, fontSize: '9px' }}>
              {tier.name} • Lv.{character.level}
            </div>
          </div>
          <StatBar value={character.hp} max={character.maxHp} color="#ef4444" label="HP" />
          <StatBar value={character.xp} max={xpNeeded} color="#10b981" label="XP" />
          <div className="flex gap-3 flex-wrap text-xs">
            <span className="text-amber-400">💰 {character.gold || 0}</span>
            <span className="text-blue-400">⚡ {character.willpower || 0}</span>
            {character.streak > 0 && <span className="fire-streak">🔥 {character.streak}d</span>}
          </div>
          {multiplier > 1 && (
            <div className="text-xs text-amber-400 font-pixel" style={{ fontSize: '9px' }}>×{multiplier} XP BONUS</div>
          )}
        </div>
      </div>
    </div>
  )
}

function DailyQuote({ characterClass }) {
  const quote = getDailyQuote(characterClass)
  return (
    <div className="rpg-panel p-4 border-l-2 border-violet-600">
      <div className="text-xs text-slate-400 italic leading-relaxed mb-2">"{quote.text}"</div>
      <div className="text-xs text-violet-400 font-pixel" style={{ fontSize: '9px' }}>— {quote.author}</div>
    </div>
  )
}

function QuestList({ habits }) {
  const store = useStore()
  const today = new Date().toISOString().split('T')[0]
  const dailyHabits = habits.filter(h => h.frequency === 'daily')
  const [xpPop, setXpPop] = useState(null)

  const completeHabit = (habitId) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return
    store.completeHabit(habitId)
    if (habit.type === 'positive') {
      store.gainXP(15, 'habit')
      setXpPop({ id: Date.now(), text: '+15 XP' })
      setTimeout(() => setXpPop(null), 1500)
    } else {
      const count = (habit.completions?.[today] || 0) + 1
      const penalty = count === 1 ? 10 : count === 2 ? 25 : 50
      store.loseXP(penalty, 'negative_habit')
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
      {dailyHabits.length === 0 ? (
        <div className="text-xs text-slate-500">No habits yet. Add some in the Habits tab!</div>
      ) : (
        <div className="space-y-2">
          {dailyHabits.map(h => {
            const done = h.completions?.[today]
            const isNeg = h.type === 'negative'
            return (
              <div
                key={h.id}
                className={`flex items-center gap-3 p-2 rounded border transition-all ${done ? 'border-green-800 bg-green-950 opacity-70' : isNeg ? 'border-red-800 bg-red-950' : 'border-slate-700 hover:border-violet-600'}`}
              >
                <button
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs flex-shrink-0 transition-all ${done ? 'bg-green-600 border-green-500' : isNeg ? 'bg-red-900 border-red-600' : 'border-slate-600 hover:border-violet-500'}`}
                  onClick={() => !done && completeHabit(h.id)}
                  disabled={!!done}
                >
                  {done ? '✓' : isNeg ? '✗' : '◎'}
                </button>
                <span className="text-xs flex-1 text-slate-200">{h.name}</span>
                {h.streak > 0 && <span className="text-xs fire-streak">🔥{h.streak}</span>}
                {done && <span className="text-xs text-green-400">+15 XP</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TOAST_CONFIG = {
  levelup:   { icon: '⭐', label: 'LEVEL UP!',  border: 'border-amber-600',  btn: 'rpg-btn-gold' },
  milestone: { icon: '⚔️', label: 'MILESTONE!', border: 'border-violet-600', btn: 'rpg-btn-primary' },
  badge:     { icon: '🏆', label: 'BADGE EARNED!', border: 'border-emerald-600', btn: 'rpg-btn-secondary' },
}

function NotificationToast({ notifications, onDismiss }) {
  if (!notifications?.length) return null
  const n = notifications[0]
  const cfg = TOAST_CONFIG[n.type] || TOAST_CONFIG.levelup
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-80 px-4">
      <div className={`rpg-panel p-4 border ${cfg.border} text-center`}>
        <div className="text-2xl mb-1">{cfg.icon}</div>
        <div className="font-pixel text-xs text-amber-400 mb-2">{cfg.label}</div>
        <div className="text-xs text-slate-300 leading-relaxed">{n.message}</div>
        <button className={`${cfg.btn} mt-3 text-xs`} onClick={() => onDismiss(n.id)}>Got it!</button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { character, habits, notifications, clearNotification, openaiKey, updateStreak, checkMilestones, nutrition } = useStore()
  const [coachMsg, setCoachMsg] = useState('')
  const season = getSeason()

  useEffect(() => {
    updateStreak()
    checkMilestones()
  }, [])

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

  return (
    <div className="space-y-4 pb-6">
      <NotificationToast notifications={notifications} onDismiss={clearNotification} />

      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">DASHBOARD</h1>
        <SeasonBadge season={season} />
      </div>

      <CharacterCard character={character} season={season} />

      {coachMsg && (
        <div className="rpg-panel p-4 border-l-2 border-blue-600">
          <div className="font-pixel text-xs text-blue-400 mb-2" style={{ fontSize: '9px' }}>AI COACH</div>
          <div className="text-xs text-slate-300 leading-relaxed">{coachMsg}</div>
        </div>
      )}

      <QuestList habits={habits} />
      <DailyQuote characterClass={character.class} />
    </div>
  )
}
