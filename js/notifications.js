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
