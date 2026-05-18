import { STORES, dateStr, getAll } from './db.js';
import { escapeHtml } from './ui.js';
import { getWaterHistory } from './water.js';

let ChartRef;
let chart;

async function loadChart() {
  if (ChartRef) return ChartRef;
  const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/+esm');
  ChartRef = mod.Chart || mod.default;
  if (mod.registerables) ChartRef.register(...mod.registerables);
  return ChartRef;
}

function buildLabelRange(days) {
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    out.push(dateStr(date));
  }
  return out;
}

export async function renderInsightsChart(canvas, detailRoot, days = 30) {
  const Chart = await loadChart();
  const labels = buildLabelRange(days);
  const scores = await getAll(STORES.dailyScores);
  const water = await getWaterHistory(days);
  const workoutDates = new Set((await getAll(STORES.workouts)).map((item) => item.date));
  const scoreMap = new Map(scores.map((item) => [item.date, item]));
  const waterMap = new Map(water.map((item) => [item.date, item.ml]));
  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels.map((label) => label.slice(5)),
      datasets: [
        { label: 'Activity', data: labels.map((label) => scoreMap.get(label)?.activityScore ?? null), borderColor: '#6B9B6E', tension: 0.35, spanGaps: true },
        { label: 'Output', data: labels.map((label) => scoreMap.get(label)?.outputScore ?? null), borderColor: '#D4A574', tension: 0.35, spanGaps: true },
        { label: 'Water ml', data: labels.map((label) => waterMap.get(label) ?? null), borderColor: '#6B75A8', tension: 0.35, spanGaps: true, yAxisID: 'water' },
        { label: 'Workout day', type: 'scatter', data: labels.map((label, index) => workoutDates.has(label) ? { x: index, y: 100 } : null).filter(Boolean), pointBackgroundColor: '#C97A6A', pointRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (_event, items) => {
        if (!items.length) return;
        const label = labels[items[0].index];
        renderDayBreakdown(detailRoot, scoreMap.get(label), label, waterMap.get(label) || 0);
      },
      scales: {
        y: { min: 0, max: 100, ticks: { color: '#8A92AC' }, grid: { color: 'rgba(138,146,172,0.12)' } },
        water: { position: 'right', ticks: { color: '#8A92AC' }, grid: { display: false } },
        x: { ticks: { color: '#8A92AC' }, grid: { display: false } },
      },
      plugins: {
        legend: { labels: { color: '#C8CCE0' } },
      },
    },
  });
}

export function renderDayBreakdown(root, score, date, waterMl) {
  if (!root) return;
  if (!score) {
    root.innerHTML = `<div class="muted">No stored score for ${escapeHtml(date)}.</div>`;
    return;
  }
  root.innerHTML = `
    <div class="stack-sm">
      <strong>${escapeHtml(date)}</strong>
      <div class="meta-line">Activity ${score.activityScore} · Output ${score.outputScore} · Water ${waterMl} ml</div>
      <div class="meta-line">Meals ${score.breakdown?.meals || 0} · Workouts ${score.breakdown?.workouts || 0} · Hobbies ${score.breakdown?.hobbies || 0}</div>
      ${score.llmNote ? `<div class="muted">${escapeHtml(score.llmNote)}</div>` : ''}
    </div>`;
}

export async function buildHeatmap(days = 56) {
  const labels = buildLabelRange(days);
  const scores = await getAll(STORES.dailyScores);
  const scoreMap = new Map(scores.map((item) => [item.date, item]));
  const today = dateStr(new Date());
  return labels.map((label) => {
    const total = Math.max(scoreMap.get(label)?.activityScore || 0, scoreMap.get(label)?.outputScore || 0);
    const level = total === 0 ? 0 : total < 25 ? 1 : total < 45 ? 2 : total < 70 ? 3 : total < 90 ? 4 : 5;
    return { date: label, level, isToday: label === today };
  });
}
