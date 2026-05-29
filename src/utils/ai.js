const BASE_URL = 'https://api.openai.com/v1'

export async function callOpenAI(apiKey, messages, model = 'gpt-4o-mini', maxTokens = 300) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
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
  const philosopher = { Warrior: 'Marcus Aurelius', Mage: 'Epictetus', Rogue: 'Seneca' }[character.class] || 'Marcus Aurelius'
  const resisted = craving.resisted
  const prompt = resisted
    ? `You are ${philosopher} speaking directly to ${character.name}, a level ${character.level} ${character.class} with a ${streak}-day streak who just RESISTED a ${craving.type} craving (intensity ${craving.intensity}/10). Write a short stoic celebration (2-3 sentences max). Be epic, class-specific. No hashtags.`
    : `You are ${philosopher} speaking directly to ${character.name}, a level ${character.level} ${character.class} who just gave in to a ${craving.type} craving (intensity ${craving.intensity}/10). Write a brief stoic consequence framing (2 sentences max). No lecture, no hashtags.`

  return callOpenAI(apiKey, [{ role: 'user', content: prompt }])
}

export async function getNegativeHabitMessage(apiKey, { character, habit, count }) {
  const philosopher = { Warrior: 'Marcus Aurelius', Mage: 'Epictetus', Rogue: 'Seneca' }[character.class] || 'Marcus Aurelius'
  const tone = count === 1 ? 'compassionate' : count === 2 ? 'firm' : 'very firm'
  const prompt = `You are ${philosopher}. ${character.name} logged the negative habit "${habit.name}" for the ${count === 1 ? '1st' : count === 2 ? '2nd' : '3rd+'} time today. Be ${tone}. 2 sentences max. No hashtags.`
  return callOpenAI(apiKey, [{ role: 'user', content: prompt }])
}

export async function getLevelUpMessage(apiKey, { character }) {
  const philosopher = { Warrior: 'Marcus Aurelius', Mage: 'Epictetus', Rogue: 'Seneca' }[character.class] || 'Marcus Aurelius'
  const prompt = `You are ${philosopher}. ${character.name} just reached level ${character.level} as a ${character.class}. Write an epic stoic congratulation (2-3 sentences). Be dramatic and inspiring. No hashtags.`
  return callOpenAI(apiKey, [{ role: 'user', content: prompt }])
}

export async function analyzeFoodPhoto(apiKey, imageBase64) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this food image. Return ONLY a JSON object with keys: name (string), calories (number), protein_g (number), carbs_g (number), fat_g (number). No other text.',
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
      ],
      max_tokens: 200,
    }),
  })
  const data = await res.json()
  const text = data.choices[0].message.content.trim()
  const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(jsonStr)
}

export async function generateQuestNarrative(apiKey, { character, habits }) {
  const philosopher = { Warrior: 'Marcus Aurelius', Mage: 'Epictetus', Rogue: 'Seneca' }[character.class] || 'Marcus Aurelius'
  const habitList = habits.slice(0, 3).map(h => h.name).join(', ')
  const prompt = `You are ${philosopher} addressing ${character.name}, a level ${character.level} ${character.class}. Generate a dramatic quest briefing for today's missions: ${habitList}. Include a villain name and epic framing. 3 sentences max. No hashtags.`
  return callOpenAI(apiKey, [{ role: 'user', content: prompt }])
}

export async function getDailyCoachMessage(apiKey, { character, stats }) {
  const philosopher = { Warrior: 'Marcus Aurelius', Mage: 'Epictetus', Rogue: 'Seneca' }[character.class] || 'Marcus Aurelius'
  const prompt = `You are ${philosopher} as an AI coach for ${character.name}, a level ${character.level} ${character.class} with a ${character.streak}-day streak. Stats: HP ${character.hp}/${character.maxHp}, ${stats.habitsCompleted || 0} habits done today. Give a personalized 2-sentence motivational message for today. No hashtags.`
  return callOpenAI(apiKey, [{ role: 'user', content: prompt }])
}
