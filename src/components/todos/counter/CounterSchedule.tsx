"use client";

import React, { useState } from "react";
import { SCHEDULE, sumDayMacros, DaySchedule, MealItem, CalculatorOutputs } from "@/lib/todos/counterData";
import { playSound } from "@/lib/sound";
import { Check, Plus, Calendar, Flame, Utensils } from "lucide-react";

interface CounterScheduleProps {
  metrics: CalculatorOutputs;
  onAddTodo?: (title: string, minutes: number, energy: "LOW" | "MED" | "HIGH") => void;
}

export const CounterSchedule: React.FC<CounterScheduleProps> = ({
  metrics,
  onAddTodo,
}) => {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [eatenMeals, setEatenMeals] = useState<Record<string, boolean>>({});
  const [addedTasks, setAddedTasks] = useState<Record<string, boolean>>({});

  const day = SCHEDULE[selectedDayIdx];
  const dayTotal = sumDayMacros(day.meals);

  const getLabelColor = (label: string) => {
    switch (label) {
      case "breakfast":
        return "#FFE600";
      case "lunch":
        return "#FF6B35";
      case "dinner":
        return "#00B4D8";
      default:
        return "#3D8361";
    }
  };

  const getLabelTextColor = (label: string) => {
    return label === "breakfast" || label === "lunch" || label === "dinner" ? "#111111" : "#FFFFFF";
  };

  const toggleEaten = (mealKey: string) => {
    playSound.pop();
    setEatenMeals((prev) => ({ ...prev, [mealKey]: !prev[mealKey] }));
  };

  const handleAddToToday = (meal: MealItem, mealKey: string) => {
    playSound.click();
    if (onAddTodo) {
      const minutes = meal.label === "dinner" ? 20 : meal.label === "lunch" ? 25 : 10;
      const energy = meal.label === "lunch" ? "MED" : "LOW";
      onAddTodo(
        `Meal: ${meal.name} (~${meal.macros.cal} kcal, ${meal.macros.protein}g protein)`,
        minutes,
        energy
      );
    }
    setAddedTasks((prev) => ({ ...prev, [mealKey]: true }));
    setTimeout(() => {
      setAddedTasks((prev) => ({ ...prev, [mealKey]: false }));
    }, 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── DAY SELECTOR TABS ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {SCHEDULE.map((d, i) => {
          const isActive = i === selectedDayIdx;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => {
                playSound.click();
                setSelectedDayIdx(i);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                padding: "8px 14px",
                border: "2.5px solid #111111",
                background: isActive ? "#3D8361" : "#FFFFFF",
                color: isActive ? "#F4F0EA" : "#111111",
                cursor: "pointer",
                boxShadow: isActive ? "3px 3px 0 #111111" : "none",
                transform: isActive ? "translate(-1px, -1px)" : "none",
                transition: "all 0.1s ease",
              }}
            >
              {d.day}
            </button>
          );
        })}
      </div>

      {/* ── MEAL CARDS ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {day.meals.map((m, mIdx) => {
          const mealKey = `${day.day}-${m.label}-${mIdx}`;
          const isEaten = !!eatenMeals[mealKey];
          const isAdded = !!addedTasks[mealKey];

          return (
            <div
              key={mealKey}
              style={{
                border: "3px solid #111111",
                background: isEaten ? "#FAF8F5" : "#FFFFFF",
                boxShadow: "5px 5px 0 #111111",
                padding: "18px 20px",
                position: "relative",
                opacity: isEaten ? 0.75 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                {/* Meal Label */}
                <div
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontWeight: 800,
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    display: "inline-block",
                    padding: "3px 10px",
                    border: "2px solid #111111",
                    background: getLabelColor(m.label),
                    color: getLabelTextColor(m.label),
                  }}
                >
                  {m.label}
                </div>

                {/* Actions: Eaten & Add to Today */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => toggleEaten(mealKey)}
                    title={isEaten ? "Mark as not eaten" : "Mark as eaten today"}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      padding: "4px 8px",
                      border: "2px solid #111111",
                      background: isEaten ? "#3D8361" : "#FFFFFF",
                      color: isEaten ? "#FFFFFF" : "#111111",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Check size={12} strokeWidth={isEaten ? 3 : 2} />
                    <span>{isEaten ? "EATEN" : "LOG EATEN"}</span>
                  </button>

                  {onAddTodo && (
                    <button
                      type="button"
                      onClick={() => handleAddToToday(m, mealKey)}
                      title="Add this meal prep as a task in Today's todos"
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        padding: "4px 8px",
                        border: "2px solid #111111",
                        background: isAdded ? "#FFE600" : "#FFFFFF",
                        color: "#111111",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Plus size={12} />
                      <span>{isAdded ? "ADDED!" : "+ TODAY"}</span>
                    </button>
                  )}
                </div>
              </div>

              <h4
                style={{
                  fontSize: "18px",
                  margin: "0 0 6px",
                  fontWeight: 800,
                  textDecoration: isEaten ? "line-through" : "none",
                }}
              >
                {m.name}
              </h4>
              <p style={{ fontSize: "14px", margin: "0 0 12px", color: "#333", lineHeight: 1.5 }}>
                {m.desc}
              </p>

              {/* Macro Pills */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 9px",
                    border: "2px solid #111111",
                    background: "#F4F0EA",
                  }}
                >
                  {m.macros.cal} kcal
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 9px",
                    border: "2px solid #111111",
                    background: "#FF6B35",
                    color: "#FFFFFF",
                  }}
                >
                  {m.macros.protein}g protein
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 9px",
                    border: "2px solid #111111",
                    background: "#FFE600",
                    color: "#111111",
                  }}
                >
                  {m.macros.carbs}g carbs
                </span>
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 9px",
                    border: "2px solid #111111",
                    background: "#00B4D8",
                    color: "#111111",
                  }}
                >
                  {m.macros.fat}g fat
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DAY TOTAL SUMMARY STRIP ── */}
      <div
        style={{
          fontFamily: "var(--mono, monospace)",
          fontSize: "13px",
          fontWeight: 800,
          background: "#111111",
          color: "#F4F0EA",
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          boxShadow: "5px 5px 0 #3D8361",
        }}
      >
        <div>
          DAY TOTAL: {dayTotal.cal} KCAL · {dayTotal.protein}g PROTEIN · {dayTotal.carbs}g CARBS · {dayTotal.fat}g FAT
        </div>
        <div style={{ fontSize: "11px", color: dayTotal.cal <= metrics.dailyTarget + 100 ? "#B8F04A" : "#FF6B6B" }}>
          Target: {metrics.dailyTarget} kcal ({dayTotal.cal > metrics.dailyTarget ? `+${dayTotal.cal - metrics.dailyTarget}` : `${dayTotal.cal - metrics.dailyTarget}`} kcal)
        </div>
      </div>
    </div>
  );
};
