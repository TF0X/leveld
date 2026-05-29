import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { getNegativeHabitMessage } from '../../utils/ai'

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
            <span className="text-xs font-pixel text-slate-500" style={{ fontSize: '9px' }}>
              {habit.frequency.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-slate-200 mb-2">{habit.name}</div>
          <div className="flex items-center gap-3 text-xs">
            {habit.streak > 0 && <span className="fire-streak">🔥 {habit.streak}d streak</span>}
            {isNeg && count > 0 && <span className="text-red-400">Logged {count}× today</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {isNeg ? (
            <button
              className="rpg-btn-danger text-xs px-3 py-2"
              onClick={() => onComplete(habit)}
            >
              Log
            </button>
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

function AddHabitModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', type: 'positive', frequency: 'daily' })
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="rpg-panel p-6 w-full max-w-sm border border-violet-700">
        <div className="font-pixel text-xs text-violet-400 mb-4">NEW HABIT</div>
        <div className="space-y-3">
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
            <label className="text-xs text-slate-400 block mb-1">Frequency</label>
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="rpg-btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="rpg-btn-primary flex-1" onClick={() => { if (form.name) { onAdd(form); onClose() } }}>Add Habit</button>
        </div>
      </div>
    </div>
  )
}

export default function Habits() {
  const { habits, addHabit, completeHabit, skipHabit, deleteHabit, gainXP, loseXP, openaiKey, character } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const [filter, setFilter] = useState('all')

  const today = new Date().toISOString().split('T')[0]

  const handleComplete = async (habit) => {
    completeHabit(habit.id)
    if (habit.type === 'positive') {
      gainXP(15, habit.frequency === 'daily' ? 'habit' : 'habit_streak')
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

  const displayed = habits.filter(h => {
    if (filter === 'positive') return h.type === 'positive'
    if (filter === 'negative') return h.type === 'negative'
    return true
  })

  const todayDone = habits.filter(h => h.type === 'positive' && h.completions?.[today]).length
  const todayTotal = habits.filter(h => h.type === 'positive').length

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">HABITS</h1>
        <button className="rpg-btn-primary text-xs px-3 py-2" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>

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
