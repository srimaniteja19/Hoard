"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  Sliders,
  Wand2,
  Sparkles,
  Download,
  Upload,
  Play,
  X,
  Plus,
  Layers,
  ArrowRight,
  Palette,
  HelpCircle,
  Loader2,
} from "lucide-react";
import {
  PRESET_HTML_TEMPLATES,
  applyStylePreset,
  extractCssVariables,
  updateCssVariable,
  CssVariableToken,
  HtmlTemplate,
} from "@/lib/notebooks/htmlTemplates";

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

interface ConsoleLogEntry {
  id: string;
  level: "log" | "warn" | "error" | "info";
  args: string[];
  time: string;
}

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

  // View state
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

  // Feature 1: CSS Variables Inspector
  const [showTokensShelf, setShowTokensShelf] = useState<boolean>(false);

  // Feature 2: 1-Click Restyle Menu & AI
  const [showRestyleMenu, setShowRestyleMenu] = useState<boolean>(false);
  const [aiRestylePrompt, setAiRestylePrompt] = useState<string>("");
  const [isRestyling, setIsRestyling] = useState<boolean>(false);

  // Feature 3: Retro Console Terminal
  const [showConsoleDrawer, setShowConsoleDrawer] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const [replInput, setReplInput] = useState<string>("");

  // Feature 6: Templates & AI Generator Modal
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);
  const [aiWidgetPrompt, setAiWidgetPrompt] = useState<string>("");
  const [isGeneratingWidget, setIsGeneratingWidget] = useState<boolean>(false);

  // Feature 7: Web Clipper (Import URL) Modal
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importUrlInput, setImportUrlInput] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Menus
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Sync draft when block prop updates
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

  // Listen to iframe communication (Height and Console logs)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;

      if (e.data.type === "hoard-html-sandbox-resize" && e.data.blockId === block.id) {
        if (typeof e.data.height === "number" && e.data.height > 100) {
          setAutoMeasuredHeight(Math.min(Math.max(e.data.height + 32, 280), 2400));
        }
      }

      if (e.data.type === "hoard-console-log" && e.data.blockId === block.id) {
        const newEntry: ConsoleLogEntry = {
          id: "log_" + Math.random().toString(36).slice(2, 9),
          level: e.data.level || "log",
          args: Array.isArray(e.data.args) ? e.data.args : [String(e.data.args)],
          time: e.data.time || new Date().toLocaleTimeString(),
        };
        setConsoleLogs((prev) => [...prev.slice(-100), newEntry]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [block.id]);

  // Scroll console to bottom on new log
  useEffect(() => {
    if (showConsoleDrawer && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs, showConsoleDrawer]);

  // Execute JavaScript REPL in sandbox iframe
  const handleExecuteRepl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replInput.trim()) return;
    const code = replInput.trim();
    setReplInput("");
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "hoard-eval-js",
          blockId: block.id,
          code,
        },
        "*"
      );
    }
  };

  // Feature 1: CSS Variables live extraction
  const cssVariables: CssVariableToken[] = useMemo(() => {
    return extractCssVariables(rawHtml);
  }, [rawHtml]);

  const handleUpdateToken = (varName: string, newValue: string) => {
    const updated = updateCssVariable(rawHtml, varName, newValue);
    handleHtmlChange(updated);
  };

  // Feature 2: 1-Click Preset Restyle
  const handleApplyPreset = (preset: "neubrutalist" | "cyberpunk" | "swiss" | "tailwind") => {
    playSound.pop();
    const updated = applyStylePreset(rawHtml, preset);
    handleHtmlChange(updated);
    setShowRestyleMenu(false);
  };

  // Feature 2: AI Prompt Restyle
  const handleAiRestyle = async () => {
    if (!aiRestylePrompt.trim()) return;
    setIsRestyling(true);
    playSound.click();
    try {
      const res = await fetch("/api/notebooks/restyle-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: rawHtml,
          stylePrompt: aiRestylePrompt.trim(),
        }),
      });
      const data = await res.json();
      if (data.html) {
        handleHtmlChange(data.html);
        playSound.fileIt();
        setShowRestyleMenu(false);
        setAiRestylePrompt("");
      }
    } catch (err) {
      console.error("AI restyle error:", err);
    } finally {
      setIsRestyling(false);
    }
  };

  // Feature 6: Apply Template
  const handleSelectTemplate = (template: HtmlTemplate) => {
    playSound.fileIt();
    handleHtmlChange(template.html);
    if (onUpdateBlock) {
      onUpdateBlock({
        ...block,
        html: template.html,
        title: template.title,
      });
    }
    setTitleDraft(template.title);
    setShowTemplatesModal(false);
  };

  // Feature 6: AI Generate Widget
  const handleAiGenerateWidget = async () => {
    if (!aiWidgetPrompt.trim()) return;
    setIsGeneratingWidget(true);
    playSound.click();
    try {
      const res = await fetch("/api/notebooks/generate-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiWidgetPrompt.trim(),
          topic: block.title,
        }),
      });
      const data = await res.json();
      if (data.html) {
        handleHtmlChange(data.html);
        if (onUpdateBlock && data.title) {
          onUpdateBlock({
            ...block,
            html: data.html,
            title: data.title,
          });
          setTitleDraft(data.title);
        }
        playSound.fileIt();
        setShowTemplatesModal(false);
        setAiWidgetPrompt("");
      }
    } catch (err) {
      console.error("AI generate widget error:", err);
    } finally {
      setIsGeneratingWidget(false);
    }
  };

  // Feature 7: Import URL
  const handleImportUrl = async () => {
    if (!importUrlInput.trim()) return;
    setIsImporting(true);
    setImportError(null);
    playSound.click();
    try {
      const res = await fetch("/api/notebooks/import-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setImportError(data.error || "Failed to fetch webpage");
        return;
      }
      if (data.html) {
        handleHtmlChange(data.html);
        if (onUpdateBlock && data.title) {
          onUpdateBlock({
            ...block,
            html: data.html,
            title: data.title,
          });
          setTitleDraft(data.title);
        }
        playSound.fileIt();
        setShowImportModal(false);
        setImportUrlInput("");
      }
    } catch (err: any) {
      setImportError(err?.message || "Failed to import webpage");
    } finally {
      setIsImporting(false);
    }
  };

  // Compute prepared HTML document with auto-resize and console interceptor
  const preparedHtml = useMemo(() => {
    const trimmed = rawHtml.trim();
    const hasHtmlTag = /<html[\s>]/i.test(trimmed);
    const hasDocType = /<!DOCTYPE\s+html/i.test(trimmed);

    const injectedScript = `
      <script>
        (function() {
          // 1. Height notifier
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

          // 2. Console interceptor
          var origLog = console.log;
          var origWarn = console.warn;
          var origError = console.error;
          var origInfo = console.info;

          function sendLog(level, args) {
            try {
              var serialized = Array.from(args).map(function(item) {
                if (typeof item === 'object') {
                  try { return JSON.stringify(item); } catch(e) { return String(item); }
                }
                return String(item);
              });
              if (window.parent) {
                window.parent.postMessage({
                  type: 'hoard-console-log',
                  blockId: '${block.id}',
                  level: level,
                  args: serialized,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                }, '*');
              }
            } catch(e) {}
          }

          console.log = function() {
            origLog.apply(console, arguments);
            sendLog('log', arguments);
          };
          console.warn = function() {
            origWarn.apply(console, arguments);
            sendLog('warn', arguments);
          };
          console.error = function() {
            origError.apply(console, arguments);
            sendLog('error', arguments);
          };
          console.info = function() {
            origInfo.apply(console, arguments);
            sendLog('info', arguments);
          };

          // 3. REPL execution listener
          window.addEventListener('message', function(ev) {
            if (ev.data && ev.data.type === 'hoard-eval-js' && ev.data.blockId === '${block.id}') {
              try {
                var res = eval(ev.data.code);
                console.log('➜ ' + (typeof res === 'object' ? JSON.stringify(res) : String(res)));
              } catch(err) {
                console.error('Eval Error: ' + err.message);
              }
            }
          });
        })();
      </script>
    `;

    if (hasDocType || hasHtmlTag) {
      if (/<\/body>/i.test(trimmed)) {
        return trimmed.replace(/<\/body>/i, `${injectedScript}</body>`);
      }
      return `${trimmed}\n${injectedScript}`;
    }

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
  ${injectedScript}
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
    if (isFullscreen) return "calc(100vh - 140px)";
    if (heightPreset === "auto") {
      return autoMeasuredHeight ? `${autoMeasuredHeight}px` : "560px";
    }
    return `${heightPreset}px`;
  }, [heightPreset, autoMeasuredHeight, isFullscreen]);

  // Line count
  const linesCount = useMemo(() => {
    return Math.max(rawHtml.split("\n").length, 1);
  }, [rawHtml]);

  // Backdrop
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
          {/* Left: Window Dots, Title Pill, Metrics */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
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

            {/* Editable Title */}
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
                  maxWidth: "220px",
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
                  maxWidth: "240px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                }}
              >
                {titleDraft || "HTML Sandbox"}
              </button>
            )}

            {/* Metrics */}
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

          {/* Right: Feature Toolbars (Tokens, Restyle, Console, Templates, Import) */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {/* Feature 1: CSS Variable Tokens Toggle */}
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setShowTokensShelf(!showTokensShelf);
              }}
              title="Inspect & live-tweak :root CSS variables"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                border: `2px solid ${tokens.borderPrimary}`,
                background: showTokensShelf
                  ? "#FCE94F"
                  : cssVariables.length > 0
                  ? isInk
                    ? "#1E293B"
                    : "#FFF"
                  : isInk
                  ? "#0A0A0A"
                  : "#FFFFFF",
                color: showTokensShelf ? "#0A0A0A" : tokens.textPrimary,
                padding: "3px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sliders size={11} />
              <span>TOKENS{cssVariables.length > 0 ? ` (${cssVariables.length})` : ""}</span>
            </button>

            {/* Feature 2: 1-Click Restyle Menu */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  setShowRestyleMenu(!showRestyleMenu);
                }}
                title="1-Click art direction & CSS restyling"
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  fontWeight: 800,
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: showRestyleMenu ? "#FF2D8A" : isInk ? "#0A0A0A" : "#FFFFFF",
                  color: showRestyleMenu ? "#FFFFFF" : tokens.textPrimary,
                  padding: "3px 7px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Wand2 size={11} />
                <span>RESTYLE</span>
                <ChevronDown size={10} />
              </button>

              {showRestyleMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "4px",
                    background: isInk ? "#161920" : "#FFFFFF",
                    border: "2.5px solid #0A0A0A",
                    boxShadow: "4px 4px 0 #0A0A0A",
                    zIndex: 100,
                    width: "260px",
                    padding: "8px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      opacity: 0.5,
                      padding: "2px 4px 6px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    1-CLICK ART DIRECTION PRESETS
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset("neubrutalist")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      border: "1.5px solid #0A0A0A",
                      background: "#B8F04A",
                      color: "#0A0A0A",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                      marginBottom: "5px",
                    }}
                  >
                    ⚡ HOARD NEUBRUTALIST
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset("cyberpunk")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      border: "1.5px solid #0A0A0A",
                      background: "#0A0E14",
                      color: "#00FF66",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                      marginBottom: "5px",
                    }}
                  >
                    📟 CYBERPUNK TERMINAL
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset("swiss")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      border: "1.5px solid #0A0A0A",
                      background: "#FFFFFF",
                      color: "#0A0A0A",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                      marginBottom: "5px",
                    }}
                  >
                    📰 SWISS EDITORIAL
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset("tailwind")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      border: "1.5px solid #0A0A0A",
                      background: "#38BDF8",
                      color: "#0A0A0A",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                      marginBottom: "8px",
                    }}
                  >
                    🌊 INJECT TAILWIND CDN
                  </button>

                  <div
                    style={{
                      borderTop: "1px dashed rgba(0,0,0,0.15)",
                      paddingTop: "8px",
                      marginTop: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "8.5px",
                        fontWeight: 800,
                        opacity: 0.5,
                        marginBottom: "4px",
                      }}
                    >
                      AI CUSTOM STYLE PROMPT
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Glassmorphic dark with purple neon glow..."
                      value={aiRestylePrompt}
                      onChange={(e) => setAiRestylePrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAiRestyle();
                      }}
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        border: "1.5px solid #0A0A0A",
                        background: "#FFF",
                        color: "#0A0A0A",
                        outline: "none",
                        marginBottom: "6px",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      disabled={isRestyling || !aiRestylePrompt.trim()}
                      onClick={handleAiRestyle}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        border: "1.5px solid #0A0A0A",
                        background: "#FF2D8A",
                        color: "#FFF",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        cursor: isRestyling ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      {isRestyling ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          <span>RESTYLING...</span>
                        </>
                      ) : (
                        <span>APPLY AI RESTYLE</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Feature 3: Retro Console Drawer Toggle */}
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setShowConsoleDrawer(!showConsoleDrawer);
              }}
              title="Toggle Retro CRT JS Console"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                border: `2px solid ${tokens.borderPrimary}`,
                background: showConsoleDrawer
                  ? "#00FF66"
                  : consoleLogs.length > 0
                  ? isInk
                    ? "#1E293B"
                    : "#FFF"
                  : isInk
                  ? "#0A0A0A"
                  : "#FFFFFF",
                color: showConsoleDrawer ? "#0A0A0A" : tokens.textPrimary,
                padding: "3px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Terminal size={11} />
              <span>LOGS{consoleLogs.length > 0 ? ` (${consoleLogs.length})` : ""}</span>
            </button>

            {/* Feature 6: Templates & AI Generators */}
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setShowTemplatesModal(true);
              }}
              title="Choose instant interactive widgets or generate with AI"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                border: `2px solid ${tokens.borderPrimary}`,
                background: isInk ? "#0A0A0A" : "#FFFFFF",
                color: tokens.textPrimary,
                padding: "3px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={11} />
              <span>TEMPLATES</span>
            </button>

            {/* Feature 7: Web Clipper / Import URL */}
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setShowImportModal(true);
              }}
              title="Import public page or CodePen from URL"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                border: `2px solid ${tokens.borderPrimary}`,
                background: isInk ? "#0A0A0A" : "#FFFFFF",
                color: tokens.textPrimary,
                padding: "3px 7px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Upload size={11} />
              <span>IMPORT</span>
            </button>

            {/* Viewport switcher (in Preview or Split) */}
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
                    padding: "3px 5px",
                    cursor: "pointer",
                    display: "inline-flex",
                  }}
                >
                  <Monitor size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewport("tablet")}
                  title="Tablet (768px)"
                  style={{
                    border: "none",
                    background: viewport === "tablet" ? "#FCE94F" : "transparent",
                    color: "#0A0A0A",
                    padding: "3px 5px",
                    cursor: "pointer",
                    display: "inline-flex",
                  }}
                >
                  <Tablet size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewport("mobile")}
                  title="Mobile (375px)"
                  style={{
                    border: "none",
                    background: viewport === "mobile" ? "#FCE94F" : "transparent",
                    color: "#0A0A0A",
                    padding: "3px 5px",
                    cursor: "pointer",
                    display: "inline-flex",
                  }}
                >
                  <Smartphone size={11} />
                </button>
              </div>
            )}

            {/* Reload */}
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
                padding: "3px 6px",
                cursor: "pointer",
                display: "inline-flex",
              }}
            >
              <RotateCw size={11} />
            </button>

            {/* Copy */}
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
                padding: "3px 6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>

            {/* Pop-out */}
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
                padding: "3px 6px",
                cursor: "pointer",
                display: "inline-flex",
              }}
            >
              <ExternalLink size={11} />
            </button>

            {/* Height preset / Backdrop dropdown */}
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
                  padding: "3px 6px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <span>{heightPreset === "auto" ? "AUTO" : `${heightPreset}P`}</span>
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
                    minWidth: "150px",
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
                        padding: "4px 8px",
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

            {/* Fullscreen */}
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
                padding: "3px 6px",
                cursor: "pointer",
                display: "inline-flex",
              }}
            >
              {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>

            {/* Delete */}
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
                  padding: "3px 5px",
                  cursor: "pointer",
                  display: "inline-flex",
                }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* ── Feature 1: Collapsible CSS Variable Tokens Shelf ── */}
        {showTokensShelf && (
          <div
            style={{
              background: isInk ? "#11141A" : "#FFF9E6",
              borderBottom: `2px solid ${tokens.borderPrimary}`,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                color: tokens.textSecondary,
                letterSpacing: "0.08em",
              }}
            >
              <span>🎛️ LIVE CSS :ROOT TOKENS ({cssVariables.length} DETECTED)</span>
              <span style={{ opacity: 0.6 }}>CHANGES WRITE DIRECTLY TO &lt;STYLE&gt;</span>
            </div>

            {cssVariables.length === 0 ? (
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  opacity: 0.6,
                  padding: "6px 0",
                }}
              >
                No :root variables detected. Add <code>:root &#123; --my-color: #ff0055; &#125;</code> in your &lt;style&gt; to tweak tokens live.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  maxHeight: "140px",
                  overflowY: "auto",
                }}
              >
                {cssVariables.map((v) => (
                  <div
                    key={v.name}
                    style={{
                      background: isInk ? "#1A1D24" : "#FFFFFF",
                      border: "1.5px solid #0A0A0A",
                      padding: "6px 10px",
                      borderRadius: "3px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "2px 2px 0 #0A0A0A",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: tokens.textPrimary,
                      }}
                    >
                      {v.name}
                    </span>

                    {v.type === "color" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="color"
                          value={v.value.startsWith("#") ? v.value : "#000000"}
                          onChange={(e) => handleUpdateToken(v.name, e.target.value)}
                          style={{
                            width: "22px",
                            height: "22px",
                            padding: 0,
                            border: "1.5px solid #0A0A0A",
                            cursor: "pointer",
                            background: "transparent",
                          }}
                        />
                        <input
                          type="text"
                          value={v.value}
                          onChange={(e) => handleUpdateToken(v.name, e.target.value)}
                          style={{
                            width: "70px",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "10px",
                            border: "1px solid #CCC",
                            padding: "2px 4px",
                            outline: "none",
                          }}
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={v.value}
                        onChange={(e) => handleUpdateToken(v.name, e.target.value)}
                        style={{
                          width: "80px",
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "10px",
                          border: "1px solid #CCC",
                          padding: "2px 4px",
                          outline: "none",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          {/* ── 1. SOURCE CODE PANE ── */}
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

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
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

          {/* ── 2. PREVIEW PANE ── */}
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

        {/* ── Feature 3: Retro CRT Console Drawer ── */}
        {showConsoleDrawer && (
          <div
            style={{
              height: "160px",
              background: "#080A0F",
              borderTop: `2px solid ${tokens.borderPrimary}`,
              display: "flex",
              flexDirection: "column",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              color: "#00FF66",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.8)",
            }}
          >
            {/* Console Header Rail */}
            <div
              style={{
                background: "#111622",
                borderBottom: "1px solid #222B3D",
                padding: "4px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "9px",
                fontWeight: 700,
                color: "#7E8594",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#00FF66" }}>&gt;_ CRT JAVASCRIPT CONSOLE</span>
                <span>({consoleLogs.length} logs)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setConsoleLogs([])}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#7E8594",
                    cursor: "pointer",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9px",
                  }}
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={() => setShowConsoleDrawer(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#7E8594",
                    cursor: "pointer",
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            </div>

            {/* Logs Window */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                lineHeight: "1.4",
              }}
            >
              {consoleLogs.length === 0 ? (
                <div style={{ opacity: 0.4, fontStyle: "italic" }}>
                  Console ready. Logs from console.log(), console.warn(), or console.error() will appear here.
                </div>
              ) : (
                consoleLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      color:
                        log.level === "error"
                          ? "#FF453A"
                          : log.level === "warn"
                          ? "#FFD60A"
                          : "#00FF66",
                    }}
                  >
                    <span style={{ opacity: 0.4, fontSize: "9px", marginTop: "1px" }}>
                      [{log.time}]
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "9px" }}>
                      {log.level.toUpperCase()}:
                    </span>
                    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {log.args.join(" ")}
                    </span>
                  </div>
                ))
              )}
              <div ref={consoleBottomRef} />
            </div>

            {/* Mini REPL Input */}
            <form
              onSubmit={handleExecuteRepl}
              style={{
                background: "#0D111A",
                borderTop: "1px solid #1E2638",
                padding: "4px 10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ color: "#00FF66", fontWeight: 800 }}>&gt;</span>
              <input
                type="text"
                placeholder="Run JavaScript inside sandbox (e.g. document.title, console.log(42))..."
                value={replInput}
                onChange={(e) => setReplInput(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10.5px",
                  color: "#00FF66",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#00FF66",
                  color: "#0A0A0A",
                  border: "none",
                  padding: "2px 6px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                RUN
              </button>
            </form>
          </div>
        )}

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

      {/* ── Feature 6: Templates & AI Generator Modal ── */}
      {showTemplatesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10,10,10,0.85)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "680px",
              background: isInk ? "#161920" : "#FFFFFF",
              border: "3px solid #0A0A0A",
              boxShadow: "6px 6px 0 #0A0A0A",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #0A0A0A",
                paddingBottom: "10px",
              }}
            >
              <div>
                <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "16px" }}>
                  ✨ Interactive Widget Templates & AI Generator
                </b>
                <p style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", opacity: 0.6, marginTop: "2px" }}>
                  SELECT AN INSTANT ZERO-DEPENDENCY WIDGET OR GENERATE CUSTOM HTML+CSS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* AI Generator Box */}
            <div
              style={{
                background: isInk ? "#0D111A" : "#F4F0EA",
                border: "2px solid #0A0A0A",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: tokens.textPrimary,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={12} color="#FF2D8A" />
                GENERATE CUSTOM WIDGET WITH AI
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="e.g. Interactive customer refund calculator with 3 sliders and instant results..."
                  value={aiWidgetPrompt}
                  onChange={(e) => setAiWidgetPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAiGenerateWidget();
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    border: "2px solid #0A0A0A",
                    background: "#FFF",
                    color: "#0A0A0A",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  disabled={isGeneratingWidget || !aiWidgetPrompt.trim()}
                  onClick={handleAiGenerateWidget}
                  style={{
                    padding: "8px 16px",
                    background: "#B8F04A",
                    border: "2px solid #0A0A0A",
                    boxShadow: "3px 3px 0 #0A0A0A",
                    color: "#0A0A0A",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: isGeneratingWidget ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isGeneratingWidget ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>BUILDING...</span>
                    </>
                  ) : (
                    <span>GENERATE</span>
                  )}
                </button>
              </div>
            </div>

            {/* Presets List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 800,
                  opacity: 0.6,
                  letterSpacing: "0.08em",
                }}
              >
                OR CHOOSE A PRODUCTION PRESET:
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {PRESET_HTML_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    style={{
                      background: isInk ? "#1A1D24" : "#FFFFFF",
                      border: "2px solid #0A0A0A",
                      boxShadow: "3px 3px 0 #0A0A0A",
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translate(-1px, -1px)";
                      e.currentTarget.style.boxShadow = "4px 4px 0 #0A0A0A";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "3px 3px 0 #0A0A0A";
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "12px",
                          fontWeight: 800,
                          color: tokens.textPrimary,
                        }}
                      >
                        {tmpl.title}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "10px",
                          opacity: 0.7,
                          color: tokens.textSecondary,
                          marginTop: "2px",
                        }}
                      >
                        {tmpl.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "6px 12px",
                        background: "#0A0A0A",
                        color: "#B8F04A",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      INSERT
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Feature 7: Web Clipper (Import from URL) Modal ── */}
      {showImportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10,10,10,0.85)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "540px",
              background: isInk ? "#161920" : "#FFFFFF",
              border: "3px solid #0A0A0A",
              boxShadow: "6px 6px 0 #0A0A0A",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid #0A0A0A",
                paddingBottom: "10px",
              }}
            >
              <div>
                <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "16px" }}>
                  📥 Import HTML from Web URL
                </b>
                <p style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", opacity: 0.6, marginTop: "2px" }}>
                  FETCH & EMBED ANY PUBLIC WEBPAGE OR CODEPEN INTO THIS NOTEBOOK BLOCK
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 800,
                  opacity: 0.7,
                }}
              >
                PUBLIC URL TO IMPORT:
              </label>
              <input
                type="url"
                placeholder="https://example.com or raw HTML URL..."
                value={importUrlInput}
                onChange={(e) => setImportUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImportUrl();
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  border: "2px solid #0A0A0A",
                  background: "#FFF",
                  color: "#0A0A0A",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {importError && (
                <div
                  style={{
                    color: "#FF2D8A",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "10px",
                    fontWeight: 700,
                  }}
                >
                  ⚠️ {importError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  border: "2px solid #0A0A0A",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isImporting || !importUrlInput.trim()}
                onClick={handleImportUrl}
                style={{
                  padding: "8px 18px",
                  background: "#B8F04A",
                  border: "2px solid #0A0A0A",
                  boxShadow: "3px 3px 0 #0A0A0A",
                  color: "#0A0A0A",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  cursor: isImporting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isImporting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>FETCHING...</span>
                  </>
                ) : (
                  <span>FETCH & EMBED</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
