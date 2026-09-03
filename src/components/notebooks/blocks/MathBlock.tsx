"use client";

import React, { useState, useEffect, useRef } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import {
  Copy,
  Check,
  Code2,
  Eye,
  Trash2,
  Sparkles,
  Sigma,
} from "lucide-react";
import "katex/dist/katex.min.css";

interface MathBlockProps {
  block: Extract<Block, { type: "math" }>;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

const PRESET_FORMULAS = [
  {
    name: "Quadratic Formula",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
  },
  {
    name: "Euler's Identity",
    latex: "e^{i\\pi} + 1 = 0",
  },
  {
    name: "Normal Distribution",
    latex: "f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}",
  },
  {
    name: "Bayes' Theorem",
    latex: "P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}",
  },
  {
    name: "Gradient Descent",
    latex: "\\theta_{t+1} = \\theta_t - \\eta \\nabla_{\\theta} J(\\theta_t)",
  },
  {
    name: "Matrix Multiplication",
    latex: "C_{ij} = \\sum_{k=1}^n A_{ik} B_{kj}",
  },
];

export const MathBlock: React.FC<MathBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [latex, setLatex] = useState(block.latex || "E = mc^2");
  const [title, setTitle] = useState(block.title || "");
  const [caption, setCaption] = useState(block.caption || "");
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);

  const katexRef = useRef<any>(null);

  // Synchronize internal state if block props change
  useEffect(() => {
    setLatex(block.latex);
    setTitle(block.title || "");
    setCaption(block.caption || "");
  }, [block.latex, block.title, block.caption]);

  // Dynamically load KaTeX and render formula
  useEffect(() => {
    let isCancelled = false;

    async function renderLatex() {
      if (!latex.trim()) {
        setRenderedHtml("");
        setRenderError(null);
        return;
      }

      try {
        if (!katexRef.current) {
          const katexModule = await import("katex");
          katexRef.current = katexModule.default || katexModule;
        }

        const html = katexRef.current.renderToString(latex, {
          displayMode: true,
          throwOnError: true,
        });

        if (!isCancelled) {
          setRenderedHtml(html);
          setRenderError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          // Attempt non-strict rendering before throwing error
          try {
            const fallbackHtml = katexRef.current?.renderToString(latex, {
              displayMode: true,
              throwOnError: false,
            });
            if (fallbackHtml) {
              setRenderedHtml(fallbackHtml);
              setRenderError(null);
              return;
            }
          } catch {}
          setRenderError(err?.message || "Invalid LaTeX syntax");
        }
      }
    }

    renderLatex();

    return () => {
      isCancelled = true;
    };
  }, [latex]);

  const commitUpdates = (newLatex: string, newTitle?: string, newCaption?: string) => {
    if (!onUpdateBlock) return;
    onUpdateBlock({
      ...block,
      latex: newLatex,
      title: newTitle !== undefined ? newTitle : title,
      caption: newCaption !== undefined ? newCaption : caption,
    });
  };

  const handleCopyLatex = () => {
    playSound.click();
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSelectPreset = (presetLatex: string, presetName: string) => {
    playSound.pop();
    setLatex(presetLatex);
    setTitle(presetName);
    commitUpdates(presetLatex, presetName);
    setShowPresets(false);
  };

  return (
    <div
      className="notion-math-block group"
      style={{
        margin: "18px 0",
        border: `2px solid ${tokens.borderPrimary}`,
        boxShadow: tokens.boxShadow,
        borderRadius: "2px",
        background: tokens.cardBg,
        overflow: "hidden",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: isInk ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.03)",
          borderBottom: `2px solid ${tokens.borderPrimary}`,
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px" }}>
          <Sigma size={15} color={accentColor} />
          <input
            type="text"
            value={title}
            placeholder="Equation Title / Theorem (optional)..."
            onChange={(e) => {
              setTitle(e.target.value);
              commitUpdates(latex, e.target.value);
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontWeight: 800,
              fontSize: "11px",
              letterSpacing: "0.06em",
              background: "transparent",
              border: "none",
              outline: "none",
              color: tokens.textPrimary,
              width: "100%",
            }}
          />
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Preset Formulas Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowPresets((prev) => !prev)}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                background: tokens.cardBg,
                color: tokens.textPrimary,
                border: `1.5px solid ${tokens.borderSubtle}`,
                padding: "3px 7px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                borderRadius: "2px",
              }}
            >
              <Sparkles size={11} color={accentColor} />
              <span>PRESETS</span>
            </button>

            {showPresets && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  zIndex: 999,
                  background: tokens.popoverBg,
                  border: `2px solid ${tokens.borderPrimary}`,
                  boxShadow: tokens.popoverShadow,
                  padding: "4px",
                  minWidth: "200px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {PRESET_FORMULAS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p.latex, p.name)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      background: "transparent",
                      border: "none",
                      color: tokens.textPrimary,
                      padding: "6px 8px",
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: "2px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Edit Source */}
          <button
            type="button"
            onClick={() => {
              playSound.click();
              setShowCode((prev) => !prev);
            }}
            title={showCode ? "View rendered equation" : "Edit LaTeX code"}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: showCode ? accentColor : tokens.cardBg,
              color: showCode ? "#FFFFFF" : tokens.textPrimary,
              border: `1.5px solid ${tokens.borderSubtle}`,
              padding: "3px 7px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderRadius: "2px",
            }}
          >
            {showCode ? <Eye size={11} /> : <Code2 size={11} />}
            <span>{showCode ? "PREVIEW" : "EDIT LATEX"}</span>
          </button>

          {/* Copy LaTeX */}
          <button
            type="button"
            onClick={handleCopyLatex}
            title="Copy raw LaTeX equation"
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: tokens.cardBg,
              color: copied ? "#10B981" : tokens.textSecondary,
              border: `1.5px solid ${tokens.borderSubtle}`,
              padding: "3px 7px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderRadius: "2px",
            }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            <span>{copied ? "COPIED" : "COPY"}</span>
          </button>

          {/* Delete */}
          {onDeleteBlock && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onDeleteBlock();
              }}
              title="Delete math block"
              style={{
                background: "transparent",
                border: "none",
                color: "#EF4444",
                cursor: "pointer",
                padding: "3px",
                display: "grid",
                placeItems: "center",
                opacity: 0.7,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: "18px 24px" }}>
        {showCode ? (
          <div>
            <textarea
              value={latex}
              onChange={(e) => {
                setLatex(e.target.value);
                commitUpdates(e.target.value);
              }}
              placeholder="Type LaTeX math syntax (e.g. \int_{0}^{\infty} e^{-x^2} dx)..."
              rows={3}
              style={{
                width: "100%",
                background: isInk ? "#11141B" : "#F4EFE6",
                border: `1.5px solid ${tokens.borderSubtle}`,
                color: tokens.textPrimary,
                fontFamily: "var(--mono, monospace)",
                fontSize: "12.5px",
                lineHeight: "1.6",
                padding: "10px 12px",
                borderRadius: "2px",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              padding: "12px 0",
              textAlign: "center",
            }}
          >
            {renderError ? (
              <div
                style={{
                  color: "#EF4444",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  padding: "8px",
                  background: isInk ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
                  border: "1px dashed #EF4444",
                  borderRadius: "2px",
                  textAlign: "center",
                }}
              >
                {renderError}
              </div>
            ) : renderedHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                style={{
                  fontSize: "19px",
                  color: tokens.textPrimary,
                }}
              />
            ) : (
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  color: tokens.textSecondary,
                  opacity: 0.6,
                }}
              >
                Enter LaTeX equation...
              </div>
            )}
          </div>
        )}

        {/* Optional Caption */}
        <div style={{ marginTop: "10px", borderTop: `1px dashed ${tokens.borderSubtle}`, paddingTop: "8px" }}>
          <input
            type="text"
            value={caption}
            placeholder="Add explanation or variable notes (optional)..."
            onChange={(e) => {
              setCaption(e.target.value);
              commitUpdates(latex, title, e.target.value);
            }}
            style={{
              fontFamily: "var(--sans, system-ui, sans-serif)",
              fontSize: "11.5px",
              fontStyle: "italic",
              background: "transparent",
              border: "none",
              outline: "none",
              color: tokens.textSecondary,
              width: "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
};
