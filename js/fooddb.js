// Indian + common food database. No hardcoded calories — used to build precise
// food descriptions that are sent to Gemini for accurate macro estimation.
export const FOOD_DB = [
  // ── Breads & Rotis
  { name: 'Roti / Phulka', serving: '1 piece (35g)', emoji: '🫓', cat: 'breads', desc: 'whole wheat flatbread, thin, no ghee, home-style' },
  { name: 'Paratha (plain)', serving: '1 piece (60g)', emoji: '🫓', cat: 'breads', desc: 'whole wheat paratha with about 1 tsp oil/ghee' },
  { name: 'Aloo Paratha', serving: '1 piece (100g)', emoji: '🫓', cat: 'breads', desc: 'stuffed potato paratha with 1 tsp ghee' },
  { name: 'Gobi / Paneer Paratha', serving: '1 piece (100g)', emoji: '🫓', cat: 'breads', desc: 'stuffed cauliflower or paneer paratha with 1 tsp ghee' },
  { name: 'Puri', serving: '1 piece (30g)', emoji: '🫓', cat: 'breads', desc: 'deep fried whole wheat puri' },
  { name: 'Naan (plain)', serving: '1 piece (90g)', emoji: '🫓', cat: 'breads', desc: 'plain leavened white-flour naan, tandoor-style' },
  { name: 'Bhatura', serving: '1 piece (80g)', emoji: '🫓', cat: 'breads', desc: 'deep fried fermented flour bhatura' },
  { name: 'Bread (white/brown)', serving: '1 slice (30g)', emoji: '🍞', cat: 'breads', desc: 'store-bought bread slice, white or brown' },

  // ── Rice & Grains
  { name: 'Rice, white (cooked)', serving: '1 cup (150g)', emoji: '🍚', cat: 'grains', desc: 'plain cooked white rice' },
  { name: 'Rice, basmati (cooked)', serving: '1 cup (150g)', emoji: '🍚', cat: 'grains', desc: 'cooked basmati rice, plain' },
  { name: 'Rice, brown (cooked)', serving: '1 cup (150g)', emoji: '🍚', cat: 'grains', desc: 'cooked brown rice, plain' },
  { name: 'Poha (cooked)', serving: '1 cup (180g)', emoji: '🍽️', cat: 'grains', desc: 'cooked flattened rice poha with onion, mustard, 1 tsp oil' },
  { name: 'Upma', serving: '1 cup (200g)', emoji: '🍽️', cat: 'grains', desc: 'semolina upma with vegetables, 1.5 tsp oil' },
  { name: 'Oats (cooked)', serving: '1 bowl (200g)', emoji: '🥣', cat: 'grains', desc: 'cooked plain oats with water or milk' },
  { name: 'Khichdi', serving: '1 cup (200g)', emoji: '🍽️', cat: 'grains', desc: 'rice and moong dal khichdi with 1 tsp ghee' },

  // ── Dals & Legumes
  { name: 'Dal (toor/arhar)', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'cooked toor dal with tadka, home-style' },
  { name: 'Dal (moong)', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'cooked moong dal with tadka' },
  { name: 'Dal (masoor red)', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'cooked masoor dal with tadka' },
  { name: 'Dal (chana)', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'cooked chana dal with tadka' },
  { name: 'Dal Makhani', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'creamy dal makhani with butter and cream' },
  { name: 'Rajma (kidney beans)', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'rajma curry with gravy, home-style' },
  { name: 'Chole (chickpea curry)', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'chole/chana masala curry with gravy' },
  { name: 'Moong sprouts (raw)', serving: '1 cup (80g)', emoji: '🌱', cat: 'dals', desc: 'raw sprouted moong beans' },
  { name: 'Black chana (kala chana)', serving: '1 cup (200ml)', emoji: '🥣', cat: 'dals', desc: 'cooked black chickpea curry' },

  // ── Vegetable Dishes
  { name: 'Aloo ki Sabzi', serving: '1 cup (150g)', emoji: '🥔', cat: 'vegetables', desc: 'potato vegetable curry with 1.5 tsp oil' },
  { name: 'Gobi Sabzi', serving: '1 cup (150g)', emoji: '🥦', cat: 'vegetables', desc: 'cauliflower vegetable with 1.5 tsp oil' },
  { name: 'Bhindi (Okra) Sabzi', serving: '1 cup (120g)', emoji: '🫑', cat: 'vegetables', desc: 'okra fry with 2 tsp oil' },
  { name: 'Matar (Peas) Sabzi', serving: '1 cup (150g)', emoji: '🟢', cat: 'vegetables', desc: 'green pea curry with 1 tsp oil' },
  { name: 'Baingan Bharta', serving: '1 cup (150g)', emoji: '🍆', cat: 'vegetables', desc: 'roasted aubergine mash with 1 tbsp oil' },
  { name: 'Mixed Veg Sabzi', serving: '1 cup (150g)', emoji: '🥗', cat: 'vegetables', desc: 'mixed vegetable curry with 1.5 tsp oil' },
  { name: 'Palak Sabzi', serving: '1 cup (150g)', emoji: '🥬', cat: 'vegetables', desc: 'spinach dish with 1 tsp oil' },
  { name: 'Aloo Gobi', serving: '1 cup (170g)', emoji: '🥔', cat: 'vegetables', desc: 'potato and cauliflower dry curry with 1.5 tsp oil' },
  { name: 'Matar Paneer', serving: '1 cup (200ml)', emoji: '🧀', cat: 'vegetables', desc: 'peas and paneer curry with gravy, ~60g paneer, 1 tbsp oil' },
  { name: 'Palak Paneer', serving: '1 cup (200ml)', emoji: '🥬', cat: 'vegetables', desc: 'spinach paneer curry with ~80g paneer, 1 tbsp oil' },
  { name: 'Paneer Bhurji', serving: '1 cup (150g)', emoji: '🧀', cat: 'vegetables', desc: 'scrambled paneer with onion, tomato, 1 tbsp oil, ~100g paneer' },
  { name: 'Kadhi', serving: '1 cup (200ml)', emoji: '🥣', cat: 'vegetables', desc: 'yoghurt-based kadhi with besan, light tadka' },

  // ── Paneer & Dairy
  { name: 'Paneer (raw)', serving: '100g', emoji: '🧀', cat: 'dairy', desc: 'fresh homemade or store-bought paneer, raw' },
  { name: 'Dahi / Curd', serving: '1 cup (200g)', emoji: '🥛', cat: 'dairy', desc: 'plain full-fat curd/yoghurt' },
  { name: 'Milk (full fat)', serving: '1 glass (250ml)', emoji: '🥛', cat: 'dairy', desc: 'full fat cow milk' },
  { name: 'Milk (toned/low fat)', serving: '1 glass (250ml)', emoji: '🥛', cat: 'dairy', desc: 'toned or double-toned milk' },
  { name: 'Lassi (sweet)', serving: '1 glass (300ml)', emoji: '🥛', cat: 'dairy', desc: 'sweet lassi made with full fat curd and sugar' },
  { name: 'Lassi (salted)', serving: '1 glass (300ml)', emoji: '🥛', cat: 'dairy', desc: 'salted chaas/lassi, diluted' },
  { name: 'Chaas / Buttermilk', serving: '1 glass (250ml)', emoji: '🥛', cat: 'dairy', desc: 'diluted spiced buttermilk' },
  { name: 'Ghee', serving: '1 tsp (5g)', emoji: '🫙', cat: 'dairy', desc: 'pure clarified butter ghee' },
  { name: 'Butter', serving: '1 tsp (5g)', emoji: '🧈', cat: 'dairy', desc: 'salted or unsalted butter' },

  // ── Eggs & Proteins
  { name: 'Egg (boiled/poached)', serving: '1 whole egg', emoji: '🥚', cat: 'proteins', desc: 'whole egg, boiled or poached, no oil' },
  { name: 'Egg (fried/scrambled)', serving: '1 whole egg', emoji: '🍳', cat: 'proteins', desc: 'egg fried or scrambled with 1 tsp oil' },
  { name: 'Omelette (2 egg)', serving: '1 omelette', emoji: '🍳', cat: 'proteins', desc: '2-egg omelette with vegetables, 1 tsp oil' },
  { name: 'Chicken Breast (cooked)', serving: '100g', emoji: '🍗', cat: 'proteins', desc: 'grilled or boiled chicken breast, no skin' },
  { name: 'Chicken Curry', serving: '1 cup (200ml)', emoji: '🍗', cat: 'proteins', desc: 'chicken curry with gravy and oil, ~100g chicken' },
  { name: 'Egg Curry', serving: '1 cup (200ml)', emoji: '🥚', cat: 'proteins', desc: 'egg curry with 2 eggs and gravy, 1 tbsp oil' },
  { name: 'Fish (grilled/baked)', serving: '100g', emoji: '🐟', cat: 'proteins', desc: 'grilled fish fillet, minimal oil' },
  { name: 'Fish Curry', serving: '1 cup (200ml)', emoji: '🐟', cat: 'proteins', desc: 'fish curry with gravy and coconut or tomato base' },
  { name: 'Mutton Curry', serving: '1 cup (200ml)', emoji: '🥩', cat: 'proteins', desc: 'mutton curry with bone, ~80g meat, thick gravy' },
  { name: 'Soya Chunks (cooked)', serving: '1 cup (100g dry)', emoji: '🟤', cat: 'proteins', desc: 'rehydrated and cooked soya chunks, plain' },

  // ── South Indian
  { name: 'Idli', serving: '1 piece (40g)', emoji: '⚪', cat: 'south-indian', desc: 'plain steamed idli, no oil' },
  { name: 'Dosa (plain)', serving: '1 piece (60g)', emoji: '🥞', cat: 'south-indian', desc: 'plain thin crispy dosa with minimal oil' },
  { name: 'Masala Dosa', serving: '1 piece (150g)', emoji: '🥞', cat: 'south-indian', desc: 'masala dosa with potato filling, 1 tsp oil' },
  { name: 'Uttapam', serving: '1 piece (100g)', emoji: '🥞', cat: 'south-indian', desc: 'thick uttapam with vegetables, 1 tsp oil' },
  { name: 'Sambar', serving: '1 cup (200ml)', emoji: '🥣', cat: 'south-indian', desc: 'vegetable sambar' },
  { name: 'Coconut Chutney', serving: '2 tbsp (30g)', emoji: '🫙', cat: 'south-indian', desc: 'fresh coconut chutney with tempering' },
  { name: 'Pongal', serving: '1 cup (200g)', emoji: '🍽️', cat: 'south-indian', desc: 'rice and moong dal pongal with ghee' },

  // ── Snacks & Street Food
  { name: 'Samosa', serving: '1 medium piece', emoji: '🔺', cat: 'snacks', desc: 'one medium potato-filled samosa, deep fried' },
  { name: 'Pakoda / Bhajiya', serving: '6 pieces (60g)', emoji: '🍤', cat: 'snacks', desc: 'onion or mixed vegetable pakoda, deep fried' },
  { name: 'Bhel Puri', serving: '1 bowl (150g)', emoji: '🥗', cat: 'snacks', desc: 'bhel puri chaat, no fried sev counted separately' },
  { name: 'Vada Pav', serving: '1 piece', emoji: '🍔', cat: 'snacks', desc: 'vada pav with bun, chutney, fried batata vada' },
  { name: 'Dhokla', serving: '4 pieces (100g)', emoji: '🟡', cat: 'snacks', desc: 'steamed besan dhokla with tadka' },
  { name: 'Banana', serving: '1 medium', emoji: '🍌', cat: 'snacks', desc: 'one medium ripe banana (~120g without peel)' },
  { name: 'Apple', serving: '1 medium', emoji: '🍎', cat: 'snacks', desc: 'one medium apple (~150g without core)' },
  { name: 'Mixed Nuts', serving: '1 handful (30g)', emoji: '🥜', cat: 'snacks', desc: 'mixed almonds, cashews, walnuts' },
  { name: 'Groundnuts / Peanuts', serving: '1 handful (30g)', emoji: '🥜', cat: 'snacks', desc: 'roasted peanuts, unsalted' },

  // ── Condiments & Add-ons
  { name: 'Cooking Oil', serving: '1 tsp (5ml)', emoji: '🫙', cat: 'condiments', desc: 'any cooking oil (sunflower, mustard, refined)' },
  { name: 'Sugar', serving: '1 tsp (5g)', emoji: '🍬', cat: 'condiments', desc: 'white sugar' },
  { name: 'Jaggery', serving: '1 small piece (15g)', emoji: '🟫', cat: 'condiments', desc: 'solid jaggery piece' },
  { name: 'Pickle (achar)', serving: '1 tsp (10g)', emoji: '🫙', cat: 'condiments', desc: 'Indian mango or mixed pickle in oil' },

  // ── Common Complete Meals
  { name: 'Biryani (chicken)', serving: '1 plate (300g)', emoji: '🍛', cat: 'grains', desc: 'one plate chicken biryani with raita, home-style' },
  { name: 'Biryani (veg)', serving: '1 plate (280g)', emoji: '🍛', cat: 'grains', desc: 'one plate vegetable biryani, home-style' },
  { name: 'Curd Rice', serving: '1 cup (200g)', emoji: '🍚', cat: 'grains', desc: 'curd rice with tempering and small amount of pickle' },
  { name: 'Pulao / Pilaf', serving: '1 cup (150g)', emoji: '🍚', cat: 'grains', desc: 'vegetable pulao with ghee, home-style' },
];
