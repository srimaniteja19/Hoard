"use client";

import React from "react";
import { DigestFigure } from "@/lib/youtube/digest";
import {
  Layers,
  ArrowRight,
  ArrowDown,
  Zap,
  Check,
  X,
  Database,
  Server,
  Cpu,
  FileCode,
  HardDrive,
  GitBranch,
  BarChart3,
  ListTree,
  Repeat,
} from "lucide-react";

interface DigestFigureRendererProps {
  figure: DigestFigure;
  className?: string;
  style?: React.CSSProperties;
}

export const DigestFigureRenderer: React.FC<DigestFigureRendererProps> = ({
  figure,
  className = "",
  style,
}) => {
  if (!figure) return null;

  const renderFigureContent = () => {
    const data = figure.data;

    // ── 1. CONTRAST / COMPARISON FIGURE ──
    if (figure.kind === "contrast" && data && typeof data === "object") {
      const keys = Object.keys(data);

      if (keys.length >= 2) {
        const leftKey = keys[0];
        const rightKey = keys[1];
        const leftVal = data[leftKey];
        const rightVal = data[rightKey];

        const getList = (val: any): string[] => {
          if (Array.isArray(val)) return val;
          if (val && Array.isArray(val.layers)) return val.layers;
          if (val && Array.isArray(val.steps)) return val.steps;
          if (val && Array.isArray(val.items)) return val.items;
          if (typeof val === "object") return Object.values(val).map(String);
          return [String(val)];
        };

        const leftList = getList(leftVal);
        const rightList = getList(rightVal);

        const formatKeyTitle = (k: string) =>
          k
            .replace(/_/g, " ")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .toUpperCase();

        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              margin: "10px 0",
            }}
          >
            {/* Left Column (Traditional / Heavy) */}
            <div
              style={{
                background: "#FFFFFF",
                border: "2.5px solid #0A0A0A",
                boxShadow: "3px 3px 0 #0A0A0A",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "2px solid #0A0A0A",
                  paddingBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#0A0A0A",
                    letterSpacing: "0.06em",
                  }}
                >
                  ⚡ {formatKeyTitle(leftKey)}
                </span>
                <span
                  style={{
                    background: "#0A0A0A",
                    color: "#FFF",
                    fontFamily: "Space Mono, monospace",
                    fontSize: "9px",
                    fontWeight: 800,
                    padding: "1px 6px",
                  }}
                >
                  {leftList.length} LAYERS
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                {leftList.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div
                      style={{
                        background: "#F5F3EF",
                        border: "1.5px solid #0A0A0A",
                        padding: "8px 10px",
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#222",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "10px",
                          color: "#FF2D8A",
                          fontWeight: 800,
                        }}
                      >
                        0{idx + 1}.
                      </span>
                      <span>{item}</span>
                    </div>
                    {idx < leftList.length - 1 && (
                      <div style={{ textAlign: "center", color: "#0A0A0A", lineHeight: "10px", opacity: 0.4 }}>
                        ↓
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right Column (Optimized / In-Process / SQLite) */}
            <div
              style={{
                background: "#B8F04A",
                border: "2.5px solid #0A0A0A",
                boxShadow: "4px 4px 0 #FF2D8A",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "2px solid #0A0A0A",
                  paddingBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "11px",
                    fontWeight: 900,
                    color: "#0A0A0A",
                    letterSpacing: "0.06em",
                  }}
                >
                  ✦ {formatKeyTitle(rightKey)}
                </span>
                <span
                  style={{
                    background: "#0A0A0A",
                    color: "#FCE94F",
                    fontFamily: "Space Mono, monospace",
                    fontSize: "9px",
                    fontWeight: 900,
                    padding: "1px 6px",
                  }}
                >
                  {rightList.length} DIRECT LAYERS ⚡
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                {rightList.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <div
                      style={{
                        background: "#FFFFFF",
                        border: "2px solid #0A0A0A",
                        boxShadow: "2px 2px 0 #0A0A0A",
                        padding: "8px 10px",
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#0A0A0A",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: "10px",
                          color: "#FF2D8A",
                          fontWeight: 900,
                        }}
                      >
                        ✓ 0{idx + 1}.
                      </span>
                      <span>{item}</span>
                    </div>
                    {idx < rightList.length - 1 && (
                      <div style={{ textAlign: "center", color: "#0A0A0A", lineHeight: "10px", fontWeight: 900 }}>
                        ↓
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        );
      }
    }

    // ── 2. FLOW / TIMELINE / SEQUENCE FIGURE ──
    if (
      (figure.kind === "flow" || figure.kind === "timeline") &&
      data &&
      (Array.isArray(data) || Array.isArray(data.steps) || Array.isArray(data.events) || typeof data === "object")
    ) {
      const steps: string[] = Array.isArray(data)
        ? data.map(String)
        : Array.isArray(data.steps)
        ? data.steps
        : Array.isArray(data.events)
        ? data.events
        : Object.entries(data).map(([k, v]) => `${k}: ${v}`);

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "10px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
            }}
          >
            {steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  background: "#FFFFFF",
                  border: "2px solid #0A0A0A",
                  boxShadow: "2.5px 2.5px 0 #0A0A0A",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: "10px",
                      fontWeight: 900,
                      background: "#FCE94F",
                      color: "#0A0A0A",
                      padding: "1px 6px",
                      border: "1px solid #0A0A0A",
                    }}
                  >
                    STEP {idx + 1}
                  </span>
                  {idx < steps.length - 1 && (
                    <ArrowRight size={14} className="text-[#FF2D8A]" />
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "12px",
                    fontWeight: 700,
                    lineHeight: 1.35,
                    color: "#0A0A0A",
                  }}
                >
                  {typeof step === "object" ? JSON.stringify(step) : step}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── 3. SCALE / RATIO COMPARISON FIGURE ──
    if (figure.kind === "scale" && data && typeof data === "object") {
      const entries = Object.entries(data);
      return (
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid #0A0A0A",
            boxShadow: "3px 3px 0 #0A0A0A",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            margin: "10px 0",
          }}
        >
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "11px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#0A0A0A",
            }}
          >
            <BarChart3 size={13} color="#FF2D8A" />
            SCALE COMPARISON & RATIOS
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {entries.map(([label, val], idx) => {
              const numVal = typeof val === "number" ? val : parseFloat(String(val)) || 50;
              const barWidth = Math.min(100, Math.max(8, numVal));

              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700 }}>
                    <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>{label.replace(/_/g, " ")}</span>
                    <span style={{ fontFamily: "Space Mono, monospace", fontWeight: 800 }}>{String(val)}</span>
                  </div>
                  <div
                    style={{
                      height: "14px",
                      background: "#F2EFE8",
                      border: "1.5px solid #0A0A0A",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barWidth}%`,
                        background: idx === 0 ? "#FF2D8A" : "#B8F04A",
                        borderRight: "1.5px solid #0A0A0A",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // ── 4. ANATOMY / TREE HIERARCHY FIGURE ──
    if ((figure.kind === "anatomy" || figure.kind === "tree") && data && typeof data === "object") {
      const items = Object.entries(data);
      return (
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid #0A0A0A",
            boxShadow: "3px 3px 0 #0A0A0A",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            margin: "10px 0",
          }}
        >
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "11px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#0A0A0A",
            }}
          >
            <ListTree size={13} color="#FF2D8A" />
            COMPONENT ANATOMY & STRUCTURE
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "8px",
            }}
          >
            {items.map(([k, v], idx) => (
              <div
                key={idx}
                style={{
                  background: "#F5F3EF",
                  border: "1.5px solid #0A0A0A",
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "#FF2D8A",
                    textTransform: "uppercase",
                  }}
                >
                  {k.replace(/_/g, " ")}
                </span>
                <span
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#111",
                  }}
                >
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <pre
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: "11.5px",
          background: "#FFFFFF",
          border: "1.5px solid #0A0A0A",
          padding: "10px 12px",
          margin: 0,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div
      className={`digest-figure-box ${className}`}
      style={{
        marginTop: "12px",
        marginBottom: "12px",
        padding: "14px 16px",
        background: "#F8F6F0",
        border: "2.5px dashed #0A0A0A",
        boxShadow: "3px 3px 0 rgba(10,10,10,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        ...style,
      }}
    >
      {/* Figure Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontFamily: "Space Mono, monospace",
            fontSize: "11px",
            fontWeight: 800,
            color: "#FF2D8A",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#0A0A0A",
            padding: "2px 8px",
          }}
        >
          <Layers size={11} color="#FF2D8A" />
          <span style={{ color: "#FFF" }}>FIG</span> ·{" "}
          <span style={{ color: "#FCE94F" }}>{figure.kind.toUpperCase()}</span>
        </span>

        {figure.scaleNote && (
          <span
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "9.5px",
              fontWeight: 700,
              color: "#555",
            }}
          >
            {figure.scaleNote}
          </span>
        )}
      </div>

      {/* Rendered Interactive/Visual Diagram */}
      {renderFigureContent()}

      {/* Handwritten Footnote Caption */}
      {figure.caption && (
        <div
          style={{
            fontFamily: "Caveat, cursive",
            fontSize: "19px",
            fontWeight: 700,
            lineHeight: 1.25,
            color: "#0A0A0A",
            marginTop: "2px",
          }}
        >
          ↳ {figure.caption}
        </div>
      )}
    </div>
  );
};
