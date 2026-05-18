import { STORES, addRecord, dateStr, getAll, getByDate, getProfile, putRecord, saveProfile, todayStr } from './db.js';
import { toast } from './ui.js';

const RANKS = [
  { min: 1, name: 'Couch Potato' },
  { min: 3, name: 'Beginner' },
  { min: 6, name: 'Consistent' },
  { min: 10, name: 'Disciplined' },
  { min: 15, name: 'Committed' },
  { min: 20, name: 'Athlete' },
  { min: 25, name: 'Veteran' },
  { min: 30, name: 'Elite' },
  { min: 35, name: 'Beast' },
  { min: 40, name: 'Machine' },
  { min: 50, name: 'Legend' },
  { min: 60, name: 'GOD MODE' },
];

export const ACHIEVEMENTS = [
  { id: 'first_workout', name: 'First workout' },
  { id: 'streak_7', name: '7 day streak' },
  { id: 'streak_30', name: '30 day streak' },
  { id: 'streak_100', name: '100 day streak' },
  { id: 'level_10', name: 'Level 10' },
  { id: 'level_25', name: 'Level 25' },
  { id: 'hobby_5', name: '5 hobbies logged' },
  { id: 'pr_10', name: '10 PRs beaten' },
  { id: 'consistent_month', name: '25 logged days this month' },
];

export const xpForLevel = (level) => Math.floor(100 * Math.pow(level, 1.5));

export function rankFor(level) {
  return RANKS.filter((rank) => level >= rank.min).at(-1)?.name || RANKS[0].name;
}

export function streakMultiplier(streak) {
  if (streak >= 30) return 2;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1;
}

export async function unlockAchievement(id) {
  const profile = await getProfile();
  if (profile.achievements.includes(id)) return false;
  await saveProfile({ achievements: [...profile.achievements, id] });
  toast(`Achievement unlocked: ${ACHIEVEMENTS.find((item) => item.id === id)?.name || id}`);
  return true;
}

export async function rawAwardXP(base, reason = '') {
  const profile = await getProfile();
  const gained = Math.round(base * streakMultiplier(profile.streak));
  let totalXP = profile.totalXP + gained;
  let level = profile.level;
  while (totalXP >= xpForLevel(level + 1)) level += 1;
  await saveProfile({ totalXP, level });
  if (level >= 10) await unlockAchievement('level_10');
  if (level >= 25) await unlockAchievement('level_25');
  if (reason) toast(`+${gained} XP · ${reason}`);
  document.dispatchEvent(new Event('lt:refresh-home'));
  return gained;
}

export async function deductXP(amount, reason = '') {
  const profile = await getProfile();
  const loss = Math.max(0, Math.round(amount));
  let totalXP = Math.max(0, (profile.totalXP || 0) - loss);
  let level = profile.level;
  while (level > 1 && totalXP < xpForLevel(level)) level -= 1;
  await saveProfile({ totalXP, level });
  if (reason) toast(`-${loss} XP · ${reason}`);
  document.dispatchEvent(new Event('lt:refresh-home'));
  return loss;
}

export async function awardXP(base, reason = '') {
  await markLoggedToday();
  return rawAwardXP(base, reason);
}

export async function checkStreakOnOpen() {
  const profile = await getProfile();
  const today = todayStr();
  if (!profile.lastLoggedDate || profile.lastLoggedDate === today) return profile;
  const last = new Date(profile.lastLoggedDate);
  const now = new Date(today);
  const diff = Math.round((now - last) / 86400000);
  if (diff <= 1) return profile;
  const missedDays = diff - 1;
  if ((profile.freezeTokens || 0) >= missedDays) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    toast(`Freeze token used for ${missedDays} missed day${missedDays > 1 ? 's' : ''}`);
    return saveProfile({
      freezeTokens: profile.freezeTokens - missedDays,
      lastLoggedDate: dateStr(yesterday),
    });
  }
  toast('Streak reset');
  return saveProfile({ streak: 0, lastLoggedDate: null });
}

export async function markLoggedToday() {
  const profile = await getProfile();
  const today = todayStr();
  if (profile.lastLoggedDate === today) return profile;
  let streak = 1;
  if (profile.lastLoggedDate) {
    const diff = Math.round((new Date(today) - new Date(profile.lastLoggedDate)) / 86400000);
    streak = diff === 1 ? profile.streak + 1 : 1;
  }
  const patch = {
    streak,
    lastLoggedDate: today,
    streakRecord: Math.max(profile.streakRecord || 0, streak),
  };
  if (streak % 7 === 0) patch.freezeTokens = Math.min(3, (profile.freezeTokens || 0) + 1);
  await saveProfile(patch);
  if (streak === 7) {
    await unlockAchievement('streak_7');
    await rawAwardXP(200, '7 day streak');
  }
  if (streak === 30) {
    await unlockAchievement('streak_30');
    await rawAwardXP(500, '30 day streak');
  }
  if (streak === 100) {
    await unlockAchievement('streak_100');
    await rawAwardXP(1500, '100 day streak');
  }
}

export async function computeDailyScoreLocal(date = todayStr()) {
  const profile = await getProfile();
  const [meals, workouts, hobbies, weights, habitLogs, allWorkouts] = await Promise.all([
    getByDate(STORES.meals, date),
    getByDate(STORES.workouts, date),
    getByDate(STORES.hobbies, date),
    getAll(STORES.bodyMetrics).then((rows) => rows.filter((row) => row.date === date)),
    getByDate(STORES.habitLogs, date),
    getAll(STORES.workouts),
  ]);
  let activityScore = 0;
  if (meals.length >= 1) activityScore += 20;
  if (meals.length >= 2) activityScore += 15;
  if (meals.length >= 3) activityScore += 15;
  if (workouts.length) activityScore += 30;
  if (hobbies.length) activityScore += 10;
  if (weights.length) activityScore += 10;
  if (habitLogs.length >= 1) activityScore += 10;
  if (habitLogs.length >= 3) activityScore += 5;
  activityScore = Math.min(100, activityScore);

  const totals = meals.reduce((acc, meal) => {
    acc.calories += meal.nutrition?.calories || 0;
    acc.protein += meal.nutrition?.protein || 0;
    return acc;
  }, { calories: 0, protein: 0 });
  const calorieAccuracy = totals.calories
    ? Math.max(0, 30 - Math.round((Math.abs(totals.calories - profile.goals.calories) / profile.goals.calories) * 60))
    : 0;
  const proteinScore = totals.protein >= profile.goals.protein
    ? 25
    : Math.round((totals.protein / Math.max(1, profile.goals.protein)) * 18);
  const todayVolume = workouts.reduce((sum, workout) => sum + (workout.totalVolumeKg || 0), 0);
  const averageVolume = allWorkouts.length
    ? allWorkouts.reduce((sum, workout) => sum + (workout.totalVolumeKg || 0), 0) / allWorkouts.length
    : 0;
  const workoutScore = averageVolume === 0 ? (todayVolume > 0 ? 15 : 0) : Math.min(25, Math.round((todayVolume / averageVolume) * 25));
  const hobbyMinutes = hobbies.reduce((sum, item) => sum + (item.minutes || 0), 0);
  const hobbyScore = Math.min(20, Math.round((hobbyMinutes / Math.max(1, profile.goals.hobbyMinutes)) * 20));
  const outputScore = Math.min(100, calorieAccuracy + proteinScore + workoutScore + hobbyScore);

  return {
    date,
    activityScore,
    outputScore,
    breakdown: {
      meals: meals.length,
      workouts: workouts.length,
      hobbies: hobbies.length,
      weightEntries: weights.length,
      habitCompletions: habitLogs.length,
      calories: totals.calories,
      protein: totals.protein,
      workoutVolume: todayVolume,
      hobbyMinutes,
    },
    llmNote: null,
    questsCompleted: [],
  };
}

export async function persistDailyScore(score) {
  await putRecord(STORES.dailyScores, score);
  return score;
}

export async function lastNDayScores(days = 7) {
  const all = await getAll(STORES.dailyScores);
  return all.sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
}

export function weekKey(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function maybeUnlockConsistencyAchievement() {
  const scores = await getAll(STORES.dailyScores);
  const byMonth = new Map();
  for (const score of scores) {
    if ((score.activityScore || 0) <= 0) continue;
    const month = score.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) || 0) + 1);
  }
  if ([...byMonth.values()].some((count) => count >= 25)) {
    await unlockAchievement('consistent_month');
  }
}

export async function computeQuests(date = todayStr()) {
  const profile = await getProfile();
  const [meals, workouts, hobbies, weights, habits] = await Promise.all([
    getByDate(STORES.meals, date),
    getByDate(STORES.workouts, date),
    getByDate(STORES.hobbies, date),
    getAll(STORES.bodyMetrics).then((rows) => rows.filter((row) => row.date === date)),
    getByDate(STORES.habitLogs, date),
  ]);
  const protein = meals.reduce((sum, meal) => sum + (meal.nutrition?.protein || 0), 0);
  return [
    { label: 'Log 3 meals', progress: `${meals.length}/3`, done: meals.length >= 3, xp: 0 },
    { label: 'Complete a workout', progress: workouts.length ? 'done' : 'pending', done: workouts.length > 0, xp: 0 },
    { label: 'Hit protein goal', progress: `${protein}/${profile.goals.protein}g`, done: protein >= profile.goals.protein, xp: 15 },
    { label: 'Log a hobby', progress: hobbies.length ? `${hobbies.length} logged` : 'pending', done: hobbies.length > 0, xp: 0 },
    { label: 'Complete a habit', progress: `${habits.length} done`, done: habits.length > 0, xp: 8 },
    { label: 'Log bodyweight', progress: weights.length ? 'done' : 'pending', done: weights.length > 0, xp: 5 },
  ];
}
