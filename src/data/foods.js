// Indian Food Macro Database — sourced from Rohan Gupta's Fat Loss Fuel System
// All macros per serving as noted. Calories = P*4 + C*4 + F*9

export const FOOD_DB = [
  // Proteins
  { name: '100g Chicken Breast (grilled)', calories: 165, protein: 31, carbs: 0, fat: 3.5, category: 'Protein' },
  { name: '100g Paneer (low-fat)', calories: 160, protein: 18, carbs: 4, fat: 8, category: 'Protein' },
  { name: '2 Boiled Eggs', calories: 140, protein: 12, carbs: 1, fat: 10, category: 'Protein' },
  { name: '3 Egg Whites', calories: 51, protein: 11, carbs: 1, fat: 0, category: 'Protein' },
  { name: '1 Whole Egg', calories: 72, protein: 6, carbs: 0.5, fat: 5, category: 'Protein' },
  { name: '1 Scoop Whey Protein (30g)', calories: 120, protein: 24, carbs: 2, fat: 1, category: 'Protein' },
  { name: '100g Greek Yogurt', calories: 59, protein: 10, carbs: 3, fat: 0, category: 'Protein' },
  { name: '100g Low-fat Dahi (Curd)', calories: 60, protein: 8, carbs: 5, fat: 1, category: 'Protein' },
  { name: '100g Tofu', calories: 76, protein: 10, carbs: 2, fat: 5, category: 'Protein' },
  { name: '100g Moong Dal (cooked)', calories: 104, protein: 7, carbs: 18, fat: 0.5, category: 'Protein' },
  { name: '100g Chana Dal (cooked)', calories: 128, protein: 9, carbs: 21, fat: 1, category: 'Protein' },
  { name: '100g Rajma (cooked)', calories: 127, protein: 9, carbs: 22, fat: 0.5, category: 'Protein' },
  { name: '100g Chole / Chickpeas (cooked)', calories: 164, protein: 9, carbs: 27, fat: 2.6, category: 'Protein' },
  { name: '100g Tuna (canned, water)', calories: 116, protein: 26, carbs: 0, fat: 1, category: 'Protein' },
  { name: '100g Salmon (grilled)', calories: 208, protein: 20, carbs: 0, fat: 13, category: 'Protein' },
  { name: '100g Chicken Thigh (skinless)', calories: 177, protein: 24, carbs: 0, fat: 9, category: 'Protein' },
  { name: '100g Sprouts (mixed)', calories: 80, protein: 6, carbs: 13, fat: 0.4, category: 'Protein' },

  // Carbs
  { name: '100g Cooked Rice', calories: 130, protein: 2.5, carbs: 25, fat: 0.3, category: 'Carbs' },
  { name: '2 Medium Roti / Chapati', calories: 200, protein: 6, carbs: 35, fat: 4, category: 'Carbs' },
  { name: '50g Oats (dry)', calories: 190, protein: 6, carbs: 30, fat: 3, category: 'Carbs' },
  { name: '1 Medium Banana', calories: 89, protein: 1, carbs: 23, fat: 0.3, category: 'Carbs' },
  { name: '1 Medium Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, category: 'Carbs' },
  { name: '100g Sweet Potato (boiled)', calories: 86, protein: 2, carbs: 20, fat: 0.1, category: 'Carbs' },
  { name: '100g Boiled Potato', calories: 87, protein: 2, carbs: 20, fat: 0.1, category: 'Carbs' },
  { name: '2 Idli', calories: 130, protein: 4, carbs: 26, fat: 0.5, category: 'Carbs' },
  { name: '1 Small Dosa', calories: 168, protein: 4, carbs: 32, fat: 3, category: 'Carbs' },
  { name: '50g Quinoa (dry)', calories: 180, protein: 7, carbs: 32, fat: 3, category: 'Carbs' },
  { name: '50g Bajra / Millet Roti', calories: 185, protein: 5, carbs: 36, fat: 2, category: 'Carbs' },
  { name: '2 Wheat Bread Slices', calories: 160, protein: 6, carbs: 30, fat: 2, category: 'Carbs' },
  { name: '100g Upma (cooked)', calories: 150, protein: 4, carbs: 25, fat: 4, category: 'Carbs' },

  // Fats
  { name: '1 tsp Ghee (5g)', calories: 45, protein: 0, carbs: 0, fat: 5, category: 'Fats' },
  { name: '1 tsp Olive Oil', calories: 40, protein: 0, carbs: 0, fat: 4.5, category: 'Fats' },
  { name: '10 Almonds', calories: 70, protein: 2.5, carbs: 2, fat: 6, category: 'Fats' },
  { name: '10g Peanut Butter', calories: 60, protein: 2.5, carbs: 2, fat: 5, category: 'Fats' },
  { name: '3 Walnuts', calories: 65, protein: 2, carbs: 1, fat: 6, category: 'Fats' },
  { name: '1 tbsp Chia Seeds', calories: 60, protein: 2, carbs: 5, fat: 3, category: 'Fats' },
  { name: '1 tbsp Flaxseeds', calories: 55, protein: 2, carbs: 3, fat: 4, category: 'Fats' },
  { name: '1 tbsp Pumpkin Seeds', calories: 45, protein: 2, carbs: 2, fat: 3.5, category: 'Fats' },
  { name: '1 tbsp Sesame Seeds (til)', calories: 52, protein: 2, carbs: 2, fat: 4.5, category: 'Fats' },
  { name: '25g Pomegranate Seeds', calories: 35, protein: 0.5, carbs: 7, fat: 0.5, category: 'Fats' },

  // Vegetables / Fibre
  { name: '100g Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, category: 'Veggies' },
  { name: '100g Spinach (palak)', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, category: 'Veggies' },
  { name: '100g Mixed Salad', calories: 20, protein: 1.5, carbs: 3, fat: 0.2, category: 'Veggies' },
  { name: '100g Cucumber', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, category: 'Veggies' },
  { name: '100g Tomato', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, category: 'Veggies' },
  { name: '100g Carrot', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, category: 'Veggies' },
  { name: '100g Beans (sabzi)', calories: 35, protein: 2, carbs: 7, fat: 0.2, category: 'Veggies' },

  // Drinks
  { name: '200ml Milk (whole)', calories: 130, protein: 6.4, carbs: 9.6, fat: 7, category: 'Drinks' },
  { name: '200ml Milk (toned)', calories: 90, protein: 6, carbs: 9, fat: 3, category: 'Drinks' },
  { name: '250ml Coconut Water', calories: 45, protein: 1.7, carbs: 9, fat: 0.5, category: 'Drinks' },
  { name: '200ml Protein Shake (made)', calories: 150, protein: 25, carbs: 5, fat: 2, category: 'Drinks' },
]

export const SUPER_SEEDS = [
  { id: 'chia', name: 'Chia Seeds', emoji: '🌱', benefit: 'Digestive Champion — slows sugar absorption' },
  { id: 'flax', name: 'Flaxseeds', emoji: '🟤', benefit: 'Hormone Balancer — omega-3, anti-inflammatory' },
  { id: 'pumpkin', name: 'Pumpkin Seeds', emoji: '🎃', benefit: 'Magnesium Powerhouse — better sleep & digestion' },
  { id: 'sesame', name: 'Sesame Seeds', emoji: '⚪', benefit: 'Fat Digestion Enhancer — bile flow support' },
  { id: 'pomegranate', name: 'Pomegranate Seeds', emoji: '🔴', benefit: 'Antioxidant Protector — prebiotic for gut bacteria' },
  { id: 'hemp', name: 'Hemp Seeds', emoji: '🌿', benefit: 'Complete Protein — all essential amino acids' },
  { id: 'sunflower', name: 'Sunflower Seeds', emoji: '🌻', benefit: 'Vitamin E Source — gut lining protection' },
]

export function searchFoods(query) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8)
}

export function calcMaintenance(weightKg, activityLevel) {
  // Mifflin-St Jeor approximation using weight only (simplified)
  const bmr = weightKg * 22
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  return Math.round(bmr * (multipliers[activityLevel] || 1.375))
}

export function calcTargets(weightKg, activityLevel, deficitMode, goal) {
  const maintenance = calcMaintenance(weightKg, activityLevel)
  let calories
  if (goal === 'lose') {
    calories = deficitMode === 'extreme'
      ? maintenance - 500
      : maintenance - 350
  } else if (goal === 'bulk') {
    calories = maintenance + 350
  } else {
    calories = maintenance
  }
  calories = Math.max(1200, calories)

  // Low-carb macro split (from Rohan's system)
  const protein = Math.round(weightKg * 2.0)      // 2g/kg
  const fat = Math.round((calories * 0.25) / 9)
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4)

  return { maintenance, calories, protein, carbs, fat }
}
