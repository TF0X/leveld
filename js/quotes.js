// Motivational quotes — public API (dummyjson) + curated pragmatic-absurdist bank.
const PA_QUOTES = [
  { q: "The universe is indifferent. Your deadlift isn't.", a: "Pragmatic Absurdism" },
  { q: "Nothing means anything. That means your excuses don't either.", a: "Pragmatic Absurdism" },
  { q: "Camus said roll the boulder. He didn't say skip leg day.", a: "Leveld" },
  { q: "The void stares back. Log your macros first.", a: "Pragmatic Absurdism" },
  { q: "Existence is meaningless. Your streak isn't.", a: "Leveld" },
  { q: "There is no why. There is only how hard.", a: "Pragmatic Absurdism" },
  { q: "Life is absurd. Might as well be absurdly strong.", a: "Leveld" },
  { q: "The heat death of the universe is inevitable. Your PR is today.", a: "Pragmatic Absurdism" },
  { q: "Meaning is made, not found. Make it with reps.", a: "Pragmatic Absurdism" },
  { q: "One must imagine Sisyphus jacked.", a: "Albert Camus (probably)" },
  { q: "God is dead. Your protein goal isn't.", a: "Nietzsche, extended" },
  { q: "The rebellion against meaninglessness starts with showing up.", a: "Pragmatic Absurdism" },
  { q: "Chaos is the default. Discipline is the flex.", a: "Leveld" },
  { q: "You didn't ask to exist. But you're here — win something.", a: "Pragmatic Absurdism" },
  { q: "The cosmos has no opinion on your physique. That's the point.", a: "Pragmatic Absurdism" },
  { q: "Act without hope of cosmic reward. Act anyway.", a: "Pragmatic Absurdism" },
  { q: "Nothing lasts. Log it before it's gone.", a: "Leveld" },
  { q: "In the face of infinity, the only sane response is reps.", a: "Pragmatic Absurdism" },
  { q: "You are stardust performing a deadlift. Respect that.", a: "Leveld" },
  { q: "Purpose is a story you tell yourself. Make it a good one.", a: "Pragmatic Absurdism" },
  { q: "The absurd hero doesn't ask for a reason. He sets a PR.", a: "Leveld" },
  { q: "Time moves in one direction. Use it.", a: "Physics, probably" },
  { q: "There are no guarantees. That's why you track everything.", a: "Pragmatic Absurdism" },
  { q: "Embrace the void. Eat protein. Sleep. Repeat.", a: "Leveld" },
  { q: "Free will is debatable. Your next set isn't.", a: "Pragmatic Absurdism" },
  { q: "The world will end eventually. Not today. Train today.", a: "Leveld" },
  { q: "Suffering is certain. Might as well suffer productively.", a: "Pragmatic Absurdism" },
  { q: "You are temporary. Your habits outlive your moods.", a: "Pragmatic Absurdism" },
  { q: "There is no finish line. Run anyway.", a: "Leveld" },
  { q: "The universe owes you nothing. Charge interest anyway.", a: "Pragmatic Absurdism" },
];

const LABELS = ['🌌 ABSURD TRUTH', '💡 DAILY DOSE', '🔥 MINDSET', '⚡ SIGNAL', '🧠 PHILOSOPHY', '💀 REAL TALK'];

export async function fetchQuote() {
  if (Math.random() < 0.35) {
    return PA_QUOTES[Math.floor(Math.random() * PA_QUOTES.length)];
  }
  try {
    const res = await Promise.race([
      fetch('https://dummyjson.com/quotes/random'),
      new Promise((_, rej) => setTimeout(() => rej(), 4000)),
    ]);
    if (!res.ok) throw new Error();
    const d = await res.json();
    return { q: d.quote, a: d.author };
  } catch {
    return PA_QUOTES[Math.floor(Math.random() * PA_QUOTES.length)];
  }
}

function highlightFirst(text) {
  const words = text.split(' ');
  const n = Math.min(4, Math.ceil(words.length * 0.28));
  const head = words.slice(0, n).join(' ');
  const tail = words.slice(n).join(' ');
  return `<span class="qt-hi">${head}</span>${tail ? ' ' + escHtml(tail) : ''}`;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function randomLabel() {
  return LABELS[Math.floor(Math.random() * LABELS.length)];
}

export function renderQuoteCard(el, quote) {
  el.innerHTML = `
    <div class="qt-label">${randomLabel()}</div>
    <div class="qt-body">
      <span class="qt-mark">"</span>
      <p class="qt-text">${highlightFirst(escHtml(quote.q))}</p>
    </div>
    <div class="qt-footer">
      <span class="qt-author">— ${escHtml(quote.a)}</span>
      <span class="qt-hint">tap ↻</span>
    </div>
  `;
  el.classList.remove('qt-in');
  void el.offsetWidth;
  el.classList.add('qt-in');
}

export async function initQuoteCard(el) {
  if (!el) return;
  let current = await fetchQuote();
  renderQuoteCard(el, current);

  el.addEventListener('click', async () => {
    el.classList.add('qt-tap');
    setTimeout(() => el.classList.remove('qt-tap'), 160);
    const next = await fetchQuote();
    renderQuoteCard(el, next);
  });
}
