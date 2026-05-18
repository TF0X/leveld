import { STORES, addRecord, getAll, putRecord, todayStr } from './db.js';

function withinTenPercent(a, b) {
  const left = Number(a || 0);
  const right = Number(b || 0);
  const max = Math.max(1, left, right);
  return Math.abs(left - right) / max <= 0.1;
}

export async function getTopMealTemplates(limit = 5) {
  const templates = await getAll(STORES.mealTemplates);
  return templates.sort((a, b) => (b.useCount || 0) - (a.useCount || 0)).slice(0, limit);
}

export async function updateMealTemplateFromLog(meal) {
  const templates = await getAll(STORES.mealTemplates);
  const match = templates.find((template) =>
    template.descriptionLower === meal.descriptionLower
    || (
      template.descriptionLower.includes(meal.descriptionLower)
      || meal.descriptionLower.includes(template.descriptionLower)
    )
    && withinTenPercent(template.nutrition?.calories, meal.nutrition?.calories)
    && withinTenPercent(template.nutrition?.protein, meal.nutrition?.protein)
  );

  if (match) {
    await putRecord(STORES.mealTemplates, {
      ...match,
      useCount: (match.useCount || 0) + 1,
      lastUsed: Date.now(),
      mealType: meal.type,
      nutrition: meal.nutrition,
    });
    return;
  }

  const sameDescription = (await getAll(STORES.meals)).filter((item) =>
    item.descriptionLower === meal.descriptionLower && item.date >= dateDaysAgo(30)
  );
  if (sameDescription.length >= 2) {
    await addRecord(STORES.mealTemplates, {
      description: meal.description,
      descriptionLower: meal.descriptionLower,
      nutrition: meal.nutrition,
      useCount: 1,
      lastUsed: Date.now(),
      mealType: meal.type,
    });
  }
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function mealFromTemplate(template) {
  return {
    date: todayStr(),
    timestamp: Date.now(),
    type: template.mealType || 'meal',
    description: template.description,
    descriptionLower: template.descriptionLower,
    source: 'template',
    nutrition: { ...template.nutrition },
    confidence: 'high',
  };
}
