export const QUEST_POOL = {
  social: [
    'Send an encouraging message to a friend',
    'Spend 30 min away from social media',
    'Have a meaningful conversation today',
    'Compliment someone genuinely',
    'Check in on someone you haven\'t spoken to recently',
    'Share something helpful or positive online',
    'Spend quality time with a person you care about',
  ],
  diet: [
    'Hit your protein target for every meal',
    'Drink 8+ glasses of water today',
    'Eat vegetables with at least 2 meals',
    'No ultra-processed food or sugary snacks',
    'Eat breakfast within 1 hour of waking',
    'Include fibre in every meal today',
    'No eating after 9pm tonight',
  ],
  hobby: [
    'Read for at least 20 minutes',
    'Practice a creative skill for 15 minutes',
    'Spend 30 min on a personal project',
    'Learn one new thing and write it down',
    'Journal your thoughts for 10 minutes',
    'Watch something educational, not entertainment',
    'Spend time in nature without your phone',
  ],
  control: [
    'No phone 1 hour before bed',
    'Resist the first craving that arises today',
    'Meditate or breathe deeply for 5 minutes',
    'Complete your full morning routine',
    'No screens in the first 30 min after waking',
    'Set a timer for deep focus work — no distractions',
    'Go to sleep before midnight tonight',
  ],
}

export const CATEGORY_META = {
  social:  { label: 'Social',  icon: '🤝', color: 'text-blue-400',   border: 'border-blue-800',   bg: 'bg-blue-950'  },
  diet:    { label: 'Diet',    icon: '🥗', color: 'text-green-400',  border: 'border-green-800',  bg: 'bg-green-950' },
  hobby:   { label: 'Hobby',   icon: '🎯', color: 'text-amber-400',  border: 'border-amber-800',  bg: 'bg-amber-950' },
  control: { label: 'Control', icon: '🧠', color: 'text-violet-400', border: 'border-violet-800', bg: 'bg-violet-950'},
}

function seededPick(arr, seed) {
  const n = Math.abs(seed) % arr.length
  return arr[n]
}

export function getDailyQuestsStatic(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const seed = y * 10000 + m * 100 + d
  return Object.keys(QUEST_POOL).map((cat, i) => ({
    id: `${dateStr}_${cat}`,
    category: cat,
    title: seededPick(QUEST_POOL[cat], seed + i * 37),
    isAI: false,
    completed: false,
  }))
}

export const DAILY_ENEMY_CONFIG = {
  slime:  { name: 'Laziness Slime',        palette: { body: '#1a3a1a', accent: '#2d6e2d', eye: '#4ade80', glow: '#16a34a' } },
  goblin: { name: 'Procrastination Goblin',palette: { body: '#2a3a10', accent: '#5a7c1a', eye: '#d4d000', glow: '#84cc16' } },
  bandit: { name: 'Distraction Bandit',    palette: { body: '#1e1e35', accent: '#5a3a8a', eye: '#c084fc', glow: '#7c3aed' } },
  orc:    { name: 'Stagnation Orc',        palette: { body: '#1a2e1a', accent: '#6b2a1a', eye: '#f87171', glow: '#dc2626' } },
  troll:  { name: 'Entropy Troll',         palette: { body: '#2a1e10', accent: '#7a5500', eye: '#fbbf24', glow: '#d97706' } },
}

export function getDailyEnemyType(level) {
  if (level <= 5)  return 'slime'
  if (level <= 12) return 'goblin'
  if (level <= 22) return 'bandit'
  if (level <= 35) return 'orc'
  return 'troll'
}
