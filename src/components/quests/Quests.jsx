import React, { useState, useEffect } from 'react'
import useStore from '../../store/useStore'
import { generateQuestNarrative, generateWeeklyBoss, generateDailyQuests, generateWeeklyQuests } from '../../utils/ai'
import { rollItemDrop } from '../../utils/antagonist'
import PixelMonster from '../character/PixelMonster'
import { getDailyQuestsStatic, getDailyEnemyType, DAILY_ENEMY_CONFIG, CATEGORY_META } from '../../data/quests'

function getWeekKey() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

const FALLBACK_BOSS = {
  name: 'The Sloth Colossus',
  type: 'golem',
  lore: 'Born from every skipped workout and broken promise, it grows heavier with each excuse.',
  weakness: 'Daily Consistency',
  palette: { body: '#2d1b1b', accent: '#7c2d12', eye: '#dc2626', glow: '#dc2626' },
}

const WEEKLY_TASK_ICONS = { physical: '⚔️', mental: '🔮', discipline: '🧘', social: '🤝' }

// ── Daily Monster + Quests ────────────────────────────────────────────────────
function DailySection({ character, dailyQuests, habitPct, onCompleteQuest, loading }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const quests = dailyQuests?.date === todayStr ? (dailyQuests.quests || []) : []

  const questsDone = quests.filter(q => q.completed).length
  const questTotal = quests.length
  const questPct = questTotal ? Math.round((questsDone / questTotal) * 100) : 100

  // Combined boss HP: average of habits + quests
  const effectiveHabitPct = habitPct  // already 100 when no habits
  const combinedPct = Math.round((effectiveHabitPct + questPct) / 2)
  const bossHP = 100 - combinedPct
  const hpRatio = Math.max(0, bossHP / 100)
  const isDead = bossHP <= 0

  const enemyType = getDailyEnemyType(character.level || 1)
  const enemy = DAILY_ENEMY_CONFIG[enemyType]

  return (
    <div className={`rpg-panel p-4 ${isDead ? 'border border-green-800' : 'border border-orange-900'}`}>
      <div className="font-pixel text-xs text-orange-400 mb-3" style={{ fontSize: '9px' }}>⚔️ DAILY BATTLE</div>

      {/* Enemy + HP bar */}
      <div className="flex items-start gap-4 mb-1">
        <div className="flex-shrink-0">
          {isDead
            ? <div className="text-4xl">💀</div>
            : <PixelMonster boss={{ type: enemyType, palette: enemy.palette }} size={64} hpRatio={hpRatio} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-200 font-semibold mb-1">
            {enemy.name}
            {isDead && <span className="text-green-400 ml-2">— SLAIN</span>}
          </div>
          {!isDead && (
            <>
              <div className="text-xs text-slate-500 mb-1">HP {bossHP}/100</div>
              <div className="stat-bar mb-1">
                <div className="stat-bar-fill bg-orange-700 transition-all duration-700" style={{ width: `${bossHP}%` }} />
              </div>
            </>
          )}
          {/* Contribution breakdown */}
          <div className="flex gap-3 text-xs text-slate-600 mt-1">
            <span>Habits {effectiveHabitPct}%</span>
            <span>Quests {questPct}%</span>
          </div>
        </div>
      </div>

      {!isDead && (
        <div className="text-xs text-red-500 mb-3 mt-1" style={{ fontSize: '9px' }}>
          ⚠ Kill it today or lose HP tomorrow
        </div>
      )}
      {isDead && (
        <div className="text-xs text-green-400 mb-3 font-pixel" style={{ fontSize: '9px' }}>
          ✦ ENEMY VANQUISHED ✦
        </div>
      )}

      {/* Category quests */}
      <div className="font-pixel text-xs text-slate-400 mb-2" style={{ fontSize: '9px' }}>TODAY'S QUESTS</div>

      {loading && quests.length === 0 ? (
        <div className="text-xs text-slate-500 animate-pulse">Generating today's quests...</div>
      ) : quests.length === 0 ? (
        <div className="text-xs text-slate-500">Add an OpenAI key in Settings to unlock AI quests.</div>
      ) : (
        <div className="space-y-2">
          {quests.map(q => {
            const meta = CATEGORY_META[q.category] || CATEGORY_META.control
            return (
              <div
                key={q.id}
                className={`flex items-center gap-3 p-3 rounded border transition-all ${q.completed ? `${meta.border} ${meta.bg} opacity-75` : 'border-slate-700 hover:border-slate-500'}`}
              >
                <button
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all ${q.completed ? `${meta.border}` : 'border-slate-600'}`}
                  onClick={() => !q.completed && onCompleteQuest(q.id)}
                  disabled={q.completed}
                >
                  {q.completed ? '✓' : '◎'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs">{meta.icon}</span>
                    <span className={`font-pixel ${meta.color}`} style={{ fontSize: '8px' }}>{meta.label.toUpperCase()}</span>
                    {q.isAI && <span className="text-slate-600" style={{ fontSize: '8px' }}>✨</span>}
                  </div>
                  <div className="text-xs text-slate-200 leading-tight">{q.title}</div>
                </div>
                {q.completed && <span className={`text-xs ${meta.color}`}>+10 XP</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Weekly Tasks ──────────────────────────────────────────────────────────────
function WeeklyTasksCard({ weeklyQuest, weekKey, onCompleteTask, loading }) {
  if (loading && !weeklyQuest) {
    return (
      <div className="rpg-panel p-4 border border-amber-900">
        <div className="text-xs text-slate-500 animate-pulse">Generating weekly quests...</div>
      </div>
    )
  }
  if (!weeklyQuest || weeklyQuest.weekKey !== weekKey) return null

  const tasks = weeklyQuest.tasks || []
  const doneCount = tasks.filter(t => t.completed).length
  const allDone = doneCount === tasks.length

  return (
    <div className={`rpg-panel p-4 border ${allDone ? 'border-green-800' : 'border-amber-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-pixel text-xs text-amber-400" style={{ fontSize: '9px' }}>📜 WEEKLY QUESTS</div>
        <span className="text-xs text-slate-500">{doneCount}/{tasks.length} done</span>
      </div>

      <div className="space-y-3">
        {tasks.map(task => {
          const icon = WEEKLY_TASK_ICONS[task.category] || '📜'
          return (
            <div
              key={task.id}
              className={`p-3 rounded border transition-all ${task.completed ? 'border-green-800 bg-green-950 opacity-75' : 'border-slate-700'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 ${task.completed ? 'bg-green-700 border-green-500' : 'border-slate-600 hover:border-amber-500'}`}
                  onClick={() => !task.completed && onCompleteTask(task.id)}
                  disabled={task.completed}
                >
                  {task.completed ? '✓' : icon}
                </button>
                <div className="flex-1">
                  <div className="text-xs text-slate-200 font-semibold mb-0.5">{task.title}</div>
                  <div className="text-xs text-slate-400 leading-relaxed">{task.description}</div>
                  {task.completed && <div className="text-xs text-green-400 mt-1">+50 XP</div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!allDone && (
        <div className="text-xs text-red-500 mt-3" style={{ fontSize: '9px' }}>
          ⚠ Incomplete tasks drain HP at week end
        </div>
      )}
    </div>
  )
}

// ── Weekly Boss ───────────────────────────────────────────────────────────────
function WeeklyBossSection({ weeklyBoss, bossLoading, weekKey }) {
  const activeBoss = weeklyBoss?.weekKey === weekKey ? weeklyBoss : null
  const bossHP = Math.round(100 - (activeBoss?.totalDamage || 0))
  const bossDead = bossHP <= 0
  const hpRatio = Math.max(0, bossHP / 100)
  const workoutBonus = activeBoss?.workoutBonus || 0

  return (
    <div className={`rpg-panel p-4 ${bossDead ? 'border border-green-800' : 'border border-red-900'}`}>
      <div className="font-pixel text-xs text-red-400 mb-3" style={{ fontSize: '9px' }}>🐲 WEEKLY BOSS</div>

      {bossLoading && !activeBoss ? (
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-pulse">👁️</div>
          <div className="text-xs text-slate-500">Summoning this week's boss...</div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-4 mb-3">
            <div className="flex-shrink-0">
              {bossDead
                ? <div className="text-4xl">💀</div>
                : <PixelMonster boss={activeBoss || FALLBACK_BOSS} size={72} hpRatio={hpRatio} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-200 font-semibold mb-1">
                {activeBoss?.name || FALLBACK_BOSS.name}
                {bossDead && <span className="text-green-400 ml-2">— DEFEATED</span>}
              </div>
              {!bossDead && (
                <>
                  <div className="text-xs text-slate-500 mb-1">HP {bossHP}/100</div>
                  <div className="stat-bar mb-1">
                    <div className="stat-bar-fill bg-red-700 transition-all duration-700" style={{ width: `${bossHP}%` }} />
                  </div>
                </>
              )}
              {activeBoss?.weakness && (
                <div className="text-xs text-amber-600">Weak to: <span className="text-amber-400">{activeBoss.weakness}</span></div>
              )}
              {workoutBonus > 0 && (
                <div className="text-xs text-violet-400 mt-1">💪 +{workoutBonus} workout dmg</div>
              )}
            </div>
          </div>

          {activeBoss?.lore && (
            <div className="text-xs text-slate-500 italic border-t border-slate-800 pt-2 mb-2">{activeBoss.lore}</div>
          )}

          {!bossDead && (
            <div className="text-xs text-red-500" style={{ fontSize: '9px' }}>
              ⚠ Escapes Sunday midnight — HP penalty if alive
            </div>
          )}
          {bossDead && <div className="text-xs text-green-400">Boss slain. +50 XP. New boss Monday.</div>}
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Quests() {
  const {
    habits, character, openaiKey,
    gainXP, addInventoryItem, inventory, notifications, clearNotification,
    weeklyBoss, setWeeklyBoss, dealWeeklyBossDamage,
    dailyQuests, setDailyQuests, completeDailyQuest,
    weeklyQuest, setWeeklyQuest, completeWeeklyTask,
    checkDailyBossExpiry, checkWeeklyBossExpiry,
  } = useStore()

  const [bossLoading, setBossLoading] = useState(false)
  const [questsLoading, setQuestsLoading] = useState(false)
  const [weeklyQuestLoading, setWeeklyQuestLoading] = useState(false)
  const [narrative, setNarrative] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]
  const weekKey = getWeekKey()
  const todayDay = new Date().getDay()

  const dailyHabits = habits.filter(h =>
    h.type === 'positive' && (!h.days?.length || h.days.includes(todayDay))
  )
  const completedHabits = dailyHabits.filter(h => h.completions?.[todayStr])
  const habitPct = dailyHabits.length
    ? Math.round((completedHabits.length / dailyHabits.length) * 100)
    : 100  // no habits scheduled = full credit

  // Compute combined pct for weekly boss damage
  const todayQuests = dailyQuests?.date === todayStr ? (dailyQuests.quests || []) : []
  const questPct = todayQuests.length
    ? Math.round((todayQuests.filter(q => q.completed).length / todayQuests.length) * 100)
    : 100
  const combinedPct = Math.round((habitPct + questPct) / 2)

  const classIcon = { Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️' }[character.class] || '⚔️'

  // Run expiry checks on mount
  useEffect(() => {
    checkDailyBossExpiry()
    checkWeeklyBossExpiry()
  }, [])

  // ── Daily quests ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (dailyQuests?.date === todayStr) return
    if (!openaiKey || !character.class) {
      setDailyQuests(todayStr, getDailyQuestsStatic(todayStr))
      return
    }
    const cacheKey = `daily_quests_${todayStr}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setDailyQuests(todayStr, JSON.parse(cached)); return } catch (e) {}
    }
    setQuestsLoading(true)
    generateDailyQuests(openaiKey, { character, dateStr: todayStr })
      .then(quests => {
        setDailyQuests(todayStr, quests)
        localStorage.setItem(cacheKey, JSON.stringify(quests))
      })
      .catch(() => setDailyQuests(todayStr, getDailyQuestsStatic(todayStr)))
      .finally(() => setQuestsLoading(false))
  }, [openaiKey, character.class, todayStr])

  // ── Weekly boss ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!openaiKey || !character.class) return
    if (weeklyBoss?.weekKey === weekKey) return
    const cacheKey = `weekly_boss_${weekKey}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setWeeklyBoss({ ...JSON.parse(cached), weekKey, dailyDamage: {}, totalDamage: 0 }); return } catch (e) {}
    }
    setBossLoading(true)
    generateWeeklyBoss(openaiKey, { character, weekKey })
      .then(bd => {
        const validTypes = ['golem', 'dragon', 'specter', 'demon', 'beast']
        const type = validTypes.includes(bd.type) ? bd.type : 'golem'
        const boss = { ...bd, type, weekKey, dailyDamage: {}, totalDamage: 0 }
        setWeeklyBoss(boss)
        localStorage.setItem(cacheKey, JSON.stringify({ ...bd, type }))
      })
      .catch(() => setWeeklyBoss({ ...FALLBACK_BOSS, weekKey, dailyDamage: {}, totalDamage: 0 }))
      .finally(() => setBossLoading(false))
  }, [openaiKey, character.class, weekKey])

  // ── Weekly quests (2-3 tasks) ─────────────────────────────────────────────
  useEffect(() => {
    if (!openaiKey || !character.class) return
    if (weeklyQuest?.weekKey === weekKey) return
    const cacheKey = `weekly_quests_${weekKey}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setWeeklyQuest(JSON.parse(cached)); return } catch (e) {}
    }
    setWeeklyQuestLoading(true)
    generateWeeklyQuests(openaiKey, { character, weekKey })
      .then(q => {
        setWeeklyQuest(q)
        localStorage.setItem(cacheKey, JSON.stringify(q))
      })
      .catch(() => {})
      .finally(() => setWeeklyQuestLoading(false))
  }, [openaiKey, character.class, weekKey])

  // ── Weekly boss: damage from combined daily performance ───────────────────
  useEffect(() => {
    if (weeklyBoss?.weekKey === weekKey) {
      dealWeeklyBossDamage(combinedPct)
    }
  }, [combinedPct, weeklyBoss?.weekKey])

  // ── Weekly boss kill reward ───────────────────────────────────────────────
  const bossHP = Math.round(100 - (weeklyBoss?.totalDamage || 0))
  const bossDead = bossHP <= 0
  useEffect(() => {
    if (bossDead) {
      const cacheKey = `boss_drop_${weekKey}`
      if (localStorage.getItem(cacheKey)) return
      localStorage.setItem(cacheKey, '1')
      gainXP(50, 'boss_kill')
      const item = rollItemDrop()
      if (item) addInventoryItem(item)
    }
  }, [bossDead])

  // ── Habit quest narrative ─────────────────────────────────────────────────
  useEffect(() => {
    if (!openaiKey || !character.class || !dailyHabits.length) return
    const cacheKey = `quest_${todayStr}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setNarrative(cached); return }
    generateQuestNarrative(openaiKey, { character, habits: dailyHabits })
      .then(msg => { setNarrative(msg); localStorage.setItem(cacheKey, msg) })
      .catch(() => {})
  }, [openaiKey, character.class])

  const handleCompleteQuest = (questId) => {
    completeDailyQuest(questId)
    gainXP(10, 'daily_quest')
  }

  const handleCompleteWeeklyTask = (taskId) => {
    completeWeeklyTask(taskId)
    gainXP(50, 'weekly_quest')
  }

  const dropNotif = notifications.find(n => n.type === 'drop')

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">QUESTS</h1>
        <div className="text-xs text-slate-500">{completedHabits.length}/{dailyHabits.length} habits</div>
      </div>

      {dropNotif && (
        <div className="rpg-panel p-4 border border-blue-700 text-center">
          <div className="text-2xl mb-1">💎</div>
          <div className="font-pixel text-xs text-blue-400 mb-1" style={{ fontSize: '9px' }}>ITEM DROP</div>
          <div className="text-xs text-slate-300">{dropNotif.message}</div>
          <button className="rpg-btn-secondary mt-3 text-xs" onClick={() => clearNotification(dropNotif.id)}>Got it</button>
        </div>
      )}

      {/* Daily battle: quests + habits combined */}
      <DailySection
        character={character}
        dailyQuests={dailyQuests}
        habitPct={habitPct}
        onCompleteQuest={handleCompleteQuest}
        loading={questsLoading}
      />

      {/* Habit quests list */}
      {dailyHabits.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-violet-400 mb-3" style={{ fontSize: '9px' }}>🗡️ HABIT QUESTS</div>
          {narrative && (
            <div className="text-xs text-slate-400 italic mb-3 border-l-2 border-amber-800 pl-3 leading-relaxed">{narrative}</div>
          )}
          <div className="space-y-2">
            {dailyHabits.map(h => {
              const done = h.completions?.[todayStr]
              return (
                <div key={h.id} className={`flex items-center gap-3 p-3 rounded border ${done ? 'border-green-800 bg-green-950' : 'border-slate-700'}`}>
                  <span className="text-base">{done ? '✅' : classIcon}</span>
                  <div className="flex-1">
                    <div className="text-xs text-slate-200">{h.name}</div>
                    {done && <div className="text-xs text-green-400">Done</div>}
                  </div>
                  {h.streak > 0 && <span className="text-xs fire-streak">🔥{h.streak}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Weekly quests (2-3 tasks) */}
      <WeeklyTasksCard
        weeklyQuest={weeklyQuest}
        weekKey={weekKey}
        onCompleteTask={handleCompleteWeeklyTask}
        loading={weeklyQuestLoading}
      />

      {/* Weekly boss */}
      <WeeklyBossSection weeklyBoss={weeklyBoss} bossLoading={bossLoading} weekKey={weekKey} />

      {/* Inventory */}
      {(inventory || []).length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-blue-400 mb-3" style={{ fontSize: '9px' }}>💎 INVENTORY ({inventory.length})</div>
          <div className="space-y-1">
            {(inventory || []).map(item => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="text-slate-300">💎 {item.name}</span>
                <span className="text-slate-600">{item.obtainedAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
