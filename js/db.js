import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

export const DB_NAME = 'lifetracker';
export const DB_VERSION = 5;

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
  todos: 'todos',
  shredChallenges: 'shredChallenges',
  negativeHabitLogs: 'negativeHabitLogs',
  water: 'water',
  mealTemplates: 'mealTemplates',
  notifSchedule: 'notifSchedule',
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
  goals: {
    calories: 2200,
    protein: 150,
    water: 3000,
    workoutsPerWeek: 4,
    hobbyMinutes: 60,
  },
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
  lastInsightWeek: null,
  insight: null,
  onboardingComplete: false,
  homeCardOrder: ['streak', 'ring', 'quickLog', 'quests', 'habits'],
  notifQuietHours: { start: 22, end: 7 },
  theme: 'dark',
  shredMode: false,
};

let _db;

export function todayStr() {
  return dateStr(new Date());
}

export function dateStr(input) {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      ensureStores(db);
      if (oldVersion < 3) {
        const profileStore = tx.objectStore(STORES.profile);
        const profile = await profileStore.get('user');
        if (profile) {
          if (profile.waterToday > 0 && profile.waterDate) {
            await tx.objectStore(STORES.water).put({
              date: profile.waterDate,
              ml: profile.waterToday,
              entries: [{ time: '09:00', ml: profile.waterToday }],
            });
          }
          delete profile.waterToday;
          delete profile.waterDate;
          delete profile.lastChallengePenaltyDate;
          delete profile.hourlyNotifEnabled;
          profile.homeCardOrder ||= DEFAULT_PROFILE.homeCardOrder;
          profile.onboardingComplete ??= true;
          profile.notifQuietHours ||= DEFAULT_PROFILE.notifQuietHours;
          profile.theme ||= 'dark';
          await profileStore.put(profile);
        }
      }
      if (oldVersion < 4 && db.objectStoreNames.contains(STORES.todos) === false) {
        const todoStore = db.createObjectStore(STORES.todos, { keyPath: 'id', autoIncrement: true });
        todoStore.createIndex('completed', 'completed');
        todoStore.createIndex('createdAt', 'createdAt');
      }
      if (oldVersion < 5) {
        if (db.objectStoreNames.contains(STORES.shredChallenges) === false) {
          db.createObjectStore(STORES.shredChallenges, { keyPath: 'date' });
        }
        if (db.objectStoreNames.contains(STORES.negativeHabitLogs) === false) {
          const store = db.createObjectStore(STORES.negativeHabitLogs, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date');
        }
        const profileStore = tx.objectStore(STORES.profile);
        const profile = await profileStore.get('user');
        if (profile) {
          profile.shredMode ??= false;
          await profileStore.put(profile);
        }
      }
    },
  });
  return _db;
}

function ensureStores(db) {
  if (!db.objectStoreNames.contains(STORES.profile)) {
    db.createObjectStore(STORES.profile, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORES.meals)) {
    const store = db.createObjectStore(STORES.meals, { keyPath: 'id', autoIncrement: true });
    store.createIndex('date', 'date');
    store.createIndex('descriptionLower', 'descriptionLower');
  }
  if (!db.objectStoreNames.contains(STORES.workouts)) {
    const store = db.createObjectStore(STORES.workouts, { keyPath: 'id', autoIncrement: true });
    store.createIndex('date', 'date');
  }
  if (!db.objectStoreNames.contains(STORES.hobbies)) {
    const store = db.createObjectStore(STORES.hobbies, { keyPath: 'id', autoIncrement: true });
    store.createIndex('date', 'date');
  }
  if (!db.objectStoreNames.contains(STORES.bodyMetrics)) {
    db.createObjectStore(STORES.bodyMetrics, { keyPath: 'date' });
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
    const store = db.createObjectStore(STORES.habitLogs, { keyPath: 'id', autoIncrement: true });
    store.createIndex('date', 'date');
    store.createIndex('habitId', 'habitId');
  }
  if (!db.objectStoreNames.contains(STORES.todos)) {
    const store = db.createObjectStore(STORES.todos, { keyPath: 'id', autoIncrement: true });
    store.createIndex('completed', 'completed');
    store.createIndex('createdAt', 'createdAt');
  }
  if (!db.objectStoreNames.contains(STORES.shredChallenges)) {
    db.createObjectStore(STORES.shredChallenges, { keyPath: 'date' });
  }
  if (!db.objectStoreNames.contains(STORES.negativeHabitLogs)) {
    const store = db.createObjectStore(STORES.negativeHabitLogs, { keyPath: 'id', autoIncrement: true });
    store.createIndex('date', 'date');
  }
  if (!db.objectStoreNames.contains(STORES.water)) {
    db.createObjectStore(STORES.water, { keyPath: 'date' });
  }
  if (!db.objectStoreNames.contains(STORES.mealTemplates)) {
    const store = db.createObjectStore(STORES.mealTemplates, { keyPath: 'id', autoIncrement: true });
    store.createIndex('useCount', 'useCount');
  }
  if (!db.objectStoreNames.contains(STORES.notifSchedule)) {
    db.createObjectStore(STORES.notifSchedule, { keyPath: 'id' });
  }
}

export async function getProfile() {
  const db = await getDB();
  const profile = await db.get(STORES.profile, 'user');
  if (!profile) {
    await db.put(STORES.profile, structuredClone(DEFAULT_PROFILE));
    return structuredClone(DEFAULT_PROFILE);
  }
  return {
    ...DEFAULT_PROFILE,
    ...profile,
    goals: { ...DEFAULT_PROFILE.goals, ...(profile.goals || {}) },
    notifQuietHours: { ...DEFAULT_PROFILE.notifQuietHours, ...(profile.notifQuietHours || {}) },
    homeCardOrder: Array.isArray(profile.homeCardOrder) ? profile.homeCardOrder : DEFAULT_PROFILE.homeCardOrder,
  };
}

export async function saveProfile(patch) {
  const db = await getDB();
  const current = await getProfile();
  const next = {
    ...current,
    ...patch,
    id: 'user',
    goals: { ...current.goals, ...(patch.goals || {}) },
    notifQuietHours: { ...current.notifQuietHours, ...(patch.notifQuietHours || {}) },
  };
  await db.put(STORES.profile, next);
  return next;
}

export async function addRecord(store, value) {
  const db = await getDB();
  return db.add(store, value);
}

export async function putRecord(store, value) {
  const db = await getDB();
  return db.put(store, value);
}

export async function getRecord(store, key) {
  const db = await getDB();
  return db.get(store, key);
}

export async function deleteRecord(store, key) {
  const db = await getDB();
  return db.delete(store, key);
}

export async function clearStore(store) {
  const db = await getDB();
  return db.clear(store);
}

export async function getAll(store) {
  const db = await getDB();
  return db.getAll(store);
}

export async function getByDate(store, date) {
  const db = await getDB();
  return db.getAllFromIndex(store, 'date', date);
}

export async function getByDateRange(store, startDate, endDate) {
  const db = await getDB();
  return db.getAllFromIndex(store, 'date', IDBKeyRange.bound(startDate, endDate));
}

export async function bulkImport(payload) {
  const db = await getDB();
  const tx = db.transaction(Object.values(STORES), 'readwrite');
  for (const name of Object.values(STORES)) {
    await tx.objectStore(name).clear();
  }
  if (payload.profile) {
    await tx.objectStore(STORES.profile).put({ ...DEFAULT_PROFILE, ...payload.profile, id: 'user' });
  }
  for (const name of Object.values(STORES)) {
    if (name === STORES.profile || !Array.isArray(payload[name])) continue;
    for (const row of payload[name]) {
      await tx.objectStore(name).put(row);
    }
  }
  await tx.done;
}

export async function clearAll() {
  const db = await getDB();
  const tx = db.transaction(Object.values(STORES), 'readwrite');
  for (const name of Object.values(STORES)) {
    await tx.objectStore(name).clear();
  }
  await tx.done;
}
