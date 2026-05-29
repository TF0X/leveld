import React, { useState, useEffect, useRef } from 'react'
import useStore from '../../store/useStore'
import { getCravingMessage } from '../../utils/ai'

function UrgeSurfTimer({ onComplete, onCancel }) {
  const [seconds, setSeconds] = useState(600)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(intervalRef.current); onComplete(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  const pct = ((600 - seconds) / 600) * 100

  return (
    <div className="rpg-panel p-6 text-center border border-violet-700">
      <div className="font-pixel text-xs text-violet-400 mb-4">URGE SURFING</div>
      <div className="font-pixel text-3xl text-white mb-2">{min}:{sec.toString().padStart(2, '0')}</div>
      <div className="text-xs text-slate-400 mb-4">Ride the wave. The urge will pass.</div>
      <div className="stat-bar mb-6">
        <div className="stat-bar-fill bg-violet-500" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />
      </div>
      <div className="text-xs text-slate-500 italic mb-6">
        "The impediment to action advances action. What stands in the way becomes the way." — Marcus Aurelius
      </div>
      <button className="rpg-btn-danger text-xs" onClick={onCancel}>Give In ✗</button>
    </div>
  )
}

function CravingHeatmap({ cravings }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const counts = {}
  cravings.forEach(c => {
    const h = new Date(c.date).getHours()
    counts[h] = (counts[h] || 0) + 1
  })
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="rpg-panel p-4">
      <div className="font-pixel text-xs text-slate-400 mb-3">CRAVING PATTERNS BY HOUR</div>
      <div className="flex gap-0.5 items-end h-12">
        {hours.map(h => {
          const cnt = counts[h] || 0
          const pct = (cnt / max) * 100
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${Math.max(2, pct * 0.4)}px`, background: pct > 0 ? '#7c3aed' : '#1a1a2e' }}
                title={`${h}:00 — ${cnt} cravings`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
      </div>
    </div>
  )
}

const PRESET_TYPES = ['Food', 'Alcohol', 'Smoking', 'Phone / social media', 'Sugar', 'Caffeine', 'Gambling', 'Other (custom)']

export default function Cravings() {
  const { cravings, logCraving, gainXP, loseXP, addWillpower, character, openaiKey } = useStore()
  const [phase, setPhase] = useState('idle') // idle | logging | timer | result
  const [form, setForm] = useState({ typePreset: 'Food', customType: '', intensity: 5 })
  const [aiMsg, setAiMsg] = useState('')
  const [lastCraving, setLastCraving] = useState(null)

  const isCustom = form.typePreset === 'Other (custom)'
  const resolvedType = isCustom ? (form.customType.trim() || 'Custom') : form.typePreset

  const startLog = () => setPhase('logging')

  const startTimer = () => {
    setLastCraving({ type: resolvedType, intensity: form.intensity, resisted: true })
    setPhase('timer')
  }

  const handleResisted = async () => {
    const craving = { type: resolvedType, intensity: form.intensity, resisted: true }
    logCraving(craving)
    gainXP(25, 'craving')
    addWillpower()
    setPhase('result')
    setLastCraving(craving)
    if (openaiKey) {
      getCravingMessage(openaiKey, { character, craving, streak: character.streak })
        .then(msg => setAiMsg(msg))
        .catch(() => {})
    }
  }

  const handleGaveIn = async () => {
    const penalty = Math.floor(form.intensity * 5)
    const craving = { type: resolvedType, intensity: form.intensity, resisted: false }
    logCraving(craving)
    loseXP(penalty, 'craving')
    setPhase('result')
    setLastCraving(craving)
    if (openaiKey) {
      getCravingMessage(openaiKey, { character, craving, streak: character.streak })
        .then(msg => setAiMsg(msg))
        .catch(() => {})
    }
  }

  const recentCravings = [...cravings].reverse().slice(0, 10)

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">CRAVINGS</h1>
        <div className="text-xs text-slate-400">
          Resisted: <span className="text-green-400">{cravings.filter(c => c.resisted).length}</span>
          <span className="text-slate-600"> / {cravings.length}</span>
        </div>
      </div>

      {phase === 'idle' && (
        <button className="rpg-btn-primary w-full" onClick={startLog}>+ Log Craving</button>
      )}

      {phase === 'logging' && (
        <div className="rpg-panel p-6 border border-violet-700 space-y-4">
          <div className="font-pixel text-xs text-violet-400">LOG CRAVING</div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TYPES.map(t => (
                <button
                  key={t}
                  className={`p-2 text-xs rounded border text-left transition-all ${form.typePreset === t ? 'border-violet-500 bg-violet-900 text-white' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'}`}
                  onClick={() => setForm(f => ({ ...f, typePreset: t }))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {isCustom && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Custom craving name</label>
              <input
                type="text"
                placeholder="e.g. Binge watching, Shopping..."
                value={form.customType}
                onChange={e => setForm(f => ({ ...f, customType: e.target.value }))}
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Intensity: <span className="text-violet-400">{form.intensity}/10</span>
            </label>
            <input
              type="range" min="1" max="10" value={form.intensity}
              onChange={e => setForm(f => ({ ...f, intensity: parseInt(e.target.value) }))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>Mild</span><span>Moderate</span><span>Intense</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="rpg-btn-secondary flex-1" onClick={() => setPhase('idle')}>Cancel</button>
            <button className="rpg-btn-gold flex-1" onClick={startTimer}>⏱ Surf the Urge</button>
          </div>
          <button className="rpg-btn-danger w-full text-xs" onClick={handleGaveIn}>I gave in...</button>
        </div>
      )}

      {phase === 'timer' && (
        <UrgeSurfTimer onComplete={handleResisted} onCancel={handleGaveIn} />
      )}

      {phase === 'result' && lastCraving && (
        <div className={`rpg-panel p-6 text-center border ${lastCraving.resisted ? 'border-green-600' : 'border-red-700'}`}>
          <div className="text-3xl mb-2">{lastCraving.resisted ? '⚡' : '💔'}</div>
          <div className="font-pixel text-xs mb-1" style={{ color: lastCraving.resisted ? '#10b981' : '#ef4444' }}>
            {lastCraving.resisted ? 'CRAVING RESISTED!' : 'GAVE IN'}
          </div>
          <div className="text-xs text-slate-500 mb-3">{lastCraving.type} • {lastCraving.intensity}/10</div>
          {lastCraving.resisted && <div className="text-xs text-amber-400 mb-3">+25 XP +1 Willpower</div>}
          {!lastCraving.resisted && <div className="text-xs text-red-400 mb-3">-{Math.floor(lastCraving.intensity * 5)} XP • Gear degraded</div>}
          {aiMsg && <div className="text-xs text-slate-300 italic leading-relaxed mb-4 border-l-2 border-violet-600 pl-3 text-left">{aiMsg}</div>}
          <button className="rpg-btn-secondary" onClick={() => { setPhase('idle'); setAiMsg(''); setForm({ typePreset: 'Food', customType: '', intensity: 5 }) }}>Continue</button>
        </div>
      )}

      {cravings.length > 0 && <CravingHeatmap cravings={cravings} />}

      {recentCravings.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">RECENT</div>
          <div className="space-y-2">
            {recentCravings.map(c => (
              <div key={c.id} className="flex items-center gap-3 text-xs">
                <span>{c.resisted ? '✅' : '❌'}</span>
                <span className="text-slate-300 flex-1">{c.type}</span>
                <span className="text-slate-500">Int: {c.intensity}/10</span>
                <span className={c.resisted ? 'text-green-400' : 'text-red-400'}>
                  {c.resisted ? '+25' : `-${Math.floor(c.intensity * 5)}`} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
