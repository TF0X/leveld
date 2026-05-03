// UI primitives — toasts, modals, overlays, XP popups, ring helpers.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function toast(message, kind = '') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 320);
  }, 3000);
}

export function showXP(text) {
  const el = document.createElement('div');
  el.className = 'xp-pop';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

export function showLevelUp(level, rank) {
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `
    <div>
      <div class="ov-icon">⚡</div>
      <div class="ov-title">Level Up!</div>
      <div class="ov-num">${level}</div>
      <div class="ov-sub">${rank}</div>
      <button class="btn btn-primary" id="lvl-close">Continue</button>
    </div>`;
  root.appendChild(el);
  fireConfetti('#aa44ff', '#00ff88');
  el.querySelector('#lvl-close').addEventListener('click', () => el.remove());
  setTimeout(() => { if (el.isConnected) el.remove(); }, 5000);
}

export function showAchievement(ach) {
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `
    <div>
      <div class="ov-icon">${ach.icon}</div>
      <div class="ov-title">Achievement!</div>
      <div class="ov-sub">${ach.name}</div>
      <button class="btn btn-primary" id="ach-close">Nice</button>
    </div>`;
  root.appendChild(el);
  fireConfetti('#ffaa00', '#00ff88');
  el.querySelector('#ach-close').addEventListener('click', () => el.remove());
  setTimeout(() => { if (el.isConnected) el.remove(); }, 4500);
}

export function showPR(exerciseName, weight) {
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `
    <div>
      <div class="ov-icon">🏆</div>
      <div class="ov-title">New PR!</div>
      <div class="ov-num">${weight} kg</div>
      <div class="ov-sub">${exerciseName}</div>
      <button class="btn btn-primary" id="pr-close">Let's go</button>
    </div>`;
  root.appendChild(el);
  fireConfetti('#00ff88', '#ffaa00', '#4488ff');
  el.querySelector('#pr-close').addEventListener('click', () => el.remove());
  setTimeout(() => { if (el.isConnected) el.remove(); }, 4500);
}

function fireConfetti(...colors) {
  const layer = document.createElement('div');
  layer.className = 'confetti';
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.animationDuration = `${1 + Math.random() * 1.4}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 2200);
}

// Modal — pass HTML string + optional setup function.
export function modal(innerHTML, setup) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal">${innerHTML}</div>`;
    root.appendChild(bg);
    const close = (val) => {
      bg.style.transition = 'opacity .2s';
      bg.style.opacity = '0';
      setTimeout(() => { bg.remove(); resolve(val); }, 180);
    };
    bg.addEventListener('click', (e) => { if (e.target === bg) close(null); });
    if (setup) setup(bg.querySelector('.modal'), close);
  });
}

// Ring helpers — animate stroke-dashoffset given pct 0-1
const RING_C = 2 * Math.PI * 52; // r=52
export function setRing(el, pct) {
  if (!el) return;
  const p = Math.min(1, Math.max(0, pct));
  el.style.strokeDasharray = `${RING_C}`;
  el.style.strokeDashoffset = `${RING_C * (1 - p)}`;
}

export function fmtMins(m) {
  const s = Math.max(0, Math.floor(m));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}
