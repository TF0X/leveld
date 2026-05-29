const DB_NAME = 'selfos';
const DB_VERSION = 5;
let _db = null;

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const PROFILE_DEFAULTS = {
  id: 'user', name: '', gptApiKey: '',
  age: null, sex: null, heightCm: null, activityLevel: 'moderate',
  calorieGoalPreset: 'shred', dietPreference: 'indian',
  goals: { calories: 1800, protein: 180, water: 3000, workoutsPerWeek: 5, hobbyMinutes: 60, sleepHours: 7.5, bedtime: '23:00', wakeTime: '06:30' },
  hobbies: [],
  level: 1, totalXP: 0,
  streak: 0, lastLoggedDate: null, freezeTokens: 0, streakRecord: 0,
  achievements: [],
  rollingSummary: null, behaviorSummary: null,
  lastBackup: null, lastInsightWeek: null, insight: null,
  onboardingComplete: false,
  homeCardOrder: ['hero','farm','quests','habits','quicklog'],
  notifQuietHours: { start: 22, end: 7 },
  theme: 'dark', notifTone: 'savage',
  violations: { week: 0, total: 0, lastReset: null },
  identity: 'Drifting',
  farmSeason: 'summer',
  farmOrganisms: 3,
};

export async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      const stores = [
        ['profile', { keyPath: 'id' }],
        ['meals', { autoIncrement: true }],
        ['workouts', { autoIncrement: true }],
        ['hobbies', { autoIncrement: true }],
        ['bodyMetrics', { keyPath: 'date' }],
        ['dailyScores', { keyPath: 'date' }],
        ['personalRecords', { keyPath: 'exerciseName' }],
        ['habits', { autoIncrement: true }],
        ['habitLogs', { autoIncrement: true }],
        ['water', { keyPath: 'date' }],
        ['mealTemplates', { autoIncrement: true }],
        ['notifSchedule', { keyPath: 'id' }],
        ['quests', { autoIncrement: true }],
        ['todos', { autoIncrement: true }],
        ['violations', { autoIncrement: true }],
        ['cravings', { autoIncrement: true }],
        ['questTasks', { keyPath: 'date' }],
      ];
      for (const [name, opts] of stores) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, opts);
          if (name === 'meals') { store.createIndex('date', 'date'); store.createIndex('descriptionLower', 'descriptionLower'); }
          if (name === 'workouts' || name === 'hobbies') store.createIndex('date', 'date');
          if (name === 'habitLogs') { store.createIndex('date', 'date'); store.createIndex('habitId', 'habitId'); }
          if (name === 'violations') store.createIndex('date', 'date');
          if (name === 'cravings') store.createIndex('date', 'date');
          if (name === 'todos') store.createIndex('dueDate', 'dueDate');
        }
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

export async function getProfile() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile', 'readonly');
    const req = tx.objectStore('profile').get('user');
    req.onsuccess = () => {
      const stored = req.result || {};
      const merged = deepMerge({ ...PROFILE_DEFAULTS }, stored);
      resolve(merged);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveProfile(profile) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile', 'readwrite');
    const req = tx.objectStore('profile').put(profile);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function addRecord(store, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putRecord(store, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecord(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getRecord(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getByDate(store, date) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const req = os.indexNames.contains('date')
      ? os.index('date').getAll(IDBKeyRange.only(date))
      : os.getAll(IDBKeyRange.only(date));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getByDateRange(store, start, end) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const req = os.indexNames.contains('date')
      ? os.index('date').getAll(IDBKeyRange.bound(start, end))
      : os.getAll(IDBKeyRange.bound(start, end));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllRecords(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function exportAll() {
  const stores = ['profile','meals','workouts','hobbies','bodyMetrics','dailyScores','personalRecords','habits','habitLogs','water','mealTemplates','quests','todos','violations','cravings','questTasks'];
  const out = { version: 2, exportedAt: new Date().toISOString() };
  for (const s of stores) out[s] = await getAllRecords(s);
  return out;
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
}
