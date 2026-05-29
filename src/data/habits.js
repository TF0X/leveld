export const GOAL_HABITS = {
  'Lose weight': [
    // From Rohan Gupta's 2-week habit starter + Fat Loss Fuel System
    { name: 'Sleep by 11pm', frequency: 'daily', type: 'positive', category: 'recovery' },
    { name: '+2000 steps above baseline', frequency: 'daily', type: 'positive', category: 'movement' },
    { name: 'Hit protein target today', frequency: 'daily', type: 'positive', category: 'nutrition' },
    { name: '20-25 min cardio after workout', frequency: 'daily', type: 'positive', category: 'training' },
    { name: 'Replace 2 sugary drinks with water', frequency: 'daily', type: 'positive', category: 'nutrition' },
    { name: 'Log all meals in diet tracker', frequency: 'daily', type: 'positive', category: 'tracking' },
  ],
  'Build muscle': [
    { name: 'Hit protein target today', frequency: 'daily', type: 'positive', category: 'nutrition' },
    { name: 'Strength training session', frequency: 'daily', type: 'positive', category: 'training' },
    { name: 'Track sets, reps & weights', frequency: 'daily', type: 'positive', category: 'tracking' },
    { name: 'Sleep by 11pm', frequency: 'daily', type: 'positive', category: 'recovery' },
    { name: 'Eat calorie surplus today', frequency: 'daily', type: 'positive', category: 'nutrition' },
  ],
  'Fix sleep': [
    { name: 'Sleep by 11pm', frequency: 'daily', type: 'positive', category: 'recovery' },
    { name: 'No screens 90 min before bed', frequency: 'daily', type: 'positive', category: 'recovery' },
    { name: 'Wake up on first alarm', frequency: 'daily', type: 'positive', category: 'recovery' },
    { name: 'Same wake time every day', frequency: 'daily', type: 'positive', category: 'recovery' },
    { name: '10 min wind-down routine', frequency: 'daily', type: 'positive', category: 'recovery' },
  ],
  'Quit a bad habit': [
    { name: 'Resist the urge (log in cravings)', frequency: 'daily', type: 'positive', category: 'discipline' },
    { name: 'Log cravings honestly', frequency: 'daily', type: 'positive', category: 'tracking' },
    { name: 'Replace with positive alternative', frequency: 'daily', type: 'positive', category: 'discipline' },
  ],
  'Eat better': [
    { name: 'Hit protein target today', frequency: 'daily', type: 'positive', category: 'nutrition' },
    { name: 'Drink 8 glasses of water', frequency: 'daily', type: 'positive', category: 'gut' },
    { name: 'Vegetables with every meal', frequency: 'daily', type: 'positive', category: 'nutrition' },
    { name: 'No ultra-processed food today', frequency: 'daily', type: 'positive', category: 'nutrition' },
    { name: 'Eat probiotic food (dahi/kefir)', frequency: 'daily', type: 'positive', category: 'gut' },
  ],
  'Manage stress': [
    { name: '10 min meditation', frequency: 'daily', type: 'positive', category: 'mental' },
    { name: 'Evening walk (10-20 min)', frequency: 'daily', type: 'positive', category: 'movement' },
    { name: 'Journaling', frequency: 'daily', type: 'positive', category: 'mental' },
    { name: 'Daily reset — breathwork or stretching', frequency: 'daily', type: 'positive', category: 'recovery' },
  ],
  'Build a morning routine': [
    { name: 'Complete morning routine', frequency: 'daily', type: 'positive', category: 'routine' },
    { name: 'No phone first 30 min', frequency: 'daily', type: 'positive', category: 'mental' },
    { name: 'Cold shower', frequency: 'daily', type: 'positive', category: 'recovery' },
    { name: 'Protein breakfast', frequency: 'daily', type: 'positive', category: 'nutrition' },
  ],
  'Stay consistent': [
    { name: 'Check habits daily', frequency: 'daily', type: 'positive', category: 'tracking' },
    { name: 'Review weekly goals', frequency: 'weekly', type: 'positive', category: 'tracking' },
    { name: 'Never miss two days in a row', frequency: 'daily', type: 'positive', category: 'discipline' },
    { name: '5 min mobility post-workout', frequency: 'daily', type: 'positive', category: 'recovery' },
  ],
}

export const GUT_HEALTH_HABITS = [
  { name: 'Drink 8 glasses of water', frequency: 'daily', type: 'positive', category: 'gut', icon: '💧' },
  { name: 'Eat probiotic food (dahi/kefir/kimchi)', frequency: 'daily', type: 'positive', category: 'gut', icon: '🦠' },
  { name: 'Include a super seed today', frequency: 'daily', type: 'positive', category: 'gut', icon: '🌱' },
  { name: 'Eat 5+ different vegetables today', frequency: 'daily', type: 'positive', category: 'gut', icon: '🥦' },
  { name: 'Chew food slowly (mindful eating)', frequency: 'daily', type: 'positive', category: 'gut', icon: '🍽️' },
  { name: 'Walk 10 min after main meal', frequency: 'daily', type: 'positive', category: 'gut', icon: '🚶' },
  { name: 'Eat 30 different plants this week', frequency: 'weekly', type: 'positive', category: 'gut', icon: '🌿' },
]

export const CLASS_ROUTINES = {
  Warrior: [
    { id: 1, name: 'Workout', duration: 45 },
    { id: 2, name: 'Cold shower', duration: 5 },
    { id: 3, name: 'Protein breakfast', duration: 15 },
    { id: 4, name: 'Review goals', duration: 5 },
  ],
  Mage: [
    { id: 1, name: 'Meditation', duration: 10 },
    { id: 2, name: 'Journaling', duration: 15 },
    { id: 3, name: 'Reading', duration: 30 },
    { id: 4, name: 'Plan the day', duration: 10 },
  ],
  Rogue: [
    { id: 1, name: 'Review goals', duration: 5 },
    { id: 2, name: 'Habit check', duration: 5 },
    { id: 3, name: 'Gratitude note', duration: 5 },
    { id: 4, name: 'Cold shower', duration: 5 },
  ],
}
