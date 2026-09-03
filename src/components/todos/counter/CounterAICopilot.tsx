"use client";

import React, { useState } from "react";
import { Recipe, CalculatorOutputs, CalculatorInputs } from "@/lib/todos/counterData";
import { playSound } from "@/lib/sound";
import {
  Sparkles,
  ChefHat,
  Sliders,
  Scale,
  Plus,
  Check,
  RotateCcw,
  Loader2,
  ArrowRight,
  Flame,
} from "lucide-react";

interface CounterAICopilotProps {
  metrics: CalculatorOutputs;
  inputs: CalculatorInputs;
  onSaveRecipe?: (recipe: Recipe) => void;
  onAddTodo?: (title: string, minutes: number, energy: "LOW" | "MED" | "HIGH") => void;
}

export const CounterAICopilot: React.FC<CounterAICopilotProps> = ({
  metrics,
  inputs,
  onSaveRecipe,
  onAddTodo,
}) => {
  const [copilotTab, setCopilotTab] = useState<"kitchen" | "tweak" | "macros">("kitchen");

  // Kitchen State
  const [ingredientsInput, setIngredientsInput] = useState("eggs, spinach, onion, greek yogurt");
  const [mealType, setMealType] = useState("dinner (no rice)");
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [savedRecipeSuccess, setSavedRecipeSuccess] = useState(false);
  const [addedTaskSuccess, setAddedTaskSuccess] = useState(false);

  // Plan Tweak State
  const [tweakPrompt, setTweakPrompt] = useState("");
  const [loadingTweak, setLoadingTweak] = useState(false);
  const [planAdjustment, setPlanAdjustment] = useState<any | null>(null);

  // Macro Estimator State
  const [logInput, setLogInput] = useState("");
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [macroEstimate, setMacroEstimate] = useState<any | null>(null);

  // ── Handler 1: Generate Recipe ────────────────────────────────────────────
  const handleGenerateRecipe = async () => {
    if (!ingredientsInput.trim()) return;
    playSound.pop();
    setLoadingRecipe(true);
    setGeneratedRecipe(null);
    setSavedRecipeSuccess(false);

    try {
      const res = await fetch("/api/todos/counter/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_recipe",
          ingredients: ingredientsInput,
          mealType,
          userMetrics: {
            weight: inputs.weight,
            dailyTarget: metrics.dailyTarget,
            proteinTarget: metrics.proteinTarget,
          },
        }),
      });
      const data = await res.json();
      if (data.recipe) {
        playSound.promote();
        setGeneratedRecipe(data.recipe);
      }
    } catch (e) {
      console.error("AI Recipe Generation failed:", e);
    } finally {
      setLoadingRecipe(false);
    }
  };

  // ── Handler 2: Tweak Plan ─────────────────────────────────────────────────
  const handleTweakPlan = async (customText?: string) => {
    const textToUse = customText || tweakPrompt;
    if (!textToUse.trim()) return;
    playSound.pop();
    setLoadingTweak(true);
    setPlanAdjustment(null);

    try {
      const res = await fetch("/api/todos/counter/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tweak_plan",
          prompt: textToUse,
          userMetrics: {
            weight: inputs.weight,
            targetDeficit: inputs.targetDeficit || 500,
            dailyTarget: metrics.dailyTarget,
            proteinTarget: metrics.proteinTarget,
          },
        }),
      });
      const data = await res.json();
      if (data.plan) {
        playSound.promote();
        setPlanAdjustment(data.plan);
      }
    } catch (e) {
      console.error("AI Plan Tweak failed:", e);
    } finally {
      setLoadingTweak(false);
    }
  };

  // ── Handler 3: Estimate Macros ────────────────────────────────────────────
  const handleEstimateMacros = async () => {
    if (!logInput.trim()) return;
    playSound.pop();
    setLoadingEstimate(true);
    setMacroEstimate(null);

    try {
      const res = await fetch("/api/todos/counter/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "estimate_macros",
          logText: logInput,
        }),
      });
      const data = await res.json();
      if (data.estimate) {
        playSound.promote();
        setMacroEstimate(data.estimate);
      }
    } catch (e) {
      console.error("AI Macro Estimation failed:", e);
    } finally {
      setLoadingEstimate(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── SUB-TABS ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {[
          { id: "kitchen", label: "WHAT'S IN MY KITCHEN?", icon: ChefHat },
          { id: "tweak", label: "TWEAK MY 30-DAY PLAN", icon: Sliders },
          { id: "macros", label: "ESTIMATE MEAL MACROS", icon: Scale },
        ].map((tab) => {
          const isActive = copilotTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playSound.click();
                setCopilotTab(tab.id as any);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                padding: "8px 14px",
                border: "2.5px solid #111111",
                background: isActive ? "#FFE600" : "#FFFFFF",
                color: "#111111",
                cursor: "pointer",
                boxShadow: isActive ? "3px 3px 0 #111111" : "none",
                transform: isActive ? "translate(-1px, -1px)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW A: WHAT'S IN MY KITCHEN?
         ══════════════════════════════════════════════════════════════════════ */}
      {copilotTab === "kitchen" && (
        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #111111",
            boxShadow: "6px 6px 0 #111111",
            padding: "22px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.06em",
              background: "#FF6B35",
              color: "#FFFFFF",
              display: "inline-block",
              padding: "4px 12px",
              border: "2px solid #111111",
              marginBottom: "14px",
            }}
          >
            PANTRY RECIPE GENERATOR
          </div>

          <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#333", lineHeight: 1.5 }}>
            Tell the AI what ingredients you have in your fridge right now. It will generate a high-protein, calorie-calibrated recipe following the 1-tsp-oil sauté rule.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, display: "block", marginBottom: "4px" }}>
                AVAILABLE INGREDIENTS
              </label>
              <input
                type="text"
                value={ingredientsInput}
                onChange={(e) => setIngredientsInput(e.target.value)}
                placeholder="e.g. 3 eggs, 1 onion, spinach, curd, green chili..."
                style={{
                  width: "100%",
                  fontFamily: "var(--sans, system-ui, sans-serif)",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "10px 12px",
                  border: "2.5px solid #111111",
                  background: "#F4F0EA",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, display: "block", marginBottom: "4px" }}>
                  MEAL TYPE
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  style={{
                    width: "100%",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "13px",
                    fontWeight: 800,
                    padding: "9px 10px",
                    border: "2.5px solid #111111",
                    background: "#F4F0EA",
                    outline: "none",
                  }}
                >
                  <option value="dinner (no rice)">Dinner (high protein, no rice)</option>
                  <option value="lunch (1 cup rice or salad)">Lunch (1 cup rice + veg)</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="evening snack">High-protein Snack</option>
                </select>
              </div>

              {/* Quick ingredient chips */}
              <div style={{ flex: 2, minWidth: "220px" }}>
                <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, display: "block", marginBottom: "4px" }}>
                  QUICK ADD TO PANTRY
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["chicken", "eggs", "tofu", "spinach", "mushrooms", "okra", "greek yogurt"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setIngredientsInput((prev) => (prev ? `${prev}, ${item}` : item));
                      }}
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "4px 8px",
                        border: "1.5px solid #111111",
                        background: "#F4F0EA",
                        cursor: "pointer",
                      }}
                    >
                      +{item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={loadingRecipe || !ingredientsInput.trim()}
            onClick={handleGenerateRecipe}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.06em",
              padding: "12px 22px",
              border: "2.5px solid #111111",
              background: loadingRecipe ? "#CCCCCC" : "#FFE600",
              color: "#111111",
              cursor: loadingRecipe ? "not-allowed" : "pointer",
              boxShadow: loadingRecipe ? "none" : "4px 4px 0 #111111",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {loadingRecipe ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{loadingRecipe ? "AI IS COOKING..." : "GENERATE RECIPE"}</span>
          </button>

          {/* Render Generated Recipe */}
          {generatedRecipe && (
            <div
              style={{
                marginTop: "24px",
                border: "3px solid #111111",
                background: "#F4F0EA",
                padding: "20px 22px",
                boxShadow: "6px 6px 0 #111111",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "22px", margin: 0, fontWeight: 800 }}>
                  {generatedRecipe.name}
                </h3>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, background: "#111", color: "#FFF", padding: "3px 8px" }}>
                  {generatedRecipe.time}
                </span>
              </div>

              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#3D8361", fontWeight: 800, marginBottom: "12px" }}>
                ★ {generatedRecipe.good} · {generatedRecipe.per}
              </div>

              {/* Macro Pills */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 9px", border: "2px solid #111", background: "#FFF" }}>
                  {generatedRecipe.macros.cal} kcal
                </span>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 9px", border: "2px solid #111", background: "#FF6B35", color: "#FFF" }}>
                  {generatedRecipe.macros.protein}g protein
                </span>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 9px", border: "2px solid #111", background: "#FFE600" }}>
                  {generatedRecipe.macros.carbs}g carbs
                </span>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 9px", border: "2px solid #111", background: "#00B4D8" }}>
                  {generatedRecipe.macros.fat}g fat
                </span>
              </div>

              <div style={{ fontWeight: 800, fontSize: "12px", fontFamily: "var(--mono, monospace)", marginBottom: "6px" }}>
                INGREDIENTS:
              </div>
              <ul style={{ margin: "0 0 14px", paddingLeft: "20px", fontSize: "13.5px", lineHeight: "1.6" }}>
                {generatedRecipe.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>

              <div style={{ fontWeight: 800, fontSize: "12px", fontFamily: "var(--mono, monospace)", marginBottom: "6px" }}>
                STEPS:
              </div>
              <ol style={{ margin: "0 0 14px", paddingLeft: "20px", fontSize: "13.5px", lineHeight: "1.6" }}>
                {generatedRecipe.steps.map((st, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>
                    {st}
                  </li>
                ))}
              </ol>

              <div style={{ borderTop: "2px dashed #111", paddingTop: "10px", fontFamily: "var(--mono, monospace)", fontSize: "12px", marginBottom: "16px" }}>
                💡 <strong>Chef Tip:</strong> {generatedRecipe.note}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {onSaveRecipe && (
                  <button
                    type="button"
                    onClick={() => {
                      playSound.click();
                      onSaveRecipe(generatedRecipe);
                      setSavedRecipeSuccess(true);
                      setTimeout(() => setSavedRecipeSuccess(false), 2000);
                    }}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontWeight: 800,
                      fontSize: "11px",
                      padding: "8px 14px",
                      border: "2px solid #111",
                      background: savedRecipeSuccess ? "#3D8361" : "#FFFFFF",
                      color: savedRecipeSuccess ? "#FFFFFF" : "#111111",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {savedRecipeSuccess ? <Check size={13} /> : <Plus size={13} />}
                    <span>{savedRecipeSuccess ? "SAVED TO RECIPES!" : "+ SAVE TO RECIPES"}</span>
                  </button>
                )}

                {onAddTodo && (
                  <button
                    type="button"
                    onClick={() => {
                      playSound.click();
                      const minutes = parseInt(generatedRecipe.time, 10) || 20;
                      onAddTodo(`Cook: ${generatedRecipe.name} (~${generatedRecipe.macros.cal} kcal, ${generatedRecipe.macros.protein}g protein)`, minutes, "MED");
                      setAddedTaskSuccess(true);
                      setTimeout(() => setAddedTaskSuccess(false), 2000);
                    }}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontWeight: 800,
                      fontSize: "11px",
                      padding: "8px 14px",
                      border: "2px solid #111",
                      background: addedTaskSuccess ? "#3D8361" : "#FF6B35",
                      color: "#FFFFFF",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {addedTaskSuccess ? <Check size={13} /> : <Plus size={13} />}
                    <span>{addedTaskSuccess ? "ADDED TO TODAY!" : "+ ADD TO TODAY'S TASKS"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW B: TWEAK MY 30-DAY PLAN
         ══════════════════════════════════════════════════════════════════════ */}
      {copilotTab === "tweak" && (
        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #111111",
            boxShadow: "6px 6px 0 #111111",
            padding: "22px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.06em",
              background: "#3D8361",
              color: "#FFFFFF",
              display: "inline-block",
              padding: "4px 12px",
              border: "2px solid #111111",
              marginBottom: "14px",
            }}
          >
            PLAN STRATEGY CUSTOMIZER
          </div>

          <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#333", lineHeight: 1.5 }}>
            Need vegetarian swaps, faster 10-minute prep, or a tailored calorie target? Choose a prompt below or describe your lifestyle constraints.
          </p>

          {/* Quick presets */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
            {[
              "Make the plan 100% vegetarian with 135g protein",
              "I only have 15 minutes to cook each meal",
              "Include more paneer and Greek yogurt substitutes",
              "Aggressive ~700 kcal deficit without muscle loss",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setTweakPrompt(preset);
                  handleTweakPlan(preset);
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "6px 12px",
                  border: "2px solid #111111",
                  background: "#F4F0EA",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                👉 {preset}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input
              type="text"
              value={tweakPrompt}
              onChange={(e) => setTweakPrompt(e.target.value)}
              placeholder="Or write custom instructions (e.g. allergic to tomatoes, prefer lentils)..."
              style={{
                flex: 1,
                fontFamily: "var(--sans, system-ui, sans-serif)",
                fontSize: "14px",
                fontWeight: 600,
                padding: "10px 12px",
                border: "2.5px solid #111111",
                background: "#F4F0EA",
                outline: "none",
              }}
            />
            <button
              type="button"
              disabled={loadingTweak || !tweakPrompt.trim()}
              onClick={() => handleTweakPlan()}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontWeight: 800,
                fontSize: "12px",
                padding: "10px 18px",
                border: "2.5px solid #111111",
                background: loadingTweak ? "#CCC" : "#FFE600",
                cursor: loadingTweak ? "not-allowed" : "pointer",
                boxShadow: "3px 3px 0 #111111",
                whiteSpace: "nowrap",
              }}
            >
              {loadingTweak ? "ANALYZING..." : "OPTIMIZE PLAN"}
            </button>
          </div>

          {planAdjustment && (
            <div
              style={{
                marginTop: "20px",
                border: "3px solid #111111",
                background: "#F4F0EA",
                padding: "18px 20px",
                boxShadow: "5px 5px 0 #111111",
              }}
            >
              <h4 style={{ fontSize: "18px", margin: "0 0 8px", fontWeight: 800 }}>
                Tailored Strategy Blueprint
              </h4>
              <p style={{ fontSize: "14px", margin: "0 0 14px", lineHeight: 1.55 }}>
                {planAdjustment.summary}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div style={{ background: "#FFF", border: "2px solid #111", padding: "12px" }}>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontWeight: 800, fontSize: "11px", color: "#FF6B35", marginBottom: "4px" }}>
                    PROTEIN STRATEGY
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: 1.5 }}>
                    {planAdjustment.proteinStrategy}
                  </div>
                </div>

                <div style={{ background: "#FFF", border: "2px solid #111", padding: "12px" }}>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontWeight: 800, fontSize: "11px", color: "#00B4D8", marginBottom: "4px" }}>
                    CALORIE & DEFICIT ADVICE
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: 1.5 }}>
                    {planAdjustment.calorieAdvice}
                  </div>
                </div>
              </div>

              {planAdjustment.suggestedSwaps && (
                <div>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontWeight: 800, fontSize: "11px", marginBottom: "8px" }}>
                    SUGGESTED MEAL SWAPS:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {planAdjustment.suggestedSwaps.map((s: any, i: number) => (
                      <div key={i} style={{ background: "#FFF", border: "1.5px solid #111", padding: "10px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                          <span style={{ fontWeight: 800, fontSize: "13.5px" }}>
                            {s.originalMeal} <span style={{ color: "#3D8361" }}>➔</span> {s.replacementMeal}
                          </span>
                          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, background: "#F4F0EA", padding: "2px 6px", border: "1px solid #111" }}>
                            {s.macros.cal} kcal · {s.macros.protein}g protein
                          </span>
                        </div>
                        <div style={{ fontSize: "12.5px", color: "#555", marginTop: "3px" }}>
                          {s.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {planAdjustment.keyRule && (
                <div style={{ marginTop: "14px", borderTop: "2px dashed #111", paddingTop: "10px", fontFamily: "var(--mono, monospace)", fontSize: "12px" }}>
                  🌟 <strong>Golden Custom Rule:</strong> {planAdjustment.keyRule}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW C: NATURAL LANGUAGE MACRO ESTIMATOR
         ══════════════════════════════════════════════════════════════════════ */}
      {copilotTab === "macros" && (
        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #111111",
            boxShadow: "6px 6px 0 #111111",
            padding: "22px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.06em",
              background: "#00B4D8",
              color: "#111111",
              display: "inline-block",
              padding: "4px 12px",
              border: "2px solid #111111",
              marginBottom: "14px",
            }}
          >
            QUICK MACRO ESTIMATOR
          </div>

          <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#333", lineHeight: 1.5 }}>
            Describe what you ate in plain English. The AI breaks it down into component foods with accurate calories, protein, carbs, and fat.
          </p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input
              type="text"
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              placeholder="e.g. 2 fried eggs in butter, 1 cup white rice with tomato dal, black coffee..."
              style={{
                flex: 1,
                fontFamily: "var(--sans, system-ui, sans-serif)",
                fontSize: "14px",
                fontWeight: 600,
                padding: "10px 12px",
                border: "2.5px solid #111111",
                background: "#F4F0EA",
                outline: "none",
              }}
            />
            <button
              type="button"
              disabled={loadingEstimate || !logInput.trim()}
              onClick={handleEstimateMacros}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontWeight: 800,
                fontSize: "12px",
                padding: "10px 18px",
                border: "2.5px solid #111111",
                background: loadingEstimate ? "#CCC" : "#FFE600",
                cursor: loadingEstimate ? "not-allowed" : "pointer",
                boxShadow: "3px 3px 0 #111111",
                whiteSpace: "nowrap",
              }}
            >
              {loadingEstimate ? "ESTIMATING..." : "ESTIMATE"}
            </button>
          </div>

          {macroEstimate && (
            <div
              style={{
                border: "3px solid #111111",
                background: "#F4F0EA",
                padding: "18px 20px",
                boxShadow: "5px 5px 0 #111111",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ fontSize: "18px", margin: 0, fontWeight: 800 }}>
                    {macroEstimate.mealName}
                  </h4>
                  <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#555" }}>
                    {macroEstimate.portion}
                  </div>
                </div>

                {/* Total Pills */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 8px", border: "1.5px solid #111", background: "#FFF" }}>
                    {macroEstimate.macros.cal} kcal
                  </span>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 8px", border: "1.5px solid #111", background: "#FF6B35", color: "#FFF" }}>
                    {macroEstimate.macros.protein}g P
                  </span>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 8px", border: "1.5px solid #111", background: "#FFE600" }}>
                    {macroEstimate.macros.carbs}g C
                  </span>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, padding: "3px 8px", border: "1.5px solid #111", background: "#00B4D8" }}>
                    {macroEstimate.macros.fat}g F
                  </span>
                </div>
              </div>

              {/* Item breakdown */}
              {macroEstimate.breakdown && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                  {macroEstimate.breakdown.map((item: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        background: "#FFF",
                        border: "1px solid #111",
                        fontSize: "12.5px",
                      }}
                    >
                      <span>{item.item}</span>
                      <span style={{ fontFamily: "var(--mono, monospace)", fontWeight: 700 }}>
                        {item.cal} kcal · {item.protein}p · {item.carbs}c · {item.fat}f
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: "13.5px", lineHeight: 1.5, marginBottom: "8px" }}>
                🎯 <strong>Verdict:</strong> {macroEstimate.feedback}
              </div>
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#3D8361" }}>
                💡 <strong>Adjustment Tip:</strong> {macroEstimate.tip}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
