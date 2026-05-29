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
