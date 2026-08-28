"use client";

import React, { useEffect, useRef, useState } from "react";
import { VisualArtifact } from "@/lib/marginalia/types";
import { playSound } from "@/lib/sound";

interface VisualArtifactViewerProps {
  artifact: VisualArtifact;
  compact?: boolean;
}

let mermaidInstance: any = null;

export const VisualArtifactViewer: React.FC<VisualArtifactViewerProps> = ({
  artifact,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    let active = true;

    async function renderMermaid() {
      if (!artifact.mermaidCode) return;
      try {
        if (!mermaidInstance) {
          const mermaidModule = await import("mermaid");
          mermaidInstance = mermaidModule.default;
          mermaidInstance.initialize({
            startOnLoad: false,
            theme: "neutral",
            themeVariables: {
              fontFamily: "Courier New, monospace",
              primaryColor: "#FEF08A",
              primaryTextColor: "#0A0A0A",
              primaryBorderColor: "#0A0A0A",
              lineColor: "#0A0A0A",
              secondaryColor: "#E0F2FE",
              tertiaryColor: "#DCFCE7",
              nodeBorder: "#0A0A0A",
              clusterBkg: "#F8FAFC",
              clusterBorder: "#0A0A0A",
            },
            securityLevel: "loose",
          });
        }

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaidInstance.render(id, artifact.mermaidCode.trim());
        if (active) {
          setSvgContent(svg);
          setRenderError(null);
        }
      } catch (err: any) {
        if (active) {
          setRenderError(err?.message || "Diagram syntax render error");
        }
      }
    }

    if (artifact.type !== "COMPARISON" && artifact.type !== "METRIC_GRID" && artifact.mermaidCode) {
      renderMermaid();
    }

    return () => {
      active = false;
    };
  }, [artifact]);

  const handleCopyCode = () => {
    if (!artifact.mermaidCode) return;
    navigator.clipboard.writeText(artifact.mermaidCode);
    playSound.click();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      style={{
        border: "2px solid var(--ink)",
        background: "var(--card)",
        boxShadow: compact ? "2px 2px 0 var(--ink)" : "4px 4px 0 var(--ink)",
        marginTop: "10px",
        marginBottom: "10px",
        overflow: "hidden",
      }}
    >
      {/* Visual Artifact Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "var(--shade)",
          borderBottom: "1.5px solid var(--ink)",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "8.5px",
              fontWeight: 900,
              padding: "2px 6px",
              background: "var(--ink)",
              color: "var(--paper)",
              letterSpacing: "0.1em",
            }}
          >
            {artifact.type === "METRIC_GRID"
              ? "📊 INFOGRAPHIC DATA"
              : artifact.type === "COMPARISON"
              ? "⚖️ COMPARISON MATRIX"
              : artifact.type === "TIMELINE"
              ? "⏱ HISTORICAL TIMELINE"
              : artifact.type === "MINDMAP"
              ? "🧠 CONCEPTUAL MINDMAP"
              : artifact.type === "QUADRANT"
              ? "🧭 2x2 QUADRANT MODEL"
              : "📐 SYSTEM DIAGRAM"}
          </span>
          <span
            style={{
              fontFamily: "var(--display)",
              fontSize: "13px",
              fontWeight: 800,
              color: "var(--ink)",
            }}
          >
            {artifact.title}
          </span>
        </div>

        {artifact.mermaidCode && (
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "8.5px",
                fontWeight: 800,
                padding: "2px 6px",
                border: "1px solid var(--ink)",
                background: showCode ? "var(--ink)" : "var(--paper)",
                color: showCode ? "var(--paper)" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              {showCode ? "HIDE CODE" : "VIEW CODE"}
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "8.5px",
                fontWeight: 800,
                padding: "2px 6px",
                border: "1px solid var(--ink)",
                background: copiedCode ? "var(--lime)" : "var(--paper)",
                color: "#0A0A0A",
                cursor: "pointer",
              }}
            >
              {copiedCode ? "✓ COPIED" : "📋 COPY"}
            </button>
          </div>
        )}
      </div>

      {/* Visual Content Body */}
      <div style={{ padding: "14px 16px", background: "var(--paper)" }}>
        {/* ── 1. METRIC INFOGRAPHIC GRID ── */}
        {artifact.type === "METRIC_GRID" && artifact.metrics && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            {artifact.metrics.map((m, idx) => (
              <div
                key={idx}
                style={{
                  border: "1.5px solid var(--ink)",
                  background: "var(--card)",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9px",
                    fontWeight: 800,
                    opacity: 0.7,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: "24px",
                    fontWeight: 900,
                    lineHeight: 1.1,
                    color: "var(--ink)",
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: "11.5px",
                    lineHeight: 1.35,
                    opacity: 0.85,
                  }}
                >
                  {m.subtext}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 2. COMPARISON MATRIX ── */}
        {artifact.type === "COMPARISON" && artifact.comparison && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--body)",
                fontSize: "12.5px",
              }}
            >
              <thead>
                <tr style={{ background: "var(--shade)", borderBottom: "2px solid var(--ink)" }}>
                  <th
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      width: "25%",
                    }}
                  >
                    DIMENSION
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 900,
                      background: "#FFE4E6",
                      color: "#9F1239",
                      borderLeft: "1.5px solid var(--ink)",
                    }}
                  >
                    {artifact.comparison.leftHeader}
                  </th>
                  <th
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 900,
                      background: "#DCFCE7",
                      color: "#166534",
                      borderLeft: "1.5px solid var(--ink)",
                    }}
                  >
                    {artifact.comparison.rightHeader}
                  </th>
                </tr>
              </thead>
              <tbody>
                {artifact.comparison.rows.map((r, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: "1px solid rgba(10, 10, 10, 0.15)",
                      background: rIdx % 2 === 0 ? "var(--paper)" : "var(--card)",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: "var(--mono)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        opacity: 0.8,
                      }}
                    >
                      {r.dimension}
                    </td>
                    <td style={{ padding: "8px 12px", borderLeft: "1.5px solid var(--ink)" }}>
                      {r.left}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        borderLeft: "1.5px solid var(--ink)",
                        fontWeight: 600,
                      }}
                    >
                      {r.right}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 3. MERMAID DIAGRAM RENDERER ── */}
        {artifact.mermaidCode && (
          <div>
            {showCode && (
              <pre
                style={{
                  padding: "10px 12px",
                  background: "#0A0A0A",
                  color: "#38BDF8",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  overflowX: "auto",
                  border: "1.5px solid var(--ink)",
                  marginBottom: "12px",
                }}
              >
                {artifact.mermaidCode}
              </pre>
            )}

            {renderError ? (
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  color: "#DC2626",
                  padding: "8px",
                  background: "#FEE2E2",
                  border: "1px solid #DC2626",
                }}
              >
                Error rendering diagram: {renderError}
              </div>
            ) : svgContent ? (
              <div
                ref={containerRef}
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflowX: "auto",
                  padding: "10px 0",
                }}
              />
            ) : (
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  textAlign: "center",
                  opacity: 0.6,
                  padding: "16px",
                }}
              >
                📐 Rendering diagram...
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        {artifact.caption && (
          <div
            style={{
              fontFamily: "var(--quote)",
              fontStyle: "italic",
              fontSize: "12px",
              opacity: 0.75,
              marginTop: "8px",
              textAlign: "center",
            }}
          >
            {artifact.caption}
          </div>
        )}
      </div>
    </div>
  );
};
