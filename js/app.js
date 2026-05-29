import { openDB, getProfile, saveProfile, addRecord, putRecord, deleteRecord, getRecord, getByDate, getByDateRange, getAllRecords, todayStr } from './db.js';
import { awardXP, deductXP, checkStreakOnOpen, xpForLevel, xpProgress, rankFor, nextRankLevel, identityForStreak } from './gamification.js';
import { drawFarm, getFarmState } from './farm.js';
import { analyzeMeal, classifyAndExtract, getCravingConsequence, generateWeeklyVerdict, explainFarmDeath, suggestHabits, generateDailyQuestTasks } from './ai.js';
import { toggleHabit, getHabitStreak, logViolation, logCraving, computeDailyScore, applyTheme, initTheme, buildNotif, scheduleNotif } from './habits.js';

let _profile = null;
let _farmCanvas = null;
let _activeSheet = null;
let _charts = {};

async function init() {
  await openDB();
  _profile = await getProfile();
  initTheme(_profile);
  await checkStreakOnOpen();
  _profile = await getProfile();

  if (!_profile.onboardingComplete) {
    showOnboarding();
    return;
  }

  registerSW();
  renderApp();
  requestNotifPermission();

  document.addEventListener('selfos:refresh', onRefresh);
  document.addEventListener('selfos:violation', onViolation);
  document.addEventListener('selfos:achievement', onAchievement);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
}

async function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-header">
      <i class="ti ti-menu-2 hdr-icon" onclick="openSettings()" aria-label="Settings"></i>
      <span class="title">SELF OS</span>
      <i class="ti ti-bell hdr-icon" onclick="checkNotifs()" aria-label="Notifications"></i>
    </div>
    <div class="tab-content">
      <div class="tab-pane active" id="tab-farm"></div>
      <div class="tab-pane" id="tab-insights"></div>
      <div class="tab-pane" id="tab-quests"></div>
      <div class="tab-pane" id="tab-profile"></div>
    </div>
    <div class="tab-bar">
      <div class="tab-item active" data-tab="farm" onclick="switchTab('farm')">
        <i class="ti ti-plant-2" aria-hidden="true"></i><span>farm</span>
      </div>
      <div class="tab-item" data-tab="insights" onclick="switchTab('insights')">
        <i class="ti ti-chart-line" aria-hidden="true"></i><span>graphs</span>
      </div>
      <div class="tab-fab-slot">
        <div class="fab" onclick="openAddSheet()" aria-label="Add log">
          <i class="ti ti-plus" aria-hidden="true"></i>
        </div>
      </div>
      <div class="tab-item" data-tab="quests" onclick="switchTab('quests')">
        <i class="ti ti-target" aria-hidden="true"></i><span>quests</span>
      </div>
      <div class="tab-item" data-tab="profile" onclick="switchTab('profile')">
        <i class="ti ti-user" aria-hidden="true"></i><span>you</span>
      </div>
    </div>
    <div id="toast" class="toast"></div>
    <div id="sheet-backdrop" class="bottom-sheet-backdrop" onclick="closeSheet(event)">
      <div class="bottom-sheet" id="sheet-content"></div>
    </div>
    <div id="craving-screen" class="craving-screen"></div>
    <div id="workout-screen" class="workout-screen"></div>
    <div id="todo-screen" class="todo-screen"></div>
  `;

  renderFarmTab();
  renderInsightsTab();
  renderQuestsTab();
  renderProfileTab();
  window.switchTab = switchTab;
  window.openAddSheet = openAddSheet;
  window.closeSheet = closeSheet;
  window.openSettings = openSettings;
  window.checkNotifs = checkNotifs;
}

async function renderFarmTab() {
  const today = todayStr();
  const [meals, workouts, habitLogs, metrics, violations] = await Promise.all([
    getByDate('meals', today), getByDate('workouts', today),
    getByDate('habitLogs', today), getByDate('bodyMetrics', today),
    getByDate('violations', today)
  ]);

  const progress = xpProgress(_profile);
  const violationCount = _profile.violations?.week || 0;
  const organisms = Math.max(1, 6 - Math.floor((_profile.violations?.total || 0) / 3));
  const farmState = getFarmState(_profile, violations);

  const recentViolation = violations[violations.length - 1];
  const bannerHtml = recentViolation
    ? `<div class="violation-banner"><i class="ti ti-alert-triangle" aria-hidden="true"></i>${recentViolation.type.replace(/_/g,' ')}. −${recentViolation.xpPenalty} XP.</div>`
    : '';

  const identityColor = _profile.identity === 'Drifting' || violationCount >= 3 ? 'style="color:var(--danger)"' : '';
  const streakClass = _profile.streak === 0 ? 'dead' : '';
  const streakIcon = _profile.streak === 0 ? 'ti-flame-off' : 'ti-flame';

  document.getElementById('tab-farm').innerHTML = `
    ${bannerHtml}
    <div class="hero-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="hero-rank-label" ${identityColor}>${_profile.identity}</div>
          <div class="hero-rank">Level ${_profile.level} · ${rankFor(_profile.level)}</div>
        </div>
        <div class="hero-streak ${streakClass}">
          <i class="ti ${streakIcon}" aria-hidden="true"></i>
          <span>${_profile.streak}</span>
        </div>
      </div>
      <div class="xp-track"><div class="xp-fill" style="width:${progress.pct}%"></div></div>
      <div class="xp-meta"><span>${progress.current.toLocaleString()} XP</span><span>${(progress.needed - progress.current).toLocaleString()} to lv ${_profile.level + 1}</span></div>
    </div>

    <div class="farm-container">
      <canvas id="farm-canvas" width="390" height="220"></canvas>
      <div class="farm-season-badge">${farmState.season}</div>
    </div>

    <div style="padding:0 var(--space-4);margin-bottom:var(--space-3)">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">discipline</div>
          <div class="stat-val" style="color:var(--accent-light)">${farmState.discipline}</div>
          <div class="stat-delta ${violationCount >= 2 ? 'delta-down' : 'delta-up'}">${violationCount} violations</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">violations</div>
          <div class="stat-val" style="color:${violationCount >= 2 ? 'var(--danger)' : 'var(--success)'}">${violationCount}/3</div>
          <div class="stat-delta ${violationCount >= 2 ? 'delta-down' : 'delta-warn'}">${3 - violationCount} left</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">animals</div>
          <div class="stat-val" style="color:var(--warm-primary)">${organisms}</div>
          <div class="stat-delta delta-up">on farm</div>
        </div>
      </div>
    </div>

    ${workouts.length ? `
    <div class="card" style="margin-top:0">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-barbell" aria-hidden="true"></i>today's workout</span>
        <span class="card-meta">${workouts[0].duration || 0}min · ${(workouts[0].totalVolume || 0).toLocaleString()}kg vol</span>
      </div>
      ${(workouts[0].exercises || []).map(ex => `
        <div class="workout-summary-row">
          <span>${ex.name}</span>
          <span style="color:var(--text-tertiary);font-size:var(--text-xs)">${ex.sets.filter(s => s.done).length} sets · ${Math.max(...ex.sets.filter(s=>s.done&&s.weight).map(s=>parseFloat(s.weight)||0), 0)}kg top</span>
        </div>`).join('')}
    </div>` : ''}

    <div class="section-header">quick log</div>
    <div class="chip-row">
      <div class="chip meal" onclick="quickLog('meal')"><i class="ti ti-bowl" aria-hidden="true"></i>meal</div>
      <div class="chip workout" onclick="openWorkoutSession()"><i class="ti ti-barbell" aria-hidden="true"></i>workout</div>
      <div class="chip water" onclick="quickLog('water')"><i class="ti ti-droplet" aria-hidden="true"></i>water</div>
      <div class="chip weight" onclick="quickLog('weight')"><i class="ti ti-scale" aria-hidden="true"></i>weight</div>
      <div class="chip sleep" onclick="quickLog('sleep')"><i class="ti ti-moon" aria-hidden="true"></i>sleep</div>
      <div class="chip craving" onclick="openCravingScreen()"><i class="ti ti-alert-triangle" aria-hidden="true"></i>craving</div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-list-check" aria-hidden="true"></i>daily quests</span>
        <span class="card-meta" id="quest-count">loading...</span>
      </div>
      <div id="quest-list"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-repeat" aria-hidden="true"></i>habits today</span>
        <button onclick="openHabitManager()" style="background:none;border:none;color:var(--accent-light);font-size:var(--text-xs);cursor:pointer;font-family:var(--font-sans)">manage</button>
      </div>
      <div id="habit-list"></div>
    </div>

    <div class="card" onclick="openTodoScreen()" style="cursor:pointer">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-check" aria-hidden="true"></i>to-do</span>
        <span style="font-size:var(--text-xs);color:var(--accent-light)">view all <i class="ti ti-chevron-right" style="font-size:11px"></i></span>
      </div>
      <div id="todo-list"></div>
    </div>
  `;

  _farmCanvas = document.getElementById('farm-canvas');
  if (_farmCanvas) {
    _farmCanvas.width = _farmCanvas.offsetWidth * devicePixelRatio;
    _farmCanvas.height = 220 * devicePixelRatio;
    _farmCanvas.style.height = '220px';
    drawFarm(_farmCanvas, farmState);
    _farmCanvas.addEventListener('click', onFarmTap);
  }

  await renderDailyQuests(meals, workouts, habitLogs, metrics);
  await renderHabits(habitLogs);
  await renderTodos();
  window.quickLog = quickLog;
  window.openCravingScreen = openCravingScreen;
  window.openHabitManager = openHabitManager;
  window.openTodoSheet = openTodoSheet;
  window.openWorkoutSession = openWorkoutSession;
  window.openTodoScreen = openTodoScreen;
}

async function renderDailyQuests(meals, workouts, habitLogs, metrics) {
  const allQuests = await getAllRecords('quests');
  const activeQuest = allQuests.find(q => q.status === 'active');

  if (activeQuest) {
    await renderQuestTasks(activeQuest);
    return;
  }

  const goals = _profile.goals;
  const totalProt = meals.reduce((s, m) => s + (m.nutrition?.protein || 0), 0);
  const items = [
    { label: 'Log 3 meals', done: meals.length >= 3, active: meals.length > 0 && meals.length < 3, xp: 10 },
    { label: 'Complete a workout', done: workouts.length > 0, active: false, xp: 30 },
    { label: `Protein goal (${Math.round(totalProt)}/${goals.protein}g)`, done: totalProt >= goals.protein, active: totalProt > 0 && totalProt < goals.protein, xp: 25 },
    { label: 'Log weight', done: metrics.length > 0, active: false, xp: 5 },
    { label: `3 habits (${Math.min(habitLogs.length, 3)}/3)`, done: habitLogs.length >= 3, active: habitLogs.length > 0 && habitLogs.length < 3, xp: 20 },
  ];

  const doneCount = items.filter(q => q.done).length;
  document.getElementById('quest-count').textContent = `${doneCount}/${items.length}`;
  document.getElementById('quest-list').innerHTML = items.map(q => `
    <div class="checklist-item">
      <div class="check-box ${q.done ? 'done' : q.active ? 'active-item' : 'pending'}">
        ${q.done ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}
      </div>
      <span class="check-label ${q.done ? 'done-text' : ''}">${q.label}</span>
      <span class="check-xp ${q.active ? 'active-xp' : ''}">+${q.xp}</span>
    </div>
  `).join('');
}

function staticQuestTasks(quest, dayNumber) {
  const diff = dayNumber < 7 ? 0 : dayNumber < 21 ? 1 : 2;
  const sets = {
    shred: [
      [
        { label: `Stay under ${quest.targets.calorieMax || 1800} calories`, category: 'nutrition', xp: 20, icon: 'ti-flame' },
        { label: `Hit ${quest.targets.protein || 180}g protein`, category: 'nutrition', xp: 20, icon: 'ti-egg' },
        { label: 'Complete a workout', category: 'fitness', xp: 30, icon: 'ti-barbell' },
        { label: 'No food after 9pm', category: 'discipline', xp: 15, icon: 'ti-clock' },
        { label: 'Log all 3 meals', category: 'nutrition', xp: 10, icon: 'ti-bowl' },
      ],
      [
        { label: `Stay under ${quest.targets.calorieMax || 1800} calories`, category: 'nutrition', xp: 20, icon: 'ti-flame' },
        { label: `Hit ${quest.targets.protein || 180}g protein`, category: 'nutrition', xp: 20, icon: 'ti-egg' },
        { label: 'Complete a workout + 20min cardio', category: 'fitness', xp: 35, icon: 'ti-run' },
        { label: 'No snacks after 8pm', category: 'discipline', xp: 20, icon: 'ti-clock' },
        { label: 'Drink 3L water', category: 'nutrition', xp: 15, icon: 'ti-droplet' },
      ],
      [
        { label: `Stay under ${Math.round((quest.targets.calorieMax || 1800) * 0.95)} calories`, category: 'nutrition', xp: 25, icon: 'ti-flame' },
        { label: `Hit ${quest.targets.protein || 180}g protein`, category: 'nutrition', xp: 20, icon: 'ti-egg' },
        { label: 'Complete a workout + 30min cardio', category: 'fitness', xp: 35, icon: 'ti-run' },
        { label: 'No food after 8pm', category: 'discipline', xp: 25, icon: 'ti-clock' },
        { label: 'Log weight', category: 'recovery', xp: 10, icon: 'ti-scale' },
      ],
    ],
    bulk: [
      [
        { label: `Hit ${quest.targets.calorieMin || 2800}+ calories`, category: 'nutrition', xp: 20, icon: 'ti-flame' },
        { label: `Hit ${quest.targets.protein || 200}g protein`, category: 'nutrition', xp: 20, icon: 'ti-egg' },
        { label: 'Complete a compound lift', category: 'fitness', xp: 30, icon: 'ti-barbell' },
        { label: 'Eat 4+ meals today', category: 'nutrition', xp: 15, icon: 'ti-bowl' },
        { label: 'Log weight', category: 'recovery', xp: 10, icon: 'ti-scale' },
      ],
      [
        { label: `Hit ${quest.targets.calorieMin || 2800}+ calories`, category: 'nutrition', xp: 20, icon: 'ti-flame' },
        { label: `Hit ${quest.targets.protein || 200}g protein`, category: 'nutrition', xp: 20, icon: 'ti-egg' },
        { label: 'Hit a PR on any lift', category: 'fitness', xp: 35, icon: 'ti-barbell' },
        { label: 'Eat within 30min of waking', category: 'discipline', xp: 15, icon: 'ti-clock' },
        { label: 'Log weight', category: 'recovery', xp: 10, icon: 'ti-scale' },
      ],
      [
        { label: `Hit ${quest.targets.calorieMin || 2800}+ calories`, category: 'nutrition', xp: 20, icon: 'ti-flame' },
        { label: `Hit ${Math.round((quest.targets.protein || 200) * 1.05)}g protein`, category: 'nutrition', xp: 25, icon: 'ti-egg' },
        { label: 'Complete workout + progressive overload', category: 'fitness', xp: 35, icon: 'ti-barbell' },
        { label: 'Sleep 8+ hours', category: 'recovery', xp: 20, icon: 'ti-moon' },
        { label: 'Log weight', category: 'recovery', xp: 10, icon: 'ti-scale' },
      ],
    ],
    maintenance: [
      [
        { label: `Stay within 200 calories of goal (${_profile.goals.calories})`, category: 'nutrition', xp: 20, icon: 'ti-flame' },
        { label: 'Complete a workout', category: 'fitness', xp: 25, icon: 'ti-barbell' },
        { label: 'Drink 3L water', category: 'nutrition', xp: 15, icon: 'ti-droplet' },
        { label: 'Log weight', category: 'recovery', xp: 10, icon: 'ti-scale' },
        { label: 'Log all meals', category: 'nutrition', xp: 10, icon: 'ti-bowl' },
      ],
    ],
    'streak-warrior': [
      [
        { label: 'Complete all 3 habits', category: 'discipline', xp: 30, icon: 'ti-repeat' },
        { label: 'Log weight', category: 'recovery', xp: 10, icon: 'ti-scale' },
        { label: 'Log all meals', category: 'nutrition', xp: 15, icon: 'ti-bowl' },
        { label: 'Sleep before midnight', category: 'recovery', xp: 20, icon: 'ti-moon' },
        { label: 'Complete a workout', category: 'fitness', xp: 25, icon: 'ti-barbell' },
      ],
    ],
  };
  const pool = sets[quest.type] || sets.shred;
  const tasks = pool[Math.min(diff, pool.length - 1)];
  return tasks.map((t, i) => ({ ...t, id: i, done: false }));
}

async function renderQuestTasks(quest) {
  const today = todayStr();
  const countEl = document.getElementById('quest-count');
  const listEl = document.getElementById('quest-list');
  if (!countEl || !listEl) return;

  countEl.textContent = '...';
  listEl.innerHTML = `<div style="text-align:center;padding:var(--space-3);color:var(--text-tertiary);font-size:var(--text-sm)"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> generating tasks...</div>`;

  let record = await getRecord('questTasks', today);

  if (!record || record.questId !== quest.id) {
    const dayNumber = Math.max(1, Math.ceil((new Date() - new Date(quest.startDate)) / 86400000));
    let tasks = null;
    if (_profile.gptApiKey) {
      try { tasks = await generateDailyQuestTasks(quest, _profile, dayNumber); } catch { tasks = null; }
    }
    if (!tasks?.length) tasks = staticQuestTasks(quest, dayNumber);
    record = { date: today, questId: quest.id, questType: quest.type, tasks, generatedAt: new Date().toISOString() };
    await putRecord('questTasks', record);
  }

  const tasks = record.tasks;
  const doneCount = tasks.filter(t => t.done).length;
  countEl.textContent = `${doneCount}/${tasks.length}`;

  listEl.innerHTML = tasks.map((t, i) => `
    <div class="checklist-item">
      <div class="check-box ${t.done ? 'done' : 'pending'}" onclick="toggleQuestTask(${i})" style="cursor:${t.done ? 'default' : 'pointer'}">
        ${t.done ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}
      </div>
      <div style="flex:1">
        <span class="check-label ${t.done ? 'done-text' : ''}">${t.label}</span>
        <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:1px">${t.category}</div>
      </div>
      <span class="check-xp ${t.done ? '' : 'active-xp'}">+${t.xp}</span>
    </div>
  `).join('');

  window.toggleQuestTask = async (index) => {
    const rec = await getRecord('questTasks', today);
    if (!rec || rec.tasks[index].done) return;
    rec.tasks[index].done = true;
    await putRecord('questTasks', rec);
    const xp = await awardXP(rec.tasks[index].xp, 'quest_task');
    _profile = await getProfile();
    showXpPopup(`+${xp}`);
    const allDone = rec.tasks.every(t => t.done);
    if (allDone) {
      const bonus = await awardXP(50, 'quest_day_complete');
      showToast(`all tasks done · +${bonus} bonus XP`, 'xp', 3500);
    } else {
      showToast(`${rec.tasks[index].label} · +${xp} XP`, 'xp');
    }
    await renderQuestTasks(quest);
  };
}

async function renderHabits(habitLogs) {
  const habits = await getAllRecords('habits');
  if (!habits.length) {
    document.getElementById('habit-list').innerHTML = '<div class="empty-state">No habits yet. Tap manage to add some.</div>';
    return;
  }
  const todayLogIds = new Set(habitLogs.map(l => l.habitId));
  const items = await Promise.all(habits.map(async h => {
    const streak = await getHabitStreak(h.id);
    const done = todayLogIds.has(h.id);
    return `
      <div class="checklist-item">
        <div class="check-box ${done ? 'done' : 'pending'}" onclick="tapHabit(${h.id})" style="cursor:pointer">
          ${done ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}
        </div>
        <span class="check-label ${done ? 'done-text' : ''}">${h.name}</span>
        <span class="check-xp">${streak}d</span>
      </div>
    `;
  }));
  document.getElementById('habit-list').innerHTML = items.join('');
  window.tapHabit = async (id) => {
    const result = await toggleHabit(id);
    if (result.xp) showXpPopup(`+${result.xp}`);
    _profile = await getProfile();
    const logs = await getByDate('habitLogs', todayStr());
    await renderHabits(logs);
  };
}

async function renderTodos() {
  const todos = await getAllRecords('todos');
  const today = todayStr();
  const visible = todos.filter(t => !t.completed || t.completedAt?.slice(0, 10) === today).slice(0, 5);
  if (!visible.length) {
    document.getElementById('todo-list').innerHTML = '<div class="empty-state">No todos. Add something to track.</div>';
    return;
  }
  document.getElementById('todo-list').innerHTML = visible.map(t => `
    <div class="checklist-item">
      <div class="check-box ${t.completed ? 'done' : 'pending'}" onclick="toggleTodo(${t.id})" style="cursor:pointer">
        ${t.completed ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}
      </div>
      <span class="check-label ${t.completed ? 'done-text' : ''}">${t.text}</span>
      ${t.dueDate ? `<i class="ti ti-clock" style="font-size:12px;color:var(--warning)" aria-hidden="true"></i>` : ''}
    </div>
  `).join('');
  window.toggleTodo = async (id) => {
    const all = await getAllRecords('todos');
    const todo = all.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date().toISOString() : null;
    await putRecord('todos', todo);
    await renderTodos();
  };
}

async function renderInsightsTab() {
  const end = todayStr();
  const startD = new Date(); startD.setDate(startD.getDate() - 30);
  const start = `${startD.getFullYear()}-${String(startD.getMonth()+1).padStart(2,'0')}-${String(startD.getDate()).padStart(2,'0')}`;
  const scores = await getByDateRange('dailyScores', start, end);
  const habits = await getAllRecords('habits');
  const habitLogs = await getAllRecords('habitLogs');

  document.getElementById('tab-insights').innerHTML = `
    <div style="padding:var(--space-4) var(--space-4) var(--space-2)">
      <div style="display:flex;gap:4px;background:var(--bg-input);border-radius:10px;padding:3px">
        ${['7D','30D','90D'].map((r,i) => `<div style="flex:1;text-align:center;font-size:var(--text-sm);padding:6px 0;${i===0?'background:var(--bg-surface);border-radius:8px;font-weight:500':'color:var(--text-secondary)'};cursor:pointer" onclick="setRange('${r}')">${r}</div>`).join('')}
      </div>
    </div>

    ${_profile.insight ? `
    <div class="card" style="background:rgba(107,117,168,0.12);border-color:var(--accent-mid)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <i class="ti ti-sparkles" style="font-size:14px;color:var(--accent-light)" aria-hidden="true"></i>
        <span style="font-size:var(--text-xs);font-weight:500;color:var(--accent-light);text-transform:uppercase;letter-spacing:var(--tracking-wider)">weekly verdict</span>
        <span class="pill ${_profile.insight.verdict === 'LOCKED IN' ? 'success' : _profile.insight.verdict === 'SLIPPING' ? 'danger' : 'warning'}">${_profile.insight.verdict}</span>
      </div>
      <div style="font-size:var(--text-md);color:var(--text-secondary);line-height:var(--leading-normal)">${_profile.insight.sentence || ''}</div>
    </div>` : `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="card-title"><i class="ti ti-sparkles" aria-hidden="true"></i>weekly verdict</span>
        <button onclick="generateVerdict()" style="background:var(--accent-pale);border:0.5px solid var(--accent-mid);border-radius:var(--radius-md);padding:4px 10px;font-size:var(--text-xs);color:var(--accent-light);cursor:pointer;font-family:var(--font-sans)">generate</button>
      </div>
    </div>`}

    <div class="card">
      <div class="card-title"><i class="ti ti-chart-line" aria-hidden="true"></i>daily scores</div>
      <div class="chart-wrap" style="height:140px">
        <canvas id="scores-chart"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="ti ti-calendar" aria-hidden="true"></i>habit heatmap</div>
      <div id="heatmap-grid"></div>
    </div>

    <div class="card">
      <div class="card-title"><i class="ti ti-weight" aria-hidden="true"></i>weight trend</div>
      <div class="chart-wrap" style="height:120px">
        <canvas id="weight-chart"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><i class="ti ti-barbell" aria-hidden="true"></i>macro split — 7 days</div>
      <div class="chart-wrap" style="height:120px">
        <canvas id="macro-chart"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-history" aria-hidden="true"></i>recent workouts</span>
        <button onclick="openWorkoutSession()" style="background:var(--accent-pale);border:0.5px solid var(--accent-mid);border-radius:var(--radius-md);padding:4px 10px;font-size:var(--text-xs);color:var(--accent-light);cursor:pointer;font-family:var(--font-sans)">+ new</button>
      </div>
      <div id="workout-history-list"><div style="color:var(--text-tertiary);font-size:var(--text-sm)">loading...</div></div>
    </div>
  `;

  renderHeatmap(habits, habitLogs);
  renderWorkoutHistory();
  setTimeout(() => {
    renderScoresChart(scores);
    renderWeightChart();
    renderMacroChart();
  }, 100);

  window.setRange = setRange;
  window.generateVerdict = generateVerdict;
}

function renderHeatmap(habits, habitLogs) {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  const today = todayStr();
  const days = [];
  for (let i = 55; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const count = habitLogs.filter(l => l.date === ds).length;
    const total = habits.length || 1;
    const ratio = count / total;
    const level = ratio === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : ratio < 1 ? 4 : 5;
    days.push({ ds, level, isToday: ds === today, isFuture: ds > today });
  }
  grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-top:8px">` +
    days.map(d => `<div class="hm-cell h${d.level} ${d.isToday ? 'today-cell' : ''} ${d.isFuture ? 'future-cell' : ''}" title="${d.ds}"></div>`).join('') +
    `</div>`;
}

function renderScoresChart(scores) {
  const canvas = document.getElementById('scores-chart');
  if (!canvas || !window.Chart) return;
  if (_charts.scores) { _charts.scores.destroy(); _charts.scores = null; }
  const labels = scores.map(s => s.date.slice(5));
  _charts.scores = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'activity', data: scores.map(s => s.activityScore || 0), borderColor: '#6b9b6e', tension: 0.3, pointRadius: 3, fill: false },
        { label: 'output', data: scores.map(s => s.outputScore || 0), borderColor: '#d4a574', tension: 0.3, pointRadius: 3, fill: false },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#8a92ac', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#8a92ac', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { min: 0, max: 100, ticks: { color: '#8a92ac', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
}

async function renderWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas || !window.Chart) return;
  if (_charts.weight) { _charts.weight.destroy(); _charts.weight = null; }
  const end = todayStr();
  const startD = new Date(); startD.setDate(startD.getDate() - 30);
  const start = `${startD.getFullYear()}-${String(startD.getMonth()+1).padStart(2,'0')}-${String(startD.getDate()).padStart(2,'0')}`;
  const metrics = await getByDateRange('bodyMetrics', start, end);
  if (!metrics.length) return;
  _charts.weight = new window.Chart(canvas, {
    type: 'line',
    data: { labels: metrics.map(m => m.date.slice(5)), datasets: [{ data: metrics.map(m => m.weight), borderColor: '#8a95c2', tension: 0.3, pointRadius: 3, fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8a92ac', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#8a92ac', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
}

async function renderMacroChart() {
  const canvas = document.getElementById('macro-chart');
  if (!canvas || !window.Chart) return;
  if (_charts.macro) { _charts.macro.destroy(); _charts.macro = null; }
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const meals = await getByDate('meals', ds);
    days.push({ label: ds.slice(5), protein: meals.reduce((s, m) => s + (m.nutrition?.protein || 0), 0), carbs: meals.reduce((s, m) => s + (m.nutrition?.carbs || 0), 0), fat: meals.reduce((s, m) => s + (m.nutrition?.fat || 0), 0) });
  }
  _charts.macro = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: days.map(d => d.label),
      datasets: [
        { label: 'protein', data: days.map(d => Math.round(d.protein)), backgroundColor: '#5a9168', stack: 'macros' },
        { label: 'carbs', data: days.map(d => Math.round(d.carbs)), backgroundColor: '#d4a574', stack: 'macros' },
        { label: 'fat', data: days.map(d => Math.round(d.fat)), backgroundColor: '#c97a6a', stack: 'macros' },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#8a92ac', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#8a92ac', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#8a92ac', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
}

async function renderQuestsTab() {
  const quests = await getAllRecords('quests');
  const activeQuest = quests.find(q => q.status === 'active');
  document.getElementById('tab-quests').innerHTML = `
    ${activeQuest ? renderQuestCard(activeQuest) : `
    <div class="card" style="margin-top:var(--space-4)">
      <div class="card-title"><i class="ti ti-target" aria-hidden="true"></i>no active quest</div>
      <div style="font-size:var(--text-md);color:var(--text-secondary);margin-bottom:var(--space-4)">Start a quest to unlock focused consequence tracking.</div>
      <button class="btn-primary" onclick="openQuestSelector()">start a quest</button>
    </div>`}
    <div class="section-header">past quests</div>
    ${quests.filter(q => q.status !== 'active').length ? quests.filter(q => q.status !== 'active').map(q => renderQuestCard(q, true)).join('') : '<div class="empty-state">Complete quests to see history here.</div>'}
  `;
  window.openQuestSelector = openQuestSelector;
}

function renderQuestCard(quest, compact = false) {
  const daysTotal = Math.ceil((new Date(quest.endDate) - new Date(quest.startDate)) / 86400000);
  const daysDone = Math.ceil((new Date() - new Date(quest.startDate)) / 86400000);
  const pct = Math.min(100, Math.round((daysDone / daysTotal) * 100));
  const statusColor = quest.status === 'completed' ? 'var(--success)' : quest.status === 'failed' ? 'var(--danger)' : 'var(--accent-light)';
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-target" aria-hidden="true"></i>${quest.type}</span>
        <span class="pill ${quest.status === 'completed' ? 'success' : quest.status === 'failed' ? 'danger' : 'info'}">${quest.status}</span>
      </div>
      <div class="quest-strip">
        ${Array.from({length: 7}, (_, i) => `<div class="quest-day ${i < Math.floor(daysDone/daysTotal*7) ? 'complete' : i === Math.floor(daysDone/daysTotal*7) ? 'today-day' : ''}"></div>`).join('')}
      </div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary)">Day ${daysDone} of ${daysTotal} · ${quest.rewardXP} XP reward</div>
      ${!compact ? `<div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:6px;line-height:var(--leading-normal)">${Object.entries(quest.targets||{}).map(([k,v]) => `${k}: ${v}`).join(' · ')}</div>` : ''}
    </div>
  `;
}

async function renderProfileTab() {
  document.getElementById('tab-profile').innerHTML = `
    <div style="padding:var(--space-5) var(--space-4) var(--space-4)">
      <div style="font-size:var(--text-xl);font-weight:var(--weight-medium);margin-bottom:4px">${_profile.name || 'Set your name'}</div>
      <div style="font-size:var(--text-md);color:var(--text-secondary)">${_profile.identity} · ${rankFor(_profile.level)}</div>
    </div>

    <div class="card">
      <div class="card-title"><i class="ti ti-trophy" aria-hidden="true"></i>achievements</div>
      ${_profile.achievements.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${_profile.achievements.map(a => `<span class="pill info">${a.replace(/_/g,' ')}</span>`).join('')}</div>`
        : '<div class="empty-state">No achievements yet. Keep going.</div>'}
    </div>

    <div style="border-top:0.5px solid var(--border-subtle);margin:var(--space-2) 0">
      <div class="settings-row">
        <div><div class="settings-label">OpenAI API key</div><div class="settings-hint">For meal parsing, AI verdicts, quest tasks, photo analysis</div></div>
        <button onclick="editKey('gpt')" style="background:var(--accent-pale);border:0.5px solid var(--accent-mid);border-radius:var(--radius-md);padding:4px 10px;font-size:var(--text-xs);color:var(--accent-light);cursor:pointer;font-family:var(--font-sans)">${_profile.gptApiKey ? 'change' : 'add'}</button>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">theme</div></div>
        <select onchange="setTheme(this.value)" style="width:auto;padding:4px 8px">
          <option value="dark" ${_profile.theme==='dark'?'selected':''}>dark</option>
          <option value="light" ${_profile.theme==='light'?'selected':''}>light</option>
          <option value="system" ${_profile.theme==='system'?'selected':''}>system</option>
        </select>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">calorie goal</div></div>
        <input type="number" value="${_profile.goals.calories}" style="width:80px;text-align:right" onchange="updateGoal('calories', this.value)">
      </div>
      <div class="settings-row">
        <div><div class="settings-label">protein goal (g)</div></div>
        <input type="number" value="${_profile.goals.protein}" style="width:80px;text-align:right" onchange="updateGoal('protein', this.value)">
      </div>
      <div class="settings-row">
        <div><div class="settings-label">target bedtime</div></div>
        <input type="time" value="${_profile.goals.bedtime}" style="width:100px" onchange="updateGoal('bedtime', this.value)">
      </div>
    </div>

    <div style="padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-2)">
      <button class="btn-secondary" onclick="exportData()">export data</button>
      <button class="btn-danger" onclick="confirmReset()">reset everything</button>
    </div>
  `;

  window.editKey = editKey;
  window.setTheme = setTheme;
  window.updateGoal = updateGoal;
  window.exportData = exportData;
  window.confirmReset = confirmReset;
}

function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  if (tab === 'insights') { renderInsightsTab(); }
  if (tab === 'quests') renderQuestsTab();
  if (tab === 'profile') renderProfileTab();
}

function openSheet(html) {
  const backdrop = document.getElementById('sheet-backdrop');
  const content = document.getElementById('sheet-content');
  content.innerHTML = `<div class="sheet-handle"></div>${html}`;
  backdrop.classList.add('open');
  _activeSheet = backdrop;
}

function closeSheet(e) {
  if (!e || e.target === document.getElementById('sheet-backdrop')) {
    document.getElementById('sheet-backdrop')?.classList.remove('open');
  }
}

function showToast(msg, type = '', duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), duration);
}

function showXpPopup(text) {
  const el = document.createElement('div');
  el.className = 'xp-popup';
  el.textContent = text;
  el.style.left = `${window.innerWidth / 2 - 20}px`;
  el.style.bottom = `${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tab-bar-height')) + 80}px`;
  document.getElementById('app').appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function openAddSheet() {
  openSheet(`
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span class="sheet-title">add anything</span>
      <i class="ti ti-x" style="font-size:20px;color:var(--text-secondary);cursor:pointer" onclick="closeSheet({})" aria-label="Close"></i>
    </div>
    <div id="template-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div>
    <textarea id="add-input" placeholder="3x10 squats at 70kg... or dal + 2 roti... or 500ml water..." style="min-height:90px"></textarea>
    <div style="display:flex;gap:8px;align-items:center">
      <label for="photo-input" style="background:var(--bg-input);border:0.5px solid var(--border-default);border-radius:var(--radius-md);padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:var(--text-md);color:var(--text-secondary)">
        <i class="ti ti-camera" aria-hidden="true"></i>photo
      </label>
      <input type="file" id="photo-input" accept="image/*" style="display:none" onchange="photoSelected(this)">
      <button class="btn-primary" style="flex:1" onclick="submitLog()">log it</button>
    </div>
    <div style="font-size:var(--text-xs);color:var(--text-tertiary);display:flex;align-items:center;gap:6px">
      <i class="ti ti-sparkles" aria-hidden="true"></i>AI routes meals, workouts, water, anything
    </div>
  `);
  loadTemplateChips();
  window.submitLog = submitLog;
  window.photoSelected = photoSelected;
}

async function loadTemplateChips() {
  const templates = await getAllRecords('mealTemplates');
  const top5 = templates.sort((a, b) => b.useCount - a.useCount).slice(0, 5);
  const container = document.getElementById('template-chips');
  if (container && top5.length) {
    container.innerHTML = `<div style="font-size:var(--text-xs);color:var(--text-tertiary);width:100%;margin-bottom:2px">recent</div>` +
      top5.map(t => `<div style="background:var(--bg-input);border-radius:var(--radius-md);padding:5px 10px;font-size:var(--text-sm);cursor:pointer;border:0.5px solid var(--border-default)" onclick="useTemplate(${t.id})">${t.description}</div>`).join('');
    window.useTemplate = async (id) => {
      const all = await getAllRecords('mealTemplates');
      const t = all.find(x => x.id === id);
      if (!t) return;
      await saveMeal({ ...t, source: 'template' });
      closeSheet({});
      showToast(`+8 XP — ${t.description}`, 'xp');
    };
  }
}

let _pendingPhoto = null;
function photoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { _pendingPhoto = e.target.result.split(',')[1]; };
  reader.readAsDataURL(file);
}

async function submitLog() {
  const text = document.getElementById('add-input')?.value?.trim();
  if (!text && !_pendingPhoto) return;

  showToast('classifying...', '', 10000);
  try {
    const classified = await classifyAndExtract(text || 'photo meal', _pendingPhoto);
    closeSheet({});
    if (!classified) { showToast('could not classify — try again', 'danger'); return; }

    if (classified.type === 'meal') {
      await handleMealLog(text || 'photo meal', _pendingPhoto);
    } else if (classified.type === 'workout') {
      await saveWorkout(classified.data);
    } else if (classified.type === 'water') {
      await saveWater(classified.data.ml || 250);
    } else if (classified.type === 'weight') {
      await saveWeight(classified.data.kg);
    } else if (classified.type === 'sleep') {
      await saveSleep(classified.data);
    } else {
      showToast(`logged as ${classified.type}`, 'xp');
    }
  } catch (e) {
    showToast('AI error — logged manually', 'danger');
  }
  _pendingPhoto = null;
}

async function handleMealLog(description, imageBase64) {
  showToast('analysing macros...', '', 15000);
  const result = await analyzeMeal(description, imageBase64);
  if (!result) {
    showToast('could not analyse — add manually', 'danger');
    return;
  }

  openSheet(`
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span class="sheet-title">confirm meal</span>
      <i class="ti ti-x" style="font-size:20px;color:var(--text-secondary);cursor:pointer" onclick="closeSheet({})" aria-label="Close"></i>
    </div>
    <div style="font-size:var(--text-md);color:var(--text-primary);padding:8px 0">${result.description || description}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="stat-card"><div class="stat-label">calories</div><div class="stat-val">${result.nutrition?.calories || 0}</div></div>
      <div class="stat-card"><div class="stat-label">protein</div><div class="stat-val">${result.nutrition?.protein || 0}g</div></div>
      <div class="stat-card"><div class="stat-label">carbs</div><div class="stat-val">${result.nutrition?.carbs || 0}g</div></div>
      <div class="stat-card"><div class="stat-label">fat</div><div class="stat-val">${result.nutrition?.fat || 0}g</div></div>
    </div>

    <div>
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:6px">AI confidence</div>
      ${['calories','protein','carbs','fat'].map(m => {
        const conf = result.confidence?.[m] || 0.6;
        const level = conf >= 0.75 ? 'high' : conf >= 0.55 ? 'medium' : 'low';
        return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--text-secondary);margin-bottom:2px"><span>${m}</span><span>${level} · ±${result.errorMargin?.[m] || '?'}</span></div><div class="conf-bar"><div class="conf-fill conf-${level}" style="width:${Math.round(conf*100)}%"></div></div></div>`;
      }).join('')}
      ${result.confidence?.reasoning ? `<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:6px 0">${result.confidence.reasoning}</div>` : ''}
    </div>

    <div style="display:flex;gap:8px">
      <button class="btn-primary" style="flex:1" onclick="confirmMeal(${JSON.stringify(result).replace(/"/g,'&quot;')})">save +8 XP</button>
      <button class="btn-secondary" onclick="closeSheet({})">discard</button>
    </div>
  `);

  window.confirmMeal = async (r) => {
    await saveMeal(r);
    closeSheet({});
    const xp = await awardXP(8, 'meal_logged');
    showXpPopup(`+${xp}`);
    showToast('meal saved', 'xp');
    onRefresh();
  };
}

async function saveMeal(data) {
  const today = todayStr();
  const hour = new Date().getHours();
  const mealType = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner';
  await addRecord('meals', { ...data, date: today, mealType, loggedAt: new Date().toISOString(), descriptionLower: (data.description || '').toLowerCase() });

  if (hour >= 22 || hour < 4) {
    await logViolation('late_night_eating', data.description);
    showToast('late night eating → violation logged', 'danger', 4000);
  }
}

async function saveWorkout(data) {
  const today = todayStr();
  await addRecord('workouts', { ...data, date: today, loggedAt: new Date().toISOString() });
  const xp = await awardXP(25, 'workout_logged');
  showXpPopup(`+${xp}`);
  showToast('workout saved', 'xp');
  onRefresh();
}

async function saveWater(ml) {
  const today = todayStr();
  const existing = await getByDate('water', today);
  if (existing.length) {
    const rec = existing[0];
    rec.ml = (rec.ml || 0) + ml;
    rec.entries = [...(rec.entries || []), { time: new Date().toTimeString().slice(0, 5), ml }];
    await putRecord('water', rec);
  } else {
    await addRecord('water', { date: today, ml, entries: [{ time: new Date().toTimeString().slice(0, 5), ml }] });
  }
  const xp = await awardXP(2, 'water_logged');
  showToast(`+${ml}ml water · +${xp} XP`, 'xp');
  onRefresh();
}

async function saveWeight(kg) {
  if (!kg) return;
  const today = todayStr();
  await putRecord('bodyMetrics', { date: today, weight: parseFloat(kg), loggedAt: new Date().toISOString() });
  const xp = await awardXP(5, 'weight_logged');
  showXpPopup(`+${xp}`);
  showToast('weight logged', 'xp');
  onRefresh();
}

async function saveSleep(data) {
  const today = todayStr();
  await addRecord('hobbies', { date: today, type: 'sleep', ...data, loggedAt: new Date().toISOString() });
  if (data.hours && data.hours < _profile.goals.sleepHours - 1) {
    await logViolation('sleep_miss', `only ${data.hours}h sleep`);
    showToast(`sleep violation — got ${data.hours}h, need ${_profile.goals.sleepHours}h`, 'danger', 4000);
  } else {
    const xp = await awardXP(5, 'sleep_logged');
    showToast('sleep logged', 'xp');
  }
  onRefresh();
}

function quickLog(type) {
  const prompts = { meal: 'What did you eat?', workout: 'What workout? e.g. 3x10 squats 70kg', water: 'How much water? e.g. 500ml', weight: 'Current weight in kg', sleep: 'Hours slept and bedtime/wake e.g. 7.5h 11pm-6:30am' };
  openSheet(`
    <span class="sheet-title">${prompts[type]}</span>
    <textarea id="quick-input" placeholder="${prompts[type]}" style="min-height:70px"></textarea>
    ${type === 'meal' ? `<label for="quick-photo" style="display:flex;align-items:center;gap:6px;font-size:var(--text-md);color:var(--text-secondary);cursor:pointer"><input type="file" id="quick-photo" accept="image/*" style="display:none" onchange="photoSelected(this)"><i class="ti ti-camera" aria-hidden="true"></i>add photo</label>` : ''}
    <button class="btn-primary" onclick="submitQuickLog('${type}')">log</button>
  `);
  window.submitQuickLog = async (t) => {
    const val = document.getElementById('quick-input')?.value?.trim();
    if (!val) return;
    if (t === 'meal') { closeSheet({}); await handleMealLog(val, _pendingPhoto); _pendingPhoto = null; }
    else if (t === 'workout') { await saveWorkout({ description: val }); closeSheet({}); }
    else if (t === 'water') { const ml = parseInt(val) || 500; await saveWater(ml); closeSheet({}); }
    else if (t === 'weight') { await saveWeight(parseFloat(val)); closeSheet({}); }
    else if (t === 'sleep') { await saveSleep({ hours: parseFloat(val) || 7 }); closeSheet({}); }
  };
  window.photoSelected = photoSelected;
}

const EXERCISE_LIBRARY = {
  Push:   ['Bench Press','Incline Bench Press','Overhead Press','Lateral Raise','Tricep Pushdown','Dips','Cable Fly'],
  Pull:   ['Barbell Row','Pull-ups','Lat Pulldown','Face Pull','Bicep Curl','Hammer Curl','Seated Row'],
  Legs:   ['Squat','Romanian Deadlift','Leg Press','Lunges','Leg Curl','Leg Extension','Calf Raise'],
  Hinge:  ['Deadlift','Hip Thrust','Good Morning','Kettlebell Swing','Single-leg RDL'],
  Core:   ['Plank','Cable Crunch','Hanging Leg Raise','Ab Wheel','Russian Twist'],
  Cardio: ['Running','Cycling','Jump Rope','Rowing','Stair Climber'],
};

let _workoutSession = null;
let _workoutTimerInterval = null;

function syncSessionFromDOM() {
  if (!_workoutSession) return;
  _workoutSession.exercises.forEach((ex, ei) => {
    ex.sets.forEach((set, si) => {
      if (set.done) return;
      const w = document.querySelector(`#set-${ei}-${si} .set-w`);
      const r = document.querySelector(`#set-${ei}-${si} .set-r`);
      if (w) set.weight = w.value;
      if (r) set.reps = r.value;
    });
  });
}

function renderExerciseCard(ex, ei) {
  const doneSets = ex.sets.filter(s => s.done).length;
  return `
    <div class="exercise-card" id="ex-card-${ei}">
      <div class="exercise-name-row">
        <span class="exercise-name">${ex.name}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${doneSets}/${ex.sets.length} sets</span>
          <i class="ti ti-trash" style="font-size:15px;color:var(--danger);cursor:pointer" onclick="removeExercise(${ei})" aria-label="Remove"></i>
        </div>
      </div>
      <div class="set-header-row"><span></span><span>kg</span><span>reps</span><span></span></div>
      ${ex.sets.map((s, si) => `
        <div class="set-row ${s.done ? 'done' : ''}" id="set-${ei}-${si}">
          <span class="set-num">${si + 1}</span>
          <input class="set-input set-w ${s.done ? 'done-input' : ''}" type="number" inputmode="decimal" placeholder="—" value="${s.weight || ''}" ${s.done ? 'readonly' : ''} aria-label="Weight kg">
          <input class="set-input set-r ${s.done ? 'done-input' : ''}" type="number" inputmode="numeric" placeholder="—" value="${s.reps || ''}" ${s.done ? 'readonly' : ''} aria-label="Reps">
          <div class="set-done-btn ${s.done ? 'done' : ''}" onclick="markSetDone(${ei},${si})" aria-label="${s.done ? 'Done' : 'Mark done'}">
            ${s.done ? '<i class="ti ti-check" style="font-size:12px;color:white"></i>' : ''}
          </div>
        </div>`).join('')}
      <button class="add-set-btn" onclick="addSetToExercise(${ei})"><i class="ti ti-plus" style="font-size:13px"></i> add set</button>
    </div>`;
}

function renderWorkoutSession() {
  const screen = document.getElementById('workout-screen');
  if (!screen || !_workoutSession) return;
  const elapsed = Math.floor((Date.now() - _workoutSession.startTime) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  screen.innerHTML = `
    <div class="workout-header">
      <div>
        <div id="workout-timer" class="workout-timer">${mm}:${ss}</div>
        <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px">in session</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button onclick="discardWorkout()" style="background:none;border:none;color:var(--danger);font-size:var(--text-sm);cursor:pointer;font-family:var(--font-sans)">discard</button>
        <button onclick="finishWorkout()" class="btn-primary" style="width:auto;padding:8px 20px">finish</button>
      </div>
    </div>
    <div class="workout-body">
      ${_workoutSession.exercises.length === 0
        ? `<div class="empty-state" style="padding-top:60px"><i class="ti ti-barbell" style="font-size:36px;display:block;margin-bottom:var(--space-3);color:var(--text-tertiary)"></i>Add your first exercise to begin</div>`
        : _workoutSession.exercises.map((ex, ei) => renderExerciseCard(ex, ei)).join('')}
    </div>
    <div class="workout-footer">
      <button class="btn-secondary" onclick="showExercisePicker()" style="display:flex;align-items:center;justify-content:center;gap:6px">
        <i class="ti ti-plus"></i> add exercise
      </button>
    </div>
    <div id="ex-picker" class="ex-picker"></div>`;
  window.showExercisePicker = showExercisePicker;
  window.finishWorkout = finishWorkout;
  window.discardWorkout = discardWorkout;
  window.markSetDone = markSetDone;
  window.addSetToExercise = addSetToExercise;
  window.removeExercise = removeExercise;
}

function openWorkoutSession() {
  const screen = document.getElementById('workout-screen');
  if (_workoutSession) { screen.classList.add('open'); return; }
  _workoutSession = { startTime: Date.now(), exercises: [] };
  renderWorkoutSession();
  screen.classList.add('open');
  _workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);
}

function updateWorkoutTimer() {
  const el = document.getElementById('workout-timer');
  if (!el || !_workoutSession) return;
  const elapsed = Math.floor((Date.now() - _workoutSession.startTime) / 1000);
  el.textContent = `${String(Math.floor(elapsed / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`;
}

function showExercisePicker() {
  const picker = document.getElementById('ex-picker');
  if (!picker) return;
  const buildList = (q) => {
    const query = q.toLowerCase().trim();
    let html = '';
    for (const [group, list] of Object.entries(EXERCISE_LIBRARY)) {
      const filtered = query ? list.filter(e => e.toLowerCase().includes(query)) : list;
      if (!filtered.length) continue;
      html += `<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:var(--tracking-wider);padding:10px 0 4px">${group}</div>`;
      html += filtered.map(e => `<div class="ex-list-item" onclick="pickExercise('${e.replace(/'/g,"\\'")}') ">${e}</div>`).join('');
    }
    if (query && !html) {
      html = `<div class="ex-list-item" style="color:var(--accent-light);border:0.5px dashed var(--accent-mid);border-radius:var(--radius-md)" onclick="pickExercise('${q.replace(/'/g,"\\'")}')">+ add "${q}"</div>`;
    }
    return html;
  };
  picker.innerHTML = `
    <div class="ex-picker-backdrop" onclick="closeExPicker()"></div>
    <div class="ex-picker-sheet">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
        <span class="sheet-title">add exercise</span>
        <i class="ti ti-x" style="font-size:20px;cursor:pointer;color:var(--text-secondary)" onclick="closeExPicker()"></i>
      </div>
      <input id="ex-search" placeholder="search or enter custom..." style="margin-bottom:var(--space-2)" oninput="filterExList(this.value)">
      <div class="ex-list-scroll" id="ex-list">${buildList('')}</div>
    </div>`;
  picker.classList.add('open');
  setTimeout(() => document.getElementById('ex-search')?.focus(), 60);
  window.closeExPicker = () => { picker.classList.remove('open'); };
  window.filterExList = (q) => { const el = document.getElementById('ex-list'); if (el) el.innerHTML = buildList(q); };
  window.pickExercise = (name) => { addExerciseToSession(name); window.closeExPicker(); };
}

function _reregisterWorkoutHandlers() {
  window.markSetDone = markSetDone;
  window.addSetToExercise = addSetToExercise;
  window.removeExercise = removeExercise;
  window.showExercisePicker = showExercisePicker;
  window.finishWorkout = finishWorkout;
  window.discardWorkout = discardWorkout;
}

function addExerciseToSession(name) {
  if (!_workoutSession) return;
  syncSessionFromDOM();
  _workoutSession.exercises.push({ name, sets: [{ weight: '', reps: '', done: false }] });
  renderWorkoutSession();
  clearInterval(_workoutTimerInterval);
  _workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);
  setTimeout(() => { const body = document.querySelector('.workout-body'); if (body) body.scrollTop = body.scrollHeight; }, 50);
}

function removeExercise(exIdx) {
  if (!_workoutSession) return;
  syncSessionFromDOM();
  _workoutSession.exercises.splice(exIdx, 1);
  renderWorkoutSession();
  clearInterval(_workoutTimerInterval);
  _workoutTimerInterval = setInterval(updateWorkoutTimer, 1000);
}

function addSetToExercise(exIdx) {
  const ex = _workoutSession?.exercises[exIdx];
  if (!ex) return;
  syncSessionFromDOM();
  const prev = ex.sets[ex.sets.length - 1];
  ex.sets.push({ weight: prev?.weight || '', reps: prev?.reps || '', done: false });
  const card = document.getElementById(`ex-card-${exIdx}`);
  if (card) { card.outerHTML = renderExerciseCard(ex, exIdx); _reregisterWorkoutHandlers(); }
}

function markSetDone(exIdx, setIdx) {
  const ex = _workoutSession?.exercises[exIdx];
  if (!ex) return;
  const set = ex.sets[setIdx];
  const w = document.querySelector(`#set-${exIdx}-${setIdx} .set-w`);
  const r = document.querySelector(`#set-${exIdx}-${setIdx} .set-r`);
  if (w) set.weight = w.value;
  if (r) set.reps = r.value;
  set.done = !set.done;
  const card = document.getElementById(`ex-card-${exIdx}`);
  if (card) { card.outerHTML = renderExerciseCard(ex, exIdx); _reregisterWorkoutHandlers(); }
}

async function finishWorkout() {
  if (!_workoutSession) return;
  syncSessionFromDOM();
  const { exercises, startTime } = _workoutSession;
  if (!exercises.length) { discardWorkout(); return; }
  const duration = Math.max(1, Math.round((Date.now() - startTime) / 60000));
  let totalVolume = 0, totalSets = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.done && s.weight && s.reps) { totalVolume += parseFloat(s.weight) * parseInt(s.reps); totalSets++; }
    }
  }
  await addRecord('workouts', { date: todayStr(), exercises, duration, totalVolume: Math.round(totalVolume), totalSets, loggedAt: new Date().toISOString() });
  await updatePersonalRecords(exercises);
  clearInterval(_workoutTimerInterval); _workoutTimerInterval = null; _workoutSession = null;
  document.getElementById('workout-screen').classList.remove('open');
  const xp = await awardXP(30 + Math.min(20, totalSets * 2), 'workout_logged');
  _profile = await getProfile();
  showXpPopup(`+${xp}`);
  showToast(`workout done · ${exercises.length} exercises · ${duration}min`, 'xp', 3000);
  onRefresh();
}

async function updatePersonalRecords(exercises) {
  for (const ex of exercises) {
    let best = 0;
    for (const s of ex.sets) { if (s.done && s.weight) best = Math.max(best, parseFloat(s.weight)); }
    if (!best) continue;
    try {
      const existing = await getRecord('personalRecords', ex.name);
      if (!existing || best > existing.weight) {
        await putRecord('personalRecords', { exerciseName: ex.name, weight: best, date: todayStr() });
        if (existing) showToast(`PR · ${ex.name} · ${best}kg 🏆`, 'xp', 3500);
      }
    } catch {}
  }
}

function discardWorkout() {
  clearInterval(_workoutTimerInterval); _workoutTimerInterval = null; _workoutSession = null;
  document.getElementById('workout-screen').classList.remove('open');
}

async function renderWorkoutHistory() {
  const el = document.getElementById('workout-history-list');
  if (!el) return;
  const endD = new Date(); const startD = new Date(); startD.setDate(startD.getDate() - 30);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const all = await getByDateRange('workouts', fmt(startD), fmt(endD));
  if (!all.length) { el.innerHTML = '<div class="empty-state" style="padding:var(--space-4)">No workouts logged yet.</div>'; return; }
  const recent = all.slice(-8).reverse();
  el.innerHTML = recent.map(w => {
    const exNames = (w.exercises || []).map(e => e.name).join(', ') || '—';
    const d = w.date ? w.date.slice(5) : '—';
    return `
      <div style="padding:var(--space-2) 0;border-bottom:0.5px solid var(--border-subtle)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:var(--text-base);color:var(--text-primary);font-weight:var(--weight-medium)">${d}</span>
          <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${w.duration || 0}min · ${(w.totalVolume || 0).toLocaleString()}kg</span>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${exNames}</div>
      </div>`;
  }).join('') + `<div style="text-align:center;padding:var(--space-3) 0"><button onclick="openWorkoutSession()" style="background:none;border:none;color:var(--accent-light);font-size:var(--text-sm);cursor:pointer;font-family:var(--font-sans)">+ start new workout</button></div>`;
  window.openWorkoutSession = openWorkoutSession;
}

async function openCravingScreen() {
  const screen = document.getElementById('craving-screen');
  screen.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
      <span style="font-size:var(--text-lg);font-weight:var(--weight-medium)">i want to...</span>
      <i class="ti ti-x" style="font-size:20px;cursor:pointer" onclick="closeCraving()" aria-label="Close"></i>
    </div>
    <textarea id="craving-input" placeholder="order biryani... skip the gym... scroll instagram..." style="min-height:80px;margin-bottom:var(--space-4)"></textarea>
    <button class="btn-secondary" onclick="assessCraving()">show me the cost</button>
    <div id="craving-consequence" style="margin-top:var(--space-4)"></div>
  `;
  screen.classList.add('open');
  window.closeCraving = () => { screen.classList.remove('open'); };
  window.assessCraving = async () => {
    const text = document.getElementById('craving-input')?.value?.trim();
    if (!text) return;
    const today = todayStr();
    const meals = await getByDate('meals', today);
    const nutrition = { calories: meals.reduce((s, m) => s + (m.nutrition?.calories || 0), 0), protein: meals.reduce((s, m) => s + (m.nutrition?.protein || 0), 0) };
    const quests = await getAllRecords('quests');
    const activeQuest = quests.find(q => q.status === 'active');
    const consequence = await getCravingConsequence(text, nutrition, activeQuest);
    const div = document.getElementById('craving-consequence');
    if (consequence) {
      div.innerHTML = `
        <div style="font-size:var(--text-md);color:var(--danger);margin-bottom:var(--space-2)">${consequence.consequence}</div>
        <div style="font-size:var(--text-sm);color:var(--text-tertiary);margin-bottom:var(--space-4)">~${consequence.estimatedCalories} kcal · ~${consequence.estimatedProtein}g protein · −${consequence.xpPenalty} XP if violated</div>
        <div class="craving-resist" onclick="cravingResisted('${text}', ${JSON.stringify(consequence).replace(/'/g,'&#39;')})">I resisted · +25 XP</div>
        <div class="craving-anyway" onclick="cravingAnyway('${text}', ${JSON.stringify(consequence).replace(/'/g,'&#39;')})">I'm doing it anyway</div>
      `;
    } else {
      div.innerHTML = `<div class="craving-resist" onclick="cravingResisted('${text}', null)">I resisted · +25 XP</div><div class="craving-anyway" onclick="cravingAnyway('${text}', null)">I'm doing it anyway</div>`;
    }
    window.cravingResisted = async (desc, cons) => {
      const xp = await logCraving(desc, 'resisted', cons);
      screen.classList.remove('open');
      showXpPopup(`+${xp}`);
      showToast('craving resisted · +25 XP', 'xp');
      onRefresh();
    };
    window.cravingAnyway = async (desc, cons) => {
      const pen = await logCraving(desc, 'gave_in', cons);
      screen.classList.remove('open');
      showToast(`violation logged · −${pen} XP`, 'danger', 4000);
      onRefresh();
    };
  };
}

async function openHabitManager() {
  const habits = await getAllRecords('habits');
  openSheet(`
    <span class="sheet-title">manage habits</span>
    <div id="habit-manager-list">
      ${habits.map(h => `<div class="checklist-item"><span class="check-label">${h.name}</span><i class="ti ti-trash" style="font-size:16px;color:var(--danger);cursor:pointer" onclick="deleteHabit(${h.id})" aria-label="Delete habit"></i></div>`).join('') || '<div class="empty-state">No habits yet.</div>'}
    </div>
    <input id="new-habit-input" placeholder="new habit name..." style="margin-top:var(--space-3)">
    <button class="btn-primary" onclick="addHabit()" style="margin-top:8px">add habit</button>
    <button class="btn-secondary" onclick="suggestHabitsAI()">suggest habits (AI)</button>
  `);
  window.deleteHabit = async (id) => {
    await deleteRecord('habits', id);
    const logs = await getAllRecords('habitLogs');
    for (const l of logs.filter(l => l.habitId === id)) await deleteRecord('habitLogs', l.id);
    await openHabitManager();
  };
  window.addHabit = async () => {
    const name = document.getElementById('new-habit-input')?.value?.trim();
    if (!name) return;
    await addRecord('habits', { name, createdAt: new Date().toISOString() });
    await openHabitManager();
  };
  window.suggestHabitsAI = async () => {
    showToast('generating suggestions...', '', 8000);
    const suggestions = await suggestHabits(_profile);
    if (!suggestions?.length) { showToast('AI unavailable — add manually', 'danger'); return; }
    for (const s of suggestions) await addRecord('habits', { name: s.name, category: s.category, why: s.why, createdAt: new Date().toISOString() });
    showToast(`${suggestions.length} habits added`, 'xp');
    await openHabitManager();
  };
}

let _todoFilter = 'active';

function renderTodoItem(t, today) {
  let badge = '';
  if (t.dueDate) {
    if (t.dueDate < today)      badge = `<span class="todo-due overdue">⚠ ${t.dueDate.slice(5)}</span>`;
    else if (t.dueDate === today) badge = `<span class="todo-due today-due">today</span>`;
    else                          badge = `<span class="todo-due future-due">${t.dueDate.slice(5)}</span>`;
  }
  return `
    <div class="todo-item">
      <div class="check-box ${t.completed ? 'done' : 'pending'}" onclick="toggleTodoFull(${t.id})" style="cursor:pointer;flex-shrink:0">
        ${t.completed ? '<i class="ti ti-check" aria-hidden="true"></i>' : ''}
      </div>
      <span class="todo-item-text ${t.completed ? 'done' : ''}">${t.text}</span>
      ${badge}
      <i class="ti ti-trash" style="font-size:15px;color:var(--danger);cursor:pointer;opacity:0.55;flex-shrink:0" onclick="deleteTodoFull(${t.id})" aria-label="Delete"></i>
    </div>`;
}

async function renderTodoScreen() {
  const screen = document.getElementById('todo-screen');
  if (!screen) return;
  const today = todayStr();
  const all = await getAllRecords('todos');

  const active = all.filter(t => !t.completed);
  const done   = all.filter(t => t.completed);

  let groups = [];
  if (_todoFilter !== 'done') {
    const src = _todoFilter === 'all' ? active : active;
    const overdue  = src.filter(t => t.dueDate && t.dueDate < today);
    const todayDue = src.filter(t => t.dueDate === today);
    const upcoming = src.filter(t => t.dueDate && t.dueDate > today);
    const noDate   = src.filter(t => !t.dueDate);
    if (overdue.length)  groups.push({ label: 'overdue',  items: overdue });
    if (todayDue.length) groups.push({ label: 'today',    items: todayDue });
    if (upcoming.length) groups.push({ label: 'upcoming', items: upcoming });
    if (noDate.length)   groups.push({ label: 'tasks',    items: noDate });
    if (_todoFilter === 'all' && done.length)
      groups.push({ label: 'completed', items: done.slice().reverse().slice(0, 20) });
  } else {
    if (done.length) groups.push({ label: 'completed', items: done.slice().reverse() });
  }

  screen.innerHTML = `
    <div class="todo-header">
      <div>
        <div style="font-size:var(--text-lg);font-weight:var(--weight-medium)">to-do</div>
        <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:1px">${active.length} active · ${done.length} done</div>
      </div>
      <i class="ti ti-x" style="font-size:22px;color:var(--text-secondary);cursor:pointer" onclick="closeTodoScreen()" aria-label="Close"></i>
    </div>
    <div class="filter-row">
      ${['active','all','done'].map(f =>
        `<button class="filter-pill ${_todoFilter === f ? 'active' : ''}" onclick="setTodoFilter('${f}')">${f}</button>`
      ).join('')}
    </div>
    <div class="todo-body">
      ${groups.length === 0
        ? `<div class="empty-state" style="padding-top:80px">
             <i class="ti ti-circle-check" style="font-size:36px;display:block;margin-bottom:var(--space-3);color:var(--text-tertiary)"></i>
             ${_todoFilter === 'done' ? 'Nothing completed yet.' : 'All clear. Add a task below.'}
           </div>`
        : groups.map(g => `
            <div class="todo-group-label">${g.label}</div>
            ${g.items.map(t => renderTodoItem(t, today)).join('')}
          `).join('')}
    </div>
    <div class="todo-add-form">
      <div class="todo-add-row">
        <input id="todo-new-text" placeholder="new task..." style="flex:1">
        <input type="date" id="todo-new-date" style="width:130px">
      </div>
      <button class="btn-primary" onclick="submitTodoFull()">add task</button>
    </div>
  `;

  document.getElementById('todo-new-text')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.submitTodoFull?.();
  });

  window.closeTodoScreen = () => {
    document.getElementById('todo-screen').classList.remove('open');
    renderTodos();
  };
  window.setTodoFilter = (f) => { _todoFilter = f; renderTodoScreen(); };
  window.toggleTodoFull = async (id) => {
    const todos = await getAllRecords('todos');
    const t = todos.find(x => x.id === id);
    if (!t) return;
    t.completed = !t.completed;
    t.completedAt = t.completed ? new Date().toISOString() : null;
    if (t.completed) { const xp = await awardXP(3, 'todo_done'); showXpPopup(`+${xp}`); }
    await putRecord('todos', t);
    renderTodoScreen();
  };
  window.deleteTodoFull = async (id) => {
    await deleteRecord('todos', id);
    renderTodoScreen();
  };
  window.submitTodoFull = async () => {
    const text = document.getElementById('todo-new-text')?.value?.trim();
    const due  = document.getElementById('todo-new-date')?.value;
    if (!text) return;
    await addRecord('todos', { text, dueDate: due || null, completed: false, createdAt: new Date().toISOString() });
    document.getElementById('todo-new-text').value = '';
    document.getElementById('todo-new-date').value = '';
    _todoFilter = 'active';
    renderTodoScreen();
  };
}

function openTodoScreen() {
  document.getElementById('todo-screen').classList.add('open');
  renderTodoScreen();
}

function openTodoSheet() {
  openSheet(`
    <span class="sheet-title">add to-do</span>
    <input id="todo-text" placeholder="what needs doing?">
    <input type="date" id="todo-due" placeholder="due date (optional)">
    <button class="btn-primary" onclick="saveTodo()">add</button>
  `);
  window.saveTodo = async () => {
    const text = document.getElementById('todo-text')?.value?.trim();
    const due = document.getElementById('todo-due')?.value;
    if (!text) return;
    await addRecord('todos', { text, dueDate: due || null, completed: false, createdAt: new Date().toISOString() });
    closeSheet({});
    await renderTodos();
  };
}

async function generateVerdict() {
  showToast('generating verdict...', '', 12000);
  const end = todayStr();
  const startD = new Date(); startD.setDate(startD.getDate() - 7);
  const start = `${startD.getFullYear()}-${String(startD.getMonth()+1).padStart(2,'0')}-${String(startD.getDate()).padStart(2,'0')}`;
  const [scores, viols, cravings] = await Promise.all([
    getByDateRange('dailyScores', start, end),
    getByDateRange('violations', start, end),
    getByDateRange('cravings', start, end),
  ]);
  const result = await generateWeeklyVerdict({ scores, violations: viols, cravings, streak: _profile.streak, identity: _profile.identity });
  if (result) {
    _profile.insight = result;
    if (result.updatedBehaviorSummary) _profile.behaviorSummary = result.updatedBehaviorSummary;
    await saveProfile(_profile);
    renderInsightsTab();
    showToast('verdict ready', 'xp');
  } else {
    showToast('AI unavailable', 'danger');
  }
}

function openQuestSelector() {
  const presets = [
    { type: 'shred', label: 'Shred', days: 28, targets: { calorieMax: 1800, protein: 180, workoutsPerWeek: 5, weightLoss: 3 }, rewardXP: 500 },
    { type: 'bulk', label: 'Bulk', days: 56, targets: { calorieMin: 2800, protein: 200, workoutsPerWeek: 4, weightGain: 4 }, rewardXP: 750 },
    { type: 'maintenance', label: 'Maintenance', days: 30, targets: { weightVariance: 0.5, workoutsPerWeek: 3 }, rewardXP: 300 },
    { type: 'streak-warrior', label: 'Streak Warrior', days: 30, targets: { streakDays: 30, noFreeze: true }, rewardXP: 600 },
  ];
  openSheet(`
    <span class="sheet-title">start a quest</span>
    <div style="font-size:var(--text-md);color:var(--text-secondary);margin-bottom:var(--space-3)">One quest active at a time. No quitting.</div>
    ${presets.map(p => `
      <div class="card" style="margin:0 0 8px;cursor:pointer" onclick="startQuest(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:var(--text-md);font-weight:var(--weight-medium)">${p.label}</span>
          <span class="pill info">+${p.rewardXP} XP</span>
        </div>
        <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:4px">${p.days} days · ${Object.entries(p.targets).map(([k,v]) => `${k}: ${v}`).join(' · ')}</div>
      </div>
    `).join('')}
  `);
  window.startQuest = async (preset) => {
    const start = todayStr();
    const endD = new Date(); endD.setDate(endD.getDate() + preset.days);
    const end = `${endD.getFullYear()}-${String(endD.getMonth()+1).padStart(2,'0')}-${String(endD.getDate()).padStart(2,'0')}`;
    await addRecord('quests', { ...preset, status: 'active', startDate: start, endDate: end, progress: {} });
    closeSheet({});
    renderQuestsTab();
    showToast(`${preset.label} quest started`, 'xp', 3000);
  };
}

async function openSettings() {
  switchTab('profile');
}

function checkNotifs() {
  showToast('notifications: ' + (Notification.permission || 'unavailable'));
}

async function editKey(type) {
  const field = 'gptApiKey';
  openSheet(`
    <span class="sheet-title">OpenAI API key</span>
    <input id="key-input" type="password" placeholder="sk-..." value="${_profile[field] || ''}">
    <button class="btn-primary" onclick="saveKey('${field}')">save</button>
  `);
  window.saveKey = async (f) => {
    const val = document.getElementById('key-input')?.value?.trim();
    _profile[f] = val;
    await saveProfile(_profile);
    closeSheet({});
    showToast('API key saved', 'xp');
  };
}

async function setTheme(theme) {
  _profile.theme = theme;
  await saveProfile(_profile);
  applyTheme(theme);
}

async function updateGoal(key, value) {
  _profile.goals[key] = isNaN(value) ? value : Number(value);
  await saveProfile(_profile);
}

async function exportData() {
  const { exportAll } = await import('./db.js');
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `selfos-backup-${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url);
}

function confirmReset() {
  openSheet(`
    <span class="sheet-title" style="color:var(--danger)">reset everything</span>
    <div style="font-size:var(--text-md);color:var(--text-secondary);margin-bottom:var(--space-4)">This deletes all your data. Streak, XP, farm, logs — gone. Cannot be undone.</div>
    <button class="btn-danger" onclick="doReset()">yes, delete everything</button>
    <button class="btn-secondary" onclick="closeSheet({})">cancel</button>
  `);
  window.doReset = async () => {
    indexedDB.deleteDatabase('selfos');
    location.reload();
  };
}

async function onFarmTap(e) {
  const rect = _farmCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  if (y > 0.5 && x > 0.4 && x < 0.9) {
    const viols = await getByDate('violations', todayStr());
    const msg = await explainFarmDeath('animal', viols.map(v => v.type));
    showToast(msg || 'They needed more discipline.', '', 4000);
  }
}

async function onRefresh(e) {
  _profile = await getProfile();
  if (e?.detail?.xp && e.detail.xp > 0) showXpPopup(`+${e.detail.xp}`);
  if (e?.detail?.leveled) showToast(`level up → ${_profile.level} · ${rankFor(_profile.level)}`, 'xp', 4000);
  await renderFarmTab();
}

function onViolation(e) {
  const { type, penalty } = e.detail;
  showToast(`${type.replace(/_/g,' ')} → −${penalty} XP`, 'danger', 4000);
  scheduleNotif('violation logged', `${type.replace(/_/g,' ')} costs you ${penalty} XP and risks regression.`);
}

function onAchievement(e) {
  const { id } = e.detail;
  showToast(`achievement unlocked: ${id.replace(/_/g,' ')}`, 'xp', 5000);
}

async function setRange(range) {
  renderInsightsTab();
}

function showOnboarding() {
  const app = document.getElementById('app');
  let step = 0;
  const steps = [
    {
      title: 'SELF OS', desc: 'Your behavior, gamified with real consequences. The farm reflects how you live.',
      field: null, key: null
    },
    {
      title: 'What\'s your name?', desc: 'Used in notifications. No account, no backend, all local.',
      field: '<input id="ob-name" placeholder="your name" style="margin-bottom:var(--space-4)">',
      key: 'name', getValue: () => document.getElementById('ob-name')?.value?.trim()
    },
    {
      title: 'Daily calorie goal?', desc: 'Set based on your target. Shred = 1600-1900. Maintenance = 2000-2400.',
      field: '<input id="ob-cal" type="number" placeholder="1800" style="margin-bottom:var(--space-4)" value="1800">',
      key: 'goals.calories', getValue: () => parseInt(document.getElementById('ob-cal')?.value) || 1800
    },
    {
      title: 'Daily protein goal?', desc: 'Minimum for your goal. 2g per kg bodyweight is a solid start.',
      field: '<input id="ob-prot" type="number" placeholder="180" style="margin-bottom:var(--space-4)" value="180">',
      key: 'goals.protein', getValue: () => parseInt(document.getElementById('ob-prot')?.value) || 180
    },
    {
      title: 'OpenAI API key (optional)', desc: 'Powers meal parsing, AI verdicts, quest tasks, and photo analysis. Add later in settings if you prefer.',
      field: `<input id="ob-gpt" placeholder="sk-... (optional)">`,
      key: 'keys', getValue: () => ({ gpt: document.getElementById('ob-gpt')?.value?.trim() })
    }
  ];

  function renderStep() {
    const s = steps[step];
    app.innerHTML = `
      <div class="onboarding">
        <div class="ob-steps">${steps.map((_, i) => `<div class="ob-step ${i <= step ? 'done' : ''}"></div>`).join('')}</div>
        <h1>${s.title}</h1>
        <p>${s.desc}</p>
        ${s.field || ''}
        <div style="flex:1"></div>
        <button class="btn-primary" onclick="obNext()">
          ${step === steps.length - 1 ? 'start' : 'continue'}
        </button>
        ${step > 0 ? `<button class="btn-secondary" onclick="obBack()" style="margin-top:8px">back</button>` : ''}
      </div>
    `;
  }

  window.obNext = async () => {
    const s = steps[step];
    if (s.getValue) {
      const val = s.getValue();
      if (s.key === 'name') { _profile.name = val || 'you'; }
      else if (s.key === 'goals.calories') { _profile.goals.calories = val; }
      else if (s.key === 'goals.protein') { _profile.goals.protein = val; }
      else if (s.key === 'keys') { if (val.gpt) _profile.gptApiKey = val.gpt; }
    }
    step++;
    if (step >= steps.length) {
      _profile.onboardingComplete = true;
      await saveProfile(_profile);
      registerSW();
      renderApp();
      requestNotifPermission();
      document.addEventListener('selfos:refresh', onRefresh);
      document.addEventListener('selfos:violation', onViolation);
      document.addEventListener('selfos:achievement', onAchievement);
    } else {
      renderStep();
    }
  };

  window.obBack = () => { step = Math.max(0, step - 1); renderStep(); };
  renderStep();
}

document.addEventListener('DOMContentLoaded', init);
