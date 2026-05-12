// leveld entry — onboarding, navigation, home dashboard, settings.
import {
  getDB, getProfile, saveProfile, getAll, putRecord, todayStr, STORES,
} from './db.js';
import { $, $$, modal, toast, setRing } from './ui.js';
import { checkStreakOnOpen, computeQuests, computeDailyScoreLocal, persistDailyScore, lastNDayScores, weekKey, rankFor, xpForLevel, awardXP } from './gamification.js';
import { renderMeals, getDailyTotals } from './meals.js';
import { initWorkout } from './workouts.js';
import { renderHobbies } from './hobbies.js';
import { renderHabits, openAddHabitModal } from './habits.js';
import { renderProgress } from './graph.js';
import { exportAll, importFromFile, shouldShowBackupBanner } from './export.js';
import { hasKey, scoreDailyActivity, generateWeeklyInsight } from './gemini.js';
import { openAddAnything } from './addany.js';
import { getDailyChallenge, skipChallenge, completeChallenge, challengeIcon } from './challenges.js';
import { NOTIF_SUPPORTED, getPermission, requestPermission, disableNotifications, setReminderHour, checkMissedReminder, scheduleDailyReminder, scheduleWaterReminders, startWaterInterval, scheduleHourlyNotifs, startHourlyInterval } from './notifications.js';
import { applyMidnightPenalty, scheduleSavageNotifs, startSavageInterval, getShredChallenge } from './savage.js';
import { initQuoteCard } from './quotes.js';

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

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

const CALORIE_PRESET_ADJUSTMENTS = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

function getLatestWeight(bodyMetrics) {
  const latest = [...(bodyMetrics || [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return latest?.weight || null;
}

function calculateBMI(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!h || h <= 0 || !w || w <= 0) return null;
  const meters = h / 100;
  return w / (meters * meters);
}

function calculateMaintenanceCalories({ sex, age, heightCm, weightKg, activityLevel }) {
  const a = Number(age);
  const h = Number(heightCm);
  const w = Number(weightKg);
  const mult = ACTIVITY_MULTIPLIERS[activityLevel];
  if (!a || a <= 0 || !h || h <= 0 || !w || w <= 0 || !mult) return null;
  const base = sex === 'female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5;
  return Math.round(base * mult);
}

function targetCaloriesForPreset(maintenanceCalories, preset) {
  const maintenance = Number(maintenanceCalories);
  if (!maintenance) return null;
  return Math.round(maintenance + (CALORIE_PRESET_ADJUSTMENTS[preset] ?? 0));
}

function refreshCalorieSetupPreview(root, scope) {
  const q = (id) => root.querySelector(`#${scope}-${id}`);
  const age = Number(q('age')?.value);
  const sex = q('sex')?.value || 'male';
  const heightCm = Number(q('height')?.value);
  const weightKg = Number(q('weight')?.value);
  const activityLevel = q('activity')?.value || 'moderate';
  const preset = q('goal-preset')?.value || 'maintain';
  const bmi = calculateBMI(heightCm, weightKg);
  const maintenanceCalories = calculateMaintenanceCalories({ sex, age, heightCm, weightKg, activityLevel });
  const bmiEl = q('bmi');
  const maintenanceEl = q('maintenance');
  const targetEl = q('cal');
  if (bmiEl) bmiEl.textContent = `BMI: ${bmi ? bmi.toFixed(1) : '—'}`;
  if (maintenanceEl) maintenanceEl.textContent = `Maintenance: ${maintenanceCalories ? `${maintenanceCalories} kcal/day` : '—'}`;
  if (targetEl && maintenanceCalories && targetEl.dataset.auto !== 'false') {
    targetEl.value = targetCaloriesForPreset(maintenanceCalories, preset);
  }
}

function bindCalorieSetup(root, scope) {
  const target = root.querySelector(`#${scope}-cal`);
  ['age', 'sex', 'height', 'weight', 'activity'].forEach((id) => {
    root.querySelector(`#${scope}-${id}`)?.addEventListener('input', () => refreshCalorieSetupPreview(root, scope));
    root.querySelector(`#${scope}-${id}`)?.addEventListener('change', () => refreshCalorieSetupPreview(root, scope));
  });
  root.querySelector(`#${scope}-goal-preset`)?.addEventListener('change', () => {
    if (target) target.dataset.auto = 'true';
    refreshCalorieSetupPreview(root, scope);
  });
  if (target) {
    target.addEventListener('input', () => {
      target.dataset.auto = 'false';
    });
  }
  refreshCalorieSetupPreview(root, scope);
}

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

  bindCalorieSetup(document, 'ob');

  let step = 1;
  const finalStep = 5;
  const steps = $$('.ob-step');
  const dots = $$('.ob-dots .dot');
  const back = $('#ob-back');
  const next = $('#ob-next');
  function showStep(s) {
    step = s;
    steps.forEach((el) => el.classList.toggle('hidden', Number(el.dataset.step) !== s));
    dots.forEach((d, i) => d.classList.toggle('active', i < s));
    back.classList.toggle('hidden', s === 1);
    next.textContent = s === finalStep ? 'Start' : 'Next';
  }
  showStep(1);
  back.addEventListener('click', () => showStep(Math.max(1, step - 1)));
  next.addEventListener('click', async () => {
    if (step === 1 && !$('#ob-name').value.trim()) return toast('Enter a name', 'error');
    if (step === 3) {
      const age = Number($('#ob-age').value);
      const heightCm = Number($('#ob-height').value);
      const weightKg = Number($('#ob-weight').value);
      if (!age || age <= 0 || !heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return toast('Enter age, height, and weight', 'error');
    }
    if (step < finalStep) return showStep(step + 1);
    const hobbies = [...PRESET_HOBBIES.filter((h) => selected.has(h.id)), ...customHobbies.filter((h) => selected.has(h.id))]
      .map((h) => ({ ...h, dailyGoalMinutes: 30 }));
    const weightKg = Number($('#ob-weight').value) || null;
    await saveProfile({
      name: $('#ob-name').value.trim(),
      geminiApiKey: $('#ob-key').value.trim(),
      age: Number($('#ob-age').value) || null,
      sex: $('#ob-sex').value,
      heightCm: Number($('#ob-height').value) || null,
      activityLevel: $('#ob-activity').value,
      calorieGoalPreset: $('#ob-goal-preset').value,
      goals: {
        calories: Number($('#ob-cal').value) || 2200,
        protein: Number($('#ob-pro').value) || 150,
        water: Number($('#ob-water').value) || 3000,
        workoutsPerWeek: Number($('#ob-workouts').value) || 4,
        hobbyMinutes: Number($('#ob-hobby').value) || 60,
      },
      hobbies,
    });
    if (weightKg) await putRecord(STORES.bodyMetrics, { date: todayStr(), weight: weightKg });
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
  $('#fab-add')?.addEventListener('click', openAddAnything);

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
  // Re-arm scheduled triggers (in case browser cleared them)
  try { await scheduleDailyReminder(); await checkMissedReminder(); } catch {}
  try { await scheduleWaterReminders(); startWaterInterval(getProfile); } catch {}
  // Apply penalty + arm savage notifications
  try {
    await applyMidnightPenalty();
    await scheduleSavageNotifs();
    startSavageInterval(getProfile);
  } catch {}

  // Hourly motivational notifications
  try {
    const p2 = await getProfile();
    if (p2.hourlyNotifEnabled) {
      await scheduleHourlyNotifs();
      startHourlyInterval(getProfile);
    }
  } catch {}

  // Quote card
  initQuoteCard($('#quote-card'));

  // Wire habit add button
  $('#hb-add-habit')?.addEventListener('click', () => openAddHabitModal(() => renderHabits()));

  document.addEventListener('lt:refresh-home', refreshHome);
  document.addEventListener('lt:freeze-burn', () => {
    toast('❄ Streak freeze used — missed yesterday\'s challenge');
  });
  document.addEventListener('lt:penalty', (e) => {
    const banner = $('#penalty-banner');
    const text = $('#penalty-text');
    if (banner && text) {
      text.textContent = `💀 -${e.detail.xp} XP penalty — ${e.detail.reason}`;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 8000);
    }
  });
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
  if (tab === 'hobbies') { renderHabits(); renderHobbies(); }
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
  const cur = p.level <= 1 ? 0 : xpForLevel(p.level);
  const pct = Math.min(100, Math.round(((p.totalXP - cur) / Math.max(1, next - cur)) * 100));
  $('#hd-xp-fill').style.width = `${Math.max(0, pct)}%`;
  $('#hd-streak-num').textContent = p.streak || 0;
  $('#hd-freeze-num').textContent = p.freezeTokens || 0;
  const xpLeft = next - p.totalXP;
  const xpTextEl = $('#hd-xp-text');
  if (xpTextEl) xpTextEl.textContent = `${p.totalXP} XP · ${xpLeft > 0 ? `${xpLeft} to lv${p.level + 1}` : 'MAX'}`;

  // Backup banner
  const banner = $('#backup-banner');
  banner.classList.toggle('hidden', !(await shouldShowBackupBanner()));

  // Shred mode badge
  $('#shred-badge')?.classList.toggle('hidden', !p.shredMode);

  // Daily challenge
  renderChallengeCard().catch((e) => console.warn('[challenge]', e));

  // Rings — calories, protein, water
  const totals = await getDailyTotals();
  const water = await getWaterToday(p);
  const calRaw = Math.round((totals.calories / Math.max(1, p.goals.calories)) * 100);
  const proRaw = Math.round((totals.protein  / Math.max(1, p.goals.protein))  * 100);
  const watRaw = Math.round((water           / Math.max(1, p.goals.water))    * 100);
  setRing($('#ring-cal'),   Math.min(1, calRaw / 100));
  setRing($('#ring-pro'),   Math.min(1, proRaw / 100));
  setRing($('#ring-water'), Math.min(1, watRaw / 100));
  $('#num-cal').textContent   = totals.calories;
  $('#num-pro').textContent   = totals.protein;
  $('#num-water').textContent = water;
  $('#pct-cal').textContent   = `${calRaw}%`;
  $('#pct-pro').textContent   = `${proRaw}%`;
  $('#pct-water').textContent = `${watRaw}%`;
  // Glow ring at 100%, turn red when over
  $('#rc-cal')?.classList.toggle('ring-complete', calRaw >= 100 && calRaw <= 110);
  $('#rc-cal')?.classList.toggle('ring-over',     calRaw > 110);
  $('#rc-pro')?.classList.toggle('ring-complete', proRaw >= 100);
  $('#rc-water')?.classList.toggle('ring-complete', watRaw >= 100);

  // Quests
  const { quests, allDone } = await computeQuests();
  const ul = $('#quest-list');
  ul.innerHTML = '';
  for (const q of quests) {
    const li = document.createElement('li');
    li.className = `quest-item${q.done ? ' done' : ''}`;
    const pct = q.progressMax ? Math.round((q.progress / q.progressMax) * 100) : (q.done ? 100 : 0);
    li.innerHTML = `
      <div class="quest-check">${q.done ? '✓' : ''}</div>
      <div class="quest-text">${q.label}<small>${q.sub}</small><div class="quest-prog"><span style="width:${pct}%"></span></div></div>
      <div class="quest-xp">+${q.xp}<span class="quest-xp-unit">XP</span></div>
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

  // Daily score row + streak strip
  const score = await computeDailyScoreLocal();
  await persistDailyScore(score, null);
  renderScoreRow(score);
  await renderStreakStrip();
}

function renderScoreRow(score) {
  const el = $('#score-row');
  if (!el) return;
  const act = score.activityScore || 0;
  const out = score.outputScore || 0;
  el.innerHTML = `
    <div class="sr-bar">
      <span class="sr-label">Activity</span>
      <div class="sr-track"><div class="sr-fill green" style="width:${act}%"></div></div>
      <span class="sr-num">${act}</span>
    </div>
    <div class="sr-bar">
      <span class="sr-label">Output</span>
      <div class="sr-track"><div class="sr-fill amber" style="width:${out}%"></div></div>
      <span class="sr-num">${out}</span>
    </div>`;
}

async function renderStreakStrip() {
  const el = $('#streak-strip');
  if (!el) return;
  const p = await getProfile();
  const allScores = await getAll(STORES.dailyScores);
  const scoreMap = new Map(allScores.map((s) => [s.date, (s.activityScore || 0) > 0]));
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const today = todayStr();
  const html = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const logged = scoreMap.get(ds) || false;
    const isToday = ds === today;
    const flame = isToday && (p.streak || 0) > 0 ? '<div class="ss-flame">🔥</div>' : '';
    html.push(`<div class="ss-day${logged ? ' logged' : ''}${isToday ? ' today' : ''}">
      ${flame}
      <div class="ss-daynum">${d.getDate()}</div>
      <div class="ss-dot"></div>
      <div class="ss-label">${dayNames[d.getDay()]}</div>
    </div>`);
  }
  el.innerHTML = html.join('');
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
  const latestWeight = getLatestWeight(await getAll(STORES.bodyMetrics));
  $('#set-name').value = p.name || '';
  $('#set-key').value = p.geminiApiKey ? '••••••••••••' : '';
  $('#set-key').dataset.placeholder = p.geminiApiKey ? 'set' : 'empty';
  $('#set-age').value = p.age || '';
  $('#set-sex').value = p.sex || 'male';
  $('#set-diet').value = p.dietPreference || '';
  $('#set-height').value = p.heightCm || '';
  $('#set-weight').value = latestWeight || '';
  $('#set-activity').value = p.activityLevel || 'moderate';
  $('#set-goal-preset').value = p.calorieGoalPreset || 'maintain';
  $('#set-cal').value = p.goals.calories;
  const presetTarget = targetCaloriesForPreset(
    calculateMaintenanceCalories({
      sex: p.sex || 'male',
      age: p.age,
      heightCm: p.heightCm,
      weightKg: latestWeight,
      activityLevel: p.activityLevel || 'moderate',
    }),
    p.calorieGoalPreset || 'maintain'
  );
  $('#set-cal').dataset.auto = presetTarget === p.goals.calories ? 'true' : 'false';
  $('#set-pro').value = p.goals.protein;
  $('#set-water').value = p.goals.water;
  $('#set-workouts').value = p.goals.workoutsPerWeek;
  $('#set-hobby').value = p.goals.hobbyMinutes;
  refreshCalorieSetupPreview(document, 'set');

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
  refreshNotifSettings();
  refreshWaterNotifSettings();
  refreshHourlyNotifSettings();
  refreshShredSettings();
}

function wireSettings() {
  bindCalorieSetup(document, 'set');
  wireNotifSettings();
  wireWaterNotifSettings();
  wireHourlyNotifSettings();
  wireShredSettings();

  async function saveSettingsProfileAndGoals() {
    const age = Number($('#set-age').value);
    const heightCm = Number($('#set-height').value);
    const weightKg = Number($('#set-weight').value);
    if (age && age <= 0) return toast('Enter a valid age', 'error');
    if (heightCm && heightCm <= 0) return toast('Enter a valid height', 'error');
    if (weightKg && weightKg <= 0) return toast('Enter a valid weight', 'error');
    await saveProfile({
      name: $('#set-name').value.trim(),
      age: age || null,
      sex: $('#set-sex').value,
      dietPreference: $('#set-diet').value.trim(),
      heightCm: heightCm || null,
      activityLevel: $('#set-activity').value,
      calorieGoalPreset: $('#set-goal-preset').value,
      goals: {
        calories: Number($('#set-cal').value) || 2200,
        protein: Number($('#set-pro').value) || 150,
        water: Number($('#set-water').value) || 3000,
        workoutsPerWeek: Number($('#set-workouts').value) || 4,
        hobbyMinutes: Number($('#set-hobby').value) || 60,
      },
    });
    if (weightKg) await putRecord(STORES.bodyMetrics, { date: todayStr(), weight: weightKg });
    toast('Saved', 'success');
    refreshSettings();
    refreshHome();
  }

  $('#set-save-profile').addEventListener('click', saveSettingsProfileAndGoals);
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
  $('#set-save-goals').addEventListener('click', saveSettingsProfileAndGoals);
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

// ── Daily challenge card
async function renderChallengeCard() {
  const root = $('#challenge-card');
  if (!root) return;
  const p = await getProfile();

  // In shred mode: inject a shred challenge as a second brutal card above the normal one
  let shredEl = $('#shred-challenge-card');
  if (p.shredMode) {
    if (!shredEl) {
      shredEl = document.createElement('div');
      shredEl.id = 'shred-challenge-card';
      shredEl.className = 'challenge-card shred-challenge-card';
      root.parentNode.insertBefore(shredEl, root);
    }
    const sc = p.shredChallenge && p.shredChallenge.date === todayStr()
      ? p.shredChallenge
      : (() => { const c = getShredChallenge(); saveProfile({ shredChallenge: { ...c, date: todayStr(), done: false } }); return { ...c, date: todayStr(), done: false }; })();

    if (sc.done) {
      shredEl.innerHTML = `<div class="ch-row"><div class="ch-icon">💀</div><div class="ch-body"><div class="ch-text shred-text">${escapeHtml(sc.text)}</div><div class="ch-meta muted small">✓ Crushed it · +${sc.xp} XP</div></div></div>`;
    } else {
      shredEl.innerHTML = `
        <div class="shred-ch-label">💀 SHRED CHALLENGE</div>
        <div class="ch-row">
          <div class="ch-icon">🔥</div>
          <div class="ch-body">
            <div class="ch-text shred-text">${escapeHtml(sc.text)}</div>
            <div class="ch-meta muted small">${sc.type} · +${sc.xp} XP</div>
          </div>
        </div>
        <div class="ch-actions">
          <button class="btn btn-sm shred-reroll-btn" id="sh-reroll">Different one</button>
          <button class="btn btn-sm shred-done-btn" id="sh-done">CRUSHED IT 💪</button>
        </div>`;
      shredEl.querySelector('#sh-reroll')?.addEventListener('click', async () => {
        const c = getShredChallenge();
        await saveProfile({ shredChallenge: { ...c, date: todayStr(), done: false } });
        renderChallengeCard();
      });
      shredEl.querySelector('#sh-done')?.addEventListener('click', async () => {
        const sp = await getProfile();
        if (sp.shredChallenge) await saveProfile({ shredChallenge: { ...sp.shredChallenge, done: true } });
        await awardXP(sc.xp || 80, 'Shred challenge!');
        renderChallengeCard();
        refreshHome();
      });
    }
  } else if (shredEl) {
    shredEl.remove();
  }

  const ch = await getDailyChallenge();
  if (ch.done) {
    root.classList.add('done');
    root.innerHTML = `
      <div class="ch-row">
        <div class="ch-icon">${challengeIcon(ch.type)}</div>
        <div class="ch-body">
          <div class="ch-text">${escapeHtml(ch.text)}</div>
          <div class="ch-meta muted small">✓ Completed · +${ch.xp || 50} XP</div>
        </div>
      </div>`;
    return;
  }
  root.classList.remove('done');
  root.innerHTML = `
    <div class="ch-row">
      <div class="ch-icon">${challengeIcon(ch.type)}</div>
      <div class="ch-body">
        <div class="ch-text">${escapeHtml(ch.text)}</div>
        <div class="ch-meta muted small">${ch.type} · +${ch.xp || 50} XP · skips left: ${3 - (ch.skipped || 0)}</div>
      </div>
    </div>
    <div class="ch-actions">
      <button class="btn btn-ghost btn-sm" id="ch-skip" ${(ch.skipped || 0) >= 3 ? 'disabled' : ''}>Skip</button>
      <button class="btn btn-primary btn-sm" id="ch-done">Done!</button>
    </div>`;
  root.querySelector('#ch-skip')?.addEventListener('click', async () => {
    await skipChallenge();
    renderChallengeCard();
  });
  root.querySelector('#ch-done')?.addEventListener('click', async () => {
    await completeChallenge();
    renderChallengeCard();
    refreshHome();
  });
}

// ── Notifications wiring (used inside refreshSettings + wireSettings)
async function refreshNotifSettings() {
  const p = await getProfile();
  const status = $('#notif-status');
  const btn = $('#set-notif-toggle');
  const hourInp = $('#set-notif-hour');
  if (!btn) return;
  if (!NOTIF_SUPPORTED) {
    btn.disabled = true;
    btn.textContent = 'Not supported';
    if (status) status.textContent = '';
    return;
  }
  const perm = await getPermission();
  hourInp.value = p.notifyHour || 19;
  if (perm === 'granted' && p.notificationsEnabled) {
    btn.textContent = 'Disable reminders';
    btn.classList.add('btn-danger');
    if (status) status.textContent = 'TimestampTrigger' in window ? 'scheduled' : 'fires when you open the app';
  } else if (perm === 'denied') {
    btn.disabled = true;
    btn.textContent = 'Blocked in browser';
    if (status) status.textContent = 'enable from site settings';
  } else {
    btn.textContent = 'Enable reminders';
    btn.classList.remove('btn-danger');
    if (status) status.textContent = '';
  }
}

function wireNotifSettings() {
  const btn = $('#set-notif-toggle');
  const hourInp = $('#set-notif-hour');
  if (!btn || !hourInp) return;
  btn.addEventListener('click', async () => {
    const p = await getProfile();
    if (p.notificationsEnabled) {
      await disableNotifications();
    } else {
      await requestPermission();
    }
    refreshNotifSettings();
  });
  hourInp.addEventListener('change', async () => {
    const h = Math.max(0, Math.min(23, Number(hourInp.value) || 19));
    hourInp.value = h;
    await setReminderHour(h);
    refreshNotifSettings();
  });
}

async function refreshWaterNotifSettings() {
  const p = await getProfile();
  const btn = $('#set-water-toggle');
  const intervalRow = $('#water-interval-row');
  const intervalSel = $('#set-water-interval');
  const sub = $('#water-reminder-sub');
  if (!btn) return;
  const on = !!p.waterReminderEnabled;
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('on', on);
  if (intervalRow) intervalRow.classList.toggle('hidden', !on);
  if (intervalSel) intervalSel.value = String(p.waterReminderInterval || 2);
  if (sub) sub.textContent = on ? `Every ${p.waterReminderInterval || 2}h · 8am–9pm` : 'Nudges to drink — 8am to 9pm';
}

function wireWaterNotifSettings() {
  const btn = $('#set-water-toggle');
  const intervalSel = $('#set-water-interval');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const perm = await getPermission();
    const p = await getProfile();
    if (perm !== 'granted' || !p.notificationsEnabled) {
      toast('Enable reminders first', 'error');
      return;
    }
    const next = !p.waterReminderEnabled;
    await saveProfile({ waterReminderEnabled: next });
    if (next) {
      await scheduleWaterReminders();
      toast('💧 Water reminders on', 'success');
    } else {
      toast('Water reminders off');
    }
    refreshWaterNotifSettings();
  });
  if (intervalSel) {
    intervalSel.addEventListener('change', async () => {
      const v = Number(intervalSel.value) || 2;
      await saveProfile({ waterReminderInterval: v });
      await scheduleWaterReminders();
      refreshWaterNotifSettings();
    });
  }
}

async function refreshHourlyNotifSettings() {
  const p = await getProfile();
  const btn = $('#set-hourly-toggle');
  if (!btn) return;
  const on = !!p.hourlyNotifEnabled;
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('on', on);
}

function wireHourlyNotifSettings() {
  const btn = $('#set-hourly-toggle');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const perm = await getPermission();
    const p = await getProfile();
    if (perm !== 'granted' || !p.notificationsEnabled) {
      toast('Enable reminders first', 'error');
      return;
    }
    const next = !p.hourlyNotifEnabled;
    await saveProfile({ hourlyNotifEnabled: next });
    if (next) {
      await scheduleHourlyNotifs();
      startHourlyInterval(getProfile);
      toast('⏰ Hourly nudges on', 'success');
    } else {
      toast('Hourly nudges off');
    }
    refreshHourlyNotifSettings();
  });
}

async function refreshShredSettings() {
  const p = await getProfile();
  const shredBtn = $('#set-shred-toggle');
  const savageRow = $('#shred-savage-row');
  const savageBtn = $('#set-savage-toggle');
  const hint = $('#shred-notif-hint');

  if (!shredBtn) return;
  shredBtn.setAttribute('aria-pressed', String(!!p.shredMode));
  shredBtn.classList.toggle('on', !!p.shredMode);
  if (savageRow) savageRow.classList.toggle('hidden', !p.shredMode);

  if (savageBtn) {
    savageBtn.setAttribute('aria-pressed', String(!!p.savageNotifs));
    savageBtn.classList.toggle('on', !!p.savageNotifs);
  }

  const perm = await getPermission();
  const notifOk = perm === 'granted' && p.notificationsEnabled;
  if (hint) hint.classList.toggle('hidden', !p.shredMode || notifOk);
}

function wireShredSettings() {
  const shredBtn = $('#set-shred-toggle');
  const savageBtn = $('#set-savage-toggle');
  if (!shredBtn) return;

  shredBtn.addEventListener('click', async () => {
    const p = await getProfile();
    const next = !p.shredMode;
    await saveProfile({ shredMode: next, savageNotifs: next ? p.savageNotifs : false });
    if (next) toast('🔥 Shred Mode activated. No mercy.', 'success');
    else toast('Shred Mode off.', 'success');
    refreshShredSettings();
    refreshHome();
  });

  if (savageBtn) {
    savageBtn.addEventListener('click', async () => {
      const p = await getProfile();
      const perm = await getPermission();
      if (perm !== 'granted' || !p.notificationsEnabled) {
        toast('Enable notifications first', 'error');
        return;
      }
      const next = !p.savageNotifs;
      await saveProfile({ savageNotifs: next });
      if (next) {
        await scheduleSavageNotifs();
        toast('💀 Savage notifications armed. Good luck.', 'success');
      } else {
        toast('Savage notifications off.', 'success');
      }
      refreshShredSettings();
    });
  }
}

boot();
