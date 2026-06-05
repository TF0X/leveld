import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { getNegativeHabitMessage } from '../../utils/ai'
import { GUT_HEALTH_HABITS } from '../../data/habits'
import { SUPER_SEEDS } from '../../data/foods'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function DayChips({ days }) {
  if (!days?.length) return <span className="text-xs text-slate-600">Every day</span>
  return (
    <div className="flex gap-0.5">
      {DAY_LABELS.map((d, i) => (
        <span key={i} className={`text-xs px-1 rounded ${days.includes(i) ? 'text-violet-300 bg-violet-900' : 'text-slate-700'}`}
          style={{ fontSize: '9px' }}>{d}</span>
      ))}
    </div>
  )
}

function HabitCard({ habit, onComplete, onSkip, onDelete }) {
  const today = new Date().toISOString().split('T')[0]
  const done = habit.completions?.[today]
  const skipped = habit.skips?.[today]
  const isNeg = habit.type === 'negative'
  const count = habit.completions?.[today] || 0

  return (
    <div className={`rpg-panel p-4 border ${done && !isNeg ? 'border-green-800 opacity-80' : isNeg ? 'border-red-800' : 'border-slate-700'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-pixel ${isNeg ? 'text-red-400' : 'text-violet-400'}`} style={{ fontSize: '9px' }}>
              {isNeg ? '⚠ NEG' : '✦ POS'}
            </span>
          </div>
          <div className="text-sm text-slate-200 mb-2">{habit.name}</div>
          <div className="flex items-center gap-3 text-xs mb-1">
            {habit.streak > 0 && <span className="fire-streak">🔥 {habit.streak}d streak</span>}
            {isNeg && count > 0 && <span className="text-red-400">Logged {count}× today</span>}
          </div>
          <DayChips days={habit.days} />
        </div>
        <div className="flex flex-col gap-2">
          {isNeg ? (
            <button className="rpg-btn-danger text-xs px-3 py-2" onClick={() => onComplete(habit)}>Log</button>
          ) : (
            <>
              {!done && !skipped && (
                <>
                  <button className="rpg-btn-primary text-xs px-3 py-2" onClick={() => onComplete(habit)}>Done</button>
                  <button className="rpg-btn-secondary text-xs px-3 py-2" onClick={() => onSkip(habit.id)}>Skip</button>
                </>
              )}
              {done && <span className="text-xs text-green-400">✓ Done</span>}
              {skipped && <span className="text-xs text-slate-500">Skipped</span>}
            </>
          )}
          <button className="text-xs text-slate-600 hover:text-red-400" onClick={() => onDelete(habit.id)}>✕</button>
        </div>
      </div>
    </div>
  )
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function AddHabitModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', type: 'positive', days: [] })

  const toggleDay = (d) => setForm(f => ({
    ...f,
    days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
  }))

  const handleAdd = () => {
    if (!form.name) return
    onAdd({ ...form, frequency: 'daily' })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="rpg-panel p-6 w-full max-w-sm border border-violet-700">
        <div className="font-pixel text-xs text-violet-400 mb-4">NEW HABIT</div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Habit name" />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="positive">Positive (Builds you up)</option>
              <option value="negative">Negative (Track bad habits)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-2">Active Days</label>
            <div className="grid grid-cols-7 gap-1">
              {ALL_DAYS.map(d => {
                const on = form.days.includes(d) || form.days.length === 0
                const selected = form.days.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    className={`py-2 rounded border text-xs transition-all font-pixel ${selected ? 'border-violet-500 bg-violet-900 text-white' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                    style={{ fontSize: '9px' }}
                    onClick={() => toggleDay(d)}
                  >
                    {DAY_LABELS[d]}
                  </button>
                )
              })}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {form.days.length === 0 ? 'No days selected = every day' : `Active: ${form.days.map(d => DAY_LABELS[d]).join(', ')}`}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="rpg-btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="rpg-btn-primary flex-1" onClick={handleAdd}>Add Habit</button>
        </div>
      </div>
    </div>
  )
}

function SuperSeedsTracker() {
  const { gut, logSuperSeed, gainXP } = useStore()

  // Reset if new week
  const ws = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })()
  const sedsThisWeek = gut.superSeedsWeekStart === ws ? (gut.superSeedsThisWeek || []) : []
  const score = gut.score || 0

  const handleSeed = (seedId) => {
    logSuperSeed(seedId)
    gainXP(5, 'gut')
  }

  return (
    <div className="rpg-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-pixel text-xs text-emerald-400">🌱 SUPER SEEDS PROTOCOL</div>
        <div className="text-xs text-slate-500">Gut Score: <span className="text-emerald-400">{score}</span></div>
      </div>
      <div className="text-xs text-slate-500 mb-3">
        Log all 7 seeds in a week → Gut Health Badge + rare cosmetic. Each seed = +5 XP.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SUPER_SEEDS.map(seed => {
          const done = sedsThisWeek.includes(seed.id)
          return (
            <button
              key={seed.id}
              className={`p-3 rounded border text-left transition-all ${done ? 'border-emerald-700 bg-emerald-950 opacity-70' : 'border-slate-700 hover:border-emerald-700'}`}
              onClick={() => !done && handleSeed(seed.id)}
              disabled={done}
            >
              <div className="text-base mb-1">{seed.emoji} {done ? '✓' : ''}</div>
              <div className="text-xs text-slate-200">{seed.name}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-tight">{seed.benefit.split('—')[0]}</div>
            </button>
          )
        })}
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Weekly progress</span>
          <span className="text-emerald-400">{sedsThisWeek.length} / 7</span>
        </div>
        <div className="stat-bar">
          <div className="stat-bar-fill bg-emerald-500" style={{ width: `${(sedsThisWeek.length / 7) * 100}%` }} />
        </div>
      </div>
      {sedsThisWeek.length >= 7 && (
        <div className="text-xs text-emerald-400 text-center mt-3 font-pixel" style={{ fontSize: '9px' }}>
          ✓ FULL PROTOCOL COMPLETE — GUT MICROBIOME STRENGTHENED
        </div>
      )}
    </div>
  )
}

function GutHabitsSection({ onAdd }) {
  return (
    <div className="rpg-panel p-4">
      <div className="font-pixel text-xs text-emerald-400 mb-3">💊 GUT HEALTH HABITS</div>
      <div className="text-xs text-slate-500 mb-3">From The Gut Restore Method. Add any to your habit list.</div>
      <div className="space-y-2">
        {GUT_HEALTH_HABITS.map((h, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded border border-slate-700">
            <span className="text-base">{h.icon}</span>
            <span className="text-xs text-slate-300 flex-1">{h.name}</span>
            <button
              className="text-xs px-2 py-1 rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-900"
              onClick={() => onAdd(h)}
            >
              + Add
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Habits() {
  const { habits, addHabit, completeHabit, skipHabit, deleteHabit, gainXP, loseXP, openaiKey, character } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showGut, setShowGut] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const [filter, setFilter] = useState('all')

  const today = new Date().toISOString().split('T')[0]

  const handleComplete = async (habit) => {
    completeHabit(habit.id)
    if (habit.type === 'positive') {
      gainXP(15, 'habit')
    } else {
      const count = (habit.completions?.[today] || 0) + 1
      const penalty = count === 1 ? 10 : count === 2 ? 25 : 50
      loseXP(penalty, 'negative_habit')
      if (openaiKey) {
        getNegativeHabitMessage(openaiKey, { character, habit, count })
          .then(msg => { setAiMsg(msg); setTimeout(() => setAiMsg(''), 8000) })
          .catch(() => {})
      }
    }
  }

  const handleSkip = (id) => {
    const reason = prompt('Why are you skipping? (optional)') || ''
    skipHabit(id, reason)
  }

  const todayDay = new Date().getDay()
  const isScheduledToday = (h) => !h.days?.length || h.days.includes(todayDay)

  const displayed = habits.filter(h => {
    if (filter === 'positive') return h.type === 'positive'
    if (filter === 'negative') return h.type === 'negative'
    return true
  })

  const todayHabits = habits.filter(h => h.type === 'positive' && isScheduledToday(h))
  const todayDone = todayHabits.filter(h => h.completions?.[today]).length
  const todayTotal = todayHabits.length

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">HABITS</h1>
        <div className="flex gap-2">
          <button
            className={`text-xs px-3 py-2 rounded border transition-all ${showGut ? 'border-emerald-500 bg-emerald-900 text-emerald-300' : 'border-slate-700 text-slate-400'}`}
            onClick={() => setShowGut(v => !v)}
          >
            🌱 Gut
          </button>
          <button className="rpg-btn-primary text-xs px-3 py-2" onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </div>

      {showGut && (
        <>
          <SuperSeedsTracker />
          <GutHabitsSection onAdd={(h) => { addHabit(h); setShowGut(false) }} />
        </>
      )}

      {todayTotal > 0 && (
        <div className="rpg-panel p-3">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Today's Progress</span>
            <span className="text-green-400">{todayDone} / {todayTotal}</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill bg-green-500" style={{ width: `${todayTotal ? (todayDone / todayTotal) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {aiMsg && (
        <div className="rpg-panel p-4 border border-amber-600">
          <div className="font-pixel text-xs text-amber-400 mb-2" style={{ fontSize: '9px' }}>AI MESSAGE</div>
          <div className="text-xs text-slate-300 leading-relaxed">{aiMsg}</div>
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'positive', 'negative'].map(f => (
          <button
            key={f}
            className={`text-xs px-3 py-1 rounded border ${filter === f ? 'border-violet-500 bg-violet-900 text-white' : 'border-slate-700 text-slate-400'}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No habits yet. Add your first one!</div>
      ) : (
        <div className="space-y-3">
          {displayed.map(h => (
            <HabitCard
              key={h.id}
              habit={h}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onDelete={deleteHabit}
            />
          ))}
        </div>
      )}

      {showAdd && <AddHabitModal onClose={() => setShowAdd(false)} onAdd={addHabit} />}
    </div>
  )
}
