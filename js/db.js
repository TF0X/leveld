// IndexedDB layer — uses idb (loaded as ESM from CDN). Falls back to a tiny native wrapper if offline-uncached.
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8.0.0/+esm';

const DB_NAME = 'lifetracker';
const DB_VERSION = 2;

export const STORES = {
  profile: 'profile',
  meals: 'meals',
  workouts: 'workouts',
  hobbies: 'hobbies',
  bodyMetrics: 'bodyMetrics',
  dailyScores: 'dailyScores',
  personalRecords: 'personalRecords',
  habits: 'habits',
  habitLogs: 'habitLogs',
};

let _db;
export async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.profile)) db.createObjectStore(STORES.profile, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.meals)) {
        const s = db.createObjectStore(STORES.meals, { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains(STORES.workouts)) {
        const s = db.createObjectStore(STORES.workouts, { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains(STORES.hobbies)) {
        const s = db.createObjectStore(STORES.hobbies, { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains(STORES.bodyMetrics)) {
        const s = db.createObjectStore(STORES.bodyMetrics, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORES.dailyScores)) {
        db.createObjectStore(STORES.dailyScores, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORES.personalRecords)) {
        db.createObjectStore(STORES.personalRecords, { keyPath: 'exerciseName' });
      }
      if (!db.objectStoreNames.contains(STORES.habits)) {
        db.createObjectStore(STORES.habits, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.habitLogs)) {
        const s = db.createObjectStore(STORES.habitLogs, { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
        s.createIndex('habitId', 'habitId');
      }
    },
  });
  return _db;
}

export const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const dateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DEFAULT_PROFILE = {
  id: 'user',
  name: '',
  geminiApiKey: '',
  age: null,
  sex: 'male',
  heightCm: null,
  activityLevel: 'moderate',
  calorieGoalPreset: 'maintain',
  dietPreference: '',
  goals: { calories: 2200, protein: 150, water: 3000, workoutsPerWeek: 4, hobbyMinutes: 60 },
  hobbies: [],
  level: 1,
  totalXP: 0,
  streak: 0,
  lastLoggedDate: null,
  freezeTokens: 0,
  streakRecord: 0,
  achievements: [],
  rollingSummary: null,
  lastBackup: null,
  waterToday: 0,
  waterDate: null,
  lastInsightWeek: null,
  insight: null,
  hourlyNotifEnabled: false,
  lastChallengePenaltyDate: null,
};

export async function getProfile() {
  const db = await getDB();
  const p = await db.get(STORES.profile, 'user');
  if (!p) {
    await db.put(STORES.profile, { ...DEFAULT_PROFILE });
    return { ...DEFAULT_PROFILE };
  }
  return { ...DEFAULT_PROFILE, ...p, goals: { ...DEFAULT_PROFILE.goals, ...(p.goals || {}) } };
}

export async function saveProfile(patch) {
  const db = await getDB();
  const cur = await getProfile();
  const next = { ...cur, ...patch, id: 'user' };
  await db.put(STORES.profile, next);
  return next;
}

export async function addRecord(store, record) {
  const db = await getDB();
  return db.add(store, record);
}

export async function putRecord(store, record) {
  const db = await getDB();
  return db.put(store, record);
}

export async function deleteRecord(store, key) {
  const db = await getDB();
  return db.delete(store, key);
}

export async function getAll(store) {
  const db = await getDB();
  return db.getAll(store);
}

export async function getByDate(store, date) {
  const db = await getDB();
  const idx = db.transaction(store).store.index('date');
  return idx.getAll(date);
}

export async function getByDateRange(store, startDate, endDate) {
  const db = await getDB();
  const tx = db.transaction(store);
  const idx = tx.store.index('date');
  const range = IDBKeyRange.bound(startDate, endDate);
  return idx.getAll(range);
}

export async function clearAll() {
  const db = await getDB();
  for (const name of Object.values(STORES)) {
    await db.clear(name);
  }
}

export async function bulkImport(payload) {
  const db = await getDB();
  for (const name of Object.values(STORES)) {
    if (!Array.isArray(payload[name]) && !(name === 'profile' && payload[name])) continue;
    await db.clear(name);
    if (name === 'profile' && payload.profile) {
      await db.put(STORES.profile, { ...DEFAULT_PROFILE, ...payload.profile, id: 'user' });
      continue;
    }
    for (const rec of payload[name]) {
      try { await db.put(name, rec); } catch { /* ignore */ }
    }
  }
}
