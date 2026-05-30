import React, { useState, useEffect } from 'react'
import useStore, { getSeason } from './store/useStore'
import { startHourlyNotifications, notificationPermission } from './utils/notifications'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import Dashboard from './components/dashboard/Dashboard'
import Habits from './components/habits/Habits'
import Routines from './components/routines/Routines'
import Cravings from './components/cravings/Cravings'
import Diet from './components/diet/Diet'
import Workout from './components/workout/Workout'
import Quests from './components/quests/Quests'
import Analytics from './components/analytics/Analytics'
import Settings from './components/settings/Settings'
import Todos from './components/todos/Todos'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home',    icon: '🏠' },
  { id: 'habits',    label: 'Habits',  icon: '✦' },
  { id: 'quests',    label: 'Quests',  icon: '⚔️' },
  { id: 'todos',     label: 'Todos',   icon: '✅' },
  { id: 'routines',  label: 'Routine', icon: '🌅' },
  { id: 'cravings',  label: 'Cravings',icon: '🧠' },
  { id: 'diet',      label: 'Diet',    icon: '🍎' },
  { id: 'workout',   label: 'Gym',     icon: '💪' },
  { id: 'analytics', label: 'Stats',   icon: '📊' },
  { id: 'settings',  label: 'Config',  icon: '⚙️' },
]

const SEASON_BG = {
  spring: 'bg-gradient-to-b from-green-950 via-rpg-bg to-rpg-bg',
  summer: 'bg-gradient-to-b from-teal-950 via-rpg-bg to-rpg-bg',
  autumn: 'bg-gradient-to-b from-orange-950 via-rpg-bg to-rpg-bg',
  winter: 'bg-gradient-to-b from-blue-950 via-rpg-bg to-rpg-bg',
}

function BottomNav({ active, onSelect, todos }) {
  const main = NAV_ITEMS.slice(0, 5)
  const overdueTodos = todos.filter(t => !t.completedAt && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]).length

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-rpg-panel border-t border-rpg-border z-40">
      <div className="flex max-w-lg mx-auto">
        {main.map(item => (
          <button
            key={item.id}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all relative ${active === item.id ? 'text-violet-400' : 'text-slate-600 hover:text-slate-400'}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="font-pixel leading-none" style={{ fontSize: '7px' }}>{item.label}</span>
            {item.id === 'todos' && overdueTodos > 0 && (
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-white font-pixel flex items-center justify-center" style={{ fontSize: '6px' }}>
                {overdueTodos}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}

function TopBar({ character, todos, activeTab, onMore }) {
  const overdueTodos = todos.filter(t => !t.completedAt && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]).length
  return (
    <header className="fixed top-0 left-0 right-0 bg-rpg-panel/95 backdrop-blur-sm border-b border-rpg-border z-40">
      <div className="flex items-center justify-between px-4 py-2 max-w-lg mx-auto">
        <span className="font-pixel text-xs text-amber-400" style={{ fontSize: '10px' }}>ASCEND RPG</span>
        <div className="flex items-center gap-3 text-xs">
          {character.class && (
            <>
              <span className="text-amber-400">Lv.{character.level}</span>
              <span className="text-red-400">❤ {character.hp}</span>
              {character.streak > 0 && <span className="fire-streak">🔥{character.streak}</span>}
            </>
          )}
          {overdueTodos > 0 && <span className="text-red-400 text-xs">✅{overdueTodos}</span>}
          <button className="text-slate-500 hover:text-slate-300 text-sm" onClick={onMore}>⋯</button>
        </div>
      </div>
    </header>
  )
}

function MoreMenu({ onSelect, onClose }) {
  const extra = NAV_ITEMS.slice(5)
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute right-4 top-12 bg-rpg-panel border border-rpg-border rounded shadow-xl" onClick={e => e.stopPropagation()}>
        {extra.map(item => (
          <button key={item.id}
            className="flex items-center gap-3 px-5 py-3 text-xs text-slate-300 hover:text-white hover:bg-rpg-border w-full text-left"
            onClick={() => { onSelect(item.id); onClose() }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const VIEWS = {
  dashboard: Dashboard,
  habits:    Habits,
  routines:  Routines,
  cravings:  Cravings,
  diet:      Diet,
  workout:   Workout,
  quests:    Quests,
  analytics: Analytics,
  settings:  Settings,
  todos:     Todos,
}

export default function App() {
  const { onboarding_complete, character, todos } = useStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [moreOpen, setMoreOpen] = useState(false)
  const season = getSeason()

  // Start hourly notifications if permission already granted
  useEffect(() => {
    if (notificationPermission() === 'granted') {
      startHourlyNotifications(() => useStore.getState())
    }
  }, [])

  if (!onboarding_complete) return <OnboardingWizard />

  const View = VIEWS[activeTab] || Dashboard

  return (
    <div className={`min-h-screen ${SEASON_BG[season]} text-rpg-text`}>
      <TopBar character={character} todos={todos || []} activeTab={activeTab} onMore={() => setMoreOpen(v => !v)} />
      {moreOpen && <MoreMenu onSelect={setActiveTab} onClose={() => setMoreOpen(false)} />}
      <main className="max-w-lg mx-auto px-4 pt-16 pb-24">
        <View />
      </main>
      <BottomNav active={activeTab} onSelect={setActiveTab} todos={todos || []} />
    </div>
  )
}
