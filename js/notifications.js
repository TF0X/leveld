import { STORES, addRecord, getAll, getProfile, getRecord, putRecord, saveProfile } from './db.js';

const DEFAULT_SCHEDULE = [
  { id: 'streak-warning', type: 'streak-warn', enabled: true, time: '20:00', days: [0, 1, 2, 3, 4, 5, 6], message: 'Log something before the day ends.' },
  { id: 'weekly-insight', type: 'weekly-insight', enabled: true, time: '09:00', days: [1], message: 'Your weekly insight is ready.' },
];

let intervalHandle = null;

export const NOTIF_SUPPORTED = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

export async function ensureDefaultSchedules() {
  const schedules = await getAll(STORES.notifSchedule);
  if (schedules.length) return schedules;
  for (const item of DEFAULT_SCHEDULE) {
    await putRecord(STORES.notifSchedule, item);
  }
  return getAll(STORES.notifSchedule);
}

export async function getPermission() {
  return NOTIF_SUPPORTED ? Notification.permission : 'denied';
}

export async function requestPermission() {
  if (!NOTIF_SUPPORTED) return 'denied';
  const result = await Notification.requestPermission();
  if (result === 'granted') await saveProfile({ notificationsEnabled: true });
  return result;
}

export async function disableNotifications() {
  await saveProfile({ notificationsEnabled: false });
}

export async function upsertSchedule(schedule) {
  await putRecord(STORES.notifSchedule, schedule);
}

export async function getSchedules() {
  return getAll(STORES.notifSchedule);
}

function inQuietHours(profile, hour) {
  const { start, end } = profile.notifQuietHours || { start: 22, end: 7 };
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

async function notify(title, body, data = {}) {
  if (!NOTIF_SUPPORTED || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    tag: data.type || 'leveld-reminder',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data,
  });
}

export async function startNotificationLoop() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = window.setInterval(runNotificationChecks, 60_000);
  await runNotificationChecks();
}

export async function runNotificationChecks() {
  const profile = await getProfile();
  if (!profile.notificationsEnabled) return;
  const schedules = await ensureDefaultSchedules();
  const now = new Date();
  const day = now.getDay();
  const hhmm = now.toTimeString().slice(0, 5);
  if (inQuietHours(profile, now.getHours())) return;
  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.days.includes(day) || schedule.time !== hhmm) continue;
    const dedupeKey = `${schedule.id}:${now.toISOString().slice(0, 10)}:${hhmm}`;
    const alreadySent = await getRecord(STORES.notifSchedule, `${dedupeKey}:sent`);
    if (alreadySent) continue;
    await notify('LevelD', schedule.message, { type: schedule.type });
    await putRecord(STORES.notifSchedule, { id: `${dedupeKey}:sent`, kind: 'meta', createdAt: Date.now() });
  }
}
