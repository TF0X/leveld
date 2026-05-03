// LifeTracker entry — onboarding, navigation, home dashboard, settings.
import {
  getDB, getProfile, saveProfile, addRecord, getAll, getByDate, deleteRecord, todayStr, STORES,
} from './db.js';
import { $, $$, modal, toast, setRing } from './ui.js';
import { checkStreakOnOpen, computeQuests, computeDailyScoreLocal, persistDailyScore, lastNDayScores, weekKey, rankFor, xpForLevel, awardXP } from './gamification.js';
import { renderMeals, getDailyTotals } from './meals.js';
import { initWorkout } from './workouts.js';
import { renderHobbies } from './hobbies.js';
import { renderProgress } from './graph.js';
import { exportAll, importFromFile, shouldShowBackupBanner } from './export.js';
import { hasKey, scoreDailyActivity, generateWeeklyInsight } from './gemini.js';

const PRESET_HOBBIES = [
  { id: 'reading', name: 'Reading', icon: '📚' },
  { id: 'guitar', name: 'Guitar', icon: '🎸' },
  { id: 'coding', name: 'Coding', icon: '💻' },
  { id: 'meditation', name: 'Meditation', icon: '🧘' },
  { id: 'drawing', name: 'Drawing', icon: '🎨' },
  { id: 'language', name: 'Language', icon: '🗣️' },
  { id: 'cooking', name: 'Cooking', icon: '🍳' },
  { id: 'walking', name: 'Walking', icon: '🚶' },
  { id: 'journaling', name: 'Journal', icon: '✍️' },
  { id: 'photography', name: 'Photo', icon: '📷' },
];

let currentTab = 'home';
let workoutInited = false;

// ---------- Boot ----------
async function boot() {
  await getDB();
  const p = await getProfile();
  if (!p.name) {
    showOnboarding();
  } else {
    showApp();
  }
  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {});
}

// ---------- Onboarding ----------
function showOnboarding() {
  $('#onboarding').classList.remove('hidden');
  $('#app').classList.add('hidden');

  const selected = new Set();
  const customHobbies = [];

  const grid = $('#ob-hobby-grid');
  grid.innerHTML = '';
  for (const h of PRESET_HOBBIES) {
    const tile = document.createElement('div');
    tile.className = 'hobby-pick';
    tile.innerHTML = `<div class="h-icon">${h.icon}</div><div class="h-name">${h.name}</div>`;
    tile.addEventListener('click', () => {
      if (selected.has(h.id)) selected.delete(h.id);
      else selected.add(h.id);
      tile.classList.toggle('active', selected.has(h.id));
    });
    grid.appendChild(tile);
  }
  $('#ob-add-hobby').addEventListener('click', () => {
    const name = $('#ob-custom-hobby').value.trim();
    const icon = $('#ob-custom-icon').value.trim() || '🎯';
    if (!name) return;
    const id = `c_${Date.now()}`;
    customHobbies.push({ id, name, icon });
    selected.add(id);
    const tile = document.createElement('div');
    tile.className = 'hobby-pick active';
    tile.innerHTML = `<div class="h-icon">${icon}</div><div class="h-name">${escapeHtml(name)}</div>`;
    tile.addEventListener('click', () => {
      selected.delete(id);
      tile.remove();
    });
    grid.appendChild(tile);
    $('#ob-custom-hobby').value = '';
    $('#ob-custom-icon').value = '';
  });

  let step = 1;
  const steps = $$('.ob-step');
  const dots = $$('.ob-dots .dot');
  const back = $('#ob-back');
  const next = $('#ob-next');
  function showStep(s) {
    step = s;
    steps.forEach((el) => el.classList.toggle('hidden', Number(el.dataset.step) !== s));
    dots.forEach((d, i) => d.classList.toggle('active', i < s));
    back.classList.toggle('hidden', s === 1);
    next.textContent = s === 4 ? 'Start' : 'Next';
  }
  showStep(1);
  back.addEventListener('click', () => showStep(Math.max(1, step - 1)));
  next.addEventListener('click', async () => {
    if (step === 1 && !$('#ob-name').value.trim()) return toast('Enter a name', 'error');
    if (step < 4) return showStep(step + 1);
    // Finish
    const hobbies = [...PRESET_HOBBIES.filter((h) => selected.has(h.id)), ...customHobbies.filter((h) => selected.has(h.id))]
      .map((h) => ({ ...h, dailyGoalMinutes: 30 }));
    await saveProfile({
      name: $('#ob-name').value.trim(),
      geminiApiKey: $('#ob-key').value.trim(),
      goals: {
        calories: Number($('#ob-cal').value) || 2200,
        protein: Number($('#ob-pro').value) || 150,
        water: Number($('#ob-water').value) || 3000,
        workoutsPerWeek: Number($('#ob-workouts').value) || 4,
        hobbyMinutes: Number($('#ob-hobby').value) || 60,
      },
      hobbies,
    });
    await checkStreakOnOpen();
    showApp();
  });
}

// ---------- App shell ----------
async function showApp() {
  $('#onboarding').classList.add('hidden');
  $('#app').classList.remove('hidden');

  // Tabs
  $$('.tab-bar button').forEach((b) =>
    b.addEventListener('click', () => switchTab(b.dataset.tab))
  );

  // Quick buttons on home
  $$('#screen-home [data-go]').forEach((b) =>
    b.addEventListener('click', () => switchTab(b.dataset.go))
  );
  $('#quick-weight').addEventListener('click', openWeightModal);
  $$('#screen-home [data-water]').forEach((b) =>
    b.addEventListener('click', () => addWater(Number(b.dataset.water)))
  );

  // Backup banner button
  $('#banner-export').addEventListener('click', () => exportAll().then(refreshHome));

  // Settings wiring
  wireSettings();

  // Progress range tabs
  $$('#range-tabs button').forEach((b) =>
    b.addEventListener('click', () => {
      $$('#range-tabs button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const r = b.dataset.range === 'all' ? 'all' : Number(b.dataset.range);
      renderProgress(r);
    })
  );
  $('#refresh-insight').addEventListener('click', refreshWeeklyInsight);

  await checkStreakOnOpen();
  await refreshHome();

  document.addEventListener('lt:refresh-home', refreshHome);
}

function switchTab(tab) {
  currentTab = tab;
  $$('.screen').forEach((s) => s.classList.add('hidden'));
  $$('.tab-bar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  // Onboarding kept as separate screen, not in switch
  $(`#screen-${tab}`)?.classList.remove('hidden');
  if (tab === 'home') refreshHome();
  if (tab === 'meals') renderMeals();
  if (tab === 'workout') {
    if (!workoutInited) { initWorkout(); workoutInited = true; }
  }
  if (tab === 'hobbies') renderHobbies();
  if (tab === 'progress') renderProgress();
  if (tab === 'settings') refreshSettings();
}

// ---------- Home ----------
async function refreshHome() {
  const p = await getProfile();

  // Header
  $('#hd-level').textContent = p.level;
  $('#hd-rank').textContent = rankFor(p.level);
  const next = xpForLevel(p.level + 1);
  const cur = xpForLevel(p.level);
  const pct = Math.min(100, Math.round(((p.totalXP - cur) / Math.max(1, next - cur)) * 100));
  $('#hd-xp-fill').style.width = `${Math.max(0, pct)}%`;
  $('#hd-streak-num').textContent = p.streak || 0;
  $('#hd-freeze-num').textContent = p.freezeTokens || 0;

  // Backup banner
  const banner = $('#backup-banner');
  banner.classList.toggle('hidden', !(await shouldShowBackupBanner()));

  // Rings — calories, protein, water
  const totals = await getDailyTotals();
  const water = await getWaterToday(p);
  setRing($('#ring-cal'), totals.calories / Math.max(1, p.goals.calories));
  setRing($('#ring-pro'), totals.protein / Math.max(1, p.goals.protein));
  setRing($('#ring-water'), water / Math.max(1, p.goals.water));
  $('#num-cal').textContent = `${totals.calories}/${p.goals.calories}`;
  $('#num-pro').textContent = `${totals.protein}/${p.goals.protein}`;
  $('#num-water').textContent = `${water}/${p.goals.water}`;

  // Quests
  const { quests, allDone } = await computeQuests();
  const ul = $('#quest-list');
  ul.innerHTML = '';
  for (const q of quests) {
    const li = document.createElement('li');
    li.className = `quest-item${q.done ? ' done' : ''}`;
    li.innerHTML = `
      <div class="quest-check">${q.done ? '✓' : ''}</div>
      <div class="quest-text">${q.label}<small>${q.sub}</small></div>
    `;
    ul.appendChild(li);
  }

  // Bonus check (one-time per day)
  const today = todayStr();
  const last = sessionStorage.getItem('lt:allDoneBonus');
  if (allDone && last !== today) {
    sessionStorage.setItem('lt:allDoneBonus', today);
    await awardXP(50, 'All quests done!');
  }

  // Persist daily score (local computation)
  const score = await computeDailyScoreLocal();
  await persistDailyScore(score, null);
}

async function getWaterToday(p) {
  if (p.waterDate === todayStr()) return p.waterToday || 0;
  await saveProfile({ waterDate: todayStr(), waterToday: 0 });
  return 0;
}

async function addWater(delta) {
  const p = await getProfile();
  const today = todayStr();
  const cur = p.waterDate === today ? (p.waterToday || 0) : 0;
  const next = Math.max(0, cur + delta);
  const wasUnder = cur < p.goals.water;
  await saveProfile({ waterDate: today, waterToday: next });
  if (wasUnder && next >= p.goals.water) await awardXP(10, 'Water goal!');
  refreshHome();
}

function openWeightModal() {
  modal(
    `<h3>Log weight</h3>
     <div class="form-row"><label>Weight (kg)</label><input type="number" id="bw-input" step="0.1" inputmode="decimal" /></div>
     <div class="modal-actions">
       <button class="btn btn-ghost" id="bw-cancel">Cancel</button>
       <button class="btn btn-primary" id="bw-save">Save</button>
     </div>`,
    (root, close) => {
      root.querySelector('#bw-input').focus();
      root.querySelector('#bw-cancel').addEventListener('click', () => close(null));
      root.querySelector('#bw-save').addEventListener('click', async () => {
        const w = Number(root.querySelector('#bw-input').value);
        if (!w || w <= 0) return toast('Enter a weight', 'error');
        const { putRecord } = await import('./db.js');
        await putRecord(STORES.bodyMetrics, { date: todayStr(), weight: w });
        await awardXP(5, 'Weight logged');
        toast('Saved', 'success');
        close('ok');
        refreshHome();
      });
    }
  );
}

// ---------- Settings ----------
async function refreshSettings() {
  const p = await getProfile();
  $('#set-name').value = p.name || '';
  $('#set-key').value = p.geminiApiKey ? '••••••••••••' : '';
  $('#set-key').dataset.placeholder = p.geminiApiKey ? 'set' : 'empty';
  $('#set-cal').value = p.goals.calories;
  $('#set-pro').value = p.goals.protein;
  $('#set-water').value = p.goals.water;
  $('#set-workouts').value = p.goals.workoutsPerWeek;
  $('#set-hobby').value = p.goals.hobbyMinutes;

  // Hobbies — present and editable
  const hg = $('#set-hobbies');
  hg.innerHTML = '';
  // Show all existing as removable, plus presets not in profile as addable
  const inProfile = new Set((p.hobbies || []).map((h) => h.id));
  for (const h of p.hobbies || []) {
    const tile = document.createElement('div');
    tile.className = 'hobby-pick active';
    tile.innerHTML = `<div class="h-icon">${h.icon || '🎯'}</div><div class="h-name">${escapeHtml(h.name)}</div><div class="h-rm">tap to remove</div>`;
    tile.addEventListener('click', async () => {
      const np = await getProfile();
      const hobbies = (np.hobbies || []).filter((x) => x.id !== h.id);
      await saveProfile({ hobbies });
      refreshSettings();
    });
    hg.appendChild(tile);
  }
  for (const h of PRESET_HOBBIES) {
    if (inProfile.has(h.id)) continue;
    const tile = document.createElement('div');
    tile.className = 'hobby-pick';
    tile.innerHTML = `<div class="h-icon">${h.icon}</div><div class="h-name">${h.name}</div><div class="h-rm">tap to add</div>`;
    tile.addEventListener('click', async () => {
      const np = await getProfile();
      const hobbies = [...(np.hobbies || []), { ...h, dailyGoalMinutes: 30 }];
      await saveProfile({ hobbies });
      refreshSettings();
    });
    hg.appendChild(tile);
  }

  if (p.lastBackup) {
    const days = Math.round((Date.now() - p.lastBackup) / 86400000);
    $('#last-backup-text').textContent = `Last export: ${days === 0 ? 'today' : `${days}d ago`}`;
  } else {
    $('#last-backup-text').textContent = 'Never exported.';
  }
}

function wireSettings() {
  $('#set-save-key').addEventListener('click', async () => {
    const v = $('#set-key').value.trim();
    if (v && v !== '••••••••••••') {
      await saveProfile({ geminiApiKey: v });
      toast('Key saved', 'success');
      refreshSettings();
    } else if (!v) {
      await saveProfile({ geminiApiKey: '' });
      toast('Key cleared', 'success');
      refreshSettings();
    }
  });
  $('#set-save-goals').addEventListener('click', async () => {
    await saveProfile({
      name: $('#set-name').value.trim(),
      goals: {
        calories: Number($('#set-cal').value) || 2200,
        protein: Number($('#set-pro').value) || 150,
        water: Number($('#set-water').value) || 3000,
        workoutsPerWeek: Number($('#set-workouts').value) || 4,
        hobbyMinutes: Number($('#set-hobby').value) || 60,
      },
    });
    toast('Saved', 'success');
    refreshHome();
  });
  $('#set-add-hobby').addEventListener('click', async () => {
    const name = $('#set-new-hobby').value.trim();
    const icon = $('#set-new-icon').value.trim() || '🎯';
    if (!name) return toast('Name required', 'error');
    const p = await getProfile();
    const hobbies = [...(p.hobbies || []), { id: `c_${Date.now()}`, name, icon, dailyGoalMinutes: 30 }];
    await saveProfile({ hobbies });
    $('#set-new-hobby').value = '';
    $('#set-new-icon').value = '';
    refreshSettings();
  });
  $('#set-export').addEventListener('click', exportAll);
  $('#set-import').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) importFromFile(f);
  });
  $('#set-clear').addEventListener('click', confirmClear);
}

async function confirmClear() {
  modal(
    `<h3>Clear ALL data?</h3>
     <p class="muted small">Profile, meals, workouts, hobbies, PRs — gone. Export first if you want a backup.</p>
     <div class="modal-actions">
       <button class="btn btn-ghost" id="cc-cancel">Cancel</button>
       <button class="btn btn-danger" id="cc-go">Wipe everything</button>
     </div>`,
    (root, close) => {
      root.querySelector('#cc-cancel').addEventListener('click', () => close(null));
      root.querySelector('#cc-go').addEventListener('click', async () => {
        const { clearAll } = await import('./db.js');
        await clearAll();
        close('ok');
        toast('Cleared. Reloading…');
        setTimeout(() => location.reload(), 600);
      });
    }
  );
}

async function refreshWeeklyInsight() {
  const haveKey = await hasKey();
  if (!haveKey) return toast('Add Gemini key in Settings', 'error');
  const btn = $('#refresh-insight');
  btn.disabled = true; btn.textContent = '…';
  try {
    const p = await getProfile();
    const last7 = await lastNDayScores(7);
    if (last7.length < 3) {
      toast('Log a few more days first', 'error');
      return;
    }
    const r = await generateWeeklyInsight(last7, p.rollingSummary, p.goals);
    await saveProfile({ insight: r.insight, lastInsightWeek: weekKey(), rollingSummary: r.rollingSummary });
    $('#insight-text').textContent = r.insight;
    toast('Insight updated', 'success');
  } catch (e) {
    toast('Could not get insight', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Refresh';
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

boot();
