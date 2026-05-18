import { STORES, addRecord, getByDate, getRecord, putRecord, todayStr } from './db.js';
import { awardXP, deductXP } from './gamification.js';

const SHRED_CHALLENGES = [
  { id: 'steps', text: 'Walk 12,000 steps today.', xp: 24, type: 'cardio' },
  { id: 'protein', text: 'Hit your full protein target with zero junk calories.', xp: 26, type: 'nutrition' },
  { id: 'mobility', text: 'Do 20 minutes of mobility before bed.', xp: 18, type: 'recovery' },
  { id: 'lift', text: 'Finish one hard workout and log every working set.', xp: 28, type: 'training' },
  { id: 'water', text: 'Finish your full water goal before 8pm.', xp: 16, type: 'discipline' },
  { id: 'focus', text: 'No doomscrolling before lunch. Earn the afternoon.', xp: 20, type: 'mindset' },
  { id: 'sleep', text: 'Lights out before 11pm tonight.', xp: 18, type: 'recovery' },
];

export const NEGATIVE_HABITS = [
  { key: 'junk-food', label: 'Junk food binge', penalty: 12 },
  { key: 'doomscrolling', label: 'Doomscrolling spiral', penalty: 8 },
  { key: 'skipped-workout', label: 'Skipped planned workout', penalty: 15 },
  { key: 'late-sleep', label: 'Slept way too late', penalty: 10 },
  { key: 'sugary-drink', label: 'Sugary drink slip', penalty: 6 },
];

function challengeIndexForDate(date = todayStr()) {
  return date.split('-').join('').split('').reduce((sum, char) => sum + Number(char), 0) % SHRED_CHALLENGES.length;
}

export async function getDailyShredChallenge() {
  const date = todayStr();
  const existing = await getRecord(STORES.shredChallenges, date);
  if (existing) return existing;
  const template = SHRED_CHALLENGES[challengeIndexForDate(date)];
  const challenge = {
    date,
    challengeId: template.id,
    text: template.text,
    xp: template.xp,
    type: template.type,
    completed: false,
    completedAt: null,
  };
  await putRecord(STORES.shredChallenges, challenge);
  return challenge;
}

export async function completeDailyShredChallenge() {
  const challenge = await getDailyShredChallenge();
  if (challenge.completed) return false;
  await putRecord(STORES.shredChallenges, {
    ...challenge,
    completed: true,
    completedAt: Date.now(),
  });
  await awardXP(challenge.xp || 20, 'Shred challenge cleared');
  return true;
}

export async function getTodayNegativeHabitLogs() {
  return getByDate(STORES.negativeHabitLogs, todayStr());
}

export async function logNegativeHabit({ key, label, penalty, note = '' }) {
  const record = {
    date: todayStr(),
    key,
    label,
    penalty: Number(penalty) || 0,
    note: note.trim(),
    createdAt: Date.now(),
  };
  await addRecord(STORES.negativeHabitLogs, record);
  await deductXP(record.penalty, label);
  return record;
}
