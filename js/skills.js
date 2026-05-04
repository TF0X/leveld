// Skill scoring — turns history into 5 skill-tree style stats with levels.
import { getAll, STORES } from './db.js';

export const SKILLS = [
  { id: 'consistency', name: 'Consistency', icon: '🔥', color: '#ffaa00' },
  { id: 'strength', name: 'Strength', icon: '💪', color: '#ff5588' },
  { id: 'cardio', name: 'Cardio', icon: '🏃', color: '#00ccff' },
  { id: 'mind', name: 'Mind', icon: '🧘', color: '#aa44ff' },
  { id: 'diet', name: 'Diet', icon: '🥗', color: '#00ff88' },
];

const CARDIO_KEYWORDS = /run|jog|walk|bike|cycl|swim|row|elliptical|cardio|hiit|sprint|stair|hike/i;
const MIND_KEYWORDS = /read|meditat|journal|breath|yoga|study|learn|language|writing/i;

// Each skill returns { level, xp, nextLevelXP, pct } so we can render bars.
// Skill level uses sqrt scaling for satisfying early progression.
function levelFromXP(xp) {
  const lvl = Math.floor(Math.sqrt(xp / 25));
  const next = (lvl + 1) ** 2 * 25;
  const cur = lvl ** 2 * 25;
  const pct = next > cur ? Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) : 0;
  return { level: lvl, xp, nextLevelXP: next, pct };
}

export async function computeSkills() {
  const [meals, workouts, hobbies, scores, body] = await Promise.all([
    getAll(STORES.meals),
    getAll(STORES.workouts),
    getAll(STORES.hobbies),
    getAll(STORES.dailyScores),
    getAll(STORES.bodyMetrics),
  ]);

  // Consistency XP — number of unique days with any log + streak rewards
  const days = new Set();
  for (const m of meals) days.add(m.date);
  for (const w of workouts) days.add(w.date);
  for (const h of hobbies) days.add(h.date);
  for (const b of body) days.add(b.date);
  const consistencyXP = days.size * 10;

  // Strength XP — total volume / 50 (so 5000kg total = 100 XP)
  const strengthXP = Math.round(workouts.reduce((s, w) => s + (w.totalVolumeKg || 0), 0) / 50);

  // Cardio XP — hobbies whose name matches cardio keywords, plus walking
  const cardioMin = hobbies.filter((h) => CARDIO_KEYWORDS.test(h.hobbyName || '')).reduce((s, h) => s + (h.minutes || 0), 0);
  const cardioXP = Math.round(cardioMin * 1.2);

  // Mind XP — reading / meditation / journaling / yoga minutes
  const mindMin = hobbies.filter((h) => MIND_KEYWORDS.test(h.hobbyName || '')).reduce((s, h) => s + (h.minutes || 0), 0);
  const mindXP = Math.round(mindMin * 1.2);

  // Diet XP — number of "good" days where macros came close to goal
  // Use scores breakdown if present
  const dietGoodDays = scores.filter((s) => (s.breakdown?.cals || 0) > 0 && (s.breakdown?.protein || 0) > 0 && s.outputScore >= 50).length;
  const dietXP = dietGoodDays * 15 + meals.length * 2;

  return [
    { ...SKILLS[0], ...levelFromXP(consistencyXP), detail: `${days.size} active days` },
    { ...SKILLS[1], ...levelFromXP(strengthXP), detail: `${Math.round(workouts.reduce((s, w) => s + (w.totalVolumeKg || 0), 0)).toLocaleString()} kg lifted` },
    { ...SKILLS[2], ...levelFromXP(cardioXP), detail: `${cardioMin} min cardio` },
    { ...SKILLS[3], ...levelFromXP(mindXP), detail: `${mindMin} min mind` },
    { ...SKILLS[4], ...levelFromXP(dietXP), detail: `${meals.length} meals logged` },
  ];
}
