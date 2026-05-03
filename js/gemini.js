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

async function callGemini(parts, { temperature = 0.4, maxTokens = 800 } = {}) {
  const key = await getKey();
  if (!key) throw new Error('NO_KEY');
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'text/plain' },
  };
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GEMINI_${res.status}: ${errText.slice(0, 120)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
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

export async function analyzeMealPhoto(dataUrlBase64, goals) {
  const prompt = `You are a nutrition estimator. Identify the food in the photo and estimate nutrition for the visible portion. User goals: ${goals.calories} kcal, ${goals.protein}g protein.

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
  const text = await callGemini(parts, { temperature: 0.3, maxTokens: 400 });
  const json = parseJSON(text);
  if (!json) throw new Error('BAD_JSON');
  return json;
}

export async function analyzeMealText(text, goals) {
  const prompt = `Estimate nutrition for this meal description. User goals: ${goals.calories} kcal, ${goals.protein}g protein.

Meal: "${text}"

Return ONLY valid JSON:
{
  "description": "cleaned-up meal name (max 8 words)",
  "nutrition": { "calories": int, "protein": int, "carbs": int, "fat": int, "fiber": int },
  "confidence": "low" | "medium" | "high"
}`;
  const out = await callGemini([{ text: prompt }], { temperature: 0.3, maxTokens: 300 });
  const json = parseJSON(out);
  if (!json) throw new Error('BAD_JSON');
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
  const out = await callGemini([{ text: prompt }], { temperature: 0.5, maxTokens: 250 });
  const json = parseJSON(out);
  if (!json) throw new Error('BAD_JSON');
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
  const out = await callGemini([{ text: prompt }], { temperature: 0.6, maxTokens: 600 });
  const json = parseJSON(out);
  if (!json) throw new Error('BAD_JSON');
  return json;
}

export async function hasKey() {
  const k = await getKey();
  return !!k;
}

export async function setKey(key) {
  await saveProfile({ geminiApiKey: key.trim() });
}
