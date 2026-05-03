# LifeTracker PWA — Build Instructions

## What to Build
Offline-first PWA — gamified life tracker covering workouts, meals, hobbies, and daily activity. AI features via Gemini 2.5 Flash API. No backend. No auth. Everything local.

---

## Stack
- Vanilla HTML/CSS/JS (no framework)
- IndexedDB for local storage (use `idb` library)
- Service Worker for offline caching (cache-first strategy)
- Web App Manifest for mobile installability
- Chart.js for the two-line progress graph
- Gemini 2.5 Flash API for AI features

---

## File Structure
```
index.html
manifest.json
sw.js
css/main.css, components.css, animations.css
js/app.js, db.js, gemini.js, gamification.js
js/graph.js, meals.js, workouts.js, hobbies.js
js/export.js, ui.js
icons/icon-192.png, icon-512.png
```

---

## Data Storage (IndexedDB)

Seven stores:

**profile** — single record (id: 'user')
- name, geminiApiKey, goals (calories/protein/water/workoutsPerWeek/hobbyMinutes)
- hobbies array: `[{ id, name, icon, dailyGoalMinutes }]`
- level, totalXP, streak, lastLoggedDate, freezeTokens, streakRecord
- achievements array of earned IDs
- rollingSummary object (compressed history for Gemini context)
- lastBackup timestamp

**meals** — per meal logged
- date, timestamp, type (breakfast/lunch/dinner/snack)
- description, imageBase64 (nullable), source (photo/text/manual)
- nutrition: `{ calories, protein, carbs, fat, fiber }`

**workouts** — per session
- date, name, exercises array
- each exercise: `{ name, sets: [{reps, weight, completed}], isPR, previousBest }`
- totalVolumeKg, durationMinutes

**hobbies** — per hobby log entry
- date, hobbyId, hobbyName, minutes, notes

**bodyMetrics** — date, weight (kg)

**dailyScores** — keyed by date (YYYY-MM-DD)
- activityScore (0-100), outputScore (0-100)
- breakdown object, llmNote (Gemini one-liner), questsCompleted array

**personalRecords** — keyed by exerciseName
- bestWeightKg, bestReps, achievedDate

---

## Screens

**Onboarding** (first launch)
- Name, Gemini API key, goals, add hobbies from preset list + custom

**Home Dashboard**
- Level badge + rank title + XP progress bar
- Streak counter + freeze tokens
- 3 macro rings: Calories (blue), Protein (green), Water (cyan)
- Daily quest tickboxes (5 quests)
- Quick action buttons: Log Meal / Log Workout / Log Hobby / Log Weight
- Backup warning banner if last export > 3 days ago

**Workout Screen**
- Workout name, exercise list with set/rep/weight inputs and ✓ per set
- Live total volume counter, rest timer (60/90/120s), PR badge on beat
- Save button → compute XP, update PRs, update daily score

**Meals Screen**
- Macro rings updated live
- Meal slots (breakfast/lunch/dinner/snack) with + Add button each
- Log modal: camera (→ Gemini photo analysis) or text input (→ Gemini text parse) or manual
- All nutrition fields editable after Gemini fills them

**Hobbies & Extras Screen**
- Daily tickboxes for each hobby in profile
- Tap to log: enter minutes + optional note
- Custom activity button
- Today's activity log list

**Progress Screen**
- Two-line Chart.js graph with time range: 7D / 30D / 90D / All
- Tap a point → show day breakdown + Gemini note
- Weekly insight card (Gemini paragraph, refresh button)
- Stats cards grid, personal records table, achievements grid
- Bodyweight line chart

**Settings**
- Edit goals and hobbies
- Change API key
- Export JSON button
- Import JSON button
- Clear all data (with confirmation)

---

## Gemini API Calls

Base URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
Key from IndexedDB profile, never hardcoded. All calls try/catch with offline fallback.

**4 calls total:**

1. **analyzeMealPhoto(imageBase64, goals)** — send image + prompt, returns `{ description, nutrition: {calories,protein,carbs,fat,fiber}, confidence }`

2. **analyzeMealText(text, goals)** — send meal description, returns same nutrition JSON

3. **scoreDailyActivity(todayLog, sevenDayAvg, goals)** — called once per day, returns `{ activityScore, outputScore, llmNote }`. Send only today + 7-day avg, never full history.

4. **generateWeeklyInsight(last7DayScores, rollingSummary, goals)** — called once per week, returns 3-4 sentence coach paragraph. Send rollingSummary (~150 tokens) not raw history.

**Token rules:**
- Never send more than 7 days raw data
- Always use rollingSummary for historical context
- Compress images before sending (max 800px, JPEG 0.7 quality)
- Strip markdown fences before JSON.parse on all responses
- Prompt all structured responses to return ONLY valid JSON

**Rolling summary** — updated weekly by Gemini. Keeps historical context compressed to ~150 tokens forever regardless of how long app is used. Structure: `{ last_updated, avg_activity_score, avg_output_score, notable_patterns, current_trend, streak_record }`

---

## Graph Logic

Two lines on Chart.js:
- **Green line** = activityScore (did they show up and log)
- **Amber line** = outputScore (how hard did they actually work)

Both computed **locally** from IndexedDB dailyScores — no API call for graph rendering.

**activityScore formula:**
- +20 logged ≥1 meal, +15 ≥2 meals, +15 ≥3 meals
- +30 workout logged
- +10 hobby logged
- +10 weight logged
- Cap at 100

**outputScore formula:**
- Up to +30 based on calorie accuracy (how close to goal)
- +25 if protein goal hit
- Up to +25 based on workout volume vs personal average
- Up to +20 based on hobby minutes vs daily goal
- Cap at 100

Tapping a point shows day breakdown panel + llmNote below chart.

---

## Gamification Logic

**XP values:**
- Log meal: +10, hit protein goal: +25, hit calorie target: +20
- Log workout: +30, beat PR: +100, log hobby: +15
- Log weight: +5, hit water goal: +10
- Complete all 5 daily quests: +50 bonus
- 7-day streak: +200 bonus, 30-day streak: +500 bonus

**Level curve:** `xpForLevel(n) = Math.floor(100 * n^1.5)`
Levels feel fast early (level 1→2 = 100 XP), slow later (level 20→21 = ~8,944 XP).

**Streak multiplier:** 3d=1.1x, 7d=1.25x, 14d=1.5x, 30d=2.0x — applied to all XP earned.

**Streak freeze:** earn 1 token per 7-day streak. Auto-consumed when a day is missed. Show notification when used.

**Ranks:** Beginner(1), Grinder(5), Dedicated(10), Athlete(15), Champion(20), Elite(30), Legend(50)

**Daily quests (reset midnight):** Log 3 meals / Complete workout / Hit protein / Log hobby / Log weight

**Weekly challenges (reset Monday):** 4 workouts / protein 5/7 days / 3 different hobbies / maintain streak

**Achievements (one-time unlock):** First workout, 7-day streak, level 10, 7-day macro streak, 5 hobbies logged, 100-day streak, 10 PRs beaten

---

## Export / Import

**Export:** Fetch all stores → bundle into single JSON → trigger download as `lifetracker-export-YYYY-MM-DD.json`. Update `profile.lastBackup` after.

**Import:** File input (.json only) → validate version field + expected keys → confirmation dialog → clear all stores → repopulate from JSON → success toast.

**Backup reminder:** On app load check `lastBackup`. If >3 days → show amber banner with Export Now button.

---

## Design

Dark theme only. Key colors:
- Background: `#0a0a0a`, cards: `#1a1a1a`, borders: `#2a2a2a`
- Green `#00ff88` — activity, success, protein
- Amber `#ffaa00` — output, carbs, warnings  
- Blue `#4488ff` — calories
- Cyan `#00ccff` — water
- Purple `#aa44ff` — XP, levels

Font: Space Grotesk (headings/UI) + JetBrains Mono (numbers/stats)

Navigation: bottom tab bar — Home / Workout / Meals / Hobbies / Progress

**Key animations:**
- Circular SVG rings with animated stroke-dashoffset
- XP bar width transition
- Float-up "+30 XP" popup on XP earn
- Full screen level-up overlay
- PR celebration overlay with CSS confetti
- Checkbox bounce + green glow on complete
- Toast slide-up from bottom (auto-dismiss 3s)

---

## PWA Requirements

- `manifest.json` with name, icons, `display: standalone`, theme `#00ff88`
- `sw.js` cache-first: cache all app shell on install, serve from cache, fall back to network
- HTTPS required for production (localhost works for dev)
- Register service worker in `app.js` on load

---

## Logic Notes

- All scoring and graph rendering is local — no API call needed
- Gemini only called for: meal parsing, daily scoring, weekly insight
- Daily score computed once per day (or on demand), stored in dailyScores store
- On app open: check streak (compare lastLoggedDate to today), apply freeze if needed
- PR check: on workout save, compare each exercise max weight to personalRecords store, update if beaten
- Quest progress: computed live from today's IndexedDB records, no separate store needed
- Weekly insight auto-triggered if no insight exists for current week, otherwise manual refresh