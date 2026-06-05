import React from 'react'

function GolemShape({ p, cracks }) {
  return (
    <g>
      <ellipse cx="16" cy="43" rx="9" ry="2" fill="#000" opacity="0.3" />
      {/* Legs */}
      <rect x="8" y="32" width="6" height="9" fill={p.body} />
      <rect x="18" y="32" width="6" height="9" fill={p.body} />
      <rect x="7" y="39" width="8" height="3" fill="#0d0d0d" />
      <rect x="17" y="39" width="8" height="3" fill="#0d0d0d" />
      {/* Body */}
      <rect x="6" y="16" width="20" height="17" fill={p.body} />
      <rect x="12" y="19" width="8" height="2" fill={p.accent} opacity="0.9" />
      <rect x="14" y="23" width="4" height="6" fill={p.accent} opacity="0.6" />
      {/* Arms */}
      <rect x="0" y="17" width="7" height="12" fill={p.body} />
      <rect x="25" y="17" width="7" height="12" fill={p.body} />
      <rect x="0" y="27" width="8" height="5" fill={p.accent} />
      <rect x="24" y="27" width="8" height="5" fill={p.accent} />
      {/* Head */}
      <rect x="7" y="4" width="18" height="13" fill={p.body} />
      <rect x="7" y="4" width="18" height="3" fill={p.accent} opacity="0.8" />
      {/* Eyes */}
      <rect x="9" y="9" width="5" height="4" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
      </rect>
      <rect x="18" y="9" width="5" height="4" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
      </rect>
      <rect x="9" y="9" width="2" height="2" fill="white" opacity="0.45" />
      <rect x="18" y="9" width="2" height="2" fill="white" opacity="0.45" />
      {/* Mouth */}
      <rect x="10" y="14" width="12" height="2" fill="#0a0a0a" />
      <rect x="11" y="15" width="2" height="2" fill={p.accent} opacity="0.85" />
      <rect x="15" y="15" width="2" height="2" fill={p.accent} opacity="0.85" />
      <rect x="19" y="15" width="2" height="2" fill={p.accent} opacity="0.85" />
      {/* Cracks */}
      {cracks >= 1 && <line x1="13" y1="17" x2="16" y2="29" stroke="#0a0a0a" strokeWidth="1" opacity="0.8" />}
      {cracks >= 2 && <>
        <line x1="8" y1="19" x2="11" y2="30" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.7" />
        <line x1="22" y1="18" x2="20" y2="28" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.7" />
        <line x1="12" y1="5" x2="10" y2="12" stroke="#0a0a0a" strokeWidth="0.7" opacity="0.5" />
      </>}
    </g>
  )
}

function DragonShape({ p, cracks }) {
  return (
    <g>
      <ellipse cx="16" cy="43" rx="8" ry="2" fill="#000" opacity="0.3" />
      {/* Tail */}
      <polygon points="22,30 32,38 26,27" fill={p.accent} opacity="0.9" />
      {/* Wings */}
      <polygon points="9,20 0,7 11,18" fill={p.body} opacity="0.8" />
      <polygon points="23,20 32,7 21,18" fill={p.body} opacity="0.8" />
      <line x1="9" y1="20" x2="2" y2="9" stroke={p.accent} strokeWidth="0.6" opacity="0.6" />
      <line x1="9" y1="20" x2="5" y2="12" stroke={p.accent} strokeWidth="0.4" opacity="0.5" />
      <line x1="23" y1="20" x2="30" y2="9" stroke={p.accent} strokeWidth="0.6" opacity="0.6" />
      <line x1="23" y1="20" x2="27" y2="12" stroke={p.accent} strokeWidth="0.4" opacity="0.5" />
      {/* Legs */}
      <rect x="9" y="31" width="4" height="8" fill={p.body} />
      <rect x="19" y="31" width="4" height="8" fill={p.body} />
      <rect x="8" y="38" width="6" height="3" fill="#0d0d0d" />
      <rect x="18" y="38" width="6" height="3" fill="#0d0d0d" />
      {/* Body */}
      <rect x="9" y="19" width="14" height="13" fill={p.body} />
      <rect x="11" y="22" width="10" height="2" fill={p.accent} opacity="0.55" />
      <rect x="12" y="26" width="8" height="2" fill={p.accent} opacity="0.45" />
      {/* Neck */}
      <rect x="13" y="11" width="6" height="9" fill={p.body} />
      {/* Head */}
      <rect x="10" y="3" width="12" height="9" fill={p.body} />
      {/* Horns */}
      <polygon points="11,3 9,0 13,4" fill={p.accent} />
      <polygon points="21,3 23,0 19,4" fill={p.accent} />
      {/* Spine spikes */}
      <polygon points="14,11 13,7 15,11" fill={p.accent} opacity="0.85" />
      <polygon points="18,11 17,7 19,11" fill={p.accent} opacity="0.85" />
      {/* Eyes */}
      <rect x="11" y="6" width="3" height="3" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
      </rect>
      <rect x="18" y="6" width="3" height="3" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" begin="0.4s" />
      </rect>
      {/* Snout */}
      <rect x="11" y="10" width="10" height="3" fill={p.body} />
      <rect x="12" y="12" width="8" height="1" fill="#0a0a0a" />
      {cracks >= 1 && <line x1="12" y1="20" x2="14" y2="30" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.7" />}
      {cracks >= 2 && <>
        <line x1="20" y1="21" x2="18" y2="30" stroke="#0a0a0a" strokeWidth="0.7" opacity="0.6" />
        <line x1="14" y1="4" x2="12" y2="10" stroke="#0a0a0a" strokeWidth="0.6" opacity="0.5" />
      </>}
    </g>
  )
}

function SpecterShape({ p, cracks }) {
  return (
    <g>
      {/* Wispy tail wisps */}
      <rect x="11" y="35" width="4" height="7" fill={p.body} opacity="0.45" />
      <rect x="17" y="33" width="3" height="9" fill={p.body} opacity="0.35" />
      <rect x="14" y="37" width="4" height="6" fill={p.body} opacity="0.25" />
      {/* Flowing robe */}
      <polygon points="7,32 4,43 16,38 28,43 25,32" fill={p.body} opacity="0.85" />
      <rect x="8" y="18" width="16" height="15" fill={p.body} />
      {/* Outstretched arms */}
      <rect x="1" y="19" width="8" height="4" fill={p.body} opacity="0.75" />
      <rect x="23" y="19" width="8" height="4" fill={p.body} opacity="0.75" />
      <rect x="0" y="17" width="2" height="7" fill={p.accent} opacity="0.9" />
      <rect x="30" y="17" width="2" height="7" fill={p.accent} opacity="0.9" />
      {/* Hood */}
      <rect x="9" y="6" width="14" height="13" fill={p.body} />
      <rect x="9" y="6" width="14" height="5" fill="#0a0a0a" opacity="0.45" />
      {/* Single giant eye */}
      <rect x="12" y="11" width="8" height="5" fill={p.eye} opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.15;0.9" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="14" y="12" width="4" height="3" fill="#0a0a0a" opacity="0.85" />
      <rect x="15" y="12" width="2" height="3" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
      </rect>
      <rect x="12" y="11" width="3" height="2" fill="white" opacity="0.5" />
      {/* Mouth slit */}
      <rect x="11" y="17" width="10" height="1" fill={p.accent} opacity="0.65" />
      {/* Rune */}
      <rect x="14" y="21" width="4" height="6" fill={p.accent} opacity="0.5" />
      {cracks >= 1 && <rect x="13" y="19" width="6" height="1" fill="white" opacity="0.25" />}
      {cracks >= 2 && <>
        <rect x="10" y="23" width="5" height="1" fill="white" opacity="0.2" />
        <rect x="18" y="22" width="4" height="1" fill="white" opacity="0.2" />
      </>}
    </g>
  )
}

function DemonShape({ p, cracks }) {
  return (
    <g>
      <ellipse cx="16" cy="43" rx="8" ry="2" fill="#000" opacity="0.3" />
      {/* Tail */}
      <polygon points="22,30 31,39 24,27" fill={p.accent} opacity="0.85" />
      {/* Wings */}
      <polygon points="9,18 0,5 11,17" fill={p.body} opacity="0.75" />
      <polygon points="23,18 32,5 21,17" fill={p.body} opacity="0.75" />
      <line x1="9" y1="18" x2="2" y2="7" stroke={p.accent} strokeWidth="0.5" opacity="0.7" />
      <line x1="23" y1="18" x2="30" y2="7" stroke={p.accent} strokeWidth="0.5" opacity="0.7" />
      {/* Legs */}
      <rect x="10" y="31" width="4" height="9" fill={p.body} />
      <rect x="18" y="31" width="4" height="9" fill={p.body} />
      <rect x="9" y="39" width="5" height="3" fill="#0d0d0d" />
      <rect x="18" y="39" width="5" height="3" fill="#0d0d0d" />
      {/* Body */}
      <rect x="9" y="18" width="14" height="14" fill={p.body} />
      <polygon points="16,20 12,27 20,27" fill={p.accent} opacity="0.65" />
      {/* Arms */}
      <rect x="5" y="18" width="5" height="11" fill={p.body} />
      <rect x="22" y="18" width="5" height="11" fill={p.body} />
      <rect x="4" y="27" width="3" height="5" fill={p.accent} />
      <rect x="25" y="27" width="3" height="5" fill={p.accent} />
      {/* Head */}
      <rect x="10" y="6" width="12" height="13" fill={p.body} />
      {/* Horns */}
      <polygon points="11,6 8,0 13,6" fill={p.accent} />
      <polygon points="21,6 24,0 19,6" fill={p.accent} />
      {/* Eyes */}
      <rect x="11" y="10" width="3" height="3" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="18" y="10" width="3" height="3" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </rect>
      <rect x="11" y="10" width="1" height="1" fill="white" opacity="0.5" />
      <rect x="18" y="10" width="1" height="1" fill="white" opacity="0.5" />
      {/* Grin */}
      <rect x="11" y="15" width="10" height="2" fill="#0a0a0a" />
      <rect x="12" y="16" width="2" height="3" fill={p.accent} opacity="0.9" />
      <rect x="18" y="16" width="2" height="3" fill={p.accent} opacity="0.9" />
      {cracks >= 1 && <line x1="13" y1="19" x2="15" y2="30" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.7" />}
      {cracks >= 2 && <>
        <line x1="20" y1="20" x2="18" y2="29" stroke="#0a0a0a" strokeWidth="0.7" opacity="0.6" />
        <line x1="13" y1="7" x2="11" y2="13" stroke="#0a0a0a" strokeWidth="0.6" opacity="0.5" />
      </>}
    </g>
  )
}

function BeastShape({ p, cracks }) {
  return (
    <g>
      <ellipse cx="16" cy="43" rx="10" ry="2" fill="#000" opacity="0.3" />
      {/* Tail */}
      <polygon points="26,17 33,11 28,23" fill={p.body} opacity="0.85" />
      {/* 4 legs */}
      <rect x="7" y="28" width="4" height="12" fill={p.body} />
      <rect x="12" y="30" width="4" height="10" fill={p.body} />
      <rect x="16" y="30" width="4" height="10" fill={p.body} />
      <rect x="21" y="28" width="4" height="12" fill={p.body} />
      <rect x="6" y="39" width="6" height="3" fill="#0d0d0d" />
      <rect x="11" y="39" width="5" height="3" fill="#0d0d0d" />
      <rect x="16" y="39" width="5" height="3" fill="#0d0d0d" />
      <rect x="20" y="39" width="6" height="3" fill="#0d0d0d" />
      {/* Body */}
      <rect x="6" y="17" width="20" height="12" fill={p.body} />
      {/* Spine spikes */}
      <polygon points="10,17 9,13 11,17" fill={p.accent} opacity="0.9" />
      <polygon points="14,17 13,12 15,17" fill={p.accent} opacity="0.9" />
      <polygon points="18,17 17,12 19,17" fill={p.accent} opacity="0.9" />
      <polygon points="22,17 21,13 23,17" fill={p.accent} opacity="0.9" />
      {/* Neck */}
      <rect x="8" y="11" width="8" height="7" fill={p.body} />
      {/* Head - hunched low */}
      <rect x="4" y="5" width="14" height="10" fill={p.body} />
      <rect x="4" y="5" width="14" height="2" fill={p.accent} opacity="0.8" />
      {/* Eyes */}
      <rect x="5" y="8" width="4" height="4" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </rect>
      <rect x="12" y="8" width="4" height="4" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
      </rect>
      <rect x="5" y="8" width="2" height="2" fill="white" opacity="0.4" />
      <rect x="12" y="8" width="2" height="2" fill="white" opacity="0.4" />
      {/* Open jaw */}
      <rect x="4" y="13" width="14" height="3" fill="#0a0a0a" />
      <rect x="5" y="14" width="2" height="4" fill={p.accent} opacity="0.9" />
      <rect x="8" y="14" width="2" height="4" fill={p.accent} opacity="0.9" />
      <rect x="11" y="14" width="2" height="3" fill={p.accent} opacity="0.9" />
      <rect x="14" y="14" width="2" height="3" fill={p.accent} opacity="0.9" />
      {cracks >= 1 && <line x1="14" y1="18" x2="16" y2="27" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.7" />}
      {cracks >= 2 && <>
        <line x1="9" y1="19" x2="10" y2="28" stroke="#0a0a0a" strokeWidth="0.7" opacity="0.6" />
        <line x1="21" y1="18" x2="20" y2="27" stroke="#0a0a0a" strokeWidth="0.7" opacity="0.6" />
      </>}
    </g>
  )
}

function SlimeShape({ p }) {
  return (
    <g>
      <ellipse cx="16" cy="43" rx="9" ry="2" fill="#000" opacity="0.3" />
      {/* Puddle base */}
      <ellipse cx="16" cy="38" rx="11" ry="4" fill={p.body} opacity="0.5" />
      {/* Side blobs */}
      <ellipse cx="10" cy="32" rx="5" ry="7" fill={p.body} opacity="0.85" />
      <ellipse cx="22" cy="32" rx="5" ry="7" fill={p.body} opacity="0.85" />
      {/* Main blob */}
      <ellipse cx="16" cy="27" rx="9" ry="11" fill={p.body} />
      {/* Sheen */}
      <ellipse cx="14" cy="23" rx="5" ry="6" fill={p.accent} opacity="0.3" />
      {/* Eyestalks */}
      <rect x="10" y="13" width="2" height="8" fill={p.body} />
      <rect x="20" y="12" width="2" height="9" fill={p.body} />
      {/* Eyes */}
      <circle cx="11" cy="12" r="4" fill="#091a09" />
      <circle cx="21" cy="11" r="4" fill="#091a09" />
      <circle cx="11" cy="12" r="2.5" fill={p.eye}>
        <animate attributeName="r" values="2.5;3.2;2.5" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="21" cy="11" r="2.5" fill={p.eye}>
        <animate attributeName="r" values="2.5;3.2;2.5" dur="1.6s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      <circle cx="10" cy="11" r="1" fill="white" opacity="0.5" />
      <circle cx="20" cy="10" r="1" fill="white" opacity="0.5" />
      {/* Mouth slit */}
      <ellipse cx="16" cy="31" rx="4" ry="1.5" fill="#091a09" opacity="0.7" />
    </g>
  )
}

function GoblinShape({ p, cracks }) {
  return (
    <g>
      <ellipse cx="14" cy="43" rx="7" ry="2" fill="#000" opacity="0.3" />
      {/* Legs */}
      <rect x="9" y="32" width="4" height="8" fill={p.body} />
      <rect x="15" y="32" width="4" height="8" fill={p.body} />
      <rect x="8" y="39" width="5" height="3" fill="#0d0d0d" />
      <rect x="14" y="39" width="5" height="3" fill="#0d0d0d" />
      {/* Hunched body */}
      <rect x="8" y="21" width="12" height="12" fill={p.body} />
      <ellipse cx="18" cy="23" rx="5" ry="6" fill={p.body} opacity="0.9" />
      {/* Arms — long */}
      <rect x="3" y="22" width="6" height="3" fill={p.body} />
      <rect x="19" y="22" width="6" height="3" fill={p.body} />
      <rect x="2" y="21" width="2" height="6" fill={p.accent} />
      <rect x="24" y="21" width="2" height="6" fill={p.accent} />
      {/* Big head */}
      <rect x="8" y="9" width="12" height="13" fill={p.body} />
      {/* Ears */}
      <polygon points="8,11 3,8 8,15" fill={p.body} />
      <polygon points="20,11 25,8 20,15" fill={p.body} />
      <polygon points="8,12 5,10 8,14" fill={p.accent} opacity="0.55" />
      <polygon points="20,12 23,10 20,14" fill={p.accent} opacity="0.55" />
      {/* Big eyes */}
      <rect x="8" y="13" width="4" height="4" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.35;1" dur="1.3s" repeatCount="indefinite" />
      </rect>
      <rect x="15" y="13" width="4" height="4" fill={p.eye}>
        <animate attributeName="opacity" values="1;0.35;1" dur="1.3s" repeatCount="indefinite" begin="0.3s" />
      </rect>
      <rect x="8" y="13" width="2" height="2" fill="white" opacity="0.45" />
      <rect x="15" y="13" width="2" height="2" fill="white" opacity="0.45" />
      {/* Fanged grin */}
      <rect x="9" y="18" width="9" height="2" fill="#0a0a0a" />
      <rect x="10" y="19" width="1" height="3" fill={p.accent} opacity="0.9" />
      <rect x="12" y="19" width="1" height="3" fill={p.accent} opacity="0.9" />
      <rect x="14" y="19" width="1" height="3" fill={p.accent} opacity="0.9" />
      <rect x="16" y="19" width="1" height="2" fill={p.accent} opacity="0.9" />
      {cracks >= 1 && <line x1="11" y1="22" x2="13" y2="30" stroke="#0a0a0a" strokeWidth="0.7" opacity="0.7" />}
    </g>
  )
}

const SHAPES = { golem: GolemShape, dragon: DragonShape, specter: SpecterShape, demon: DemonShape, beast: BeastShape, slime: SlimeShape, goblin: GoblinShape }

export default function PixelMonster({ boss, size = 120, hpRatio = 1 }) {
  if (!boss) return null
  const { type = 'golem', palette = {} } = boss
  const p = {
    body:   palette.body   || '#3b2f2f',
    accent: palette.accent || '#7c2d12',
    eye:    palette.eye    || '#ef4444',
    glow:   palette.glow   || '#dc2626',
  }

  const cracks = hpRatio > 0.66 ? 0 : hpRatio > 0.33 ? 1 : 2
  const dead = hpRatio <= 0
  const Shape = SHAPES[type] || GolemShape

  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 32 45"
      style={{
        imageRendering: 'pixelated',
        filter: dead
          ? 'saturate(0) brightness(0.35)'
          : hpRatio < 0.33
          ? 'saturate(0.6) brightness(0.75)'
          : 'none',
        animation: dead ? 'none' : hpRatio < 0.33 ? 'float 1.2s ease-in-out infinite' : 'float 3s ease-in-out infinite',
      }}
    >
      {/* Ground glow */}
      {!dead && (
        <ellipse cx="16" cy="43" rx="12" ry="2.5" fill={p.glow} opacity="0.3">
          <animate attributeName="opacity" values="0.15;0.45;0.15" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}
      <Shape p={p} cracks={cracks} dead={dead} hpRatio={hpRatio} />
    </svg>
  )
}
