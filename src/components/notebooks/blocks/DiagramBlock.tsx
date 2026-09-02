"use client";

import React, { useState, useEffect, useRef } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  Code2,
  Eye,
  AlertCircle,
  Network,
  Download,
} from "lucide-react";

interface DiagramBlockProps {
  block: Extract<Block, { type: "diagram" }>;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

let mermaidInstance: any = null;

export const DiagramBlock: React.FC<DiagramBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [editableCode, setEditableCode] = useState<string>(block.code);

  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize local editable code when block code updates externally
  useEffect(() => {
    setEditableCode(block.code);
  }, [block.code]);

  // Render Mermaid Diagram
  useEffect(() => {
    let isCancelled = false;

    async function renderMermaid() {
      if (!editableCode || !editableCode.trim()) {
        setSvgContent("");
        setRenderError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        if (!mermaidInstance) {
          const mermaidModule = await import("mermaid");
          mermaidInstance = mermaidModule.default;
        }

        mermaidInstance.initialize({
          startOnLoad: false,
          theme: isInk ? "dark" : "neutral",
          securityLevel: "loose",
          fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
          flowchart: {
            curve: "basis",
            useMaxWidth: false,
            htmlLabels: true,
          },
          themeVariables: isInk
            ? {
                primaryColor: "#2A303F",
                primaryBorderColor: "#7FE9F7",
                primaryTextColor: "#F0EDE4",
                lineColor: "#7FE9F7",
                secondaryColor: "#1E222D",
                tertiaryColor: "#161920",
                edgeLabelBackground: "#1A1D26",
                clusterBkg: "#14161E",
                clusterBorder: "rgba(255,255,255,0.2)",
              }
            : {
                primaryColor: "#F3F0E8",
                primaryBorderColor: "#0A0A0A",
                primaryTextColor: "#0A0A0A",
                lineColor: "#0A0A0A",
                secondaryColor: "#FEF3C7",
                tertiaryColor: "#E0E7FF",
                edgeLabelBackground: "#FFFFFF",
                clusterBkg: "#FAF8F5",
                clusterBorder: "rgba(10,10,10,0.3)",
              },
        });

        const id = `mermaid-nb-${Math.random().toString(36).substring(2, 9)}`;
        // Mermaid render API takes (id, text)
        const { svg } = await mermaidInstance.render(id, editableCode.trim());

        if (!isCancelled) {
          setSvgContent(svg);
          setRenderError(null);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn("[DiagramBlock] Mermaid render error:", err);
          setRenderError(err.message || "Failed to render diagram syntax.");
          setIsLoading(false);
        }
      }
    }

    renderMermaid();

    return () => {
      isCancelled = true;
    };
  }, [editableCode, isInk]);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(editableCode);
    setCopied(true);
    playSound.pop();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoom = (delta: number) => {
    playSound.click();
    setZoomLevel((prev) => Math.min(2.5, Math.max(0.5, +(prev + delta).toFixed(2))));
  };

  const handleResetZoom = () => {
    playSound.click();
    setZoomLevel(1);
  };

  const handleCodeChange = (newCode: string) => {
    setEditableCode(newCode);
    if (onUpdateBlock) {
      onUpdateBlock({ ...block, type: "diagram", code: newCode });
    }
  };

  const handleCaptionChange = (newCaption: string) => {
    if (onUpdateBlock) {
      onUpdateBlock({ ...block, type: "diagram", caption: newCaption });
    }
  };

  return (
    <div
      className="nb-diagram-card"
      style={{
        border: isInk ? "2px solid rgba(255,255,255,0.2)" : "3px solid #0A0A0A",
        background: isInk ? "#13161F" : "#FFFFFF",
        boxShadow: isInk ? "4px 4px 0 rgba(0,0,0,0.7)" : "5px 5px 0 #0A0A0A",
      }}
    >
      {/* ── Top Toolbar ── */}
      <div
        className="nb-diagram-toolbar"
        style={{
          background: isInk ? "#1A1D27" : "#FCE94F",
          color: isInk ? "#F0EDE4" : "#0A0A0A",
          borderBottom: isInk ? "1.5px solid rgba(255,255,255,0.12)" : "2px solid #0A0A0A",
        }}
      >
        {/* Left: Badge & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 auto" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: isInk ? "#0A0A0A" : "#0A0A0A",
              color: isInk ? "#7FE9F7" : "#FCE94F",
              padding: "2px 7px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              borderRadius: "2px",
              flex: "none",
            }}
          >
            <Network size={11} strokeWidth={2.5} />
            <span className="nb-diagram-badge-full">ARCHITECTURE ILLUSTRATION</span>
            <span className="nb-diagram-badge-short" style={{ display: "none" }}>DIAGRAM</span>
          </span>

          <span
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {block.title || "System Diagram"}
          </span>
        </div>

        {/* Right: Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {/* Zoom controls (hidden in code mode) */}
          {!showCode && !renderError && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: isInk ? "1px solid rgba(255,255,255,0.2)" : "1.5px solid #0A0A0A",
                background: isInk ? "#222734" : "#FFFFFF",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => handleZoom(-0.15)}
                title="Zoom Out"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "3px 6px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <ZoomOut size={11} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset Zoom"
                style={{
                  background: "transparent",
                  border: "none",
                  borderLeft: isInk ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(10,10,10,0.2)",
                  borderRight: isInk ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(10,10,10,0.2)",
                  color: "inherit",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "8.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "3px 6px",
                }}
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.15)}
                title="Zoom In"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "3px 6px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <ZoomIn size={11} />
              </button>
            </div>
          )}

          {/* Toggle Code / Visual */}
          <button
            type="button"
            onClick={() => {
              playSound.click();
              setShowCode(!showCode);
            }}
            title={showCode ? "View Diagram" : "View / Edit Mermaid Code"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              background: showCode ? tokens.borderPrimary : (isInk ? "#222734" : "#FFFFFF"),
              color: showCode ? (isInk ? "#FFFFFF" : "#FCE94F") : "inherit",
              border: isInk ? "1px solid rgba(255,255,255,0.2)" : "1.5px solid #0A0A0A",
              padding: "3px 7px",
              cursor: "pointer",
              borderRadius: "2px",
            }}
          >
            {showCode ? <Eye size={11} /> : <Code2 size={11} />}
            <span>{showCode ? "PREVIEW" : "CODE"}</span>
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy Mermaid Code"
            style={{
              background: copied ? "#10B981" : (isInk ? "#222734" : "#FFFFFF"),
              color: copied ? "#FFFFFF" : "inherit",
              border: isInk ? "1px solid rgba(255,255,255,0.2)" : "1.5px solid #0A0A0A",
              padding: "4px 7px",
              cursor: "pointer",
              borderRadius: "2px",
              display: "grid",
              placeItems: "center",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>

          {/* Fullscreen Expand */}
          <button
            type="button"
            onClick={() => {
              playSound.pop();
              setIsFullscreen(!isFullscreen);
            }}
            title={isFullscreen ? "Close Fullscreen" : "Fullscreen Inspection"}
            style={{
              background: isInk ? "#222734" : "#FFFFFF",
              color: "inherit",
              border: isInk ? "1px solid rgba(255,255,255,0.2)" : "1.5px solid #0A0A0A",
              padding: "4px 7px",
              cursor: "pointer",
              borderRadius: "2px",
              display: "grid",
              placeItems: "center",
            }}
          >
            {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
        </div>
      </div>

      {/* ── Main Canvas ── */}
      {showCode ? (
        /* Source Code Editor */
        <div style={{ padding: "12px", background: isInk ? "#0D0F14" : "#1C1D22", color: "#F0EDE4" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              opacity: 0.6,
            }}
          >
            <span>EDIT MERMAID SYNTAX (INSTANT PREVIEW):</span>
          </div>
          <textarea
            value={editableCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            spellCheck={false}
            rows={Math.max(6, editableCode.split("\n").length + 1)}
            style={{
              width: "100%",
              background: isInk ? "#151821" : "#0A0A0A",
              color: "#B8F04A",
              border: "1.5px solid rgba(255,255,255,0.15)",
              borderRadius: "2px",
              fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
              fontSize: "12px",
              lineHeight: "1.5",
              padding: "10px",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>
      ) : renderError ? (
        /* Syntax Error Fallback */
        <div
          style={{
            padding: "24px 20px",
            background: isInk ? "#241416" : "#FFF1F2",
            borderLeft: "4px solid #EF4444",
            color: isInk ? "#FCA5A5" : "#991B1B",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "12px", marginBottom: "6px" }}>
            <AlertCircle size={15} />
            <span>Mermaid Render Error</span>
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", marginBottom: "12px", whiteSpace: "pre-wrap" }}>
            {renderError}
          </div>
          <button
            type="button"
            onClick={() => setShowCode(true)}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              padding: "6px 12px",
              background: "#EF4444",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              borderRadius: "2px",
            }}
          >
            EDIT MERMAID CODE
          </button>
        </div>
      ) : (
        /* Rendered Diagram Canvas */
        <div
          ref={containerRef}
          className="nb-diagram-canvas"
          style={{
            position: "relative",
            minHeight: "180px",
            overflow: "auto",
            padding: "24px 18px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: isInk ? "#13161F" : "#FAF8F5",
            backgroundImage: isInk
              ? "radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 0)"
              : "radial-gradient(rgba(10, 10, 10, 0.08) 1px, transparent 0)",
            backgroundSize: "18px 18px",
            transition: "all 0.15s ease",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {isLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: isInk ? "rgba(19, 22, 31, 0.8)" : "rgba(250, 248, 245, 0.8)",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                color: tokens.textSecondary,
                zIndex: 2,
              }}
            >
              RENDERING DIAGRAM…
            </div>
          )}

          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: "transform 0.18s ease-out",
              maxWidth: "100%",
              display: "flex",
              justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      )}

      {/* ── Optional Caption Footer ── */}
      <div
        style={{
          padding: "6px 14px",
          borderTop: isInk ? "1px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(10,10,10,0.1)",
          background: isInk ? "#161923" : "#F6F4ED",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <input
          type="text"
          value={block.caption || ""}
          onChange={(e) => handleCaptionChange(e.target.value)}
          placeholder="Add an explanatory caption or architectural notes…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 600,
            color: tokens.textSecondary,
          }}
        />
      </div>

      {/* ── Fullscreen Modal View ── */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(10, 10, 10, 0.9)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            animation: "fadeIn 0.15s ease",
          }}
          onClick={() => setIsFullscreen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: isInk ? "#13161F" : "#FFFFFF",
              border: "3px solid #0A0A0A",
              boxShadow: "10px 10px 0 #0A0A0A",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                background: isInk ? "#1A1D27" : "#FCE94F",
                borderBottom: "2px solid #0A0A0A",
                color: "#0A0A0A",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--display, sans-serif)",
                  fontSize: "15px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {block.title || "System Architecture Diagram"}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleZoom(-0.2)}
                  style={{ padding: "4px 8px", cursor: "pointer", border: "1.5px solid #0A0A0A", background: "#FFFFFF" }}
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  style={{ padding: "4px 8px", cursor: "pointer", border: "1.5px solid #0A0A0A", background: "#FFFFFF", fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700 }}
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom(0.2)}
                  style={{ padding: "4px 8px", cursor: "pointer", border: "1.5px solid #0A0A0A", background: "#FFFFFF" }}
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  style={{ padding: "4px 10px", cursor: "pointer", border: "1.5px solid #0A0A0A", background: "#FF4A4A", color: "#FFFFFF", fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800 }}
                >
                  CLOSE ✕
                </button>
              </div>
            </div>

            {/* Modal Canvas */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "36px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: isInk ? "#0D0F14" : "#FAF8F5",
              }}
            >
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
