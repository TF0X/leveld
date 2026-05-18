# LevelD — Logic & Architecture Reference (v2)

> **Changelog from v1**
> - Reward system consolidated from 5 stacked systems → **Streak + Level** as primary, achievements as secondary milestone-only.
> - `water` moved from profile fields into its own `water` object store with date keys.
> - `lastChallengePenaltyDate` removed (was dead).
> - 37 ranks compressed to **12 meaningful tiers**.
> - Added: Phone-first PWA UI spec, onboarding flow, notification scheduling, meal templates, full-text search, reorderable home cards.

---

## Overview

LevelD is an offline-first PWA life tracker. No backend, no auth. All data lives in the browser via IndexedDB. Gamification, scoring, and streak logic run entirely client-side. Gemini 2.5 Flash is the only external dependency and is only called for meal parsing, daily scoring narration, and weekly insight generation.

---

## Stack

| Concern | Technology |
|---|---|
| Storage | IndexedDB via `idb` v8 (ESM from CDN) |
| AI | Gemini 2.5 Flash REST API |
| Charts | Chart.js |
| Offline | Service Worker (cache-first) |
| Runtime | Vanilla ESM modules, no bundler |
| Search | Local in-memory inverted index, rebuilt on app open |

---

## Data Layer (`js/db.js`)

### Database

- Name: `lifetracker`, Version: `3` (bumped for water store + cleanup).
- Singleton `_db` — opened once, reused.

### Object Stores

| Store | Key | Index | Purpose |
|---|---|---|---|
| `profile` | `id` (always `"user"`) | — | Single user record + settings |
| `meals` | autoIncrement | `date`, `descriptionLower` | Per-meal nutrition logs |
| `workouts` | autoIncrement | `date` | Workout sessions with exercises |
| `hobbies` | autoIncrement | `date` | Hobby time log entries |
| `bodyMetrics` | `date` | — | Daily bodyweight (one per day) |
| `dailyScores` | `date` | — | Computed activity/output scores |
| `personalRecords` | `exerciseName` | — | Best weight per exercise |
| `habits` | autoIncrement | — | Habit definitions |
| `habitLogs` | autoIncrement | `date`, `habitId` | Daily habit completions |
| `water` | `date` | — | **NEW** — Daily water intake in ml |
| `mealTemplates` | autoIncrement | `useCount` | **NEW** — Saved/auto-suggested meal entries |
| `notifSchedule` | `id` | — | **NEW** — User-defined notification rules |

### Profile Shape (defaults)

```js
{
  id: 'user',
  name, geminiApiKey,
  age, sex, heightCm, activityLevel, calorieGoalPreset, dietPreference,
  goals: { calories: 2200, protein: 150, water: 3000, workoutsPerWeek: 4, hobbyMinutes: 60 },
  hobbies: [],          // [{ id, name, icon, dailyGoalMinutes }]
  level: 1, totalXP: 0,
  streak: 0, lastLoggedDate: null, freezeTokens: 0, streakRecord: 0,
  achievements: [],
  rollingSummary: null,
  lastBackup: null,
  lastInsightWeek: null, insight: null,
  onboardingComplete: false,                    // NEW
  homeCardOrder: ['streak','ring','quickLog',   // NEW — reorderable
                  'quests','habits'],
  notifQuietHours: { start: 22, end: 7 },       // NEW
}
```

**Removed from profile (now elsewhere or deleted):**
- `waterToday`, `waterDate` → moved to `water` store
- `hourlyNotifEnabled` → replaced by `notifSchedule` store
- `lastChallengePenaltyDate` → dead field, deleted in v3 migration

`getProfile()` always deep-merges defaults so new fields never come back `undefined` after a DB upgrade.

### v3 Migration

Triggered in `onupgradeneeded` when oldVersion < 3:
1. Create `water`, `mealTemplates`, `notifSchedule` stores.
2. Read existing profile. If `waterToday > 0` and `waterDate` set, write one record to `water` store, then delete those fields.
3. Delete `lastChallengePenaltyDate`, `hourlyNotifEnabled` from profile.
4. Backfill `homeCardOrder` and `onboardingComplete: true` for existing users (so they don't see the wizard).

### Key Helpers

- `getByDate(store, date)` — IDB index range query for a single date string `YYYY-MM-DD`
- `getByDateRange(store, start, end)` — bounded IDB range query
- `bulkImport(payload)` — clears every store and repopulates from an export JSON; used by the import flow
- `todayStr()` / `dateStr(d)` — format dates as `YYYY-MM-DD` without timezone drift

---

## Gamification Engine (`js/gamification.js`)

> **Design principle:** Two reward systems only. **Streak** drives daily return. **Level** drives long-term progression. Achievements exist but are rare milestone unlocks, not a parallel grind.

### Removed in v2

- ❌ Daily quests with their own XP rewards (was redundant with base XP).
- ❌ PR overlay awarding 100 XP (still tracks PRs, just doesn't spam XP).
- ❌ 27 of 37 ranks (consolidated to 12).
- ❌ Macro streak achievement (too noisy to compute reliably).

### XP & Levels

Level curve: `xpForLevel(n) = Math.floor(100 * n^1.5)`

| Level | XP threshold |
|---|---|
| 1 → 2 | 100 |
| 5 → 6 | 557 |
| 10 → 11 | 3,162 |
| 20 → 21 | 8,944 |

### XP Sources (consolidated)

| Action | Base XP |
|---|---|
| Log a meal | 8 |
| Log a workout | 25 |
| Log a hobby session | 12 |
| Log bodyweight | 5 |
| Log water (per 250ml) | 2 |
| Complete a habit | 8 |
| Hit daily protein goal | 15 (once/day) |
| Beat a personal record | tracked silently, surfaced in achievements |

`awardXP(base, reason)`:
1. Calls `markLoggedToday()` to tick the streak.
2. Reads current streak, applies multiplier.
3. Adds XP, walks level-up loop.
4. Persists via `saveProfile`.
5. Fires `lt:refresh-home` DOM event.

`rawAwardXP` — same but skips `markLoggedToday`. Used for streak milestone bonuses to avoid double-counting.

### Streak Multipliers

| Streak | Multiplier |
|---|---|
| < 3 days | 1.0× |
| ≥ 3 days | 1.1× |
| ≥ 7 days | 1.25× |
| ≥ 14 days | 1.5× |
| ≥ 30 days | 2.0× |

### Streak Lifecycle

**On app open** — `checkStreakOnOpen()`:
- If `lastLoggedDate` is today → no-op.
- If `lastLoggedDate` is yesterday (`diff === 1`) → no-op, user has until end of today.
- If gap > 1 day: consume `freezeTokens` for missed days. If tokens cover it, backdate `lastLoggedDate` to yesterday. If not enough tokens, reset streak to 0.

**On first log of the day** — `markLoggedToday()`:
- `diff === 1` → `streak + 1`
- anything else → `streak = 1`
- Every 7th streak day earns a freeze token (max 3 banked).
- Streak milestones: 7d → 200 XP; 30d → 500 XP + `streak_30` unlock; 100d → 1500 XP + `streak_100` unlock.

### Ranks (consolidated)

| Level range | Rank |
|---|---|
| 1–2 | Couch Potato |
| 3–5 | Beginner |
| 6–9 | Consistent |
| 10–14 | Disciplined |
| 15–19 | Committed |
| 20–24 | Athlete |
| 25–29 | Veteran |
| 30–34 | Elite |
| 35–39 | Beast |
| 40–49 | Machine |
| 50–59 | Legend |
| 60+ | GOD MODE |

`rankFor(level)` walks the list and returns the highest rank reached.

### Daily Score Computation (`computeDailyScoreLocal`)

Runs locally with no API call. Both scores cap at 100.

**Activity Score** (did they show up):

| Event | Points |
|---|---|
| ≥ 1 meal | +20 |
| ≥ 2 meals | +15 |
| ≥ 3 meals | +15 |
| Workout logged | +30 |
| Hobby logged | +10 |
| Weight logged | +10 |
| ≥ 1 habit | +10 |
| ≥ 3 habits | +5 |

**Output Score** (how hard did they work):

| Component | Max | Formula |
|---|---|---|
| Calorie accuracy | 30 | `30 - abs(actual - goal) / goal * 60`, floored at 0 |
| Protein goal | 25 | full 25 if hit, else `protein/goal * 18` |
| Workout volume vs avg | 25 | `todayVol / avgVol * 25` capped; 15 if first ever workout |
| Hobby minutes | 20 | `hobbyMin / goal * 20` capped |

### Achievements (rare unlocks only)

| ID | Trigger |
|---|---|
| `first_workout` | First workout saved |
| `streak_7` | 7-day streak |
| `streak_30` | 30-day streak |
| `streak_100` | 100-day streak |
| `level_10` | Level 10 reached |
| `level_25` | Level 25 reached |
| `hobby_5` | 5 different hobby logs |
| `pr_10` | 10 personal records beaten |
| `consistent_month` | 25+ days logged in a calendar month |

Stored as ID array on profile. `unlockAchievement` is idempotent and fires a toast, not a modal.

---

## Habits (`js/habits.js`)

- Habit definitions stored in `habits` store; completions in `habitLogs`.
- `toggleHabit(id)` — if a log exists for today, deletes it (uncheck). Otherwise adds one and awards 8 XP.
- `getHabitStreak(habitId)` — walks backwards from yesterday through `habitLogs`, counting consecutive days. Excludes today.
- Habit removal cascades: removes the habit definition and all its `habitLogs` entries.
- AI suggestions call Gemini 2.5 Flash with the user's age/sex/activity/diet profile and return 4 personalized habits as JSON.

### Preset Categories

Sleep · Diet · Fitness · Mind · Focus — 20 built-in presets across all categories.

---

## Water Tracking (`js/water.js`) — NEW STORE

Replaces the previous profile-field hack.

### Schema

```js
// water store, keyed by date YYYY-MM-DD
{ date: '2026-05-19', ml: 1750, entries: [
  { time: '08:30', ml: 250 },
  { time: '10:15', ml: 500 },
  { time: '13:00', ml: 500 },
  { time: '16:20', ml: 500 },
]}
```

### API

- `logWater(ml)` — appends entry to today's record, creates record if missing, awards XP per 250ml threshold crossed.
- `getWaterToday()` — returns today's record or `{ ml: 0, entries: [] }`.
- `getWaterHistory(days)` — returns last N days for the insights graph.

**Why this matters:** Water now has proper history. Insights tab can graph hydration trends. Export/import handles it correctly. No more "the field disappeared after a date change" bugs.

---

## Meal Templates (`js/templates.js`) — NEW

Users eat the same things repeatedly. Stop making them re-parse the same breakfast.

### Behavior

- On every successful meal log, check if a similar entry exists (compare `descriptionLower` index, fuzzy match on nutrition values within 10%).
- If a match exists, increment its `useCount`. Otherwise create new template after the user has logged it 2× in 30 days.
- Quick-log surfaces top 5 templates by `useCount` for one-tap re-logging.
- No Gemini call needed for template re-logs — copy nutrition from the template.

### Schema

```js
{
  id, description, descriptionLower,
  nutrition: { calories, protein, carbs, fat },
  useCount, lastUsed, mealType
}
```

---

## Search (`js/search.js`) — NEW

In-memory inverted index over meals, workouts, hobbies. Rebuilt on app open from IDB. ~50ms for typical user with 6 months of data.

### Usage

- Search bar in header on Insights tab.
- Query → tokenize → match against index → return ranked results across stores.
- Tap result to jump to that day's view.

No fancy library. Just a `Map<token, Set<{store, id, date}>>` and basic substring matching for partial words.

---

## Gemini Integration (`js/gemini.js`)

### API Call Pattern

- Model: `gemini-2.5-flash`
- `thinkingBudget: 0` — thinking mode disabled to prevent the model from consuming the output token budget and returning empty text.
- All calls fail-soft: callers handle `null` and offline gracefully.
- `parseJSON(text)` strips markdown fences and finds the first `{...}` block before parsing, making it robust to extra prose.

### Response Parsing

```
stripFences → find first { ... last } → JSON.parse → null on failure
```

### Calls

| Function | Trigger | Input | Output |
|---|---|---|---|
| `analyzeMealPhoto` | Photo log | Base64 JPEG + goals | `{ description, nutrition, confidence }` |
| `analyzeMealText` | Text log | Description string + goals | Same |
| `analyzeMealCombined` | Photo + note | Both; text overrides photo | Same |
| `classifyAndExtract` | "Add Anything" | Free text + optional photo | Routes to meal/workout/hobby/weight/water/note |
| `scoreDailyActivity` | On-demand daily score | Today's log + 7-day avg | `{ activityScore, outputScore, llmNote }` |
| `generateWeeklyInsight` | Weekly, on demand | Last 7 scores + rollingSummary | `{ insight, rollingSummary }` |
| `suggestHabits` | Onboarding + on demand | Profile | `[{ name, icon, category }]` × 4 |

### Token Budget Rules

- Never send more than 7 days of raw history to any call.
- `rollingSummary` is the only mechanism for historical context — it stays at ~150 tokens forever.
- Images compressed to ≤ 800px, JPEG quality 0.7 before sending.
- **Template-matched meals skip Gemini entirely.**

### Indian Food Calibration

`nutritionRules()` injects a 30-line system prompt with per-item anchors (roti, dal, paneer, chicken breast, etc.) and 10 hard rules telling Gemini to round protein down, use home-style portions, and never inflate dal/paneer beyond known values. Activated when `dietPreference` matches an Indian diet regex.

### Rolling Summary Schema

```json
{
  "last_updated": "YYYY-MM-DD",
  "avg_activity_score": int,
  "avg_output_score": int,
  "notable_patterns": "short string",
  "current_trend": "improving | steady | declining",
  "streak_record": int
}
```

### classifyAndExtract Routing

Meal type inferred from time-of-day if not stated: before 10am → breakfast, 10am–3pm → lunch, 3pm–6pm → snack, after 6pm → dinner. Workout parser handles `"3x10 squats at 60kg"` style notation.

---

## Notifications (`js/notif.js`) — EXPANDED

Replaces the single `hourlyNotifEnabled` boolean.

### Schedule Store Schema

```js
// notifSchedule store
{
  id: 'breakfast-reminder',
  type: 'meal' | 'workout' | 'habit' | 'water' | 'streak-warn',
  enabled: true,
  time: '09:00',          // HH:mm
  days: [1,2,3,4,5],      // 0=Sun..6=Sat
  message: 'Log breakfast'
}
```

### Built-in Defaults (created on first run)

- Streak warning at 8pm if no logs today.
- Water reminder every 2 hours between waking + sleep cutoff.
- Workout reminder on configured workout days.
- Weekly insight ready notification on Mondays.

### Quiet Hours

`profile.notifQuietHours` — no notifications between start/end hours. UI: two-handle range slider in settings.

### Service Worker Side

Periodic Background Sync tag `leveld-scheduler` fires every 15 min, reads `notifSchedule`, decides what to send. Falls back to local timers when Periodic Sync permission denied (limited to active sessions only).

---

## Onboarding (`js/onboarding.js`) — NEW

Triggered when `profile.onboardingComplete === false`. Skippable but encouraged.

### Steps

1. **Welcome + name** — single text field, no scary form.
2. **Goals** — preset chips: "Lose weight", "Build muscle", "Stay consistent", "General health". Sets calorie/protein defaults.
3. **Diet preference** — chips, multi-select.
4. **Pick 2-4 habits** — shows AI-suggested + preset options.
5. **API key prompt** — explains why, links to Google AI Studio, can skip and add later. App degrades gracefully without it (templates + manual entry still work).

Sets `onboardingComplete: true` at the end.

---

## Export / Import (`js/export.js`)

**Export:**
1. Reads all stores (including new ones: `water`, `mealTemplates`, `notifSchedule`).
2. Bundles into `{ version: 2, exportedAt, profile, meals, workouts, water, mealTemplates, notifSchedule, ... }`.
3. Triggers a `<a download>` click with a Blob URL.
4. Updates `profile.lastBackup` timestamp.

**Import:**
1. Parse JSON, validate `version` field.
2. If `version: 1`, run migration: synthesize a single water record from old `waterToday`/`waterDate` if present.
3. Confirm with user via modal.
4. Call `bulkImport` — clears all stores, repopulates.
5. Reloads the page.

**Backup warning:** On app load, if `lastBackup` is null or older than 3 days, an amber banner appears.

---

## Service Worker (`sw.js`)

Version string: `leveld-v2.0.0` (controls cache invalidation).

### Cache Strategy

| Request | Strategy |
|---|---|
| App shell (same-origin) | Cache-first, network fallback, cache new responses |
| `dummyjson.com` (quotes API) | Network-first, cache fallback |
| Cross-origin non-API | Not intercepted |
| Non-GET | Not intercepted |

**Install:** Pre-caches all app shell files. Calls `skipWaiting()`.
**Activate:** Deletes all caches with a version key other than the current one. Calls `clients.claim()`.

### Push & Sync

- `notificationclick` handler focuses an existing app window or opens a new one. Deep-link to relevant tab based on notification type.
- `periodicsync` tag `leveld-scheduler` reads `notifSchedule` from IDB and fires due notifications.
- `message` handler accepts `{ type: 'savage-notif', title, body }` and `{ type: 'skip-waiting' }`.

---

## App Initialization (`js/app.js`)

On load:
1. Register service worker.
2. Open DB (runs migration if needed).
3. Call `checkStreakOnOpen()`.
4. Check backup banner.
5. If `!onboardingComplete` → render onboarding flow.
6. Otherwise → render last-used tab.
7. Build search index in background (non-blocking).
8. Listen for `lt:refresh-home` event to re-render home without full reload.

---

## Graph Logic (`js/graph.js`)

Chart.js lines rendered from local stores — no API call:
- **Green line** — `activityScore` from `dailyScores`
- **Amber line** — `outputScore` from `dailyScores`
- **Blue line** — daily water ml from `water` store (new)
- **Red dots** — workout days, sized by volume (new)

Time ranges: 7D / 30D / 90D / All. Tapping a point reveals the `breakdown` object and `llmNote` below the chart.

---

## Personal Records

On workout save, each exercise's max set weight is compared against `personalRecords` store (keyed by `exerciseName`). If beaten: update the record, set `isPR = true` on the exercise, show PR toast. **No more 100 XP burst** — the achievement system handles milestone PR counts via `pr_10`.

---

## UI Architecture (Phone-first PWA) — NEW SECTION

### Viewport assumptions

- Target: 360–430px wide (modern phones).
- One-handed thumb reach zone = bottom 60% of screen.
- Use `100dvh` not `100vh` to handle mobile browser chrome correctly.
- Apply `env(safe-area-inset-bottom)` to bottom tab bar.

### Layout skeleton

```
┌─────────────────────────┐
│  [≡]  LevelD     [🔔]   │  56px header
├─────────────────────────┤
│                         │
│   DYNAMIC TAB CONTENT   │  scrollable
│                         │
├─────────────────────────┤
│         [ + ]           │  64px FAB, above tab bar
├─────────────────────────┤
│ 🏠   📊   ➕   🎯   👤  │  64px tab bar
└─────────────────────────┘
```

### Tabs (bottom nav)

| Tab | Purpose |
|---|---|
| Home | Streak, today's ring, quick-log, quests, habits |
| Insights | Graphs, weekly AI insight card, search |
| ➕ (FAB) | Opens "Add Anything" bottom sheet |
| Goals | Manage habits + targets (not logging) |
| Profile | Settings, export/import, API key, achievements |

### Home tab card order (reorderable via `profile.homeCardOrder`)

1. **Streak + Level strip** — flame icon + count on left, level + XP progress bar on right. 80px tall.
2. **Today's ring** — single circular progress (combined daily score). Tap to expand breakdown into activity + output components.
3. **Quick-log row** — horizontal scroll of chips: 🍽️ Meal · 💪 Workout · 💧 Water · ⚖️ Weight · 🎨 Hobby. Long-press meal chip → template picker.
4. **Daily quests** — collapsed by default showing "3/6 done". Tap to expand.
5. **Habits for today** — checklist, swipe-right to complete, long-press for streak count and history.

### Add Anything sheet

- Bottom sheet, 70% screen height.
- Single text field + camera button.
- Routes via `classifyAndExtract`. User never picks a category.
- Recent templates surface as chips above the input.

### Critical UI rules

- Tap targets **≥ 44×44px**.
- `:active` state with `transform: scale(0.97)` for tactile feedback.
- **Optimistic updates** — write to UI first, IDB async. Roll back on error (rare for local writes).
- No pull-to-refresh — everything's local.
- Install prompt only after 3+ days of usage.
- Toasts for routine confirmations, modals only for destructive actions.

### Settings reorder

Drag-handle list of home cards in Profile → Layout. Persisted to `profile.homeCardOrder`.

---

## What's intentionally NOT in this app

- Social features, friends, sharing.
- Multiple profiles.
- In-app AI chat.
- Apple Health / Google Fit sync.
- Leaderboards or pets.

If you find yourself adding any of these, stop and re-read this section.

---

# v2.1 Addendum — Gamification deepening

> **Changelog from v2**
> - **Daily quests are back** but as a *gamification surface only*, not a parallel XP economy. Quest XP rewards are kept low (5–30) and quests are derived live from IDB (no separate store).
> - **Multi-day quests added** (`Shred`, `Bulk`, `Maintenance`) as proper stored objects with start/end dates and structured targets.
> - **To-do list** added as a distinct store from habits — one-off tasks, no streak tracking.
> - **Meal macro confidence** surfaced from Gemini into the UI and stored on meal records.
> - **Level curve made punishing** at the top end so GOD MODE actually means something.
> - **Notification copy bank** with tsundere-savage voice presets.
> - **Habit heatmap** added to Insights tab spec.

---

## Level Curve — Replacement Formula

The old `100 * n^1.5` curve is too gentle past level 20. Endgame ranks felt achievable in a few months, which kills the long-tail.

**New formula:** `xpForLevel(n) = Math.floor(50 * n^2.2)`

| Level | XP for next level | Cumulative XP | Days at avg 80 XP/day |
|---|---|---|---|
| 1 → 2 | 80 | 80 | 1 |
| 5 → 6 | ~350 | ~1,000 | ~12 |
| 10 → 11 | 1,500 | ~5,800 | ~73 |
| 15 → 16 | ~3,500 | ~17,000 | ~210 |
| 20 → 21 | 6,000 | ~36,000 | ~450 |
| 30 → 31 | 16,000 | ~115,000 | ~3.9 years |
| 50 → 51 | 80,000 | ~750,000 | ~25 years |
| 60 (GOD MODE) | — | ~1.4M+ | basically never |

**Design intent:**
- First 5 levels feel like Duolingo — easy dopamine to hook the user.
- Levels 6–15 require consistency over weeks.
- Levels 20+ require year-long commitment.
- GOD MODE (level 60) is a flex, not a goal. Reaching it should be genuinely rare.

Daily XP earning ceiling sits around 80–150 with multipliers. This means even with perfect logging, you can't speed-run ranks.

---

## Quest System (`js/quests.js`) — NEW

Two kinds of quests, served from different places.

### 1. Daily quests (derived, not stored)

Re-computed on every Home render from today's logs. **No separate store.** No XP duplication risk — these XP rewards are *the* XP for the underlying action (e.g. logging a workout gives 25 XP via `awardXP`, and the "Workout" quest *visualizes* that completion). The quest list is a UI surface, not a parallel economy.

| Quest | Derivation | Visualized XP |
|---|---|---|
| Log 3 meals | `meals.length >= 3` | +10 |
| Workout | `workouts.length > 0` | +30 |
| Hit protein goal | `totalProtein >= goal` | +25 |
| Log weight | `bodyMetrics.length > 0` | +5 |
| Complete 3 habits | `habitLogs.length >= 3` | +20 |
| Hobby session | `hobbies.length > 0` | +15 |

Display state on Home: count visible (`4 of 6`), completed quests greyed/struck-through, current quest highlighted in amber.

### 2. Multi-day quests (stored objects)

New store: `quests`. User-activatable templates with structured targets, durations, and reward XP.

#### Schema

```js
// quests store, keyed by autoIncrement
{
  id,
  type: 'shred' | 'bulk' | 'maintenance' | 'streak-warrior' | 'pr-hunter',
  startDate, endDate,
  status: 'active' | 'completed' | 'failed' | 'abandoned',
  targets: {
    calorieMaxDaily?: 1800,
    proteinMinDaily?: 180,
    workoutsPerWeek?: 5,
    weightChangeKg?: -3,
    prsToBeat?: 3,
    streakDays?: 30,
  },
  progress: {
    daysCompliant: 12,
    weightDelta: -1.8,
    prsBeaten: 1,
    // etc — recomputed nightly from underlying stores
  },
  rewardXP: 500,
  unlockOnComplete: 'shred_master',   // optional achievement ID
}
```

#### Presets

| Preset | Duration | Targets | Reward |
|---|---|---|---|
| Shred | 28 days | −1,800 cal/day, 180g protein, 5 workouts/wk, −3kg | 500 XP + `shred_master` |
| Bulk | 56 days | +2,800 cal/day, 200g protein, 4 workouts/wk, +4kg | 750 XP + `bulk_master` |
| Maintenance | 30 days | Stay within ±0.5kg, hit weekly workouts | 300 XP |
| Streak Warrior | 30 days | Log every day, no freeze tokens used | 600 XP + `streak_30_clean` |
| PR Hunter | 21 days | Beat 3 personal records | 400 XP |

#### Mechanics

- Only **one quest active at a time**. New quest activation blocks until current one ends.
- Nightly job (`computeQuestProgress`) walks the quest window and updates the `progress` object. Runs on app open if missed.
- Quest *fails* if mid-quest metrics make targets mathematically impossible (e.g. shred needs −3kg in 28 days; on day 20 user is +0.5kg → unrecoverable → status: `failed`, no XP).
- Quest *completes* automatically on the end date if all targets hit. Awards `rewardXP` via `rawAwardXP` (skips streak tick).
- Abandoned quests can be re-started but lose accumulated progress.

#### Home card

Shows: quest name + day N of M, weekly progress strip (7 cells colored by adherence), key targets with current/goal values, XP badge. Tap → quest detail view with day-by-day adherence breakdown.

---

## To-Do List (`js/todos.js`) — NEW

**Distinct from habits.** Habits are recurring with streaks; to-dos are one-off tasks that get checked off and disappear. No streak tracking, no XP for completion (they're tasks, not workouts).

### Schema

```js
// todos store, keyed by autoIncrement
{
  id,
  text: 'Buy whey protein',
  createdAt,
  dueDate?,            // optional — shows clock icon if set
  priority: 'low' | 'normal' | 'high',
  completed: false,
  completedAt?,
  pinned: false,       // pinned todos stay on home even when complete (for the day)
}
```

### Behavior

- Home card shows up to 5 todos for today (due today, no due date, or overdue).
- Completed todos disappear from home at midnight unless `pinned`.
- Swipe-left on a todo → delete. Swipe-right → toggle complete.
- Long-press → edit (text, due date, priority).
- Overdue todos get a small red dot, not a scary banner. We're not here to shame people about errands.

### Why not gamify to-dos

To-dos are not health/fitness behaviors. Awarding XP for "Book doctor appt" cheapens the XP currency for actual workouts. Keep the XP economy locked to the things the app is actually measuring.

---

## Meal Macro Confidence — Schema + UI

Gemini already returns a `confidence` field for meal analysis. v1 ignored it. v2.1 stores and surfaces it.

### Updated meal schema

```js
// meals store
{
  id, date, time, mealType,
  description, descriptionLower,
  nutrition: {
    calories: 520,
    protein: 22,
    carbs: 62,
    fat: 18,
  },
  confidence: {
    overall: 0.72,           // 0.0 - 1.0
    calories: 0.88,
    protein: 0.65,
    carbs: 0.68,
    fat: 0.45,
    reasoning: 'Paneer prep varies a lot. Adjust fat if homemade vs restaurant.',
  },
  errorMargin: {
    calories: 60,            // ± kcal
    protein: 5,               // ± g
    carbs: 8,
    fat: 7,
  },
  source: 'gemini' | 'template' | 'manual',
  templateId?,
}
```

### Gemini prompt update

Add to `analyzeMealText` / `analyzeMealPhoto` system prompt:

> Return confidence per macro on a 0.0–1.0 scale. Also estimate an error margin (±grams or ±kcal). Be honest — low confidence (< 0.5) is more useful than fake precision. Add one sentence explaining the lowest-confidence macro.

### UI thresholds

| Confidence | Color | Label |
|---|---|---|
| ≥ 0.75 | `c-green` (#1D9E75) | high |
| 0.55 – 0.74 | `c-amber` (#EF9F27) | medium |
| < 0.55 | `c-red` (#E24B4A) | low |

### Quick adjust chips

When confidence on a macro is low, show contextual chips below the meal save view:
- "Paneer was heavy" → +30% fat, +10% calories
- "Extra ghee" → +8g fat, +70 cal
- "No rice today" → −45g carbs, −180 cal
- "Edit manually" → opens raw nutrition editor

These chips re-compute nutrition **without another Gemini call**. They're deterministic deltas based on the dish type Gemini already classified.

### Templates inherit confidence

When a meal is saved as a template, store the confidence too. Re-logging from template uses the same numbers without re-querying Gemini, so confidence carries forward.

---

## Habit Heatmap (`js/heatmap.js`) — NEW UI Component

GitHub-contributions style, 8 weeks × 7 days, on the Insights tab.

### Data shape

For each day in the window:
```js
{ date, completionCount, totalHabits, ratio: completionCount / totalHabits }
```

### Color mapping (uses `c-green` ramp)

| Ratio | Color |
|---|---|
| 0% | `var(--color-background-secondary)` |
| 1–25% | `#EAF3DE` |
| 26–50% | `#C0DD97` |
| 51–75% | `#97C459` |
| 76–99% | `#639922` |
| 100% | `#3B6D11` |

### Interactions

- Tap cell → shows that day's habit list with check/cross states.
- Today's cell gets a 1.5px amber border.
- Future days get a dashed border, no fill.
- Single source of truth: derived from `habitLogs` store, no caching needed for ≤ 8 weeks.

### Why 8 weeks not 1 year

Phone width. A full year heatmap (52 cols × 7 rows) at 320px wide gives 4px cells — unusable. 8 weeks gives ~28px cells, readable and tappable. Year view is available via a separate full-screen modal.

---

## Notification Copy Bank (`js/notif-copy.js`) — NEW

Replaces hand-written notification strings with a curated voice bank. Tsundere-savage tone: acknowledges progress, then immediately raises the bar.

### Voice rules

1. **Specific numbers always.** "Protein at 54%" beats "Hit your protein goal."
2. **Acknowledge then escalate.** "PR beaten. You're 1 PR from `pr_10`. Try not to peak this week."
3. **No corporate cheerleading.** Never use: "Great job!", "You got this!", "Crushing it!", "Champion".
4. **Receipts.** Reference past behavior: "Last 3 Saturdays you skipped workouts."
5. **Real deadlines, not fake urgency.** "4 hours until midnight resets you" — actual midnight. Not "Hurry!".

### Trigger types and copy presets

```js
const NOTIF_BANK = {
  'streak-at-risk': [
    { title: '{streak} day streak. Don\'t fold now.',
      body: 'You haven\'t logged today. {hoursLeft} hours until midnight resets you.' },
    { title: 'Streak {streak} is on the edge.',
      body: 'Log one meal. Log one habit. Anything. The streak doesn\'t care if you\'re tired.' },
    { title: '{streak} days. Wasted by a Tuesday?',
      body: 'It takes 30 seconds. You have 4 hours.' },
  ],

  'protein-lagging': [
    { title: 'Protein at {pct}%. It\'s {hour}pm.',
      body: '{questName} day {day}. Eggs exist. Whey exists. Excuses don\'t.' },
    { title: '{actual}g of {goal}g protein.',
      body: 'You\'re behind. The fridge is right there.' },
  ],

  'workout-skip-pattern': [
    { title: 'Weekend incoming. Be honest.',
      body: 'Last {count} {dayName}s you skipped workouts. Pattern noticed. Pick one this weekend.' },
    { title: '{count} {dayName}s skipped in a row.',
      body: 'Either change the schedule or change the behavior. Both are valid.' },
  ],

  'pr-celebration-with-bite': [
    { title: 'PR beaten. {exercise} {old} → {new}kg.',
      body: 'You\'re {remaining} PR{plural} from the pr_10 unlock. Try not to peak this week.' },
    { title: 'New PR: {exercise} {new}kg.',
      body: 'That was {improvement}% better than last time. Don\'t coast on it.' },
  ],

  'quest-milestone': [
    { title: '{questName} — day {day} of {total}.',
      body: 'On track. {keyMetric}. Keep going or it stops mattering.' },
    { title: 'Quest checkpoint hit.',
      body: '{daysLeft} days left. Today\'s targets: {targets}.' },
  ],

  'water-lagging': [
    { title: '{ml}ml. It\'s {hour}pm.',
      body: 'You\'ve had {percent}% of your water goal. Coffee doesn\'t count.' },
  ],

  'level-up': [
    { title: 'Level {n}. {rank}.',
      body: '{xpToNext} XP to {nextRank}. Don\'t get comfortable.' },
  ],

  'quest-failed': [
    { title: '{questName} failed.',
      body: 'Targets became mathematically impossible. Start a new one when ready.' },
  ],
};
```

### Selection logic

`pickNotif(trigger, context)`:
1. Read the array for the trigger type.
2. Use a deterministic hash of `(date + trigger)` to pick the variant — same trigger never repeats consecutively.
3. Template substitute with context values.
4. Pass through quiet-hours filter before scheduling.

### Localization escape hatch

All copy lives in this single file. To translate or soften the tone, edit one file. Profile setting `notifTone: 'savage' | 'neutral' | 'kind'` switches between three banks — `savage` is default, `kind` exists for users who hate this voice (3 users, but they'll be loud).

---

## Updated DB Version

Bumping to version **4** for these new stores:

| Store | Key | Purpose |
|---|---|---|
| `quests` | autoIncrement | Multi-day quest instances |
| `todos` | autoIncrement | One-off tasks |

### v4 Migration

1. Create `quests` and `todos` stores.
2. Add `confidence` and `errorMargin` fields to existing meal records — default to `{ overall: 0.6, calories: 0.7, protein: 0.6, carbs: 0.6, fat: 0.6, reasoning: 'Imported from v1' }` and `{ calories: 80, protein: 8, carbs: 12, fat: 10 }` respectively. Old meals retain reasonable error bars.
3. Add `notifTone: 'savage'` to profile defaults.

---

## Updated Home Card Order

Default `homeCardOrder` for new users:

```js
['rank-strip', 'active-quest', 'daily-quests', 'todos', 'habits', 'quick-log']
```

Where:
- `rank-strip` — dark purple banner with rank progression + streak flame
- `active-quest` — current multi-day quest progress (hidden if none active)
- `daily-quests` — checkbox list, 6 items, derived live
- `todos` — top 5 todos for today
- `habits` — today's habit checklist
- `quick-log` — horizontal chip scroll

Today's score ring moved to top of Insights tab (it's analysis, not action).

---

## Updated Insights Tab

Order:
1. Range tabs (7D / 30D / 90D / All)
2. Weekly AI insight card (purple)
3. Today's score ring + breakdown
4. **Habit heatmap** (NEW)
5. **Macro stacked bars** (NEW) — 7-day protein/carbs/fat
6. **Weight trend line** (NEW)
7. **Workout volume bars** (NEW) — 4-week kg lifted trend
8. Stat cards grid (avg activity, workouts hit, avg water, PRs)
9. Search bar (sticky at top of tab)

---

## Achievement Additions

| ID | Trigger |
|---|---|
| `shred_master` | Complete a Shred quest |
| `bulk_master` | Complete a Bulk quest |
| `streak_30_clean` | 30-day streak with zero freeze tokens used |
| `quest_trifecta` | Complete 3 different quest types |
| `confidence_king` | Manually correct 50 low-confidence meals (calibration feedback loop) |

---

## What I'm explicitly still NOT adding

Re-stating because this section gets bigger every revision:

- Social, friends, leaderboards, sharing.
- Multiple profiles per device.
- In-app AI chat.
- Apple Health / Google Fit / Garmin sync.
- Pets, plants, mascots, characters.
- Calorie scanning by barcode (Gemini handles photo + text — barcode DBs are a maintenance trap).
- Meal plans / recipe generation (scope creep, different app).
- Sleep tracking (different sensor story, save for v3).

If you find yourself adding any of these, stop and re-read this section.

---

# v2.2 Addendum — Design System & Theming

> This section is the source of truth for any agent (human or Claude Code) building the UI. Every color, radius, and spacing token below is final. Do not improvise.

---

## Theme Architecture

Two themes ship with the app: `light` (warm paper + indigo) and `dark` (deep indigo gradient). Theme is stored on `profile.theme` and applied via `data-theme` attribute on `<html>`.

```html
<html data-theme="dark">
```

CSS variables live in `:root[data-theme="light"]` and `:root[data-theme="dark"]` blocks. No hardcoded hex anywhere in component code — always reference variables.

A `system` option exists which respects `prefers-color-scheme`. Default for new users is `dark`.

---

## Color Tokens

### Light theme (warm paper + indigo)

```css
:root[data-theme="light"] {
  /* Backgrounds */
  --bg-page: #E8E4DA;
  --bg-app: #F5F1E8;
  --bg-surface: #F5F1E8;
  --bg-surface-elevated: #FBF8F0;
  --bg-input: #EDE7D8;

  /* Hero card (rank strip) */
  --bg-hero: #1F2849;
  --bg-hero-end: #1F2849;

  /* Text */
  --text-primary: #2A2E45;
  --text-secondary: #6B6960;
  --text-tertiary: #9A968A;
  --text-on-hero: #F5F1E8;
  --text-on-hero-muted: #A8B0CC;
  --text-on-accent: #F5F1E8;

  /* Indigo accent */
  --accent-primary: #1F2849;
  --accent-mid: #4A5380;
  --accent-light: #8A95C2;
  --accent-pale: #DCE0F0;

  /* Warm accent — streak, active states */
  --warm-primary: #B8864A;
  --warm-light: #D4A574;
  --warm-pale: #F0E2CC;

  /* Borders */
  --border-default: #C9C3B5;
  --border-strong: #A8A294;
  --border-subtle: #DCD5C2;

  /* Semantic */
  --success: #4A7C4E;
  --success-bg: #DDE7DC;
  --warning: #B8864A;
  --warning-bg: #F0E2CC;
  --danger: #9A4B3D;
  --danger-bg: #EDD8D2;

  /* Confidence colors (meal macros) */
  --conf-high: #4A7C4E;
  --conf-medium: #B8864A;
  --conf-low: #9A4B3D;

  /* Hero gradient — single layer in light mode */
  --hero-gradient: #1F2849;
  /* Surface gradient — none in light mode, flat */
  --surface-gradient: #F5F1E8;
  /* Page gradient — none in light mode */
  --page-gradient: #F5F1E8;
}
```

### Dark theme (deep indigo + warm flame)

```css
:root[data-theme="dark"] {
  /* Backgrounds */
  --bg-page: #0A0D1A;
  --bg-app: #0F1220;
  --bg-surface: #181C30;
  --bg-surface-elevated: #1F2340;
  --bg-input: #14182A;

  /* Hero card (rank strip) — diagonal gradient */
  --bg-hero: #2A3158;
  --bg-hero-end: #161A35;

  /* Text */
  --text-primary: #E8EAF2;
  --text-secondary: #C8CCE0;
  --text-tertiary: #8A92AC;
  --text-disabled: #6B6F85;
  --text-on-hero: #E8EAF2;
  --text-on-hero-muted: #8A95C2;
  --text-on-accent: #14172B;

  /* Indigo accent */
  --accent-primary: #8A95C2;
  --accent-mid: #6B75A8;
  --accent-light: #AAB3D8;
  --accent-pale: rgba(170,179,216,0.12);

  /* Warm accent */
  --warm-primary: #D4A574;
  --warm-light: #E0B585;
  --warm-pale: rgba(212,165,116,0.12);

  /* Borders */
  --border-default: #252A45;
  --border-strong: #353B5F;
  --border-subtle: #1F2340;

  /* Semantic */
  --success: #6B9B6E;
  --success-bg: rgba(107,155,110,0.15);
  --warning: #D4A574;
  --warning-bg: rgba(212,165,116,0.12);
  --danger: #C97A6A;
  --danger-bg: rgba(201,122,106,0.15);

  /* Confidence colors */
  --conf-high: #6B9B6E;
  --conf-medium: #D4A574;
  --conf-low: #C97A6A;

  /* Hero gradient — diagonal, used on rank strip */
  --hero-gradient: linear-gradient(135deg, #2A3158 0%, #1C2142 60%, #161A35 100%);
  /* Surface gradient — subtle, used on all cards */
  --surface-gradient: linear-gradient(180deg, #181C30 0%, #14182A 100%);
  /* Page gradient — applied to body */
  --page-gradient: linear-gradient(180deg, #14172B 0%, #0F1220 50%, #0A0D1A 100%);
}
```

### Theme rules

1. Light theme uses flat surfaces. No gradients except the hero rank strip (solid `#1F2849`).
2. Dark theme uses subtle gradients. Page has a vertical gradient. Cards have a barely-there vertical gradient. The rank strip uses a diagonal gradient.
3. Gradients never exceed 3 stops. No mesh, no radial in components.
4. Warm accent (`--warm-*`) appears only on: streak flame, active quest indicator, today's heatmap cell border, "in progress" daily quest checkbox border, warning state.
5. Pure black (`#000`) and pure white (`#FFF`) are banned. Always use the warm-off-white or deep-indigo-black tokens.

---

## Typography

Single sans-serif family. System stack to avoid loading webfonts on a PWA.

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  --font-mono: "SF Mono", "Monaco", "Consolas", monospace;

  /* Sizes */
  --text-xs: 10px;
  --text-sm: 11px;
  --text-base: 12px;
  --text-md: 13px;
  --text-lg: 15px;
  --text-xl: 18px;
  --text-2xl: 22px;

  /* Weights */
  --weight-regular: 400;
  --weight-medium: 500;

  /* Line heights */
  --leading-tight: 1.3;
  --leading-normal: 1.5;
  --leading-loose: 1.7;

  /* Letter spacing */
  --tracking-tight: -0.2px;
  --tracking-normal: 0;
  --tracking-wide: 0.5px;
  --tracking-wider: 1px;
}
```

Rules:
- Two weights only: 400 and 500. Never 600 or 700.
- Sentence case everywhere except uppercase labels (rank tier, "DAILY QUESTS" headers) which use `--tracking-wider`.
- Never go below 10px.
- Numerals in stat cards use `font-variant-numeric: tabular-nums`.

---

## Spacing & Layout

```css
:root {
  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radii */
  --radius-sm: 5px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-2xl: 36px;
  --radius-full: 9999px;

  /* Safe area */
  --safe-bottom: env(safe-area-inset-bottom, 0);
  --safe-top: env(safe-area-inset-top, 0);

  /* Layout */
  --tab-bar-height: 64px;
  --header-height: 56px;
  --fab-size: 52px;
  --fab-offset: 24px;
}
```

Card padding: `var(--space-4)` (16px) all sides. Hero uses `16px 18px`. Gap between cards on home: `var(--space-3)` (12px).

---

## Component Specifications

### App shell

```css
.app-shell {
  min-height: 100dvh;
  background: var(--page-gradient);
  color: var(--text-primary);
  font-family: var(--font-sans);
  display: flex;
  flex-direction: column;
}

.app-header {
  height: var(--header-height);
  padding: 0 var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--safe-top);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) var(--space-4) calc(var(--tab-bar-height) + var(--space-6));
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
```

### Hero card (rank strip)

```css
.hero-card {
  background: var(--hero-gradient);
  border-radius: var(--radius-xl);
  padding: var(--space-4) 18px;
  color: var(--text-on-hero);
  border: 0.5px solid var(--border-strong);
}

.hero-card__rank-label {
  font-size: var(--text-xs);
  color: var(--text-on-hero-muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  margin-bottom: 4px;
}

.hero-card__next-rank {
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
}

.hero-card__streak {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--warm-pale);
  border: 0.5px solid rgba(212,165,116,0.25);
  padding: 5px 10px;
  border-radius: var(--radius-md);
  color: var(--warm-light);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
}

.hero-card__progress-track {
  height: 5px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
  margin: var(--space-3) 0 6px;
}

.hero-card__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-light) 0%, var(--accent-pale) 100%);
}

.hero-card__xp-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--text-on-hero-muted);
}
```

### Standard card

```css
.card {
  background: var(--surface-gradient);
  border: 0.5px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.card__title {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 7px;
}

.card__meta {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
```

### Checklist item (quests, todos, habits)

Three states: completed, active (in-progress), pending.

```css
.checklist-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 22px;
}

.checklist-checkbox {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checklist-item--done .checklist-checkbox {
  background: var(--accent-mid);
}
.checklist-item--done .checklist-checkbox i {
  font-size: 11px;
  color: var(--text-on-accent);
}
.checklist-item--done .checklist-label {
  color: var(--text-disabled, var(--text-tertiary));
  text-decoration: line-through;
}

.checklist-item--active .checklist-checkbox {
  border: 1.5px solid var(--warm-primary);
  background: var(--warm-pale);
}
.checklist-item--active .checklist-label {
  color: var(--text-primary);
  font-weight: var(--weight-medium);
}
.checklist-item--active .checklist-xp {
  color: var(--warm-primary);
  font-weight: var(--weight-medium);
}

.checklist-item--pending .checklist-checkbox {
  border: 1.5px solid var(--border-strong);
}
.checklist-item--pending .checklist-label {
  color: var(--text-secondary);
}

.checklist-label {
  flex: 1;
  font-size: var(--text-base);
}

.checklist-xp {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
```

### Quest progress strip (7-day adherence)

```css
.quest-strip {
  display: flex;
  gap: 5px;
  margin: var(--space-2) 0 var(--space-3);
}

.quest-strip__day {
  flex: 1;
  height: 4px;
  border-radius: 2px;
}

.quest-strip__day--complete { background: var(--accent-mid); }
.quest-strip__day--today    { background: var(--warm-light); }
.quest-strip__day--pending  { background: var(--border-default); }
.quest-strip__day--failed   { background: var(--danger); }
```

### Quick-log chip

```css
.chip-row {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.chip-row::-webkit-scrollbar { display: none; }

.chip {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-input);
  border-radius: var(--radius-full);
  padding: 8px 14px;
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--text-primary);
  border: 0.5px solid transparent;
  cursor: pointer;
}

.chip:active { transform: scale(0.97); }

.chip i { font-size: 16px; }

.chip--meal i    { color: var(--warm-primary); }
.chip--workout i { color: var(--danger); }
.chip--water i   { color: var(--accent-mid); }
.chip--weight i  { color: var(--text-primary); }
.chip--hobby i   { color: var(--accent-primary); }
```

### Stat card

```css
.stat-card {
  background: var(--bg-input);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.stat-card__label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-card__value {
  font-size: var(--text-2xl);
  font-weight: var(--weight-medium);
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.stat-card__delta {
  font-size: var(--text-xs);
  margin-top: 2px;
}

.stat-card__delta--up   { color: var(--success); }
.stat-card__delta--down { color: var(--danger); }
.stat-card__delta--flat { color: var(--text-secondary); }
```

### Confidence bar (meal accuracy)

```css
.conf-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.conf-row__meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.conf-bar {
  height: 4px;
  background: var(--bg-input);
  border-radius: 2px;
  overflow: hidden;
}

.conf-bar__fill { height: 100%; }
.conf-bar__fill--high   { background: var(--conf-high); }
.conf-bar__fill--medium { background: var(--conf-medium); }
.conf-bar__fill--low    { background: var(--conf-low); }
```

### Heatmap cell

```css
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 2px;
}

[data-theme="dark"] .heatmap-cell--0  { background: var(--bg-input); }
[data-theme="dark"] .heatmap-cell--1  { background: #1F3324; }
[data-theme="dark"] .heatmap-cell--2  { background: #2F5238; }
[data-theme="dark"] .heatmap-cell--3  { background: #437552; }
[data-theme="dark"] .heatmap-cell--4  { background: #5A9168; }
[data-theme="dark"] .heatmap-cell--5  { background: #7AB088; }

[data-theme="light"] .heatmap-cell--0 { background: var(--bg-input); }
[data-theme="light"] .heatmap-cell--1 { background: #DCE5D4; }
[data-theme="light"] .heatmap-cell--2 { background: #B5C9A4; }
[data-theme="light"] .heatmap-cell--3 { background: #8AAF75; }
[data-theme="light"] .heatmap-cell--4 { background: #5F8C50; }
[data-theme="light"] .heatmap-cell--5 { background: #3F6535; }

.heatmap-cell--today  { border: 1.5px solid var(--warm-primary); }
.heatmap-cell--future { background: var(--bg-input); border: 0.5px dashed var(--border-strong); }
```

### Bottom tab bar

```css
.tab-bar {
  position: relative;
  height: var(--tab-bar-height);
  border-top: 0.5px solid var(--border-default);
  background: var(--bg-app);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: var(--safe-bottom);
}

.tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--text-tertiary);
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
}

.tab-bar__item i { font-size: 19px; }
.tab-bar__item span { font-size: var(--text-xs); }

.tab-bar__item--active { color: var(--text-primary); }
.tab-bar__item--active span { font-weight: var(--weight-medium); }

.tab-bar__fab-slot { width: 50px; }

.fab {
  position: absolute;
  top: calc(-1 * var(--fab-offset));
  left: 50%;
  transform: translateX(-50%);
  width: var(--fab-size);
  height: var(--fab-size);
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-mid) 100%);
  border: 3px solid var(--bg-app);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.fab:active { transform: translateX(-50%) scale(0.95); }
.fab i { font-size: 22px; color: var(--text-on-accent); }
```

### Bottom sheet

```css
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 13, 26, 0.55);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 50;
}

.sheet {
  background: var(--bg-app);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-3) 18px calc(var(--space-5) + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 70dvh;
  overflow-y: auto;
}

.sheet__handle {
  width: 36px;
  height: 4px;
  background: var(--border-strong);
  border-radius: 2px;
  margin: 0 auto;
}
```

### Notification card (lock-screen mockups only)

```css
.notif {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 0.5px solid rgba(255,255,255,0.15);
  border-radius: var(--radius-lg);
  padding: 14px;
  color: var(--text-on-hero);
}

.notif__app-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--warm-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Iconography

Tabler outline icons via webfont. No filled variants.

```html
<i class="ti ti-flame" aria-hidden="true"></i>
```

Sizes:
- Inline with text: 14px
- Card header icons: 14–16px
- Tab bar: 19px
- FAB: 22px
- Hero / decorative: 20–24px max

Icons inherit `color` from parent. Override with a token, never a hex.

Required icons:
- `ti-flame` (streak)
- `ti-target` (quests)
- `ti-circle-check` (todos)
- `ti-check` (checkbox checked)
- `ti-clock` (due date)
- `ti-bowl`, `ti-barbell`, `ti-droplet`, `ti-scale`, `ti-palette` (quick-log)
- `ti-home`, `ti-chart-line`, `ti-user`, `ti-plus` (nav)
- `ti-camera`, `ti-microphone`, `ti-sparkles` (input)
- `ti-bell`, `ti-search`, `ti-menu-2`, `ti-arrow-left`, `ti-edit`, `ti-info-circle`, `ti-x`, `ti-calendar`

---

## Interaction Tokens

```css
:root {
  --transition-fast: 100ms ease-out;
  --transition-base: 180ms ease-out;
  --transition-slow: 280ms ease-out;

  --tap-scale: 0.97;
  --fab-scale: 0.95;

  --tap-target-min: 44px;
}
```

Rules:
- Every tappable element gets `:active { transform: scale(var(--tap-scale)); }` with `transition: transform var(--transition-fast)`.
- Tap targets ≥ 44×44px. Smaller visuals get invisible padding to meet this.
- No hover states. This is a phone.
- Optimistic UI: write to UI first, IDB async. No spinners on local writes.
- Toasts for routine confirmations. Modals only for destructive actions.

---

## Accessibility Rules

1. Color contrast ≥ WCAG AA. Test every text token against its background token.
2. Every interactive element has either a visible label or `aria-label`.
3. Icons marked `aria-hidden="true"` unless they're the only thing in a button (then `aria-label`).
4. Focus rings: `outline: 2px solid var(--accent-light); outline-offset: 2px;` — never `outline: none`.
5. Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## File Structure

```
/css
  tokens.css        — :root variables for both themes
  reset.css         — minimal reset + base typography
  components.css    — all component classes
  utilities.css     — flex/grid/spacing helpers
/js
  theme.js          — theme switcher, prefers-color-scheme listener
```

### theme.js outline

```js
export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function initTheme(profile) {
  applyTheme(profile.theme || 'dark');
  if (profile.theme === 'system') {
    matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => applyTheme('system'));
  }
}
```

Profile shape update:

```js
{
  // ...existing fields
  theme: 'dark',  // 'light' | 'dark' | 'system' — default 'dark'
}
```

---

## Build Checklist for Claude Code

When implementing this UI, the agent must:

1. Create `/css/tokens.css` with both `:root[data-theme="light"]` and `:root[data-theme="dark"]` blocks exactly as specified above.
2. Build components using class names from this spec — do not invent new ones.
3. Never use raw hex colors in component CSS. Every color is a `var(--*)` token.
4. Apply gradients only where specified (page bg dark, surface gradient dark, hero card, FAB).
5. Maintain `0.5px` borders throughout. Use `1.5px` only for active/pending checkbox borders.
6. Use `dvh` not `vh` for viewport heights.
7. Apply `env(safe-area-inset-*)` to tab bar and header.
8. Implement theme switcher with three options: light, dark, system.
9. Pass an accessibility audit: every text/bg pair ≥ 4.5:1 contrast ratio.
10. No webfonts loaded. Tabler icons via the existing CDN webfont only.

If any constraint conflicts with a feature, raise it before improvising — do not silently deviate.