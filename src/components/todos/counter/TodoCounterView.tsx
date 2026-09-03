"use client";

import React, { useState, useEffect } from "react";
import {
  CalculatorInputs,
  computeNutritionMetrics,
  Recipe,
} from "@/lib/todos/counterData";
import { CounterOverview } from "./CounterOverview";
import { CounterSchedule } from "./CounterSchedule";
import { CounterRecipes } from "./CounterRecipes";
import { CounterGapsRules } from "./CounterGapsRules";
import { CounterAICopilot } from "./CounterAICopilot";
import { playSound } from "@/lib/sound";
import { Sparkles, Calendar, BookOpen, ShieldCheck, Flame } from "lucide-react";

interface TodoCounterViewProps {
  onAddTodo?: (title: string, minutes: number, energy: "LOW" | "MED" | "HIGH") => void;
}

const DEFAULT_INPUTS: CalculatorInputs = {
  weight: 75,
  height: 173,
  age: 25,
  activity: 1.55,
  targetDeficit: 500,
  proteinMultiplier: 1.8,
  goalWeight: 70.5,
};

export const TodoCounterView: React.FC<TodoCounterViewProps> = ({ onAddTodo }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "schedule" | "recipes" | "gaps" | "ai"
  >("overview");

  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load saved state from localStorage if available
  useEffect(() => {
    try {
      const savedInputs = localStorage.getItem("hoard_counter_inputs");
      if (savedInputs) {
        setInputs((prev) => ({ ...prev, ...JSON.parse(savedInputs) }));
      }
      const savedRecipes = localStorage.getItem("hoard_counter_custom_recipes");
      if (savedRecipes) {
        setCustomRecipes(JSON.parse(savedRecipes));
      }
    } catch {}
  }, []);

  const handleUpdateInputs = (newInputs: CalculatorInputs) => {
    setInputs(newInputs);
    try {
      localStorage.setItem("hoard_counter_inputs", JSON.stringify(newInputs));
    } catch {}
    showToast("Metrics recalculated & saved!");
  };

  const handleSaveRecipe = (newRecipe: Recipe) => {
    setCustomRecipes((prev) => {
      const next = [newRecipe, ...prev];
      try {
        localStorage.setItem("hoard_counter_custom_recipes", JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(`Saved "${newRecipe.name}" to recipe collection!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const metrics = computeNutritionMetrics(inputs);

  return (
    <div
      className="the-counter-container"
      style={{
        width: "100%",
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "16px 0 80px",
        color: "#111111",
        fontFamily: "var(--sans, 'Space Grotesk', system-ui, sans-serif)",
      }}
    >
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#111111",
            color: "#FFE600",
            border: "2px solid #FFE600",
            padding: "10px 18px",
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "12px",
            boxShadow: "4px 4px 0 #111111",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HERO HEADER (NEO-BRUTALIST YELLOW) ── */}
      <header
        style={{
          border: "4px solid #111111",
          background: "#FFE600",
          boxShadow: "9px 9px 0 #111111",
          padding: "26px 30px",
          marginBottom: "24px",
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "0.08em",
            marginBottom: "8px",
            textTransform: "uppercase",
          }}
        >
          30-DAY PLAN · BUILT FROM WHAT&apos;S ALREADY IN YOUR KITCHEN
        </div>
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 800,
            margin: "0 0 10px",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          The counter
        </h1>
        <p
          style={{
            fontSize: "15px",
            maxWidth: "680px",
            margin: 0,
            lineHeight: 1.5,
            color: "#222222",
            fontWeight: 500,
          }}
        >
          Chicken curry, egg curry, potato and okra sautéed instead of fried, curd/yogurt daily,
          evening fruit, and coffee — same food, tuned portions, real numbers attached.
        </p>
      </header>

      {/* ── SUB-NAVIGATION TABS ── */}
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        {[
          { id: "overview", label: "overview + calculator" },
          { id: "schedule", label: "7-day schedule" },
          { id: "recipes", label: "recipes" },
          { id: "gaps", label: "gaps + rules" },
          { id: "ai", label: "ai kitchen copilot", badge: "✦ AI" },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playSound.click();
                setActiveSubTab(tab.id as any);
              }}
              style={{
                fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.04em",
                padding: "9px 16px",
                border: "2.5px solid #111111",
                background: isActive ? "#111111" : "#FFFFFF",
                color: isActive ? "#F4F0EA" : "#111111",
                cursor: "pointer",
                boxShadow: isActive ? "4px 4px 0 #FF6B35" : "none",
                transform: isActive ? "translate(-1px, -1px)" : "none",
                transition: "all 0.1s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: "9px",
                    padding: "2px 5px",
                    background: isActive ? "#FFE600" : "#FF6B35",
                    color: isActive ? "#111111" : "#FFFFFF",
                    fontWeight: 800,
                    borderRadius: "2px",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── SUB-VIEWS ── */}
      {activeSubTab === "overview" && (
        <CounterOverview
          metrics={metrics}
          inputs={inputs}
          onUpdateInputs={handleUpdateInputs}
        />
      )}

      {activeSubTab === "schedule" && (
        <CounterSchedule
          metrics={metrics}
          onAddTodo={onAddTodo}
        />
      )}

      {activeSubTab === "recipes" && (
        <CounterRecipes
          customRecipes={customRecipes}
          onAddTodo={onAddTodo}
        />
      )}

      {activeSubTab === "gaps" && <CounterGapsRules />}

      {activeSubTab === "ai" && (
        <CounterAICopilot
          metrics={metrics}
          inputs={inputs}
          onSaveRecipe={handleSaveRecipe}
          onAddTodo={onAddTodo}
        />
      )}
    </div>
  );
};
