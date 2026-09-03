import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { requireUserId, AuthError } from "@/lib/session";

export const runtime = "nodejs";
const COUNTER_AI_MODEL = "google/gemini-3.5-flash-lite";

// ── 1. Recipe Generation Schema ─────────────────────────────────────────────
const GeneratedRecipeSchema = z.object({
  id: z.string().describe("kebab-case identifier e.g. spiced-spinach-egg-bhurji"),
  name: z.string().describe("Appetizing, concise recipe name"),
  time: z.string().describe("Estimated prep/cook time e.g. '15 min'"),
  tags: z.array(z.string()).describe("Ingredient or category tags e.g. ['egg', 'spinach', 'onion']"),
  good: z.string().describe("Key nutritional highlights e.g. 'High protein, iron, low carb'"),
  macros: z.object({
    cal: z.number().describe("Total calories in kcal"),
    protein: z.number().describe("Protein in grams"),
    carbs: z.number().describe("Carbs in grams"),
    fat: z.number().describe("Fat in grams"),
  }),
  per: z.string().describe("Portion description e.g. 'per bowl (~250g)'"),
  ingredients: z.array(z.string()).describe("List of exact ingredients and measurements"),
  steps: z.array(z.string()).describe("Step-by-step clear cooking instructions"),
  note: z.string().describe("Pro kitchen tip, substitution, or calorie-saving advice"),
});

// ── 2. Plan Adjustment Schema ───────────────────────────────────────────────
const PlanAdjustmentSchema = z.object({
  summary: z.string().describe("Executive overview of dietary tweaks and strategy"),
  proteinStrategy: z.string().describe("Exact advice on reaching protein targets"),
  calorieAdvice: z.string().describe("Advice on managing calorie density and deficit"),
  suggestedSwaps: z.array(
    z.object({
      originalMeal: z.string().describe("Name of meal being replaced e.g. 'Chicken curry at lunch'"),
      replacementMeal: z.string().describe("Proposed replacement meal"),
      macros: z.object({
        cal: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
      }),
      reason: z.string().describe("Why this swap satisfies the user's constraints"),
    })
  ),
  keyRule: z.string().describe("One memorable golden rule for this modified plan"),
});

// ── 3. Macro Estimation Schema ──────────────────────────────────────────────
const MacroEstimateSchema = z.object({
  mealName: z.string().describe("Standardized concise name of logged food"),
  portion: z.string().describe("Interpreted portion size e.g. '2 large eggs, 1 cup curd rice'"),
  macros: z.object({
    cal: z.number().describe("Estimated total calories in kcal"),
    protein: z.number().describe("Estimated protein in grams"),
    carbs: z.number().describe("Estimated carbs in grams"),
    fat: z.number().describe("Estimated fat in grams"),
  }),
  breakdown: z.array(
    z.object({
      item: z.string().describe("Component food item e.g. 'Curd rice (1 cup)'"),
      cal: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    })
  ),
  feedback: z.string().describe("Nutritional verdict: does it align with high protein / ~500 kcal deficit?"),
  tip: z.string().describe("Actionable adjustment for next time (e.g. reduce oil, swap rice)"),
});

export async function POST(req: NextRequest) {
  try {
    // Optional auth - fallback for local usage
    let userId: string | null = null;
    try {
      userId = await requireUserId(req);
    } catch (e) {
      if (!(e instanceof AuthError)) throw e;
    }

    const body = await req.json();
    const { action, ingredients, mealType, prompt, logText, userMetrics } = body;

    const systemPrompt = `You are "The Counter AI" — an elite culinary nutritionist and performance diet architect.
You specialize in home cooking using what is already in the kitchen (everyday chicken curry, egg bhurji, sautéed vegetables, yogurt/curd, oats, fruits, rice).
YOUR PHILOSOPHY:
- No starvation diets. High protein (~1.8g per kg bodyweight, approx 130-140g/day) with a modest ~500 kcal deficit.
- Preserve muscle and metabolism while shedding body fat.
- Golden rules: Sauté with 1 tsp oil instead of deep frying; cap white rice at 1 cup at lunch; skip rice/noodles at dinner by default; prioritize curd and Greek yogurt daily; black coffee and whole fruits are encouraged.
- Be precise, realistic with numbers, and empathetic with cooking time.`;

    if (action === "generate_recipe") {
      const ingredientList = Array.isArray(ingredients) ? ingredients.join(", ") : ingredients || "pantry staples";
      const userPrompt = `Create an everyday high-protein, calorie-conscious recipe using primarily these ingredients: ${ingredientList}.
Meal type requested: ${mealType || "lunch or dinner"}.
Keep cooking time under 30 minutes where possible. Follow the sauté instead of deep-fry principle.
User profile: ${userMetrics ? `Weight: ${userMetrics.weight}kg, Target: ${userMetrics.dailyTarget} kcal/day` : "75kg, 500 kcal deficit target"}.`;

      const result = await generateObject({
        model: languageModel(COUNTER_AI_MODEL),
        system: systemPrompt,
        prompt: userPrompt,
        schema: GeneratedRecipeSchema,
        providerOptions: gatewayProviderOptions(COUNTER_AI_MODEL, ["todos", "counter", "generate-recipe"]),
      });

      return NextResponse.json({ recipe: result.object });
    }

    if (action === "tweak_plan") {
      const userPrompt = `The user wants to customize their 30-day nutrition plan based on this request:
"${prompt}"
User metrics: ${JSON.stringify(userMetrics || { weight: 75, targetDeficit: 500, dailyTarget: 1850, proteinTarget: 135 })}.
Provide tailored swaps, protein strategies, and an updated blueprint.`;

      const result = await generateObject({
        model: languageModel(COUNTER_AI_MODEL),
        system: systemPrompt,
        prompt: userPrompt,
        schema: PlanAdjustmentSchema,
        providerOptions: gatewayProviderOptions(COUNTER_AI_MODEL, ["todos", "counter", "tweak-plan"]),
      });

      return NextResponse.json({ plan: result.object });
    }

    if (action === "estimate_macros") {
      const userPrompt = `Estimate the realistic nutritional macros for this meal:
"${logText}"
Provide item-by-item breakdown, total calories, protein, carbs, and fat, plus actionable feedback on how it fits a fat-loss / body-recomposition plan.`;

      const result = await generateObject({
        model: languageModel(COUNTER_AI_MODEL),
        system: systemPrompt,
        prompt: userPrompt,
        schema: MacroEstimateSchema,
        providerOptions: gatewayProviderOptions(COUNTER_AI_MODEL, ["todos", "counter", "estimate-macros"]),
      });

      return NextResponse.json({ estimate: result.object });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/todos/counter/ai]", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) },
      { status: 500 }
    );
  }
}
