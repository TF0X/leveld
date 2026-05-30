import React, { useState, useEffect } from 'react'
import useStore from '../../store/useStore'
import { generateQuestNarrative } from '../../utils/ai'
import { ANTAGONIST, rollItemDrop } from '../../utils/antagonist'

function getBossDialogue(pct) {
  const day = new Date().getDay() // 0=Sun, 1=Mon...
  const hp = 100 - pct

  if (day === 1) return ANTAGONIST.bossDialogue.monday()
  if (day === 4) {
    return hp > 50
      ? ANTAGONIST.bossDialogue.thursday_high_hp(hp)
      : ANTAGONIST.bossDialogue.thursday_low_hp(hp)
  }
  if (day === 0) {
    return hp > 0
      ? ANTAGONIST.bossDialogue.sunday_alive()
      : ANTAGONIST.bossDialogue.sunday_dead()
  }
  return ANTAGONIST.bossDialogue.daily_taunt(hp)
}

export default function Quests() {
  const { habits, character, openaiKey, gainXP, addInventoryItem, inventory, notifications, clearNotification } = useStore()
  const [narrative, setNarrative] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropReveal, setDropReveal] = useState(null)
  const today = new Date().toISOString().split('T')[0]

  const dailyHabits = habits.filter(h => h.frequency === 'daily' && h.type === 'positive')
  const completed = dailyHabits.filter(h => h.completions?.[today])
  const pct = dailyHabits.length ? Math.round((completed.length / dailyHabits.length) * 100) : 0
  const bossHP = 100 - pct
  const classIcon = { Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️' }[character.class] || '⚔️'

  useEffect(() => {
    if (!openaiKey || !character.class || !dailyHabits.length) return
    const cacheKey = `quest_${today}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setNarrative(cached); return }
    setLoading(true)
    generateQuestNarrative(openaiKey, { character, habits: dailyHabits })
      .then(msg => { setNarrative(msg); localStorage.setItem(cacheKey, msg) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [openaiKey, character.class])

  // Check boss defeat and roll item drop
  useEffect(() => {
    if (pct === 100) {
      const cacheKey = `boss_drop_${today}`
      if (localStorage.getItem(cacheKey)) return
      localStorage.setItem(cacheKey, '1')
      gainXP(50, 'boss_kill')
      const item = rollItemDrop()
      if (item) {
        addInventoryItem(item)
        setDropReveal(item)
      }
    }
  }, [pct])

  const bossDead = bossHP <= 0
  const dropNotif = notifications.find(n => n.type === 'drop')

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">QUESTS</h1>
        <div className="text-xs text-slate-500">{completed.length}/{dailyHabits.length} done</div>
      </div>

      {/* Item drop notification */}
      {dropNotif && (
        <div className="rpg-panel p-4 border border-blue-700 text-center">
          <div className="text-2xl mb-1">💎</div>
          <div className="font-pixel text-xs text-blue-400 mb-1" style={{ fontSize: '9px' }}>ITEM DROP</div>
          <div className="text-xs text-slate-300">{dropNotif.message}</div>
          <button className="rpg-btn-secondary mt-3 text-xs" onClick={() => clearNotification(dropNotif.id)}>Got it</button>
        </div>
      )}

      {/* Quest narrative */}
      {(narrative || loading) && (
        <div className="rpg-panel p-4 border border-amber-800">
          <div className="font-pixel text-xs text-amber-400 mb-2" style={{ fontSize: '9px' }}>📜 QUEST BRIEFING</div>
          {loading
            ? <div className="text-xs text-slate-500">Generating...</div>
            : <div className="text-xs text-slate-300 leading-relaxed italic">{narrative}</div>}
        </div>
      )}

      {/* Boss battle */}
      <div className={`rpg-panel p-4 ${bossDead ? 'border border-green-800' : 'border border-red-900'}`}>
        <div className="font-pixel text-xs text-red-400 mb-3" style={{ fontSize: '9px' }}>⚔️ WEEKLY BOSS</div>
        <div className="flex items-start gap-3 mb-3">
          <div className="text-4xl">{bossDead ? '💀' : '🐉'}</div>
          <div className="flex-1">
            <div className="text-xs text-slate-400 mb-1">
              The Sloth Dragon — {bossDead ? 'DEFEATED' : `HP ${bossHP}/100`}
            </div>
            {!bossDead && (
              <div className="stat-bar">
                <div className="stat-bar-fill bg-red-700 transition-all duration-700" style={{ width: `${bossHP}%` }} />
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500 italic border-t border-slate-800 pt-3">
          {bossDead ? ANTAGONIST.bossDialogue.sunday_dead() : getBossDialogue(pct)}
        </div>
        {bossDead && <div className="text-xs text-green-400 mt-2">Boss defeated. +50 XP + item drop chance.</div>}
      </div>

      {/* Quest list */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-violet-400 mb-3" style={{ fontSize: '9px' }}>ACTIVE QUESTS</div>
        {dailyHabits.length === 0 ? (
          <div className="text-xs text-slate-500">No habits = no quests. Add some.</div>
        ) : (
          <div className="space-y-2">
            {dailyHabits.map(h => {
              const done = h.completions?.[today]
              return (
                <div key={h.id} className={`flex items-center gap-3 p-3 rounded border ${done ? 'border-green-800 bg-green-950' : 'border-slate-700'}`}>
                  <span className="text-base">{done ? '✅' : classIcon}</span>
                  <div className="flex-1">
                    <div className="text-xs text-slate-200">{h.name}</div>
                    {done && <div className="text-xs text-green-400">Quest Complete!</div>}
                  </div>
                  {h.streak > 0 && <span className="text-xs fire-streak">🔥{h.streak}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Inventory */}
      {(inventory || []).length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-blue-400 mb-3" style={{ fontSize: '9px' }}>💎 INVENTORY ({inventory.length} items)</div>
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
