export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const RING_CIRCUMFERENCE = 2 * Math.PI * 40;

export function setRing(element, ratio) {
  if (!element) return;
  const clamped = Math.max(0, Math.min(1, ratio));
  element.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  element.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - clamped)}`;
}

export function toast(message) {
  let root = $('#toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-root';
    document.body.appendChild(root);
  }
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(8px)';
    setTimeout(() => node.remove(), 180);
  }, 2800);
}

function mountOverlay(targetId, innerHtml, className, setup) {
  return new Promise((resolve) => {
    const root = document.getElementById(targetId);
    const wrap = document.createElement('div');
    wrap.className = className;
    wrap.innerHTML = innerHtml;
    root.appendChild(wrap);
    const close = (value = null) => {
      wrap.remove();
      resolve(value);
    };
    wrap.addEventListener('click', (event) => {
      if (event.target === wrap) close(null);
    });
    setup?.(wrap, close);
  });
}

export function openSheet(content, setup) {
  return mountOverlay(
    'sheet-root',
    `<div class="sheet-backdrop"><div class="sheet"><div class="sheet__handle"></div>${content}</div></div>`,
    '',
    (mount, close) => setup?.($('.sheet', mount), close)
  );
}

export function openModal(content, setup) {
  return mountOverlay(
    'modal-root',
    `<div class="modal-backdrop"><div class="modal">${content}</div></div>`,
    '',
    (mount, close) => setup?.($('.modal', mount), close)
  );
}

export function button(label, classes = 'btn btn--soft', attrs = '') {
  return `<button class="${classes}" ${attrs}>${label}</button>`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

export function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(date));
}

export function fmtNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}
