import React, { useState } from 'react'
import useStore from '../../store/useStore'

function RoutineStep({ step, onToggle, done }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded border transition-all ${done ? 'border-green-800 bg-green-950' : 'border-slate-700 hover:border-emerald-700'}`}>
      <button
        className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 ${done ? 'bg-emerald-600 border-emerald-500' : 'border-slate-600'}`}
        onClick={onToggle}
        disabled={done}
      >
        {done ? '✓' : '○'}
      </button>
      <div className="flex-1">
        <div className="text-sm text-slate-200">{step.name}</div>
        <div className="text-xs text-slate-500">{step.duration} min</div>
      </div>
    </div>
  )
}

function RoutineSection({ type, label, steps, onComplete, onAdd }) {
  const today = new Date().toISOString().split('T')[0]
  const done = steps.filter(s => s.completions?.[today]).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0
  const allDone = steps.length > 0 && done === steps.length

  return (
    <div className="rpg-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-pixel text-xs text-amber-400">{label}</div>
          <div className="text-xs text-slate-500 mt-0.5">{done}/{steps.length} steps • {pct}% complete</div>
        </div>
        {allDone && <span className="text-xs text-green-400 font-pixel" style={{ fontSize: '9px' }}>✓ COMPLETE!</span>}
      </div>
      {steps.length > 0 && (
        <div className="stat-bar mb-4">
          <div className="stat-bar-fill bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      )}
      {steps.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-4">No steps yet.</div>
      ) : (
        <div className="space-y-2">
          {steps.map(s => (
            <RoutineStep
              key={s.id}
              step={s}
              done={!!s.completions?.[today]}
              onToggle={() => onComplete(type, s.id)}
            />
          ))}
        </div>
      )}
      <button className="rpg-btn-secondary w-full mt-3 text-xs" onClick={() => onAdd(type)}>
        + Add Step
      </button>
    </div>
  )
}

export default function Routines() {
  const { routines, setRoutine, completeRoutineStep, gainXP } = useStore()

  const handleComplete = (type, stepId) => {
    completeRoutineStep(type, stepId)
    gainXP(10, 'routine')
    // check if all done → bonus
    const today = new Date().toISOString().split('T')[0]
    const steps = routines[type] || []
    const allDone = steps.every(s => s.completions?.[today] || s.id === stepId)
    if (allDone) gainXP(20, 'routine') // bonus for full completion
  }

  const handleAdd = (type) => {
    const name = prompt(`Step name for ${type} routine:`)
    if (!name) return
    const dur = parseInt(prompt('Duration (minutes):') || '10')
    const steps = routines[type] || []
    setRoutine(type, [...steps, { id: Date.now(), name, duration: dur, completions: {} }])
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="font-pixel text-xs text-amber-400">ROUTINES</h1>
      <div className="text-xs text-slate-400">
        Complete your routines to earn bonus XP. Full completion = +30 XP.
      </div>
      <RoutineSection
        type="morning"
        label="☀️ MORNING ROUTINE"
        steps={routines.morning || []}
        onComplete={handleComplete}
        onAdd={handleAdd}
      />
      <RoutineSection
        type="night"
        label="🌙 NIGHT ROUTINE"
        steps={routines.night || []}
        onComplete={handleComplete}
        onAdd={handleAdd}
      />
    </div>
  )
}
