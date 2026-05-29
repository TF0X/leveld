import { getProfile } from './db.js';

const GPT_URL = 'https://api.openai.com/v1/chat/completions';

const INDIAN_FOOD_DB = {
  'roti': { per100g: { cal: 297, protein: 8.0, carbs: 52, fat: 6.5 } },
  'chapati': { per100g: { cal: 297, protein: 8.0, carbs: 52, fat: 6.5 } },
  'phulka': { per100g: { cal: 264, protein: 7.5, carbs: 50, fat: 4.0 } },
  'paratha': { per100g: { cal: 326, protein: 7.5, carbs: 46, fat: 13 } },
  'dal': { per100g: { cal: 116, protein: 7.5, carbs: 18, fat: 1.5 } },
  'dal tadka': { per100g: { cal: 130, protein: 8, carbs: 18, fat: 4 } },
  'dal makhani': { per100g: { cal: 145, protein: 7, carbs: 16, fat: 6 } },
  'rajma': { per100g: { cal: 127, protein: 8.7, carbs: 22, fat: 0.5 } },
  'chole': { per100g: { cal: 164, protein: 8.9, carbs: 27, fat: 2.6 } },
  'rice': { per100g: { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
  'paneer': { per100g: { cal: 265, protein: 18, carbs: 3.4, fat: 20 } },
  'paneer sabzi': { per100g: { cal: 180, protein: 10, carbs: 8, fat: 13 } },
  'chicken breast': { per100g: { cal: 165, protein: 31, carbs: 0, fat: 3.6 } },
  'chicken curry': { per100g: { cal: 165, protein: 18, carbs: 4, fat: 8.5 } },
  'egg': { per100g: { cal: 155, protein: 13, carbs: 1.1, fat: 11 } },
  'oats': { per100g: { cal: 389, protein: 17, carbs: 66, fat: 7 } },
  'whey protein': { per100g: { cal: 400, protein: 80, carbs: 8, fat: 4 } },
  'banana': { per100g: { cal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  'apple': { per100g: { cal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
  'curd': { per100g: { cal: 98, protein: 11, carbs: 3.4, fat: 4.3 } },
  'dahi': { per100g: { cal: 98, protein: 11, carbs: 3.4, fat: 4.3 } },
  'idli': { per100g: { cal: 154, protein: 3.9, carbs: 30, fat: 0.5 } },
  'dosa': { per100g: { cal: 168, protein: 3.8, carbs: 32, fat: 3 } },
  'upma': { per100g: { cal: 165, protein: 4, carbs: 28, fat: 4.5 } },
  'poha': { per100g: { cal: 180, protein: 3.5, carbs: 36, fat: 2.5 } },
  'sambar': { per100g: { cal: 55, protein: 3, carbs: 8, fat: 1.5 } },
  'biryani': { per100g: { cal: 210, protein: 8, carbs: 32, fat: 7 } },
  'aloo': { per100g: { cal: 86, protein: 1.9, carbs: 20, fat: 0.1 } },
  'potato': { per100g: { cal: 86, protein: 1.9, carbs: 20, fat: 0.1 } },
  'milk': { per100g: { cal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
};

function findInDB(description) {
  const lower = description.toLowerCase();
  for (const [key, val] of Object.entries(INDIAN_FOOD_DB)) {
    if (lower.includes(key)) return { key, ...val };
  }
  return null;
}

function nutritionRules(dietPref) {
  if (!dietPref?.includes('indian') && dietPref !== 'indian') return '';
  return `INDIAN FOOD CALIBRATION:
- 1 roti/chapati = 40g = ~120 kcal, 3.2g protein
- 1 katori dal = 150ml = ~175 kcal, 11g protein  
- 100g paneer = 265 kcal, 18g protein (home) or 300 kcal (restaurant)
- 1 cup cooked rice = 200g = 260 kcal
- Ghee 1 tsp = 5g = 45 kcal
- Round protein DOWN. Use home-style portions. Never inflate dal/paneer protein.
- Tadka/tempering adds 3-8g fat per serving. Count it.`;
}

async function callOpenAI(prompt, imageBase64 = null) {
  const profile = await getProfile();
  if (!profile.gptApiKey) throw new Error('No OpenAI API key');

  const model = imageBase64 ? 'gpt-4o' : 'gpt-4o-mini';
  const content = imageBase64
    ? [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: 'high' } }, { type: 'text', text: prompt }]
    : prompt;

  const res = await fetch(GPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${profile.gptApiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: 1024, temperature: 0.1 })
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJSON(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(clean.slice(start, end + 1));
  } catch { return null; }
}

export async function analyzeMeal(description, imageBase64 = null) {
  const profile = await getProfile();
  const rules = nutritionRules(profile.dietPreference);

  if (!imageBase64) {
    const dbMatch = findInDB(description);
    if (dbMatch) {
      const estimatedGrams = 200;
      const n = dbMatch.per100g;
      const mult = estimatedGrams / 100;
      return {
        description, source: 'local_db',
        nutrition: { calories: Math.round(n.cal * mult), protein: Math.round(n.protein * mult), carbs: Math.round(n.carbs * mult), fat: Math.round(n.fat * mult) },
        confidence: { overall: 0.85, calories: 0.85, protein: 0.80, carbs: 0.80, fat: 0.75, reasoning: 'Matched from Indian food database.' },
        errorMargin: { calories: 40, protein: 4, carbs: 6, fat: 4 }
      };
    }
  }

  const prompt = `${rules}

Analyze this meal and return ONLY valid JSON, no other text:
{
  "description": "brief meal description",
  "components": [{"item": "name", "estimatedGrams": 0}],
  "nutrition": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
  "confidence": {"overall": 0.0, "calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "reasoning": ""},
  "errorMargin": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
}
Meal: "${description}"`;

  try {
    const text = await callOpenAI(prompt, imageBase64);
    const result = parseJSON(text);
    if (result) return { ...result, source: imageBase64 ? 'gpt-4o' : 'gpt-4o-mini' };
  } catch (e) {
    console.error('AI meal analysis failed:', e);
  }
  return null;
}

export async function classifyAndExtract(text, imageBase64 = null) {
  const hour = new Date().getHours();
  const mealType = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 18 ? 'snack' : 'dinner';

  const prompt = `Classify this log entry and extract data. Return ONLY valid JSON:
{
  "type": "meal|workout|water|weight|sleep|habit|todo",
  "mealType": "${mealType}",
  "data": {}
}

For meal: data = {"description": "", "quantity": ""}
For workout: data = {"exercises": [{"name":"","sets":0,"reps":0,"weight":0}], "duration": 0}
For water: data = {"ml": 0}
For weight: data = {"kg": 0}
For sleep: data = {"hours": 0, "bedtime": "", "wakeTime": ""}
For habit: data = {"name": ""}
For todo: data = {"text": ""}

Entry: "${text}"`;

  try {
    const raw = await callOpenAI(prompt, imageBase64);
    return parseJSON(raw);
  } catch { return null; }
}

export async function getCravingConsequence(cravingText, todayNutrition, questState) {
  const prompt = `A person on a discipline tracking app is tempted to: "${cravingText}"

Today's nutrition so far: ${JSON.stringify(todayNutrition)}
Active quest: ${JSON.stringify(questState)}

Return ONLY valid JSON:
{
  "estimatedCalories": 0,
  "estimatedProtein": 0,
  "willBreakMacros": true,
  "isViolationType": "ordering_out|binge|late_night_eating|none",
  "consequence": "one brutally honest sentence about the consequence",
  "xpPenalty": 0
}`;

  try {
    const raw = await callOpenAI(prompt);
    return parseJSON(raw);
  } catch { return null; }
}

export async function generateWeeklyVerdict(weekData) {
  const prompt = `You are a brutally honest behavioral coach. No cheerleading.

Week data: ${JSON.stringify(weekData)}

Return ONLY valid JSON:
{
  "verdict": "LOCKED IN|HOLDING|SLIPPING|IN FREEFALL",
  "sentence": "one specific data-backed sentence. Reference actual numbers and patterns.",
  "dominantPattern": "brief pattern description",
  "updatedBehaviorSummary": {
    "dominant_violation": "",
    "trigger_pattern": "",
    "craving_resistance_rate": 0,
    "trend": "improving|steady|declining"
  }
}`;

  try {
    const raw = await callOpenAI(prompt);
    return parseJSON(raw);
  } catch { return null; }
}

export async function explainFarmDeath(entityType, recentViolations) {
  const prompt = `In one short sentence, explain why this farm entity died based on recent behavior violations.
Entity: ${entityType}
Recent violations: ${JSON.stringify(recentViolations)}
Be specific, reference real violations. No fluff. Max 15 words.`;

  try {
    return await callOpenAI(prompt);
  } catch { return 'Neglect. The record speaks for itself.'; }
}

export async function generateDailyQuestTasks(quest, profile, dayNumber) {
  const prompt = `Generate 4-5 specific daily tasks for day ${dayNumber} of a "${quest.type}" quest.

Quest targets: ${JSON.stringify(quest.targets)}
User goals: calories ${profile.goals.calories}, protein ${profile.goals.protein}g, workouts/week ${profile.goals.workoutsPerWeek}

Return ONLY a valid JSON array, no other text:
[{"label": "specific measurable task", "category": "nutrition|fitness|discipline|recovery", "xp": 10, "icon": "ti-icon-name"}]

Rules:
- Tasks must be specific and achievable today
- Mix categories (at least one fitness, one nutrition, one discipline)
- XP between 10-35 per task
- Icons must be valid tabler icon names (ti-barbell, ti-bowl, ti-droplet, ti-moon, ti-flame, ti-scale, ti-repeat, ti-clock, ti-egg, ti-run, ti-heart)
- Day ${dayNumber} difficulty: ${dayNumber < 7 ? 'beginner' : dayNumber < 21 ? 'intermediate' : 'advanced'}`;

  try {
    const raw = await callOpenAI(prompt);
    const text = raw.replace(/```json|```/g, '').trim();
    const start = text.indexOf('['), end = text.lastIndexOf(']');
    if (start === -1) return null;
    const tasks = JSON.parse(text.slice(start, end + 1));
    return tasks.map((t, i) => ({ ...t, id: i, done: false }));
  } catch { return null; }
}

export async function suggestHabits(profile) {
  const prompt = `Suggest 4 highly specific daily habits for this person. Return ONLY valid JSON array:
[{"name": "", "icon": "ti-icon-name", "category": "sleep|diet|fitness|mind|focus", "why": "one line"}]

Profile: age ${profile.age}, ${profile.sex}, activity: ${profile.activityLevel}, diet: ${profile.dietPreference}
Goals: ${JSON.stringify(profile.goals)}`;

  try {
    const raw = await callOpenAI(prompt);
    const text = raw.replace(/```json|```/g, '').trim();
    const start = text.indexOf('['), end = text.lastIndexOf(']');
    if (start === -1) return [];
    return JSON.parse(text.slice(start, end + 1));
  } catch { return []; }
}
