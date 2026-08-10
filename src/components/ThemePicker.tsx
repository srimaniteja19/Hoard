"use client";

import React, { useState, useEffect } from "react";

export type ThemeId = "default" | "cyberpunk" | "nordic" | "tokyo" | "matcha";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  badge: string;
  color: string; // Preview dot color
  accent: string;
}

export const THEMES: ThemeOption[] = [
  { id: "default",   name: "Neo Brutalist", badge: "LIGHT",  color: "#FFE600", accent: "#FF007A" },
  { id: "cyberpunk", name: "Cyberpunk",     badge: "DARK",   color: "#00F0FF", accent: "#FF007A" },
  { id: "nordic",    name: "Nordic Fog",    badge: "SLATE",  color: "#319795", accent: "#667EEA" },
  { id: "tokyo",     name: "Tokyo Night",   badge: "MIDNIGHT", color: "#7AA2F7", accent: "#F7768E" },
  { id: "matcha",    name: "Matcha Latte",  badge: "WARM",   color: "#A3B18A", accent: "#D9822B" },
];

const THEME_STORAGE_KEY = "hoard_theme_v1";

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

const SIZE_BY_TIME_KEY = "hoard_size_by_time_v1";

export function useSizeByTimePreference() {
  const [sizeByTime, setSizeByTime] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIZE_BY_TIME_KEY);
      if (saved !== null) {
        // Must run post-mount: localStorage is unavailable during SSR, so this
        // can't be a lazy useState initializer without a hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSizeByTime(saved === "true");
      }
    } catch {
      // ignore
    }

    const handlePrefChange = () => {
      try {
        const saved = localStorage.getItem(SIZE_BY_TIME_KEY);
        if (saved !== null) {
          setSizeByTime(saved === "true");
        }
      } catch {}
    };

    window.addEventListener("hoard_preference_changed", handlePrefChange);
    return () => window.removeEventListener("hoard_preference_changed", handlePrefChange);
  }, []);

  const toggleSizeByTime = () => {
    const nextVal = !sizeByTime;
    setSizeByTime(nextVal);
    try {
      localStorage.setItem(SIZE_BY_TIME_KEY, String(nextVal));
      window.dispatchEvent(new Event("hoard_preference_changed"));
    } catch {}
  };

  return { sizeByTime, toggleSizeByTime };
}

export const ThemePicker: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("default");
  const [isOpen, setIsOpen] = useState(false);
  const { sizeByTime, toggleSizeByTime } = useSizeByTimePreference();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        // Must run post-mount: localStorage is unavailable during SSR, so this
        // can't be a lazy useState initializer without a hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentTheme(saved);
        applyTheme(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSelect = (id: ThemeId) => {
    setCurrentTheme(id);
    applyTheme(id);
    setIsOpen(false);
  };

  const activeThemeMeta = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 800,
          border: "var(--bd)",
          background: "var(--paper)",
          color: "var(--ink)",
          padding: "5px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: "var(--sh-sm)",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: activeThemeMeta.color,
            border: "1px solid var(--ink)",
          }}
        />
        <span>THEME: {activeThemeMeta.badge}</span>
        <span style={{ fontSize: "8px" }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 999,
            background: "var(--paper)",
            border: "var(--bd)",
            boxShadow: "var(--sh)",
            width: "190px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            padding: "4px",
          }}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                border: "none",
                background: currentTheme === t.id ? "var(--ink)" : "transparent",
                color: currentTheme === t.id ? "var(--cream)" : "var(--ink)",
                padding: "6px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: t.color,
                    border: "1px solid var(--ink)",
                  }}
                />
                {t.name}
              </div>
              <span
                style={{
                  fontSize: "8px",
                  opacity: 0.8,
                  background: t.accent,
                  color: "#000",
                  padding: "1px 4px",
                  border: "1px solid var(--ink)",
                }}
              >
                {t.badge}
              </span>
            </button>
          ))}

          {/* Size-by-Time User Preference Switch */}
          <div style={{ borderTop: "1px solid var(--ink)", marginTop: "4px", paddingTop: "4px" }}>
            <button
              onClick={toggleSizeByTime}
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: "9.5px",
                fontWeight: 800,
                border: "1.5px solid var(--ink)",
                background: sizeByTime ? "var(--yel)" : "var(--paper)",
                color: "#000",
                padding: "5px 6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>⚡ SIZE BY TIME</span>
              <span>[{sizeByTime ? "ON" : "OFF"}]</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
