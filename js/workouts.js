import { STORES, addRecord, getAll, getByDate, putRecord, todayStr } from './db.js';
import { awardXP, unlockAchievement } from './gamification.js';

export async function getTodaysWorkouts() {
  return getByDate(STORES.workouts, todayStr());
}

export function computeWorkoutVolume(exercises = []) {
  return exercises.reduce((sum, exercise) => sum + (exercise.sets || []).reduce((setSum, set) => {
    if (!set.completed) return setSum;
    return setSum + ((Number(set.reps) || 0) * (Number(set.weight) || 0));
  }, 0), 0);
}

export async function saveWorkoutSession(payload) {
  const exercises = (payload.exercises || []).map((exercise) => ({
    name: exercise.name?.trim() || 'Exercise',
    sets: (exercise.sets || []).map((set) => ({
      reps: Number(set.reps) || 0,
      weight: Number(set.weight) || 0,
      completed: set.completed !== false,
    })),
  })).filter((exercise) => exercise.sets.some((set) => set.completed));
  const totalVolumeKg = Math.round(computeWorkoutVolume(exercises));
  const record = {
    date: todayStr(),
    name: payload.name?.trim() || 'Workout',
    exercises,
    totalVolumeKg,
    durationMinutes: Number(payload.durationMinutes) || 0,
  };
  await addRecord(STORES.workouts, record);
  await awardXP(25, 'Workout logged');
  const isFirstWorkout = (await getAll(STORES.workouts)).length === 1;
  if (isFirstWorkout) await unlockAchievement('first_workout');
  await updatePersonalRecords(exercises);
  document.dispatchEvent(new Event('lt:refresh-home'));
  return record;
}

async function updatePersonalRecords(exercises) {
  let prCount = 0;
  for (const exercise of exercises) {
    const maxWeight = Math.max(0, ...exercise.sets.map((set) => set.weight || 0));
    if (!maxWeight) continue;
    const current = await getAll(STORES.personalRecords);
    const existing = current.find((item) => item.exerciseName.toLowerCase() === exercise.name.toLowerCase());
    if (!existing || maxWeight > (existing.bestWeightKg || 0)) {
      await putRecord(STORES.personalRecords, {
        exerciseName: exercise.name,
        bestWeightKg: maxWeight,
        bestReps: exercise.sets.find((set) => set.weight === maxWeight)?.reps || 0,
        achievedDate: todayStr(),
      });
      prCount += 1;
    }
  }
  if (prCount) {
    const totalRecords = await getAll(STORES.personalRecords);
    if (totalRecords.length >= 10) await unlockAchievement('pr_10');
  }
}
