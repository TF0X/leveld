import { STORES, getAll } from './db.js';

const SEARCHABLE = [STORES.meals, STORES.workouts, STORES.hobbies];
let index = new Map();
let records = [];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function textForRecord(store, record) {
  if (store === STORES.meals) return `${record.description} ${record.type}`;
  if (store === STORES.workouts) return `${record.name} ${(record.exercises || []).map((item) => item.name).join(' ')}`;
  return `${record.hobbyName} ${record.notes || ''}`;
}

export async function buildSearchIndex() {
  index = new Map();
  records = [];
  for (const store of SEARCHABLE) {
    const rows = await getAll(store);
    for (const row of rows) {
      const ref = { store, id: row.id, date: row.date, text: textForRecord(store, row) };
      records.push(ref);
      for (const token of tokenize(ref.text)) {
        if (!index.has(token)) index.set(token, new Set());
        index.get(token).add(ref);
      }
    }
  }
}

export function searchEntries(query) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const matches = new Map();
  for (const token of tokens) {
    for (const [key, refs] of index.entries()) {
      if (!key.includes(token)) continue;
      for (const ref of refs) {
        const score = matches.get(ref) || 0;
        matches.set(ref, score + 1);
      }
    }
  }
  return [...matches.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].date.localeCompare(a[0].date))
    .map(([ref]) => ref);
}
