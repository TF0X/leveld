import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { testApiKey } from '../../utils/ai'

export default function Settings() {
  const { character, openaiKey, setOpenaiKey, setCharacter } = useStore()
  const [key, setKey] = useState(openaiKey || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saved, setSaved] = useState(false)

  const testKey = async () => {
    setTesting(true)
    setTestResult(null)
    const res = await testApiKey(key)
    setTesting(false)
    setTestResult(res)
  }

  const saveKey = () => {
    setOpenaiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const exportData = () => {
    const data = localStorage.getItem('ascendrpg-v1')
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascendrpg-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          localStorage.setItem('ascendrpg-v1', reader.result)
          window.location.reload()
        } catch {
          alert('Import failed. Invalid file.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const resetAll = () => {
    if (confirm('Are you sure? This will DELETE all your progress permanently.')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <h1 className="font-pixel text-xs text-amber-400">SETTINGS</h1>

      {/* Character Info */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-violet-400 mb-3">CHARACTER</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-slate-400">Name</span><span>{character.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Class</span><span className="text-violet-400">{character.class}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Level</span><span className="text-amber-400">{character.level}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Streak</span><span className="fire-streak">{character.streak} days</span></div>
        </div>
      </div>

      {/* OpenAI Key */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-violet-400 mb-3">AI CONFIGURATION</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="flex gap-2">
            <button className="rpg-btn-secondary flex-1 text-xs" onClick={testKey} disabled={testing || !key}>
              {testing ? '⏳ Testing...' : '🔌 Test'}
            </button>
            <button className="rpg-btn-primary flex-1 text-xs" onClick={saveKey} disabled={!key}>
              {saved ? '✓ Saved!' : 'Save Key'}
            </button>
          </div>
          {testResult && (
            <div className={`text-xs p-2 rounded ${testResult.ok ? 'text-green-400 bg-green-950' : 'text-red-400 bg-red-950'}`}>
              {testResult.ok ? '✓ Working' : `✗ ${testResult.error}`}
            </div>
          )}
          {openaiKey && <div className="text-xs text-green-400">✓ AI features enabled</div>}
        </div>
      </div>

      {/* Data */}
      <div className="rpg-panel p-4">
        <div className="font-pixel text-xs text-violet-400 mb-3">DATA</div>
        <div className="space-y-2">
          <button className="rpg-btn-secondary w-full text-xs" onClick={exportData}>
            ⬇ Export JSON Backup
          </button>
          <button className="rpg-btn-secondary w-full text-xs" onClick={importData}>
            ⬆ Import JSON Backup
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rpg-panel p-4 border border-red-900">
        <div className="font-pixel text-xs text-red-400 mb-3">⚠ DANGER ZONE</div>
        <button className="rpg-btn-danger w-full text-xs" onClick={resetAll}>
          Reset All Progress
        </button>
        <div className="text-xs text-slate-600 mt-2">This cannot be undone.</div>
      </div>

      <div className="text-center text-xs text-slate-700 pt-4">
        AscendRPG v1.0 • Built for the grind 🗡️
      </div>
    </div>
  )
}
