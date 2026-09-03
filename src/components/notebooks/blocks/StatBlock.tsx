"use client";

import React, { useState } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Target,
  BarChart2,
} from "lucide-react";

interface StatBlockProps {
  block: Extract<Block, { type: "stat" }>;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [label, setLabel] = useState(block.label || "KEY METRIC");
  const [value, setValue] = useState(block.value || "100%");
  const [change, setChange] = useState(block.change || "+12.4%");
  const [trend, setTrend] = useState<"up" | "down" | "neutral">(block.trend || "up");
  const [progress, setProgress] = useState<number>(block.progress ?? 75);
  const [target, setTarget] = useState(block.target || "Target: 100%");
  const [note, setNote] = useState(block.note || "");

  const update = (fields: Partial<Extract<Block, { type: "stat" }>>) => {
    if (!onUpdateBlock) return;
    onUpdateBlock({
      ...block,
      label,
      value,
      change,
      trend,
      progress,
      target,
      note,
      ...fields,
    });
  };

  const cycleTrend = () => {
    playSound.click();
    const nextTrend: "up" | "down" | "neutral" =
      trend === "up" ? "down" : trend === "down" ? "neutral" : "up";
    setTrend(nextTrend);
    update({ trend: nextTrend });
  };

  const trendColor =
    trend === "up" ? "#10B981" : trend === "down" ? "#EF4444" : tokens.textSecondary;

  return (
    <div
      className="notion-stat-block group"
      style={{
        margin: "16px 0",
        padding: "16px 20px",
        border: `2px solid ${tokens.borderPrimary}`,
        boxShadow: tokens.boxShadow,
        borderRadius: "2px",
        background: tokens.cardBg,
        position: "relative",
      }}
    >
      {/* Top Header: Label + Trend Pill + Delete */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <BarChart2 size={13} color={accentColor} />
          <input
            type="text"
            value={label}
            placeholder="METRIC LABEL..."
            onChange={(e) => {
              setLabel(e.target.value);
              update({ label: e.target.value });
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: tokens.textSecondary,
              textTransform: "uppercase",
              background: "transparent",
              border: "none",
              outline: "none",
              width: "100%",
              maxWidth: "240px",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Trend Pill (clickable to toggle trend) */}
          <button
            type="button"
            onClick={cycleTrend}
            title="Click to toggle trend (Up / Down / Neutral)"
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 7px",
              borderRadius: "2px",
              background: isInk ? "rgba(255,255,255,0.08)" : "rgba(10,10,10,0.06)",
              color: trendColor,
              border: `1.5px solid ${trendColor}`,
              cursor: "pointer",
            }}
          >
            {trend === "up" ? (
              <TrendingUp size={11} />
            ) : trend === "down" ? (
              <TrendingDown size={11} />
            ) : (
              <Minus size={11} />
            )}
            <input
              type="text"
              value={change}
              onChange={(e) => {
                setChange(e.target.value);
                update({ change: e.target.value });
              }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "inherit",
                fontFamily: "inherit",
                fontSize: "inherit",
                fontWeight: "inherit",
                width: "55px",
              }}
            />
          </button>

          {/* Delete Block */}
          {onDeleteBlock && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onDeleteBlock();
              }}
              title="Delete stat block"
              style={{
                background: "transparent",
                border: "none",
                color: "#EF4444",
                cursor: "pointer",
                padding: "2px",
                display: "grid",
                placeItems: "center",
                opacity: 0.6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Hero Display Value */}
      <div style={{ margin: "6px 0 12px" }}>
        <input
          type="text"
          value={value}
          placeholder="0"
          onChange={(e) => {
            setValue(e.target.value);
            update({ value: e.target.value });
          }}
          style={{
            fontFamily: "var(--display, sans-serif)",
            fontWeight: 800,
            fontSize: "34px",
            letterSpacing: "-0.03em",
            color: tokens.textPrimary,
            background: "transparent",
            border: "none",
            outline: "none",
            width: "100%",
            lineHeight: 1.1,
          }}
        />
      </div>

      {/* Progress Bar Gauge */}
      <div style={{ margin: "10px 0 8px" }}>
        <div
          style={{
            height: "8px",
            width: "100%",
            background: isInk ? "rgba(255,255,255,0.1)" : "rgba(10,10,10,0.08)",
            border: `1.5px solid ${tokens.borderPrimary}`,
            borderRadius: "2px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: accentColor,
              transition: "width 0.2s ease",
            }}
          />
        </div>

        {/* Target & Percentage Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "6px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "9px",
            color: tokens.textSecondary,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Target size={10} color={tokens.textSecondary} />
            <input
              type="text"
              value={target}
              placeholder="Target..."
              onChange={(e) => {
                setTarget(e.target.value);
                update({ target: e.target.value });
              }}
              style={{
                fontFamily: "inherit",
                fontSize: "inherit",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span>Progress:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 0;
                setProgress(val);
                update({ progress: val });
              }}
              style={{
                width: "40px",
                fontFamily: "inherit",
                fontSize: "inherit",
                fontWeight: 700,
                background: "transparent",
                border: `1px solid ${tokens.borderSubtle}`,
                borderRadius: "2px",
                padding: "1px 3px",
                color: tokens.textPrimary,
                textAlign: "right",
              }}
            />
            <span>%</span>
          </div>
        </div>
      </div>

      {/* Optional Footnote / Subtitle */}
      <div style={{ borderTop: `1px dashed ${tokens.borderSubtle}`, paddingTop: "6px", marginTop: "8px" }}>
        <input
          type="text"
          value={note}
          placeholder="Add context or notes (optional)..."
          onChange={(e) => {
            setNote(e.target.value);
            update({ note: e.target.value });
          }}
          style={{
            fontFamily: "var(--sans, system-ui, sans-serif)",
            fontSize: "11px",
            color: tokens.textSecondary,
            background: "transparent",
            border: "none",
            outline: "none",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
};
