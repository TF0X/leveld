import { STORES, getRecord, putRecord, todayStr } from './db.js';
import { awardXP } from './gamification.js';

export async function getWaterToday() {
  return (await getRecord(STORES.water, todayStr())) || { date: todayStr(), ml: 0, entries: [] };
}

export async function logWater(ml) {
  const value = Math.max(0, Number(ml) || 0);
  if (!value) return getWaterToday();
  const current = await getWaterToday();
  const previousThresholds = Math.floor((current.ml || 0) / 250);
  const next = {
    ...current,
    date: todayStr(),
    ml: (current.ml || 0) + value,
    entries: [...(current.entries || []), { time: new Date().toTimeString().slice(0, 5), ml: value }],
  };
  await putRecord(STORES.water, next);
  const nextThresholds = Math.floor(next.ml / 250);
  const crossed = Math.max(0, nextThresholds - previousThresholds);
  if (crossed) await awardXP(crossed * 2, 'Water logged');
  document.dispatchEvent(new Event('lt:refresh-home'));
  return next;
}

export async function getWaterHistory(days = 30) {
  const end = new Date();
  const rows = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const row = await getRecord(STORES.water, key);
    rows.push(row || { date: key, ml: 0, entries: [] });
  }
  return rows;
}
