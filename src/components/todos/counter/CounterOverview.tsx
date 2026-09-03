"use client";

import React, { useState } from "react";
import {
  CalculatorInputs,
  CalculatorOutputs,
  computeNutritionMetrics,
} from "@/lib/todos/counterData";
import { playSound } from "@/lib/sound";
import { RotateCcw, Target, Flame, Dumbbell, Calendar, Zap, Sparkles } from "lucide-react";

interface CounterOverviewProps {
  metrics: CalculatorOutputs;
  inputs: CalculatorInputs;
  onUpdateInputs: (newInputs: CalculatorInputs) => void;
}

export const CounterOverview: React.FC<CounterOverviewProps> = ({
  metrics,
  inputs,
  onUpdateInputs,
}) => {
  const [weight, setWeight] = useState(inputs.weight);
  const [height, setHeight] = useState(inputs.height);
  const [age, setAge] = useState(inputs.age);
  const [activity, setActivity] = useState(inputs.activity);
  const [goalWeight, setGoalWeight] = useState(inputs.goalWeight ?? 70.5);

  const handleRecalculate = () => {
    playSound.pop();
    onUpdateInputs({
      ...inputs,
      weight: Number(weight) || 75,
      height: Number(height) || 173,
      age: Number(age) || 25,
      activity: Number(activity) || 1.55,
      goalWeight: Number(goalWeight) || 70.5,
    });
  };

  const proteinCals = metrics.proteinTarget * 4;
  const fatCals = metrics.fatTargetGrams * 9;
  const carbCals = metrics.carbTargetGrams * 4;
  const totalCals = Math.max(1, proteinCals + fatCals + carbCals);

  const proteinPct = Math.round((proteinCals / totalCals) * 100);
  const fatPct = Math.round((fatCals / totalCals) * 100);
  const carbPct = Math.max(0, 100 - proteinPct - fatPct);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── INTERACTIVE CALCULATOR ── */}
      <div
        className="calc-box"
        style={{
          background: "#FFFFFF",
          border: "3px solid #111111",
          boxShadow: "6px 6px 0 #111111",
          padding: "22px 24px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#00B4D8",
            border: "2.5px solid #111111",
            padding: "4px 12px",
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "0.06em",
            marginBottom: "16px",
          }}
        >
          <Zap size={14} />
          <span>YOUR NUMBERS</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          <div>
            <label
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                display: "block",
                marginBottom: "6px",
                color: "#111111",
              }}
            >
              WEIGHT (KG)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              style={{
                width: "100%",
                fontFamily: "var(--mono, monospace)",
                fontSize: "15px",
                fontWeight: 800,
                padding: "8px 10px",
                border: "2.5px solid #111111",
                background: "#F4F0EA",
                outline: "none",
                borderRadius: "2px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                display: "block",
                marginBottom: "6px",
                color: "#111111",
              }}
            >
              HEIGHT (CM)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              style={{
                width: "100%",
                fontFamily: "var(--mono, monospace)",
                fontSize: "15px",
                fontWeight: 800,
                padding: "8px 10px",
                border: "2.5px solid #111111",
                background: "#F4F0EA",
                outline: "none",
                borderRadius: "2px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                display: "block",
                marginBottom: "6px",
                color: "#111111",
              }}
            >
              AGE
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              style={{
                width: "100%",
                fontFamily: "var(--mono, monospace)",
                fontSize: "15px",
                fontWeight: 800,
                padding: "8px 10px",
                border: "2.5px solid #111111",
                background: "#F4F0EA",
                outline: "none",
                borderRadius: "2px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                display: "block",
                marginBottom: "6px",
                color: "#111111",
              }}
            >
              GOAL (KG)
            </label>
            <input
              type="number"
              step="0.5"
              value={goalWeight}
              onChange={(e) => setGoalWeight(Number(e.target.value))}
              style={{
                width: "100%",
                fontFamily: "var(--mono, monospace)",
                fontSize: "15px",
                fontWeight: 800,
                padding: "8px 10px",
                border: "2.5px solid #111111",
                background: "#F4F0EA",
                outline: "none",
                borderRadius: "2px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                display: "block",
                marginBottom: "6px",
                color: "#111111",
              }}
            >
              ACTIVITY
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(Number(e.target.value))}
              style={{
                width: "100%",
                fontFamily: "var(--mono, monospace)",
                fontSize: "13px",
                fontWeight: 800,
                padding: "8px 10px",
                border: "2.5px solid #111111",
                background: "#F4F0EA",
                outline: "none",
                borderRadius: "2px",
              }}
            >
              <option value="1.2">Sedentary (desk job)</option>
              <option value="1.375">Light (1-3x/wk)</option>
              <option value="1.55">Moderate (3-5x/wk)</option>
              <option value="1.725">Very active (6-7x/wk)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRecalculate}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "13px",
            letterSpacing: "0.06em",
            padding: "10px 20px",
            border: "2.5px solid #111111",
            background: "#FF6B35",
            color: "#111111",
            cursor: "pointer",
            boxShadow: "4px 4px 0 #111111",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            borderRadius: "2px",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "translate(2px, 2px)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
        >
          <RotateCcw size={14} />
          <span>RECALCULATE</span>
        </button>
      </div>

      {/* ── STATS GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "14px",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #111111",
            boxShadow: "5px 5px 0 #111111",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#666",
              marginBottom: "4px",
            }}
          >
            BMR
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>
            {metrics.bmr}
          </div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              marginTop: "6px",
              color: "#3D8361",
              fontWeight: 800,
            }}
          >
            kcal at rest
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #111111",
            boxShadow: "5px 5px 0 #111111",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#666",
              marginBottom: "4px",
            }}
          >
            TDEE
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>
            {metrics.tdee}
          </div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              marginTop: "6px",
              color: "#3D8361",
              fontWeight: 800,
            }}
          >
            maintenance
          </div>
        </div>

        <div
          style={{
            background: "#FFE600",
            border: "3px solid #111111",
            boxShadow: "5px 5px 0 #111111",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#111111",
              marginBottom: "4px",
            }}
          >
            DAILY TARGET
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>
            {metrics.dailyTarget}
          </div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              marginTop: "6px",
              color: "#111111",
              fontWeight: 800,
            }}
          >
            ~500 kcal deficit
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #111111",
            boxShadow: "5px 5px 0 #111111",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#666",
              marginBottom: "4px",
            }}
          >
            PROTEIN TARGET
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>
            {metrics.proteinTarget}g
          </div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              marginTop: "6px",
              color: "#FF6B35",
              fontWeight: 800,
            }}
          >
            1.8g / kg bodyweight
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "3px solid #111111",
            boxShadow: "5px 5px 0 #111111",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#666",
              marginBottom: "4px",
            }}
          >
            EST. TIMELINE
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1 }}>
            {metrics.weeksToGoal > 0 ? `${metrics.weeksToGoal}w` : "—"}
          </div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              marginTop: "6px",
              color: "#3D8361",
              fontWeight: 800,
            }}
          >
            to {goalWeight}kg
          </div>
        </div>
      </div>

      {/* ── MACRO DISTRIBUTION BAR ── */}
      <div
        style={{
          background: "#FFFFFF",
          border: "3px solid #111111",
          boxShadow: "5px 5px 0 #111111",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "11px",
          }}
        >
          <span>DAILY MACRO SPLIT</span>
          <span style={{ color: "#666" }}>{metrics.dailyTarget} KCAL / DAY</span>
        </div>

        {/* Bar */}
        <div
          style={{
            height: "24px",
            display: "flex",
            border: "2px solid #111111",
            borderRadius: "2px",
            overflow: "hidden",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              width: `${proteinPct}%`,
              background: "#FF6B35",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              color: "#FFFFFF",
            }}
            title={`Protein: ${metrics.proteinTarget}g (${proteinPct}%)`}
          >
            {proteinPct >= 15 ? `${proteinPct}% P` : ""}
          </div>
          <div
            style={{
              width: `${carbPct}%`,
              background: "#FFE600",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              color: "#111111",
            }}
            title={`Carbs: ${metrics.carbTargetGrams}g (${carbPct}%)`}
          >
            {carbPct >= 15 ? `${carbPct}% C` : ""}
          </div>
          <div
            style={{
              width: `${fatPct}%`,
              background: "#00B4D8",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              color: "#111111",
            }}
            title={`Fat: ${metrics.fatTargetGrams}g (${fatPct}%)`}
          >
            {fatPct >= 15 ? `${fatPct}% F` : ""}
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "18px",
            flexWrap: "wrap",
            fontFamily: "var(--mono, monospace)",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", background: "#FF6B35", border: "1.5px solid #111" }} />
            <span>PROTEIN: {metrics.proteinTarget}g ({proteinPct}%)</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", background: "#FFE600", border: "1.5px solid #111" }} />
            <span>CARBS: {metrics.carbTargetGrams}g ({carbPct}%)</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", background: "#00B4D8", border: "1.5px solid #111" }} />
            <span>FAT: {metrics.fatTargetGrams}g ({fatPct}%)</span>
          </span>
        </div>
      </div>

      {/* ── CALLOUT: FACE FAT ── */}
      <div
        style={{
          borderLeft: "6px solid #111111",
          background: "#FFFFFF",
          padding: "16px 20px",
          boxShadow: "4px 4px 0 rgba(0,0,0,0.06)",
          fontSize: "14.5px",
          lineHeight: "1.6",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "12px",
            color: "#FF6B35",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          ON &quot;REDUCING FACE FAT&quot; SPECIFICALLY
        </div>
        Spot reduction isn&apos;t real — you can&apos;t target fat loss to your face any more than you can to one arm. Facial fat tracks your overall body fat percentage, and genetics decides the order fat leaves different areas. For a lot of people the face is actually one of the first places to visibly lean out in a deficit, which works in your favor here — but the mechanism is the same calorie deficit that gets you to 70-71kg, not a separate face-specific fix. No special exercises or foods change this.
      </div>

      {/* ── CALLOUT: PLAN IN ONE PARAGRAPH ── */}
      <div
        style={{
          borderLeft: "6px solid #3D8361",
          background: "#FFFFFF",
          padding: "16px 20px",
          boxShadow: "4px 4px 0 rgba(0,0,0,0.06)",
          fontSize: "14.5px",
          lineHeight: "1.6",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontWeight: 800,
            fontSize: "12px",
            color: "#3D8361",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          THE PLAN IN ONE PARAGRAPH
        </div>
        Eat at roughly your calculated target below, protein around 1.8g per kg of bodyweight, using the meals you already cook. Rice capped at 1 cup at lunch, sauté instead of fry, dinner skips rice/noodles by default, curd or Greek yogurt daily, fruit in the evening, coffee stays as is. At a ~500 kcal/day deficit this gets you from 75kg to 70-71kg in about 13-16 weeks — a pace shown to preserve muscle and strength rather than just dropping the scale number fast.
      </div>
    </div>
  );
};
