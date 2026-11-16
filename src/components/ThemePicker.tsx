"use client";

import React, { useState, useEffect, useRef } from "react";
import { Palette, Check, ChevronDown } from "lucide-react";

export type ThemeId =
  | "default"
  | "matcha"
  | "terracotta"
  | "obsidian"
  | "tokyo"
  | "matte-black";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subtitle: string;
  badge: "LIGHT" | "DARK";
  swatches: [string, string, string]; // [Canvas, Ink/Border, Accent]
}

export const THEMES: ThemeOption[] = [
  {
    id: "default",
    name: "Kinfolk Paper",
    subtitle: "Warm linen & espresso carbon",
    badge: "LIGHT",
    swatches: ["#F3EDE2", "#181512", "#F4B942"],
  },
  {
    id: "matcha",
    name: "Kyoto Matcha",
    subtitle: "Celadon washi & deep pine",
    badge: "LIGHT",
    swatches: ["#E9EFE6", "#16231B", "#78A866"],
  },
  {
    id: "terracotta",
    name: "Atelier Clay",
    subtitle: "Sandstone blush & sienna",
    badge: "LIGHT",
    swatches: ["#F4EAE4", "#241715", "#DF6841"],
  },
  {
    id: "obsidian",
    name: "Nocturne Espresso",
    subtitle: "Warm walnut & brass study",
    badge: "DARK",
    swatches: ["#13110F", "#EFE9DF", "#F0B429"],
  },
  {
    id: "tokyo",
    name: "Nordic Fjord",
    subtitle: "Abyssal slate & aurora cyan",
    badge: "DARK",
    swatches: ["#0E131B", "#E8EEF5", "#48BFE3"],
  },
  {
    id: "matte-black",
    name: "Matte Black",
    subtitle: "Carbon obsidian & brushed gold",
    badge: "DARK",
    swatches: ["#0B0B0C", "#F2F2F0", "#E5B84B"],
  },
];

const THEME_STORAGE_KEY = "hoard_theme_v1";

function normalizeLegacyTheme(raw: string | null): ThemeId {
  if (!raw) return "default";
  if (raw === "matcha") return "matcha";
  if (raw === "terracotta") return "terracotta";
  if (raw === "obsidian") return "obsidian";
  if (raw === "matte_black" || raw === "matte-black") return "matte-black";
  if (raw === "tokyo" || raw === "nordic" || raw === "cyberpunk") return "tokyo";
  return "default";
}

export function applyTheme(themeId: ThemeId) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", themeId);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // ignore
    }
  }
}

export const ThemePicker: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("default");
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = normalizeLegacyTheme(localStorage.getItem(THEME_STORAGE_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentTheme(saved);
      applyTheme(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (id: ThemeId) => {
    setCurrentTheme(id);
    applyTheme(id);
    setIsOpen(false);
  };

  const activeThemeMeta = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Theme: ${activeThemeMeta.name}`}
        style={{
          fontFamily: "var(--mono)",
          fontSize: "11px",
          fontWeight: 800,
          border: "var(--bd)",
          background: "var(--paper)",
          color: "var(--ink)",
          height: "36px",
          boxSizing: "border-box",
          padding: "0 10px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          boxShadow: "var(--sh-sm)",
          whiteSpace: "nowrap",
        }}
      >
        {/* 3-dot mini palette preview */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
          {activeThemeMeta.swatches.map((hex, idx) => (
            <span
              key={idx}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: hex,
                border: "1px solid var(--border-ink, var(--ink))",
              }}
            />
          ))}
        </span>
        <span className="theme-picker-prefix">{activeThemeMeta.name.toUpperCase()}</span>
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Choose interface theme"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 999,
            background: "var(--paper)",
            border: "var(--bd)",
            boxShadow: "var(--sh)",
            width: "256px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              opacity: 0.68,
              padding: "2px 6px 4px",
              borderBottom: "1px solid color-mix(in oklab, var(--ink) 16%, transparent)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Palette size={12} /> {THEMES.length} EDITORIAL THEMES
          </div>

          {THEMES.map((t) => {
            const isSelected = currentTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(t.id)}
                style={{
                  fontFamily: "var(--mono)",
                  border: isSelected
                    ? "1.5px solid var(--border-ink, var(--ink))"
                    : "1.5px solid transparent",
                  background: isSelected
                    ? "color-mix(in oklab, var(--yel) 22%, var(--cream))"
                    : "transparent",
                  color: "var(--ink)",
                  padding: "7px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  {/* 3-color swatch pill */}
                  <span
                    style={{
                      display: "inline-grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      width: "27px",
                      height: "16px",
                      border: "1.5px solid var(--border-ink, var(--ink))",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ background: t.swatches[0] }} />
                    <span style={{ background: t.swatches[1] }} />
                    <span style={{ background: t.swatches[2] }} />
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span>{t.name}</span>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--grot)",
                        opacity: 0.68,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.subtitle}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    background: t.badge === "DARK" ? "var(--ink)" : "var(--cream)",
                    color: t.badge === "DARK" ? "var(--paper)" : "var(--ink)",
                    padding: "1px 5px",
                    border: "1px solid var(--border-ink, var(--ink))",
                    flexShrink: 0,
                  }}
                >
                  {t.badge}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
