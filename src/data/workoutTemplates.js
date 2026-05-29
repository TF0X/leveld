// Pre-built workout splits from Rohan Gupta's Training Protocol (Fat Loss)

export const WORKOUT_TEMPLATES = {
  men: [
    {
      id: 'home_beginner_m',
      name: 'Home Workout',
      level: 'Beginner',
      daysPerWeek: 4,
      equipment: 'Bodyweight only',
      description: 'Build strength and lose fat with zero equipment. Perfect for absolute beginners.',
      cardioNote: '20–25 min brisk walk or bodyweight cardio after each session.',
      days: [
        {
          label: 'Day 1 — Full Body A',
          exercises: [
            { name: 'Bodyweight Squats', sets: 3, reps: '12' },
            { name: 'Incline Push-Ups', sets: 3, reps: '8-10' },
            { name: 'Chair / Towel Rows', sets: 3, reps: '10' },
            { name: 'Standing Shoulder Taps', sets: 2, reps: '20 taps' },
            { name: 'Plank', sets: 3, reps: '20-30 sec' },
          ]
        },
        {
          label: 'Day 2 — Cardio + Core',
          exercises: [
            { name: 'Brisk Walk', sets: 1, reps: '5 min' },
            { name: 'Jumping Jacks', sets: 3, reps: '30 sec' },
            { name: 'High Knees (Low Impact)', sets: 3, reps: '30 sec' },
            { name: 'Mountain Climbers (Slow)', sets: 2, reps: '20' },
            { name: 'Dead Bug', sets: 3, reps: '10' },
          ]
        },
        { label: 'Day 3 — Rest / Mobility', exercises: [] },
        {
          label: 'Day 4 — Full Body B',
          exercises: [
            { name: 'Reverse Lunges', sets: 3, reps: '8/leg' },
            { name: 'Knee Push-Ups', sets: 3, reps: '6-8' },
            { name: 'Glute Bridges', sets: 3, reps: '12' },
            { name: 'Pike Push-Ups', sets: 2, reps: '6-8' },
            { name: 'Side Plank', sets: 2, reps: '20 sec/side' },
          ]
        },
        {
          label: 'Day 5 — Conditioning Circuit',
          exercises: [
            { name: 'Bodyweight Squats', sets: 1, reps: '30 sec' },
            { name: 'Push-Ups', sets: 1, reps: '30 sec' },
            { name: 'Jumping Jacks', sets: 1, reps: '30 sec' },
            { name: 'Mountain Climbers', sets: 1, reps: '30 sec' },
          ]
        },
      ]
    },
    {
      id: 'return_to_gym_m',
      name: 'Return-to-Gym',
      level: 'Returning after break',
      daysPerWeek: 4,
      equipment: 'Full gym',
      description: 'Rebuild strength and confidence after 4+ weeks away. Smart bridge back to serious training.',
      cardioNote: '20–25 min incline walk after sessions.',
      days: [
        {
          label: 'Day 1 — Upper Push',
          exercises: [
            { name: 'Dumbbell Bench Press', sets: 3, reps: '10' },
            { name: 'Incline Machine / DB Press', sets: 2, reps: '12' },
            { name: 'Seated DB Shoulder Press', sets: 2, reps: '10' },
            { name: 'Cable Lateral Raises', sets: 2, reps: '15' },
            { name: 'Triceps Pushdown', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 2 — Lower Quad',
          exercises: [
            { name: 'Goblet Squat', sets: 3, reps: '10' },
            { name: 'Leg Press', sets: 3, reps: '12' },
            { name: 'Seated Leg Curl', sets: 2, reps: '12' },
            { name: 'Standing Calf Raises', sets: 3, reps: '15' },
            { name: 'Plank', sets: 2, reps: '30-40 sec' },
          ]
        },
        { label: 'Day 3 — Rest / Mobility', exercises: [] },
        {
          label: 'Day 4 — Upper Pull',
          exercises: [
            { name: 'Lat Pulldown', sets: 3, reps: '10' },
            { name: 'Chest-Supported Row', sets: 3, reps: '12' },
            { name: 'Face Pulls', sets: 2, reps: '15' },
            { name: 'DB Bicep Curls', sets: 2, reps: '12' },
            { name: 'Hammer Curls', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 5 — Lower Hip/Posterior',
          exercises: [
            { name: 'Romanian Deadlift (light)', sets: 3, reps: '8' },
            { name: 'Walking Lunges', sets: 2, reps: '10/leg' },
            { name: 'Hip Thrust', sets: 2, reps: '12' },
            { name: 'Seated Calf Raises', sets: 3, reps: '15' },
            { name: 'Dead Bug', sets: 2, reps: '10' },
          ]
        },
      ]
    },
    {
      id: 'bro_split_m',
      name: 'Bro Split',
      level: 'Beginner (0–6 months)',
      daysPerWeek: 5,
      equipment: 'Full gym',
      description: 'One muscle group per day. Great for learning form and building mind-muscle connection.',
      cardioNote: '20–25 min incline walk or moderate cardio after each session.',
      days: [
        {
          label: 'Day 1 — Chest',
          exercises: [
            { name: 'Barbell Bench Press', sets: 3, reps: '8-10' },
            { name: 'Incline DB Press', sets: 3, reps: '10' },
            { name: 'DB Chest Fly', sets: 2, reps: '12' },
            { name: 'Push-Ups (finisher)', sets: 2, reps: 'AMRAP' },
          ]
        },
        {
          label: 'Day 2 — Back',
          exercises: [
            { name: 'Lat Pulldown', sets: 3, reps: '10' },
            { name: 'Seated Cable Row', sets: 3, reps: '12' },
            { name: 'One-Arm DB Row', sets: 2, reps: '10/arm' },
            { name: 'Straight-Arm Pulldown', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 3 — Shoulders',
          exercises: [
            { name: 'Seated DB Shoulder Press', sets: 3, reps: '10' },
            { name: 'DB Lateral Raises', sets: 3, reps: '15' },
            { name: 'Front Raises', sets: 2, reps: '12' },
            { name: 'Rear Delt Fly', sets: 2, reps: '15' },
          ]
        },
        {
          label: 'Day 4 — Arms',
          exercises: [
            { name: 'Barbell Curl', sets: 3, reps: '10' },
            { name: 'DB Hammer Curl', sets: 2, reps: '12' },
            { name: 'Triceps Pushdown', sets: 3, reps: '12' },
            { name: 'Overhead DB Extension', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 5 — Legs',
          exercises: [
            { name: 'Back Squat', sets: 3, reps: '8-10' },
            { name: 'Leg Press', sets: 3, reps: '10' },
            { name: 'Lying Leg Curl', sets: 2, reps: '12' },
            { name: 'Standing Calf Raises', sets: 3, reps: '15' },
          ]
        },
      ]
    },
    {
      id: '3day_beginner_m',
      name: '3-Day Split',
      level: 'Beginner',
      daysPerWeek: 3,
      equipment: 'Full gym',
      description: 'Low stress, full-body consistency. Best for beginners or those short on time.',
      cardioNote: '20–25 min incline walk after each session.',
      days: [
        {
          label: 'Day 1 — Lower Body',
          exercises: [
            { name: 'Back Squat', sets: 3, reps: '8-10' },
            { name: 'Leg Press', sets: 3, reps: '10-12' },
            { name: 'Lying Leg Curl', sets: 2, reps: '12' },
            { name: 'Standing Calf Raises', sets: 3, reps: '15' },
          ]
        },
        {
          label: 'Day 3 — Upper Body',
          exercises: [
            { name: 'Barbell Bench Press', sets: 3, reps: '8' },
            { name: 'Lat Pulldown', sets: 3, reps: '10' },
            { name: 'Seated DB Shoulder Press', sets: 2, reps: '10' },
            { name: 'Seated Cable Row', sets: 2, reps: '12' },
            { name: 'Triceps Pushdown', sets: 2, reps: '12' },
            { name: 'DB Curls', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 5 — Full Body',
          exercises: [
            { name: 'Romanian Deadlift', sets: 3, reps: '8' },
            { name: 'Incline DB Press', sets: 3, reps: '10' },
            { name: 'Walking Lunges', sets: 2, reps: '10/leg' },
            { name: 'Seated Cable Row', sets: 2, reps: '12' },
            { name: 'Plank', sets: 3, reps: '30 sec' },
          ]
        },
      ]
    },
    {
      id: '4day_intermediate_m',
      name: '4-Day Split',
      level: 'Intermediate',
      daysPerWeek: 4,
      equipment: 'Full gym',
      description: 'Strong balance between results and recovery. Upper/lower structure with progressive overload.',
      cardioNote: '20–25 min incline walk or cycling after each session.',
      days: [
        {
          label: 'Day 1 — Upper Push',
          exercises: [
            { name: 'Barbell Bench Press', sets: 4, reps: '6-8' },
            { name: 'Incline DB Press', sets: 3, reps: '8-10' },
            { name: 'Seated DB Shoulder Press', sets: 3, reps: '8-10' },
            { name: 'Cable Lateral Raises', sets: 3, reps: '15' },
            { name: 'Triceps Pushdown', sets: 3, reps: '12' },
          ]
        },
        {
          label: 'Day 2 — Lower',
          exercises: [
            { name: 'Back Squat', sets: 4, reps: '6-8' },
            { name: 'Romanian Deadlift', sets: 3, reps: '8-10' },
            { name: 'Leg Press', sets: 3, reps: '10' },
            { name: 'Seated Leg Curl', sets: 3, reps: '12' },
            { name: 'Standing Calf Raises', sets: 4, reps: '15' },
          ]
        },
        {
          label: 'Day 4 — Upper Pull',
          exercises: [
            { name: 'Barbell Row / Chest-Supported Row', sets: 4, reps: '6-8' },
            { name: 'Lat Pulldown', sets: 3, reps: '8-10' },
            { name: 'Face Pulls', sets: 3, reps: '15' },
            { name: 'DB Bicep Curls', sets: 3, reps: '12' },
            { name: 'Hammer Curls', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 5 — Lower + Core',
          exercises: [
            { name: 'Deadlift', sets: 3, reps: '5' },
            { name: 'Walking Lunges', sets: 3, reps: '10/leg' },
            { name: 'Hip Thrust', sets: 3, reps: '12' },
            { name: 'Seated Calf Raises', sets: 3, reps: '15' },
            { name: 'Hanging Leg Raises', sets: 3, reps: '12' },
          ]
        },
      ]
    },
    {
      id: '6day_ppl_m',
      name: '6-Day PPL',
      level: 'Advanced',
      daysPerWeek: 6,
      equipment: 'Full gym',
      description: 'Push/Pull/Legs twice per week. Maximum volume for advanced lifters with strong recovery.',
      cardioNote: '20–25 min moderate cardio on rest days or post-session.',
      days: [
        {
          label: 'Day 1 — Push A',
          exercises: [
            { name: 'Barbell Bench Press', sets: 4, reps: '6-8' },
            { name: 'Incline DB Press', sets: 3, reps: '8-10' },
            { name: 'Overhead Press', sets: 3, reps: '8' },
            { name: 'Cable Lateral Raises', sets: 3, reps: '15' },
            { name: 'Triceps Pushdown', sets: 3, reps: '12' },
            { name: 'Overhead Extension', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 2 — Pull A',
          exercises: [
            { name: 'Deadlift', sets: 3, reps: '5' },
            { name: 'Lat Pulldown', sets: 3, reps: '8-10' },
            { name: 'Barbell Row', sets: 3, reps: '8' },
            { name: 'Face Pulls', sets: 3, reps: '15' },
            { name: 'Barbell Curls', sets: 3, reps: '10' },
          ]
        },
        {
          label: 'Day 3 — Legs A',
          exercises: [
            { name: 'Back Squat', sets: 4, reps: '6-8' },
            { name: 'Romanian Deadlift', sets: 3, reps: '8-10' },
            { name: 'Leg Press', sets: 3, reps: '10' },
            { name: 'Leg Curl', sets: 3, reps: '12' },
            { name: 'Calf Raises', sets: 4, reps: '15' },
          ]
        },
        { label: 'Day 4 — Rest', exercises: [] },
        {
          label: 'Day 5 — Push B (Volume)',
          exercises: [
            { name: 'Incline Barbell Press', sets: 4, reps: '8-10' },
            { name: 'Cable Chest Fly', sets: 3, reps: '12' },
            { name: 'DB Shoulder Press', sets: 3, reps: '10' },
            { name: 'Rear Delt Fly', sets: 3, reps: '15' },
            { name: 'Triceps Dips / Pushdown', sets: 3, reps: '12' },
          ]
        },
        {
          label: 'Day 6 — Pull B (Volume)',
          exercises: [
            { name: 'Pull-Ups / Assisted', sets: 3, reps: '8' },
            { name: 'Chest-Supported Row', sets: 3, reps: '12' },
            { name: 'Cable Row', sets: 3, reps: '12' },
            { name: 'Hammer Curls', sets: 3, reps: '12' },
            { name: 'Reverse Curls', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 7 — Legs B (Volume)',
          exercises: [
            { name: 'Front Squat / Hack Squat', sets: 4, reps: '8-10' },
            { name: 'Walking Lunges', sets: 3, reps: '12/leg' },
            { name: 'Hip Thrust', sets: 3, reps: '12' },
            { name: 'Leg Extension', sets: 3, reps: '15' },
            { name: 'Seated Calf Raises', sets: 4, reps: '15' },
          ]
        },
      ]
    },
  ],

  women: [
    {
      id: 'home_beginner_w',
      name: 'Home Workout',
      level: 'Beginner',
      daysPerWeek: 3,
      equipment: 'Bodyweight only',
      description: 'Build strength and tone at home with no equipment. Perfect starting point.',
      cardioNote: '20 min brisk walk after each session.',
      days: [
        {
          label: 'Day 1 — Full Body A',
          exercises: [
            { name: 'Bodyweight Squats', sets: 3, reps: '12' },
            { name: 'Knee Push-Ups', sets: 3, reps: '8-10' },
            { name: 'Glute Bridges', sets: 3, reps: '15' },
            { name: 'Dead Bug', sets: 3, reps: '10' },
            { name: 'Plank', sets: 3, reps: '20 sec' },
          ]
        },
        {
          label: 'Day 3 — Full Body B',
          exercises: [
            { name: 'Reverse Lunges', sets: 3, reps: '10/leg' },
            { name: 'Incline Push-Ups', sets: 3, reps: '10' },
            { name: 'Hip Thrust (bodyweight)', sets: 3, reps: '15' },
            { name: 'Side Plank', sets: 2, reps: '20 sec/side' },
            { name: 'Mountain Climbers', sets: 2, reps: '20' },
          ]
        },
        {
          label: 'Day 5 — Conditioning',
          exercises: [
            { name: 'Squats', sets: 1, reps: '30 sec' },
            { name: 'Glute Bridges', sets: 1, reps: '30 sec' },
            { name: 'Jumping Jacks', sets: 1, reps: '30 sec' },
            { name: 'High Knees', sets: 1, reps: '30 sec' },
          ]
        },
      ]
    },
    {
      id: '3day_beginner_w',
      name: '3-Day Split',
      level: 'Beginner',
      daysPerWeek: 3,
      equipment: 'Full gym',
      description: 'Full-body training with a glute/lower emphasis. Builds strength and burns fat.',
      cardioNote: '20 min incline walk after each session.',
      days: [
        {
          label: 'Day 1 — Lower Body',
          exercises: [
            { name: 'Goblet Squat', sets: 3, reps: '10-12' },
            { name: 'Hip Thrust', sets: 3, reps: '12' },
            { name: 'Leg Press', sets: 3, reps: '12' },
            { name: 'Seated Leg Curl', sets: 2, reps: '12' },
            { name: 'Calf Raises', sets: 3, reps: '15' },
          ]
        },
        {
          label: 'Day 3 — Upper Body',
          exercises: [
            { name: 'DB Bench Press', sets: 3, reps: '10' },
            { name: 'Lat Pulldown', sets: 3, reps: '10' },
            { name: 'Seated DB Shoulder Press', sets: 2, reps: '10' },
            { name: 'Cable Row', sets: 2, reps: '12' },
            { name: 'Triceps Pushdown', sets: 2, reps: '12' },
            { name: 'DB Curls', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 5 — Full Body',
          exercises: [
            { name: 'Romanian Deadlift', sets: 3, reps: '10' },
            { name: 'Walking Lunges', sets: 3, reps: '10/leg' },
            { name: 'Incline DB Press', sets: 3, reps: '10' },
            { name: 'Face Pulls', sets: 2, reps: '15' },
            { name: 'Plank', sets: 3, reps: '30 sec' },
          ]
        },
      ]
    },
    {
      id: '4day_intermediate_w',
      name: '4-Day Split',
      level: 'Intermediate',
      daysPerWeek: 4,
      equipment: 'Full gym',
      description: 'Upper/lower split with glute emphasis. Great balance of volume and recovery.',
      cardioNote: '20–25 min incline walk or cycling after sessions.',
      days: [
        {
          label: 'Day 1 — Lower (Glute Focus)',
          exercises: [
            { name: 'Hip Thrust', sets: 4, reps: '10-12' },
            { name: 'Romanian Deadlift', sets: 3, reps: '10' },
            { name: 'Walking Lunges', sets: 3, reps: '10/leg' },
            { name: 'Seated Leg Curl', sets: 3, reps: '12' },
            { name: 'Calf Raises', sets: 3, reps: '15' },
          ]
        },
        {
          label: 'Day 2 — Upper Body',
          exercises: [
            { name: 'DB Bench Press', sets: 3, reps: '8-10' },
            { name: 'Lat Pulldown', sets: 3, reps: '8-10' },
            { name: 'Seated DB Shoulder Press', sets: 3, reps: '10' },
            { name: 'Cable Row', sets: 3, reps: '12' },
            { name: 'Lateral Raises', sets: 3, reps: '15' },
            { name: 'DB Curls', sets: 2, reps: '12' },
          ]
        },
        {
          label: 'Day 4 — Lower (Quad Focus)',
          exercises: [
            { name: 'Back Squat / Goblet Squat', sets: 4, reps: '8-10' },
            { name: 'Leg Press', sets: 3, reps: '10-12' },
            { name: 'Step-Ups', sets: 3, reps: '10/leg' },
            { name: 'Leg Extension', sets: 3, reps: '15' },
            { name: 'Seated Calf Raises', sets: 3, reps: '15' },
          ]
        },
        {
          label: 'Day 5 — Full Body + Core',
          exercises: [
            { name: 'Deadlift (moderate)', sets: 3, reps: '8' },
            { name: 'Incline DB Press', sets: 3, reps: '10' },
            { name: 'Chest-Supported Row', sets: 3, reps: '10' },
            { name: 'Hanging Leg Raises', sets: 3, reps: '12' },
            { name: 'Plank', sets: 3, reps: '30-40 sec' },
          ]
        },
      ]
    },
  ]
}

export const ALL_TEMPLATES = [
  ...WORKOUT_TEMPLATES.men.map(t => ({ ...t, gender: 'men' })),
  ...WORKOUT_TEMPLATES.women.map(t => ({ ...t, gender: 'women' })),
]

export const PROGRESSION_RULES = [
  'Week 1–2: Learn movements at comfortable weight',
  'Week 3–4: Add 1-2 reps per set',
  'Week 5–6: Increase weight by 2-5%',
  'Week 7: Maintain weight, focus on tempo and control',
  'Week 8: Deload — reduce volume 30-50%, focus on recovery',
]
