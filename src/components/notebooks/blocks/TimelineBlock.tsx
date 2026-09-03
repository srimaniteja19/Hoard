"use client";

import React, { useState } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import {
  Check,
  Circle,
  Clock,
  Plus,
  Trash2,
  Milestone,
} from "lucide-react";

interface TimelineBlockProps {
  block: Extract<Block, { type: "timeline" }>;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const TimelineBlock: React.FC<TimelineBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [title, setTitle] = useState(block.title || "Project Milestones");
  const items = block.items && block.items.length > 0
    ? block.items
    : [
        {
          id: "m1",
          title: "Phase 1: Architecture & Data Model",
          dateOrPhase: "WEEK 1",
          description: "Define schemas, migrations, and baseline APIs",
          status: "completed" as const,
        },
        {
          id: "m2",
          title: "Phase 2: UI & Component Buildout",
          dateOrPhase: "WEEK 2",
          description: "Build interactive neo-brutalist blocks and responsive views",
          status: "current" as const,
        },
        {
          id: "m3",
          title: "Phase 3: Production Rollout & Polish",
          dateOrPhase: "WEEK 3",
          description: "Automated end-to-end verification, performance tuning",
          status: "upcoming" as const,
        },
      ];

  const update = (partial: Partial<Extract<Block, { type: "timeline" }>>) => {
    if (!onUpdateBlock) return;
    onUpdateBlock({
      ...block,
      title,
      items,
      ...partial,
    });
  };

  const handleCycleStatus = (index: number) => {
    playSound.click();
    const nextItems = items.map((item, i) => {
      if (i !== index) return item;
      const nextStatus: "completed" | "current" | "upcoming" =
        item.status === "upcoming"
          ? "current"
          : item.status === "current"
          ? "completed"
          : "upcoming";
      return { ...item, status: nextStatus };
    });
    update({ items: nextItems });
  };

  const handleUpdateItem = (index: number, partialItem: Partial<(typeof items)[0]>) => {
    const nextItems = items.map((item, i) => (i === index ? { ...item, ...partialItem } : item));
    update({ items: nextItems });
  };

  const handleAddItem = () => {
    playSound.click();
    const newItem = {
      id: "m_" + Math.random().toString(36).slice(2, 7),
      title: `Milestone ${items.length + 1}`,
      dateOrPhase: "NEXT",
      description: "",
      status: "upcoming" as const,
    };
    update({ items: [...items, newItem] });
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) return;
    playSound.click();
    update({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div
      className="notion-timeline-block group"
      style={{
        margin: "18px 0",
        padding: "16px 20px",
        border: `2px solid ${tokens.borderPrimary}`,
        boxShadow: tokens.boxShadow,
        borderRadius: "2px",
        background: tokens.cardBg,
        position: "relative",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: `2px solid ${tokens.borderPrimary}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
          <Milestone size={14} color={accentColor} />
          <input
            type="text"
            value={title}
            placeholder="Timeline Title..."
            onChange={(e) => {
              setTitle(e.target.value);
              update({ title: e.target.value });
            }}
            style={{
              fontFamily: "var(--sans, system-ui, sans-serif)",
              fontWeight: 800,
              fontSize: "14px",
              letterSpacing: "-0.01em",
              color: tokens.textPrimary,
              background: "transparent",
              border: "none",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={handleAddItem}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: tokens.cardBg,
              color: tokens.textPrimary,
              border: `1.5px solid ${tokens.borderSubtle}`,
              padding: "3px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderRadius: "2px",
            }}
          >
            <Plus size={11} />
            <span>ADD STEP</span>
          </button>

          {onDeleteBlock && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onDeleteBlock();
              }}
              title="Delete timeline block"
              style={{
                background: "transparent",
                border: "none",
                color: "#EF4444",
                cursor: "pointer",
                padding: "3px",
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

      {/* Timeline Items */}
      <div style={{ position: "relative", paddingLeft: "10px" }}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          return (
            <div
              key={item.id || idx}
              className="group/item"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                position: "relative",
                paddingBottom: isLast ? "4px" : "20px",
              }}
            >
              {/* Vertical Guide Line */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    top: "22px",
                    left: "11px",
                    bottom: 0,
                    width: "2px",
                    background: isInk ? "rgba(255,255,255,0.15)" : "rgba(10,10,10,0.15)",
                  }}
                />
              )}

              {/* Status Marker Button */}
              <button
                type="button"
                onClick={() => handleCycleStatus(idx)}
                title={`Status: ${item.status}. Click to cycle.`}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: `2px solid ${
                    item.status === "completed"
                      ? "#10B981"
                      : item.status === "current"
                      ? accentColor
                      : tokens.borderSubtle
                  }`,
                  background:
                    item.status === "completed"
                      ? "#10B981"
                      : item.status === "current"
                      ? accentColor
                      : tokens.cardBg,
                  color: item.status === "upcoming" ? tokens.textSecondary : "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  zIndex: 2,
                  marginTop: "2px",
                  transition: "all 0.1s ease",
                  boxShadow: item.status === "current" ? `0 0 0 3px ${accentColor}33` : "none",
                }}
              >
                {item.status === "completed" ? (
                  <Check size={12} strokeWidth={3} />
                ) : item.status === "current" ? (
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#FFFFFF" }} />
                ) : (
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: tokens.borderSubtle }} />
                )}
              </button>

              {/* Milestone Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={item.title}
                    placeholder="Milestone Title..."
                    onChange={(e) => handleUpdateItem(idx, { title: e.target.value })}
                    style={{
                      fontFamily: "var(--sans, system-ui, sans-serif)",
                      fontWeight: 700,
                      fontSize: "13.5px",
                      color: tokens.textPrimary,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      flex: 1,
                      minWidth: "160px",
                    }}
                  />

                  {/* Phase / Date Badge */}
                  <input
                    type="text"
                    value={item.dateOrPhase || ""}
                    placeholder="PHASE / DATE"
                    onChange={(e) => handleUpdateItem(idx, { dateOrPhase: e.target.value })}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      background: isInk ? "rgba(255,255,255,0.08)" : "rgba(10,10,10,0.06)",
                      color: tokens.textSecondary,
                      border: `1px solid ${tokens.borderSubtle}`,
                      borderRadius: "2px",
                      padding: "1px 6px",
                      outline: "none",
                      width: "80px",
                      textAlign: "center",
                    }}
                  />

                  {/* Delete Item Button */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      title="Delete milestone"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#EF4444",
                        cursor: "pointer",
                        padding: "2px",
                        opacity: 0,
                        transition: "opacity 0.1s ease",
                      }}
                      className="group-hover/item:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>

                {/* Description */}
                <input
                  type="text"
                  value={item.description || ""}
                  placeholder="Details / deliverables (optional)..."
                  onChange={(e) => handleUpdateItem(idx, { description: e.target.value })}
                  style={{
                    fontFamily: "var(--sans, system-ui, sans-serif)",
                    fontSize: "12px",
                    color: tokens.textSecondary,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    width: "100%",
                    marginTop: "3px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
