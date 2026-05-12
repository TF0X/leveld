// Progress charts — Chart.js loaded via CDN as ESM. Falls back to simple SVG if offline.
import { getAll, getProfile, dateStr, todayStr, STORES } from './db.js';
import { ACHIEVEMENTS } from './gamification.js';
import { computeSkills } from './skills.js';
import { $ } from './ui.js';

let ChartLib = null;
let mainChart = null;
let bwChart = null;
let donutChart = null;
let muscleChart = null;
let currentRange = 7;

const MUSCLE_GROUPS = [
  { name: 'Chest', kw: /bench|push.?up|chest|fly|dip|press(?!.*shoulder|.*overhead)/i, color: '#ff5588' },
  { name: 'Back', kw: /pull.?up|row|deadlift|lat|chin.?up|rack pull|t-?bar/i, color: '#4488ff' },
  { name: 'Legs', kw: /squat|lunge|leg|hamstring|glute|calf|hip thrust|rdl|romanian/i, color: '#aa44ff' },
  { name: 'Shoulders', kw: /shoulder|overhead|ohp|lateral|delt|raise|shrug/i, color: '#ffaa00' },
  { name: 'Arms', kw: /curl|tricep|bicep|hammer|skull|kickback/i, color: '#00ccff' },
  { name: 'Core', kw: /core|ab |abs|crunch|plank|leg.?raise|sit.?up|russian twist|hanging/i, color: '#00ff88' },
];

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
      const prVal = r.bodyweight
        ? `${r.bestReps} reps`
        : `${r.bestWeightKg}kg × ${r.bestReps}`;
      row.innerHTML = `<div>${escapeHtml(r.exerciseName)}</div><div class="pr-w">${prVal}</div><div class="pr-d">${r.achievedDate}</div>`;
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

  // ── Heatmap (last 90 days, GitHub-style)
  renderHeatmap(allScores);

  // ── Macro donut (today's P/C/F)
  await renderMacroDonut(Chart);

  // ── Muscle-group volume bar
  await renderMuscleChart(Chart, allWorkouts);

  // ── Skill bars
  await renderSkillBars();

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

function renderHeatmap(scoresArr) {
  const root = $('#heatmap');
  if (!root) return;
  root.innerHTML = '';
  const map = Object.fromEntries(scoresArr.map((s) => [s.date, s]));
  const days = 91;
  const today = new Date();

  // Find the oldest day and how many empty cells to prepend so col 1 starts on Sunday
  const oldest = new Date(today);
  oldest.setDate(today.getDate() - (days - 1));
  const leadPad = oldest.getDay(); // 0=Sun … 6=Sat

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  // Leading empty spacers for week alignment
  for (let i = 0; i < leadPad; i++) {
    const pad = document.createElement('div');
    pad.className = 'hm-cell hm-empty';
    grid.appendChild(pad);
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr_ = dateStr(d);
    const sc = map[dateStr_];
    const total = sc ? Math.max(sc.activityScore || 0, sc.outputScore || 0) : 0;
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    cell.dataset.lvl = total === 0 ? '0' : total < 30 ? '1' : total < 60 ? '2' : total < 85 ? '3' : '4';
    cell.title = `${dateStr_} — ${total ? `act ${sc.activityScore} / out ${sc.outputScore}` : 'no data'}`;
    cell.addEventListener('click', () => showDayDetail(dateStr_, sc));
    grid.appendChild(cell);
  }

  root.appendChild(grid);
  const legend = document.createElement('div');
  legend.className = 'hm-legend';
  legend.innerHTML = `<span>less</span>${[0,1,2,3,4].map(l => `<i class="hm-cell" data-lvl="${l}"></i>`).join('')}<span>more</span>`;
  root.appendChild(legend);
}

async function renderMacroDonut(Chart) {
  const canvas = $('#chart-donut');
  if (!canvas) return;
  const today = todayStr();
  const meals = await getAll(STORES.meals);
  const todayMeals = meals.filter((m) => m.date === today);
  const totals = todayMeals.reduce((a, m) => {
    const n = m.nutrition || {};
    a.protein += n.protein || 0;
    a.carbs += n.carbs || 0;
    a.fat += n.fat || 0;
    return a;
  }, { protein: 0, carbs: 0, fat: 0 });
  const total = totals.protein + totals.carbs + totals.fat;
  const center = $('#donut-center');
  if (center) {
    if (total === 0) {
      center.innerHTML = `<div class="dn-num">—</div><div class="dn-cap">no meals</div>`;
    } else {
      const pCal = totals.protein * 4;
      const cCal = totals.carbs * 4;
      const fCal = totals.fat * 9;
      const totalCal = pCal + cCal + fCal;
      center.innerHTML = `<div class="dn-num">${totalCal}</div><div class="dn-cap">cal today</div>`;
    }
  }
  if (!Chart) return;
  if (donutChart) donutChart.destroy();
  if (total === 0) return;
  donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [`Protein (${totals.protein}g)`, `Carbs (${totals.carbs}g)`, `Fat (${totals.fat}g)`],
      datasets: [{
        data: [totals.protein * 4, totals.carbs * 4, totals.fat * 9],
        backgroundColor: ['#00ff88', '#ffaa00', '#ff5588'],
        borderColor: '#0d1018',
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#aaa', font: { family: 'Space Grotesk', size: 11 }, boxWidth: 10, padding: 8 } },
        tooltip: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1 },
      },
    },
  });
}

async function renderMuscleChart(Chart, workouts) {
  const canvas = $('#chart-muscle');
  if (!canvas) return;
  // Sum volume per muscle group across last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = dateStr(cutoff);
  const recent = workouts.filter((w) => w.date >= cutoffStr);
  const groups = MUSCLE_GROUPS.map((g) => ({ ...g, vol: 0 }));
  for (const w of recent) {
    for (const ex of w.exercises || []) {
      const exName = ex.name || '';
      const exVol = (ex.sets || []).reduce((s, st) => s + ((st.completed ? 1 : 0) * (st.reps || 0) * (st.weight || 0)), 0);
      if (!exVol) continue;
      const matched = groups.find((g) => g.kw.test(exName));
      if (matched) matched.vol += exVol;
    }
  }
  const empty = groups.every((g) => g.vol === 0);
  const empty_el = $('#muscle-empty');
  if (empty_el) empty_el.classList.toggle('hidden', !empty);
  if (!Chart) return;
  if (muscleChart) muscleChart.destroy();
  if (empty) return;
  muscleChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: groups.map((g) => g.name),
      datasets: [{
        data: groups.map((g) => Math.round(g.vol)),
        backgroundColor: groups.map((g) => g.color + 'cc'),
        borderColor: groups.map((g) => g.color),
        borderWidth: 1.5,
        borderRadius: 8,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', borderWidth: 1, callbacks: { label: (ctx) => `${ctx.parsed.x.toLocaleString()} kg (30d)` } } },
      scales: { x: { ticks: { color: '#666' }, grid: { color: '#1f1f1f' } }, y: { ticks: { color: '#aaa', font: { family: 'Space Grotesk' } }, grid: { display: false } } },
    },
  });
}

async function renderSkillBars() {
  const root = $('#skill-bars');
  if (!root) return;
  const skills = await computeSkills();
  root.innerHTML = '';
  for (const s of skills) {
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `
      <div class="sk-row">
        <div class="sk-icon" style="color:${s.color}">${s.icon}</div>
        <div class="sk-meta">
          <div class="sk-name">${s.name} <span class="sk-lvl">Lv ${s.level}</span></div>
          <div class="sk-detail muted">${s.detail}</div>
        </div>
        <div class="sk-xp">${s.xp}</div>
      </div>
      <div class="sk-bar"><span style="width:${s.pct}%;background:${s.color}"></span></div>
    `;
    root.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
