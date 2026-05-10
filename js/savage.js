// Shred Mode — antagonistic notifications, penalties, shred challenges.
import { getProfile, saveProfile, getByDate, todayStr, dateStr } from './db.js';
import { notify, NOTIF_SUPPORTED } from './notifications.js';
import { toast } from './ui.js';

export const SAVAGE_NOTIFS = [
  // Morning
  { title: 'You still asleep?', body: "Your alarm went off. Your gains didn't wait." },
  { title: 'Morning. Still fat.', body: 'The deficit doesn\'t shrink itself. Move.' },
  { title: 'Congrats on waking up.', body: 'Now do the other 99% that actually matters.' },
  { title: 'Day 1? Again?', body: 'Your body remembers every skipped rep. Log something.' },
  // Midday
  { title: 'You haven\'t logged lunch yet.', body: 'Fascinating. Wonder what else you\'re skipping.' },
  { title: 'Halfway through the day.', body: 'Your progress bar is as empty as your effort.' },
  { title: 'Checked your macros lately?', body: 'No? Wild. Truly shocking.' },
  { title: 'Quick check-in.', body: 'Workout: ❌  Protein: ❌  Excuses: ✅✅✅' },
  { title: 'It\'s noon.', body: 'Most shredded people already trained this morning. Just saying.' },
  { title: 'Still winging it?', body: 'Log your meals or the cutting phase is just wishful thinking.' },
  // Afternoon
  { title: 'Afternoon slump?', body: 'Or are you just hiding from the gym again?' },
  { title: 'Haven\'t seen a workout log.', body: 'Your future body is very disappointed in your current body.' },
  { title: 'This hour is gone.', body: 'Did you make it count or just scroll?' },
  { title: 'Hey.', body: 'Log something. Now. Before you forget you have goals.' },
  { title: 'Hydrated?', body: 'Or are you confusing thirst with hunger AGAIN?' },
  { title: 'Protein goal check.', body: 'You\'re behind. You know it. Stop pretending you\'ll catch up at dinner.' },
  { title: 'Random thought:', body: 'What if you just... did the workout?' },
  { title: 'You said you\'d start today.', body: 'It\'s today. Clocks are running.' },
  { title: 'How\'s that cut going?', body: 'Every unlogged meal is a mystery macros void. Unhelpful.' },
  // Evening
  { title: 'Evening check.', body: 'Did you earn today or just survive it?' },
  { title: 'Day\'s almost over.', body: 'Your streak is judging your choices right now.' },
  { title: 'Not too late.', body: 'A 20-minute walk still beats zero. Go.' },
  { title: 'Dinner time.', body: 'High protein. Low excuses.' },
  { title: 'Checking in before it\'s too late.', body: 'Log your day. Your streak doesn\'t care about your mood.' },
  { title: 'Final hour alert.', body: 'Missed quest XP incoming if you don\'t move.' },
  { title: 'Almost midnight.', body: 'Did you log weight? Hit protein? Even a hobby? Anything?' },
  // Brutal general
  { title: 'Hot take:', body: 'The fat won\'t leave on its own. Shocking, I know.' },
  { title: 'Gentle reminder:', body: 'You wanted to be shredded. This hour is not helping that.' },
  { title: 'Accountability check.', body: 'No one\'s going to track your macros for you. That\'s literally what this app is for.' },
  { title: 'Not judging. Kinda judging.', body: 'Log your meals before you \'forget\' what you ate.' },
  { title: 'Streak alert.', body: 'One missed day erases the momentum. Don\'t.' },
  { title: 'Reality check incoming.', body: 'Feeling full? Good. Log it so we know how full.' },
  { title: 'You told the app you want to be shredded.', body: 'The app believes you. Do you?' },
  { title: 'Somewhere right now', body: 'someone with your exact same genetics is training harder.' },
  { title: 'Weekly recap preview:', body: 'It\'s looking rough. You can still change that today.' },
  { title: 'Fun fact:', body: 'Unlogged food still has calories. Mind-blowing.' },
  { title: 'PSA:', body: 'Water is not optional when cutting. Drink it.' },
  { title: 'The body you want', body: 'is built in the hours you\'d rather be doing nothing.' },
  { title: 'Checking your quests...', body: 'Some incomplete. Losing XP. Cool, cool, cool.' },
  { title: 'Just so you know,', body: 'every hour you don\'t train is an hour someone else does.' },
];

export const SHRED_CHALLENGES = [
  // Diet — doable anywhere, including office
  { text: 'Eat a high-protein lunch today — minimum 40g. Log it. No skipping.', type: 'diet', xp: 70 },
  { text: 'No sugar today. Not in chai, not in snacks, not hidden in sauces. Zero.', type: 'diet', xp: 85 },
  { text: 'Skip the afternoon snack. You\'re cutting. Sit with the hunger for 30 min.', type: 'diet', xp: 75 },
  { text: 'Drink 500ml water before every meal today. No exceptions.', type: 'diet', xp: 55 },
  { text: 'No processed food for the rest of today. Real food only. Check every label.', type: 'diet', xp: 80 },
  { text: 'Order or cook dinner with 30g+ protein. Log every ingredient.', type: 'diet', xp: 70 },
  { text: 'Cook your own dinner tonight — no delivery, no takeout. Track it all.', type: 'diet', xp: 85 },
  { text: 'Zero liquid calories today. Water, black chai, black coffee only. Nothing else.', type: 'diet', xp: 80 },
  { text: 'Last meal before 8 PM. Kitchen closes at 8. Not 8:10. Eight.', type: 'diet', xp: 70 },
  { text: 'Add a vegetable to every meal today. Even if it\'s just a side of cucumber.', type: 'diet', xp: 55 },
  { text: 'Weigh every meal you eat today. Estimate nothing. Log exact numbers.', type: 'diet', xp: 75 },
  { text: 'No oil in any meal you cook today. Steam, boil, or grill. That\'s it.', type: 'diet', xp: 80 },
  // Movement — office-compatible
  { text: 'Take the stairs every single time today. Not once. Every. Single. Time.', type: 'fitness', xp: 65 },
  { text: 'Walk during your lunch break — minimum 15 minutes. No eating at your desk.', type: 'fitness', xp: 70 },
  { text: 'Stand up and walk around for 2 minutes every hour today. Set a reminder.', type: 'fitness', xp: 60 },
  { text: '10,000 steps before you sleep tonight. Check. No rounding up.', type: 'fitness', xp: 80 },
  { text: 'Walk to get water every 45 minutes today. Leave your desk. Move.', type: 'fitness', xp: 55 },
  // Discipline — mindset and habits
  { text: 'No social media until tonight\'s workout is logged. Lock the apps if you have to.', type: 'discipline', xp: 75 },
  { text: 'Plan tomorrow\'s meals before you go to sleep. Every meal. Written down.', type: 'discipline', xp: 65 },
  { text: 'Log every single thing you eat today. Nothing unlogged. Not even a biscuit.', type: 'discipline', xp: 70 },
  { text: 'Set a 10 PM alarm for sleep. Shredding starts with recovery. Hit it.', type: 'discipline', xp: 60 },
  { text: 'Weigh yourself tomorrow morning the moment you wake up. Log it tonight as a reminder.', type: 'discipline', xp: 55 },
];

const PENALTY_KEY = 'lastPenaltyDate';

// Called once per day on app boot. Checks yesterday's activity and penalizes if shred mode on.
export async function applyMidnightPenalty() {
  const p = await getProfile();
  if (!p.shredMode) return;
  const today = todayStr();
  if (p[PENALTY_KEY] === today) return; // already ran today — don't fire again on re-open

  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterday = dateStr(yesterdayDate);

  // Case 1: Missed the entire yesterday — no log at all
  const missedEntireDay = !p.lastLoggedDate ||
    (p.lastLoggedDate !== today && p.lastLoggedDate !== yesterday);

  if (missedEntireDay) {
    const penalty = 50;
    const newXP = Math.max(0, (p.totalXP || 0) - penalty);
    await saveProfile({ totalXP: newXP, [PENALTY_KEY]: today });
    toast(`💀 -${penalty} XP — you skipped yesterday entirely`, 'error');
    document.dispatchEvent(new CustomEvent('lt:penalty', { detail: { xp: penalty, reason: 'Skipped entire day' } }));
    return;
  }

  // Case 2: Logged something yesterday or today — check yesterday's quest completion
  const [meals, workouts] = await Promise.all([
    getByDate('meals', yesterday),
    getByDate('workouts', yesterday),
  ]);

  let penalty = 0;
  const missed = [];
  if (meals.length < 3) { penalty += 15; missed.push('< 3 meals logged'); }
  if (workouts.length === 0) { penalty += 20; missed.push('no workout'); }

  await saveProfile({ [PENALTY_KEY]: today });
  if (penalty > 0) {
    const newXP = Math.max(0, (p.totalXP || 0) - penalty);
    await saveProfile({ totalXP: newXP });
    toast(`💀 -${penalty} XP — yesterday: ${missed.join(', ')}`, 'error');
    document.dispatchEvent(new CustomEvent('lt:penalty', { detail: { xp: penalty, reason: missed.join(', ') } }));
  }
}

// Schedule hourly savage notifications for today using Notification Triggers API.
// Falls back to a stored queue that fires on next app open.
export async function scheduleSavageNotifs() {
  if (!NOTIF_SUPPORTED || Notification.permission !== 'granted') return;
  const p = await getProfile();
  if (!p.savageNotifs) return;

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  // Try to register periodic background sync (Chrome PWA, requires install)
  try {
    if ('periodicSync' in reg) {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        await reg.periodicSync.register('leveld-savage', { minInterval: 3600000 });
      }
    }
  } catch {}

  const hasTriggers = 'TimestampTrigger' in window;
  const hours = [8, 10, 12, 14, 16, 18, 20, 22];
  const now = new Date();
  const notifIdx = p.savageNotifIdx || 0;
  let idx = notifIdx;

  if (hasTriggers) {
    // Clear old savage notifications
    try {
      const existing = await reg.getNotifications({ includeTriggered: true });
      for (const n of existing) {
        if (n.tag?.startsWith('leveld-savage')) n.close();
      }
    } catch {}

    let scheduled = 0;
    for (const h of hours) {
      const when = new Date();
      when.setHours(h, 0, 0, 0);
      if (when.getTime() <= Date.now()) continue;
      const msg = SAVAGE_NOTIFS[idx % SAVAGE_NOTIFS.length];
      try {
        await reg.showNotification(msg.title, {
          body: msg.body,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          tag: `leveld-savage-${h}`,
          // eslint-disable-next-line no-undef
          showTrigger: new TimestampTrigger(when.getTime()),
          data: { type: 'savage' },
          renotify: true,
        });
        scheduled++;
      } catch {}
      idx++;
    }
    if (scheduled > 0) await saveProfile({ savageNotifIdx: idx });
  } else {
    // Queue for on-open check
    await saveProfile({ savageNotifIdx: idx });
  }
}

// setInterval fallback — fires while the page is open.
// Returns the interval ID so caller can clear it.
export function startSavageInterval(getProfileFn) {
  // Align to next whole hour
  const now = new Date();
  const msUntilHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();

  let intervalId;
  const timeoutId = setTimeout(async () => {
    await fireSavageNotif(getProfileFn);
    intervalId = setInterval(() => fireSavageNotif(getProfileFn), 3600000);
  }, msUntilHour);

  // Return a cleanup fn
  return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
}

async function fireSavageNotif(getProfileFn) {
  const p = typeof getProfileFn === 'function' ? await getProfileFn() : await getProfile();
  if (!p.savageNotifs) return;
  if (Notification.permission !== 'granted') return;
  const idx = (p.savageNotifIdx || 0) % SAVAGE_NOTIFS.length;
  const msg = SAVAGE_NOTIFS[idx];
  await notify(msg.title, msg.body, { tag: 'leveld-savage-interval', renotify: true });
  await saveProfile({ savageNotifIdx: idx + 1 });
}

// Pick a shred challenge (separate from the normal curated list).
export function getShredChallenge() {
  return SHRED_CHALLENGES[Math.floor(Math.random() * SHRED_CHALLENGES.length)];
}
