import React, { useState, useRef } from 'react'
import useStore from '../../store/useStore'
import { analyzeFoodPhoto, estimateFoodFromText } from '../../utils/ai'
import { searchFoods } from '../../data/foods'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const MACRO_COLORS = { protein: '#3b82f6', carbs: '#f59e0b', fat: '#ef4444' }
const EMPTY_FORM = { name: '', calories: '', protein: '', carbs: '', fat: '' }

function MacroPie({ protein, carbs, fat }) {
  const data = [
    { name: 'Protein', value: protein },
    { name: 'Carbs', value: carbs },
    { name: 'Fat', value: fat },
  ].filter(d => d.value > 0)
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={150}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({ name, value }) => `${name}: ${value}g`}>
          {data.map((_, i) => <Cell key={i} fill={Object.values(MACRO_COLORS)[i]} />)}
        </Pie>
        <Tooltip formatter={v => `${v}g`} contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function TargetBar({ label, current, target, color }) {
  if (!target) return null
  const pct = Math.min(100, Math.round((current / target) * 100))
  const over = current > target
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span style={{ color: over ? '#ef4444' : color }}>{current} / {target}{label === 'Calories' ? ' kcal' : 'g'}</span>
      </div>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: over ? '#ef4444' : color, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

function FoodSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  const handleQuery = (q) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    const found = searchFoods(q)
    setResults(found)
    setOpen(found.length > 0)
  }

  const pick = (food) => {
    onSelect(food)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <label className="text-xs text-slate-400 block mb-1">Quick-fill from food database</label>
      <input
        type="text"
        placeholder="Search: chicken, paneer, rice, oats..."
        value={query}
        onChange={e => handleQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-rpg-panel border border-rpg-border rounded shadow-xl max-h-56 overflow-y-auto">
          {results.map((food, i) => (
            <button key={i} className="w-full text-left px-3 py-2 text-xs hover:bg-violet-900 border-b border-slate-800 last:border-0"
              onMouseDown={() => pick(food)}>
              <div className="text-slate-200">{food.name}</div>
              <div className="text-slate-500 mt-0.5">
                {food.calories} kcal · P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
                <span className="ml-2 text-violet-400">[{food.category}]</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WeightLogger({ weightLogs, onLog }) {
  const [w, setW] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const todayLog = weightLogs.find(l => l.date === today)
  const last7 = weightLogs.slice(-7)
  return (
    <div className="rpg-panel p-4">
      <div className="font-pixel text-xs text-slate-400 mb-3">⚖️ WEIGHT LOG</div>
      {todayLog ? (
        <div className="text-xs text-green-400">✓ Today: {todayLog.weight} kg</div>
      ) : (
        <div className="flex gap-2">
          <input type="number" placeholder="kg" value={w} onChange={e => setW(e.target.value)} className="flex-1" step="0.1" />
          <button className="rpg-btn-secondary px-3 text-xs" onClick={() => { if (w) { onLog(parseFloat(w)); setW('') } }}>Log</button>
        </div>
      )}
      {last7.length > 1 && (
        <div className="mt-3 flex gap-1 items-end h-8">
          {last7.map((l, i) => {
            const minW = Math.min(...last7.map(x => x.weight))
            const maxW = Math.max(...last7.map(x => x.weight))
            const range = maxW - minW || 1
            const pct = ((l.weight - minW) / range) * 80 + 20
            return <div key={i} className="flex-1 rounded-t-sm bg-violet-600" style={{ height: `${pct}%` }} title={`${l.date}: ${l.weight}kg`} />
          })}
        </div>
      )}
      {last7.length >= 2 && (
        <div className="text-xs text-slate-500 mt-2">
          {last7[last7.length - 1].weight < last7[0].weight
            ? <span className="text-green-400">↓ {(last7[0].weight - last7[last7.length - 1].weight).toFixed(1)} kg lost</span>
            : <span className="text-slate-400">↔ Weight stable</span>}
        </div>
      )}
    </div>
  )
}

export default function Diet() {
  const { dietLogs, logDiet, gainXP, openaiKey, nutrition, setWater, logWeight, weightLogs, penalizeCalorieOverage } = useStore()
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = dietLogs.filter(l => l.date.startsWith(today))

  const [form, setForm] = useState(EMPTY_FORM)
  const [analyzing, setAnalyzing] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [textQuery, setTextQuery] = useState('')
  const [showMacros, setShowMacros] = useState(true)
  const [inputMode, setInputMode] = useState('manual') // 'manual' | 'ai-text' | 'photo'
  const fileRef = useRef()

  const water = nutrition.waterDate === today ? (nutrition.waterGlasses || 0) : 0

  const totals = todayLogs.reduce((acc, l) => ({
    calories: acc.calories + (l.calories || 0),
    protein:  acc.protein  + (l.protein  || 0),
    carbs:    acc.carbs    + (l.carbs    || 0),
    fat:      acc.fat      + (l.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const calorieTarget = nutrition.dailyCalories || 0
  const proteinTarget = nutrition.proteinTarget || 0
  const remaining = calorieTarget ? calorieTarget - totals.calories : null
  const isOver = remaining !== null && remaining < 0

  const handleFoodSelect = (food) => {
    setForm({ name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat })
    setShowMacros(true)
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !openaiKey) return
    setAnalyzing(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const r = await analyzeFoodPhoto(openaiKey, base64)
        setForm({ name: r.name, calories: r.calories, protein: r.protein_g, carbs: r.carbs_g, fat: r.fat_g })
        setShowMacros(true)
      } catch { alert('Could not analyze image. Try text or manual.') }
      finally { setAnalyzing(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleTextEstimate = async () => {
    if (!textQuery.trim() || !openaiKey) return
    setEstimating(true)
    try {
      const r = await estimateFoodFromText(openaiKey, textQuery)
      setForm({ name: r.name, calories: r.calories, protein: r.protein_g, carbs: r.carbs_g, fat: r.fat_g })
      setShowMacros(true)
      setTextQuery('')
      setInputMode('manual')
    } catch { alert('AI estimation failed. Enter macros manually.') }
    finally { setEstimating(false) }
  }

  const handleLog = () => {
    if (!form.name) return
    const entry = {
      name:     form.name,
      calories: +form.calories || 0,
      protein:  showMacros ? (+form.protein || 0) : 0,
      carbs:    showMacros ? (+form.carbs    || 0) : 0,
      fat:      showMacros ? (+form.fat      || 0) : 0,
    }
    logDiet(entry)
    gainXP(10, 'meal')

    // Check calorie overage after logging
    const newTotal = totals.calories + entry.calories
    if (calorieTarget && newTotal > calorieTarget) {
      penalizeCalorieOverage(newTotal)
    }

    setForm(EMPTY_FORM)
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="font-pixel text-xs text-amber-400">DIET LOG</h1>

      {/* Target progress — shown when targets set */}
      {calorieTarget > 0 && (
        <div className={`rpg-panel p-4 space-y-3 ${isOver ? 'border border-red-800' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="font-pixel text-xs text-violet-400">TODAY'S TARGETS</div>
            {isOver && (
              <span className="text-xs text-red-400 font-pixel" style={{ fontSize: '9px' }}>
                ⚠ {Math.abs(remaining)} kcal OVER
              </span>
            )}
          </div>
          <TargetBar label="Calories" current={totals.calories} target={calorieTarget} color="#f59e0b" />
          <TargetBar label="Protein"  current={totals.protein}  target={proteinTarget}           color="#3b82f6" />
          {nutrition.carbTarget > 0 && <TargetBar label="Carbs" current={totals.carbs} target={nutrition.carbTarget} color="#10b981" />}
          {nutrition.fatTarget  > 0 && <TargetBar label="Fat"   current={totals.fat}  target={nutrition.fatTarget}  color="#ef4444" />}
          <div className="text-xs pt-1">
            {isOver
              ? <span className="text-red-400">Over by {Math.abs(remaining)} kcal. -{Math.min(20, Math.floor(Math.abs(remaining) / 100) * 5)} HP applied.</span>
              : <span className="text-slate-500">{remaining} kcal remaining today</span>}
          </div>
        </div>
      )}

      {/* Summary when no targets set */}
      {todayLogs.length > 0 && calorieTarget === 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">TODAY'S NUTRITION</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Calories', value: totals.calories, unit: 'kcal', color: '#f59e0b' },
              { label: 'Protein',  value: totals.protein,  unit: 'g',    color: '#3b82f6' },
              { label: 'Carbs',    value: totals.carbs,    unit: 'g',    color: '#10b981' },
              { label: 'Fat',      value: totals.fat,      unit: 'g',    color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="bg-rpg-bg rounded p-2 text-center">
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}{s.unit}</div>
              </div>
            ))}
          </div>
          <MacroPie protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
        </div>
      )}

      {/* Water */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-blue-400 mb-3">💧 WATER INTAKE</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} onClick={() => setWater(i < water ? i : i + 1)}
                className={`w-6 h-8 rounded text-xs border ${i < water ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700'}`}
                title={`${(i + 1) * 250}ml`}>💧</button>
            ))}
          </div>
          <span className="text-xs text-blue-400">{water * 250}ml / 2000ml</span>
        </div>
      </div>

      {/* Weight logger */}
      <WeightLogger weightLogs={weightLogs || []} onLog={logWeight} />

      {/* Log entry */}
      <div className="rpg-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-pixel text-xs text-violet-400">LOG MEAL</div>
          <button
            className={`text-xs px-3 py-1 rounded border transition-all ${showMacros ? 'border-violet-500 bg-violet-900 text-violet-300' : 'border-slate-600 text-slate-500'}`}
            onClick={() => setShowMacros(v => !v)}
          >
            {showMacros ? '📊 Macros ON' : '📊 Macros OFF'}
          </button>
        </div>

        {/* Input mode tabs */}
        {openaiKey && (
          <div className="flex gap-1">
            {[
              { id: 'manual',   label: '✏️ Manual' },
              { id: 'ai-text',  label: '✨ AI Text' },
              { id: 'photo',    label: '📷 Photo' },
            ].map(m => (
              <button key={m.id}
                className={`flex-1 text-xs py-1.5 rounded border transition-all ${inputMode === m.id ? 'border-violet-500 bg-violet-900 text-white' : 'border-slate-700 text-slate-500'}`}
                onClick={() => setInputMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* AI Text estimation */}
        {inputMode === 'ai-text' && openaiKey && (
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Describe your meal — AI estimates macros</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. dal chawal with ghee, 1 bowl"
                value={textQuery}
                onChange={e => setTextQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextEstimate()}
                className="flex-1"
              />
              <button
                className="rpg-btn-primary px-3 text-xs flex-shrink-0"
                onClick={handleTextEstimate}
                disabled={estimating || !textQuery.trim()}
              >
                {estimating ? '⏳' : '✨ Estimate'}
              </button>
            </div>
            <div className="text-xs text-slate-600">Works for any meal description — Indian foods, combos, home-cooked meals.</div>
          </div>
        )}

        {/* Photo */}
        {inputMode === 'photo' && openaiKey && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <button className="rpg-btn-secondary w-full text-xs" onClick={() => fileRef.current.click()} disabled={analyzing}>
              {analyzing ? '🔍 Analyzing photo...' : '📷 Upload Food Photo'}
            </button>
          </>
        )}

        {/* Database search — always visible */}
        <FoodSearch onSelect={handleFoodSelect} />

        {/* Form fields */}
        <input type="text" placeholder="Food name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

        <div>
          <label className="text-xs text-slate-500">Calories (kcal)</label>
          <input type="number" placeholder="e.g. 450" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} />
        </div>

        {showMacros && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-blue-400">Protein (g)</label>
              <input type="number" placeholder="0" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-amber-400">Carbs (g)</label>
              <input type="number" placeholder="0" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-red-400">Fat (g)</label>
              <input type="number" placeholder="0" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} />
            </div>
          </div>
        )}

        {!showMacros && <div className="text-xs text-slate-600 bg-slate-900 rounded p-2">Macros off — name and calories only.</div>}

        <button className="rpg-btn-primary w-full" onClick={handleLog} disabled={!form.name}>
          Log Meal +10 XP
        </button>
      </div>

      {/* Today's meals list */}
      {todayLogs.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">TODAY'S MEALS</div>
          <div className="space-y-2">
            {todayLogs.map(l => (
              <div key={l.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 text-slate-200">{l.name}</span>
                {l.calories > 0 && <span className="text-amber-400">{l.calories} kcal</span>}
                {l.protein  > 0 && <span className="text-blue-400">{l.protein}g P</span>}
              </div>
            ))}
            {calorieTarget > 0 && (
              <div className={`border-t border-slate-700 pt-2 flex justify-between text-xs ${isOver ? 'text-red-400' : 'text-amber-400'}`}>
                <span>Total</span>
                <span>{totals.calories} / {calorieTarget} kcal</span>
              </div>
            )}
          </div>
          {(totals.protein > 0 || totals.carbs > 0) && (
            <MacroPie protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
          )}
        </div>
      )}
    </div>
  )
}
