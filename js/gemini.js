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

export async function analyzeMealPhoto(dataUrlBase64, goals, dietPreference = '') {
  const prompt = `You are a nutrition estimator. Identify the food in the photo and estimate nutrition for the visible portion. User goals: ${goals.calories} kcal, ${goals.protein}g protein. Diet context: ${dietPreference || 'not specified'}.

Use the diet context when it helps identify ingredients or estimate macros. If the meal appears Indian or the diet context suggests Indian food, prefer common Indian ingredients, cooking methods, and portion sizes. Be conservative and realistic with protein estimates, oil/ghee, paneer, dal, rice, roti, and curry portions rather than optimistic gym-style estimates.

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
  const text = await callGemini(parts, { temperature: 0.3, maxTokens: 800, json: true });
  const out = parseJSON(text);
  if (!out) { console.warn('[gemini] photo bad json:', text); throw new Error('BAD_JSON'); }
  return out;
}

export async function analyzeMealText(text, goals, dietPreference = '') {
  const prompt = `Estimate nutrition for this meal description. User goals: ${goals.calories} kcal, ${goals.protein}g protein. Diet context: ${dietPreference || 'not specified'}.

Use the diet context when it helps identify ingredients or estimate macros. If the meal or diet context suggests Indian food, prefer common Indian ingredients, cooking methods, and portion sizes. Be conservative and realistic with protein estimates, oil/ghee, paneer, dal, rice, roti, and curry portions rather than optimistic gym-style estimates.

Meal: "${text}"

Return ONLY valid JSON:
{
  "description": "cleaned-up meal name (max 8 words)",
  "nutrition": { "calories": int, "protein": int, "carbs": int, "fat": int, "fiber": int },
  "confidence": "low" | "medium" | "high"
}`;
  const out = await callGemini([{ text: prompt }], { temperature: 0.3, maxTokens: 800, json: true });
  const json = parseJSON(out);
  if (!json) { console.warn('[gemini] text bad json:', out); throw new Error('BAD_JSON'); }
  return json;
}

// Both photo AND text together — text disambiguates the photo (portion size, ingredients you know).
export async function analyzeMealCombined(text, dataUrlBase64, goals, dietPreference = '') {
  const prompt = `You are a nutrition estimator. Identify the food using BOTH the photo and the user's text note. The text note overrides what you see if they conflict (the user knows portion size and ingredients you can't see). User goals: ${goals.calories} kcal, ${goals.protein}g protein. Diet context: ${dietPreference || 'not specified'}.

User note: "${text || '(none)'}"

Be conservative and realistic with protein, oil/ghee, paneer, dal, rice, roti, curry portions. Use the diet context for ingredient guesses (Indian, Jain, vegetarian etc.).

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
  const out = await callGemini(parts, { temperature: 0.3, maxTokens: 800, json: true });
  const json = parseJSON(out);
  if (!json) { console.warn('[gemini] combined bad json:', out); throw new Error('BAD_JSON'); }
  return json;
}

// Smart "add anything" — user dumps text (and optionally a photo), Gemini routes it
// into one of: meal, workout, hobby, weight, note. Returns the structured payload to save.
export async function classifyAndExtract(text, dataUrlBase64, profile) {
  const goals = profile.goals || {};
  const hobbies = (profile.hobbies || []).map((h) => h.name).join(', ') || 'none';
  const prompt = `You route a quick log entry into the right category for a fitness app. The user typed a free-form note and may include a photo. Decide what kind of entry it is and extract structured fields.

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
  const out = await callGemini(parts, { temperature: 0.3, maxTokens: 1200, json: true });
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
