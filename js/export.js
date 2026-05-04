// Export / import all data as JSON.
import { getAll, bulkImport, saveProfile, getProfile, todayStr, STORES } from './db.js';
import { toast, modal } from './ui.js';

const EXPORT_VERSION = 1;

export async function exportAll() {
  const payload = { version: EXPORT_VERSION, exportedAt: new Date().toISOString() };
  const profile = await getProfile();
  payload.profile = profile;
  for (const name of Object.values(STORES)) {
    if (name === 'profile') continue;
    payload[name] = await getAll(name);
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leveld-export-${todayStr()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  await saveProfile({ lastBackup: Date.now() });
  toast('Exported', 'success');
}

export async function importFromFile(file) {
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return toast('Invalid JSON file', 'error');
  }
  if (!data || typeof data !== 'object' || !data.version) {
    return toast('File missing version field', 'error');
  }
  if (data.version > EXPORT_VERSION) {
    return toast('File from a newer version', 'error');
  }
  const ok = await new Promise((resolve) =>
    modal(
      `<h3>Import data?</h3>
       <p class="muted small">This replaces all current data. Make sure you've exported a backup first.</p>
       <div class="modal-actions">
         <button class="btn btn-ghost" id="im-cancel">Cancel</button>
         <button class="btn btn-danger" id="im-go">Replace</button>
       </div>`,
      (root, close) => {
        root.querySelector('#im-cancel').addEventListener('click', () => close(false));
        root.querySelector('#im-go').addEventListener('click', () => close(true));
      }
    ).then(resolve)
  );
  if (!ok) return;
  await bulkImport(data);
  toast('Imported — reloading…', 'success');
  setTimeout(() => location.reload(), 800);
}

export async function shouldShowBackupBanner() {
  const p = await getProfile();
  if (!p.lastBackup) return true;
  const days = (Date.now() - p.lastBackup) / 86400000;
  return days > 3;
}
