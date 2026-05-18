export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function initTheme(profile) {
  applyTheme(profile.theme || 'dark');
  if (profile.theme === 'system') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme('system'));
  }
}
