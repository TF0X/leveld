// Meal logging + Gemini integration.
import { addRecord, deleteRecord, getByDate, getProfile, todayStr, STORES } from './db.js';
import { analyzeMealPhoto, analyzeMealText, compressImage, hasKey } from './gemini.js';
import { $, modal, toast, setRing } from './ui.js';
import { awardXP } from './gamification.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export async function renderMeals() {
  const today = todayStr();
  const [meals, profile] = await Promise.all([getByDate(STORES.meals, today), getProfile()]);
  const totals = sumNutrition(meals);
  // mini ring numbers (no actual ring stroke for these — labels only)
  $('#mr-cal').textContent = totals.calories;
  $('#mr-pro').textContent = `${totals.protein}g`;
  $('#mr-carbs').textContent = `${totals.carbs}g`;
  $('#mr-fat').textContent = `${totals.fat}g`;

  const slots = $('#meal-slots');
  slots.innerHTML = '';
  for (const type of MEAL_TYPES) {
    const ofType = meals.filter((m) => m.type === type);
    const card = document.createElement('div');
    card.className = 'meal-slot';
    card.innerHTML = `
      <div class="meal-slot-head">
        <h4>${type}</h4>
        <button class="btn btn-xs" data-add="${type}">+ Add</button>
      </div>
      <div class="meal-entries"></div>
    `;
    const entries = card.querySelector('.meal-entries');
    if (ofType.length === 0) {
      entries.innerHTML = '<div class="muted small" style="padding:6px 0;">nothing logged</div>';
    } else {
      for (const m of ofType) {
        const row = document.createElement('div');
        row.className = 'meal-entry';
        row.innerHTML = `
          <div class="me-desc">
            ${escapeHtml(m.description || 'Meal')}
            <small>P ${m.nutrition?.protein || 0}g · C ${m.nutrition?.carbs || 0}g · F ${m.nutrition?.fat || 0}g</small>
          </div>
          <div class="me-cal">${m.nutrition?.calories || 0}</div>
          <button class="meal-del" data-del="${m.id}" title="delete">×</button>
        `;
        entries.appendChild(row);
      }
    }
    card.querySelector(`[data-add="${type}"]`).addEventListener('click', () => openMealModal(type));
    card.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        await deleteRecord(STORES.meals, Number(b.dataset.del));
        toast('Removed');
        await renderMeals();
        document.dispatchEvent(new Event('lt:refresh-home'));
      })
    );
    slots.appendChild(card);
  }
}

function sumNutrition(meals) {
  return meals.reduce(
    (acc, m) => {
      const n = m.nutrition || {};
      acc.calories += n.calories || 0;
      acc.protein += n.protein || 0;
      acc.carbs += n.carbs || 0;
      acc.fat += n.fat || 0;
      acc.fiber += n.fiber || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

export async function getDailyTotals() {
  const meals = await getByDate(STORES.meals, todayStr());
  return sumNutrition(meals);
}

async function openMealModal(type) {
  const haveKey = await hasKey();
  modal(
    `
      <h3>Log ${type}</h3>
      <div class="modal-tabs">
        <button data-tab="text" class="active">Text</button>
        <button data-tab="photo">Photo</button>
        <button data-tab="manual">Manual</button>
      </div>
      <div class="tab-pane" data-pane="text">
        <p class="muted small">Describe what you ate. Gemini estimates nutrition.</p>
        <textarea id="m-text" rows="3" placeholder="e.g. 2 eggs, toast with butter, black coffee"></textarea>
        ${!haveKey ? '<p class="muted small" style="color:var(--amber)">No Gemini key set — use Manual tab or add a key in Settings.</p>' : ''}
        <button class="btn btn-primary btn-block" id="m-text-go" ${!haveKey ? 'disabled' : ''}>Estimate &amp; log</button>
      </div>
      <div class="tab-pane hidden" data-pane="photo">
        <p class="muted small">Snap or pick a photo. Gemini analyzes it.</p>
        <input type="file" id="m-file" accept="image/*" capture="environment" />
        <img class="preview-img hidden" id="m-preview" />
        ${!haveKey ? '<p class="muted small" style="color:var(--amber)">No Gemini key set — add one in Settings.</p>' : ''}
        <button class="btn btn-primary btn-block hidden" id="m-photo-go">Analyze &amp; log</button>
      </div>
      <div class="tab-pane hidden" data-pane="manual">
        <div class="form-row"><label>Description</label><input type="text" id="m-desc" placeholder="Meal name" /></div>
        <div class="goal-grid">
          <label>Calories <input type="number" id="m-cal" /></label>
          <label>Protein <input type="number" id="m-pro" /></label>
          <label>Carbs <input type="number" id="m-carb" /></label>
          <label>Fat <input type="number" id="m-fat" /></label>
        </div>
        <button class="btn btn-primary btn-block" id="m-manual-go" style="margin-top:10px;">Log meal</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" id="m-cancel">Cancel</button></div>
    `,
    (root, close) => {
      // Tabs
      const tabs = root.querySelectorAll('.modal-tabs button');
      const panes = root.querySelectorAll('.tab-pane');
      tabs.forEach((t) =>
        t.addEventListener('click', () => {
          tabs.forEach((x) => x.classList.remove('active'));
          t.classList.add('active');
          panes.forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== t.dataset.tab));
        })
      );
      root.querySelector('#m-cancel').addEventListener('click', () => close(null));

      // Text
      root.querySelector('#m-text-go').addEventListener('click', async () => {
        const t = root.querySelector('#m-text').value.trim();
        if (!t) return toast('Type something first', 'error');
        const btn = root.querySelector('#m-text-go');
        btn.disabled = true; btn.textContent = 'Thinking…';
        try {
          const profile = await getProfile();
          const r = await analyzeMealText(t, profile.goals);
          await saveMeal(type, r, 'text');
          close('ok');
        } catch (e) {
          toast(geminiErrToMsg(e), 'error');
          btn.disabled = false; btn.textContent = 'Estimate & log';
        }
      });

      // Photo
      let pendingDataUrl = null;
      root.querySelector('#m-file').addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try {
          pendingDataUrl = await compressImage(f);
          const img = root.querySelector('#m-preview');
          img.src = pendingDataUrl;
          img.classList.remove('hidden');
          root.querySelector('#m-photo-go').classList.remove('hidden');
        } catch (err) {
          toast('Could not read image', 'error');
        }
      });
      root.querySelector('#m-photo-go').addEventListener('click', async () => {
        if (!pendingDataUrl) return;
        const btn = root.querySelector('#m-photo-go');
        btn.disabled = true; btn.textContent = 'Analyzing…';
        try {
          const profile = await getProfile();
          const r = await analyzeMealPhoto(pendingDataUrl, profile.goals);
          await saveMeal(type, { ...r, imageBase64: pendingDataUrl }, 'photo');
          close('ok');
        } catch (e) {
          toast(geminiErrToMsg(e), 'error');
          btn.disabled = false; btn.textContent = 'Analyze & log';
        }
      });

      // Manual
      root.querySelector('#m-manual-go').addEventListener('click', async () => {
        const desc = root.querySelector('#m-desc').value.trim() || `${type} meal`;
        const nutrition = {
          calories: Number(root.querySelector('#m-cal').value) || 0,
          protein: Number(root.querySelector('#m-pro').value) || 0,
          carbs: Number(root.querySelector('#m-carb').value) || 0,
          fat: Number(root.querySelector('#m-fat').value) || 0,
          fiber: 0,
        };
        await saveMeal(type, { description: desc, nutrition }, 'manual');
        close('ok');
      });
    }
  ).then(async (r) => {
    if (r === 'ok') {
      await renderMeals();
      document.dispatchEvent(new Event('lt:refresh-home'));
    }
  });
}

async function saveMeal(type, payload, source) {
  const profile = await getProfile();
  const record = {
    date: todayStr(),
    timestamp: Date.now(),
    type,
    description: payload.description || `${type} meal`,
    imageBase64: payload.imageBase64 || null,
    source,
    nutrition: {
      calories: Math.round(payload.nutrition?.calories || 0),
      protein: Math.round(payload.nutrition?.protein || 0),
      carbs: Math.round(payload.nutrition?.carbs || 0),
      fat: Math.round(payload.nutrition?.fat || 0),
      fiber: Math.round(payload.nutrition?.fiber || 0),
    },
  };
  await addRecord(STORES.meals, record);
  await awardXP(10, 'Meal logged');
  // Bonuses
  const dayMeals = await getByDate(STORES.meals, todayStr());
  const totals = sumNutrition(dayMeals);
  if (totals.protein >= profile.goals.protein && totals.protein - record.nutrition.protein < profile.goals.protein) {
    await awardXP(25, 'Protein goal hit');
  }
  if (totals.calories >= profile.goals.calories && totals.calories - record.nutrition.calories < profile.goals.calories) {
    await awardXP(20, 'Calorie target');
  }
  toast('Meal logged', 'success');
}

function geminiErrToMsg(e) {
  const m = String(e?.message || e);
  if (m.includes('NO_KEY')) return 'Add Gemini key in Settings';
  if (m.includes('429')) return 'Rate limited — try again in a sec';
  if (m.includes('BAD_JSON')) return 'Could not parse Gemini response';
  if (m.includes('EMPTY_RESPONSE_SAFETY')) return 'Gemini blocked the response';
  if (m.includes('EMPTY_RESPONSE_MAX_TOKENS')) return 'Gemini response was truncated — try again';
  if (m.includes('EMPTY_RESPONSE')) return 'Gemini returned an empty response';
  if (m.startsWith('GEMINI_')) return 'Gemini API error';
  return 'Network error — are you online?';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
