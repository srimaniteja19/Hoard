import { describe, it, expect } from "vitest";
import {
  computeNutritionMetrics,
  sumDayMacros,
  RECIPES,
  SCHEDULE,
  GAPS,
  RULES,
  CalculatorInputs,
} from "./counterData";

describe("The Counter Nutrition & Diet Calculations", () => {
  it("calculates BMR, TDEE, deficit, and protein accurately using Mifflin-St Jeor formula", () => {
    const inputs: CalculatorInputs = {
      weight: 75,
      height: 173,
      age: 25,
      activity: 1.55,
      targetDeficit: 500,
      proteinMultiplier: 1.8,
      goalWeight: 70.5,
    };

    const metrics = computeNutritionMetrics(inputs);

    // 10*75 + 6.25*173 - 5*25 + 5 = 750 + 1081.25 - 125 + 5 = 1711.25 => 1711
    expect(metrics.bmr).toBe(1711);
    // 1711 * 1.55 = 2652
    expect(metrics.tdee).toBe(2652);
    // 2652 - 500 = 2152
    expect(metrics.dailyTarget).toBe(2152);
    // 75 * 1.8 = 135
    expect(metrics.proteinTarget).toBe(135);
    // (4.5 kg * 7700) / 500 / 7 = 9.9 weeks
    expect(metrics.weeksToGoal).toBeCloseTo(9.9, 1);
    expect(metrics.carbTargetGrams).toBeGreaterThan(0);
    expect(metrics.fatTargetGrams).toBeGreaterThan(0);
  });

  it("handles user who has already reached their goal weight", () => {
    const inputs: CalculatorInputs = {
      weight: 70,
      height: 173,
      age: 25,
      activity: 1.55,
      goalWeight: 70.5,
    };

    const metrics = computeNutritionMetrics(inputs);
    expect(metrics.weeksToGoal).toBe(0);
  });

  it("correctly aggregates day macros across all meals", () => {
    const day1 = SCHEDULE[0];
    const total = sumDayMacros(day1.meals);

    expect(total.cal).toBe(1590);
    expect(total.protein).toBe(104);
    expect(total.carbs).toBe(153);
    expect(total.fat).toBe(63);
  });

  it("verifies all default recipes contain ingredients, steps, and valid macros", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(12);
    for (const r of RECIPES) {
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(r.steps.length).toBeGreaterThan(0);
      expect(r.macros.cal).toBeGreaterThan(0);
      expect(r.macros.protein).toBeGreaterThanOrEqual(0);
      expect(r.tags.length).toBeGreaterThan(0);
    }
  });

  it("verifies schedule contains 7 days with breakfast, lunch, dinner, and snack", () => {
    expect(SCHEDULE.length).toBe(7);
    for (const day of SCHEDULE) {
      expect(day.meals.length).toBe(4);
      const labels = day.meals.map((m) => m.label);
      expect(labels).toContain("breakfast");
      expect(labels).toContain("lunch");
      expect(labels).toContain("dinner");
      expect(labels).toContain("evening snack");
    }
  });

  it("verifies gaps and rules are fully defined", () => {
    expect(GAPS.length).toBe(4);
    expect(RULES.length).toBe(5);
  });
});
