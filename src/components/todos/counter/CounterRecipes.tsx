"use client";

import React, { useState } from "react";
import { RECIPES, TAGS, TAG_COLOR, Recipe } from "@/lib/todos/counterData";
import { playSound } from "@/lib/sound";
import { X, Search, Clock, Plus, Check } from "lucide-react";

interface CounterRecipesProps {
  customRecipes?: Recipe[];
  onAddTodo?: (title: string, minutes: number, energy: "LOW" | "MED" | "HIGH") => void;
}

export const CounterRecipes: React.FC<CounterRecipesProps> = ({
  customRecipes = [],
  onAddTodo,
}) => {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalRecipe, setActiveModalRecipe] = useState<Recipe | null>(null);
  const [addedRecipeNotice, setAddedRecipeNotice] = useState(false);

  const allRecipes = [...customRecipes, ...RECIPES];

  const handleToggleTag = (tag: string) => {
    playSound.click();
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredRecipes = allRecipes.filter((r) => {
    const matchesTags =
      activeTags.length === 0 || activeTags.every((t) => r.tags.includes(t));
    const matchesSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ingredients.some((ing) => ing.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTags && matchesSearch;
  });

  const handleAddRecipeToTasks = (r: Recipe) => {
    playSound.click();
    if (onAddTodo) {
      const minutes = parseInt(r.time, 10) || 20;
      onAddTodo(`Cook: ${r.name} (~${r.macros.cal} kcal, ${r.macros.protein}g protein)`, minutes, "MED");
    }
    setAddedRecipeNotice(true);
    setTimeout(() => setAddedRecipeNotice(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#FFFFFF",
            border: "2.5px solid #111111",
            padding: "8px 12px",
            boxShadow: "4px 4px 0 #111111",
          }}
        >
          <Search size={16} color="#666" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes or ingredients (e.g. chicken, bhurji, yogurt, spinach)..."
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--sans, system-ui, sans-serif)",
              fontSize: "14px",
              fontWeight: 600,
              color: "#111111",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#666" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tag Filter Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {TAGS.map((tag) => {
            const isSelected = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleTag(tag)}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  padding: "6px 12px",
                  border: "2px solid #111111",
                  background: isSelected ? TAG_COLOR[tag] || "#FFE600" : "#FFFFFF",
                  color: "#111111",
                  cursor: "pointer",
                  boxShadow: isSelected ? "3px 3px 0 #111111" : "none",
                  transform: isSelected ? "translate(-1px, -1px)" : "none",
                  transition: "all 0.1s ease",
                  borderRadius: "2px",
                }}
              >
                #{tag}
              </button>
            );
          })}
          {activeTags.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTags([])}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 800,
                padding: "6px 10px",
                border: "2px dashed #111111",
                background: "transparent",
                color: "#666",
                cursor: "pointer",
              }}
            >
              CLEAR FILTERS
            </button>
          )}
        </div>
      </div>

      {/* ── RECIPES GRID ── */}
      {filteredRecipes.length === 0 ? (
        <div
          style={{
            padding: "36px",
            textAlign: "center",
            background: "#FFFFFF",
            border: "2px dashed #111111",
            fontFamily: "var(--mono, monospace)",
            fontSize: "13px",
            color: "#666",
          }}
        >
          No recipes found matching these ingredients. Try selecting fewer tags or use the AI Copilot to invent one!
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredRecipes.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                playSound.click();
                setActiveModalRecipe(r);
              }}
              style={{
                border: "3px solid #111111",
                background: "#FFFFFF",
                padding: "16px 18px",
                boxShadow: "5px 5px 0 #111111",
                cursor: "pointer",
                transition: "transform 0.12s, box-shadow 0.12s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "7px 7px 0 #111111";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "5px 5px 0 #111111";
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <h3 style={{ fontSize: "17px", margin: 0, lineHeight: 1.2, fontWeight: 800 }}>
                    {r.name}
                  </h3>
                  <span
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      background: "#111111",
                      color: "#F4F0EA",
                      padding: "3px 7px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.time}
                  </span>
                </div>

                {/* Tag row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
                  {r.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        padding: "2px 6px",
                        border: "1.5px solid #111111",
                        background: TAG_COLOR[t] || "#E8DCC0",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Macro strip */}
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 800,
                  borderTop: "2px dashed #111111",
                  paddingTop: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#111111",
                }}
              >
                <span>{r.macros.cal} kcal</span>
                <span style={{ color: "#FF6B35" }}>{r.macros.protein}p</span>
                <span>{r.macros.carbs}c</span>
                <span>{r.macros.fat}f</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RECIPE DETAIL MODAL ── */}
      {activeModalRecipe && (
        <div
          onClick={() => setActiveModalRecipe(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,17,17,0.65)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            zIndex: 1000,
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#F4F0EA",
              border: "4px solid #111111",
              boxShadow: "10px 10px 0 #111111",
              maxWidth: "560px",
              width: "100%",
              padding: "26px",
              position: "relative",
            }}
          >
            {/* Modal Top */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "24px", margin: 0, fontWeight: 800, lineHeight: 1.15 }}>
                {activeModalRecipe.name}
              </h2>
              <button
                type="button"
                onClick={() => setActiveModalRecipe(null)}
                style={{
                  border: "2.5px solid #111111",
                  background: "#FF6B35",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  fontFamily: "var(--mono, monospace)",
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <X size={16} color="#FFFFFF" strokeWidth={3} />
              </button>
            </div>

            {/* Meta Row */}
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                fontWeight: 800,
                display: "flex",
                gap: "14px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Clock size={13} /> {activeModalRecipe.time}
              </span>
              <span style={{ color: "#3D8361" }}>★ {activeModalRecipe.good}</span>
            </div>

            {/* Macro Row */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  border: "2px solid #111111",
                  background: "#FFFFFF",
                }}
              >
                {activeModalRecipe.macros.cal} kcal
              </span>
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  border: "2px solid #111111",
                  background: "#FF6B35",
                  color: "#FFFFFF",
                }}
              >
                {activeModalRecipe.macros.protein}g protein
              </span>
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  border: "2px solid #111111",
                  background: "#FFE600",
                  color: "#111111",
                }}
              >
                {activeModalRecipe.macros.carbs}g carbs
              </span>
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  border: "2px solid #111111",
                  background: "#00B4D8",
                  color: "#111111",
                }}
              >
                {activeModalRecipe.macros.fat}g fat
              </span>
            </div>

            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#555", marginBottom: "16px" }}>
              {activeModalRecipe.per}
            </div>

            {/* Ingredients */}
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontWeight: 800,
                fontSize: "12px",
                display: "inline-block",
                padding: "3px 10px",
                border: "2px solid #111111",
                background: "#FFE600",
                marginBottom: "8px",
              }}
            >
              INGREDIENTS
            </div>
            <ul style={{ margin: "0 0 18px", paddingLeft: "20px", fontSize: "14px", lineHeight: "1.65" }}>
              {activeModalRecipe.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>

            {/* Steps */}
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontWeight: 800,
                fontSize: "12px",
                display: "inline-block",
                padding: "3px 10px",
                border: "2px solid #111111",
                background: "#00B4D8",
                marginBottom: "8px",
              }}
            >
              STEPS
            </div>
            <ol style={{ margin: "0 0 18px", paddingLeft: "20px", fontSize: "14px", lineHeight: "1.65" }}>
              {activeModalRecipe.steps.map((st, i) => (
                <li key={i} style={{ marginBottom: "5px" }}>
                  {st}
                </li>
              ))}
            </ol>

            {/* Note */}
            <div
              style={{
                borderTop: "2.5px solid #111111",
                paddingTop: "12px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                lineHeight: "1.5",
                color: "#222",
                marginBottom: "16px",
              }}
            >
              💡 <strong>Pro Tip:</strong> {activeModalRecipe.note}
            </div>

            {/* Action: Add to Today */}
            {onAddTodo && (
              <button
                type="button"
                onClick={() => handleAddRecipeToTasks(activeModalRecipe)}
                style={{
                  width: "100%",
                  fontFamily: "var(--mono, monospace)",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  padding: "10px",
                  border: "2.5px solid #111111",
                  background: addedRecipeNotice ? "#3D8361" : "#FF6B35",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  boxShadow: "4px 4px 0 #111111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {addedRecipeNotice ? <Check size={14} /> : <Plus size={14} />}
                <span>{addedRecipeNotice ? "ADDED TO TODAY'S TASKS!" : "ADD COOKING TASK TO TODAY"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
