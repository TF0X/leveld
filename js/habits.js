import { getProfile, saveProfile, addRecord, getByDate, deleteRecord, getAllRecords, todayStr } from './db.js';
import { awardXP, deductXP, logViolation as logViolationGami } from './gamification.js';

export async function toggleHabit(habitId) {
  const today = todayStr();
  const logs = await getByDate('habitLogs', today);
  const existing = logs.find(l => l.habitId === habitId);
  if (existing) {
    await deleteRecord('habitLogs', existing.id);
    return { checked: false };
  } else {
    await addRecord('habitLogs', { habitId, date: today, completedAt: new Date().toISOString() });
    const xp = await awardXP(8, 'habit_complete');
    return { checked: true, xp };
  }
}

export async function getHabitStreak(habitId) {
  const all = await getAllRecords('habitLogs');
  const dates = [...new Set(all.filter(l => l.habitId === habitId).map(l => l.date))].sort().reverse();
  let streak = 0;
  let check = new Date(); check.setDate(check.getDate() - 1);
  for (const d of dates) {
    const expected = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,'0')}-${String(check.getDate()).padStart(2,'0')}`;
    if (d === expected) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

export async function logViolation(type, note = '') {
  const today = todayStr();
  const xpPenalty = await logViolationGami(type, note);
  await addRecord('violations', { date: today, type, note, xpPenalty, ts: new Date().toISOString() });
  return xpPenalty;
}

export async function logCraving(description, outcome, consequence) {
  const today = todayStr();
  let xp = 0;
  if (outcome === 'resisted') {
    xp = await awardXP(25, 'craving_resisted');
  } else {
    if (consequence?.isViolationType && consequence.isViolationType !== 'none') {
      await logViolation(consequence.isViolationType, description);
    }
  }
  await addRecord('cravings', { date: today, description, outcome, xp, ts: new Date().toISOString() });
  return xp;
}

export function computeDailyScore(meals, workouts, hobbies, bodyMetrics, habitLogs, water, goals) {
  let activity = 0;
  if (meals.length >= 1) activity += 20;
  if (meals.length >= 2) activity += 15;
  if (meals.length >= 3) activity += 15;
  if (workouts.length > 0) activity += 30;
  if (hobbies.length > 0) activity += 10;
  if (bodyMetrics.length > 0) activity += 10;
  if (habitLogs.length >= 1) activity += 10;
  if (habitLogs.length >= 3) activity += 5;
  activity = Math.min(100, activity);

  const totalCals = meals.reduce((s, m) => s + (m.nutrition?.calories || 0), 0);
  const totalProt = meals.reduce((s, m) => s + (m.nutrition?.protein || 0), 0);
  const totalHobbyMin = hobbies.reduce((s, h) => s + (h.duration || 0), 0);
  const waterMl = water?.ml || 0;

  let output = 0;
  const calDiff = Math.abs(totalCals - goals.calories);
  output += Math.max(0, 30 - (calDiff / goals.calories) * 60);
  output += totalProt >= goals.protein ? 25 : (totalProt / goals.protein) * 18;
  output += Math.min(25, (totalHobbyMin / goals.hobbyMinutes) * 25);
  output += Math.min(20, (waterMl / goals.water) * 20);
  output = Math.min(100, Math.round(output));

  return { activityScore: activity, outputScore: output, totalCals, totalProt, waterMl };
}

export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function initTheme(profile) {
  applyTheme(profile.theme || 'dark');
  if (profile.theme === 'system') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme('system'));
  }
}

export const NOTIF_BANK = {
  'streak-at-risk': [
    { title: '{streak} day streak. Don\'t fold now.', body: 'You haven\'t logged today. {hoursLeft} hours until midnight resets you.' },
    { title: 'Streak {streak} is on the edge.', body: 'Log one meal. Log one habit. Anything. The streak doesn\'t care if you\'re tired.' },
  ],
  'protein-lagging': [
    { title: 'Protein at {pct}%. It\'s {hour}pm.', body: 'Eggs exist. Whey exists. Excuses don\'t.' },
    { title: '{actual}g of {goal}g protein.', body: 'You\'re behind. The fridge is right there.' },
  ],
  'violation-warning': [
    { title: '{count} violations this week.', body: 'One more and you drop back to {prevRank}. Your call.' },
    { title: 'Regression imminent.', body: '{count}/3 violations. {hours} hours left to turn this week around.' },
  ],
  'craving-friday': [
    { title: 'It\'s {day}. You know what happens on {day}s.', body: 'Last {n} {day}s you ordered out. Pattern noticed. Pick differently.' },
  ],
  'pr-bite': [
    { title: 'PR beaten. {exercise} {old}→{new}kg.', body: 'You\'re {remaining} PRs from the pr_10 unlock. Don\'t coast.' },
  ],
  'level-up': [
    { title: 'Level {n}. {rank}.', body: '{xpToNext} XP to {nextRank}. Don\'t get comfortable.' },
  ],
};

export function buildNotif(trigger, context) {
  const variants = NOTIF_BANK[trigger];
  if (!variants) return null;
  const variant = variants[Math.floor(Math.abs(Math.sin(Date.now())) * variants.length)];
  const fill = (str) => str.replace(/\{(\w+)\}/g, (_, k) => context[k] ?? `{${k}}`);
  return { title: fill(variant.title), body: fill(variant.body) };
}

export async function scheduleNotif(title, body, delayMs = 0) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return;
  setTimeout(() => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'show-notif', title, body });
    } else {
      new Notification(title, { body, icon: '/icon-192.png' });
    }
  }, delayMs);
}
