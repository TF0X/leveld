/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        rpg: {
          bg: '#0f0f1a',
          panel: '#1a1a2e',
          border: '#2a2a4a',
          accent: '#7c3aed',
          gold: '#f59e0b',
          hp: '#ef4444',
          xp: '#10b981',
          mana: '#3b82f6',
          text: '#e2e8f0',
          muted: '#64748b',
        }
      },
      animation: {
        'flicker': 'flicker 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'xp-fill': 'xp-fill 1s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'star-twinkle': 'star-twinkle 3s ease-in-out infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
          '75%': { opacity: '0.9' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'xp-fill': {
          from: { width: '0%' },
          to: { width: 'var(--xp-width)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
        },
        'star-twinkle': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
