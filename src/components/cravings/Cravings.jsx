import React, { useState, useEffect, useRef, useCallback } from 'react'
import useStore from '../../store/useStore'
import { getCravingMessage } from '../../utils/ai'

// ── Memory Pattern Game ───────────────────────────────────────────────────────
function MemoryGame() {
  const COLORS = ['#7c3aed', '#dc2626', '#16a34a', '#d97706']
  const LABELS = ['🔮', '🔥', '🌿', '⚡']
  const [seq, setSeq] = useState([])
  const [input, setInput] = useState([])
  const [lit, setLit] = useState(null)
  const [phase, setPhase] = useState('start') // start | show | input | wrong | levelup
  const [score, setScore] = useState(0)
  const timeouts = useRef([])

  const clearTOs = () => { timeouts.current.forEach(clearTimeout); timeouts.current = [] }

  const showSequence = useCallback((sequence) => {
    setPhase('show')
    setInput([])
    sequence.forEach((cell, i) => {
      const t1 = setTimeout(() => setLit(cell), i * 700)
      const t2 = setTimeout(() => setLit(null), i * 700 + 500)
      timeouts.current.push(t1, t2)
    })
    const t3 = setTimeout(() => setPhase('input'), sequence.length * 700 + 300)
    timeouts.current.push(t3)
  }, [])

  const startRound = useCallback((prev = []) => {
    const next = [...prev, Math.floor(Math.random() * 4)]
    setSeq(next)
    showSequence(next)
  }, [showSequence])

  useEffect(() => {
    return () => clearTOs()
  }, [])

  const tap = (i) => {
    if (phase !== 'input') return
    setLit(i)
    const t = setTimeout(() => setLit(null), 200)
    timeouts.current.push(t)

    const next = [...input, i]
    if (next[next.length - 1] !== seq[next.length - 1]) {
      setPhase('wrong')
      const t2 = setTimeout(() => { setScore(0); setSeq([]); setPhase('start') }, 1000)
      timeouts.current.push(t2)
      return
    }
    if (next.length === seq.length) {
      setScore(s => s + 1)
      setPhase('levelup')
      const t2 = setTimeout(() => startRound(seq), 900)
      timeouts.current.push(t2)
    } else {
      setInput(next)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="font-pixel text-violet-400" style={{ fontSize: '9px' }}>ROUND {seq.length || 0}</span>
        <span className="font-pixel text-amber-400" style={{ fontSize: '9px' }}>SCORE {score}</span>
        {phase === 'wrong' && <span className="font-pixel text-red-400" style={{ fontSize: '9px' }}>WRONG!</span>}
        {phase === 'levelup' && <span className="font-pixel text-green-400" style={{ fontSize: '9px' }}>✓ NEXT!</span>}
        {phase === 'show' && <span className="text-slate-400 text-xs">Watch…</span>}
        {phase === 'input' && <span className="text-slate-400 text-xs">Repeat it</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {COLORS.map((color, i) => (
          <button
            key={i}
            className="rounded-xl flex items-center justify-center text-3xl transition-all"
            style={{
              height: 80,
              background: lit === i ? color : `${color}30`,
              border: `2px solid ${lit === i ? color : `${color}60`}`,
              transform: lit === i ? 'scale(1.05)' : 'scale(1)',
              boxShadow: lit === i ? `0 0 20px ${color}80` : 'none',
            }}
            onClick={() => tap(i)}
            disabled={phase !== 'input'}
          >
            {LABELS[i]}
          </button>
        ))}
      </div>

      {phase === 'start' && (
        <button className="rpg-btn-primary text-xs px-6 py-3" onClick={() => startRound()}>
          Start Memory Game
        </button>
      )}
    </div>
  )
}

// ── Flappy Bird ───────────────────────────────────────────────────────────────
function FlappyGame() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)

  const newState = () => ({
    bird: { y: 160, vy: 0 },
    pipes: [],
    score: 0,
    alive: true,
    started: false,
    frame: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const G = 0.45, JUMP = -8, GAP = 115, PW = 38, BS = 18

    stateRef.current = newState()

    const draw = () => {
      const g = stateRef.current
      if (!g.started) {
        ctx.fillStyle = '#0f0f1a'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(50, H / 2 - BS / 2, BS, BS)
        ctx.fillStyle = '#64748b'
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Tap to start flapping', W / 2, H / 2 + 50)
        return
      }

      g.frame++
      g.bird.vy += G
      g.bird.y += g.bird.vy

      if (g.frame % 85 === 0) {
        const gapY = 55 + Math.random() * (H - 170)
        g.pipes.push({ x: W, gapY })
      }
      g.pipes = g.pipes.map(p => ({ ...p, x: p.x - 2.8 })).filter(p => p.x > -PW)

      // Collision
      if (g.bird.y < 0 || g.bird.y + BS > H - 20) g.alive = false
      g.pipes.forEach(p => {
        if (50 + BS > p.x && 50 < p.x + PW) {
          if (g.bird.y < p.gapY || g.bird.y + BS > p.gapY + GAP) g.alive = false
        }
      })
      g.score = g.pipes.filter(p => p.x + PW < 50).length

      // Draw
      ctx.fillStyle = '#0f0f1a'
      ctx.fillRect(0, 0, W, H)

      // Ground
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, H - 20, W, 20)

      // Pipes
      g.pipes.forEach(p => {
        ctx.fillStyle = '#166534'
        ctx.fillRect(p.x, 0, PW, p.gapY)
        ctx.fillRect(p.x, p.gapY + GAP, PW, H)
        ctx.fillStyle = '#15803d'
        ctx.fillRect(p.x - 3, p.gapY - 12, PW + 6, 12)
        ctx.fillRect(p.x - 3, p.gapY + GAP, PW + 6, 12)
      })

      // Bird
      ctx.fillStyle = g.alive ? '#fbbf24' : '#ef4444'
      ctx.fillRect(50, g.bird.y, BS, BS)
      ctx.fillStyle = '#fff'
      ctx.fillRect(50 + BS - 5, g.bird.y + 3, 4, 4)
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(50 + BS - 4, g.bird.y + 4, 2, 2)
      ctx.fillStyle = '#f97316'
      ctx.fillRect(50 + BS - 1, g.bird.y + 7, 5, 4)

      // Score
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(g.score, W / 2, 28)

      if (!g.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.fillRect(0, H / 2 - 40, W, 80)
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 14px monospace'
        ctx.fillText('DEAD  Score: ' + g.score, W / 2, H / 2)
        ctx.fillStyle = '#94a3b8'
        ctx.font = '12px monospace'
        ctx.fillText('Tap to restart', W / 2, H / 2 + 24)
      }
    }

    const loop = () => {
      draw()
      animRef.current = requestAnimationFrame(loop)
    }

    const handleTap = () => {
      const g = stateRef.current
      if (!g.alive) { stateRef.current = newState(); stateRef.current.started = true; return }
      if (!g.started) { g.started = true; return }
      g.bird.vy = JUMP
    }

    canvas.addEventListener('click', handleTap)
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap() }, { passive: false })
    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('click', handleTap)
    }
  }, [])

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={300} height={340}
        className="rounded-lg"
        style={{ touchAction: 'none', cursor: 'pointer', imageRendering: 'pixelated' }} />
      <div className="text-xs text-slate-600 mt-1">Tap to flap</div>
    </div>
  )
}

// ── Stack Tower ───────────────────────────────────────────────────────────────
function StackGame() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)

  const BLOCK_H = 18
  const COLORS = ['#7c3aed', '#6d28d9', '#5b21b6', '#8b5cf6', '#a78bfa', '#4c1d95', '#c4b5fd']

  const newState = (W) => ({
    stack: [{ x: (W - 160) / 2, w: 160, color: '#334155' }],
    mover: { x: 0, w: 160, dir: 1, speed: 3 },
    score: 0,
    alive: true,
    scrollY: 0,
    colorIdx: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    stateRef.current = newState(W)

    const getBlockY = (stackIdx, scrollY) => H - 30 - (stackIdx + 1) * BLOCK_H + scrollY

    const drop = () => {
      const g = stateRef.current
      if (!g.alive) { stateRef.current = newState(W); return }

      const top = g.stack[g.stack.length - 1]
      const m = g.mover
      const left = Math.max(top.x, m.x)
      const right = Math.min(top.x + top.w, m.x + m.w)
      const overlap = right - left

      if (overlap <= 4) { g.alive = false; return }

      g.colorIdx = (g.colorIdx + 1) % COLORS.length
      g.stack.push({ x: left, w: overlap, color: COLORS[g.colorIdx] })
      g.score++
      const newSpeed = Math.min(9, 3 + g.score * 0.25)
      g.mover = { x: 0, w: overlap, dir: 1, speed: newSpeed }

      if (g.stack.length > 12) g.scrollY += BLOCK_H
    }

    const loop = () => {
      const g = stateRef.current

      // Move mover
      if (g.alive) {
        g.mover.x += g.mover.dir * g.mover.speed
        if (g.mover.x <= 0) g.mover.dir = 1
        if (g.mover.x + g.mover.w >= W) g.mover.dir = -1
      }

      ctx.fillStyle = '#0f0f1a'
      ctx.fillRect(0, 0, W, H)

      // Draw stack
      g.stack.forEach((block, i) => {
        const y = getBlockY(i, g.scrollY)
        if (y < H && y > -BLOCK_H) {
          ctx.fillStyle = block.color
          ctx.fillRect(block.x, y, block.w, BLOCK_H - 2)
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.fillRect(block.x, y, block.w, 3)
        }
      })

      // Draw mover
      if (g.alive) {
        const moverY = getBlockY(g.stack.length, g.scrollY)
        if (moverY > 0) {
          ctx.fillStyle = '#fbbf24'
          ctx.fillRect(g.mover.x, moverY, g.mover.w, BLOCK_H - 2)
          ctx.fillStyle = 'rgba(255,255,255,0.2)'
          ctx.fillRect(g.mover.x, moverY, g.mover.w, 3)
        }
      }

      // Ground
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, H - 28, W, 28)

      // Score
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 15px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Score: ' + g.score, W / 2, 26)

      if (!g.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        ctx.fillRect(0, H / 2 - 38, W, 76)
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 14px monospace'
        ctx.fillText('MISSED!  Score: ' + g.score, W / 2, H / 2)
        ctx.fillStyle = '#94a3b8'
        ctx.font = '12px monospace'
        ctx.fillText('Tap to restart', W / 2, H / 2 + 24)
      }

      animRef.current = requestAnimationFrame(loop)
    }

    const handleTap = () => drop()
    canvas.addEventListener('click', handleTap)
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drop() }, { passive: false })
    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      canvas.removeEventListener('click', handleTap)
    }
  }, [])

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={300} height={340}
        className="rounded-lg"
        style={{ touchAction: 'none', cursor: 'pointer' }} />
      <div className="text-xs text-slate-600 mt-1">Tap to drop the block</div>
    </div>
  )
}

// ── Racing Dodge ──────────────────────────────────────────────────────────────
function RacingGame() {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)

  const newState = (W, H) => ({
    carX: W / 2 - 16,
    targetX: W / 2 - 16,
    obstacles: [],
    score: 0,
    alive: true,
    started: false,
    frame: 0,
    roadY: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const LANE_W = W / 3
    const CAR_W = 28, CAR_H = 42

    stateRef.current = newState(W, H)

    const moveLeft = () => {
      const g = stateRef.current
      if (!g.alive) { stateRef.current = newState(W, H); return }
      if (!g.started) { g.started = true; return }
      g.targetX = Math.max(8, g.targetX - LANE_W)
    }

    const moveRight = () => {
      const g = stateRef.current
      if (!g.alive) { stateRef.current = newState(W, H); return }
      if (!g.started) { g.started = true; return }
      g.targetX = Math.min(W - CAR_W - 8, g.targetX + LANE_W)
    }

    // expose for buttons
    canvas._moveLeft = moveLeft
    canvas._moveRight = moveRight

    const loop = () => {
      const g = stateRef.current

      if (g.started && g.alive) {
        g.frame++
        g.score = Math.floor(g.frame / 8)
        const spd = 4 + Math.floor(g.score / 40) * 0.6
        g.roadY = (g.roadY + spd) % 40
        g.carX += (g.targetX - g.carX) * 0.18

        const spawnRate = Math.max(28, 65 - Math.floor(g.score / 20) * 3)
        if (g.frame % spawnRate === 0) {
          const laneIdx = Math.floor(Math.random() * 3)
          g.obstacles.push({
            x: laneIdx * LANE_W + (LANE_W - CAR_W) / 2,
            y: -CAR_H,
            color: ['#ef4444', '#f97316', '#dc2626'][Math.floor(Math.random() * 3)],
          })
        }
        g.obstacles = g.obstacles
          .map(o => ({ ...o, y: o.y + spd }))
          .filter(o => o.y < H + CAR_H)

        // Collision
        g.obstacles.forEach(o => {
          if (o.y + CAR_H > H - 80 && o.y < H - 38 &&
              o.x + CAR_W > g.carX + 4 && o.x < g.carX + CAR_W - 4) {
            g.alive = false
          }
        })
      }

      // Draw road
      ctx.fillStyle = '#18181f'
      ctx.fillRect(0, 0, W, H)

      // Lane markings
      ctx.strokeStyle = '#2d2d45'
      ctx.setLineDash([20, 20])
      ctx.lineWidth = 2
      for (let l = 1; l < 3; l++) {
        ctx.beginPath()
        ctx.moveTo(l * LANE_W, -g.roadY)
        ctx.lineTo(l * LANE_W, H)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // Obstacles
      g.obstacles.forEach(o => {
        ctx.fillStyle = o.color
        ctx.fillRect(o.x, o.y, CAR_W, CAR_H)
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(o.x + 3, o.y + 5, CAR_W - 6, 10)
        ctx.fillRect(o.x + 3, o.y + CAR_H - 15, CAR_W - 6, 10)
      })

      // Player car
      if (!g.started) {
        ctx.fillStyle = '#7c3aed'
        ctx.fillRect(W / 2 - 16, H - 90, CAR_W, CAR_H)
      } else {
        ctx.fillStyle = g.alive ? '#7c3aed' : '#4c1d95'
        ctx.fillRect(g.carX, H - 90, CAR_W, CAR_H)
        ctx.fillStyle = '#a78bfa'
        ctx.fillRect(g.carX + 3, H - 87, CAR_W - 6, 10)
        ctx.fillRect(g.carX + 3, H - 65, CAR_W - 6, 10)
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(g.carX + 2, H - 90, 6, 6)
        ctx.fillRect(g.carX + CAR_W - 8, H - 90, 6, 6)
      }

      // Score
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(g.score + 'm', W / 2, 26)

      if (!g.started) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, H / 2 - 30, W, 60)
        ctx.fillStyle = '#a78bfa'
        ctx.font = 'bold 13px monospace'
        ctx.fillText('Tap ◀ ▶ to start', W / 2, H / 2 + 6)
      }

      if (!g.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'
        ctx.fillRect(0, H / 2 - 38, W, 76)
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 14px monospace'
        ctx.fillText('CRASH!  ' + g.score + 'm', W / 2, H / 2)
        ctx.fillStyle = '#94a3b8'
        ctx.font = '12px monospace'
        ctx.fillText('Tap ◀ ▶ to restart', W / 2, H / 2 + 24)
      }

      animRef.current = requestAnimationFrame(loop)
    }

    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') moveLeft()
      if (e.key === 'ArrowRight') moveRight()
    }

    window.addEventListener('keydown', handleKey)
    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={300} height={320}
        className="rounded-lg"
        style={{ touchAction: 'none' }} />
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        <button
          className="py-4 rounded-lg border border-slate-700 text-white text-lg font-bold active:bg-slate-700 select-none"
          onPointerDown={(e) => { e.preventDefault(); canvasRef.current?._moveLeft() }}
        >◀</button>
        <button
          className="py-4 rounded-lg border border-slate-700 text-white text-lg font-bold active:bg-slate-700 select-none"
          onPointerDown={(e) => { e.preventDefault(); canvasRef.current?._moveRight() }}
        >▶</button>
      </div>
    </div>
  )
}

// ── Urge Surf Games wrapper ───────────────────────────────────────────────────
const GAMES = [
  { id: 'memory', label: 'Sigil Memory', icon: '🔮', desc: 'Repeat the pattern' },
  { id: 'flappy', label: 'Flap Away',    icon: '⚡', desc: 'Dodge the pipes'   },
  { id: 'stack',  label: 'Stack Tower',  icon: '🏗️', desc: 'Build the tower'   },
  { id: 'racing', label: 'Escape Run',   icon: '🚗', desc: 'Dodge obstacles'   },
]

function UrgeSurfGames({ onComplete, onCancel }) {
  const [timeLeft, setTimeLeft] = useState(600)
  const [activeGame, setActiveGame] = useState(null)
  const [gameKey, setGameKey] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(iv); onComplete(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const min = Math.floor(timeLeft / 60)
  const sec = timeLeft % 60
  const pct = ((600 - timeLeft) / 600) * 100

  const selectGame = (id) => { setActiveGame(id); setGameKey(k => k + 1) }

  return (
    <div className="rpg-panel p-4 border border-violet-700 space-y-3">
      {/* Timer bar */}
      <div className="flex items-center justify-between">
        <div className="font-pixel text-xs text-violet-400" style={{ fontSize: '9px' }}>URGE SURF</div>
        <div className="font-pixel text-sm text-white">{min}:{sec.toString().padStart(2, '0')}</div>
      </div>
      <div className="stat-bar">
        <div className="stat-bar-fill bg-violet-500" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />
      </div>
      <div className="text-xs text-slate-500 italic text-center">Ride the wave. The urge will pass.</div>

      {/* Game area */}
      {!activeGame ? (
        <>
          <div className="text-xs text-slate-400 text-center mb-1">Pick a game to distract your mind</div>
          <div className="grid grid-cols-2 gap-2">
            {GAMES.map(g => (
              <button
                key={g.id}
                className="rpg-panel p-4 flex flex-col items-center gap-1.5 border border-slate-700 hover:border-violet-500 transition-all active:scale-95"
                onClick={() => selectGame(g.id)}
              >
                <span className="text-2xl">{g.icon}</span>
                <span className="text-xs text-slate-200 font-semibold">{g.label}</span>
                <span className="text-xs text-slate-500">{g.desc}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="font-pixel text-xs text-violet-400" style={{ fontSize: '9px' }}>
              {GAMES.find(g => g.id === activeGame)?.icon} {GAMES.find(g => g.id === activeGame)?.label.toUpperCase()}
            </span>
            <button className="text-xs text-slate-500 hover:text-slate-300 underline" onClick={() => setActiveGame(null)}>
              ← Games
            </button>
          </div>
          <div key={gameKey}>
            {activeGame === 'memory' && <MemoryGame />}
            {activeGame === 'flappy' && <FlappyGame />}
            {activeGame === 'stack'  && <StackGame />}
            {activeGame === 'racing' && <RacingGame />}
          </div>
        </>
      )}

      <button className="rpg-btn-danger w-full text-xs" onClick={onCancel}>Give In ✗</button>
    </div>
  )
}

// ── Craving heatmap ───────────────────────────────────────────────────────────
function CravingHeatmap({ cravings }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const counts = {}
  cravings.forEach(c => {
    const h = new Date(c.date).getHours()
    counts[h] = (counts[h] || 0) + 1
  })
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="rpg-panel p-4">
      <div className="font-pixel text-xs text-slate-400 mb-3">CRAVING PATTERNS BY HOUR</div>
      <div className="flex gap-0.5 items-end h-12">
        {hours.map(h => {
          const cnt = counts[h] || 0
          const pct = (cnt / max) * 100
          return (
            <div key={h} className="flex-1 flex flex-col items-center">
              <div className="w-full rounded-t-sm transition-all"
                style={{ height: `${Math.max(2, pct * 0.44)}px`, background: pct > 0 ? '#7c3aed' : '#1a1a2e' }}
                title={`${h}:00 — ${cnt}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
      </div>
    </div>
  )
}

const PRESET_TYPES = ['Food', 'Alcohol', 'Smoking', 'Phone / social media', 'Sugar', 'Caffeine', 'Gambling', 'Other (custom)']

// ── Main Cravings component ───────────────────────────────────────────────────
export default function Cravings() {
  const { cravings, logCraving, gainXP, loseXP, addWillpower, character, openaiKey } = useStore()
  const [phase, setPhase] = useState('idle') // idle | logging | game | result
  const [form, setForm] = useState({ typePreset: 'Food', customType: '', intensity: 5 })
  const [aiMsg, setAiMsg] = useState('')
  const [lastCraving, setLastCraving] = useState(null)

  const isCustom = form.typePreset === 'Other (custom)'
  const resolvedType = isCustom ? (form.customType.trim() || 'Custom') : form.typePreset

  const startGame = () => {
    setLastCraving({ type: resolvedType, intensity: form.intensity, resisted: true })
    setPhase('game')
  }

  const handleResisted = async () => {
    const craving = { type: resolvedType, intensity: form.intensity, resisted: true }
    logCraving(craving)
    gainXP(25, 'craving')
    addWillpower()
    setPhase('result')
    setLastCraving(craving)
    if (openaiKey) {
      getCravingMessage(openaiKey, { character, craving, streak: character.streak })
        .then(msg => setAiMsg(msg)).catch(() => {})
    }
  }

  const handleGaveIn = async () => {
    const penalty = Math.floor(form.intensity * 5)
    const craving = { type: resolvedType, intensity: form.intensity, resisted: false }
    logCraving(craving)
    loseXP(penalty, 'craving')
    setPhase('result')
    setLastCraving(craving)
    if (openaiKey) {
      getCravingMessage(openaiKey, { character, craving, streak: character.streak })
        .then(msg => setAiMsg(msg)).catch(() => {})
    }
  }

  const recentCravings = [...cravings].reverse().slice(0, 10)

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-xs text-amber-400">CRAVINGS</h1>
        <div className="text-xs text-slate-400">
          Resisted: <span className="text-green-400">{cravings.filter(c => c.resisted).length}</span>
          <span className="text-slate-600"> / {cravings.length}</span>
        </div>
      </div>

      {phase === 'idle' && (
        <button className="rpg-btn-primary w-full" onClick={() => setPhase('logging')}>+ Log Craving</button>
      )}

      {phase === 'logging' && (
        <div className="rpg-panel p-6 border border-violet-700 space-y-4">
          <div className="font-pixel text-xs text-violet-400">LOG CRAVING</div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TYPES.map(t => (
                <button key={t}
                  className={`p-2 text-xs rounded border text-left transition-all ${form.typePreset === t ? 'border-violet-500 bg-violet-900 text-white' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'}`}
                  onClick={() => setForm(f => ({ ...f, typePreset: t }))}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {isCustom && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Custom name</label>
              <input type="text" placeholder="e.g. Binge watching..."
                value={form.customType}
                onChange={e => setForm(f => ({ ...f, customType: e.target.value }))} autoFocus />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Intensity: <span className="text-violet-400">{form.intensity}/10</span>
            </label>
            <input type="range" min="1" max="10" value={form.intensity}
              onChange={e => setForm(f => ({ ...f, intensity: parseInt(e.target.value) }))}
              className="w-full accent-violet-500" />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>Mild</span><span>Moderate</span><span>Intense</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="rpg-btn-secondary flex-1" onClick={() => setPhase('idle')}>Cancel</button>
            <button className="rpg-btn-gold flex-1" onClick={startGame}>🎮 Play Through It</button>
          </div>
          <button className="rpg-btn-danger w-full text-xs" onClick={handleGaveIn}>I gave in…</button>
        </div>
      )}

      {phase === 'game' && (
        <UrgeSurfGames onComplete={handleResisted} onCancel={handleGaveIn} />
      )}

      {phase === 'result' && lastCraving && (
        <div className={`rpg-panel p-6 text-center border ${lastCraving.resisted ? 'border-green-600' : 'border-red-700'}`}>
          <div className="text-3xl mb-2">{lastCraving.resisted ? '⚡' : '💔'}</div>
          <div className="font-pixel text-xs mb-1" style={{ color: lastCraving.resisted ? '#10b981' : '#ef4444' }}>
            {lastCraving.resisted ? 'CRAVING RESISTED!' : 'GAVE IN'}
          </div>
          <div className="text-xs text-slate-500 mb-3">{lastCraving.type} • {lastCraving.intensity}/10</div>
          {lastCraving.resisted && <div className="text-xs text-amber-400 mb-3">+25 XP  +1 Willpower</div>}
          {!lastCraving.resisted && <div className="text-xs text-red-400 mb-3">-{Math.floor(lastCraving.intensity * 5)} XP • Gear degraded</div>}
          {aiMsg && (
            <div className="text-xs text-slate-300 italic leading-relaxed mb-4 border-l-2 border-violet-600 pl-3 text-left">{aiMsg}</div>
          )}
          <button className="rpg-btn-secondary" onClick={() => { setPhase('idle'); setAiMsg(''); setForm({ typePreset: 'Food', customType: '', intensity: 5 }) }}>
            Continue
          </button>
        </div>
      )}

      {cravings.length > 0 && <CravingHeatmap cravings={cravings} />}

      {recentCravings.length > 0 && (
        <div className="rpg-panel p-4">
          <div className="font-pixel text-xs text-slate-400 mb-3">RECENT</div>
          <div className="space-y-2">
            {recentCravings.map(c => (
              <div key={c.id} className="flex items-center gap-3 text-xs">
                <span>{c.resisted ? '✅' : '❌'}</span>
                <span className="text-slate-300 flex-1">{c.type}</span>
                <span className="text-slate-500">{c.intensity}/10</span>
                <span className={c.resisted ? 'text-green-400' : 'text-red-400'}>
                  {c.resisted ? '+25' : `-${Math.floor(c.intensity * 5)}`} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
