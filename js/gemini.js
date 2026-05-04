// Gemini 2.5 Flash wrapper. All calls fail soft → callers handle null/offline gracefully.
import { getProfile, saveProfile } from './db.js';

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function getKey() {
  const p = await getProfile();
  return p.geminiApiKey || '';
}

function stripFences(text) {
  if (!text) return '';
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

function parseJSON(text) {
  const s = stripFences(text);
  // attempt to find first { ... last }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch { return null; }
}

async function callGemini(parts, { temperature = 0.4, maxTokens = 1024, json = false } = {}) {
  const key = await getKey();
  if (!key) throw new Error('NO_KEY');
  const generationConfig = {
    temperature,
    maxOutputTokens: maxTokens,
    // Gemini 2.5 Flash has thinking ON by default, which silently consumes the
    // output budget and returns empty text. Disable it for our short structured calls.
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (json) generationConfig.responseMimeType = 'application/json';
  const body = { contents: [{ role: 'user', parts }], generationConfig };
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GEMINI_${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
  if (!text) {
    console.warn('[gemini] empty text response', { finishReason: cand?.finishReason, usage: data?.usageMetadata, raw: data });
    throw new Error(`EMPTY_RESPONSE_${cand?.finishReason || 'UNKNOWN'}`);
  }
  return text;
}

// Compress an image File/Blob to <=800px JPEG @ 0.7
export async function compressImage(file, max = 800, quality = 0.7) {
  const objUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = objUrl;
    });
    const ratio = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

function base64Strip(dataUrl) {
  const idx = dataUrl.indexOf(',');
  return idx === -1 ? dataUrl : dataUrl.slice(idx + 1);
}

// Shared nutrition rules + reference anchors. Gemini consistently inflates
// protein and carbs for Indian food, so we give it explicit numbers per
// common item, frame it as a strict nutritionist, and tell it to round DOWN.
function nutritionRules(dietPreference) {
  const isIndian = /indian|jain|punjabi|south.?indian|gujarati|maharash|bengali|veg(?!an)|eggitarian/i.test(dietPreference || '');
  const anchors = `Reference anchors for common Indian foods (use these as the floor — DO NOT inflate beyond them):
- 1 medium roti / phulka (30g atta, no ghee on top): 75 cal, 2.5 P, 15 C, 0.5 F
- 1 paratha (plain, 1 tsp oil): 130 cal, 3 P, 18 C, 5 F
- 1 stuffed paratha (aloo/gobi, 1 tsp oil): 220 cal, 5 P, 30 C, 8 F
- 1 cup cooked white rice (~150g): 200 cal, 4 P, 44 C, 0.4 F
- 1 cup cooked basmati rice: 205 cal, 4 P, 45 C, 0.5 F
- 1 cup dal (cooked, with tadka): 200 cal, 12 P, 28 C, 5 F
- 1 cup chole / rajma curry (with gravy): 230 cal, 9 P, 32 C, 6 F
- 1 cup paneer curry (~80g paneer + masala gravy + 1 tbsp oil): 320 cal, 14 P, 10 C, 24 F
- 100g paneer: 265 cal, 18 P, 1.5 C, 21 F (NOT 22-25 P — that is a myth)
- 1 cup mixed veg sabzi (1.5 tsp oil): 130 cal, 4 P, 14 C, 7 F
- 1 cup curd (full fat, 200g): 100 cal, 7 P, 12 C, 4 F
- 1 idli: 40 cal, 1.5 P, 8 C, 0.1 F
- 1 dosa (plain, no oil): 120 cal, 3 P, 18 C, 4 F
- 1 masala dosa (with potato filling): 200 cal, 4 P, 30 C, 7 F
- 1 medium samosa: 260 cal, 4 P, 32 C, 13 F
- 1 large egg: 75 cal, 6 P, 0 C, 5 F
- 100g chicken breast (cooked): 165 cal, 31 P, 0 C, 3.5 F
- 100g chicken curry (with gravy + oil): 230 cal, 18 P, 5 C, 15 F
- 1 tbsp ghee/oil: 120 cal, 0 P, 0 C, 14 F
- 1 cup milk (full fat, 240ml): 150 cal, 8 P, 12 C, 8 F
- 1 cup tea with milk + sugar: 60 cal, 2 P, 9 C, 2 F`;

  return `You are a strict, calibrated Indian-context nutritionist. ${isIndian ? 'The user eats Indian food.' : `Diet context: ${dietPreference || 'not specified'}.`}

Hard rules — follow ALL of them:
1. ROUND PROTEIN DOWN to the nearest integer. Same for carbs. Never round up.
2. When in doubt between two estimates, pick the LOWER one. Err on the conservative side.
3. Default portions are home-style, NOT restaurant or gym-bro portions, unless the user clearly says restaurant/buffet.
4. Always include the cooking oil/ghee for every Indian dish (1-2 tsp per veg dish, 1 tbsp per curry) unless explicitly dry-roasted or air-fried.
5. Do NOT count "hidden protein" from spices, herbs, or trace amounts. Only count protein from clearly visible/named ingredients.
6. Paneer is overestimated everywhere. 100g paneer = 18g protein, NOT 20-25g.
7. "Sabzi" / mixed veg has very little protein (3-5g per cup) unless it contains paneer, tofu, or beans.
8. Dal is decent protein but capped — 1 cup cooked dal ≈ 12g protein, not 18-20g.
9. Roti is mostly carbs. 1 medium roti has ~2.5g protein, not 4-5g.
10. If the photo or description shows a partial portion (half plate, small bowl, 1 piece), use 50-70% of the standard portion.

${anchors}

Use these anchors mechanically — pick the closest item, scale to the visible/described portion, sum, then ROUND DOWN. Set "confidence" to "low" if you can't see clearly or the description is vague (e.g. "lunch", "indian thali"). Set "high" only when items and portions are unambiguous.`;
}

export async function analyzeMealPhoto(dataUrlBase64, goals, dietPreference = '') {
  const prompt = `${nutritionRules(dietPreference)}

Identify the food in the photo and estimate nutrition for the visible portion only. User daily goals (for context, not portion sizing): ${goals.calories} kcal, ${goals.protein}g protein.

Return ONLY valid JSON, no prose, no markdown:
{
  "description": "short name of the meal (max 8 words)",
  "nutrition": { "calories": int, "protein": int, "carbs": int, "fat": int, "fiber": int },
  "confidence": "low" | "medium" | "high"
}`;
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/jpeg', data: base64Strip(dataUrlBase64) } },
  ];
  const text = await callGemini(parts, { temperature: 0.2, maxTokens: 900, json: true });
  const out = parseJSON(text);
  if (!out) { console.warn('[gemini] photo bad json:', text); throw new Error('BAD_JSON'); }
  return out;
}

export async function analyzeMealText(text, goals, dietPreference = '') {
  const prompt = `${nutritionRules(dietPreference)}

Estimate nutrition for this meal description. User daily goals (context only): ${goals.calories} kcal, ${goals.protein}g protein.

Meal: "${text}"

Return ONLY valid JSON:
{
  "description": "cleaned-up meal name (max 8 words)",
  "nutrition": { "calories": int, "protein": int, "carbs": int, "fat": int, "fiber": int },
  "confidence": "low" | "medium" | "high"
}`;
  const out = await callGemini([{ text: prompt }], { temperature: 0.2, maxTokens: 900, json: true });
  const json = parseJSON(out);
  if (!json) { console.warn('[gemini] text bad json:', out); throw new Error('BAD_JSON'); }
  return json;
}

// Both photo AND text together — text disambiguates the photo (portion size, ingredients you know).
export async function analyzeMealCombined(text, dataUrlBase64, goals, dietPreference = '') {
  const prompt = `${nutritionRules(dietPreference)}

Identify the food using BOTH the photo and the user's text note. The text note OVERRIDES what you see if they conflict — the user knows portion size and hidden ingredients (oil, ghee, sugar) you can't see. User daily goals (context only): ${goals.calories} kcal, ${goals.protein}g protein.

User note: "${text || '(none)'}"

Return ONLY valid JSON:
{
  "description": "short name of the meal (max 8 words)",
  "nutrition": { "calories": int, "protein": int, "carbs": int, "fat": int, "fiber": int },
  "confidence": "low" | "medium" | "high"
}`;
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/jpeg', data: base64Strip(dataUrlBase64) } },
  ];
  const out = await callGemini(parts, { temperature: 0.2, maxTokens: 900, json: true });
  const json = parseJSON(out);
  if (!json) { console.warn('[gemini] combined bad json:', out); throw new Error('BAD_JSON'); }
  return json;
}

// Smart "add anything" — user dumps text (and optionally a photo), Gemini routes it
// into one of: meal, workout, hobby, weight, note. Returns the structured payload to save.
export async function classifyAndExtract(text, dataUrlBase64, profile) {
  const goals = profile.goals || {};
  const hobbies = (profile.hobbies || []).map((h) => h.name).join(', ') || 'none';
  const prompt = `${nutritionRules(profile.dietPreference)}

(The above nutrition rules ONLY apply if you classify this as a "meal". For other types ignore them.)

You route a quick log entry into the right category for a fitness app. The user typed a free-form note and may include a photo. Decide what kind of entry it is and extract structured fields.

User note: "${text || '(none — use photo only)'}"
User's known hobbies: ${hobbies}
Goals: ${goals.calories} kcal, ${goals.protein}g protein, ${goals.water} ml water, ${goals.hobbyMinutes} min hobby/day.
Diet context: ${profile.dietPreference || 'not specified'}.

Pick ONE type:
- "meal" — anything they ate or drank with calories
- "workout" — gym/strength session with exercises and sets
- "hobby" — time spent on a hobby or activity (reading, walking, guitar, meditation, etc.)
- "weight" — bodyweight measurement
- "water" — water intake in ml
- "note" — none of the above; just record as a note

Return ONLY valid JSON in this exact shape (omit fields not used):
{
  "type": "meal" | "workout" | "hobby" | "weight" | "water" | "note",
  "confidence": "low" | "medium" | "high",
  "summary": "short one-line summary (max 10 words) of what they did",
  "encouragement": "one short encouraging or honest sentence (max 18 words), specific to this entry",
  "meal": { "description": "...", "type": "breakfast"|"lunch"|"dinner"|"snack", "nutrition": { "calories": int, "protein": int, "carbs": int, "fat": int, "fiber": int } },
  "workout": { "name": "...", "exercises": [ { "name": "...", "sets": [ { "reps": int, "weight": number } ] } ], "totalVolumeKg": int },
  "hobby": { "name": "...", "minutes": int, "notes": "..." },
  "weight": { "kg": number },
  "water": { "ml": int },
  "note": { "text": "..." }
}

Pick the meal "type" by time of day if not stated: before 10am=breakfast, 10am-3pm=lunch, 3pm-6pm=snack, after=dinner. For hobbies, match the user's known hobbies list when possible; otherwise use what they said. For workouts, parse "3x10 squats at 60kg" style. Be lenient and helpful.`;

  const parts = [{ text: prompt }];
  if (dataUrlBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Strip(dataUrlBase64) } });
  const out = await callGemini(parts, { temperature: 0.2, maxTokens: 1400, json: true });
  const json = parseJSON(out);
  if (!json) { console.warn('[gemini] classify bad json:', out); throw new Error('BAD_JSON'); }
  return json;
}

export async function scoreDailyActivity(todayLog, sevenDayAvg, goals) {
  const prompt = `Score today's activity for a fitness gamification app. Be encouraging but honest. Use the formulas as a guide; the LLM note should add color.

Today: ${JSON.stringify(todayLog)}
7-day avg: ${JSON.stringify(sevenDayAvg)}
Goals: ${JSON.stringify(goals)}

Return ONLY valid JSON:
{
  "activityScore": int 0-100,
  "outputScore": int 0-100,
  "llmNote": "one short sentence (max 18 words), specific to today"
}`;
  const out = await callGemini([{ text: prompt }], { temperature: 0.5, maxTokens: 500, json: true });
  const json = parseJSON(out);
  if (!json) { console.warn('[gemini] score bad json:', out); throw new Error('BAD_JSON'); }
  return json;
}

export async function generateWeeklyInsight(last7DayScores, rollingSummary, goals) {
  const prompt = `You are a no-nonsense fitness coach. Based on this week's scores and the rolling summary of past weeks, write a 3-4 sentence weekly insight. Be specific. Call out one win and one thing to improve.

Last 7 days: ${JSON.stringify(last7DayScores)}
Rolling summary: ${JSON.stringify(rollingSummary)}
Goals: ${JSON.stringify(goals)}

Also return an updated rolling summary (compress to ~150 tokens). Return ONLY valid JSON:
{
  "insight": "3-4 sentence paragraph",
  "rollingSummary": {
    "last_updated": "YYYY-MM-DD",
    "avg_activity_score": int,
    "avg_output_score": int,
    "notable_patterns": "short string",
    "current_trend": "improving" | "steady" | "declining",
    "streak_record": int
  }
}`;
  const out = await callGemini([{ text: prompt }], { temperature: 0.6, maxTokens: 1024, json: true });
  const json = parseJSON(out);
  if (!json) { console.warn('[gemini] insight bad json:', out); throw new Error('BAD_JSON'); }
  return json;
}

export async function hasKey() {
  const k = await getKey();
  return !!k;
}

export async function setKey(key) {
  await saveProfile({ geminiApiKey: key.trim() });
}
