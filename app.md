Build a PWA (Progressive Web App) deployable on GitHub Pages called "AscendRPG" — a gamified personal self-improvement tracker with pixel art RPG aesthetics.

## Onboarding / Initial Setup Flow

First launch shows a full-screen onboarding wizard before anything else.
Never skippable. Runs once, stored in localStorage as `onboarding_complete`.

### Step 1 — Welcome Screen
- App name "AscendRPG" in pixel font
- Animated pixel art intro (torch flickering, stars, season background)
- Single button: "Begin Your Journey"

### Step 2 — Identity
- Name input (used everywhere, on character card, quests, messages)
- Age (used to contextualize AI messages and goals)
- Gender / preferred pronoun (optional, used in AI generated messages)
- Timezone (for midnight resets, streak calculations, season detection)

### Step 3 — Class Selection
- Full screen class picker
- Three cards: Warrior / Mage / Rogue
- Each shows:
  - Pixel art class preview
  - Playstyle description
    - Warrior: "Discipline through action. Physical goals dominate."
    - Mage: "Discipline through knowledge. Mental and routine goals dominate."
    - Rogue: "Discipline through stealth. Habit stacking and consistency."
  - Stoic philosopher assigned
    - Warrior → Marcus Aurelius
    - Mage → Epictetus
    - Rogue → Seneca
  - Stat bonuses preview
    - Warrior: +bonus XP on workouts
    - Mage: +bonus XP on routines and plan mode
    - Rogue: +bonus XP on habit streaks

### Step 4 — Your Goals
- Multi-select goal cards (pick all that apply):
  - Lose weight
  - Build muscle
  - Fix sleep
  - Quit a bad habit
  - Eat better
  - Manage stress
  - Build a morning routine
  - Stay consistent
- Selected goals influence:
  - Default habits suggested in Step 6
  - AI coach tone and focus
  - Quest types generated

### Step 5 — OpenAI API Key
- Explanation card: "AscendRPG uses OpenAI for food analysis, quest narratives, craving messages and your AI coach. Your key is stored only on your device."
- Input field for API key
- "Test Connection" button → makes a minimal API call to verify
- Shows green checkmark or red error
- Skip option available with warning: "AI features will be disabled until you add a key in Settings"
- Key stored in localStorage, never sent anywhere except OpenAI directly

### Step 6 — Habit Seeding
- Based on goals selected in Step 4, suggest starter habits
- User can toggle each on/off, edit name, set frequency
- Examples:
  - Lose weight → "Log meals daily", "30 min workout", "No junk food after 8pm"
  - Fix sleep → "Sleep by 11pm", "No screens 30 min before bed"
  - Quit bad habit → Prompts to name the bad habit, sets it as negative habit type
- Can add custom habits here too
- Minimum 1 habit required to proceed

### Step 7 — Routine Builder
- Quick morning routine setup
- Drag and drop steps (or simple add/remove)
- Suggested steps based on class:
  - Warrior: workout, cold shower, protein breakfast
  - Mage: meditation, journaling, reading
  - Rogue: review goals, habit check, gratitude note
- Optional: set night routine too
- Can skip, set up later in app

### Step 8 — Character Naming + Preview
- Name your character (defaults to their real name from Step 2)
- See full pixel art character in starting clothes
- Class label shown
- Stats preview: HP 100/100, XP 0, Level 1
- Season background already active based on current date
- Confirm button: "Enter the World"

### Step 9 — First Quest Assignment
- App generates their first daily quest set based on habits from Step 6
- Brief animated sequence: quest scroll unfurls
- First stoic quote displayed in philosopher voice
- Transition to dashboard

## Onboarding UX Rules
- Progress bar shown throughout (Step X of 9)
- Back button on every step except Step 1
- All inputs validated before next step allowed
- Dark RPG aesthetic throughout, consistent with main app
- Pixel art decorative elements on each screen
- No walls of text — short punchy copy only
- Mobile-first layout, everything thumb-reachable
## Tech Stack
- React 18 + Vite
- Tailwind CSS
- Zustand for state management
- Recharts + D3 for charts
- react-calendar-heatmap for heatmaps
- OpenAI API (client-side, user provides key)
- localStorage for persistence
- PWA via vite-plugin-pwa

## Core Systems

### Character System
- 3 classes: Warrior, Mage, Rogue
- Stats: HP, XP, Level, Gold, Willpower
- Exponential leveling: XP required = 100 * (1.5 ^ level)
- XP multiplier streak system: 3 days=1.1x, 7=1.25x, 14=1.5x, 30=2x
- Pixel art character rendered in layers:
  - Base character sprite (CSS pixel art or canvas)
  - Cosmetic layers: clothes → armor → weapon → effects
  - Visual degradation when HP low (cracks, slouch, desaturation)

### Progression Tiers
- Level 1-10: Civilian (clothes unlocks)
- Level 11-20: Apprentice (cloak, gloves, boots)
- Level 21-35: Warrior (armor pieces, level 30 unlocks weapon slot)
- Level 36-50: Elite (full armor, weapon upgrades, aura effects)
- Level 51+: Legend (gold trim, particle effects, legendary weapon animation)

### Season System
- 4 seasons tied to real calendar quarters
- Each season changes background theme automatically
- Seasonal exclusive cosmetics earnable only during that season
- Spring: cherry blossom | Summer: tropical | Autumn: forest | Winter: frozen tundra

### Cosmetic Unlock Triggers
- Level milestones
- Streak achievements (30-day streak → legendary boots)
- Season exclusives
- Boss defeats (rare weapon drops)
- Craving resisted 50x → willpower aura
- Perfect week → gold armor trim
- Shared mode wins → partner badge

## XP Economy
Positive:
- Complete daily habit: +15
- Full morning routine: +30
- Workout logged: +40
- Meal logged: +10
- Craving resisted: +25
- 7-day streak bonus: +100

Negative:
- Craving gave in: -15 to -50 (based on intensity 1-10)
- Negative habit logged (stacking):
  - 1st time: -10
  - 2nd same day: -25
  - 3rd same day: -50 + HP damage
- Missed daily habit: -10
- Skipped scheduled workout: -20

### Negative XP Implementation
- Negative habits → HP damage
- Cravings gave in → gear degradation (visible cracks)
- Level and base XP progress never touched by negatives
- HP regenerates by completing habits next day
- Gear repairs by completing specific habits

## Modules

### 1. Dashboard
- Pixel art character display with all cosmetic layers
- HP bar, XP bar, Level, Gold display
- Today's quest list
- Daily stoic quote (class-specific: Warrior=Marcus Aurelius, Mage=Epictetus, Rogue=Seneca)
- Streak multiplier indicator
- Season background

### 2. Habits Module
- Positive and negative habit types
- Custom frequency: daily / weekly
- Streak counter with fire indicator
- Skip reason logger
- Negative habits stack penalty on repeated same-day logs

### 3. Routines Module
- Morning and night checklists
- Custom routine builder
- Per-step streak tracking
- Completion → XP reward

### 4. Diet Log
- Text entry + photo upload
- OpenAI Vision estimates calories and macros from photo
- Daily nutrition summary
- Water intake tracker
- Macro breakdown pie chart

### 5. Workout Module
- Log sets, reps, duration
- Exercise library
- Weekly volume tracker
- Scheduled workout miss → -XP

### 6. Craving Section
- Log craving: type + intensity (1-10)
- Craving types: food, other (separate tracking)
- 10-minute urge surfing countdown timer
- Resisted → +XP + willpower point + defeated animation
- Gave in → -XP + gear degradation
- AI generates stoic-style message on every craving log referencing current streak and class
- Craving heatmap by time of day

### 7. Quest System
- Daily quests auto-generated from habits and routines
- Weekly boss: user sets a hard goal, damages boss daily by completing habits
- Quest rewards: gold, XP, rare gear drops
- Quest narrative generated by OpenAI ("You must defeat the Calorie Dragon...")

### 8. Shared Mode
- Two players, shared boss battles
- One person fails → both take HP damage
- Extra penalty quests for slacking
- Leaderboard between two players
- Motivational / trash talk messages

### 9. Plan Mode
- Weekly planner view
- OpenAI generates daily plan based on logged goals
- Morning intention + evening reflection inputs

### 10. Analytics
- Multiple heatmaps: habit completion, workout frequency, diet consistency (GitHub-style)
- Charts: weight over time, calories in/out, workout volume, XP earned per week, streak history
- Graphs: macro breakdown pie, mood trend line
- All filterable: week / month / all time

### 11. Motivational Quotes
- Daily stoic quote on dashboard
- Class-specific philosopher voice
- Triggered on streak milestones and level ups
- OpenAI generates stoic-framed messages in philosopher voice

## AI Integration (OpenAI)
- User pastes their own API key in settings (stored in localStorage)
- Food photo → macro + calorie estimate (GPT-4o Vision)
- Craving logged → stoic message in class voice referencing stats
- Negative habit stacked → firm but compassionate message, harsher on repeats
- Recovery message after bad day + completed evening routine
- Plan mode → generates daily schedule
- Quest narrative generator
- Daily AI coach message based on logs
- Chat with your stats ("how was my week?")

## AI Message Tones
- First negative habit occurrence: compassionate
- Repeated same day: firm
- Craving resisted: celebratory + stoic
- Craving gave in: brief, no lecture, just consequence framing
- Recovery: acknowledge slip, reframe tomorrow
- Level up: epic, class-specific

## PWA Requirements
- Installable on mobile
- Offline support via service worker
- App icon + splash screen
- manifest.json configured for GitHub Pages base path

## Data Persistence
- All data in localStorage
- Export / import JSON backup
- No backend required

## Design Language
- Dark theme base
- Pixel art aesthetic throughout
- Retro RPG fonts (Press Start 2P for headings, clean sans for body)
- Seasonal background shifts automatically
- Character sprite layering system in canvas or CSS
- Stat bars styled as RPG HUD elements
- Smooth XP fill animations on level actions

## Build Order (Phase 1 MVP first)
1. Character creation (class select, base sprite)
2. XP / HP / Level system with exponential curve
3. Habits module with positive/negative types
4. Dashboard with character display and daily quests
5. PWA setup for GitHub Pages
6. Stoic quotes system
7. Basic craving logger

Phase 2 and 3 build on top once Phase 1 works.

## Folder Structure
src/
  components/
    character/
    habits/
    routines/
    diet/
    workout/
    cravings/
    quests/
    analytics/
    shared/
    plan/
  store/ (Zustand)
  utils/
  hooks/
  assets/sprites/
  data/quotes.js