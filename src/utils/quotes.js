// Free quote APIs — no key required
// Primary: Quotable API
// Fallback: local stoic quotes

const FALLBACK_QUOTES = [
  { content: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { content: "He who is brave is free.", author: "Seneca" },
  { content: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { content: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { content: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { content: "It is not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { content: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { content: "Very little is needed to make a happy life; it is all within yourself.", author: "Marcus Aurelius" },
  { content: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { content: "No man is free who is not master of himself.", author: "Epictetus" },
  { content: "First say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
  { content: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { content: "The whole future lies in uncertainty: live immediately.", author: "Seneca" },
  { content: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { content: "Accept the things to which fate binds you.", author: "Marcus Aurelius" },
]

const CACHE_KEY = 'ascend_quote_cache'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function fetchFreshQuote() {
  // Check cache
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return { content: cached.content, author: cached.author }
    }
  } catch {}

  // Try Quotable API
  try {
    const res = await fetch('https://api.quotable.io/random?tags=stoicism|philosophy|success|mindfulness', {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const data = await res.json()
      const quote = { content: data.content, author: data.author }
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...quote, ts: Date.now() }))
      return quote
    }
  } catch {}

  // Fallback: local quotes
  const idx = Math.floor(Date.now() / (1000 * 60 * 60)) % FALLBACK_QUOTES.length
  return FALLBACK_QUOTES[idx]
}
