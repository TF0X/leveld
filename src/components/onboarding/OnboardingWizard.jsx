import React, { useState } from 'react'
import useStore, { getSeason } from '../../store/useStore'
import { testApiKey } from '../../utils/ai'
import { GOAL_HABITS, CLASS_ROUTINES } from '../../data/habits'
import { calcTargets } from '../../data/foods'
import { ALL_TEMPLATES } from '../../data/workoutTemplates'
import PixelCharacter from '../character/PixelCharacter'

const STEPS = 12

const CLASSES = [
  { id: 'Warrior', emoji: '⚔️', description: 'Discipline through action. Physical goals dominate.', philosopher: 'Marcus Aurelius', bonus: '+Bonus XP on workouts', color: 'from-red-900 to-red-800', border: 'border-red-600', accent: '#ef4444' },
  { id: 'Mage', emoji: '🔮', description: 'Discipline through knowledge. Mental and routine goals dominate.', philosopher: 'Epictetus', bonus: '+Bonus XP on routines & planning', color: 'from-violet-900 to-violet-800', border: 'border-violet-500', accent: '#7c3aed' },
  { id: 'Rogue', emoji: '🗡️', description: 'Discipline through stealth. Habit stacking and consistency.', philosopher: 'Seneca', bonus: '+Bonus XP on habit streaks', color: 'from-emerald-900 to-emerald-800', border: 'border-emerald-600', accent: '#10b981' },
]

const GOALS = ['Lose weight', 'Build muscle', 'Fix sleep', 'Quit a bad habit', 'Eat better', 'Manage stress', 'Build a morning routine', 'Stay consistent']

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little movement', days: '0 days/week' },
  { id: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week', days: '1-3 days' },
  { id: 'moderate', label: 'Moderate', desc: '3-4 training days/week', days: '3-4 days' },
  { id: 'active', label: 'Active', desc: '5-6 hard sessions/week', days: '5-6 days' },
  { id: 'very_active', label: 'Very Active', desc: 'Daily intense training', days: '7 days' },
]

function ProgressBar({ step }) {
  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-1">
        <span className="font-pixel text-xs text-rpg-muted">Step {step} of {STEPS}</span>
        <span className="font-pixel text-xs text-violet-400">{Math.round((step / STEPS) * 100)}%</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${(step / STEPS) * 100}%` }} />
      </div>
    </div>
  )
}

function Torch() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-3 h-6 relative">
        <div className="absolute inset-0 flex flex-col items-center justify-end">
          <div className="w-2 h-3 bg-orange-500 rounded-t-full torch-flame opacity-90" />
          <div className="w-1 h-2 bg-yellow-400 rounded-t-full torch-flame opacity-80" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
      <div className="w-2 h-8 bg-amber-800 rounded-sm" />
      <div className="w-4 h-1 bg-amber-900 rounded" />
    </div>
  )
}

function Stars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="absolute w-1 h-1 bg-white rounded-full star"
          style={{ left: `${(i * 17 + 7) % 100}%`, top: `${(i * 13 + 5) % 60}%`, '--dur': `${2 + (i % 3)}s`, '--delay': `${(i % 4) * 0.5}s` }} />
      ))}
    </div>
  )
}

// Step 1 — Welcome
function Step1({ onNext }) {
  const season = getSeason()
  const seasonBg = { spring: 'from-green-950 via-emerald-900 to-slate-900', summer: 'from-yellow-950 via-teal-900 to-slate-900', autumn: 'from-orange-950 via-amber-900 to-slate-900', winter: 'from-blue-950 via-slate-900 to-slate-900' }[season]
  return (
    <div className={`relative min-h-screen bg-gradient-to-b ${seasonBg} flex flex-col items-center justify-center p-6`}>
      <Stars />
      <div className="flex gap-8 mb-8"><Torch /><Torch /></div>
      <div className="text-center z-10 animate-[float_3s_ease-in-out_infinite]">
        <h1 className="font-pixel text-2xl text-amber-400 mb-2 leading-relaxed">ASCEND</h1>
        <h1 className="font-pixel text-2xl text-amber-400 mb-8 leading-relaxed">RPG</h1>
        <p className="text-slate-400 text-sm mb-2">Your journey to greatness begins here.</p>
        <p className="text-slate-500 text-xs mb-12">A gamified self-improvement tracker</p>
      </div>
      <button className="rpg-btn-primary z-10" onClick={onNext}>▶ Begin Your Journey</button>
    </div>
  )
}

// Step 2 — Identity
function Step2({ data, onChange, onNext, onBack }) {
  const timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
  const canProceed = data.realName?.trim() && data.age
  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-4">Identity</h2>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Your Name *</label>
        <input type="text" placeholder="Enter your name" value={data.realName || ''} onChange={e => onChange('realName', e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Age *</label>
        <input type="number" placeholder="Age" min="10" max="100" value={data.age || ''} onChange={e => onChange('age', e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Gender / Pronouns (optional)</label>
        <select value={data.gender || ''} onChange={e => onChange('gender', e.target.value)}>
          <option value="">Prefer not to say</option>
          <option value="he/him">He / Him</option>
          <option value="she/her">She / Her</option>
          <option value="they/them">They / Them</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-400 block mb-1">Timezone</label>
        <select value={data.timezone || ''} onChange={e => onChange('timezone', e.target.value)}>
          {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={!canProceed}>Next →</button>
      </div>
    </div>
  )
}

// Step 3 — Class Selection
function Step3({ data, onChange, onNext, onBack }) {
  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-4">Choose Your Class</h2>
      <div className="space-y-3">
        {CLASSES.map(cls => (
          <div key={cls.id} className={`rpg-panel p-4 cursor-pointer border-2 transition-all ${data.class === cls.id ? `${cls.border} bg-gradient-to-r ${cls.color}` : 'border-transparent hover:border-slate-600'}`} onClick={() => onChange('class', cls.id)}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{cls.emoji}</div>
              <div className="flex-1">
                <div className="font-pixel text-xs mb-1" style={{ color: cls.accent }}>{cls.id}</div>
                <div className="text-xs text-slate-300 mb-2">{cls.description}</div>
                <div className="text-xs text-slate-500">📖 {cls.philosopher}</div>
                <div className="text-xs text-amber-400 mt-1">⭐ {cls.bonus}</div>
              </div>
              {data.class === cls.id && <div className="font-pixel text-xs text-green-400">✓</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={!data.class}>Next →</button>
      </div>
    </div>
  )
}

// Step 4 — Goals
function Step4({ data, onChange, onNext, onBack }) {
  const goals = data.goals || []
  const toggle = (g) => onChange('goals', goals.includes(g) ? goals.filter(x => x !== g) : [...goals, g])
  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">Your Goals</h2>
      <p className="text-xs text-slate-400 mb-4">Pick all that apply</p>
      <div className="grid grid-cols-2 gap-2">
        {GOALS.map(g => (
          <button key={g} className={`p-3 text-xs rounded border-2 text-left transition-all ${goals.includes(g) ? 'border-violet-500 bg-violet-900 text-white' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'}`} onClick={() => toggle(g)}>
            {goals.includes(g) ? '✓ ' : ''}{g}
          </button>
        ))}
      </div>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={goals.length === 0}>Next →</button>
      </div>
    </div>
  )
}

// Step 5 — Hunger Type (new — from Fat Loss Fuel System)
function Step5({ data, onChange, onNext, onBack }) {
  const hasLoseWeight = (data.goals || []).includes('Lose weight')
  if (!hasLoseWeight) { onNext(); return null } // skip if not fat loss goal

  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">Hunger Profile</h2>
      <div className="rpg-panel p-4 text-xs text-slate-400 leading-relaxed border-l-2 border-amber-600">
        From the Fat Loss Fuel System: understanding your hunger response sets the right calorie deficit for you — not someone else's plan.
      </div>
      <p className="text-sm text-slate-300">How do you handle hunger?</p>
      <div className="space-y-3">
        <div
          className={`rpg-panel p-4 cursor-pointer border-2 transition-all ${data.deficitMode === 'extreme' ? 'border-green-600 bg-green-950' : 'border-transparent hover:border-slate-600'}`}
          onClick={() => onChange('deficitMode', 'extreme')}
        >
          <div className="font-pixel text-xs text-green-400 mb-1">⚡ I handle hunger easily</div>
          <div className="text-xs text-slate-300 mb-1">Extreme deficit — 1 kg/week loss target</div>
          <div className="text-xs text-slate-500">~500 kcal below maintenance. Faster results. Requires discipline.</div>
          <div className="text-xs text-amber-400 mt-2">Milestone: Diet Break unlocked after 14 days + 2 kg lost</div>
        </div>
        <div
          className={`rpg-panel p-4 cursor-pointer border-2 transition-all ${data.deficitMode === 'easy' ? 'border-blue-600 bg-blue-950' : 'border-transparent hover:border-slate-600'}`}
          onClick={() => onChange('deficitMode', 'easy')}
        >
          <div className="font-pixel text-xs text-blue-400 mb-1">🌊 Hunger affects my mood/energy</div>
          <div className="text-xs text-slate-300 mb-1">Easy deficit — 0.25-0.5 kg/week loss target</div>
          <div className="text-xs text-slate-500">~300-350 kcal below maintenance. Sustainable, consistent, lower cravings.</div>
          <div className="text-xs text-amber-400 mt-2">Milestone: Refeed Day unlocked after 4 weeks + 2 kg lost</div>
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={!data.deficitMode}>Next →</button>
      </div>
    </div>
  )
}

// Step 6 — Calorie & Macro Setup (new)
function Step6({ data, onChange, onNext, onBack }) {
  const hasLoseWeight = (data.goals || []).includes('Lose weight')
  const hasBulk = (data.goals || []).includes('Build muscle')
  const goalType = hasLoseWeight ? 'lose' : hasBulk ? 'bulk' : 'maintain'

  const weightKg = parseFloat(data.weightKg) || 0
  const activityLevel = data.activityLevel || 'moderate'
  const deficitMode = data.deficitMode || 'easy'

  const targets = weightKg > 0 ? calcTargets(weightKg, activityLevel, deficitMode, goalType) : null

  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">Calorie Setup</h2>
      <p className="text-xs text-slate-400">Your targets are calculated using Rohan Gupta's Fat Loss Fuel System formula.</p>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Current Body Weight (kg) *</label>
        <input type="number" placeholder="e.g. 75" min="30" max="200" value={data.weightKg || ''} onChange={e => onChange('weightKg', e.target.value)} />
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-2">Activity Level</label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map(a => (
            <div key={a.id} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${activityLevel === a.id ? 'border-violet-500 bg-violet-950' : 'border-slate-700 hover:border-slate-600'}`} onClick={() => onChange('activityLevel', a.id)}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activityLevel === a.id ? 'border-violet-400' : 'border-slate-600'}`}>
                {activityLevel === a.id && <div className="w-2 h-2 rounded-full bg-violet-400" />}
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-200">{a.label}</div>
                <div className="text-xs text-slate-500">{a.desc}</div>
              </div>
              <div className="text-xs text-slate-600">{a.days}</div>
            </div>
          ))}
        </div>
      </div>

      {targets && (
        <div className="rpg-panel p-4 border border-violet-700">
          <div className="font-pixel text-xs text-violet-400 mb-3">YOUR DAILY TARGETS</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calories', value: `${targets.calories} kcal`, color: '#f59e0b' },
              { label: 'Protein', value: `${targets.protein}g`, color: '#3b82f6' },
              { label: 'Carbs', value: `${targets.carbs}g`, color: '#10b981' },
              { label: 'Fat', value: `${targets.fat}g`, color: '#ef4444' },
            ].map(t => (
              <div key={t.label} className="bg-rpg-bg rounded p-2 text-center">
                <div className="text-xs text-slate-500">{t.label}</div>
                <div className="text-sm font-bold" style={{ color: t.color }}>{t.value}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-3">
            Maintenance: {targets.maintenance} kcal • Deficit: {targets.maintenance - targets.calories} kcal/day
          </div>
          <div className="text-xs text-slate-600 mt-1">Protein target: {targets.protein}g/day (2g per kg bodyweight)</div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={!weightKg}>Next →</button>
      </div>
    </div>
  )
}

// Step 7 — OpenAI Key
function Step7({ data, onChange, onNext, onBack }) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const test = async () => {
    if (!data.openaiKey) return
    setTesting(true); setResult(null)
    const res = await testApiKey(data.openaiKey)
    setTesting(false); setResult(res)
  }
  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">OpenAI API Key</h2>
      <div className="rpg-panel p-4 text-xs text-slate-400 leading-relaxed">
        AscendRPG uses OpenAI for food photo analysis, quest narratives, craving messages and your AI coach.
        <br /><br /><span className="text-green-400">Your key is stored only on your device.</span>
      </div>
      <input type="password" placeholder="sk-..." value={data.openaiKey || ''} onChange={e => onChange('openaiKey', e.target.value)} />
      <button className="rpg-btn-secondary w-full" onClick={test} disabled={testing || !data.openaiKey}>
        {testing ? '⏳ Testing...' : '🔌 Test Connection'}
      </button>
      {result && (
        <div className={`text-xs p-2 rounded ${result.ok ? 'text-green-400 bg-green-950' : 'text-red-400 bg-red-950'}`}>
          {result.ok ? '✓ Connection successful! AI features enabled.' : `✗ ${result.error}`}
        </div>
      )}
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-secondary text-xs" onClick={onNext}>Skip (AI disabled)</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={!data.openaiKey}>Next →</button>
      </div>
    </div>
  )
}

// Step 8 — Workout Program (new — from Training Protocol)
function Step8({ data, onChange, onNext, onBack }) {
  const gender = data.gender?.includes('she') ? 'women' : 'men'
  const templates = ALL_TEMPLATES.filter(t => t.gender === gender || t.gender === 'men')
  const selected = data.workoutProgramId

  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">Training Program</h2>
      <p className="text-xs text-slate-400">Select your workout split from Rohan Gupta's Training Protocol.</p>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {templates.map(t => (
          <div
            key={t.id}
            className={`rpg-panel p-4 cursor-pointer border-2 transition-all ${selected === t.id ? 'border-violet-500 bg-violet-950' : 'border-transparent hover:border-slate-600'}`}
            onClick={() => { onChange('workoutProgramId', t.id); onChange('workoutProgramData', t) }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-pixel text-xs text-violet-400 mb-1" style={{ fontSize: '10px' }}>{t.name}</div>
                <div className="text-xs text-slate-300 mb-1">{t.description}</div>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span>📅 {t.daysPerWeek} days/week</span>
                  <span>📊 {t.level}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">🏋️ {t.equipment}</div>
              </div>
              {selected === t.id && <span className="text-green-400 font-pixel text-xs">✓</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-secondary text-xs" onClick={onNext}>Skip</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={!selected}>Next →</button>
      </div>
    </div>
  )
}

// Step 9 — Habit Seeding
function Step9({ data, onChange, onNext, onBack }) {
  const suggested = (data.goals || []).flatMap(g => GOAL_HABITS[g] || []).filter(
    (h, i, arr) => arr.findIndex(x => x.name === h.name) === i
  )
  const habits = data.habits || suggested.map((h, i) => ({ ...h, id: i, enabled: true }))
  if (!data.habits) onChange('habits', habits)

  const toggle = (id) => onChange('habits', habits.map(h => h.id === id ? { ...h, enabled: !h.enabled } : h))
  const addCustom = () => {
    const name = prompt('Habit name:')
    if (!name) return
    onChange('habits', [...habits, { id: Date.now(), name, type: 'positive', frequency: 'daily', enabled: true }])
  }

  return (
    <div className="space-y-3">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">Starter Habits</h2>
      <p className="text-xs text-slate-400">Based on your goals + Rohan's 2-week habit starter system.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {habits.map(h => (
          <div key={h.id} className={`flex items-center gap-3 p-3 rounded border ${h.enabled ? 'border-violet-600 bg-violet-950' : 'border-slate-700 bg-slate-900 opacity-50'}`}>
            <button className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 ${h.enabled ? 'bg-violet-500 border-violet-400' : 'border-slate-600'}`} onClick={() => toggle(h.id)}>
              {h.enabled ? '✓' : ''}
            </button>
            <span className="text-xs text-slate-200 flex-1">{h.name}</span>
            {h.category && <span className="text-xs text-slate-600">{h.category}</span>}
          </div>
        ))}
      </div>
      <button className="rpg-btn-secondary w-full text-xs" onClick={addCustom}>+ Add Custom Habit</button>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext} disabled={habits.filter(h => h.enabled).length === 0}>Next →</button>
      </div>
    </div>
  )
}

// Step 10 — Routine Builder
function Step10({ data, onChange, onNext, onBack }) {
  const suggested = CLASS_ROUTINES[data.class] || CLASS_ROUTINES.Warrior
  const morning = data.morning || suggested.map(s => ({ ...s, enabled: true }))
  if (!data.morning) onChange('morning', morning)
  const toggle = (id) => onChange('morning', morning.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  return (
    <div className="space-y-3">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">Morning Routine</h2>
      <p className="text-xs text-slate-400">Suggested for your class. Can edit after onboarding.</p>
      <div className="space-y-2">
        {morning.map(step => (
          <div key={step.id} className={`flex items-center gap-3 p-3 rounded border ${step.enabled ? 'border-emerald-700 bg-emerald-950' : 'border-slate-700 bg-slate-900 opacity-50'}`}>
            <button className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 ${step.enabled ? 'bg-emerald-600 border-emerald-500' : 'border-slate-600'}`} onClick={() => toggle(step.id)}>
              {step.enabled ? '✓' : ''}
            </button>
            <span className="text-xs text-slate-200 flex-1">{step.name}</span>
            <span className="text-xs text-slate-500">{step.duration} min</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-secondary text-xs" onClick={onNext}>Skip</button>
        <button className="rpg-btn-primary flex-1" onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}

// Step 11 — Character Preview
function Step11({ data, onChange, onNext, onBack }) {
  const charName = data.charName || data.realName || ''
  if (!data.charName) onChange('charName', charName)
  const mockChar = { name: charName, class: data.class, level: 1, hp: 100, maxHp: 100, cosmetics: {} }
  const targets = data.weightKg ? calcTargets(parseFloat(data.weightKg), data.activityLevel || 'moderate', data.deficitMode || 'easy', (data.goals || []).includes('Lose weight') ? 'lose' : 'maintain') : null

  return (
    <div className="space-y-4">
      <h2 className="font-pixel text-sm text-violet-400 mb-2">Your Character</h2>
      <div className="flex flex-col items-center gap-4">
        <div className="animate-[float_3s_ease-in-out_infinite]">
          <PixelCharacter character={mockChar} size={120} />
        </div>
        <input type="text" className="text-center font-pixel text-xs" value={charName} onChange={e => onChange('charName', e.target.value)} placeholder="Character name" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #4a5568' }} />
      </div>
      <div className="rpg-panel p-4 space-y-2">
        {[
          ['Class', data.class, '#a78bfa'],
          ['Level', '1', '#f59e0b'],
          ['Training', data.workoutProgramData?.name || 'Not selected', '#10b981'],
          targets ? ['Daily Calories', `${targets.calories} kcal`, '#f59e0b'] : null,
          targets ? ['Protein Target', `${targets.protein}g/day`, '#3b82f6'] : null,
        ].filter(Boolean).map(([label, value, color]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className="font-pixel" style={{ color, fontSize: '9px' }}>{value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-4">
        <button className="rpg-btn-secondary flex-1" onClick={onBack}>← Back</button>
        <button className="rpg-btn-gold flex-1" onClick={onNext}>Enter the World ▶</button>
      </div>
    </div>
  )
}

// Step 12 — First Quest
function Step12({ data, onFinish }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="space-y-6 text-center">
      <h2 className="font-pixel text-sm text-violet-400">Quest Assigned!</h2>
      {!revealed ? (
        <button className="rpg-btn-gold w-full" onClick={() => setRevealed(true)}>🗺️ Unfurl Quest Scroll</button>
      ) : (
        <div className="scroll-unfurl rpg-panel p-6 border border-amber-700">
          <div className="font-pixel text-xs text-amber-400 mb-4">DAILY QUEST</div>
          <div className="space-y-2 mb-4">
            {(data.habits || []).filter(h => h.enabled).slice(0, 5).map((h, i) => (
              <div key={i} className="text-xs text-slate-300 flex items-center gap-2">
                <span className="text-violet-400">◆</span> {h.name}
              </div>
            ))}
          </div>
          {data.workoutProgramData && (
            <div className="text-xs text-emerald-400 mb-3">
              🏋️ Training: {data.workoutProgramData.name} ({data.workoutProgramData.daysPerWeek} days/week)
            </div>
          )}
          <div className="text-xs text-slate-500 italic">"The journey of a thousand miles begins with a single step."</div>
        </div>
      )}
      <button className="rpg-btn-primary w-full" onClick={onFinish}>⚔️ Enter AscendRPG</button>
    </div>
  )
}

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })

  const { setCharacter, setOpenaiKey, setNutrition, addHabit, setRoutine, completeOnboarding } = useStore()

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))
  const handleNext = () => setStep(s => s + 1)
  const handleBack = () => setStep(s => s - 1)

  const handleFinish = () => {
    const goals = formData.goals || []
    const hasLoseWeight = goals.includes('Lose weight')
    const hasBulk = goals.includes('Build muscle')
    const goalType = hasLoseWeight ? 'lose' : hasBulk ? 'bulk' : 'maintain'
    const weightKg = parseFloat(formData.weightKg) || 0
    const targets = weightKg > 0
      ? calcTargets(weightKg, formData.activityLevel || 'moderate', formData.deficitMode || 'easy', goalType)
      : null

    setCharacter({
      name: formData.charName || formData.realName,
      realName: formData.realName,
      age: formData.age,
      gender: formData.gender || '',
      timezone: formData.timezone,
      class: formData.class,
      goals,
    })

    if (targets) {
      setNutrition({
        deficitMode: formData.deficitMode || 'easy',
        goalType,
        weightKg,
        activityLevel: formData.activityLevel || 'moderate',
        dailyCalories: targets.calories,
        proteinTarget: targets.protein,
        carbTarget: targets.carbs,
        fatTarget: targets.fat,
        maintenanceCalories: targets.maintenance,
        workoutProgram: formData.workoutProgramId || null,
        workoutProgramData: formData.workoutProgramData || null,
        weekStartDate: new Date().toISOString().split('T')[0],
        currentWeek: 1,
      })
    }

    if (formData.openaiKey) setOpenaiKey(formData.openaiKey)
    ;(formData.habits || []).filter(h => h.enabled).forEach(h => addHabit(h))
    const morningSteps = (formData.morning || []).filter(s => s.enabled)
    if (morningSteps.length) setRoutine('morning', morningSteps.map(s => ({ ...s, completions: {} })))
    completeOnboarding()
  }

  const stepContent = {
    1:  <Step1 onNext={handleNext} />,
    2:  <Step2 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    3:  <Step3 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    4:  <Step4 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    5:  <Step5 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    6:  <Step6 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    7:  <Step7 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    8:  <Step8 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    9:  <Step9 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    10: <Step10 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    11: <Step11 data={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />,
    12: <Step12 data={formData} onFinish={handleFinish} />,
  }

  if (step === 1) return stepContent[1]

  return (
    <div className="min-h-screen bg-rpg-bg flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-pixel text-xs text-amber-400">ASCEND RPG</span>
          <span className="font-pixel text-xs text-slate-600">SETUP</span>
        </div>
        <ProgressBar step={step} />
        <div className="rpg-panel p-6">{stepContent[step]}</div>
      </div>
    </div>
  )
}
