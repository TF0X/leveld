// Local notifications wrapper.
// What works (no backend needed):
//   - Browser Notification API while page is open
//   - Service Worker showNotification() — fires reminders when SW wakes (on app open)
//   - Notification Triggers API (Chromium-only, behind flag in some versions) — true scheduled
// What does NOT work without a server: real Web Push when the app is fully closed on
// every platform / iOS. We do best-effort: schedule for today via Triggers if available,
// otherwise queue a "deferred reminder" that fires next time the user opens the app.
import { getProfile, saveProfile, todayStr } from './db.js';
import { toast } from './ui.js';

export const NOTIF_SUPPORTED = typeof Notification !== 'undefined' && typeof navigator.serviceWorker !== 'undefined';

export async function getPermission() {
  if (!NOTIF_SUPPORTED) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission() {
  if (!NOTIF_SUPPORTED) {
    toast('Notifications not supported in this browser', 'error');
    return 'unsupported';
  }
  // Already granted (e.g. via Android site settings) — skip the prompt
  if (Notification.permission === 'granted') {
    await saveProfile({ notificationsEnabled: true, notifyHour: 19 });
    await scheduleDailyReminder();
    toast('Notifications enabled', 'success');
    return 'granted';
  }
  const r = await Notification.requestPermission();
  if (r === 'granted') {
    toast('Notifications enabled', 'success');
    await saveProfile({ notificationsEnabled: true, notifyHour: 19 });
    await scheduleDailyReminder();
  } else if (r === 'denied') {
    toast('Permission denied — enable from browser settings', 'error');
  }
  return r;
}

export async function disableNotifications() {
  await saveProfile({ notificationsEnabled: false });
  toast('Reminders off');
}

export async function setReminderHour(hour) {
  await saveProfile({ notifyHour: Number(hour) });
  await scheduleDailyReminder();
}

// Show a notification immediately. Used for in-session events (goal hit, level up etc.)
export async function notify(title, body, opts = {}) {
  if (!NOTIF_SUPPORTED || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
        tag: opts.tag || 'leveld', renotify: !!opts.renotify, ...opts,
      });
    } else {
      new Notification(title, { body, icon: 'icons/icon-192.png' });
    }
  } catch (e) {
    console.warn('[notify] fail', e);
  }
}

// Schedule daily reminder via Notification Triggers API (Chromium experimental).
// If unsupported, the SW + on-open check below acts as a fallback.
export async function scheduleDailyReminder() {
  const p = await getProfile();
  if (!p.notificationsEnabled) return;
  const hour = p.notifyHour || 19;
  if (!('TimestampTrigger' in window)) {
    return; // Browser doesn't support scheduled triggers; fallback handled on app open.
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    // Cancel previous scheduled
    const existing = await reg.getNotifications({ includeTriggered: true });
    for (const n of existing) if (n.tag?.startsWith('leveld-daily')) n.close();

    // Schedule for next 7 days
    for (let i = 0; i < 7; i++) {
      const when = new Date();
      when.setDate(when.getDate() + i);
      when.setHours(hour, 0, 0, 0);
      if (when.getTime() < Date.now()) continue;
      await reg.showNotification('leveld — daily check-in', {
        body: 'Log today\'s wins. Keep your streak alive 🔥',
        icon: 'icons/icon-192.png',
        tag: `leveld-daily-${when.toDateString()}`,
        // eslint-disable-next-line no-undef
        showTrigger: new TimestampTrigger(when.getTime()),
        data: { type: 'daily-reminder' },
      });
    }
  } catch (e) {
    console.warn('[notify] schedule fail', e);
  }
}

// Schedule water drink reminders for today at chosen interval (8am–9pm).
export async function scheduleWaterReminders() {
  if (!NOTIF_SUPPORTED || Notification.permission !== 'granted') return;
  const p = await getProfile();
  if (!p.waterReminderEnabled) return;
  const interval = p.waterReminderInterval || 2;
  if (!('TimestampTrigger' in window)) return; // fallback handled by startWaterInterval
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    // Clear old water reminders
    const existing = await reg.getNotifications({ includeTriggered: true });
    for (const n of existing) if (n.tag?.startsWith('leveld-water')) n.close();
    // Schedule from next slot until 9pm
    const end = new Date(); end.setHours(21, 0, 0, 0);
    const when = new Date(); when.setMinutes(0, 0, 0); when.setHours(when.getHours() + interval);
    while (when <= end && when.getTime() > Date.now()) {
      await reg.showNotification('💧 Time to drink water', {
        body: `Stay on track — goal: ${p.goals.water}ml today. Open the app to log.`,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: `leveld-water-${when.getHours()}`,
        // eslint-disable-next-line no-undef
        showTrigger: new TimestampTrigger(when.getTime()),
        renotify: true,
        data: { type: 'water-reminder' },
      });
      when.setHours(when.getHours() + interval);
    }
  } catch (e) {
    console.warn('[water-notif] schedule fail', e);
  }
}

// setInterval fallback — fires while page is open, skips if goal already hit.
export function startWaterInterval(getProfileFn) {
  let intervalId;
  function msUntilNext(intervalHours) {
    const now = new Date();
    const rem = intervalHours * 3600000 - (now.getMinutes() * 60000 + now.getSeconds() * 1000 + now.getMilliseconds());
    return rem > 0 ? rem : intervalHours * 3600000;
  }
  async function fire() {
    const p = typeof getProfileFn === 'function' ? await getProfileFn() : await getProfile();
    if (!p.waterReminderEnabled || Notification.permission !== 'granted') return;
    const hour = new Date().getHours();
    if (hour < 8 || hour >= 21) return; // outside waking window
    const water = p.waterDate === todayStr() ? (p.waterToday || 0) : 0;
    if (water >= p.goals.water) return; // goal already hit
    const pct = Math.round((water / Math.max(1, p.goals.water)) * 100);
    notify('💧 Drink water', `${water}ml / ${p.goals.water}ml (${pct}%) — keep going.`, { tag: 'leveld-water-interval', renotify: true });
  }
  const interval = 2; // default; accurate schedule is done via Triggers API
  const timeoutId = setTimeout(async () => {
    await fire();
    const p = await getProfile();
    const h = (p.waterReminderInterval || 2) * 3600000;
    intervalId = setInterval(fire, h);
  }, msUntilNext(interval));
  return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
}

// ── Hourly motivational notifications (available to all users) ────────────
const HOURLY_NOTIFS = [
  { title: 'Still going?', body: "Good. Don't stop now." },
  { title: 'Another hour down.', body: 'What did you log? Keep the streak alive.' },
  { title: 'Habits don\'t build themselves.', body: 'You do. Check in.' },
  { title: 'Quick check-in.', body: 'Log a meal, a habit, or anything. Every entry counts.' },
  { title: 'You set goals for a reason.', body: 'This hour is your chance to honour them.' },
  { title: 'Progress update:', body: 'Only you know if today has been a win yet.' },
  { title: 'Reminder.', body: 'The version of you that succeeds logs consistently.' },
  { title: 'One hour, one action.', body: 'Log something and move forward.' },
  { title: 'Small wins stack up.', body: 'Tick off a habit. Log a meal. It adds up.' },
  { title: 'Checking in.', body: "How's the day going? Open the app and see." },
  { title: 'Your goals are waiting.', body: 'Open leveld and make some progress.' },
  { title: 'Consistency beats perfection.', body: "Log what you have, not what you wish you had." },
  { title: 'Mid-session nudge.', body: 'Are you on track? Take 30 seconds to check.' },
  { title: 'Another hour, another choice.', body: 'Make it count.' },
  { title: 'Level up starts here.', body: 'Log something and earn your XP.' },
  { title: 'You showed up.', body: 'Now finish the day strong. Log your progress.' },
  { title: 'Streak check.', body: "Don't let today be the day you break it." },
  { title: 'Habits are built hourly.', body: 'Keep the momentum going.' },
  { title: 'Time check.', body: "Is everything logged? Don't leave gaps." },
  { title: 'This is the hour.', body: 'One log, one habit, one step closer.' },
];

export async function scheduleHourlyNotifs() {
  if (!NOTIF_SUPPORTED || Notification.permission !== 'granted') return;
  const p = await getProfile();
  if (!p.hourlyNotifEnabled) return;
  if (!('TimestampTrigger' in window)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const existing = await reg.getNotifications({ includeTriggered: true });
    for (const n of existing) if (n.tag?.startsWith('leveld-hourly')) n.close();
    const hours = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
    let idx = p.hourlyNotifIdx || 0;
    for (const h of hours) {
      const when = new Date();
      when.setHours(h, 0, 0, 0);
      if (when.getTime() <= Date.now()) continue;
      const msg = HOURLY_NOTIFS[idx % HOURLY_NOTIFS.length];
      try {
        await reg.showNotification(msg.title, {
          body: msg.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
          tag: `leveld-hourly-${h}`,
          // eslint-disable-next-line no-undef
          showTrigger: new TimestampTrigger(when.getTime()),
          renotify: true, data: { type: 'hourly' },
        });
      } catch {}
      idx++;
    }
    await saveProfile({ hourlyNotifIdx: idx });
  } catch (e) { console.warn('[hourly-notif] schedule fail', e); }
}

export function startHourlyInterval(getProfileFn) {
  const now = new Date();
  const msUntilHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();
  let intervalId;
  const timeoutId = setTimeout(async () => {
    await fireHourlyNotif(getProfileFn);
    intervalId = setInterval(() => fireHourlyNotif(getProfileFn), 3600000);
  }, msUntilHour);
  return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
}

async function fireHourlyNotif(getProfileFn) {
  const p = typeof getProfileFn === 'function' ? await getProfileFn() : await getProfile();
  if (!p.hourlyNotifEnabled) return;
  if (Notification.permission !== 'granted') return;
  const hour = new Date().getHours();
  if (hour < 7 || hour > 22) return;
  const idx = (p.hourlyNotifIdx || 0) % HOURLY_NOTIFS.length;
  const msg = HOURLY_NOTIFS[idx];
  await notify(msg.title, msg.body, { tag: 'leveld-hourly-interval', renotify: true });
  await saveProfile({ hourlyNotifIdx: idx + 1 });
}

// Called on every app boot — fires "missed reminder" notification if applicable.
export async function checkMissedReminder() {
  if (!NOTIF_SUPPORTED || Notification.permission !== 'granted') return;
  const p = await getProfile();
  if (!p.notificationsEnabled) return;
  const today = todayStr();
  // If user hasn't logged today and it's past their reminder hour, show toast (in-app).
  const hour = p.notifyHour || 19;
  const now = new Date();
  if (now.getHours() >= hour && p.lastLoggedDate !== today) {
    notify('No log yet today', 'Quick — a meal, a hobby, or a workout. Anything counts.', { tag: 'leveld-nudge' });
  }
  // Streak at risk warning
  if (p.streak > 0 && p.lastLoggedDate !== today && now.getHours() >= 20) {
    notify(`🔥 ${p.streak}-day streak at risk`, 'Log anything before midnight to keep it.', { tag: 'leveld-streak' });
  }
}
