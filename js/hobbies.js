// Hobbies screen — tiles for each profile hobby + log entries.
import { addRecord, deleteRecord, getByDate, getProfile, todayStr, STORES } from './db.js';
import { $, modal, toast } from './ui.js';
import { awardXP, unlockAchievement } from './gamification.js';

export async function renderHobbies() {
  const today = todayStr();
  const [logs, profile] = await Promise.all([getByDate(STORES.hobbies, today), getProfile()]);
  const tiles = $('#hobby-tiles');
  tiles.innerHTML = '';
  if (!profile.hobbies?.length) {
    tiles.innerHTML = '<div class="muted small">No hobbies set. Add some in Settings.</div>';
  }
  for (const h of profile.hobbies || []) {
    const todayMins = logs.filter((l) => l.hobbyId === h.id).reduce((s, l) => s + (l.minutes || 0), 0);
    const goal = h.dailyGoalMinutes || profile.goals.hobbyMinutes || 30;
    const pct = Math.min(100, Math.round((todayMins / Math.max(1, goal)) * 100));
    const tile = document.createElement('div');
    tile.className = `hobby-tile${todayMins >= goal ? ' done' : ''}`;
    tile.innerHTML = `
      <div class="ht-row">
        <div class="ht-icon">${h.icon || '🎯'}</div>
        <div class="ht-mins">${todayMins}m</div>
      </div>
      <div class="ht-name">${escapeHtml(h.name)}</div>
      <div class="ht-prog"><span style="width:${pct}%"></span></div>
    `;
    tile.addEventListener('click', () => openHobbyModal(h));
    tiles.appendChild(tile);
  }

  // Log list
  const logRoot = $('#hb-log');
  logRoot.innerHTML = '';
  if (logs.length === 0) {
    logRoot.innerHTML = '<div class="muted small">Nothing logged today.</div>';
  } else {
    for (const l of logs.sort((a, b) => (b.id || 0) - (a.id || 0))) {
      const item = document.createElement('div');
      item.className = 'log-item';
      item.innerHTML = `
        <div>
          <div>${escapeHtml(l.hobbyName)} · ${l.minutes}m</div>
          ${l.notes ? `<div class="li-meta">${escapeHtml(l.notes)}</div>` : ''}
        </div>
        <button class="meal-del" data-del="${l.id}">×</button>
      `;
      item.querySelector('[data-del]').addEventListener('click', async () => {
        await deleteRecord(STORES.hobbies, Number(l.id));
        toast('Removed');
        await renderHobbies();
        document.dispatchEvent(new Event('lt:refresh-home'));
      });
      logRoot.appendChild(item);
    }
  }

  // Custom button
  const customBtn = $('#hb-custom');
  customBtn.onclick = () => openHobbyModal({ id: 'custom', name: '', icon: '✨' }, true);
}

function openHobbyModal(hobby, isCustom = false) {
  modal(
    `
      <h3>Log ${escapeHtml(hobby.name || 'activity')}</h3>
      ${isCustom ? '<div class="form-row"><label>Activity name</label><input type="text" id="hm-name" placeholder="e.g. reading" /></div>' : ''}
      <div class="form-row"><label>Minutes</label><input type="number" id="hm-mins" inputmode="numeric" placeholder="e.g. 30" /></div>
      <div class="form-row"><label>Note (optional)</label><input type="text" id="hm-note" placeholder="What did you do?" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="hm-cancel">Cancel</button>
        <button class="btn btn-primary" id="hm-save">Log</button>
      </div>
    `,
    (root, close) => {
      root.querySelector('#hm-mins').focus();
      root.querySelector('#hm-cancel').addEventListener('click', () => close(null));
      root.querySelector('#hm-save').addEventListener('click', async () => {
        const mins = Number(root.querySelector('#hm-mins').value) || 0;
        if (mins <= 0) return toast('Minutes required', 'error');
        const name = isCustom ? (root.querySelector('#hm-name').value.trim() || 'Activity') : hobby.name;
        const id = isCustom ? `custom-${Date.now()}` : hobby.id;
        const note = root.querySelector('#hm-note').value.trim();
        await addRecord(STORES.hobbies, {
          date: todayStr(),
          hobbyId: id,
          hobbyName: name,
          minutes: mins,
          notes: note,
        });
        await awardXP(15, 'Hobby logged');
        const all = await getByDate(STORES.hobbies, todayStr());
        const uniq = new Set(all.map((l) => l.hobbyName));
        if (uniq.size >= 5) await unlockAchievement('hobby_5');
        toast('Logged', 'success');
        close('ok');
      });
    }
  ).then(async (r) => {
    if (r === 'ok') {
      await renderHobbies();
      document.dispatchEvent(new Event('lt:refresh-home'));
    }
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
