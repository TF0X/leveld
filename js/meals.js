import { STORES, addRecord, getByDate, getProfile, todayStr } from './db.js';
import { awardXP } from './gamification.js';
import { updateMealTemplateFromLog } from './templates.js';

export async function getTodaysMeals() {
  return getByDate(STORES.meals, todayStr());
}

export async function getDailyTotals() {
  const meals = await getTodaysMeals();
  return meals.reduce((acc, meal) => {
    acc.calories += meal.nutrition?.calories || 0;
    acc.protein += meal.nutrition?.protein || 0;
    acc.carbs += meal.nutrition?.carbs || 0;
    acc.fat += meal.nutrition?.fat || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export async function logMeal(payload) {
  const profile = await getProfile();
  const record = {
    date: todayStr(),
    timestamp: Date.now(),
    type: payload.type || inferMealType(),
    description: payload.description?.trim() || 'Meal',
    descriptionLower: payload.description?.trim().toLowerCase() || 'meal',
    nutrition: normalizeNutrition(payload.nutrition),
    source: payload.source || 'manual',
    confidence: payload.confidence || null,
  };
  await addRecord(STORES.meals, record);
  await awardXP(8, 'Meal logged');
  const totals = await getDailyTotals();
  if (totals.protein >= profile.goals.protein) {
    const meals = await getTodaysMeals();
    const before = meals.slice(0, -1).reduce((sum, meal) => sum + (meal.nutrition?.protein || 0), 0);
    if (before < profile.goals.protein) await awardXP(15, 'Protein goal hit');
  }
  await updateMealTemplateFromLog(record);
  document.dispatchEvent(new Event('lt:refresh-home'));
  return record;
}

function normalizeNutrition(nutrition = {}) {
  return {
    calories: Math.round(Number(nutrition.calories) || 0),
    protein: Math.round(Number(nutrition.protein) || 0),
    carbs: Math.round(Number(nutrition.carbs) || 0),
    fat: Math.round(Number(nutrition.fat) || 0),
    fiber: Math.round(Number(nutrition.fiber) || 0),
  };
}

export function inferMealType(date = new Date()) {
  const hour = date.getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}
