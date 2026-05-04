// Daily challenge — pulled from open APIs with a curated fallback list.
// Refreshes once per day. User can complete (+50 XP) or skip (gets a new one).
import { getProfile, saveProfile, todayStr } from './db.js';
import { awardXP } from './gamification.js';
import { toast } from './ui.js';

// Bored API mirrors. The original boredapi.com is flaky — try a few.
const APIS = [
  'https://bored-api.appbrewery.com/random',
  'https://www.boredapi.com/api/activity',
];

// Curated fallback — wholesome / social / pushes outside the screen.
// Mix of social, outdoor, mindful, creative, learning. ~60 items.
export const CURATED_CHALLENGES = [
  { text: 'Strike up a conversation with someone new today', type: 'social', xp: 50 },
  { text: 'Compliment three people genuinely', type: 'social', xp: 50 },
  { text: 'Call or text a friend you haven\'t spoken to in a month', type: 'social', xp: 50 },
  { text: 'Eat lunch with someone instead of alone', type: 'social', xp: 50 },
  { text: 'Listen to someone for 10 min without interrupting', type: 'social', xp: 50 },
  { text: 'Send a thank-you message to a teacher or mentor', type: 'social', xp: 50 },
  { text: 'Help a stranger with something small', type: 'social', xp: 60 },
  { text: 'Walk outside for 30 minutes without your phone', type: 'outdoor', xp: 60 },
  { text: 'Take a different route home today', type: 'outdoor', xp: 40 },
  { text: 'Sit in a park or open space for 20 minutes', type: 'outdoor', xp: 40 },
  { text: 'Watch the sunset (or sunrise) properly', type: 'outdoor', xp: 50 },
  { text: 'Take 10 photos of small beautiful things outside', type: 'outdoor', xp: 50 },
  { text: 'Climb stairs instead of taking the elevator all day', type: 'outdoor', xp: 40 },
  { text: 'Bike or walk to one place you\'d normally drive to', type: 'outdoor', xp: 60 },
  { text: 'Meditate or sit silently for 10 minutes', type: 'mindful', xp: 40 },
  { text: 'Write three things you\'re grateful for', type: 'mindful', xp: 30 },
  { text: 'Spend 30 minutes phone-free, no exceptions', type: 'mindful', xp: 50 },
  { text: 'Journal about your week — no editing, just dump', type: 'mindful', xp: 40 },
  { text: 'Try a 5-minute breathing exercise (4-7-8)', type: 'mindful', xp: 30 },
  { text: 'Single-task one activity completely today', type: 'mindful', xp: 50 },
  { text: 'Cook something you\'ve never cooked before', type: 'creative', xp: 60 },
  { text: 'Draw, doodle, or sketch for 15 minutes', type: 'creative', xp: 40 },
  { text: 'Write a 200-word story or poem', type: 'creative', xp: 50 },
  { text: 'Play an instrument or sing for 15 minutes', type: 'creative', xp: 40 },
  { text: 'Make a playlist of 10 songs from a genre you don\'t usually listen to', type: 'creative', xp: 30 },
  { text: 'Try a new recipe with an ingredient you\'ve never used', type: 'creative', xp: 60 },
  { text: 'Read 20 pages of a non-fiction book', type: 'learning', xp: 40 },
  { text: 'Watch a documentary or explainer on a topic you know nothing about', type: 'learning', xp: 50 },
  { text: 'Learn 5 words in a language you\'ve never studied', type: 'learning', xp: 30 },
  { text: 'Read one long-form article cover to cover', type: 'learning', xp: 40 },
  { text: 'Solve 3 logic puzzles or brain teasers', type: 'learning', xp: 30 },
  { text: 'Watch a TED talk and write down one takeaway', type: 'learning', xp: 40 },
  { text: 'Do 50 pushups today (split however you want)', type: 'fitness', xp: 60 },
  { text: 'Stretch for 15 minutes before bed', type: 'fitness', xp: 40 },
  { text: 'Hold a plank for as long as you can — beat your record', type: 'fitness', xp: 50 },
  { text: 'Try 20 minutes of yoga from a YouTube video', type: 'fitness', xp: 50 },
  { text: 'Walk 8000+ steps today', type: 'fitness', xp: 60 },
  { text: 'Do a full mobility flow (10 min) — neck, hips, ankles', type: 'fitness', xp: 40 },
  { text: 'Eat a fruit you haven\'t eaten this month', type: 'diet', xp: 30 },
  { text: 'Drink water before every meal today', type: 'diet', xp: 40 },
  { text: 'Cook every meal at home today — no takeout', type: 'diet', xp: 70 },
  { text: 'Eat at least 30g of protein at every main meal', type: 'diet', xp: 60 },
  { text: 'Add a vegetable to a meal you don\'t usually put veg in', type: 'diet', xp: 30 },
  { text: 'Skip processed sugar for the whole day', type: 'diet', xp: 70 },
  { text: 'Clean and organize one corner of your space', type: 'discipline', xp: 50 },
  { text: 'Make your bed within 5 min of waking up', type: 'discipline', xp: 30 },
  { text: 'Inbox zero — process every notification and email', type: 'discipline', xp: 60 },
  { text: 'No social media for the whole day', type: 'discipline', xp: 80 },
  { text: 'Wake up 30 min earlier than usual', type: 'discipline', xp: 60 },
  { text: 'Plan tomorrow tonight — top 3 priorities', type: 'discipline', xp: 30 },
  { text: 'Smile at everyone you make eye contact with today', type: 'social', xp: 30 },
  { text: 'Ask a stranger for a recommendation — coffee, book, anything', type: 'social', xp: 50 },
  { text: 'Volunteer 30 minutes of your time to help someone', type: 'social', xp: 70 },
  { text: 'Visit a place in your city you\'ve never been to', type: 'outdoor', xp: 60 },
  { text: 'Buy fresh produce from a local market', type: 'outdoor', xp: 40 },
  { text: 'Have a one-on-one deep conversation today', type: 'social', xp: 60 },
  { text: 'Disconnect from screens 1 hour before bed', type: 'mindful', xp: 50 },
  { text: 'Apologize for something you\'ve been carrying around', type: 'mindful', xp: 70 },
  { text: 'Do something kind anonymously', type: 'social', xp: 60 },
  { text: 'Reflect: what did you learn this week? Write it down', type: 'mindful', xp: 40 },
  { text: 'Try a workout style you\'ve never done (boxing, dance, climbing)', type: 'fitness', xp: 70 },
];

const TYPE_ICONS = {
  social: '👥', outdoor: '🌳', mindful: '🧘', creative: '🎨', learning: '📚',
  fitness: '💪', diet: '🥗', discipline: '⚡', recreational: '🎲', education: '📖',
  music: '🎵', cooking: '🍳', relaxation: '☕', diy: '🔨', charity: '❤️', busywork: '📋',
};

async function fetchFromAPI() {
  for (const url of APIS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const j = await r.json();
      const text = j.activity || j.text;
      if (!text) continue;
      return {
        text,
        type: (j.type || 'recreational').toLowerCase(),
        xp: priceToXP(j.price ?? 0, j.accessibility ?? 0.5),
        source: new URL(url).hostname,
      };
    } catch (e) {
      console.warn('[challenge] api fail', url, e?.message);
    }
  }
  return null;
}

function priceToXP(price, accessibility) {
  // Bored API: price 0-1 (effort/cost), accessibility 0-1 (lower = easier)
  // Higher effort + lower accessibility → more XP. Range 30-80.
  const base = 30 + Math.round(price * 30) + Math.round((1 - accessibility) * 20);
  return Math.min(80, Math.max(30, base));
}

export async function getDailyChallenge() {
  const today = todayStr();
  const p = await getProfile();
  if (p.dailyChallenge && p.dailyChallenge.date === today) {
    return p.dailyChallenge;
  }
  const next = await pickNew();
  await saveProfile({ dailyChallenge: { ...next, date: today, done: false, skipped: 0 } });
  return { ...next, date: today, done: false, skipped: 0 };
}

async function pickNew() {
  const fromApi = await fetchFromAPI();
  if (fromApi) return fromApi;
  const c = CURATED_CHALLENGES[Math.floor(Math.random() * CURATED_CHALLENGES.length)];
  return { ...c, source: 'curated' };
}

export async function skipChallenge() {
  const p = await getProfile();
  const today = todayStr();
  const skipped = (p.dailyChallenge?.skipped || 0) + 1;
  if (skipped >= 3) {
    toast('That\'s 3 skips — sticking with this one for today', 'error');
    return p.dailyChallenge;
  }
  const next = await pickNew();
  const ch = { ...next, date: today, done: false, skipped };
  await saveProfile({ dailyChallenge: ch });
  return ch;
}

export async function completeChallenge() {
  const p = await getProfile();
  const ch = p.dailyChallenge;
  if (!ch || ch.done) return;
  await saveProfile({ dailyChallenge: { ...ch, done: true, completedAt: Date.now() } });
  await awardXP(ch.xp || 50, 'Challenge!');
  toast('Challenge crushed 🎯', 'success');
}

export function challengeIcon(type) {
  return TYPE_ICONS[type] || '🎯';
}
