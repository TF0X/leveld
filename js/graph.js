// Progress charts — Chart.js loaded via CDN as ESM. Falls back to simple SVG if offline.
import { getAll, getProfile, dateStr, STORES } from './db.js';
import { ACHIEVEMENTS } from './gamification.js';
import { $ } from './ui.js';

let ChartLib = null;
let mainChart = null;
let bwChart = null;
let currentRange = 7;

async function loadChart() {
  if (ChartLib) return ChartLib;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.6/+esm');
    ChartLib = mod.Chart || mod.default;
    if (ChartLib && mod.registerables) ChartLib.register(...mod.registerables);
    return ChartLib;
  } catch {
    return null;
  }
}

function rangeDays(range) {
  if (range === 'all') return 365;
  return Number(range);
}

function buildLabels(days) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(dateStr(d));
  }
  return out;
}

export async function renderProgress(range = currentRange) {
  currentRange = range;
  const days = rangeDays(range);
  const Chart = await loadChart();
  const allScores = await getAll(STORES.dailyScores);
  const map = Object.fromEntries(allScores.map((s) => [s.date, s]));
  const labels = buildLabels(days);
  const activity = labels.map((d) => map[d]?.activityScore ?? null);
  const output = labels.map((d) => map[d]?.outputScore ?? null);

  const canvas = $('#chart-main');
  if (Chart && canvas) {
    if (mainChart) mainChart.destroy();
    mainChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels.map((d) => d.slice(5)),
        datasets: [
          { label: 'Activity', data: activity, borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.1)', tension: 0.35, spanGaps: true, fill: true, pointRadius: 3 },
          { label: 'Output', data: output, borderColor: '#ffaa00', backgroundColor: 'rgba(255,170,0,0.08)', tension: 0.35, spanGaps: true, fill: true, pointRadius: 3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#aaa', font: { family: 'Space Grotesk' } } },
          tooltip: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1 },
        },
        scales: {
          x: { ticks: { color: '#666' }, grid: { color: '#1f1f1f' } },
          y: { min: 0, max: 100, ticks: { color: '#666' }, grid: { color: '#1f1f1f' } },
        },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          const date = labels[idx];
          showDayDetail(date, map[date]);
        },
      },
    });
  }

  // Stats grid
  const allMeals = await getAll(STORES.meals);
  const allWorkouts = await getAll(STORES.workouts);
  const allHobbies = await getAll(STORES.hobbies);
  const profile = await getProfile();
  $('#st-meals').textContent = allMeals.length;
  $('#st-workouts').textContent = allWorkouts.length;
  $('#st-volume').textContent = Math.round(allWorkouts.reduce((s, w) => s + (w.totalVolumeKg || 0), 0));
  $('#st-hobby').textContent = allHobbies.reduce((s, h) => s + (h.minutes || 0), 0);
  $('#st-streak').textContent = profile.streakRecord || 0;
  $('#st-xp').textContent = profile.totalXP || 0;

  // PRs
  const prs = await getAll(STORES.personalRecords);
  const prRoot = $('#pr-table');
  prRoot.innerHTML = '';
  if (prs.length === 0) {
    prRoot.innerHTML = '<div class="muted small" style="padding:12px;">No PRs yet.</div>';
  } else {
    for (const r of prs.sort((a, b) => (b.bestWeightKg || 0) - (a.bestWeightKg || 0))) {
      const row = document.createElement('div');
      row.className = 'pr-row';
      row.innerHTML = `<div>${escapeHtml(r.exerciseName)}</div><div class="pr-w">${r.bestWeightKg}kg × ${r.bestReps}</div><div class="pr-d">${r.achievedDate}</div>`;
      prRoot.appendChild(row);
    }
  }

  // Achievements
  const achRoot = $('#ach-grid');
  achRoot.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const card = document.createElement('div');
    const unlocked = profile.achievements?.includes(a.id);
    card.className = `ach-card${unlocked ? ' unlocked' : ''}`;
    card.innerHTML = `<div class="ac-icon">${a.icon}</div><div class="ac-name">${a.name}</div>`;
    achRoot.appendChild(card);
  }

  // Bodyweight chart
  const bw = (await getAll(STORES.bodyMetrics)).sort((a, b) => a.date.localeCompare(b.date));
  const bwCanvas = $('#chart-bw');
  if (Chart && bwCanvas && bw.length > 0) {
    if (bwChart) bwChart.destroy();
    bwChart = new Chart(bwCanvas, {
      type: 'line',
      data: {
        labels: bw.map((b) => b.date.slice(5)),
        datasets: [{ label: 'Weight (kg)', data: bw.map((b) => b.weight), borderColor: '#aa44ff', backgroundColor: 'rgba(170,68,255,0.1)', tension: 0.3, fill: true, pointRadius: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#aaa' } } },
        scales: { x: { ticks: { color: '#666' }, grid: { color: '#1f1f1f' } }, y: { ticks: { color: '#666' }, grid: { color: '#1f1f1f' } } },
      },
    });
  } else if (bwCanvas) {
    const ctx = bwCanvas.getContext('2d');
    ctx.clearRect(0, 0, bwCanvas.width, bwCanvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '13px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText('Log a weight to see chart', bwCanvas.width / 2, 60);
  }
}

function showDayDetail(date, score) {
  const el = $('#day-detail');
  if (!score) {
    el.classList.remove('hidden');
    el.innerHTML = `<h4>${date}</h4><div class="muted small">No data for this day.</div>`;
    return;
  }
  const b = score.breakdown || {};
  el.classList.remove('hidden');
  el.innerHTML = `
    <h4>${date}</h4>
    <div class="dd-line"><span>Activity</span><span style="color:#00ff88">${score.activityScore}</span></div>
    <div class="dd-line"><span>Output</span><span style="color:#ffaa00">${score.outputScore}</span></div>
    <div class="dd-line"><span>Meals</span><span>${b.meals || 0}</span></div>
    <div class="dd-line"><span>Workouts</span><span>${b.workouts || 0}</span></div>
    <div class="dd-line"><span>Hobbies</span><span>${b.hobbies || 0}</span></div>
    ${b.cals ? `<div class="dd-line"><span>Calories</span><span>${b.cals}</span></div>` : ''}
    ${b.protein ? `<div class="dd-line"><span>Protein</span><span>${b.protein}g</span></div>` : ''}
    ${score.llmNote ? `<p class="muted small" style="margin-top:8px;">${escapeHtml(score.llmNote)}</p>` : ''}
  `;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
