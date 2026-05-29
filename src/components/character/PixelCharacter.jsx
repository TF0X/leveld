import React from 'react'

const CLASS_COLORS = {
  Warrior: { skin: '#c68642', hair: '#4a2f1a', armor: '#6b7280', weapon: '#9ca3af', accent: '#ef4444' },
  Mage:    { skin: '#c8a882', hair: '#1e3a5f', armor: '#4c1d95', weapon: '#7c3aed', accent: '#3b82f6' },
  Rogue:   { skin: '#a0785a', hair: '#1a1a1a', armor: '#1f2937', weapon: '#374151', accent: '#10b981' },
}

const TIER_COLORS = {
  Civilian:   { armor: null,    weapon: null    },
  Apprentice: { armor: '#60a5fa', weapon: null   },
  Warrior:    { armor: '#a78bfa', weapon: '#94a3b8' },
  Elite:      { armor: '#f59e0b', weapon: '#d97706' },
  Legend:     { armor: '#f97316', weapon: '#ef4444'  },
}

function getTier(level) {
  if (level <= 10) return 'Civilian'
  if (level <= 20) return 'Apprentice'
  if (level <= 35) return 'Warrior'
  if (level <= 50) return 'Elite'
  return 'Legend'
}

export default function PixelCharacter({ character, size = 120, animate = true, degradation = 0 }) {
  const cls = character?.class || 'Warrior'
  const level = character?.level || 1
  const tier = getTier(level)
  const colors = CLASS_COLORS[cls] || CLASS_COLORS.Warrior
  const tierC = TIER_COLORS[tier]

  const armorColor = tierC.armor || colors.armor
  const weaponColor = tierC.weapon || colors.weapon
  const showWeapon = level >= 30
  const showAura = character?.cosmetics?.aura
  const showGoldTrim = character?.cosmetics?.goldTrim
  const isLegend = tier === 'Legend'

  const hpRatio = (character?.hp || 100) / (character?.maxHp || 100)
  const isDamaged = hpRatio < 0.5
  const isCritical = hpRatio < 0.25

  const scale = size / 120

  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 32 45"
      style={{
        imageRendering: 'pixelated',
        filter: isDamaged ? 'saturate(0.6)' : 'none',
        animation: animate ? 'float 3s ease-in-out infinite' : 'none',
      }}
    >
      {/* Aura / Legend glow */}
      {(showAura || isLegend) && (
        <ellipse cx="16" cy="40" rx="12" ry="3" fill={colors.accent} opacity="0.3">
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}

      {/* Shadow */}
      <ellipse cx="16" cy="43" rx="8" ry="2" fill="#000" opacity="0.3" />

      {/* Legs */}
      <rect x="11" y="30" width="4" height="9" fill={armorColor} />
      <rect x="17" y="30" width="4" height="9" fill={armorColor} />
      {/* Boots */}
      <rect x="10" y="38" width="5" height="3" fill="#1a1a1a" />
      <rect x="17" y="38" width="5" height="3" fill="#1a1a1a" />

      {/* Body */}
      <rect x="10" y="18" width="12" height="13" fill={armorColor} />
      {showGoldTrim && <rect x="10" y="18" width="12" height="1" fill="#f59e0b" />}

      {/* Arms */}
      <rect x="6" y="18" width="4" height="10" fill={armorColor} />
      <rect x="22" y="18" width="4" height="10" fill={armorColor} />

      {/* Hands */}
      <rect x="6" y="27" width="3" height="3" fill={colors.skin} />
      <rect x="23" y="27" width="3" height="3" fill={colors.skin} />

      {/* Class-specific emblem on chest */}
      {cls === 'Warrior' && <rect x="14" y="21" width="4" height="5" fill="#ef4444" opacity="0.8" />}
      {cls === 'Mage' && <rect x="14" y="21" width="4" height="5" fill="#7c3aed" opacity="0.8" />}
      {cls === 'Rogue' && <rect x="14" y="21" width="4" height="5" fill="#10b981" opacity="0.8" />}

      {/* Cloak (level 11+) */}
      {level >= 11 && (
        <polygon points="10,18 6,35 10,31 10,18" fill={colors.armor} opacity="0.7" />
      )}

      {/* Head */}
      <rect x="10" y="7" width="12" height="12" fill={colors.skin} />
      {isCritical && <rect x="10" y="7" width="12" height="12" fill="#ef4444" opacity="0.2" />}

      {/* Hair */}
      {cls === 'Warrior' && (
        <>
          <rect x="10" y="5" width="12" height="4" fill={colors.hair} />
          <rect x="8" y="7" width="2" height="4" fill={colors.hair} />
        </>
      )}
      {cls === 'Mage' && (
        <>
          <rect x="10" y="4" width="12" height="5" fill={colors.hair} />
          <rect x="22" y="5" width="3" height="8" fill={colors.hair} />
        </>
      )}
      {cls === 'Rogue' && (
        <>
          <rect x="10" y="5" width="12" height="3" fill={colors.hair} />
          <rect x="9" y="7" width="2" height="5" fill={colors.hair} />
          <rect x="21" y="7" width="2" height="5" fill={colors.hair} />
        </>
      )}

      {/* Eyes */}
      <rect x="12" y="11" width="2" height="2" fill="#1a1a1a" />
      <rect x="18" y="11" width="2" height="2" fill="#1a1a1a" />
      {/* Eye shine */}
      <rect x="12" y="11" width="1" height="1" fill="white" opacity="0.6" />
      <rect x="18" y="11" width="1" height="1" fill="white" opacity="0.6" />

      {/* Helmet (Warrior tier 3+) */}
      {cls === 'Warrior' && level >= 21 && (
        <>
          <rect x="9" y="4" width="14" height="5" fill={armorColor} opacity="0.9" />
          <rect x="8" y="7" width="2" height="5" fill={armorColor} opacity="0.9" />
          <rect x="22" y="7" width="2" height="5" fill={armorColor} opacity="0.9" />
        </>
      )}

      {/* Rogue hood */}
      {cls === 'Rogue' && level >= 11 && (
        <polygon points="9,7 16,2 23,7 22,7 16,4 10,7" fill="#1f2937" />
      )}

      {/* Mage hat */}
      {cls === 'Mage' && level >= 11 && (
        <>
          <polygon points="16,0 22,7 10,7" fill="#4c1d95" />
          <rect x="9" y="7" width="14" height="2" fill="#6d28d9" />
        </>
      )}

      {/* Weapon (level 30+) */}
      {showWeapon && cls === 'Warrior' && (
        <g transform="translate(26, 15) rotate(15)">
          <rect x="0" y="-2" width="2" height="18" fill={weaponColor} />
          <rect x="-3" y="0" width="8" height="2" fill={weaponColor} />
          <rect x="-1" y="-4" width="4" height="4" fill="#c0c0c0" />
        </g>
      )}
      {showWeapon && cls === 'Mage' && (
        <g transform="translate(24, 12)">
          <rect x="1" y="0" width="2" height="22" fill="#8b5cf6" />
          <circle cx="2" cy="0" r="3" fill={weaponColor}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      {showWeapon && cls === 'Rogue' && (
        <g transform="translate(25, 18) rotate(-30)">
          <rect x="0" y="0" width="1" height="14" fill={weaponColor} />
          <polygon points="-1,0 2,0 1,-5" fill="#6b7280" />
        </g>
      )}

      {/* Gear degradation cracks */}
      {degradation > 20 && (
        <line x1="14" y1="20" x2="16" y2="25" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.6" />
      )}
      {degradation > 50 && (
        <>
          <line x1="12" y1="22" x2="15" y2="27" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.6" />
          <line x1="18" y1="19" x2="17" y2="24" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.6" />
        </>
      )}

      {/* Legend particle effects */}
      {isLegend && (
        <>
          {[...Array(4)].map((_, i) => (
            <circle key={i} cx={8 + i * 6} cy={3} r="1" fill="#f97316" opacity="0.8">
              <animate
                attributeName="cy"
                values={`${3};${-2};${3}`}
                dur={`${1 + i * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.8;0.2;0.8"
                dur={`${1 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </>
      )}
    </svg>
  )
}
