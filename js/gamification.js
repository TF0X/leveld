// XP, levels, ranks, streaks, quests, achievements.
import { getProfile, saveProfile, getByDate, getAll, todayStr, dateStr } from './db.js';
import { showXP, showLevelUp, showAchievement, toast } from './ui.js';

export const RANKS = [
  { lvl: 1, name: 'Beginner' },
  { lvl: 5, name: 'Grinder' },
  { lvl: 10, name: 'Dedicated' },
  { lvl: 15, name: 'Athlete' },
  { lvl: 20, name: 'Champion' },
  { lvl: 30, name: 'Elite' },
  { lvl: 50, name: 'Legend' },
];

export const ACHIEVEMENTS = [
  { id: 'first_workout', icon: '💪', name: 'First Workout' },
  { id: 'streak_7', icon: '🔥', name: '7-Day Streak' },
  { id: 'level_10', icon: '🎯', name: 'Level 10' },
  { id: 'macro_streak_7', icon: '🥩', name: '7-Day Macro' },
  { id: 'hobby_5', icon: '🎨', name: '5 Hobbies' },
  { id: 'streak_100', icon: '👑', name: '100-Day Streak' },
  { id: 'pr_10', icon: '🏆', name: '10 PRs Beaten' },
];

export const xpForLevel = (n) => Math.floor(100 * Math.pow(n, 1.5));

export function rankFor(level) {
  let cur = RANKS[0];
  for (const r of RANKS) if (level >= r.lvl) cur = r;
  return cur.name;
}

export function streakMultiplier(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

// Add XP without any streak side-effects (used internally for streak bonuses).
async function rawAwardXP(baseXP, reason = '') {
  const p = await getProfile();
  const mult = streakMultiplier(p.streak);
  const xp = Math.round(baseXP * mult);
  const startLevel = p.level;
  let totalXP = p.totalXP + xp;
  let level = p.level;
  while (totalXP >= xpForLevel(level + 1)) level++;
  const next = await saveProfile({ totalXP, level });
  showXP(`+${xp} XP${mult > 1 ? ` ×${mult}` : ''}${reason ? ` · ${reason}` : ''}`);
  if (level > startLevel) {
    showLevelUp(level, rankFor(level));
    if (level >= 10) await unlockAchievement('level_10');
  }
  return next;
}

// Public award — every log goes through here; ticks streak + adds XP.
export async function awardXP(baseXP, reason = '') {
  await markLoggedToday();
  return rawAwardXP(baseXP, reason);
}

export async function unlockAchievement(id) {
  const p = await getProfile();
  if (p.achievements.includes(id)) return;
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  const achievements = [...p.achievements, id];
  await saveProfile({ achievements });
  if (ach) showAchievement(ach);
}

// Called on app open — only handles missed-day breakage (freeze or reset).
// Does NOT increment the streak; that happens in markLoggedToday() when the user actually logs.
export async function checkStreakOnOpen() {
  const p = await getProfile();
  const today = todayStr();
  if (!p.lastLoggedDate) return p;
  if (p.lastLoggedDate === today) return p;
  const last = new Date(p.lastLoggedDate);
  const now = new Date(today);
  const diff = Math.round((now - last) / 86400000);
  if (diff <= 1) return p; // yesterday is fine — they still have until end of today
  const missed = diff - 1;
  let freeze = p.freezeTokens || 0;
  if (missed <= freeze) {
    freeze -= missed;
    toast(`❄ Streak freeze used (${missed} day${missed > 1 ? 's' : ''})`, 'success');
    // Pretend they logged "yesterday" so a log today extends the streak normally
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    return saveProfile({ freezeTokens: freeze, lastLoggedDate: dateStr(yest) });
  }
  if (p.streak > 0) toast(`Streak reset (${p.streak}d → 0)`, 'error');
  return saveProfile({ streak: 0, lastLoggedDate: null });
}

// Called from awardXP whenever the user logs anything — extends/initializes streak.
async function markLoggedToday() {
  const p = await getProfile();
  const today = todayStr();
  if (p.lastLoggedDate === today) return p;
  let streak;
  if (!p.lastLoggedDate) {
    streak = 1;
  } else {
    const last = new Date(p.lastLoggedDate);
    const diff = Math.round((new Date(today) - last) / 86400000);
    streak = diff === 1 ? p.streak + 1 : 1;
  }
  const updates = { streak, lastLoggedDate: today, streakRecord: Math.max(p.streakRecord || 0, streak) };
  if (streak % 7 === 0) updates.freezeTokens = (p.freezeTokens || 0) + 1;
  const next = await saveProfile(updates);
  if (streak === 7) {
    await unlockAchievement('streak_7');
    await rawAwardXP(200, '7-day streak!');
  }
  if (streak === 30) await rawAwardXP(500, '30-day streak!');
  if (streak === 100) await unlockAchievement('streak_100');
  return next;
}

// Daily quests — computed live, not stored.
export async function computeQuests() {
  const today = todayStr();
  const [meals, workouts, hobbies, body, p] = await Promise.all([
    getByDate('meals', today),
    getByDate('workouts', today),
    getByDate('hobbies', today),
    (async () => (await getAll('bodyMetrics')).filter((b) => b.date === today))(),
    getProfile(),
  ]);
  const totalProtein = meals.reduce((s, m) => s + (m.nutrition?.protein || 0), 0);
  const quests = [
    { id: 'meals3', label: 'Log 3 meals', sub: `${meals.length}/3`, done: meals.length >= 3 },
    { id: 'workout', label: 'Complete a workout', sub: workouts.length ? 'done' : 'not yet', done: workouts.length > 0 },
    { id: 'protein', label: 'Hit protein goal', sub: `${totalProtein}/${p.goals.protein}g`, done: totalProtein >= p.goals.protein },
    { id: 'hobby', label: 'Log a hobby', sub: hobbies.length ? `${hobbies.length} logged` : 'not yet', done: hobbies.length > 0 },
    { id: 'weight', label: 'Log weight', sub: body.length ? 'done' : 'not yet', done: body.length > 0 },
  ];
  return { quests, allDone: quests.every((q) => q.done) };
}

// Compute & store today's daily score from local data (no API). Gemini scoring is optional + on-demand.
export async function computeDailyScoreLocal() {
  const today = todayStr();
  const p = await getProfile();
  const [meals, workouts, hobbies, body] = await Promise.all([
    getByDate('meals', today),
    getByDate('workouts', today),
    getByDate('hobbies', today),
    (async () => (await getAll('bodyMetrics')).filter((b) => b.date === today))(),
  ]);
  // Activity
  let activity = 0;
  if (meals.length >= 1) activity += 20;
  if (meals.length >= 2) activity += 15;
  if (meals.length >= 3) activity += 15;
  if (workouts.length) activity += 30;
  if (hobbies.length) activity += 10;
  if (body.length) activity += 10;
  activity = Math.min(100, activity);
  // Output
  const cals = meals.reduce((s, m) => s + (m.nutrition?.calories || 0), 0);
  const protein = meals.reduce((s, m) => s + (m.nutrition?.protein || 0), 0);
  const calAcc = cals === 0 ? 0 : Math.max(0, 30 - Math.round((Math.abs(cals - p.goals.calories) / p.goals.calories) * 60));
  const proteinHit = protein >= p.goals.protein ? 25 : Math.round((protein / Math.max(1, p.goals.protein)) * 18);
  const allWorkouts = await getAll('workouts');
  const avgVol = allWorkouts.length ? allWorkouts.reduce((s, w) => s + (w.totalVolumeKg || 0), 0) / allWorkouts.length : 0;
  const todayVol = workouts.reduce((s, w) => s + (w.totalVolumeKg || 0), 0);
  const volScore = avgVol === 0 ? (todayVol > 0 ? 15 : 0) : Math.min(25, Math.round((todayVol / avgVol) * 25));
  const hobbyMin = hobbies.reduce((s, h) => s + (h.minutes || 0), 0);
  const hobbyScore = Math.min(20, Math.round((hobbyMin / Math.max(1, p.goals.hobbyMinutes)) * 20));
  const output = Math.min(100, calAcc + proteinHit + volScore + hobbyScore);

  const breakdown = { meals: meals.length, workouts: workouts.length, hobbies: hobbies.length, weight: body.length, cals, protein, hobbyMin, todayVol };
  return { date: today, activityScore: activity, outputScore: output, breakdown, llmNote: null, questsCompleted: [] };
}

export async function persistDailyScore(score, llmNote) {
  const { putRecord } = await import('./db.js');
  if (llmNote) score.llmNote = llmNote;
  await putRecord('dailyScores', score);
  return score;
}

// Returns last 7-day scores (existing) for context to LLM
export async function lastNDayScores(n = 7) {
  const all = await getAll('dailyScores');
  all.sort((a, b) => a.date.localeCompare(b.date));
  return all.slice(-n);
}

export function weekKey(d = new Date()) {
  // ISO week key YYYY-Www
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
