// Run with: node generate-icons.js
// Requires canvas: npm install canvas
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const s = size / 192

  // Background
  ctx.fillStyle = '#0f0f1a'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, 24 * s)
  ctx.fill()

  // Character body (violet)
  ctx.fillStyle = '#7c3aed'
  ctx.fillRect(72 * s, 36 * s, 48 * s, 56 * s)

  // Arms
  ctx.fillStyle = '#6d28d9'
  ctx.fillRect(64 * s, 44 * s, 8 * s, 40 * s)
  ctx.fillRect(120 * s, 44 * s, 8 * s, 40 * s)

  // Head
  ctx.fillStyle = '#c68642'
  ctx.fillRect(80 * s, 20 * s, 32 * s, 32 * s)

  // Hair
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(80 * s, 16 * s, 32 * s, 8 * s)

  // Eyes
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(88 * s, 32 * s, 8 * s, 8 * s)
  ctx.fillRect(104 * s, 32 * s, 8 * s, 8 * s)

  // Legs
  ctx.fillStyle = '#4c1d95'
  ctx.fillRect(72 * s, 92 * s, 20 * s, 48 * s)
  ctx.fillRect(100 * s, 92 * s, 20 * s, 48 * s)

  // Boots
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(68 * s, 132 * s, 24 * s, 16 * s)
  ctx.fillRect(100 * s, 132 * s, 24 * s, 16 * s)

  // Sword
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(128 * s, 60 * s, 6 * s, 60 * s)
  ctx.fillRect(120 * s, 64 * s, 22 * s, 6 * s)

  return canvas.toBuffer('image/png')
}

writeFileSync('public/icon-192.png', drawIcon(192))
writeFileSync('public/icon-512.png', drawIcon(512))
console.log('Icons generated!')
