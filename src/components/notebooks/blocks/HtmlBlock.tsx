"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import {
  Code2,
  Eye,
  Columns,
  Maximize2,
  Minimize2,
  RotateCw,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Trash2,
  ChevronDown,
  Terminal,
} from "lucide-react";

type HtmlBlockType = Extract<Block, { type: "html" }>;

interface HtmlBlockProps {
  block: HtmlBlockType;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  readOnly?: boolean;
  accentColor?: string;
  theme?: NotebookTheme;
}

type ViewportMode = "responsive" | "desktop" | "tablet" | "mobile";
type ViewMode = "preview" | "source" | "split";
type HeightPreset = 380 | 560 | 820 | "auto";
type BackdropChoice = "paper" | "dark" | "canvas" | "white";

export const HtmlBlock: React.FC<HtmlBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  readOnly = false,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>(block.viewMode || "preview");
  const [viewport, setViewport] = useState<ViewportMode>(block.viewport || "responsive");
  const [rawHtml, setRawHtml] = useState<string>(block.html || "");
  const [titleDraft, setTitleDraft] = useState<string>(block.title || "HTML Sandbox");
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [heightPreset, setHeightPreset] = useState<HeightPreset>(
    (block.height as HeightPreset) || 560
  );
  const [autoMeasuredHeight, setAutoMeasuredHeight] = useState<number | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [backdrop, setBackdrop] = useState<BackdropChoice>("paper");
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Keep local draft synced when block prop changes
  useEffect(() => {
    setRawHtml(block.html || "");
  }, [block.html]);

  useEffect(() => {
    setTitleDraft(block.title || "HTML Sandbox");
  }, [block.title]);

  // Debounced commit of HTML edits
  const debouncedUpdateHtml = useRef<NodeJS.Timeout | null>(null);
  const handleHtmlChange = (newHtml: string) => {
    setRawHtml(newHtml);
    if (onUpdateBlock) {
      if (debouncedUpdateHtml.current) {
        clearTimeout(debouncedUpdateHtml.current);
      }
      debouncedUpdateHtml.current = setTimeout(() => {
        onUpdateBlock({
          ...block,
          html: newHtml,
        });
      }, 400);
    }
  };

  // Commit title change
  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (onUpdateBlock && titleDraft.trim() !== block.title) {
      onUpdateBlock({
        ...block,
        title: titleDraft.trim() || "HTML Sandbox",
      });
    }
  };

  // Switch view mode
  const handleSetViewMode = (mode: ViewMode) => {
    playSound.click();
    setViewMode(mode);
    if (onUpdateBlock) {
      onUpdateBlock({
        ...block,
        viewMode: mode,
      });
    }
  };

  // Switch viewport
  const handleSetViewport = (vp: ViewportMode) => {
    playSound.click();
    setViewport(vp);
    if (onUpdateBlock) {
      onUpdateBlock({
        ...block,
        viewport: vp,
      });
    }
  };

  // Refresh iframe
  const handleReload = () => {
    playSound.click();
    setIframeKey((prev) => prev + 1);
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(rawHtml);
      playSound.pop();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Open HTML in standalone fresh tab
  const handlePopout = () => {
    playSound.click();
    try {
      const blob = new Blob([preparedHtml], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("Failed to pop out HTML sandbox:", err);
    }
  };

  // Handle Tab key indentation in source editor
  const handleKeyDownInEditor = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const nextVal = value.substring(0, start) + "  " + value.substring(end);
      handleHtmlChange(nextVal);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Sync scroll between textarea and line numbers
  const handleEditorScroll = () => {
    if (codeTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = codeTextareaRef.current.scrollTop;
    }
  };

  // Listen to iframe height communication
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "hoard-html-sandbox-resize" && e.data.blockId === block.id) {
        if (typeof e.data.height === "number" && e.data.height > 100) {
          setAutoMeasuredHeight(Math.min(Math.max(e.data.height + 32, 280), 2200));
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [block.id]);

  // Compute prepared HTML document with auto-resize script
  const preparedHtml = useMemo(() => {
    const trimmed = rawHtml.trim();
    const hasHtmlTag = /<html[\s>]/i.test(trimmed);
    const hasDocType = /<!DOCTYPE\s+html/i.test(trimmed);

    const resizeScript = `
      <script>
        (function() {
          function notifyHeight() {
            var h = Math.max(
              document.body ? document.body.scrollHeight : 0,
              document.documentElement ? document.documentElement.scrollHeight : 0
            );
            if (window.parent) {
              window.parent.postMessage({
                type: 'hoard-html-sandbox-resize',
                blockId: '${block.id}',
                height: h
              }, '*');
            }
          }
          window.addEventListener('load', notifyHeight);
          window.addEventListener('resize', notifyHeight);
          setTimeout(notifyHeight, 150);
          setTimeout(notifyHeight, 600);
          setTimeout(notifyHeight, 1500);
        })();
      </script>
    `;

    if (hasDocType || hasHtmlTag) {
      // Inject resize script before </body> if present, or append
      if (/<\/body>/i.test(trimmed)) {
        return trimmed.replace(/<\/body>/i, `${resizeScript}</body>`);
      }
      return `${trimmed}\n${resizeScript}`;
    }

    // Wrap plain snippets or fragments with standard HTML5 boilerplate
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  ${trimmed}
  ${resizeScript}
</body>
</html>`;
  }, [rawHtml, block.id]);

  // Viewport width styling
  const viewportStyles = useMemo(() => {
    switch (viewport) {
      case "mobile":
        return {
          maxWidth: "375px",
          margin: "0 auto",
          borderLeft: "8px solid #0A0A0A",
          borderRight: "8px solid #0A0A0A",
          borderRadius: "16px",
        };
      case "tablet":
        return {
          maxWidth: "768px",
          margin: "0 auto",
          borderLeft: "6px solid #0A0A0A",
          borderRight: "6px solid #0A0A0A",
          borderRadius: "12px",
        };
      case "desktop":
        return {
          maxWidth: "100%",
          margin: "0 auto",
        };
      case "responsive":
      default:
        return {
          width: "100%",
        };
    }
  }, [viewport]);

  // Compute active container height
  const activeHeight = useMemo(() => {
    if (isFullscreen) return "calc(100vh - 120px)";
    if (heightPreset === "auto") {
      return autoMeasuredHeight ? `${autoMeasuredHeight}px` : "560px";
    }
    return `${heightPreset}px`;
  }, [heightPreset, autoMeasuredHeight, isFullscreen]);

  // Line numbers calculation for source editor
  const linesCount = useMemo(() => {
    return Math.max(rawHtml.split("\n").length, 1);
  }, [rawHtml]);

  // Backdrop background color for preview container
  const backdropBg = useMemo(() => {
    switch (backdrop) {
      case "dark":
        return "#0D0E11";
      case "white":
        return "#FFFFFF";
      case "canvas":
        return "#E5E7EB";
      case "paper":
      default:
        return isInk ? "#15181E" : "#F7F5EE";
    }
  }, [backdrop, isInk]);

  // Metrics info
  const metrics = useMemo(() => {
    const bytes = new Blob([rawHtml]).size;
    const kb = (bytes / 1024).toFixed(1);
    const hasCss = /<style/i.test(rawHtml) || /style=/i.test(rawHtml);
    const hasScript = /<script/i.test(rawHtml);
    return { bytes, kb, lines: linesCount, hasCss, hasScript };
  }, [rawHtml, linesCount]);

  return (
    <div
      style={{
        margin: isFullscreen ? "0" : "20px 0 28px",
        width: "100%",
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : "auto",
        left: isFullscreen ? 0 : "auto",
        right: isFullscreen ? 0 : "auto",
        bottom: isFullscreen ? 0 : "auto",
        zIndex: isFullscreen ? 9999 : 1,
        background: isFullscreen ? "rgba(10, 10, 10, 0.94)" : "transparent",
        padding: isFullscreen ? "16px" : "0",
        backdropFilter: isFullscreen ? "blur(8px)" : "none",
        boxSizing: "border-box",
      }}
    >
      {/* ── Main Block Card Chassis ── */}
      <div
        style={{
          border: `2.5px solid ${tokens.borderPrimary}`,
          boxShadow: isFullscreen ? "0 20px 60px rgba(0,0,0,0.6)" : tokens.boxShadow,
          background: tokens.cardBg,
          borderRadius: "4px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: isFullscreen ? "100%" : "none",
          transition: "box-shadow 0.15s ease",
        }}
      >
        {/* ── Top Header Flight Deck ── */}
        <div
          style={{
            background: isInk ? "#161920" : "#EBE7DC",
            borderBottom: `2.5px solid ${tokens.borderPrimary}`,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            userSelect: "none",
          }}
        >
          {/* Left: Window Dots & Title Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {/* macOS Window Dots */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#FF5F56",
                  border: "1.5px solid #0A0A0A",
                }}
              />
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#FFBD2E",
                  border: "1.5px solid #0A0A0A",
                }}
              />
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#27C93F",
                  border: "1.5px solid #0A0A0A",
                }}
              />
            </div>

            {/* Tag Badge */}
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                background: "#0A0A0A",
                color: "#B8F04A",
                padding: "3px 7px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "#B8F04A",
                  boxShadow: "0 0 6px #B8F04A",
                }}
              />
              HTML5+CSS3
            </div>

            {/* Editable Title Pill */}
            {isEditingTitle && !readOnly ? (
              <input
                type="text"
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(block.title || "HTML Sandbox");
                    setIsEditingTitle(false);
                  }
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "2px solid #0A0A0A",
                  background: "#FFFFFF",
                  color: "#0A0A0A",
                  padding: "2px 8px",
                  outline: "none",
                  maxWidth: "240px",
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => !readOnly && setIsEditingTitle(true)}
                title={readOnly ? "" : "Click to edit title"}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: readOnly ? "default" : "pointer",
                  fontFamily: "var(--display, sans-serif)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: tokens.textPrimary,
                  letterSpacing: "-0.01em",
                  maxWidth: "280px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                }}
              >
                {titleDraft || "HTML Sandbox"}
              </button>
            )}

            {/* Metrics Pill */}
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 600,
                opacity: 0.6,
                letterSpacing: "0.05em",
                color: tokens.textSecondary,
              }}
            >
              {metrics.lines}L · {metrics.kb}KB
            </span>
          </div>

          {/* Middle: View Mode Tabs (Preview / Code / Split) */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: `2px solid ${tokens.borderPrimary}`,
              background: isInk ? "#0A0A0A" : "#FFFFFF",
              padding: "2px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => handleSetViewMode("preview")}
              title="Rendered live preview"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                border: "none",
                background: viewMode === "preview" ? (isInk ? "#B8F04A" : "#0A0A0A") : "transparent",
                color: viewMode === "preview" ? (isInk ? "#0A0A0A" : "#FFFFFF") : tokens.textSecondary,
                padding: "3px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.1s ease",
              }}
            >
              <Eye size={11} />
              PREVIEW
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode("source")}
              title="HTML / CSS source code"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                border: "none",
                background: viewMode === "source" ? (isInk ? "#B8F04A" : "#0A0A0A") : "transparent",
                color: viewMode === "source" ? (isInk ? "#0A0A0A" : "#FFFFFF") : tokens.textSecondary,
                padding: "3px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.1s ease",
              }}
            >
              <Code2 size={11} />
              SOURCE
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode("split")}
              title="Side-by-side: Code + Live Render"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                border: "none",
                background: viewMode === "split" ? (isInk ? "#B8F04A" : "#0A0A0A") : "transparent",
                color: viewMode === "split" ? (isInk ? "#0A0A0A" : "#FFFFFF") : tokens.textSecondary,
                padding: "3px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.1s ease",
              }}
            >
              <Columns size={11} />
              SPLIT
            </button>
          </div>

          {/* Right: Viewport & Tool Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Viewport switcher (when in Preview or Split mode) */}
            {viewMode !== "source" && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: isInk ? "#0A0A0A" : "#FFFFFF",
                  padding: "2px",
                  gap: "1px",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSetViewport("responsive")}
                  title="Full width responsive"
                  style={{
                    border: "none",
                    background: viewport === "responsive" ? "#FCE94F" : "transparent",
                    color: "#0A0A0A",
                    padding: "3px 6px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <Monitor size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewport("tablet")}
                  title="Tablet (768px)"
                  style={{
                    border: "none",
                    background: viewport === "tablet" ? "#FCE94F" : "transparent",
                    color: "#0A0A0A",
                    padding: "3px 6px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <Tablet size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewport("mobile")}
                  title="Mobile (375px)"
                  style={{
                    border: "none",
                    background: viewport === "mobile" ? "#FCE94F" : "transparent",
                    color: "#0A0A0A",
                    padding: "3px 6px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <Smartphone size={12} />
                </button>
              </div>
            )}

            {/* Reload button */}
            <button
              type="button"
              onClick={handleReload}
              title="Reload sandbox"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `2px solid ${tokens.borderPrimary}`,
                background: isInk ? "#0A0A0A" : "#FFFFFF",
                color: tokens.textPrimary,
                padding: "4px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <RotateCw size={11} />
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy HTML to clipboard"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `2px solid ${tokens.borderPrimary}`,
                background: copied ? "#B8F04A" : isInk ? "#0A0A0A" : "#FFFFFF",
                color: copied ? "#0A0A0A" : tokens.textPrimary,
                padding: "4px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied && <span style={{ fontSize: "9px" }}>COPIED</span>}
            </button>

            {/* Pop-out standalone tab */}
            <button
              type="button"
              onClick={handlePopout}
              title="Open standalone web page in new tab"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `2px solid ${tokens.borderPrimary}`,
                background: isInk ? "#0A0A0A" : "#FFFFFF",
                color: tokens.textPrimary,
                padding: "4px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <ExternalLink size={11} />
            </button>

            {/* Height preset toggle */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                title="Adjust height & backdrop"
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 800,
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: isInk ? "#0A0A0A" : "#FFFFFF",
                  color: tokens.textPrimary,
                  padding: "4px 7px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span>{heightPreset === "auto" ? "AUTO" : `${heightPreset}PX`}</span>
                <ChevronDown size={10} />
              </button>

              {showSettingsMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "4px",
                    background: isInk ? "#161920" : "#FFFFFF",
                    border: "2px solid #0A0A0A",
                    boxShadow: "3px 3px 0 #0A0A0A",
                    zIndex: 50,
                    minWidth: "160px",
                    padding: "6px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      opacity: 0.5,
                      padding: "4px 6px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    HEIGHT PRESET
                  </div>
                  {([380, 560, 820, "auto"] as HeightPreset[]).map((hp) => (
                    <button
                      key={hp}
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setHeightPreset(hp);
                        setShowSettingsMenu(false);
                        if (onUpdateBlock && typeof hp === "number") {
                          onUpdateBlock({ ...block, height: hp });
                        }
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "5px 8px",
                        border: "none",
                        background: heightPreset === hp ? "#FCE94F" : "transparent",
                        color: "#0A0A0A",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{hp === "auto" ? "Auto Fit" : `${hp}px`}</span>
                      {heightPreset === hp && <span>✓</span>}
                    </button>
                  ))}

                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      opacity: 0.5,
                      padding: "8px 6px 4px",
                      letterSpacing: "0.1em",
                      borderTop: "1px solid rgba(0,0,0,0.1)",
                      marginTop: "4px",
                    }}
                  >
                    BACKDROP
                  </div>
                  {(["paper", "dark", "white", "canvas"] as BackdropChoice[]).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setBackdrop(bg);
                        setShowSettingsMenu(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "4px 8px",
                        border: "none",
                        background: backdrop === bg ? "#B8F04A" : "transparent",
                        color: "#0A0A0A",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => {
                playSound.pop();
                setIsFullscreen(!isFullscreen);
              }}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Immersion"}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `2px solid ${tokens.borderPrimary}`,
                background: isFullscreen ? "#FF2D8A" : isInk ? "#0A0A0A" : "#FFFFFF",
                color: isFullscreen ? "#FFFFFF" : tokens.textPrimary,
                padding: "4px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>

            {/* Delete button */}
            {onDeleteBlock && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  onDeleteBlock();
                }}
                title="Delete HTML block"
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: "transparent",
                  color: "#FF2D8A",
                  padding: "4px 6px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* ── Content Area (Preview, Source, or Split) ── */}
        <div
          style={{
            height: activeHeight,
            minHeight: "260px",
            display: "flex",
            flexDirection: "row",
            position: "relative",
            overflow: "hidden",
            background: backdropBg,
          }}
        >
          {/* ── 1. SOURCE CODE PANE (Active in "source" or "split") ── */}
          {(viewMode === "source" || viewMode === "split") && (
            <div
              style={{
                flex: viewMode === "split" ? "0 0 50%" : "1 1 100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRight: viewMode === "split" ? `2.5px solid ${tokens.borderPrimary}` : "none",
                background: "#0A0A0A",
                color: "#F0EDE4",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Code Editor Header Rail */}
              <div
                style={{
                  background: "#161920",
                  borderBottom: "1.5px solid rgba(255,255,255,0.1)",
                  padding: "4px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#7E8594",
                }}
              >
                <span style={{ color: "#B8F04A" }}>// HTML & CSS SOURCE</span>
                <span>TAB = 2 SPACES</span>
              </div>

              {/* Editor Textarea with Line Numbers */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Line Numbers Gutter */}
                <div
                  ref={lineNumbersRef}
                  style={{
                    width: "42px",
                    padding: "12px 6px 12px 0",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRight: "1px solid rgba(255, 255, 255, 0.07)",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11.5px",
                    lineHeight: "20px",
                    textAlign: "right",
                    color: "rgba(255, 255, 255, 0.25)",
                    userSelect: "none",
                    overflow: "hidden",
                  }}
                >
                  {Array.from({ length: linesCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={codeTextareaRef}
                  value={rawHtml}
                  readOnly={readOnly}
                  onChange={(e) => handleHtmlChange(e.target.value)}
                  onKeyDown={handleKeyDownInEditor}
                  onScroll={handleEditorScroll}
                  placeholder="<!-- Paste your HTML, CSS in <style>, and elements here -->"
                  spellCheck={false}
                  style={{
                    flex: 1,
                    height: "100%",
                    margin: 0,
                    padding: "12px 14px",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "#F0EDE4",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11.5px",
                    lineHeight: "20px",
                    resize: "none",
                    whiteSpace: "pre",
                    overflowWrap: "normal",
                    overflowX: "auto",
                    overflowY: "auto",
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          )}

          {/* ── 2. PREVIEW PANE (Active in "preview" or "split") ── */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div
              style={{
                flex: viewMode === "split" ? "0 0 50%" : "1 1 100%",
                height: "100%",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                padding: viewport !== "responsive" && viewport !== "desktop" ? "16px 8px" : "0",
                boxSizing: "border-box",
              }}
            >
              {/* Responsive Device Wrapper */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  ...viewportStyles,
                  boxSizing: "border-box",
                  background: "#FFFFFF",
                  boxShadow:
                    viewport !== "responsive" && viewport !== "desktop"
                      ? "0 10px 30px rgba(0,0,0,0.15)"
                      : "none",
                }}
              >
                {/* Mobile / Tablet Bezel Header */}
                {(viewport === "mobile" || viewport === "tablet") && (
                  <div
                    style={{
                      background: "#0A0A0A",
                      padding: "4px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: "#A0A0A0",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "8.5px",
                      fontWeight: 700,
                    }}
                  >
                    <span>{viewport === "mobile" ? "375 × 667" : "768 × 1024"}</span>
                    <div
                      style={{
                        width: "36px",
                        height: "4px",
                        borderRadius: "2px",
                        background: "rgba(255,255,255,0.3)",
                      }}
                    />
                    <span>SIMULATOR</span>
                  </div>
                )}

                {/* Sandboxed iframe */}
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  srcDoc={preparedHtml}
                  title={block.title || "HTML Sandbox Preview"}
                  sandbox="allow-scripts allow-forms allow-popups allow-modals"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                    background: "#FFFFFF",
                    flex: 1,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Status Bar ── */}
        <div
          style={{
            background: isInk ? "#161920" : "#EBE7DC",
            borderTop: `1.5px solid ${tokens.borderPrimary}`,
            padding: "4px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--mono, monospace)",
            fontSize: "9px",
            fontWeight: 700,
            color: tokens.textSecondary,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Terminal size={10} />
              SANDBOX: ISOLATED IFRAME
            </span>
            <span>
              CSS: {metrics.hasCss ? "ACTIVE" : "NONE"} · JS:{" "}
              {metrics.hasScript ? "DETECTED" : "NONE"}
            </span>
          </div>

          <div>
            <span>VIEWPORT: {viewport.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
