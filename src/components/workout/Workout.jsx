import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const EXERCISES = [
  'Push-ups', 'Pull-ups', 'Squats', 'Deadlift', 'Bench Press',
  'Overhead Press', 'Barbell Row', 'Plank', 'Lunges', 'Running',
  'Cycling', 'Swimming', 'Jump Rope', 'Dips', 'Curls',
]

function SetRow({ set, index, onUpdate, onRemove }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-4">{index + 1}.</span>
      <input
        type="number"
        className="w-14"
        placeholder="Reps"
        value={set.reps}
        onChange={e => onUpdate({ ...set, reps: +e.target.value })}
      />
      <span className="text-slate-500">×</span>
      <input
        type="number"
        className="w-16"
        placeholder="Weight"
        value={set.weight}
        onChange={e => onUpdate({ ...set, weight: +e.target.value })}
      />
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
          <SetRow
            key={i}
            set={s}
            index={i}
            onUpdate={updated => onUpdateSet(i, updated)}
            onRemove={() => onRemoveSet(i)}
          />
        ))}
      </div>
      <button className="rpg-btn-secondary w-full text-xs" onClick={onAddSet}>+ Add Set</button>
    </div>
  )
}

export default function Workout() {
  const { workoutLogs, logWorkout, gainXP } = useStore()
  const [active, setActive] = useState(false)
  const [exercises, setExercises] = useState([])
  const [duration, setDuration] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const todayLogs = workoutLogs.filter(l => l.date.startsWith(today))

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const logs = workoutLogs.filter(l => l.date.startsWith(dateStr))
    return {
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      volume: logs.reduce((acc, l) => acc + (l.volume || 0), 0),
    }
  })

  const addExercise = () => {
    if (!selectedExercise) return
    setExercises(prev => [...prev, { name: selectedExercise, sets: [{ reps: 0, weight: 0 }] }])
    setSelectedExercise('')
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
        {!active && <button className="rpg-btn-primary text-xs px-3 py-2" onClick={() => setActive(true)}>+ Start</button>}
      </div>

      {last7.some(d => d.volume > 0) && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">WEEKLY VOLUME</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={last7}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', fontSize: '11px' }} />
              <Bar dataKey="volume" fill="#7c3aed" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {active && (
        <div className="space-y-4">
          <div className="rpg-panel p-4">
            <div className="font-pixel text-xs text-violet-400 mb-3">ACTIVE WORKOUT</div>
            <div className="flex gap-2 mb-4">
              <select
                value={selectedExercise}
                onChange={e => setSelectedExercise(e.target.value)}
                className="flex-1"
              >
                <option value="">Select exercise...</option>
                {EXERCISES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <button className="rpg-btn-secondary px-3" onClick={addExercise}>+</button>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Duration (min)</label>
              <input type="number" placeholder="45" value={duration} onChange={e => setDuration(e.target.value)} />
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

      {todayLogs.length > 0 && !active && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-green-400 mb-3">✓ TODAY'S WORKOUT</div>
          {todayLogs.map(l => (
            <div key={l.id} className="text-xs text-slate-300">
              {l.exercises?.length || 0} exercises • {l.duration} min • {l.volume}kg volume
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
