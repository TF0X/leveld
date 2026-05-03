// Workout screen — exercises, sets, PR detection, rest timer.
import { addRecord, getAll, putRecord, todayStr, STORES } from './db.js';
import { $, $$, toast, fmtMins, showPR } from './ui.js';
import { awardXP, unlockAchievement } from './gamification.js';

let session = null;
let timerInterval = null;
let timerEnd = 0;

function newSession() {
  return { name: '', exercises: [] };
}

function newExercise() {
  return { name: '', sets: [{ reps: 0, weight: 0, completed: false }], isPR: false, previousBest: null };
}

export async function initWorkout() {
  if (!session) session = newSession();
  $('#wo-name').value = session.name;
  $('#wo-name').addEventListener('input', (e) => (session.name = e.target.value));
  $('#wo-add-ex').addEventListener('click', () => {
    session.exercises.push(newExercise());
    renderExercises();
  });
  $('#wo-save').addEventListener('click', saveWorkout);
  $$('.rest-btns [data-rest]').forEach((b) => b.addEventListener('click', () => startTimer(Number(b.dataset.rest))));
  renderExercises();
}

function renderExercises() {
  const root = $('#wo-exercises');
  root.innerHTML = '';
  session.exercises.forEach((ex, i) => {
    const card = document.createElement('div');
    card.className = `exercise${ex.isPR ? ' is-pr' : ''}`;
    card.innerHTML = `
      <div class="ex-head">
        <input type="text" placeholder="Exercise name" value="${escapeAttr(ex.name)}" data-ex="${i}" data-field="name" />
        ${ex.isPR ? '<span class="ex-pr-pill">PR</span>' : ''}
        <button class="meal-del" data-rm-ex="${i}" title="remove">×</button>
      </div>
      <div class="sets"></div>
      <button class="add-set btn-xs" data-add-set="${i}">+ Set</button>
    `;
    const setsRoot = card.querySelector('.sets');
    ex.sets.forEach((s, j) => {
      const row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML = `
        <span class="set-idx">${j + 1}</span>
        <input type="number" inputmode="decimal" placeholder="reps" value="${s.reps || ''}" data-set="${i}-${j}" data-f="reps" />
        <input type="number" inputmode="decimal" placeholder="kg" value="${s.weight || ''}" data-set="${i}-${j}" data-f="weight" />
        <button class="set-check ${s.completed ? 'done' : ''}" data-toggle="${i}-${j}">${s.completed ? '✓' : ''}</button>
        <button class="set-del" data-rm-set="${i}-${j}">×</button>
      `;
      setsRoot.appendChild(row);
    });
    root.appendChild(card);
  });

  // Wire events
  $$('#wo-exercises [data-ex]').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const i = Number(e.target.dataset.ex);
      session.exercises[i].name = e.target.value;
      checkPR(i);
      updateVolume();
    })
  );
  $$('#wo-exercises [data-set]').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const [i, j] = e.target.dataset.set.split('-').map(Number);
      session.exercises[i].sets[j][e.target.dataset.f] = Number(e.target.value) || 0;
      checkPR(i);
      updateVolume();
    })
  );
  $$('#wo-exercises [data-toggle]').forEach((b) =>
    b.addEventListener('click', (e) => {
      const [i, j] = e.currentTarget.dataset.toggle.split('-').map(Number);
      session.exercises[i].sets[j].completed = !session.exercises[i].sets[j].completed;
      renderExercises();
      updateVolume();
    })
  );
  $$('#wo-exercises [data-add-set]').forEach((b) =>
    b.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.addSet);
      const last = session.exercises[i].sets[session.exercises[i].sets.length - 1] || { reps: 0, weight: 0 };
      session.exercises[i].sets.push({ reps: last.reps, weight: last.weight, completed: false });
      renderExercises();
    })
  );
  $$('#wo-exercises [data-rm-set]').forEach((b) =>
    b.addEventListener('click', (e) => {
      const [i, j] = e.currentTarget.dataset.rmSet.split('-').map(Number);
      session.exercises[i].sets.splice(j, 1);
      if (session.exercises[i].sets.length === 0) session.exercises[i].sets.push({ reps: 0, weight: 0, completed: false });
      renderExercises();
      updateVolume();
    })
  );
  $$('#wo-exercises [data-rm-ex]').forEach((b) =>
    b.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.rmEx);
      session.exercises.splice(i, 1);
      renderExercises();
      updateVolume();
    })
  );
}

async function checkPR(i) {
  const ex = session.exercises[i];
  if (!ex.name) { ex.isPR = false; return; }
  const maxW = Math.max(0, ...ex.sets.map((s) => s.weight || 0));
  if (maxW <= 0) { ex.isPR = false; return; }
  const all = await getAll(STORES.personalRecords);
  const prev = all.find((r) => r.exerciseName.toLowerCase() === ex.name.toLowerCase());
  ex.previousBest = prev || null;
  ex.isPR = !prev || maxW > (prev.bestWeightKg || 0);
}

function updateVolume() {
  const total = session.exercises.reduce((s, ex) => s + ex.sets.reduce((a, st) => a + (st.completed ? (st.reps || 0) * (st.weight || 0) : 0), 0), 0);
  $('#wo-volume').textContent = Math.round(total);
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  timerEnd = Date.now() + seconds * 1000;
  $('#wo-timer').textContent = fmtMins(seconds);
  timerInterval = setInterval(() => {
    const remain = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
    $('#wo-timer').textContent = fmtMins(remain);
    if (remain <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      try { navigator.vibrate?.(200); } catch {}
      toast('Rest done', 'success');
    }
  }, 250);
}

async function saveWorkout() {
  const validEx = session.exercises.filter((ex) => ex.name && ex.sets.some((s) => s.completed));
  if (!validEx.length) return toast('Complete at least one set', 'error');
  const totalVolumeKg = validEx.reduce((s, ex) => s + ex.sets.reduce((a, st) => a + (st.completed ? (st.reps || 0) * (st.weight || 0) : 0), 0), 0);
  const record = {
    date: todayStr(),
    name: session.name || 'Workout',
    exercises: validEx,
    totalVolumeKg: Math.round(totalVolumeKg),
    durationMinutes: 0,
  };
  await addRecord(STORES.workouts, record);
  await awardXP(30, 'Workout');

  // PR updates
  let prCount = 0;
  for (const ex of validEx) {
    const maxW = Math.max(0, ...ex.sets.filter((s) => s.completed).map((s) => s.weight || 0));
    if (maxW <= 0) continue;
    const all = await getAll(STORES.personalRecords);
    const prev = all.find((r) => r.exerciseName.toLowerCase() === ex.name.toLowerCase());
    if (!prev || maxW > (prev.bestWeightKg || 0)) {
      const bestSet = ex.sets.filter((s) => s.completed).sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
      await putRecord(STORES.personalRecords, {
        exerciseName: ex.name,
        bestWeightKg: maxW,
        bestReps: bestSet?.reps || 0,
        achievedDate: todayStr(),
      });
      await awardXP(100, `PR: ${ex.name}`);
      showPR(ex.name, maxW);
      prCount++;
    }
  }

  // Achievements
  const allW = await getAll(STORES.workouts);
  if (allW.length === 1) await unlockAchievement('first_workout');
  const allPR = await getAll(STORES.personalRecords);
  if (allPR.length >= 10) await unlockAchievement('pr_10');

  toast('Workout saved', 'success');
  session = newSession();
  $('#wo-name').value = '';
  renderExercises();
  updateVolume();
  document.dispatchEvent(new Event('lt:refresh-home'));
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}
