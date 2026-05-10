// Meal logging + Gemini integration.
import { addRecord, deleteRecord, getByDate, getProfile, todayStr, STORES } from './db.js';
import { analyzeMealPhoto, analyzeMealText, analyzeMealCombined, compressImage, hasKey } from './gemini.js';
import { $, modal, toast, setRing } from './ui.js';
import { awardXP } from './gamification.js';
import { FOOD_DB } from './fooddb.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export async function renderMeals() {
  const today = todayStr();
  const [meals, profile] = await Promise.all([getByDate(STORES.meals, today), getProfile()]);
  const totals = sumNutrition(meals);
  $('#mr-cal').textContent = totals.calories;
  $('#mr-pro').textContent = totals.protein;
  $('#mr-carbs').textContent = totals.carbs;
  $('#mr-fat').textContent = totals.fat;
  const calPct = Math.min(100, Math.round((totals.calories / Math.max(1, profile.goals.calories)) * 100));
  const proPct = Math.min(100, Math.round((totals.protein / Math.max(1, profile.goals.protein)) * 100));
  const calFill = $('#ms-cal-fill');
  const proFill = $('#ms-pro-fill');
  if (calFill) calFill.style.width = `${calPct}%`;
  if (proFill) proFill.style.width = `${proPct}%`;
  const calPctEl = $('#ms-cal-pct');
  const proPctEl = $('#ms-pro-pct');
  if (calPctEl) calPctEl.textContent = `${calPct}%`;
  if (proPctEl) proPctEl.textContent = `${proPct}%`;

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
  const noKeyWarn = `<p class="muted small" style="color:var(--amber);margin-top:8px;">No Gemini key — add one in Settings.</p>`;
  modal(
    `
      <h3>Log ${type}</h3>
      <div class="modal-tabs">
        <button data-tab="smart" class="active">Smart</button>
        <button data-tab="manual">Manual</button>
        <button data-tab="db">Food DB</button>
      </div>

      <div class="tab-pane" data-pane="smart">
        <p class="muted small">Describe what you ate, attach a photo, or both.</p>
        <textarea id="m-text" rows="3" placeholder="e.g. 2 rotis, dal, half plate sabzi, 1 tsp ghee"></textarea>
        <div class="aa-photo-row">
          <label class="btn btn-ghost btn-sm file-btn" style="flex:1;">
            📷 Add photo (optional)
            <input id="m-file" type="file" accept="image/*" capture="environment" hidden />
          </label>
          <button class="btn btn-ghost btn-sm hidden" id="m-photo-clear">Clear</button>
        </div>
        <img class="preview-img hidden" id="m-preview" />
        ${!haveKey ? noKeyWarn : ''}
        <button class="btn btn-primary btn-block" id="m-smart-go" ${!haveKey ? 'disabled' : ''} style="margin-top:10px;">Analyze &amp; log</button>
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

      <div class="tab-pane hidden" data-pane="db">
        <p class="muted small">Search Indian & common foods. AI estimates the macros from the exact food name.</p>
        <input type="search" class="fd-search" id="fd-search" placeholder="🔍 roti, dal, rice, paneer…" autocomplete="off" />
        <div class="fd-list" id="fd-list"></div>
        <div class="fd-bottom hidden" id="fd-bottom">
          <div class="fd-sel-row">
            <span id="fd-sel-emoji"></span>
            <div class="fd-sel-info">
              <div class="fd-sel-name" id="fd-sel-name"></div>
              <div class="fd-sel-serving muted small" id="fd-sel-serving"></div>
            </div>
          </div>
          <div class="fd-qty-row">
            <button class="btn btn-ghost btn-sm fd-qty-btn" id="fd-qty-minus">−</button>
            <span class="fd-qty-num" id="fd-qty-num">1</span>
            <button class="btn btn-ghost btn-sm fd-qty-btn" id="fd-qty-plus">+</button>
            <span class="muted small fd-qty-label" id="fd-qty-label">serving</span>
          </div>
          ${!haveKey ? noKeyWarn : ''}
          <button class="btn btn-primary btn-block" id="fd-analyze" ${!haveKey ? 'disabled' : ''}>Get nutrition →</button>
        </div>
        <div class="fd-review hidden" id="fd-review">
          <div class="fd-rev-head">
            <span class="fd-rev-name" id="fd-rev-name"></span>
            <span class="muted small" id="fd-rev-conf"></span>
          </div>
          <div class="goal-grid" style="margin-top:8px;">
            <label>Calories <input type="number" id="fd-rcal" /></label>
            <label>Protein (g) <input type="number" id="fd-rpro" /></label>
            <label>Carbs (g) <input type="number" id="fd-rcarb" /></label>
            <label>Fat (g) <input type="number" id="fd-rfat" /></label>
          </div>
          <div class="fd-rev-actions">
            <button class="btn btn-ghost btn-sm" id="fd-re-search">← Back</button>
            <button class="btn btn-primary" id="fd-log">Log meal</button>
          </div>
        </div>
      </div>

      <div class="modal-actions"><button class="btn btn-ghost" id="m-cancel">Cancel</button></div>
    `,
    (root, close) => {
      // Tab switching
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

      // ── Smart tab
      let pendingDataUrl = null;
      const previewEl = root.querySelector('#m-preview');
      const clearBtn = root.querySelector('#m-photo-clear');
      root.querySelector('#m-file').addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try {
          pendingDataUrl = await compressImage(f);
          previewEl.src = pendingDataUrl;
          previewEl.classList.remove('hidden');
          clearBtn.classList.remove('hidden');
        } catch { toast('Could not read image', 'error'); }
      });
      clearBtn.addEventListener('click', () => {
        pendingDataUrl = null;
        previewEl.classList.add('hidden');
        clearBtn.classList.add('hidden');
        root.querySelector('#m-file').value = '';
      });
      root.querySelector('#m-smart-go').addEventListener('click', async () => {
        const t = root.querySelector('#m-text').value.trim();
        if (!t && !pendingDataUrl) return toast('Type something or add a photo', 'error');
        const btn = root.querySelector('#m-smart-go');
        btn.disabled = true; btn.textContent = 'Analyzing…';
        try {
          const profile = await getProfile();
          let r;
          if (pendingDataUrl && t) r = await analyzeMealCombined(t, pendingDataUrl, profile.goals, profile.dietPreference);
          else if (pendingDataUrl) r = await analyzeMealPhoto(pendingDataUrl, profile.goals, profile.dietPreference);
          else r = await analyzeMealText(t, profile.goals, profile.dietPreference);
          await saveMeal(type, { ...r, imageBase64: pendingDataUrl }, pendingDataUrl ? (t ? 'combined' : 'photo') : 'text');
          close('ok');
        } catch (e) {
          toast(geminiErrToMsg(e), 'error');
          btn.disabled = false; btn.textContent = 'Analyze & log';
        }
      });

      // ── Manual tab
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

      // ── Food DB tab
      let selectedFood = null;
      let qty = 1;

      function renderFoodList(query = '') {
        const listEl = root.querySelector('#fd-list');
        const q = query.toLowerCase().trim();
        const filtered = q
          ? FOOD_DB.filter((f) => f.name.toLowerCase().includes(q) || f.cat.includes(q) || f.desc.toLowerCase().includes(q))
          : FOOD_DB;
        if (filtered.length === 0) {
          listEl.innerHTML = '<div class="muted small fd-empty">No foods found</div>';
          return;
        }
        listEl.innerHTML = filtered.map((f, i) => `
          <div class="fd-item" data-idx="${FOOD_DB.indexOf(f)}">
            <span class="fd-item-emoji">${f.emoji}</span>
            <div class="fd-item-info">
              <div class="fd-item-name">${escapeHtml(f.name)}</div>
              <div class="fd-item-serving muted small">${escapeHtml(f.serving)}</div>
            </div>
            <span class="fd-item-cat muted small">${f.cat}</span>
          </div>`).join('');
        listEl.querySelectorAll('.fd-item').forEach((el) => {
          el.addEventListener('click', () => {
            selectedFood = FOOD_DB[Number(el.dataset.idx)];
            qty = 1;
            showFoodBottom();
          });
        });
      }

      function showFoodBottom() {
        root.querySelector('#fd-bottom').classList.remove('hidden');
        root.querySelector('#fd-review').classList.add('hidden');
        root.querySelector('#fd-sel-emoji').textContent = selectedFood.emoji;
        root.querySelector('#fd-sel-name').textContent = selectedFood.name;
        root.querySelector('#fd-sel-serving').textContent = selectedFood.serving;
        root.querySelector('#fd-qty-num').textContent = qty;
        root.querySelector('#fd-qty-label').textContent = qty === 1 ? 'serving' : 'servings';
      }

      root.querySelector('#fd-search').addEventListener('input', (e) => {
        renderFoodList(e.target.value);
        root.querySelector('#fd-bottom').classList.add('hidden');
        root.querySelector('#fd-review').classList.add('hidden');
        selectedFood = null;
      });

      root.querySelector('#fd-qty-minus').addEventListener('click', () => {
        if (qty <= 0.5) return;
        qty = qty <= 1 ? 0.5 : qty - 1;
        root.querySelector('#fd-qty-num').textContent = qty;
        root.querySelector('#fd-qty-label').textContent = qty === 1 ? 'serving' : 'servings';
      });
      root.querySelector('#fd-qty-plus').addEventListener('click', () => {
        qty = qty < 1 ? 1 : qty + 1;
        root.querySelector('#fd-qty-num').textContent = qty;
        root.querySelector('#fd-qty-label').textContent = qty === 1 ? 'serving' : 'servings';
      });

      root.querySelector('#fd-analyze').addEventListener('click', async () => {
        if (!selectedFood) return toast('Pick a food first', 'error');
        const btn = root.querySelector('#fd-analyze');
        btn.disabled = true; btn.textContent = 'Estimating…';
        try {
          const profile = await getProfile();
          const qtyStr = qty === 0.5 ? 'half' : qty === 1 ? 'one' : `${qty}`;
          const desc = `${qtyStr} serving${qty > 1 ? 's' : ''} of ${selectedFood.name} (${selectedFood.desc}), serving size: ${selectedFood.serving}`;
          const r = await analyzeMealText(desc, profile.goals, profile.dietPreference || 'Indian');
          // Show review form
          root.querySelector('#fd-bottom').classList.add('hidden');
          root.querySelector('#fd-review').classList.remove('hidden');
          root.querySelector('#fd-rev-name').textContent = r.description || selectedFood.name;
          root.querySelector('#fd-rev-conf').textContent = `confidence: ${r.confidence || '—'}`;
          root.querySelector('#fd-rcal').value = r.nutrition?.calories || '';
          root.querySelector('#fd-rpro').value = r.nutrition?.protein || '';
          root.querySelector('#fd-rcarb').value = r.nutrition?.carbs || '';
          root.querySelector('#fd-rfat').value = r.nutrition?.fat || '';
        } catch (e) {
          toast(geminiErrToMsg(e), 'error');
          btn.disabled = false; btn.textContent = 'Get nutrition →';
        }
      });

      root.querySelector('#fd-re-search').addEventListener('click', () => {
        root.querySelector('#fd-review').classList.add('hidden');
        root.querySelector('#fd-bottom').classList.remove('hidden');
        const analyzeBtn = root.querySelector('#fd-analyze');
        analyzeBtn.disabled = !haveKey;
        analyzeBtn.textContent = 'Get nutrition →';
      });

      root.querySelector('#fd-log').addEventListener('click', async () => {
        const nutrition = {
          calories: Number(root.querySelector('#fd-rcal').value) || 0,
          protein: Number(root.querySelector('#fd-rpro').value) || 0,
          carbs: Number(root.querySelector('#fd-rcarb').value) || 0,
          fat: Number(root.querySelector('#fd-rfat').value) || 0,
          fiber: 0,
        };
        const desc = root.querySelector('#fd-rev-name').textContent || selectedFood?.name || `${type} meal`;
        await saveMeal(type, { description: desc, nutrition }, 'db');
        close('ok');
      });

      // Init food list
      renderFoodList();
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
