// Habits — boolean daily lifestyle commitments with per-habit streaks.
import { getProfile, addRecord, deleteRecord, getAll, getByDate, todayStr, STORES } from './db.js';
import { $, modal, toast } from './ui.js';
import { awardXP } from './gamification.js';

// ── Preset habits grouped by category ──────────────────────────────────────
export const PRESET_HABITS = [
  // Sleep
  { name: 'Sleep by 11pm',          icon: '😴', category: 'Sleep' },
  { name: 'No screens 1h before bed', icon: '📵', category: 'Sleep' },
  { name: 'Wake before 7am',         icon: '⏰', category: 'Sleep' },
  { name: '8 hours of sleep',        icon: '🛌', category: 'Sleep' },
  // Diet
  { name: 'No sugar',                icon: '🚫', category: 'Diet' },
  { name: 'No junk food',            icon: '🥗', category: 'Diet' },
  { name: 'No alcohol',              icon: '🍷', category: 'Diet' },
  { name: 'Eat a salad',             icon: '🥙', category: 'Diet' },
  { name: 'No liquid calories',      icon: '💧', category: 'Diet' },
  // Fitness
  { name: '10,000 steps',            icon: '🏃', category: 'Fitness' },
  { name: 'Morning stretch',         icon: '🤸', category: 'Fitness' },
  { name: 'Evening walk',            icon: '🌇', category: 'Fitness' },
  { name: 'No elevator today',       icon: '🪜', category: 'Fitness' },
  // Mind
  { name: '10min meditation',        icon: '🧘', category: 'Mind' },
  { name: 'Gratitude journal',       icon: '📓', category: 'Mind' },
  { name: 'No doomscrolling',        icon: '📵', category: 'Mind' },
  { name: 'Cold shower',             icon: '🚿', category: 'Mind' },
  // Focus
  { name: 'Read 20min',              icon: '📚', category: 'Focus' },
  { name: 'No social media till noon', icon: '🔕', category: 'Focus' },
  { name: '1 deep work block',       icon: '🎯', category: 'Focus' },
  { name: 'Plan tomorrow tonight',   icon: '📋', category: 'Focus' },
];

export const HABIT_CATEGORIES = ['All', 'Sleep', 'Diet', 'Fitness', 'Mind', 'Focus'];

// ── DB helpers ──────────────────────────────────────────────────────────────
export async function getAllHabits() {
  return getAll(STORES.habits);
}

export async function getTodayHabitLogs() {
  return getByDate(STORES.habitLogs, todayStr());
}

export async function addHabit(name, icon, category) {
  return addRecord(STORES.habits, { name, icon, category, createdAt: Date.now() });
}

export async function removeHabit(id) {
  return deleteRecord(STORES.habits, id);
}

export async function getHabitStreak(habitId) {
  const all = await getAll(STORES.habitLogs);
  const logged = new Set(
    all.filter(l => l.habitId === habitId && l.completed).map(l => l.date)
  );
  let streak = 0;
  const d = new Date();
  // Don't count today in streak calc (today may not be done yet)
  d.setDate(d.getDate() - 1);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (!logged.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ── Toggle a habit done/undone for today ───────────────────────────────────
export async function toggleHabit(habitId) {
  const today = todayStr();
  const logs = await getTodayHabitLogs();
  const existing = logs.find(l => l.habitId === habitId);

  if (existing) {
    // Already logged — remove (uncheck)
    await deleteRecord(STORES.habitLogs, existing.id);
    return false;
  } else {
    await addRecord(STORES.habitLogs, { date: today, habitId, completed: true });
    await awardXP(8, 'Habit');
    return true;
  }
}

// ── Gemini AI suggestions ──────────────────────────────────────────────────
export async function getAIHabitSuggestions() {
  const { hasKey } = await import('./gemini.js');
  const p = await getProfile();
  if (!hasKey(p)) return null;

  const prompt = `You are a personal lifestyle coach. Based on this user's profile, suggest 4 highly specific daily habits they should build.
Profile: age ${p.age || '?'}, ${p.sex || 'unknown'} sex, activity level: ${p.activityLevel || 'moderate'}, goal: ${p.calorieGoalPreset || 'maintain'} weight, diet: ${p.dietPreference || 'general'}.
Return ONLY valid JSON array, no markdown, no explanation:
[{"name":"habit name (max 5 words)","icon":"single emoji","category":"Sleep|Diet|Fitness|Mind|Focus"}]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${p.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = text.replace(/```json|```/g, '').trim();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── Render ─────────────────────────────────────────────────────────────────
let _activeCategory = 'All';

export async function renderHabits() {
  const catRoot  = $('#habit-category-tabs');
  const gridRoot = $('#habit-grid');
  if (!catRoot || !gridRoot) return;

  const [habits, logs] = await Promise.all([getAllHabits(), getTodayHabitLogs()]);
  const doneIds = new Set(logs.map(l => l.habitId));

  // ── Category tabs ──
  catRoot.innerHTML = '';
  HABIT_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `hct-btn${cat === _activeCategory ? ' active' : ''}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => { _activeCategory = cat; renderHabits(); });
    catRoot.appendChild(btn);
  });

  // ── Cards ──
  const visible = _activeCategory === 'All'
    ? habits
    : habits.filter(h => h.category === _activeCategory);

  gridRoot.innerHTML = '';

  if (visible.length === 0) {
    gridRoot.innerHTML = `<p class="muted small" style="grid-column:1/-1;padding:8px 0;">
      No habits here yet. Add one below or tap "AI suggestions".
    </p>`;
  }

  for (const h of visible) {
    const done = doneIds.has(h.id);
    const streak = await getHabitStreak(h.id);

    const card = document.createElement('div');
    card.className = `habit-card${done ? ' done' : ''}`;
    card.innerHTML = `
      <div class="hc-top">
        <span class="hc-icon">${h.icon}</span>
        <span class="hc-check">${done ? '✓' : ''}</span>
      </div>
      <div class="hc-name">${escapeHtml(h.name)}</div>
      <div class="hc-streak ${streak >= 3 ? 'hot' : ''}">
        ${streak > 0 ? `🔥 ${streak}d streak` : 'Start today'}
      </div>
    `;
    card.addEventListener('click', async () => {
      await toggleHabit(h.id);
      renderHabits();
      document.dispatchEvent(new Event('lt:refresh-home'));
    });
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openRemoveHabitModal(h, renderHabits);
    });
    gridRoot.appendChild(card);
  }
}

// ── Add habit modal ────────────────────────────────────────────────────────
export function openAddHabitModal(onDone) {
  modal('Add habit', (root, close) => {
    root.innerHTML = `
      <p class="muted small" style="margin-bottom:12px;">Pick a preset or create your own.</p>

      <div class="form-row">
        <label>Category</label>
        <select id="hm-cat">
          ${HABIT_CATEGORIES.filter(c => c !== 'All').map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>

      <div id="hm-presets" class="hobby-grid" style="margin-bottom:14px;"></div>

      <div class="form-row">
        <label>Custom name</label>
        <input id="hm-name" type="text" placeholder="No screens after 9pm" />
      </div>
      <div class="form-row">
        <label>Icon</label>
        <input id="hm-icon" type="text" placeholder="😴" maxlength="2" style="width:70px;" />
      </div>

      <div id="hm-ai-row" style="margin-bottom:10px;">
        <button class="btn btn-ghost btn-sm" id="hm-ai-btn">✨ AI suggestions</button>
        <span class="muted small" id="hm-ai-status"></span>
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" id="hm-cancel">Cancel</button>
        <button class="btn btn-primary" id="hm-save">Add habit</button>
      </div>
    `;

    const catSel    = root.querySelector('#hm-cat');
    const presetsEl = root.querySelector('#hm-presets');
    const nameEl    = root.querySelector('#hm-name');
    const iconEl    = root.querySelector('#hm-icon');

    function renderPresets() {
      const cat = catSel.value;
      const list = PRESET_HABITS.filter(p => p.category === cat);
      presetsEl.innerHTML = '';
      list.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'hobby-pick';
        btn.innerHTML = `<span class="h-icon">${p.icon}</span><span class="h-name">${p.name}</span>`;
        btn.addEventListener('click', () => {
          nameEl.value = p.name;
          iconEl.value = p.icon;
          presetsEl.querySelectorAll('.hobby-pick').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        presetsEl.appendChild(btn);
      });
    }
    catSel.addEventListener('change', renderPresets);
    renderPresets();

    root.querySelector('#hm-ai-btn').addEventListener('click', async () => {
      const statusEl = root.querySelector('#hm-ai-status');
      statusEl.textContent = 'Loading…';
      const suggestions = await getAIHabitSuggestions();
      if (!suggestions) { statusEl.textContent = 'Add a Gemini key in Settings first'; return; }
      statusEl.textContent = '';
      presetsEl.innerHTML = '';
      suggestions.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'hobby-pick';
        btn.innerHTML = `<span class="h-icon">${s.icon || '⭐'}</span><span class="h-name">${s.name}</span>`;
        btn.addEventListener('click', () => {
          nameEl.value = s.name;
          iconEl.value = s.icon || '⭐';
          catSel.value = HABIT_CATEGORIES.includes(s.category) ? s.category : 'Focus';
          presetsEl.querySelectorAll('.hobby-pick').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        presetsEl.appendChild(btn);
      });
    });

    root.querySelector('#hm-cancel').addEventListener('click', () => close(null));
    root.querySelector('#hm-save').addEventListener('click', async () => {
      const name = nameEl.value.trim();
      if (!name) { toast('Enter a habit name', 'error'); return; }
      const icon = iconEl.value.trim() || '⭐';
      const cat  = catSel.value;
      await addHabit(name, icon, cat);
      toast('Habit added', 'success');
      close(null);
      if (onDone) onDone();
    });
  });
}

function openRemoveHabitModal(habit, onDone) {
  modal(`Remove "${habit.name}"?`, (root, close) => {
    root.innerHTML = `
      <p class="muted small" style="margin-bottom:14px;">This removes the habit definition and all its logs.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="hrm-cancel">Cancel</button>
        <button class="btn btn-danger" id="hrm-del">Remove</button>
      </div>
    `;
    root.querySelector('#hrm-cancel').addEventListener('click', () => close(null));
    root.querySelector('#hrm-del').addEventListener('click', async () => {
      await removeHabit(habit.id);
      // also remove all logs for this habit
      const allLogs = await getAll(STORES.habitLogs);
      for (const l of allLogs.filter(l => l.habitId === habit.id)) {
        await deleteRecord(STORES.habitLogs, l.id);
      }
      toast('Habit removed');
      close(null);
      if (onDone) onDone();
    });
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
