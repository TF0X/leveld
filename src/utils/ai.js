const BASE_URL = 'https://api.openai.com/v1'

// Knowledge base context baked into all AI calls
function getKBContext(character) {
  const philosopher = { Warrior: 'Marcus Aurelius', Mage: 'Epictetus', Rogue: 'Seneca' }[character?.class] || 'Marcus Aurelius'
  return `You are ${philosopher}, acting as an AI coach inside AscendRPG.

Core coaching principles you always apply (from Rohan Gupta's fat loss system):
- NEAT (daily steps, movement) beats extra cardio for sustainable fat loss — mention steps over cardio
- Sleep is the single most powerful recovery tool — prioritize it before adding cardio
- Protein distribution across meals matters more than just hitting a daily total
- Refeeds and diet breaks are not cheating — they are strategic tools that restore hormones and performance
- Consistency at 90% over weeks beats perfection for 2 weeks then quitting
- Fat loss cycle: Lose → Reward → Reset → Adjust → Repeat
- Gut health supports fat loss — probiotics, fibre, hydration matter
- The 1-1-1-Fibre meal formula: Protein + Carb + Fat + Fibre every meal

Class-specific voice:
${philosopher === 'Marcus Aurelius' ? '- Marcus Aurelius: Direct, stoic, discipline-focused. Physical action is virtue. Short sentences. "The body must be trained as the mind."' : ''}
${philosopher === 'Epictetus' ? '- Epictetus: Philosophical, calm, internal focus. Control what you can. "It is not what happens but how you respond."' : ''}
${philosopher === 'Seneca' ? '- Seneca: Witty, sharp, urgency of time. Consistency is the path. "Begin. The rest follows."' : ''}

Always be concise. Max 3 sentences unless instructed otherwise. No hashtags. No emojis in stoic messages.`
}

async function callOpenAI(apiKey, messages, model = 'gpt-4o-mini', maxTokens = 300) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.85 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
  }
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

export async function testApiKey(apiKey) {
  try {
    await callOpenAI(apiKey, [{ role: 'user', content: 'Say "OK"' }], 'gpt-4o-mini', 5)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export async function getCravingMessage(apiKey, { character, craving, streak }) {
  const sys = getKBContext(character)
  const resisted = craving.resisted
  const prompt = resisted
    ? `${character.name} (Level ${character.level} ${character.class}, ${streak}-day streak) just RESISTED a ${craving.type} craving (intensity ${craving.intensity}/10) after the urge surfing timer. Write a 2-sentence stoic celebration. Be epic and class-specific.`
    : `${character.name} (Level ${character.level} ${character.class}) gave in to a ${craving.type} craving (intensity ${craving.intensity}/10). Write 2 sentences: brief consequence framing, no lecture, end with one forward-looking line about tomorrow.`
  return callOpenAI(apiKey, [{ role: 'system', content: sys }, { role: 'user', content: prompt }])
}

export async function getNegativeHabitMessage(apiKey, { character, habit, count }) {
  const sys = getKBContext(character)
  const tone = count === 1 ? 'compassionate but direct' : count === 2 ? 'firm, no sugarcoating' : 'very firm, consequences are clear'
  const prompt = `${character.name} logged the negative habit "${habit.name}" for the ${count === 1 ? '1st' : count === 2 ? '2nd' : '3rd+'} time today. Tone: ${tone}. 2 sentences max.`
  return callOpenAI(apiKey, [{ role: 'system', content: sys }, { role: 'user', content: prompt }])
}

export async function getLevelUpMessage(apiKey, { character }) {
  const sys = getKBContext(character)
  const prompt = `${character.name} just reached Level ${character.level} as a ${character.class}. Write an epic 2-sentence stoic congratulation. Be dramatic and class-specific.`
  return callOpenAI(apiKey, [{ role: 'system', content: sys }, { role: 'user', content: prompt }])
}

// Estimate macros from a text description — no photo needed
export async function estimateFoodFromText(apiKey, description) {
  const prompt = `You are a nutritionist. Estimate the macros for: "${description}"
Return ONLY a JSON object — no markdown, no explanation:
{"name": "food name", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
Use common Indian portion sizes where relevant. Be accurate.`
  const text = await callOpenAI(apiKey, [{ role: 'user', content: prompt }], 'gpt-4o-mini', 150)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

export async function analyzeFoodPhoto(apiKey, imageBase64) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this food image. Return ONLY a JSON object with keys: name (string), calories (number), protein_g (number), carbs_g (number), fat_g (number). Be specific for Indian foods when relevant. No other text.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 200,
    }),
  })
  const data = await res.json()
  const text = data.choices[0].message.content.trim()
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
}

export async function generateQuestNarrative(apiKey, { character, habits }) {
  const sys = getKBContext(character)
  const habitList = habits.slice(0, 3).map(h => h.name).join(', ')
  const prompt = `Generate a dramatic 2-sentence RPG quest briefing for ${character.name} (Level ${character.level} ${character.class}). Today's missions: ${habitList}. Name a villain they must defeat. Keep it punchy.`
  return callOpenAI(apiKey, [{ role: 'system', content: sys }, { role: 'user', content: prompt }])
}

export async function getDailyCoachMessage(apiKey, { character, stats, nutrition }) {
  const sys = getKBContext(character)
  const deficitInfo = nutrition?.deficitMode ? `Deficit mode: ${nutrition.deficitMode}. Daily target: ${nutrition.dailyCalories} kcal.` : ''
  const prompt = `Coach message for ${character.name} (Level ${character.level} ${character.class}, ${character.streak}-day streak). HP: ${character.hp}/${character.maxHp}. Habits done today: ${stats?.habitsCompleted || 0}. ${deficitInfo} Write a personalized 2-sentence message for today. Apply the coaching principles you know.`
  return callOpenAI(apiKey, [{ role: 'system', content: sys }, { role: 'user', content: prompt }])
}

export async function getRefeedMessage(apiKey, { character }) {
  const sys = getKBContext(character)
  const prompt = `${character.name} has earned a Refeed Day — they've been 100% consistent. Write 2 sentences in your voice explaining WHY eating more today (extra clean carbs) is a strategic weapon, not weakness. Make it motivating.`
  return callOpenAI(apiKey, [{ role: 'system', content: sys }, { role: 'user', content: prompt }])
}

export async function getDietBreakMessage(apiKey, { character }) {
  const sys = getKBContext(character)
  const prompt = `${character.name} has earned a 7-day Diet Break after 14 days of aggressive deficit. Write 2 sentences explaining the strategic logic — hormones reset, metabolism recovers, performance returns. Make the warrior feel proud not guilty.`
  return callOpenAI(apiKey, [{ role: 'system', content: sys }, { role: 'user', content: prompt }])
}

export async function generateDailyQuests(apiKey, { character, dateStr }) {
  const prompt = `Generate 4 short daily quests for ${character.name} (Level ${character.level} ${character.class}).
One per category: social, diet, hobby, control. Make them specific and achievable in one day.

Return ONLY valid JSON array, no markdown:
[
  { "category": "social",  "title": "quest in 8 words max" },
  { "category": "diet",    "title": "quest in 8 words max" },
  { "category": "hobby",   "title": "quest in 8 words max" },
  { "category": "control", "title": "quest in 8 words max" }
]

social=connection/limits, diet=food/water/macros, hobby=skill/learning/creativity, control=willpower/sleep/focus.
Warrior: physical bias. Mage: learning bias. Rogue: stealth/consistency bias.`
  const text = await callOpenAI(apiKey, [{ role: 'user', content: prompt }], 'gpt-4o-mini', 300)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const items = JSON.parse(cleaned)
  return items.map(q => ({ ...q, id: `${dateStr}_${q.category}`, isAI: true, completed: false }))
}

export async function generateWeeklyQuest(apiKey, { character, weekKey }) {
  const prompt = `Generate one hard weekly challenge quest for ${character.name} (Level ${character.level} ${character.class}), week of ${weekKey}.
Multi-day, requires consistent effort. Ties to real discipline or health habit.

Return ONLY valid JSON, no markdown:
{
  "title": "Epic quest title (5-7 words)",
  "description": "What must be done this week (1-2 sentences, specific and class-appropriate)",
  "category": "physical|mental|discipline|social"
}

Examples: no junk food for 7 days, meditate every morning, hit step goal 5 days, call 3 people this week.`
  const text = await callOpenAI(apiKey, [{ role: 'user', content: prompt }], 'gpt-4o-mini', 250)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  const data = JSON.parse(cleaned)
  return { ...data, weekKey, completed: false, progress: 0 }
}

export async function generateWeeklyTitle(apiKey, { character, stats }) {
  const prompt = `Generate a dramatic one-line RPG title for ${character.name}'s week.
Stats this week: habits ${stats.habitsCompletedPct}% done, workouts: ${stats.workoutsThisWeek}, cravings resisted: ${stats.cravingsResisted}, bad days: ${stats.negativeDays}.

Return ONLY valid JSON, no markdown:
{ "title": "The [Adj] [Noun] (3-5 words)", "sentiment": "positive|negative|neutral" }

>=70% = positive ("The Iron Discipline", "The Unbroken Fortress"), <40% = negative ("The Week of Soft Excuses", "The Stagnant Swamp"), else neutral ("The Unsteady Climb").`
  const text = await callOpenAI(apiKey, [{ role: 'user', content: prompt }], 'gpt-4o-mini', 100)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

export async function generateWeeklyBoss(apiKey, { character, weekKey }) {
  const prompt = `Generate a unique weekly RPG boss monster for a self-improvement game. Week: ${weekKey}. Player class: ${character.class}.
The monster embodies the player's laziness, excuses, junk food, and skipped routines. Make it feel personal and threatening.

Return ONLY valid JSON, no markdown, no extra text:
{
  "name": "The [Adjective] [CreatureName]",
  "type": "golem|dragon|specter|demon|beast",
  "lore": "One sentence about what bad habit or failure this monster was born from.",
  "weakness": "2-3 words naming its weakness (e.g. Morning Routines, Deep Sleep, Consistent Effort)",
  "palette": {
    "body": "#hexcolor",
    "accent": "#hexcolor",
    "eye": "#hexcolor",
    "glow": "#hexcolor"
  }
}

Rules:
- type must be exactly one of: golem, dragon, specter, demon, beast
- palette must be dark and sinister — deep purples, sickly greens, blood reds, ashen grays
- name must feel like a real villain boss (e.g. "The Calcified Sloth Titan", "The Midnight Craving Wraith")
- lore ties the monster to a real bad habit: skipped workouts, late night snacking, broken sleep
- weakness ties to a real positive habit or discipline`

  const text = await callOpenAI(apiKey, [{ role: 'user', content: prompt }], 'gpt-4o-mini', 350)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

/**
 * Generate a full workout split based on available equipment.
 * Returns: { name, daysPerWeek, cardioNote, days: [{ label, exercises: [{ name, sets, reps, muscleGroup }] }] }
 */
export async function generateExercisesFromEquipment(apiKey, { equipment, daysPerWeek, goal }) {
  const goalDesc = goal === 'lose' ? 'fat loss (preserve muscle)' : goal === 'bulk' ? 'muscle building' : 'general fitness'
  const prompt = `You are a strength & conditioning coach. Create a ${daysPerWeek}-day workout split for someone with ONLY this equipment: "${equipment}".
Goal: ${goalDesc}.

Return ONLY valid JSON, no markdown, no explanation:
{
  "name": "Custom ${equipment} Program",
  "daysPerWeek": ${daysPerWeek},
  "cardioNote": "brief cardio note",
  "days": [
    {
      "label": "Day 1 — Muscle Group",
      "exercises": [
        { "name": "Exercise Name", "sets": 3, "reps": "8-12", "muscleGroup": "Chest" }
      ]
    }
  ]
}

Rules:
- ONLY include exercises possible with the listed equipment
- 4-6 exercises per day
- Include warm-up-friendly compound movements first
- Sets: 2-4, Reps: expressed as range e.g. "8-12" or "10-15" or "30 sec"
- Label days clearly (Push/Pull/Legs or Upper/Lower or muscle group names)
- cardioNote: one line for post-session cardio recommendation`

  const text = await callOpenAI(apiKey, [{ role: 'user', content: prompt }], 'gpt-4o', 1200)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}
