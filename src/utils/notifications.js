// AscendRPG push notification system
// Uses SW showNotification for installed PWA background support,
// falls back to Notification API when SW is not controlling the page.

const ICON = '/leveld/icon-192.png'
const BADGE = '/leveld/icon-192.png'
const LAST_NOTIF_KEY = 'ascend_last_notif_ts'
const HOUR_MS = 60 * 60 * 1000

export function notificationsSupported() {
  return 'Notification' in window
}

export function notificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function requestPermission() {
  if (!notificationsSupported()) return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

async function showViaSW(title, body, tag) {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, {
      body,
      icon: ICON,
      badge: BADGE,
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: window.location.href },
    })
    return true
  } catch {
    return false
  }
}

export async function showNotification(title, body, tag = 'ascend') {
  if (Notification.permission !== 'granted') return
  const viaSW = await showViaSW(title, body, tag)
  if (!viaSW) {
    new Notification(title, { body, icon: ICON, tag })
  }
}

// ── Hourly notification content ───────────────────────────────────────────

function getHourlyContent(state) {
  const hour = new Date().getHours()
  const { character, habits, cravings, nutrition } = state

  const today = new Date().toISOString().split('T')[0]
  const dailyHabits = (habits || []).filter(h => h.frequency === 'daily' && h.type === 'positive')
  const doneTodayCount = dailyHabits.filter(h => h.completions?.[today]).length
  const leftToday = dailyHabits.length - doneTodayCount
  const streak = character?.streak || 0
  const name = character?.name || 'Warrior'
  const resistedCravings = (cravings || []).filter(c => c.resisted).length
  const caloriesTarget = nutrition?.dailyCalories || 0
  const goalType = nutrition?.goalType || 'lose'

  // Time-aware content pools
  if (hour >= 5 && hour < 9) {
    const pool = [
      { title: '☀️ Morning, ' + name, body: 'Time to start your routine. The discipline begins now.' },
      { title: '⚔️ AscendRPG', body: `Rise. ${leftToday} habits waiting. Your streak is at ${streak} days.` },
      { title: '🌅 New Day', body: 'Yesterday is logged. Today is a blank slate. Use it.' },
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  if (hour >= 9 && hour < 12) {
    const pool = [
      { title: '⚔️ Quest Check', body: `${doneTodayCount}/${dailyHabits.length} quests done. ${leftToday > 0 ? leftToday + ' left.' : 'On track.'}` },
      { title: caloriesTarget ? '🍽️ Meal Check' : '⚔️ AscendRPG', body: caloriesTarget ? `Tracking your ${goalType === 'lose' ? 'deficit' : 'surplus'} today? Log your meals.` : `${name}, the morning isn't over. Stay on it.` },
      { title: '🔥 Streak Alert', body: streak > 0 ? `${streak}-day streak. Don't be the one who breaks it today.` : 'Start your streak today. One habit, right now.' },
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  if (hour >= 12 && hour < 15) {
    const pool = [
      { title: '🍎 Midday Check', body: caloriesTarget ? `Staying in your ${goalType === 'lose' ? 'deficit' : 'surplus'}? Log your lunch.` : `${name}, lunch is a habit too. Stay consistent.` },
      { title: '⚔️ AscendRPG', body: `${doneTodayCount} done. ${leftToday} habits remain. The afternoon is yours.` },
      { title: '💧 Hydration', body: 'Have you hit your water intake today? 8 glasses. Non-negotiable.' },
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  if (hour >= 15 && hour < 18) {
    const pool = [
      { title: '⚡ Bonus Window', body: 'Check your bonus challenge — it might be active. 2× XP.' },
      { title: '🏋️ Workout Time?', body: `${name}, if a workout was planned today — now is the window.` },
      { title: '⚔️ Quest Update', body: `${leftToday > 0 ? leftToday + ' quests still open.' : 'All quests done!'} Boss at ${100 - (dailyHabits.length ? Math.round((doneTodayCount / dailyHabits.length) * 100) : 0)}% HP.` },
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  if (hour >= 18 && hour < 21) {
    const pool = [
      { title: '🌆 Evening Push', body: leftToday > 0 ? `${leftToday} habits left. Clock's running.` : `All done, ${name}. Solid day.` },
      { title: '🍽️ Dinner Log', body: 'Log your dinner before you forget the macros. Future you will thank you.' },
      { title: '🔥 Streak Defense', body: streak > 2 ? `${streak} days. Don't let it end tonight.` : 'Build your streak. Complete one habit now.' },
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // 9pm–midnight — wind down
  const pool = [
    { title: '🌙 Wind Down', body: `${leftToday > 0 ? leftToday + ' quests unfinished. Last chance.' : 'Quests done.'} Log everything before midnight.` },
    { title: '💤 Sleep Protocol', body: 'Screens off soon. Sleep protects your streak more than any habit.' },
    { title: '⚔️ Day Summary', body: `${doneTodayCount}/${dailyHabits.length} habits · ${streak}d streak · ${resistedCravings} cravings resisted.` },
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Interval manager ──────────────────────────────────────────────────────

let _intervalId = null

export function startHourlyNotifications(getState) {
  if (_intervalId) return // already running

  const fire = async () => {
    if (Notification.permission !== 'granted') return
    const state = getState()
    const { title, body } = getHourlyContent(state)
    await showNotification(title, body, 'ascend-hourly')
    localStorage.setItem(LAST_NOTIF_KEY, String(Date.now()))
  }

  // Check if we missed the last hour while app was closed
  const lastTs = parseInt(localStorage.getItem(LAST_NOTIF_KEY) || '0')
  if (Date.now() - lastTs > HOUR_MS) {
    setTimeout(fire, 3000) // slight delay on startup so app can load first
  }

  _intervalId = setInterval(fire, HOUR_MS)
}

export function stopHourlyNotifications() {
  if (_intervalId) { clearInterval(_intervalId); _intervalId = null }
}

export function fireTestNotification(getState) {
  const state = getState()
  const { title, body } = getHourlyContent(state)
  return showNotification(title + ' (test)', body, 'ascend-test')
}
