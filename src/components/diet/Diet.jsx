import React, { useState, useRef } from 'react'
import useStore from '../../store/useStore'
import { analyzeFoodPhoto } from '../../utils/ai'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const MACRO_COLORS = { protein: '#3b82f6', carbs: '#f59e0b', fat: '#ef4444' }

function MacroPie({ protein, carbs, fat }) {
  const data = [
    { name: 'Protein', value: protein },
    { name: 'Carbs', value: carbs },
    { name: 'Fat', value: fat },
  ].filter(d => d.value > 0)

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}g`}>
          {data.map((entry, i) => (
            <Cell key={i} fill={Object.values(MACRO_COLORS)[i]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => `${v}g`} contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default function Diet() {
  const { dietLogs, logDiet, gainXP, openaiKey } = useStore()
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = dietLogs.filter(l => l.date.startsWith(today))

  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', water: '' })
  const [analyzing, setAnalyzing] = useState(false)
  const [water, setWater] = useState(0)
  const fileRef = useRef()

  const totals = todayLogs.reduce((acc, l) => ({
    calories: acc.calories + (l.calories || 0),
    protein: acc.protein + (l.protein || 0),
    carbs: acc.carbs + (l.carbs || 0),
    fat: acc.fat + (l.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !openaiKey) return
    setAnalyzing(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const result = await analyzeFoodPhoto(openaiKey, base64)
        setForm({ name: result.name, calories: result.calories, protein: result.protein_g, carbs: result.carbs_g, fat: result.fat_g, water: '' })
      } catch {
        alert('Could not analyze image. Try entering manually.')
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLog = () => {
    if (!form.name) return
    logDiet({ name: form.name, calories: +form.calories || 0, protein: +form.protein || 0, carbs: +form.carbs || 0, fat: +form.fat || 0 })
    gainXP(10, 'meal')
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '', water: '' })
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="font-pixel text-xs text-amber-400">DIET LOG</h1>

      {/* Daily Summary */}
      {todayLogs.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">TODAY'S NUTRITION</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Calories', value: totals.calories, unit: 'kcal', color: '#f59e0b' },
              { label: 'Protein', value: totals.protein, unit: 'g', color: '#3b82f6' },
              { label: 'Carbs', value: totals.carbs, unit: 'g', color: '#10b981' },
              { label: 'Fat', value: totals.fat, unit: 'g', color: '#ef4444' },
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

      {/* Water Tracker */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-blue-400 mb-3">💧 WATER INTAKE</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                onClick={() => setWater(i + 1)}
                className={`w-6 h-8 rounded text-xs border ${i < water ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700'}`}
                title={`${(i + 1) * 250}ml`}
              >
                💧
              </button>
            ))}
          </div>
          <span className="text-xs text-blue-400">{water * 250}ml / 2000ml</span>
        </div>
      </div>

      {/* Log Entry */}
      <div className="rpg-panel p-4 space-y-3">
        <div className="font-pixel text-xs text-violet-400">LOG MEAL</div>
        {openaiKey && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <button
              className="rpg-btn-secondary w-full text-xs"
              onClick={() => fileRef.current.click()}
              disabled={analyzing}
            >
              {analyzing ? '🔍 Analyzing...' : '📷 Analyze Food Photo (AI)'}
            </button>
          </>
        )}
        <input type="text" placeholder="Food name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500">Calories</label>
            <input type="number" placeholder="kcal" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Protein (g)</label>
            <input type="number" placeholder="g" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Carbs (g)</label>
            <input type="number" placeholder="g" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Fat (g)</label>
            <input type="number" placeholder="g" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} />
          </div>
        </div>
        <button className="rpg-btn-primary w-full" onClick={handleLog} disabled={!form.name}>Log Meal +10 XP</button>
      </div>

      {/* Recent logs */}
      {todayLogs.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">TODAY'S MEALS</div>
          <div className="space-y-2">
            {todayLogs.map(l => (
              <div key={l.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 text-slate-200">{l.name}</span>
                <span className="text-amber-400">{l.calories} kcal</span>
                <span className="text-blue-400">{l.protein}g P</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
