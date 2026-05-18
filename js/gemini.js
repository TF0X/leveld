import { getProfile, saveProfile } from './db.js';

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function stripFences(text) {
  return String(text || '').replace(/```(?:json)?/gi, '').trim();
}

function parseJSON(text) {
  const cleaned = stripFences(text);
  const objectStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');
  const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
  const objectEnd = cleaned.lastIndexOf('}');
  const arrayEnd = cleaned.lastIndexOf(']');
  const end = Math.max(objectEnd, arrayEnd);
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callGemini(parts, { temperature = 0.3, maxTokens = 1024, json = false } = {}) {
  const profile = await getProfile();
  if (!profile.geminiApiKey) throw new Error('NO_KEY');
  const response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(profile.geminiApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 0 },
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`GEMINI_${response.status}`);
  }
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';
  if (!text) throw new Error('EMPTY_RESPONSE');
  return text;
}

export async function compressImage(file, max = 800, quality = 0.7) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    const ratio = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function base64Strip(dataUrl) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

function nutritionRules(dietPreference = '') {
  return `You are a conservative nutrition estimator. Use home-style portions, round protein down, include cooking oil, and avoid inflated Indian food estimates. Diet context: ${dietPreference || 'general'}.
Return only valid JSON.`;
}

export async function analyzeMealText(text, goals, dietPreference = '') {
  const result = await callGemini([{
    text: `${nutritionRules(dietPreference)}
Estimate this meal: "${text}".
Goals for context: ${goals.calories} kcal and ${goals.protein}g protein.
Return:
{"description":"","nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0},"confidence":"low|medium|high"}`,
  }], { json: true, maxTokens: 900 });
  const parsed = parseJSON(result);
  if (!parsed) throw new Error('BAD_JSON');
  return parsed;
}

export async function analyzeMealPhoto(dataUrl, goals, dietPreference = '') {
  const result = await callGemini([
    { text: `${nutritionRules(dietPreference)}
Estimate the meal shown in this image. Goals: ${goals.calories} kcal and ${goals.protein}g protein.
Return:
{"description":"","nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0},"confidence":"low|medium|high"}` },
    { inlineData: { mimeType: 'image/jpeg', data: base64Strip(dataUrl) } },
  ], { json: true, maxTokens: 900 });
  const parsed = parseJSON(result);
  if (!parsed) throw new Error('BAD_JSON');
  return parsed;
}

export async function analyzeMealCombined(text, dataUrl, goals, dietPreference = '') {
  const result = await callGemini([
    { text: `${nutritionRules(dietPreference)}
Use both the image and the note. The text overrides the image if they conflict.
Note: "${text}".
Goals: ${goals.calories} kcal and ${goals.protein}g protein.
Return:
{"description":"","nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0},"confidence":"low|medium|high"}` },
    { inlineData: { mimeType: 'image/jpeg', data: base64Strip(dataUrl) } },
  ], { json: true, maxTokens: 900 });
  const parsed = parseJSON(result);
  if (!parsed) throw new Error('BAD_JSON');
  return parsed;
}

export async function scoreDailyActivity(todayLog, sevenDayAvg, goals) {
  const result = await callGemini([{
    text: `Score this day for a life tracker.
Today: ${JSON.stringify(todayLog)}
7 day average: ${JSON.stringify(sevenDayAvg)}
Goals: ${JSON.stringify(goals)}
Return:
{"activityScore":0,"outputScore":0,"llmNote":""}`,
  }], { json: true, maxTokens: 500 });
  const parsed = parseJSON(result);
  if (!parsed) throw new Error('BAD_JSON');
  return parsed;
}

export async function generateWeeklyInsight(last7DayScores, rollingSummary, goals) {
  const result = await callGemini([{
    text: `Write a short weekly insight and update the rolling summary.
Last 7 days: ${JSON.stringify(last7DayScores)}
Rolling summary: ${JSON.stringify(rollingSummary)}
Goals: ${JSON.stringify(goals)}
Return:
{"insight":"","rollingSummary":{"last_updated":"YYYY-MM-DD","avg_activity_score":0,"avg_output_score":0,"notable_patterns":"","current_trend":"improving","streak_record":0}}`,
  }], { json: true, maxTokens: 1100, temperature: 0.5 });
  const parsed = parseJSON(result);
  if (!parsed) throw new Error('BAD_JSON');
  return parsed;
}

export async function suggestHabits(profile) {
  const result = await callGemini([{
    text: `Suggest 4 habits for this user.
Profile: ${JSON.stringify({
      age: profile.age,
      sex: profile.sex,
      activityLevel: profile.activityLevel,
      dietPreference: profile.dietPreference,
      goals: profile.goals,
    })}
Return only a JSON array:
[{"name":"","icon":"","category":"Sleep|Diet|Fitness|Mind|Focus"}]`,
  }], { json: true, maxTokens: 500 });
  const parsed = parseJSON(result);
  if (!Array.isArray(parsed)) throw new Error('BAD_JSON');
  return parsed;
}

export async function hasKey() {
  return Boolean((await getProfile()).geminiApiKey);
}

export async function setKey(key) {
  await saveProfile({ geminiApiKey: key.trim() });
}
