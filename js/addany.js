// Smart "add anything" — free text + optional photo, Gemini classifies into
// meal / workout / hobby / weight / water / note, persists, then shows score impact.
import { addRecord, getProfile, putRecord, saveProfile, todayStr, STORES } from './db.js';
import { classifyAndExtract, compressImage, hasKey } from './gemini.js';
import { modal, toast } from './ui.js';
import { awardXP, computeDailyScoreLocal, persistDailyScore } from './gamification.js';

const TYPE_ICONS = {
  meal: '🍽️',
  workout: '💪',
  hobby: '🎨',
  weight: '⚖️',
  water: '💧',
  note: '📝',
};

export function openAddAnything() {
  return modal(
    `
      <div class="aa-head">
        <div class="aa-icon">⚡</div>
        <div>
          <h3 style="margin:0;">Add anything</h3>
          <p class="muted small" style="margin:2px 0 0;">Type a quick note. Optionally add a photo. AI sorts it.</p>
        </div>
      </div>
      <textarea id="aa-text" rows="3" placeholder="e.g. ran 3km, ate dal chawal, read for 20 min, drank 500ml water"></textarea>
      <div class="aa-photo-row">
        <label class="btn btn-ghost btn-sm file-btn" style="flex:1;">
          📷 Add photo (optional)
          <input id="aa-file" type="file" accept="image/*" capture="environment" hidden />
        </label>
        <button class="btn btn-ghost btn-sm hidden" id="aa-photo-clear">Clear</button>
      </div>
      <img id="aa-preview" class="preview-img hidden" />
      <p class="muted small" id="aa-hint">Tip: be specific — "3 sets of 10 squats at 60kg" works better than "leg day".</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="aa-cancel">Cancel</button>
        <button class="btn btn-primary" id="aa-go">Log it</button>
      </div>
    `,
    (root, close) => {
      const txt = root.querySelector('#aa-text');
      const fileInp = root.querySelector('#aa-file');
      const preview = root.querySelector('#aa-preview');
      const clearBtn = root.querySelector('#aa-photo-clear');
      let dataUrl = null;

      setTimeout(() => txt.focus(), 50);

      fileInp.addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try {
          dataUrl = await compressImage(f);
          preview.src = dataUrl;
          preview.classList.remove('hidden');
          clearBtn.classList.remove('hidden');
        } catch {
          toast('Could not read image', 'error');
        }
      });
      clearBtn.addEventListener('click', () => {
        dataUrl = null;
        preview.classList.add('hidden');
        clearBtn.classList.add('hidden');
        fileInp.value = '';
      });

      root.querySelector('#aa-cancel').addEventListener('click', () => close(null));
      root.querySelector('#aa-go').addEventListener('click', async () => {
        const text = txt.value.trim();
        if (!text && !dataUrl) return toast('Type something or add a photo', 'error');
        if (!(await hasKey())) return toast('Add Gemini key in Settings', 'error');
        const goBtn = root.querySelector('#aa-go');
        goBtn.disabled = true; goBtn.textContent = 'Thinking…';
        try {
          const profile = await getProfile();
          const before = await computeDailyScoreLocal();
          const r = await classifyAndExtract(text, dataUrl, profile);
          await persistByType(r, dataUrl);
          const after = await computeDailyScoreLocal();
          await persistDailyScore(after, null);
          close('ok');
          showImpact(r, before, after);
        } catch (e) {
          toast(errMsg(e), 'error');
          goBtn.disabled = false; goBtn.textContent = 'Log it';
        }
      });
    }
  ).then((r) => {
    if (r === 'ok') document.dispatchEvent(new Event('lt:refresh-home'));
  });
}

async function persistByType(r, dataUrl) {
  const today = todayStr();
  switch (r.type) {
    case 'meal': {
      const m = r.meal || {};
      const n = m.nutrition || {};
      await addRecord(STORES.meals, {
        date: today,
        timestamp: Date.now(),
        type: m.type || guessMealSlot(),
        description: m.description || r.summary || 'Meal',
        imageBase64: dataUrl || null,
        source: dataUrl ? (r.summary ? 'combined' : 'photo') : 'text',
        nutrition: {
          calories: Math.round(n.calories || 0),
          protein: Math.round(n.protein || 0),
          carbs: Math.round(n.carbs || 0),
          fat: Math.round(n.fat || 0),
          fiber: Math.round(n.fiber || 0),
        },
      });
      await awardXP(10, 'Meal');
      break;
    }
    case 'workout': {
      const w = r.workout || {};
      const exercises = (w.exercises || []).map((ex) => ({
        name: ex.name || 'Exercise',
        sets: (ex.sets || []).map((s) => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0, completed: true })),
        isPR: false,
        previousBest: null,
      }));
      const totalVolumeKg = Math.round(
        w.totalVolumeKg ||
          exercises.reduce((s, ex) => s + ex.sets.reduce((a, st) => a + st.reps * st.weight, 0), 0)
      );
      await addRecord(STORES.workouts, {
        date: today,
        name: w.name || r.summary || 'Workout',
        exercises,
        totalVolumeKg,
        durationMinutes: 0,
      });
      await awardXP(30, 'Workout');
      break;
    }
    case 'hobby': {
      const h = r.hobby || {};
      await addRecord(STORES.hobbies, {
        date: today,
        hobbyId: `aa-${Date.now()}`,
        hobbyName: h.name || r.summary || 'Activity',
        minutes: Number(h.minutes) || 0,
        notes: h.notes || '',
      });
      await awardXP(15, 'Hobby');
      break;
    }
    case 'weight': {
      const w = r.weight?.kg;
      if (w && w > 0) {
        await putRecord(STORES.bodyMetrics, { date: today, weight: Number(w) });
        await awardXP(5, 'Weight');
      }
      break;
    }
    case 'water': {
      const ml = Number(r.water?.ml) || 0;
      if (ml > 0) {
        const p = await getProfile();
        const cur = p.waterDate === today ? (p.waterToday || 0) : 0;
        const wasUnder = cur < p.goals.water;
        const next = cur + ml;
        await saveProfile({ waterDate: today, waterToday: next });
        if (wasUnder && next >= p.goals.water) await awardXP(10, 'Water goal');
      }
      break;
    }
    default: {
      // Note — just save as a hobby with 0 minutes so it appears in activity log
      await addRecord(STORES.hobbies, {
        date: today,
        hobbyId: 'note',
        hobbyName: '📝 Note',
        minutes: 0,
        notes: r.note?.text || r.summary || '',
      });
      break;
    }
  }
}

function guessMealSlot() {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

function showImpact(r, before, after) {
  const dAct = after.activityScore - before.activityScore;
  const dOut = after.outputScore - before.outputScore;
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'overlay';
  const deltaLine = (dAct > 0 || dOut > 0)
    ? `<div class="aa-deltas">
         ${dAct > 0 ? `<span class="d-pill d-act">+${dAct} activity</span>` : ''}
         ${dOut > 0 ? `<span class="d-pill d-out">+${dOut} output</span>` : ''}
       </div>`
    : `<div class="muted small" style="margin-top:8px;">No score change — but it's logged.</div>`;
  const note = r.encouragement || r.summary || 'Logged.';
  el.innerHTML = `
    <div class="aa-impact">
      <div class="ov-icon">${TYPE_ICONS[r.type] || '⚡'}</div>
      <div class="ov-title" style="font-size:22px;">${escapeHtml(r.summary || (r.type[0].toUpperCase() + r.type.slice(1)))}</div>
      <div class="aa-scores">
        <div class="aa-score"><div class="aa-s-num" style="color:#00ff88">${after.activityScore}</div><div class="aa-s-cap">activity</div></div>
        <div class="aa-score"><div class="aa-s-num" style="color:#ffaa00">${after.outputScore}</div><div class="aa-s-cap">output</div></div>
      </div>
      ${deltaLine}
      <p class="muted" style="margin:14px 0 18px;max-width:320px;">${escapeHtml(note)}</p>
      <button class="btn btn-primary" id="aa-impact-close">OK</button>
    </div>`;
  root.appendChild(el);
  el.querySelector('#aa-impact-close').addEventListener('click', () => el.remove());
  setTimeout(() => { if (el.isConnected) el.remove(); }, 6000);
}

function errMsg(e) {
  const m = String(e?.message || e);
  if (m.includes('NO_KEY')) return 'Add Gemini key in Settings';
  if (m.includes('429')) return 'Rate limited — try again in a sec';
  if (m.includes('BAD_JSON')) return 'Could not parse AI response';
  if (m.includes('EMPTY_RESPONSE_SAFETY')) return 'Gemini blocked the response';
  if (m.includes('EMPTY_RESPONSE')) return 'Gemini returned empty — try again';
  if (m.startsWith('GEMINI_')) return 'Gemini API error';
  return 'Network error — are you online?';
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
