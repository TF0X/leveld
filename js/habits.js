import { STORES, addRecord, deleteRecord, getAll, getByDate, todayStr } from './db.js';
import { awardXP } from './gamification.js';
import { suggestHabits } from './gemini.js';

export const PRESET_HABITS = [
  { name: 'Sleep by 11pm', icon: 'moon', category: 'Sleep' },
  { name: 'No sugar today', icon: 'cookie-off', category: 'Diet' },
  { name: 'Walk 10k steps', icon: 'shoe', category: 'Fitness' },
  { name: 'Meditate 10 min', icon: 'brain', category: 'Mind' },
  { name: 'One deep work block', icon: 'focus-2', category: 'Focus' },
];

export async function getAllHabits() {
  return getAll(STORES.habits);
}

export async function getTodayHabitLogs() {
  return getByDate(STORES.habitLogs, todayStr());
}

export async function addHabit(name, icon, category) {
  return addRecord(STORES.habits, { name, icon, category });
}

export async function removeHabit(id) {
  await deleteRecord(STORES.habits, id);
  const logs = await getAll(STORES.habitLogs);
  for (const log of logs.filter((item) => item.habitId === id)) {
    await deleteRecord(STORES.habitLogs, log.id);
  }
}

export async function toggleHabit(id) {
  const logs = await getTodayHabitLogs();
  const existing = logs.find((item) => item.habitId === id);
  if (existing) {
    await deleteRecord(STORES.habitLogs, existing.id);
    document.dispatchEvent(new Event('lt:refresh-home'));
    return false;
  }
  await addRecord(STORES.habitLogs, { date: todayStr(), habitId: id, completed: true });
  await awardXP(8, 'Habit completed');
  document.dispatchEvent(new Event('lt:refresh-home'));
  return true;
}

export async function getHabitStreak(habitId) {
  const logs = await getAll(STORES.habitLogs);
  const completed = new Set(logs.filter((item) => item.habitId === habitId).map((item) => item.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (completed.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getAIHabitSuggestions(profile) {
  return suggestHabits(profile);
}
