import React, { useState, useEffect } from 'react'
import useStore from '../../store/useStore'
import { generateQuestNarrative } from '../../utils/ai'

export default function Quests() {
  const { habits, character, openaiKey, gainXP } = useStore()
  const [narrative, setNarrative] = useState('')
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const dailyHabits = habits.filter(h => h.frequency === 'daily' && h.type === 'positive')
  const completed = dailyHabits.filter(h => h.completions?.[today])
  const pct = dailyHabits.length ? Math.round((completed.length / dailyHabits.length) * 100) : 0

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

  const bossHp = 100 - pct
  const classIcon = { Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️' }[character.class] || '⚔️'

  return (
    <div className="space-y-4 pb-6">
      <h1 className="font-pixel text-xs text-amber-400">QUESTS</h1>

      {/* Quest narrative */}
      {(narrative || loading) && (
        <div className="rpg-panel p-4 border border-amber-700 scroll-unfurl">
          <div className="font-pixel text-xs text-amber-400 mb-2">📜 QUEST BRIEFING</div>
          {loading ? (
            <div className="text-xs text-slate-500">Generating quest narrative...</div>
          ) : (
            <div className="text-xs text-slate-300 leading-relaxed italic">{narrative}</div>
          )}
        </div>
      )}

      {/* Daily Progress / Boss Battle */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-red-400 mb-3">⚔️ DAILY BOSS</div>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-3xl">🐉</div>
          <div className="flex-1">
            <div className="text-xs text-slate-400 mb-1">The Sloth Dragon — HP {bossHp}/100</div>
            <div className="stat-bar">
              <div className="stat-bar-fill bg-red-600" style={{ width: `${bossHp}%` }} />
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500">Complete habits to deal damage! {pct}% defeated.</div>
      </div>

      {/* Quest list */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-violet-400 mb-3">ACTIVE QUESTS</div>
        {dailyHabits.length === 0 ? (
          <div className="text-xs text-slate-500">Add habits to generate quests.</div>
        ) : (
          <div className="space-y-2">
            {dailyHabits.map(h => {
              const done = h.completions?.[today]
              return (
                <div key={h.id} className={`flex items-center gap-3 p-3 rounded border ${done ? 'border-green-800 bg-green-950' : 'border-slate-700'}`}>
                  <span className="text-lg">{done ? '✅' : classIcon}</span>
                  <div className="flex-1">
                    <div className="text-xs text-slate-200">{h.name}</div>
                    {done && <div className="text-xs text-green-400">Quest Complete! +15 XP</div>}
                  </div>
                  {h.streak > 0 && <span className="text-xs fire-streak">🔥{h.streak}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Completion reward */}
      {pct === 100 && (
        <div className="rpg-panel p-6 text-center border border-amber-600 animate-pulse">
          <div className="text-3xl mb-2">🏆</div>
          <div className="font-pixel text-xs text-amber-400 mb-2">DAILY QUEST COMPLETE!</div>
          <div className="text-xs text-slate-300">All quests finished! Boss defeated. +50 Gold!</div>
        </div>
      )}
    </div>
  )
}
