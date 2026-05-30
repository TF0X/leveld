import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { PROGRESSION_RULES, getTodayWorkout } from '../../data/workoutTemplates'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'

const EXERCISES = [
  'Push-ups', 'Pull-ups', 'Squats', 'Deadlift', 'Bench Press',
  'Overhead Press', 'Barbell Row', 'Plank', 'Lunges', 'Running',
  'Cycling', 'Swimming', 'Jump Rope', 'Dips', 'Curls',
]

const TOOLTIP_STYLE = { background: '#1a1a2e', border: '1px solid #2a2a4a', fontSize: '11px', color: '#e2e8f0' }

function SetRow({ set, index, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-4">{index + 1}.</span>
      <input type="number" className="w-14" placeholder="Reps" value={set.reps}
        onChange={e => onUpdate({ ...set, reps: +e.target.value })} />
      <span className="text-slate-500">×</span>
      <input type="number" className="w-16" placeholder="kg" value={set.weight}
        onChange={e => onUpdate({ ...set, weight: +e.target.value })} />
      <span className="text-slate-500">kg</span>
      <button className="text-slate-600 hover:text-red-400 ml-auto" onClick={onRemove}>✕</button>
    </div>
  )
}

function ExerciseBlock({ exercise, sets, onAddSet, onUpdateSet, onRemoveSet }) {
  const volume = sets.reduce((acc, s) => acc + (s.reps * s.weight), 0)
  return (
    <div className="rpg-panel p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="font-pixel text-xs text-violet-400" style={{ fontSize: '10px' }}>{exercise}</div>
        <span className="text-xs text-slate-500">Vol: {volume}kg</span>
      </div>
      <div className="space-y-2 mb-3">
        {sets.map((s, i) => (
          <SetRow key={i} set={s} index={i}
            onUpdate={updated => onUpdateSet(i, updated)}
            onRemove={() => onRemoveSet(i)} />
        ))}
      </div>
      <button className="rpg-btn-secondary w-full text-xs" onClick={onAddSet}>+ Add Set</button>
    </div>
  )
}

function WorkoutGraphs({ workoutLogs }) {
  const [graphTab, setGraphTab] = useState('volume')

  // Last 14 days volume
  const volumeData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const dateStr = d.toISOString().split('T')[0]
    const logs = workoutLogs.filter(l => l.date.startsWith(dateStr))
    return {
      day: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
      volume: logs.reduce((acc, l) => acc + (l.volume || 0), 0),
    }
  })

  // Duration per session (last 10)
  const durationData = [...workoutLogs].reverse().slice(0, 10).reverse().map((l, i) => ({
    session: `S${i + 1}`,
    duration: l.duration || 0,
    volume: l.volume || 0,
  }))

  // Exercise frequency (all time)
  const exFreq = {}
  workoutLogs.forEach(l => {
    (l.exercises || []).forEach(ex => {
      exFreq[ex.name] = (exFreq[ex.name] || 0) + 1
    })
  })
  const freqData = Object.entries(exFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name: name.length > 10 ? name.slice(0, 10) + '…' : name, count }))

  // Total stats
  const totalSessions = workoutLogs.length
  const totalVolume = workoutLogs.reduce((acc, l) => acc + (l.volume || 0), 0)
  const totalDuration = workoutLogs.reduce((acc, l) => acc + (l.duration || 0), 0)
  const avgVolume = totalSessions ? Math.round(totalVolume / totalSessions) : 0

  const TABS = [
    { id: 'volume', label: '📈 Volume' },
    { id: 'duration', label: '⏱ Duration' },
    { id: 'frequency', label: '🏋️ Exercises' },
  ]

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Total Sessions', value: totalSessions, color: '#7c3aed' },
          { label: 'Total Volume', value: `${totalVolume}kg`, color: '#10b981' },
          { label: 'Avg Vol/Session', value: `${avgVolume}kg`, color: '#f59e0b' },
          { label: 'Total Duration', value: `${totalDuration}m`, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="rpg-panel p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`flex-1 text-xs py-2 px-1 rounded border transition-all ${graphTab === t.id ? 'border-violet-500 bg-violet-900 text-white' : 'border-slate-700 text-slate-500'}`}
            onClick={() => setGraphTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {graphTab === 'volume' && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">VOLUME — LAST 14 DAYS (kg)</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={volumeData}>
              <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#64748b' }} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}kg`, 'Volume']} />
              <Bar dataKey="volume" fill="#7c3aed" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {graphTab === 'duration' && durationData.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">DURATION PER SESSION (min)</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={durationData}>
              <XAxis dataKey="session" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} min`, 'Duration']} />
              <Line type="monotone" dataKey="duration" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="font-pixel text-xs text-slate-400 mt-4 mb-3">VOLUME PER SESSION (kg)</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={durationData}>
              <XAxis dataKey="session" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}kg`, 'Volume']} />
              <Line type="monotone" dataKey="volume" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {graphTab === 'frequency' && freqData.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">MOST TRAINED EXERCISES</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={freqData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={72} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v, 'Sessions']} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {graphTab === 'frequency' && freqData.length === 0 && (
        <div className="text-xs text-slate-500 text-center py-4">Log some workouts to see exercise breakdown.</div>
      )}
    </div>
  )
}

function WorkoutProgramCard({ program }) {
  const [expanded, setExpanded] = useState(false)
  if (!program) return null
  return (
    <div className="rpg-panel p-4 border border-violet-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-xs text-violet-400 mb-1" style={{ fontSize: '10px' }}>YOUR PROGRAM</div>
          <div className="text-sm text-slate-200">{program.name}</div>
          <div className="text-xs text-slate-500">{program.level} • {program.daysPerWeek} days/week • {program.equipment}</div>
        </div>
        <button className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setExpanded(v => !v)}>
          {expanded ? '▲ Hide' : '▼ View'}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 space-y-4">
          {program.days.map((day, i) => (
            <div key={i} className="border-t border-slate-800 pt-3">
              <div className="font-pixel text-xs text-amber-400 mb-2" style={{ fontSize: '9px' }}>{day.label}</div>
              {day.exercises.length === 0 ? (
                <div className="text-xs text-slate-600">Rest / Mobility</div>
              ) : (
                <div className="space-y-1">
                  {day.exercises.map((ex, j) => (
                    <div key={j} className="flex justify-between text-xs">
                      <span className="text-slate-300">{ex.name}</span>
                      <span className="text-slate-500">{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {program.cardioNote && (
            <div className="bg-rpg-bg rounded p-3 text-xs text-amber-400 border-l-2 border-amber-700">
              🏃 {program.cardioNote}
            </div>
          )}
          <div className="border-t border-slate-800 pt-3">
            <div className="font-pixel text-xs text-slate-500 mb-2" style={{ fontSize: '9px' }}>PROGRESSION RULES</div>
            {PROGRESSION_RULES.map((r, i) => <div key={i} className="text-xs text-slate-500">• {r}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}

function TodaySessionBanner({ program, onStartSession }) {
  const result = getTodayWorkout(program)
  if (!result) return null

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const todayName = DAY_NAMES[new Date().getDay()]

  if (!result.isTrainingDay) {
    return (
      <div className="rpg-panel p-4 border border-slate-700">
        <div className="font-pixel text-xs text-slate-500 mb-1" style={{ fontSize: '9px' }}>TODAY — {todayName.toUpperCase()}</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Rest Day</div>
            <div className="text-xs text-slate-600">Next: {result.nextTrainingDay}</div>
          </div>
          <span className="text-2xl">🛌</span>
        </div>
        {program?.cardioNote && (
          <div className="text-xs text-amber-600 mt-2 border-t border-slate-800 pt-2">🏃 {program.cardioNote}</div>
        )}
      </div>
    )
  }

  const { dayData, cardioNote } = result

  return (
    <div className="rpg-panel p-4 border border-violet-700">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-pixel text-xs text-violet-400 mb-1" style={{ fontSize: '9px' }}>TODAY — {todayName.toUpperCase()}</div>
          <div className="text-sm text-slate-200">{dayData.label}</div>
          <div className="text-xs text-slate-500">{dayData.exercises.length} exercises</div>
        </div>
        <button className="rpg-btn-primary text-xs px-3 py-2" onClick={() => onStartSession(dayData)}>
          Start ▶
        </button>
      </div>
      <div className="space-y-1">
        {dayData.exercises.map((ex, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-slate-300">{ex.name}</span>
            <span className="text-slate-600">{ex.sets}×{ex.reps}</span>
          </div>
        ))}
      </div>
      {cardioNote && (
        <div className="text-xs text-amber-600 mt-3 border-t border-slate-800 pt-2">🏃 {cardioNote}</div>
      )}
    </div>
  )
}

export default function Workout() {
  const { workoutLogs, logWorkout, gainXP, nutrition } = useStore()
  const program = nutrition?.workoutProgramData || null
  const [active, setActive] = useState(false)
  const [exercises, setExercises] = useState([])
  const [duration, setDuration] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [customExercise, setCustomExercise] = useState('')
  const [showGraphs, setShowGraphs] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const todayLogs = workoutLogs.filter(l => l.date.startsWith(today))

  // Pre-populate exercises from the recommended day plan
  const startFromPlan = (dayData) => {
    const preloaded = dayData.exercises.map(ex => ({
      name: ex.name,
      sets: Array.from({ length: ex.sets }, () => ({ reps: 0, weight: 0 })),
    }))
    setExercises(preloaded)
    setActive(true)
  }

  const addExercise = (name) => {
    if (!name) return
    setExercises(prev => [...prev, { name, sets: [{ reps: 0, weight: 0 }] }])
    setSelectedExercise('')
    setCustomExercise('')
  }

  const updateSets = (exIndex, setIndex, updated) => {
    setExercises(prev => prev.map((ex, ei) => ei !== exIndex ? ex : {
      ...ex, sets: ex.sets.map((s, si) => si !== setIndex ? s : updated)
    }))
  }

  const removeSet = (exIndex, setIndex) => {
    setExercises(prev => prev.map((ex, ei) => ei !== exIndex ? ex : {
      ...ex, sets: ex.sets.filter((_, si) => si !== setIndex)
    }))
  }

  const addSet = (exIndex) => {
    setExercises(prev => prev.map((ex, ei) => ei !== exIndex ? ex : {
      ...ex, sets: [...ex.sets, { reps: 0, weight: 0 }]
    }))
  }

  const finishWorkout = () => {
    const volume = exercises.reduce((acc, ex) => acc + ex.sets.reduce((a, s) => a + s.reps * s.weight, 0), 0)
    logWorkout({ exercises, duration: +duration, volume })
    gainXP(40, 'workout')
    setExercises([])
    setDuration('')
    setActive(false)
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">WORKOUT</h1>
        <div className="flex gap-2">
          {workoutLogs.length > 0 && (
            <button
              className={`text-xs px-3 py-1 rounded border ${showGraphs ? 'border-violet-500 bg-violet-900 text-violet-300' : 'border-slate-700 text-slate-500'}`}
              onClick={() => setShowGraphs(v => !v)}
            >
              📊 Stats
            </button>
          )}
          {!active && (
            <button className="rpg-btn-primary text-xs px-3 py-2" onClick={() => setActive(true)}>+ Start</button>
          )}
        </div>
      </div>

      {/* Today's recommended session — shown when not active and no log yet */}
      {program && !active && todayLogs.length === 0 && (
        <TodaySessionBanner program={program} onStartSession={startFromPlan} />
      )}

      {/* Full program card (collapsible) */}
      {program && <WorkoutProgramCard program={program} />}

      {/* Today's completed workout summary */}
      {todayLogs.length > 0 && !active && (
        <div className="rpg-panel p-4 border border-green-800">
          <div className="font-pixel text-xs text-green-400 mb-2">✓ TODAY'S WORKOUT</div>
          {todayLogs.map(l => (
            <div key={l.id} className="text-xs text-slate-300 space-y-1">
              <div>{l.exercises?.map(e => e.name).join(', ') || 'No exercises'}</div>
              <div className="text-slate-500">{l.duration} min • {l.volume}kg total volume</div>
            </div>
          ))}
        </div>
      )}

      {/* Active workout logger */}
      {active && (
        <div className="space-y-4">
          <div className="rpg-panel p-4">
            <div className="font-pixel text-xs text-violet-400 mb-3">ACTIVE WORKOUT</div>

            {/* Preset exercise picker */}
            <div className="flex gap-2 mb-2">
              <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} className="flex-1">
                <option value="">Select exercise...</option>
                {EXERCISES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <button className="rpg-btn-secondary px-3" onClick={() => addExercise(selectedExercise)}>+</button>
            </div>

            {/* Custom exercise input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Or type custom exercise..."
                value={customExercise}
                onChange={e => setCustomExercise(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExercise(customExercise)}
                className="flex-1"
              />
              <button className="rpg-btn-secondary px-3" onClick={() => addExercise(customExercise)}>+</button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Duration (min)</label>
              <input type="number" placeholder="e.g. 45" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
          </div>

          {exercises.map((ex, ei) => (
            <ExerciseBlock
              key={ei}
              exercise={ex.name}
              sets={ex.sets}
              onAddSet={() => addSet(ei)}
              onUpdateSet={(si, updated) => updateSets(ei, si, updated)}
              onRemoveSet={(si) => removeSet(ei, si)}
            />
          ))}

          <div className="flex gap-3">
            <button className="rpg-btn-secondary flex-1" onClick={() => setActive(false)}>Cancel</button>
            <button className="rpg-btn-gold flex-1" onClick={finishWorkout} disabled={exercises.length === 0}>
              Finish +40 XP ⚡
            </button>
          </div>
        </div>
      )}

      {/* Graphs section */}
      {showGraphs && workoutLogs.length > 0 && !active && (
        <WorkoutGraphs workoutLogs={workoutLogs} />
      )}

      {workoutLogs.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">No workouts yet. Start your first session!</div>
      )}
    </div>
  )
}
