import {
  STORES,
  clearAll,
  deleteRecord,
  getAll,
  getByDate,
  getDB,
  getProfile,
  putRecord,
  saveProfile,
  todayStr,
} from './db.js';
import { initTheme, applyTheme } from './theme.js';
import { $, $$, escapeHtml, fmtNumber, openModal, openSheet, setRing, toast } from './ui.js';
import { computeDailyScoreLocal, computeQuests, checkStreakOnOpen, lastNDayScores, maybeUnlockConsistencyAchievement, persistDailyScore, rankFor, weekKey, xpForLevel } from './gamification.js';
import { analyzeMealCombined, analyzeMealPhoto, analyzeMealText, compressImage, generateWeeklyInsight, hasKey } from './gemini.js';
import { exportAll, importFromFile, shouldShowBackupBanner } from './export.js';
import { buildHeatmap, renderInsightsChart } from './graph.js';
import { addHabit, getAIHabitSuggestions, getAllHabits, getHabitStreak, getTodayHabitLogs, PRESET_HABITS, removeHabit, toggleHabit } from './habits.js';
import { logHobbySession } from './hobbies.js';
import { logMeal, getDailyTotals } from './meals.js';
import { getPermission, getSchedules, requestPermission, runNotificationChecks, startNotificationLoop, upsertSchedule } from './notifications.js';
import { buildSearchIndex, searchEntries } from './search.js';
import { completeDailyShredChallenge, getDailyShredChallenge, getTodayNegativeHabitLogs, logNegativeHabit, NEGATIVE_HABITS } from './shred.js';
import { getTopMealTemplates, mealFromTemplate } from './templates.js';
import { getWaterToday, logWater } from './water.js';
import { saveWorkoutSession } from './workouts.js';

const state = {
  currentTab: 'home',
  insightsRange: 30,
};

const QUICK_HOBBIES = [
  { id: 'reading', name: 'Reading', icon: 'book' },
  { id: 'walking', name: 'Walking', icon: 'walk' },
  { id: 'coding', name: 'Coding', icon: 'code' },
  { id: 'meditation', name: 'Meditation', icon: 'brain' },
];

async function boot() {
  await getDB();
  await checkStreakOnOpen();
  const profile = await getProfile();
  initTheme(profile);
  registerServiceWorker();
  wireChrome();
  if (!profile.onboardingComplete) {
    renderOnboarding();
    return;
  }
  await afterReady();
}

async function afterReady() {
  await persistScoreForToday();
  renderCurrentView();
  startNotificationLoop().catch(() => {});
  buildSearchIndex().catch(() => {});
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
}

function wireChrome() {
  $$('.tab-bar__item').forEach((buttonEl) => {
    buttonEl.addEventListener('click', () => {
      state.currentTab = buttonEl.dataset.tab;
      syncTabBar();
      renderCurrentView();
    });
  });
  $('#fab-add').addEventListener('click', openQuickLogSheet);
  $('#menu-button').addEventListener('click', openMenuSheet);
  $('#notifications-button').addEventListener('click', openNotificationsSheet);
  document.addEventListener('lt:refresh-home', async () => {
    await persistScoreForToday();
    renderCurrentView();
    buildSearchIndex().catch(() => {});
  });
}

function syncTabBar() {
  $$('.tab-bar__item').forEach((buttonEl) => {
    buttonEl.classList.toggle('tab-bar__item--active', buttonEl.dataset.tab === state.currentTab);
  });
}

async function renderCurrentView() {
  const content = $('#app-content');
  if (state.currentTab === 'home') {
    content.innerHTML = await renderHome();
    await mountHomeInteractions();
  } else if (state.currentTab === 'insights') {
    content.innerHTML = await renderInsights();
    await mountInsightsVisuals();
  } else if (state.currentTab === 'goals') {
    content.innerHTML = await renderGoals();
    wireGoalsInteractions();
  } else {
    content.innerHTML = await renderProfile();
    wireProfileInteractions();
  }
}

async function renderHome() {
  const [profile, totals, water, habits, habitLogs, quests, templates, backupBanner, todos, shredChallenge, negativeLogs] = await Promise.all([
    getProfile(),
    getDailyTotals(),
    getWaterToday(),
    getAllHabits(),
    getTodayHabitLogs(),
    computeQuests(),
    getTopMealTemplates(5),
    shouldShowBackupBanner(),
    getOpenTodos(),
    getDailyShredChallenge(),
    getTodayNegativeHabitLogs(),
  ]);
  const habitStreaks = await Promise.all(habits.slice(0, 5).map((habit) => getHabitStreak(habit.id)));
  const currentLevelFloor = profile.level <= 1 ? 0 : xpForLevel(profile.level);
  const nextLevel = xpForLevel(profile.level + 1);
  const levelProgress = (profile.totalXP - currentLevelFloor) / Math.max(1, nextLevel - currentLevelFloor);
  const calorieRatio = totals.calories / Math.max(1, profile.goals.calories);
  const proteinRatio = totals.protein / Math.max(1, profile.goals.protein);
  const waterRatio = water.ml / Math.max(1, profile.goals.water);
  const habitDone = new Set(habitLogs.map((item) => item.habitId));
  return `
    ${backupBanner ? `<div class="banner">Backup is older than 3 days. <button class="btn btn--soft" id="backup-now">Export now</button></div>` : ''}
    <section class="hero-card">
      <div class="hero-card__top">
        <div>
          <div class="hero-card__rank-label">Rank</div>
          <div class="hero-card__next-rank">${escapeHtml(rankFor(profile.level))}</div>
        </div>
        <div class="hero-card__streak">
          <i class="ti ti-flame" aria-hidden="true"></i>
          <span>${profile.streak} day streak</span>
        </div>
      </div>
      <div class="hero-card__progress-track"><div class="hero-card__progress-fill" style="width:${Math.max(0, Math.min(100, levelProgress * 100))}%"></div></div>
      <div class="hero-card__xp-meta">
        <span>Level ${profile.level}</span>
        <span>${fmtNumber(profile.totalXP)} XP</span>
      </div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-chart-donut-3" aria-hidden="true"></i>Today's rings</div>
        <div class="card__meta">${profile.freezeTokens} freezes banked</div>
      </div>
      <div class="ring-grid">
        ${ringMarkup('calories', totals.calories, profile.goals.calories, 'var(--accent-mid)', 'calories')}
        ${ringMarkup('protein', totals.protein, profile.goals.protein, 'var(--success)', 'protein')}
        ${ringMarkup('water', water.ml, profile.goals.water, 'var(--accent-primary)', 'water')}
      </div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-plus" aria-hidden="true"></i>Quick log</div>
        <div class="card__meta">One tap</div>
      </div>
      <div class="chip-row">
        ${quickChip('meal', 'bowl', 'Meal')}
        ${quickChip('workout', 'barbell', 'Workout')}
        ${quickChip('water', 'droplet', 'Water')}
        ${quickChip('weight', 'scale', 'Weight')}
        ${quickChip('hobby', 'palette', 'Hobby')}
        ${quickChip('todo', 'list-check', 'Todo')}
      </div>
      ${templates.length ? `
        <div class="stack-sm" style="margin-top:12px;">
          <div class="meta-line">Saved meal templates</div>
          <div class="chip-row">${templates.map((template) => `<button class="chip chip--meal" data-template="${template.id}"><i class="ti ti-bowl"></i>${escapeHtml(template.description)}</button>`).join('')}</div>
        </div>` : ''}
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-target" aria-hidden="true"></i>Daily quests</div>
      </div>
      <div class="quest-strip">${quests.map((quest) => `<div class="quest-strip__day ${quest.done ? 'quest-strip__day--complete' : 'quest-strip__day--pending'}"></div>`).join('')}</div>
      <div class="stack-sm">
        ${quests.map((quest) => checklistMarkup(quest.label, quest.progress, quest.done ? 'done' : quest.progress !== 'pending' ? 'active' : 'pending', quest.xp)).join('')}
      </div>
    </section>

    ${profile.shredMode ? `
    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-bolt" aria-hidden="true"></i>Shred challenge</div>
        <div class="card__meta">${shredChallenge.completed ? 'cleared' : `+${shredChallenge.xp} XP`}</div>
      </div>
      <div class="stack-sm">
        ${checklistMarkup(shredChallenge.text, shredChallenge.type, shredChallenge.completed ? 'done' : 'active', shredChallenge.completed ? 0 : shredChallenge.xp, 'id="complete-shred-challenge"')}
      </div>
    </section>` : ''}

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-circle-check" aria-hidden="true"></i>Habits</div>
        <button class="btn btn--soft" id="add-habit-inline">Add</button>
      </div>
      <div class="stack-sm">
        ${habits.length ? habits.slice(0, 5).map((habit, index) => checklistMarkup(habit.name, habitDone.has(habit.id) ? 'done today' : `${habitStreaks[index]} day streak`, habitDone.has(habit.id) ? 'done' : 'pending', 8, `data-toggle-habit="${habit.id}"`)).join('') : '<div class="empty-state">No habits yet.</div>'}
      </div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-list-check" aria-hidden="true"></i>Todos</div>
        <button class="btn btn--soft" id="add-todo-inline">Add</button>
      </div>
      <div class="stack-sm">
        ${todos.length ? todos.slice(0, 5).map((todo) => checklistMarkup(todo.text, todoMeta(todo), todo.completed ? 'done' : todo.priority === 'high' ? 'active' : 'pending', todo.completed ? 0 : todoXp(todo), `data-toggle-todo="${todo.id}"`)).join('') : '<div class="empty-state">No open todos.</div>'}
      </div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-mood-off" aria-hidden="true"></i>Bad habits</div>
        <button class="btn btn--soft" id="log-negative-inline">Log slip-up</button>
      </div>
      <div class="stack-sm">
        ${negativeLogs.length ? negativeLogs.slice(0, 4).map((log) => checklistMarkup(log.label, `${log.note ? `${log.note} · ` : ''}-${log.penalty} XP`, 'active', 0)).join('') : '<div class="empty-state">No penalties logged today.</div>'}
      </div>
    </section>
  `;
}

async function mountHomeInteractions() {
  const [profile, totals, water] = await Promise.all([getProfile(), getDailyTotals(), getWaterToday()]);
  setRing($('[data-ring="calories"]'), totals.calories / Math.max(1, profile.goals.calories));
  setRing($('[data-ring="protein"]'), totals.protein / Math.max(1, profile.goals.protein));
  setRing($('[data-ring="water"]'), water.ml / Math.max(1, profile.goals.water));
  $('#backup-now')?.addEventListener('click', exportAll);
  $('#add-habit-inline')?.addEventListener('click', openHabitManager);
  $('#add-todo-inline')?.addEventListener('click', openTodoForm);
  $('#log-negative-inline')?.addEventListener('click', openNegativeHabitForm);
  $('#complete-shred-challenge')?.addEventListener('click', async () => {
    await completeDailyShredChallenge();
  });
  $$('[data-quick]').forEach((buttonEl) => buttonEl.addEventListener('click', () => openLogForm(buttonEl.dataset.quick)));
  $$('[data-template]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
    const templateId = Number(buttonEl.dataset.template);
    const template = (await getTopMealTemplates(20)).find((item) => item.id === templateId);
    if (!template) return;
    await logMeal(mealFromTemplate(template));
  }));
  $$('[data-toggle-habit]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
    await toggleHabit(Number(buttonEl.dataset.toggleHabit));
  }));
  $$('[data-toggle-todo]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
    await toggleTodo(Number(buttonEl.dataset.toggleTodo));
  }));
}

function ringMarkup(key, value, goal, stroke, label) {
  return `
    <div class="ring-card">
      <div class="ring-visual">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle class="ring-track" cx="50" cy="50" r="40"></circle>
          <circle class="ring-fill" data-ring="${key}" cx="50" cy="50" r="40" stroke="${stroke}"></circle>
        </svg>
        <div class="ring-center"><div><strong>${fmtNumber(value)}</strong><span>${Math.round((value / Math.max(1, goal)) * 100)}%</span></div></div>
      </div>
      <div class="meta-line">${escapeHtml(label)}</div>
    </div>`;
}

function quickChip(type, icon, label) {
  return `<button class="chip chip--${type}" data-quick="${type}"><i class="ti ti-${icon}" aria-hidden="true"></i>${label}</button>`;
}

function checklistMarkup(label, meta, stateClass, xp, extraAttrs = '') {
  return `
    <button class="checklist-item checklist-item--${stateClass}" ${extraAttrs}>
      <span class="checklist-checkbox">${stateClass === 'done' ? '<i class="ti ti-check"></i>' : ''}</span>
      <span class="checklist-label">${escapeHtml(label)}<div class="meta-line">${escapeHtml(meta)}</div></span>
      <span class="checklist-xp">${xp ? `+${xp} XP` : ''}</span>
    </button>`;
}

async function renderInsights() {
  const [profile, scores, searchResults, last7] = await Promise.all([
    getProfile(),
    getAll(STORES.dailyScores),
    Promise.resolve([]),
    lastNDayScores(7),
  ]);
  const averages = last7.length
    ? {
        activity: Math.round(last7.reduce((sum, row) => sum + (row.activityScore || 0), 0) / last7.length),
        output: Math.round(last7.reduce((sum, row) => sum + (row.outputScore || 0), 0) / last7.length),
      }
    : { activity: 0, output: 0 };
  return `
    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-chart-line" aria-hidden="true"></i>Trends</div>
        <div class="pill-tabs">
          ${[7, 30, 90].map((range) => `<button class="pill-tab ${state.insightsRange === range ? 'is-active' : ''}" data-range="${range}">${range}D</button>`).join('')}
        </div>
      </div>
      <div class="chart-wrap"><canvas id="insights-chart"></canvas></div>
      <div class="card" id="insight-day-breakdown"><div class="muted">Tap a point to inspect that day.</div></div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-sparkles" aria-hidden="true"></i>Weekly insight</div>
        <button class="btn btn--soft" id="refresh-insight">Refresh</button>
      </div>
      <div>${escapeHtml(profile.insight || 'No weekly insight yet. Refresh after you have a few logged days.')}</div>
      <div class="stat-grid" style="margin-top:12px;">
        <div class="stat-card"><div class="stat-card__label">Avg activity</div><div class="stat-card__value">${averages.activity}</div></div>
        <div class="stat-card"><div class="stat-card__label">Avg output</div><div class="stat-card__value">${averages.output}</div></div>
      </div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-search" aria-hidden="true"></i>Search logs</div>
      </div>
      <div class="input-with-icon">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input class="search-input" id="search-query" type="search" placeholder="Search meals, workouts, hobbies" />
      </div>
      <div class="list" id="search-results">${searchResults.length ? '' : '<div class="empty-state">Search across your saved logs.</div>'}</div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-calendar" aria-hidden="true"></i>Heatmap</div>
        <div class="card__meta">${scores.length} scored days</div>
      </div>
      <div class="heatmap-grid" id="heatmap-grid"></div>
    </section>
  `;
}

async function mountInsightsVisuals() {
  await renderInsightsChart($('#insights-chart'), $('#insight-day-breakdown'), state.insightsRange);
  const heatmap = await buildHeatmap();
  $('#heatmap-grid').innerHTML = heatmap.map((cell) => `<button class="heatmap-cell heatmap-cell--${cell.level} ${cell.isToday ? 'heatmap-cell--today' : ''}" data-heatmap="${cell.date}" aria-label="${cell.date}"></button>`).join('');
  $$('.pill-tab').forEach((buttonEl) => {
    buttonEl.addEventListener('click', () => {
      state.insightsRange = Number(buttonEl.dataset.range);
      renderCurrentView();
    });
  });
  $('#refresh-insight').addEventListener('click', refreshInsight);
  $('#search-query').addEventListener('input', renderSearchResults);
  $$('#heatmap-grid [data-heatmap]').forEach((cell) => cell.addEventListener('click', async () => {
    const scores = await getAll(STORES.dailyScores);
    const score = scores.find((item) => item.date === cell.dataset.heatmap);
    $('#insight-day-breakdown').innerHTML = score
      ? `<div class="stack-sm"><strong>${escapeHtml(score.date)}</strong><div class="meta-line">Activity ${score.activityScore} · Output ${score.outputScore}</div></div>`
      : `<div class="muted">No stored score for ${escapeHtml(cell.dataset.heatmap)}.</div>`;
  }));
}

async function renderSearchResults(event) {
  const query = event.target.value;
  const results = searchEntries(query);
  $('#search-results').innerHTML = results.length
    ? results.map((result) => `<div class="list-row"><div><strong>${escapeHtml(result.text)}</strong><div class="meta-line">${escapeHtml(result.store)} · ${escapeHtml(result.date)}</div></div></div>`).join('')
    : '<div class="empty-state">No matching logs.</div>';
}

async function renderGoals() {
  const [meals, workouts, hobbies, habits, water, todos, negativeLogs, profile, shredChallenge] = await Promise.all([
    getByDate(STORES.meals, todayStr()),
    getByDate(STORES.workouts, todayStr()),
    getByDate(STORES.hobbies, todayStr()),
    getAllHabits(),
    getWaterToday(),
    getAllTodos(),
    getTodayNegativeHabitLogs(),
    getProfile(),
    getDailyShredChallenge(),
  ]);
  return `
    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-bowl" aria-hidden="true"></i>Meals</div>
        <button class="btn btn--soft" id="open-meal-log">Add meal</button>
      </div>
      <div class="list">${meals.length ? meals.map((meal) => `<div class="list-row"><div><strong>${escapeHtml(meal.description)}</strong><div class="meta-line">${meal.type} · ${meal.nutrition.calories} kcal · ${meal.nutrition.protein}g protein</div></div><button class="badge" data-delete="meal:${meal.id}">Delete</button></div>`).join('') : '<div class="empty-state">Nothing logged yet today.</div>'}</div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-barbell" aria-hidden="true"></i>Workouts</div>
        <button class="btn btn--soft" id="open-workout-log">Add workout</button>
      </div>
      <div class="list">${workouts.length ? workouts.map((workout) => `<div class="list-row"><div><strong>${escapeHtml(workout.name)}</strong><div class="meta-line">${workout.exercises.length} exercises · ${fmtNumber(workout.totalVolumeKg)} kg volume</div></div><button class="badge" data-delete="workout:${workout.id}">Delete</button></div>`).join('') : '<div class="empty-state">No workout saved today.</div>'}</div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-palette" aria-hidden="true"></i>Hobbies</div>
        <button class="btn btn--soft" id="open-hobby-log">Add hobby</button>
      </div>
      <div class="list">${hobbies.length ? hobbies.map((hobby) => `<div class="list-row"><div><strong>${escapeHtml(hobby.hobbyName)}</strong><div class="meta-line">${hobby.minutes} minutes${hobby.notes ? ` · ${escapeHtml(hobby.notes)}` : ''}</div></div><button class="badge" data-delete="hobby:${hobby.id}">Delete</button></div>`).join('') : '<div class="empty-state">No hobby sessions yet today.</div>'}</div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-droplet" aria-hidden="true"></i>Water</div>
        <button class="btn btn--soft" id="open-water-log">Log water</button>
      </div>
      <div class="meta-line">${water.ml} ml today</div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-circle-check" aria-hidden="true"></i>Habits</div>
        <button class="btn btn--soft" id="open-habit-log">Manage</button>
      </div>
      <div class="list">${habits.length ? (await Promise.all(habits.map(async (habit) => {
        const done = (await getTodayHabitLogs()).some((item) => item.habitId === habit.id);
        const streak = await getHabitStreak(habit.id);
        return `<button class="list-row" data-habit="${habit.id}"><div><strong>${escapeHtml(habit.name)}</strong><div class="meta-line">${escapeHtml(habit.category || 'Habit')} · ${streak} day streak</div></div><span class="badge">${done ? 'Done' : 'Mark'}</span></button>`;
      }))).join('') : '<div class="empty-state">No habits added yet.</div>'}</div>
    </section>

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-list-check" aria-hidden="true"></i>Todos</div>
        <button class="btn btn--soft" id="open-todo-log">Add todo</button>
      </div>
      <div class="list">${todos.length ? todos.map((todo) => `<div class="list-row"><button class="list-row__main" data-todo="${todo.id}"><div><strong>${escapeHtml(todo.text)}</strong><div class="meta-line">${escapeHtml(todoMeta(todo))}</div></div><span class="badge">${todo.completed ? 'Done' : `${todo.priorityLabel}`}</span></button><button class="badge" data-edit-todo="${todo.id}">Edit</button><button class="badge" data-delete="todo:${todo.id}">Delete</button></div>`).join('') : '<div class="empty-state">No todos yet.</div>'}</div>
    </section>

    ${profile.shredMode ? `
    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-bolt" aria-hidden="true"></i>Shred challenge</div>
        <button class="btn btn--soft" id="goals-shred-complete">${shredChallenge.completed ? 'Completed' : 'Complete'}</button>
      </div>
      <div class="meta-line">${escapeHtml(shredChallenge.text)} · ${escapeHtml(shredChallenge.type)} · +${shredChallenge.xp} XP</div>
    </section>` : ''}

    <section class="card">
      <div class="card__header">
        <div class="card__title"><i class="ti ti-mood-off" aria-hidden="true"></i>Bad habits</div>
        <button class="btn btn--soft" id="open-negative-log">Log slip-up</button>
      </div>
      <div class="list">${negativeLogs.length ? negativeLogs.map((log) => `<div class="list-row"><div><strong>${escapeHtml(log.label)}</strong><div class="meta-line">${escapeHtml(log.note || 'logged today')} · -${log.penalty} XP</div></div></div>`).join('') : '<div class="empty-state">No bad habits logged today.</div>'}</div>
    </section>
  `;
}

function wireGoalsInteractions() {
  $('#open-meal-log')?.addEventListener('click', () => openQuickLogSheet('meal'));
  $('#open-workout-log')?.addEventListener('click', () => openQuickLogSheet('workout'));
  $('#open-hobby-log')?.addEventListener('click', () => openQuickLogSheet('hobby'));
  $('#open-water-log')?.addEventListener('click', () => openQuickLogSheet('water'));
  $('#open-habit-log')?.addEventListener('click', openHabitManager);
  $('#open-todo-log')?.addEventListener('click', openTodoForm);
  $('#open-negative-log')?.addEventListener('click', openNegativeHabitForm);
  $('#goals-shred-complete')?.addEventListener('click', async () => {
    await completeDailyShredChallenge();
  });
  $$('[data-delete]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
    const [kind, id] = buttonEl.dataset.delete.split(':');
    const store = kind === 'meal'
      ? STORES.meals
      : kind === 'workout'
        ? STORES.workouts
        : kind === 'hobby'
          ? STORES.hobbies
          : STORES.todos;
    await deleteRecord(store, Number(id));
    toast('Deleted');
    renderCurrentView();
  }));
  $$('[data-habit]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
    await toggleHabit(Number(buttonEl.dataset.habit));
    renderCurrentView();
  }));
  $$('[data-todo]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
    await toggleTodo(Number(buttonEl.dataset.todo));
    renderCurrentView();
  }));
  $$('[data-edit-todo]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
    const todo = (await getAllTodos()).find((item) => item.id === Number(buttonEl.dataset.editTodo));
    if (todo) openTodoForm(todo);
  }));
}

async function renderProfile() {
  const [profile, stats] = await Promise.all([
    getProfile(),
    Promise.all([getAll(STORES.meals), getAll(STORES.workouts), getAll(STORES.hobbies)]),
  ]);
  return `
    <section class="card">
      <div class="card__header"><div class="card__title"><i class="ti ti-user" aria-hidden="true"></i>Profile</div></div>
      <div class="stack-md">
        <label>Name<input id="profile-name" value="${escapeHtml(profile.name)}" /></label>
        <label>Diet preference<input id="profile-diet" value="${escapeHtml(profile.dietPreference || '')}" placeholder="Indian vegetarian, eggitarian, high protein" /></label>
        <div class="grid-2">
          <label>Calories<input id="goal-calories" type="number" value="${profile.goals.calories}" /></label>
          <label>Protein<input id="goal-protein" type="number" value="${profile.goals.protein}" /></label>
          <label>Water<input id="goal-water" type="number" value="${profile.goals.water}" /></label>
          <label>Hobby minutes<input id="goal-hobby" type="number" value="${profile.goals.hobbyMinutes}" /></label>
        </div>
        <label>Gemini API key<input id="profile-key" type="password" value="${escapeHtml(profile.geminiApiKey || '')}" placeholder="Optional" /></label>
        <label>Theme
          <select id="theme-select">
            <option value="light" ${profile.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${profile.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="system" ${profile.theme === 'system' ? 'selected' : ''}>System</option>
          </select>
        </label>
        <label class="list-row">
          <span><strong>Shred mode</strong><div class="meta-line">Show hard daily challenges and bad-habit penalties.</div></span>
          <input id="profile-shred" type="checkbox" ${profile.shredMode ? 'checked' : ''} />
        </label>
        <div class="button-row">
          <button class="btn btn--primary" id="save-profile">Save profile</button>
          <button class="btn btn--soft" id="backup-profile">Export</button>
        </div>
        <label class="btn btn--soft">Import<input id="import-file" type="file" accept="application/json" class="hidden" /></label>
        <button class="btn btn--danger" id="clear-data">Clear all data</button>
      </div>
    </section>

    <section class="card">
      <div class="card__header"><div class="card__title"><i class="ti ti-chart-bar" aria-hidden="true"></i>Totals</div></div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-card__label">Meals</div><div class="stat-card__value">${stats[0].length}</div></div>
        <div class="stat-card"><div class="stat-card__label">Workouts</div><div class="stat-card__value">${stats[1].length}</div></div>
        <div class="stat-card"><div class="stat-card__label">Hobbies</div><div class="stat-card__value">${stats[2].length}</div></div>
        <div class="stat-card"><div class="stat-card__label">Best streak</div><div class="stat-card__value">${profile.streakRecord}</div></div>
      </div>
    </section>
  `;
}

function wireProfileInteractions() {
  $('#save-profile').addEventListener('click', saveProfileForm);
  $('#backup-profile').addEventListener('click', exportAll);
  $('#theme-select').addEventListener('change', (event) => applyTheme(event.target.value));
  $('#import-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importFromFile(file);
      } catch (error) {
        toast(error.message || 'Import failed');
      }
    }
  });
  $('#clear-data').addEventListener('click', async () => {
    const confirmed = await openModal(
      `<h3 class="section-title">Clear everything?</h3><div class="button-row"><button class="btn btn--soft" id="clear-cancel">Cancel</button><button class="btn btn--danger" id="clear-confirm">Clear</button></div>`,
      (root, close) => {
        root.querySelector('#clear-cancel').addEventListener('click', () => close(false));
        root.querySelector('#clear-confirm').addEventListener('click', () => close(true));
      }
    );
    if (!confirmed) return;
    await clearAll();
    location.reload();
  });
}

async function saveProfileForm() {
  await saveProfile({
    name: $('#profile-name').value.trim(),
    dietPreference: $('#profile-diet').value.trim(),
    geminiApiKey: $('#profile-key').value.trim(),
    theme: $('#theme-select').value,
    shredMode: $('#profile-shred').checked,
    goals: {
      calories: Number($('#goal-calories').value) || 2200,
      protein: Number($('#goal-protein').value) || 150,
      water: Number($('#goal-water').value) || 3000,
      hobbyMinutes: Number($('#goal-hobby').value) || 60,
    },
  });
  initTheme(await getProfile());
  toast('Profile saved');
  renderCurrentView();
}

function openQuickLogSheet(forceType = null) {
  if (forceType) {
    openLogForm(forceType);
    return;
  }
  openSheet(`
    <div class="stack-md">
      <h3 class="section-title">Quick log</h3>
      <div class="chip-row">
        ${['meal', 'workout', 'water', 'weight', 'hobby', 'todo'].map((type) => `<button class="chip chip--${type}" data-sheet-log="${type}">${type}</button>`).join('')}
      </div>
    </div>
  `, (root, close) => {
    root.querySelectorAll('[data-sheet-log]').forEach((buttonEl) => {
      buttonEl.addEventListener('click', () => {
        close();
        openLogForm(buttonEl.dataset.sheetLog);
      });
    });
  });
}

function openLogForm(type) {
  if (type === 'meal') return openMealForm();
  if (type === 'workout') return openWorkoutForm();
  if (type === 'water') return openWaterForm();
  if (type === 'weight') return openWeightForm();
  if (type === 'todo') return openTodoForm();
  return openHobbyForm();
}

function openMealForm() {
  openModal(`
    <h3 class="section-title">Log meal</h3>
    <div class="stack-sm">
      <label>Description<textarea id="meal-description" rows="3" placeholder="2 rotis, dal, paneer"></textarea></label>
      <label>Photo<input id="meal-photo" type="file" accept="image/*" /></label>
      <div class="grid-2">
        <label>Calories<input id="meal-calories" type="number" /></label>
        <label>Protein<input id="meal-protein" type="number" /></label>
        <label>Carbs<input id="meal-carbs" type="number" /></label>
        <label>Fat<input id="meal-fat" type="number" /></label>
      </div>
      <div class="button-row">
        <button class="btn btn--soft" id="meal-ai">Use AI</button>
        <button class="btn btn--primary" id="meal-save">Save</button>
      </div>
    </div>
  `, (root, close) => {
    root.querySelector('#meal-ai').addEventListener('click', async () => {
      if (!(await hasKey())) {
        toast('Add a Gemini key first');
        return;
      }
      try {
        const file = root.querySelector('#meal-photo').files?.[0];
        const desc = root.querySelector('#meal-description').value.trim();
        const profile = await getProfile();
        let result;
        if (file && desc) {
          result = await analyzeMealCombined(desc, await compressImage(file), profile.goals, profile.dietPreference);
        } else if (file) {
          result = await analyzeMealPhoto(await compressImage(file), profile.goals, profile.dietPreference);
        } else if (desc) {
          result = await analyzeMealText(desc, profile.goals, profile.dietPreference);
        } else {
          toast('Add a description or photo');
          return;
        }
        root.querySelector('#meal-description').value = result.description || desc;
        root.querySelector('#meal-calories').value = result.nutrition?.calories || '';
        root.querySelector('#meal-protein').value = result.nutrition?.protein || '';
        root.querySelector('#meal-carbs').value = result.nutrition?.carbs || '';
        root.querySelector('#meal-fat').value = result.nutrition?.fat || '';
      } catch {
        toast('AI parsing failed');
      }
    });
    root.querySelector('#meal-save').addEventListener('click', async () => {
      await logMeal({
        description: root.querySelector('#meal-description').value,
        nutrition: {
          calories: root.querySelector('#meal-calories').value,
          protein: root.querySelector('#meal-protein').value,
          carbs: root.querySelector('#meal-carbs').value,
          fat: root.querySelector('#meal-fat').value,
        },
      });
      close();
    });
  });
}

function openWorkoutForm() {
  openModal(`
    <h3 class="section-title">Log workout</h3>
    <div class="stack-sm">
      <label>Name<input id="workout-name" placeholder="Push day" /></label>
      <label>Exercises<textarea id="workout-exercises" rows="6" placeholder="Bench Press|8|60&#10;Bench Press|8|60&#10;Lat Pulldown|10|45"></textarea></label>
      <div class="meta-line">Format: exercise|reps|weight per line.</div>
      <button class="btn btn--primary" id="workout-save">Save workout</button>
    </div>
  `, (root, close) => {
    root.querySelector('#workout-save').addEventListener('click', async () => {
      const lines = root.querySelector('#workout-exercises').value.split('\n').map((line) => line.trim()).filter(Boolean);
      const grouped = new Map();
      for (const line of lines) {
        const [name, reps, weight] = line.split('|').map((part) => part.trim());
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name).push({ reps: Number(reps) || 0, weight: Number(weight) || 0, completed: true });
      }
      await saveWorkoutSession({
        name: root.querySelector('#workout-name').value,
        exercises: [...grouped.entries()].map(([name, sets]) => ({ name, sets })),
      });
      close();
    });
  });
}

function openWaterForm() {
  openModal(`
    <h3 class="section-title">Log water</h3>
    <div class="button-row">
      <button class="btn btn--soft" data-water-add="250">250 ml</button>
      <button class="btn btn--soft" data-water-add="500">500 ml</button>
      <button class="btn btn--soft" data-water-add="750">750 ml</button>
    </div>
  `, (root, close) => {
    root.querySelectorAll('[data-water-add]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
      await logWater(Number(buttonEl.dataset.waterAdd));
      close();
    }));
  });
}

function openWeightForm() {
  openModal(`
    <h3 class="section-title">Log bodyweight</h3>
    <div class="stack-sm">
      <label>Weight (kg)<input id="weight-input" type="number" step="0.1" /></label>
      <button class="btn btn--primary" id="weight-save">Save</button>
    </div>
  `, (root, close) => {
    root.querySelector('#weight-save').addEventListener('click', async () => {
      const weight = Number(root.querySelector('#weight-input').value);
      if (!weight) return;
      await putRecord(STORES.bodyMetrics, { date: todayStr(), weight });
      close();
      document.dispatchEvent(new Event('lt:refresh-home'));
    });
  });
}

function openHobbyForm() {
  openModal(`
    <h3 class="section-title">Log hobby</h3>
    <div class="stack-sm">
      <label>Hobby<select id="hobby-name">${QUICK_HOBBIES.map((hobby) => `<option value="${hobby.name}">${hobby.name}</option>`).join('')}</select></label>
      <label>Minutes<input id="hobby-minutes" type="number" /></label>
      <label>Notes<input id="hobby-notes" /></label>
      <button class="btn btn--primary" id="hobby-save">Save</button>
    </div>
  `, (root, close) => {
    root.querySelector('#hobby-save').addEventListener('click', async () => {
      await logHobbySession({
        hobbyName: root.querySelector('#hobby-name').value,
        minutes: root.querySelector('#hobby-minutes').value,
        notes: root.querySelector('#hobby-notes').value,
      });
      close();
    });
  });
}

function openTodoForm(existingTodo = null) {
  openModal(`
    <h3 class="section-title">${existingTodo ? 'Edit todo' : 'Add todo'}</h3>
    <div class="stack-sm">
      <label>Task<input id="todo-text" placeholder="Finish pull day plan" value="${escapeHtml(existingTodo?.text || '')}" /></label>
      <label>Note<input id="todo-note" placeholder="Optional context" value="${escapeHtml(existingTodo?.note || '')}" /></label>
      <div class="grid-2">
        <label>Due date<input id="todo-due-date" type="date" value="${escapeHtml(existingTodo?.dueDate || '')}" /></label>
        <label>Priority
          <select id="todo-priority">
            <option value="low" ${existingTodo?.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${!existingTodo || existingTodo?.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${existingTodo?.priority === 'high' ? 'selected' : ''}>High</option>
          </select>
        </label>
      </div>
      <button class="btn btn--primary" id="todo-save">${existingTodo ? 'Save changes' : 'Save todo'}</button>
    </div>
  `, (root, close) => {
    root.querySelector('#todo-save').addEventListener('click', async () => {
      const text = root.querySelector('#todo-text').value.trim();
      const note = root.querySelector('#todo-note').value.trim();
      const dueDate = root.querySelector('#todo-due-date').value || null;
      const priority = root.querySelector('#todo-priority').value;
      if (!text) {
        toast('Add a task');
        return;
      }
      await addTodo({
        id: existingTodo?.id,
        text,
        note,
        dueDate,
        priority,
        completed: existingTodo?.completed || false,
        completedAt: existingTodo?.completedAt || null,
        xpAwarded: existingTodo?.xpAwarded || false,
        createdAt: existingTodo?.createdAt || Date.now(),
      });
      close();
    });
  });
}

function openNegativeHabitForm() {
  openModal(`
    <h3 class="section-title">Log bad habit</h3>
    <div class="stack-sm">
      <label>Slip-up
        <select id="negative-type">
          ${NEGATIVE_HABITS.map((habit) => `<option value="${habit.key}">${habit.label} · -${habit.penalty} XP</option>`).join('')}
        </select>
      </label>
      <label>Note<input id="negative-note" placeholder="Optional context" /></label>
      <button class="btn btn--danger" id="negative-save">Log penalty</button>
    </div>
  `, (root, close) => {
    root.querySelector('#negative-save').addEventListener('click', async () => {
      const selected = NEGATIVE_HABITS.find((habit) => habit.key === root.querySelector('#negative-type').value);
      if (!selected) return;
      await logNegativeHabit({
        key: selected.key,
        label: selected.label,
        penalty: selected.penalty,
        note: root.querySelector('#negative-note').value,
      });
      close();
    });
  });
}

async function openHabitManager() {
  const [profile, habits, todayLogs] = await Promise.all([getProfile(), getAllHabits(), getTodayHabitLogs()]);
  const aiSuggestions = await getAIHabitSuggestions(profile).catch(() => []);
  openModal(`
    <h3 class="section-title">Manage habits</h3>
    <div class="stack-md">
      <div class="stack-sm">
        ${(habits.length ? habits : PRESET_HABITS).map((habit) => {
          const isSaved = habits.some((saved) => saved.name === habit.name);
          const savedHabit = habits.find((saved) => saved.name === habit.name) || habit;
          const done = todayLogs.some((item) => item.habitId === savedHabit.id);
          return `<div class="list-row">
            <div><strong>${escapeHtml(savedHabit.name)}</strong><div class="meta-line">${escapeHtml(savedHabit.category || 'Habit')}</div></div>
            <div class="inline-actions">
              ${isSaved ? `<button class="badge" data-toggle-managed="${savedHabit.id}">${done ? 'Done' : 'Mark'}</button><button class="badge" data-remove-managed="${savedHabit.id}">Remove</button>` : `<button class="badge" data-add-managed="${escapeHtml(habit.name)}" data-icon="${escapeHtml(habit.icon)}" data-category="${escapeHtml(habit.category)}">Add</button>`}
            </div>
          </div>`;
        }).join('')}
      </div>
      ${aiSuggestions.length ? `<div class="stack-sm"><div class="meta-line">AI suggestions</div>${aiSuggestions.map((habit) => `<button class="list-row" data-add-managed="${escapeHtml(habit.name)}" data-icon="${escapeHtml(habit.icon || 'sparkles')}" data-category="${escapeHtml(habit.category)}"><div><strong>${escapeHtml(habit.name)}</strong><div class="meta-line">${escapeHtml(habit.category)}</div></div><span class="badge">Add</span></button>`).join('')}</div>` : ''}
    </div>
  `, (root, close) => {
    root.querySelectorAll('[data-add-managed]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
      await addHabit(buttonEl.dataset.addManaged, buttonEl.dataset.icon, buttonEl.dataset.category);
      close();
      renderCurrentView();
    }));
    root.querySelectorAll('[data-toggle-managed]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
      await toggleHabit(Number(buttonEl.dataset.toggleManaged));
      close();
      renderCurrentView();
    }));
    root.querySelectorAll('[data-remove-managed]').forEach((buttonEl) => buttonEl.addEventListener('click', async () => {
      await removeHabit(Number(buttonEl.dataset.removeManaged));
      close();
      renderCurrentView();
    }));
  });
}

async function refreshInsight() {
  const profile = await getProfile();
  if (!(await hasKey())) {
    toast('Add a Gemini key first');
    return;
  }
  const last7 = await lastNDayScores(7);
  if (last7.length < 3) {
    toast('Log a few more days first');
    return;
  }
  try {
    const result = await generateWeeklyInsight(last7, profile.rollingSummary, profile.goals);
    await saveProfile({
      insight: result.insight,
      rollingSummary: result.rollingSummary,
      lastInsightWeek: weekKey(),
    });
    renderCurrentView();
  } catch {
    toast('Insight generation failed');
  }
}

async function openNotificationsSheet() {
  const [profile, permission, schedules] = await Promise.all([getProfile(), getPermission(), getSchedules()]);
  openSheet(`
    <div class="stack-md">
      <h3 class="section-title">Notifications</h3>
      <div class="meta-line">Permission: ${permission}</div>
      <div class="button-row"><button class="btn btn--soft" id="enable-notifs">Enable</button></div>
      <label>Quiet start<input id="quiet-start" type="number" min="0" max="23" value="${profile.notifQuietHours.start}" /></label>
      <label>Quiet end<input id="quiet-end" type="number" min="0" max="23" value="${profile.notifQuietHours.end}" /></label>
      <div class="stack-sm">
        ${schedules.filter((item) => item.time).map((schedule) => `<div class="list-row"><div><strong>${escapeHtml(schedule.id)}</strong><div class="meta-line">${schedule.time}</div></div><input type="checkbox" data-schedule="${schedule.id}" ${schedule.enabled ? 'checked' : ''} /></div>`).join('')}
      </div>
    </div>
  `, (root, close) => {
    root.querySelector('#enable-notifs').addEventListener('click', async () => {
      await requestPermission();
      await runNotificationChecks();
      toast('Notifications updated');
    });
    root.querySelectorAll('[data-schedule]').forEach((input) => input.addEventListener('change', async () => {
      const schedule = schedules.find((item) => item.id === input.dataset.schedule);
      await upsertSchedule({ ...schedule, enabled: input.checked });
    }));
    ['quiet-start', 'quiet-end'].forEach((id) => {
      root.querySelector(`#${id}`).addEventListener('change', async () => {
        await saveProfile({
          notifQuietHours: {
            start: Number(root.querySelector('#quiet-start').value),
            end: Number(root.querySelector('#quiet-end').value),
          },
        });
      });
    });
  });
}

function openMenuSheet() {
  openSheet(`
    <div class="stack-md">
      <h3 class="section-title">LevelD</h3>
      <button class="btn btn--soft" id="menu-export">Export backup</button>
      <button class="btn btn--soft" id="menu-habits">Manage habits</button>
      <button class="btn btn--soft" id="menu-notifs">Notification settings</button>
    </div>
  `, (root, close) => {
    root.querySelector('#menu-export').addEventListener('click', async () => { await exportAll(); close(); });
    root.querySelector('#menu-habits').addEventListener('click', () => { close(); openHabitManager(); });
    root.querySelector('#menu-notifs').addEventListener('click', () => { close(); openNotificationsSheet(); });
  });
}

async function renderOnboarding() {
  const content = $('#app-content');
  content.innerHTML = `
    <section class="hero-card">
      <div class="hero-card__rank-label">Welcome</div>
      <div class="hero-card__next-rank">Build the version of life you want to keep.</div>
    </section>
    <section class="card stack-md">
      <label>Name<input id="onboard-name" placeholder="What should LevelD call you?" /></label>
      <label>Goal
        <select id="onboard-goal">
          <option value="lose">Lose weight</option>
          <option value="maintain">General health</option>
          <option value="gain">Build muscle</option>
          <option value="consistent">Stay consistent</option>
        </select>
      </label>
      <label>Diet preference<input id="onboard-diet" placeholder="Optional context for AI meal estimates" /></label>
      <label>Gemini API key<input id="onboard-key" type="password" placeholder="Optional for AI parsing and insights" /></label>
      <button class="btn btn--soft" id="onboard-habits">Pick habits</button>
      <div id="onboard-picked" class="meta-line">No habits selected yet.</div>
      <button class="btn btn--primary" id="finish-onboarding">Finish setup</button>
    </section>
  `;
  const selectedHabits = [];
  $('#onboard-habits').addEventListener('click', async () => {
    const profile = await getProfile();
    const suggestions = await getAIHabitSuggestions(profile).catch(() => PRESET_HABITS);
    openModal(`
      <h3 class="section-title">Pick 2 to 4 habits</h3>
      <div class="stack-sm">
        ${suggestions.map((habit, index) => `<label class="list-row"><span><strong>${escapeHtml(habit.name)}</strong><div class="meta-line">${escapeHtml(habit.category)}</div></span><input type="checkbox" data-onboard-habit="${index}" /></label>`).join('')}
        <button class="btn btn--primary" id="save-onboard-habits">Use selected</button>
      </div>
    `, (root, close) => {
      root.querySelector('#save-onboard-habits').addEventListener('click', () => {
        selectedHabits.length = 0;
        root.querySelectorAll('[data-onboard-habit]').forEach((input) => {
          if (input.checked) selectedHabits.push(suggestions[Number(input.dataset.onboardHabit)]);
        });
        close();
        $('#onboard-picked').textContent = selectedHabits.length
          ? selectedHabits.map((habit) => habit.name).join(', ')
          : 'No habits selected yet.';
      });
    });
  });
  $('#finish-onboarding').addEventListener('click', async () => {
    const presets = goalDefaults($('#onboard-goal').value);
    await saveProfile({
      name: $('#onboard-name').value.trim(),
      geminiApiKey: $('#onboard-key').value.trim(),
      dietPreference: $('#onboard-diet').value.trim(),
      calorieGoalPreset: $('#onboard-goal').value,
      goals: presets,
      onboardingComplete: true,
    });
    for (const habit of selectedHabits) {
      await addHabit(habit.name, habit.icon || 'sparkles', habit.category);
    }
    await afterReady();
  });
}

function goalDefaults(goal) {
  if (goal === 'lose') return { calories: 1900, protein: 140, water: 3000, workoutsPerWeek: 4, hobbyMinutes: 45 };
  if (goal === 'gain') return { calories: 2600, protein: 170, water: 3500, workoutsPerWeek: 4, hobbyMinutes: 45 };
  return { calories: 2200, protein: 150, water: 3000, workoutsPerWeek: 4, hobbyMinutes: 60 };
}

async function persistScoreForToday() {
  const score = await computeDailyScoreLocal();
  await persistDailyScore(score);
  await maybeUnlockConsistencyAchievement();
}

async function getAllTodos() {
  const todos = await getAll(STORES.todos);
  return todos
    .map((todo) => ({
      ...todo,
      priority: todo.priority || 'medium',
      priorityLabel: todo.priority ? todo.priority[0].toUpperCase() + todo.priority.slice(1) : 'Medium',
    }))
    .sort((a, b) => {
      if (Number(a.completed) !== Number(b.completed)) return Number(a.completed) - Number(b.completed);
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
      if ((a.dueDate || '') !== (b.dueDate || '')) {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

async function getOpenTodos() {
  return (await getAllTodos()).filter((todo) => !todo.completed);
}

async function addTodo(todo) {
  await putRecord(STORES.todos, {
    text: todo.text,
    note: todo.note || '',
    completed: Boolean(todo.completed),
    createdAt: todo.createdAt || Date.now(),
    completedAt: todo.completedAt || null,
    dueDate: todo.dueDate || null,
    priority: todo.priority || 'medium',
    xpAwarded: Boolean(todo.xpAwarded),
    ...(todo.id ? { id: todo.id } : {}),
  });
  toast(todo.id ? 'Todo updated' : 'Todo added');
  document.dispatchEvent(new Event('lt:refresh-home'));
}

async function toggleTodo(id) {
  const todos = await getAll(STORES.todos);
  const todo = todos.find((item) => item.id === id);
  if (!todo) return;
  const nextCompleted = !todo.completed;
  await putRecord(STORES.todos, {
    ...todo,
    completed: nextCompleted,
    completedAt: nextCompleted ? Date.now() : null,
    xpAwarded: nextCompleted ? true : todo.xpAwarded,
  });
  if (nextCompleted && !todo.xpAwarded) {
    const { awardXP } = await import('./gamification.js');
    await awardXP(todoXp(todo), 'Todo completed');
  }
  toast(todo.completed ? 'Todo reopened' : 'Todo completed');
  document.dispatchEvent(new Event('lt:refresh-home'));
}

function todoXp(todo) {
  const weights = { low: 4, medium: 6, high: 10 };
  return weights[todo.priority || 'medium'] || 6;
}

function todoMeta(todo) {
  const bits = [];
  bits.push(`${todo.priorityLabel || 'Medium'} priority`);
  if (todo.dueDate) bits.push(`due ${todo.dueDate}`);
  if (todo.note) bits.push(todo.note);
  if (todo.completed) bits.push('completed');
  return bits.join(' · ');
}

boot();
