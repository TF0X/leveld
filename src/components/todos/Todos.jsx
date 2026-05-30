import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { ANTAGONIST } from '../../utils/antagonist'

const BUCKET_CONFIG = {
  today:    { label: 'Today', color: '#ef4444', bg: 'bg-red-950', border: 'border-red-800', icon: '🔥', max: 5 },
  week:     { label: 'This Week', color: '#f59e0b', bg: 'bg-amber-950', border: 'border-amber-800', icon: '📅', max: null },
  someday:  { label: 'Someday', color: '#64748b', bg: 'bg-slate-900', border: 'border-slate-700', icon: '📦', max: null },
}

function TodoItem({ todo, onComplete, onDelete, onMove }) {
  const d = new Date().toISOString().split('T')[0]
  const daysOld = todo.createdAt
    ? Math.floor((new Date(d) - new Date(todo.createdAt)) / 86400000)
    : 0
  const isOverdue = todo.bucket === 'today' && todo.dueDate && todo.dueDate < d && !todo.completedAt
  const isOld = daysOld >= 7 && !todo.completedAt
  const isDone = !!todo.completedAt

  return (
    <div className={`flex items-start gap-2 p-2 rounded border transition-all ${isDone ? 'opacity-40 border-slate-800' : isOverdue ? 'border-red-700 bg-red-950/30' : isOld ? 'border-amber-800 bg-amber-950/30' : 'border-slate-700'}`}>
      <button
        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 ${isDone ? 'bg-green-700 border-green-600' : 'border-slate-600 hover:border-violet-500'}`}
        onClick={() => !isDone && onComplete(todo.id)}
        disabled={isDone}
      >
        {isDone ? '✓' : '○'}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-xs ${isDone ? 'line-through text-slate-600' : 'text-slate-200'}`}>{todo.text}</div>
        {isOverdue && <div className="text-xs text-red-400 mt-0.5">Overdue</div>}
        {isOld && !isDone && <div className="text-xs text-amber-400 mt-0.5">7 days old. Delete it or do it.</div>}
        {daysOld > 0 && !isDone && !isOld && <div className="text-xs text-slate-600 mt-0.5">{daysOld}d old</div>}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {todo.bucket !== 'today' && !isDone && (
          <button className="text-xs text-slate-600 hover:text-amber-400 px-1" onClick={() => onMove(todo.id, 'today')} title="Move to Today">↑</button>
        )}
        {todo.bucket === 'today' && !isDone && (
          <button className="text-xs text-slate-600 hover:text-slate-400 px-1" onClick={() => onMove(todo.id, 'week')} title="Move to Week">↓</button>
        )}
        <button className="text-xs text-slate-600 hover:text-red-400 px-1" onClick={() => onDelete(todo.id)}>✕</button>
      </div>
    </div>
  )
}

function BucketSection({ bucket, todos, onComplete, onDelete, onMove, onAdd }) {
  const cfg = BUCKET_CONFIG[bucket]
  const [input, setInput] = useState('')
  const active = todos.filter(t => !t.completedAt)
  const done = todos.filter(t => t.completedAt)

  const handleAdd = () => {
    if (!input.trim()) return
    onAdd(input.trim(), bucket)
    setInput('')
  }

  return (
    <div className={`rpg-panel overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b border-slate-800`}>
        <div className="flex items-center gap-2">
          <span>{cfg.icon}</span>
          <span className="font-pixel text-xs" style={{ color: cfg.color, fontSize: '9px' }}>{cfg.label.toUpperCase()}</span>
          <span className="text-xs text-slate-600">{active.length}{cfg.max ? `/${cfg.max}` : ''}</span>
        </div>
        {cfg.max && active.length >= cfg.max && (
          <span className="text-xs text-red-400">Full</span>
        )}
      </div>
      <div className="p-3 space-y-1">
        {active.length === 0 && done.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-2">Empty. Add something.</div>
        )}
        {active.map(t => (
          <TodoItem key={t.id} todo={t} onComplete={onComplete} onDelete={onDelete} onMove={onMove} />
        ))}
        {done.length > 0 && (
          <div className="mt-2 space-y-1">
            {done.slice(-3).map(t => (
              <TodoItem key={t.id} todo={t} onComplete={onComplete} onDelete={onDelete} onMove={onMove} />
            ))}
          </div>
        )}
        {/* Add input */}
        {!(cfg.max && active.length >= cfg.max) && (
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={`Add to ${cfg.label.toLowerCase()}...`}
              className="flex-1 text-xs py-1"
            />
            <button className="rpg-btn-secondary text-xs px-3 py-1" onClick={handleAdd}>+</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Todos() {
  const { todos, addTodo, completeTodo, deleteTodo, moveTodo, gainXP, loseXP, notifications, clearNotification } = useStore()

  const d = new Date().toISOString().split('T')[0]
  const todayTodos = todos.filter(t => t.bucket === 'today')
  const weekTodos = todos.filter(t => t.bucket === 'week')
  const somedayTodos = todos.filter(t => t.bucket === 'someday')

  const handleComplete = (id) => {
    completeTodo(id)
    gainXP(5, 'todo')
  }

  // Stats
  const doneToday = todos.filter(t => t.completedAt?.startsWith(d)).length
  const overdue = todos.filter(t => !t.completedAt && t.dueDate && t.dueDate < d).length

  // Antagonist notification for this view
  const antagonistNotif = notifications.find(n => n.type === 'antagonist')

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">TODOS</h1>
        <div className="flex gap-3 text-xs">
          {doneToday > 0 && <span className="text-green-400">✓ {doneToday} done today</span>}
          {overdue > 0 && <span className="text-red-400">⚠ {overdue} overdue</span>}
        </div>
      </div>

      {antagonistNotif && (
        <div className="rpg-panel p-3 border border-slate-600 flex items-start gap-3">
          <span className="text-slate-400 flex-1 text-xs italic">{antagonistNotif.message}</span>
          <button className="text-slate-600 text-xs" onClick={() => clearNotification(antagonistNotif.id)}>✕</button>
        </div>
      )}

      <div className="text-xs text-slate-500 rpg-panel p-3">
        <span className="text-red-400">Today</span> max 5. <span className="text-amber-400">Overdue</span> = -5 HP at midnight.
        7 days unfinished = forced choice. <span className="text-green-400">+5 XP</span> per complete.
      </div>

      <BucketSection bucket="today" todos={todayTodos} onComplete={handleComplete} onDelete={deleteTodo} onMove={moveTodo} onAdd={addTodo} />
      <BucketSection bucket="week" todos={weekTodos} onComplete={handleComplete} onDelete={deleteTodo} onMove={moveTodo} onAdd={addTodo} />
      <BucketSection bucket="someday" todos={somedayTodos} onComplete={handleComplete} onDelete={deleteTodo} onMove={moveTodo} onAdd={addTodo} />

      {/* Todo heatmap stub (wired into Analytics) */}
      {todos.filter(t => t.completedAt).length > 0 && (
        <div className="rpg-panel p-3">
          <div className="font-pixel text-xs text-slate-500 mb-2">COMPLETION HISTORY</div>
          <div className="flex gap-0.5">
            {Array.from({ length: 14 }, (_, i) => {
              const date = new Date()
              date.setDate(date.getDate() - (13 - i))
              const ds = date.toISOString().split('T')[0]
              const count = todos.filter(t => t.completedAt?.startsWith(ds)).length
              return (
                <div
                  key={i}
                  className="flex-1 h-4 rounded-sm"
                  style={{ background: count === 0 ? '#1a1a2e' : count === 1 ? '#4c1d95' : count <= 3 ? '#7c3aed' : '#a78bfa' }}
                  title={`${ds}: ${count} done`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-700 mt-1">
            <span>14 days ago</span><span>Today</span>
          </div>
        </div>
      )}
    </div>
  )
}
