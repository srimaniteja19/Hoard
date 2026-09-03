export interface MacroNutrients {
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  name: string;
  time: string;
  tags: string[];
  good: string;
  macros: MacroNutrients;
  per: string;
  ingredients: string[];
  steps: string[];
  note: string;
}

export interface MealItem {
  label: "breakfast" | "lunch" | "dinner" | "evening snack";
  name: string;
  desc: string;
  macros: MacroNutrients;
}

export interface DaySchedule {
  day: string;
  meals: MealItem[];
}

export interface GapItem {
  title: string;
  detail: string;
  icon?: string;
}

export interface RuleItem {
  title: string;
  detail: string;
}

export const TAGS = [
  "chicken",
  "egg",
  "potato",
  "okra",
  "onion",
  "tomato",
  "curd",
  "rice",
  "fruit",
  "noodles",
] as const;

export const TAG_COLOR: Record<string, string> = {
  chicken: "#FF6B35",
  egg: "#FFE600",
  potato: "#C9A227",
  okra: "#3D8361",
  onion: "#B85C38",
  tomato: "#D6432C",
  curd: "#00B4D8",
  rice: "#E8DCC0",
  fruit: "#7FB800",
  noodles: "#8E6C88",
};

export const RECIPES: Recipe[] = [
  {
    id: "chicken-curry",
    name: "Everyday chicken curry",
    time: "35 min",
    tags: ["chicken", "onion", "tomato"],
    good: "Protein, iron",
    macros: { cal: 320, protein: 34, carbs: 8, fat: 16 },
    per: "per serving (~200g chicken)",
    ingredients: [
      "500g boneless chicken, cut into pieces",
      "2 onions, sliced",
      "2 tomatoes, chopped",
      "1 tbsp ginger-garlic paste",
      "1 tsp turmeric, 1 tsp chili powder, 1 tsp coriander powder",
      "1 tsp oil",
      "Salt, curry leaves, coriander to finish",
    ],
    steps: [
      "Heat 1 tsp oil in a pan, add onions, cook until golden (8 min).",
      "Add ginger-garlic paste, cook 1 min until raw smell goes.",
      "Add tomatoes, cook down until soft and oil separates a bit.",
      "Add turmeric, chili, coriander powder, salt. Mix 1 min.",
      "Add chicken, stir to coat, cover and cook on low 15-18 min until done.",
      "Add a splash of water if too thick. Finish with coriander.",
    ],
    note: "Cook once, eat as leftovers at dinner without rice.",
  },
  {
    id: "egg-curry",
    name: "Egg curry",
    time: "25 min",
    tags: ["egg", "onion", "tomato"],
    good: "Protein, B12",
    macros: { cal: 260, protein: 16, carbs: 9, fat: 18 },
    per: "per serving (2 eggs)",
    ingredients: [
      "4-5 boiled eggs, halved",
      "1 onion, sliced",
      "2 tomatoes, chopped",
      "1 tsp ginger-garlic paste",
      "1 tsp turmeric, chili powder to taste",
      "1 tsp oil",
    ],
    steps: [
      "Boil and peel eggs, set aside.",
      "Sauté onion in 1 tsp oil until golden.",
      "Add ginger-garlic paste, then tomatoes, cook until soft.",
      "Add spices and a little water, simmer 5 min into a thick gravy.",
      "Add eggs, simmer 3-4 min so they soak up the curry.",
    ],
    note: "Fast, cheap, high protein — good for a quick dinner.",
  },
  {
    id: "egg-fry",
    name: "Egg fry (bhurji style)",
    time: "10 min",
    tags: ["egg", "onion", "tomato"],
    good: "Protein, quick",
    macros: { cal: 210, protein: 14, carbs: 5, fat: 15 },
    per: "per serving (2-3 eggs)",
    ingredients: [
      "2-3 eggs",
      "1/2 onion, finely chopped",
      "1/2 tomato, finely chopped",
      "Green chili, turmeric, salt",
      "1 tsp oil",
    ],
    steps: [
      "Heat 1 tsp oil, sauté onion and chili until soft.",
      "Add tomato, cook until mushy.",
      "Add turmeric and salt, crack in eggs, scramble until just set.",
    ],
    note: "Your fastest no-rice dinner option — 10 minutes start to finish.",
  },
  {
    id: "potato-saute",
    name: "Potato sauté (not fried)",
    time: "20 min",
    tags: ["potato", "onion"],
    good: "Fiber, potassium",
    macros: { cal: 180, protein: 3, carbs: 30, fat: 5 },
    per: "per serving (~150g)",
    ingredients: [
      "3 medium potatoes, diced small",
      "1/2 onion, sliced",
      "1 tsp oil",
      "Mustard seeds, curry leaves, turmeric, chili powder",
    ],
    steps: [
      "Heat 1 tsp oil, splutter mustard seeds and curry leaves.",
      "Add onion, sauté until soft.",
      "Add potatoes, turmeric, chili powder, salt. Mix well.",
      "Cover and cook on low, stirring occasionally, 12-15 min until soft with light color, not deep fried.",
    ],
    note: "Same masala as a fry, a fraction of the oil.",
  },
  {
    id: "okra-saute",
    name: "Okra sauté (not fried)",
    time: "20 min",
    tags: ["okra", "onion"],
    good: "Fiber, folate",
    macros: { cal: 110, protein: 3, carbs: 12, fat: 5 },
    per: "per serving (~150g)",
    ingredients: [
      "250g okra, sliced",
      "1/2 onion, sliced",
      "1 tsp oil",
      "Turmeric, chili powder, salt",
    ],
    steps: [
      "Heat 1 tsp oil, add onion, sauté until soft.",
      "Add okra, turmeric, chili powder, salt.",
      "Cook uncovered on medium-low, stirring occasionally, 12-15 min until tender and lightly browned — uncovered keeps it from getting slimy.",
    ],
    note: "Uncovered + occasional stir is the trick to non-fried okra that isn't slimy.",
  },
  {
    id: "onion-tomato-salad",
    name: "Onion-tomato salad",
    time: "5 min",
    tags: ["onion", "tomato"],
    good: "Vitamin C, fiber",
    macros: { cal: 45, protein: 1, carbs: 9, fat: 0 },
    per: "per bowl",
    ingredients: [
      "1 onion, thinly sliced",
      "1-2 tomatoes, chopped",
      "Squeeze of lemon",
      "Salt, pepper or chili powder",
    ],
    steps: [
      "Slice onion thin, rinse briefly in cold water to cut sharpness.",
      "Mix with chopped tomato, lemon juice, salt.",
    ],
    note: "Add to every lunch. Costs 5 minutes, adds real fiber and vitamin C.",
  },
  {
    id: "curd-rice",
    name: "Curd rice",
    time: "10 min",
    tags: ["curd", "rice"],
    good: "Calcium, gut health",
    macros: { cal: 230, protein: 8, carbs: 38, fat: 5 },
    per: "per bowl (1 cup rice)",
    ingredients: [
      "1 cup cooked rice, cooled slightly",
      "1/2 cup curd (yogurt)",
      "Splash of milk if too thick",
      "Mustard seeds, curry leaves, green chili tempering",
      "Salt",
    ],
    steps: [
      "Mash rice lightly, mix in curd and a splash of milk to loosen.",
      "Temper mustard seeds and curry leaves in 1/2 tsp oil, pour over.",
      "Season with salt, mix well.",
    ],
    note: "You already eat curd daily — this is just one way to use it at lunch instead of a plain side.",
  },
  {
    id: "greek-yogurt-bowl",
    name: "Greek yogurt bowl",
    time: "5 min",
    tags: ["curd", "fruit"],
    good: "Protein, calcium, probiotics",
    macros: { cal: 190, protein: 20, carbs: 16, fat: 4 },
    per: "per bowl (1 cup Greek yogurt + fruit)",
    ingredients: [
      "1 cup plain Greek yogurt",
      "Handful of grapes or 1/2 banana, sliced",
      "Small handful of almonds/walnuts",
      "Optional: drizzle of honey",
    ],
    steps: [
      "Spoon yogurt into a bowl.",
      "Top with sliced fruit and nuts.",
      "Add a light drizzle of honey if you want sweetness — keep it small.",
    ],
    note: "Your highest protein-per-effort snack. Good as a mid-afternoon option, not just dessert.",
  },
  {
    id: "loaded-noodles",
    name: "Loaded noodles (upgraded)",
    time: "15 min",
    tags: ["noodles", "chicken", "egg", "onion"],
    good: "Balanced version of your usual",
    macros: { cal: 380, protein: 22, carbs: 48, fat: 10 },
    per: "per bowl, half usual noodle portion",
    ingredients: [
      "Half your usual noodle portion",
      "Handful of leftover chicken or 1 egg",
      "Mixed vegetables — cabbage, carrot, bell pepper, whatever's around",
      "1 tsp oil, soy sauce, pepper",
    ],
    steps: [
      "Boil noodles per usual, drain, set aside.",
      "Stir-fry vegetables in 1 tsp oil on high heat, 3-4 min.",
      "Add leftover chicken or scrambled egg.",
      "Toss in noodles, soy sauce, pepper. Mix and serve.",
    ],
    note: "Same craving, more protein and vegetables, less refined carb.",
  },
  {
    id: "evening-fruit",
    name: "Evening fruit plate",
    time: "5 min",
    tags: ["fruit"],
    good: "Vitamin C, potassium, fiber",
    macros: { cal: 150, protein: 2, carbs: 36, fat: 0 },
    per: "per plate (grapes + banana + orange)",
    ingredients: [
      "Handful of grapes",
      "1 banana",
      "1 orange, peeled and segmented",
    ],
    steps: [
      "Wash and portion out whatever combination you have.",
      "Optional: add a small handful of almonds or walnuts alongside for healthy fat.",
    ],
    note: "Keep this daily — pair with a few nuts to round it into a proper snack.",
  },
  {
    id: "greens-saute",
    name: "Quick greens sauté",
    time: "10 min",
    tags: ["onion"],
    good: "Iron, folate, vitamin K",
    macros: { cal: 90, protein: 4, carbs: 8, fat: 5 },
    per: "per serving",
    ingredients: [
      "1 bunch spinach or any leafy green, washed and chopped",
      "1/4 onion, sliced",
      "1 clove garlic, chopped",
      "1 tsp oil",
    ],
    steps: [
      "Heat 1 tsp oil, sauté garlic and onion until fragrant.",
      "Add greens, cook 4-5 min until wilted down.",
      "Salt to taste.",
    ],
    note: "Swap this in for okra or potato 3-4x a week. Your diet currently has almost no leafy greens.",
  },
  {
    id: "overnight-oats-boost",
    name: "Overnight oats, protein boost",
    time: "2 min (+overnight)",
    tags: ["curd", "fruit"],
    good: "Fiber, protein, sustained energy",
    macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
    per: "per jar",
    ingredients: [
      "Your subscribed overnight oats base",
      "2 tbsp Greek yogurt, stirred in",
      "Handful of fruit (banana or berries)",
      "Optional: cinnamon or a few walnuts",
    ],
    steps: [
      "Prep your oats as usual the night before.",
      "Stir in 2 tbsp Greek yogurt before it sets, or in the morning.",
      "Top with fruit and nuts before eating.",
    ],
    note: "Same product you're subscribed to, just with the yogurt you already buy stirred in for extra protein.",
  },
];

export const SCHEDULE: DaySchedule[] = [
  {
    day: "Day 1",
    meals: [
      {
        label: "breakfast",
        name: "Overnight oats + Greek yogurt",
        desc: "Your usual oats with 2 tbsp Greek yogurt stirred in. Coffee alongside.",
        macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
      },
      {
        label: "lunch",
        name: "Chicken curry + potato sauté + rice",
        desc: "1 cup rice, chicken curry, potato sauté, onion-tomato salad.",
        macros: { cal: 610, protein: 41, carbs: 55, fat: 24 },
      },
      {
        label: "dinner",
        name: "Leftover chicken curry + okra sauté",
        desc: "Skip rice. Chicken curry from lunch with sautéed okra.",
        macros: { cal: 430, protein: 37, carbs: 18, fat: 23 },
      },
      {
        label: "evening snack",
        name: "Fruit plate + almonds",
        desc: "Grapes, banana, orange, small handful of almonds.",
        macros: { cal: 210, protein: 4, carbs: 36, fat: 7 },
      },
    ],
  },
  {
    day: "Day 2",
    meals: [
      {
        label: "breakfast",
        name: "Overnight oats + Greek yogurt",
        desc: "Your usual oats with 2 tbsp Greek yogurt stirred in. Coffee alongside.",
        macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
      },
      {
        label: "lunch",
        name: "Egg curry + okra sauté + rice",
        desc: "1 cup rice, egg curry, okra sauté, onion-tomato salad.",
        macros: { cal: 560, protein: 26, carbs: 56, fat: 24 },
      },
      {
        label: "dinner",
        name: "Egg fry + sautéed veggies",
        desc: "2-3 eggs bhurji style, no rice.",
        macros: { cal: 270, protein: 16, carbs: 9, fat: 17 },
      },
      {
        label: "evening snack",
        name: "Greek yogurt bowl",
        desc: "Greek yogurt with fruit and a few walnuts.",
        macros: { cal: 190, protein: 20, carbs: 16, fat: 4 },
      },
    ],
  },
  {
    day: "Day 3",
    meals: [
      {
        label: "breakfast",
        name: "Overnight oats + Greek yogurt",
        desc: "Your usual oats with 2 tbsp Greek yogurt stirred in. Coffee alongside.",
        macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
      },
      {
        label: "lunch",
        name: "Chicken curry + potato sauté + rice",
        desc: "1 cup rice, chicken curry, potato sauté, salad.",
        macros: { cal: 610, protein: 41, carbs: 55, fat: 24 },
      },
      {
        label: "dinner",
        name: "Leftover chicken curry + greens sauté",
        desc: "Skip rice. Swap in leafy greens instead of another fried side.",
        macros: { cal: 410, protein: 38, carbs: 16, fat: 21 },
      },
      {
        label: "evening snack",
        name: "Fruit plate + almonds",
        desc: "Grapes, banana, orange, small handful of almonds.",
        macros: { cal: 210, protein: 4, carbs: 36, fat: 7 },
      },
    ],
  },
  {
    day: "Day 4",
    meals: [
      {
        label: "breakfast",
        name: "Overnight oats + Greek yogurt",
        desc: "Your usual oats with 2 tbsp Greek yogurt stirred in. Coffee alongside.",
        macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
      },
      {
        label: "lunch",
        name: "Egg fry + okra sauté + rice",
        desc: "1 cup rice, egg fry, okra sauté, salad.",
        macros: { cal: 500, protein: 20, carbs: 47, fat: 22 },
      },
      {
        label: "dinner",
        name: "Chicken curry (fresh, small batch) + veggies",
        desc: "Light portion, no rice.",
        macros: { cal: 360, protein: 34, carbs: 10, fat: 19 },
      },
      {
        label: "evening snack",
        name: "Greek yogurt bowl",
        desc: "Greek yogurt with fruit and a few walnuts.",
        macros: { cal: 190, protein: 20, carbs: 16, fat: 4 },
      },
    ],
  },
  {
    day: "Day 5",
    meals: [
      {
        label: "breakfast",
        name: "Overnight oats + Greek yogurt",
        desc: "Your usual oats with 2 tbsp Greek yogurt stirred in. Coffee alongside.",
        macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
      },
      {
        label: "lunch",
        name: "Chicken curry + potato sauté + rice",
        desc: "1 cup rice, chicken curry, potato sauté, salad.",
        macros: { cal: 610, protein: 41, carbs: 55, fat: 24 },
      },
      {
        label: "dinner",
        name: "Loaded noodles",
        desc: "Half portion noodles, extra veg, leftover chicken or egg mixed in.",
        macros: { cal: 380, protein: 22, carbs: 48, fat: 10 },
      },
      {
        label: "evening snack",
        name: "Fruit plate",
        desc: "Grapes, banana, orange.",
        macros: { cal: 150, protein: 2, carbs: 36, fat: 0 },
      },
    ],
  },
  {
    day: "Day 6",
    meals: [
      {
        label: "breakfast",
        name: "Overnight oats + Greek yogurt",
        desc: "Your usual oats with 2 tbsp Greek yogurt stirred in. Coffee alongside.",
        macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
      },
      {
        label: "lunch",
        name: "Egg curry + okra fry (sauté) + rice",
        desc: "1 cup rice, egg curry, okra sauté, salad.",
        macros: { cal: 560, protein: 26, carbs: 56, fat: 24 },
      },
      {
        label: "dinner",
        name: "Leftover curry + curd rice (small)",
        desc: "Small curd rice portion instead of plain rice, plus leftover curry.",
        macros: { cal: 420, protein: 30, carbs: 40, fat: 16 },
      },
      {
        label: "evening snack",
        name: "Greek yogurt bowl",
        desc: "Greek yogurt with fruit and a few walnuts.",
        macros: { cal: 190, protein: 20, carbs: 16, fat: 4 },
      },
    ],
  },
  {
    day: "Day 7 (flex day)",
    meals: [
      {
        label: "breakfast",
        name: "Overnight oats + Greek yogurt",
        desc: "Your usual oats with 2 tbsp Greek yogurt stirred in. Coffee alongside.",
        macros: { cal: 340, protein: 22, carbs: 44, fat: 9 },
      },
      {
        label: "lunch",
        name: "Chicken curry + whatever's left, sautéed + rice",
        desc: "1 cup rice, chicken curry, potato or okra sauté, salad.",
        macros: { cal: 610, protein: 41, carbs: 55, fat: 24 },
      },
      {
        label: "dinner",
        name: "Cheat meal — pizza or chicken burger",
        desc: "Thin crust over deep dish, grilled patty over fried where possible. Side salad if ordering in.",
        macros: { cal: 800, protein: 30, carbs: 80, fat: 38 },
      },
      {
        label: "evening snack",
        name: "Fruit plate",
        desc: "Grapes, banana, orange — keep this even on the flex day.",
        macros: { cal: 150, protein: 2, carbs: 36, fat: 0 },
      },
    ],
  },
];

export const GAPS: GapItem[] = [
  {
    title: "Leafy greens",
    detail:
      "Spinach or methi, 3-4x a week. Iron, folate, vitamin K — the single biggest gap in your current diet.",
  },
  {
    title: "Nuts and seeds",
    detail:
      "A small handful daily alongside evening fruit or yogurt. Essential omega-3s and healthy fats you are currently low on.",
  },
  {
    title: "Whole grains",
    detail:
      "Swap rice for a roti or millet occasionally. More fiber diversity beyond refined white rice.",
  },
  {
    title: "Water",
    detail:
      "2.5-3L/day (8-10 glasses), especially critical with higher protein intake and coffee's mild diuretic effect.",
  },
];

export const RULES: RuleItem[] = [
  {
    title: "Rice = 1 cup at lunch, max",
    detail:
      "Everything else in your existing lunch can stay the same. This one change does more for the deficit than anything else here.",
  },
  {
    title: "No rice or noodles at dinner by default",
    detail:
      "Protein plus vegetables instead. Noodles only once a week, loaded with extra veg and protein, not eaten plain.",
  },
  {
    title: "Fry becomes sauté",
    detail:
      "Same masala for potato and okra, 1 tsp oil instead of deep or shallow fry. Barely changes the taste, meaningfully cuts calories.",
  },
  {
    title: "Protein target: about 135g/day",
    detail:
      "At 1.8g per kg bodyweight. Chicken, egg, curd, and Greek yogurt across the day gets you there without needing supplements.",
  },
  {
    title: "Coffee and fruit stay exactly as is",
    detail:
      "Both already fit the plan — coffee black is close to zero calories, evening fruit is genuinely good fiber and micronutrients.",
  },
];

// ── Calculator Logic ────────────────────────────────────────────────────────
export interface CalculatorInputs {
  weight: number; // in kg (e.g. 75)
  height: number; // in cm (e.g. 173)
  age: number; // in years (e.g. 25)
  activity: number; // multiplier (e.g. 1.2, 1.375, 1.55, 1.725)
  targetDeficit?: number; // default 500 kcal
  proteinMultiplier?: number; // default 1.8 g/kg
  goalWeight?: number; // default 70.5
}

export interface CalculatorOutputs {
  bmr: number;
  tdee: number;
  dailyTarget: number;
  proteinTarget: number;
  weeksToGoal: number;
  carbTargetGrams: number;
  fatTargetGrams: number;
}

export function computeNutritionMetrics(inputs: CalculatorInputs): CalculatorOutputs {
  const {
    weight,
    height,
    age,
    activity,
    targetDeficit = 500,
    proteinMultiplier = 1.8,
    goalWeight = 70.5,
  } = inputs;

  // Mifflin-St Jeor formula for Men
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  const tdee = Math.round(bmr * activity);
  const dailyTarget = Math.max(1200, Math.round(tdee - targetDeficit));
  const proteinTarget = Math.round(weight * proteinMultiplier);

  // 1g protein = 4 kcal, 1g fat = 9 kcal, 1g carb = 4 kcal
  const proteinCalories = proteinTarget * 4;
  const fatCalories = Math.round(dailyTarget * 0.25); // 25% fat
  const fatTargetGrams = Math.round(fatCalories / 9);
  const carbCalories = Math.max(0, dailyTarget - proteinCalories - fatCalories);
  const carbTargetGrams = Math.round(carbCalories / 4);

  const goalLoss = weight - goalWeight;
  // 1 kg body fat ≈ 7,700 kcal. At a deficit of D kcal/day, days = (goalLoss * 7700) / D
  const weeksToGoal =
    goalLoss > 0 && targetDeficit > 0
      ? Math.round(((goalLoss * 7700) / targetDeficit / 7) * 10) / 10
      : 0;

  return {
    bmr,
    tdee,
    dailyTarget,
    proteinTarget,
    weeksToGoal,
    carbTargetGrams,
    fatTargetGrams,
  };
}

export function sumDayMacros(meals: MealItem[]): MacroNutrients {
  return meals.reduce(
    (acc, m) => ({
      cal: acc.cal + m.macros.cal,
      protein: acc.protein + m.macros.protein,
      carbs: acc.carbs + m.macros.carbs,
      fat: acc.fat + m.macros.fat,
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
