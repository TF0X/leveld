import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'

const TOOLTIP_STYLE = { background: '#1a1a2e', border: '1px solid #2a2a4a', fontSize: '11px', color: '#e2e8f0' }

function HeatmapSection({ title, values }) {
  const today = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)

  return (
    <div className="rpg-panel p-4">
      <div className="font-pixel text-xs text-slate-400 mb-3">{title}</div>
      <CalendarHeatmap
        startDate={start}
        endDate={today}
        values={values}
        classForValue={v => {
          if (!v || !v.count) return 'color-empty'
          if (v.count >= 5) return 'color-scale-4'
          if (v.count >= 3) return 'color-scale-3'
          if (v.count >= 2) return 'color-scale-2'
          return 'color-scale-1'
        }}
        showWeekdayLabels
      />
    </div>
  )
}

export default function Analytics() {
  const { habits, xpHistory, workoutLogs, dietLogs, cravings } = useStore()
  const [range, setRange] = useState('week')

  // Habit heatmap
  const habitValues = {}
  habits.forEach(h => {
    Object.entries(h.completions || {}).forEach(([date, count]) => {
      habitValues[date] = (habitValues[date] || 0) + (count || 1)
    })
  })
  const habitHeatmap = Object.entries(habitValues).map(([date, count]) => ({ date, count }))

  // XP per week (last 7 days)
  const now = new Date()
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const xp = (xpHistory || []).filter(x => x.date === dateStr).reduce((acc, x) => acc + x.amount, 0)
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), xp }
  })

  // Workout volume last 7
  const workoutData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const vol = workoutLogs.filter(l => l.date.startsWith(dateStr)).reduce((acc, l) => acc + (l.volume || 0), 0)
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), volume: vol }
  })

  // Calorie data
  const calorieData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const cal = dietLogs.filter(l => l.date.startsWith(dateStr)).reduce((acc, l) => acc + (l.calories || 0), 0)
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), calories: cal }
  })

  const resistedCount = cravings.filter(c => c.resisted).length
  const totalCravings = cravings.length
  const resistRate = totalCravings ? Math.round((resistedCount / totalCravings) * 100) : 0

  return (
    <div className="space-y-4 pb-6">
      <h1 className="font-pixel text-xs text-amber-400">ANALYTICS</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Habits', value: habits.length, color: '#7c3aed' },
          { label: 'Cravings Resisted', value: `${resistedCount}/${totalCravings}`, color: '#10b981' },
          { label: 'Resist Rate', value: `${resistRate}%`, color: '#f59e0b' },
          { label: 'Workouts', value: workoutLogs.length, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="rpg-panel p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* XP Chart */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-slate-400 mb-3">XP EARNED (7 DAYS)</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={last7}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="xp" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Workout volume */}
      {workoutLogs.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">WORKOUT VOLUME (7 DAYS)</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={workoutData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="volume" fill="#7c3aed" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Calorie intake */}
      {dietLogs.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">CALORIE INTAKE (7 DAYS)</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={calorieData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <Line type="monotone" dataKey="calories" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Habit Heatmap */}
      <HeatmapSection title="HABIT COMPLETION (90 DAYS)" values={habitHeatmap} />

      <style>{`
        .react-calendar-heatmap .color-empty { fill: #1a1a2e; }
        .react-calendar-heatmap .color-scale-1 { fill: #4c1d95; }
        .react-calendar-heatmap .color-scale-2 { fill: #6d28d9; }
        .react-calendar-heatmap .color-scale-3 { fill: #7c3aed; }
        .react-calendar-heatmap .color-scale-4 { fill: #a78bfa; }
        .react-calendar-heatmap text { fill: #64748b; font-size: 9px; }
      `}</style>
    </div>
  )
}
