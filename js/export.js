import { STORES, bulkImport, getAll, getProfile, saveProfile, todayStr } from './db.js';
import { openModal, toast } from './ui.js';

const EXPORT_VERSION = 2;

export async function exportAll() {
  const payload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: await getProfile(),
  };
  for (const store of Object.values(STORES)) {
    if (store === STORES.profile) continue;
    payload[store] = await getAll(store);
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lifetracker-export-${todayStr()}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await saveProfile({ lastBackup: Date.now() });
  toast('Backup exported');
}

export async function importFromFile(file) {
  const text = await file.text();
  const payload = JSON.parse(text);
  if (!payload?.version) throw new Error('Missing version field');
  if (payload.version === 1 && payload.profile?.waterToday && payload.profile?.waterDate) {
    payload.water ||= [];
    payload.water.push({
      date: payload.profile.waterDate,
      ml: payload.profile.waterToday,
      entries: [{ time: '09:00', ml: payload.profile.waterToday }],
    });
  }
  const ok = await openModal(
    `<h3 class="section-title">Replace current data?</h3>
     <p class="muted">Import clears the current app state and replaces it with this backup.</p>
     <div class="button-row">
       <button class="btn btn--soft" id="import-cancel">Cancel</button>
       <button class="btn btn--danger" id="import-confirm">Replace</button>
     </div>`,
    (root, close) => {
      root.querySelector('#import-cancel').addEventListener('click', () => close(false));
      root.querySelector('#import-confirm').addEventListener('click', () => close(true));
    }
  );
  if (!ok) return;
  await bulkImport(payload);
  location.reload();
}

export async function shouldShowBackupBanner() {
  const profile = await getProfile();
  if (!profile.lastBackup) return true;
  return (Date.now() - profile.lastBackup) / 86400000 > 3;
}
