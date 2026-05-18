import { STORES, addRecord, getByDate, todayStr } from './db.js';
import { awardXP, unlockAchievement } from './gamification.js';

export async function getTodaysHobbies() {
  return getByDate(STORES.hobbies, todayStr());
}

export async function logHobbySession(payload) {
  const record = {
    date: todayStr(),
    hobbyId: payload.hobbyId || `custom-${Date.now()}`,
    hobbyName: payload.hobbyName?.trim() || 'Hobby',
    minutes: Number(payload.minutes) || 0,
    notes: payload.notes?.trim() || '',
  };
  await addRecord(STORES.hobbies, record);
  await awardXP(12, 'Hobby logged');
  const unique = new Set((await getTodaysHobbies()).map((item) => item.hobbyName.toLowerCase()));
  if (unique.size >= 5) await unlockAchievement('hobby_5');
  document.dispatchEvent(new Event('lt:refresh-home'));
  return record;
}
