import { getProfile, saveProfile, todayStr } from './db.js';

export function xpForLevel(n) { return Math.floor(50 * Math.pow(n, 2.2)); }

export const IDENTITY_TIERS = [
  { name: 'Drifting',    minDays: 0,  maxViolationsPerWeek: 99 },
  { name: 'Aware',       minDays: 3,  maxViolationsPerWeek: 3 },
  { name: 'Consistent',  minDays: 7,  maxViolationsPerWeek: 3 },
  { name: 'Disciplined', minDays: 14, maxViolationsPerWeek: 2 },
  { name: 'Committed',   minDays: 30, maxViolationsPerWeek: 2 },
  { name: 'Locked In',   minDays: 60, maxViolationsPerWeek: 1 },
  { name: 'Elite',       minDays: 90, maxViolationsPerWeek: 1 },
  { name: 'Machine',     minDays: 180, maxViolationsPerWeek: 0 },
];

export function identityForStreak(streak, weeklyViolations) {
  let tier = IDENTITY_TIERS[0];
  for (const t of IDENTITY_TIERS) {
    if (streak >= t.minDays && weeklyViolations <= t.maxViolationsPerWeek) tier = t;
    else break;
  }
  return tier.name;
}

export function rankFor(level) {
  const ranks = [
    [1,'Couch Potato'],[3,'Beginner'],[6,'Consistent'],[10,'Disciplined'],
    [15,'Committed'],[20,'Athlete'],[25,'Veteran'],[30,'Elite'],
    [35,'Beast'],[40,'Machine'],[50,'Legend'],[60,'GOD MODE']
  ];
  let rank = ranks[0][1];
  for (const [lvl, name] of ranks) { if (level >= lvl) rank = name; }
  return rank;
}

export function nextRankLevel(level) {
  const ranks = [1,3,6,10,15,20,25,30,35,40,50,60];
  return ranks.find(r => r > level) || null;
}

export function streakMultiplier(streak) {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7)  return 1.25;
  if (streak >= 3)  return 1.1;
  return 1.0;
}

export async function awardXP(base, reason) {
  const profile = await getProfile();
  await markLoggedToday(profile);
  const mult = streakMultiplier(profile.streak);
  const earned = Math.round(base * mult);
  profile.totalXP += earned;

  let leveled = false;
  while (profile.totalXP >= xpForLevel(profile.level + 1)) {
    profile.level++;
    leveled = true;
  }

  await saveProfile(profile);
  document.dispatchEvent(new CustomEvent('selfos:refresh', { detail: { xp: earned, leveled, reason } }));
  return earned;
}

export async function deductXP(amount, reason) {
  const profile = await getProfile();
  profile.totalXP = Math.max(0, profile.totalXP - amount);

  let regressed = false;
  while (profile.level > 1 && profile.totalXP < xpForLevel(profile.level)) {
    profile.level--;
    regressed = true;
  }

  await saveProfile(profile);
  document.dispatchEvent(new CustomEvent('selfos:refresh', { detail: { xp: -amount, regressed, reason } }));
  return amount;
}

export async function markLoggedToday(profile) {
  const today = todayStr();
  if (profile.lastLoggedDate === today) return;

  const last = profile.lastLoggedDate ? new Date(profile.lastLoggedDate) : null;
  const now = new Date(today);
  const diff = last ? Math.round((now - last) / 86400000) : 999;

  if (diff === 1) {
    profile.streak++;
    if (profile.streak > profile.streakRecord) profile.streakRecord = profile.streak;
    if (profile.streak % 7 === 0) profile.freezeTokens = Math.min(3, profile.freezeTokens + 1);
  } else if (diff > 1) {
    profile.streak = 1;
  } else {
    profile.streak = Math.max(1, profile.streak);
  }

  profile.lastLoggedDate = today;
  profile.identity = identityForStreak(profile.streak, profile.violations?.week || 0);
}

export async function checkStreakOnOpen() {
  const profile = await getProfile();
  const today = todayStr();
  if (!profile.lastLoggedDate || profile.lastLoggedDate === today) return;

  const last = new Date(profile.lastLoggedDate);
  const now = new Date(today);
  const diff = Math.round((now - last) / 86400000);

  if (diff <= 1) return;

  if (profile.freezeTokens >= diff - 1) {
    profile.freezeTokens -= (diff - 1);
    profile.lastLoggedDate = dateYesterday();
  } else {
    profile.streak = 0;
    profile.freezeTokens = 0;
    profile.identity = 'Drifting';
  }
  await saveProfile(profile);
}

export async function logViolation(type, note) {
  const profile = await getProfile();
  const today = todayStr();

  const thisMonday = getWeekStart(today);
  if (!profile.violations.lastReset || profile.violations.lastReset < thisMonday) {
    profile.violations.week = 0;
    profile.violations.lastReset = thisMonday;
  }

  profile.violations.week++;
  profile.violations.total++;

  const xpPenalty = { ordering_out: 40, late_night_eating: 25, binge: 50, skipped_workout: 30, sleep_miss: 20, doom_scroll: 15 }[type] || 20;
  await deductXP(xpPenalty, `violation: ${type}`);

  profile.identity = identityForStreak(profile.streak, profile.violations.week);

  if (profile.violations.week >= 3) {
    const idx = IDENTITY_TIERS.findIndex(t => t.name === profile.identity);
    if (idx > 0) profile.identity = IDENTITY_TIERS[idx - 1].name;
  }

  await saveProfile(profile);
  document.dispatchEvent(new CustomEvent('selfos:violation', { detail: { type, penalty: xpPenalty } }));
  return xpPenalty;
}

export async function unlockAchievement(id) {
  const profile = await getProfile();
  if (profile.achievements.includes(id)) return false;
  profile.achievements.push(id);
  await saveProfile(profile);
  document.dispatchEvent(new CustomEvent('selfos:achievement', { detail: { id } }));
  return true;
}

export function xpProgress(profile) {
  const current = profile.totalXP;
  const needed = xpForLevel(profile.level + 1);
  const prev = xpForLevel(profile.level);
  const pct = Math.min(100, Math.round(((current - prev) / (needed - prev)) * 100));
  return { current, needed, prev, pct };
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
