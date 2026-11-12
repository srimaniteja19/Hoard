"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { TilType } from "@/db/schema";
import {
  Lightbulb,
  AlertTriangle,
  Code2,
  Layers,
  Quote,
  Flame,
  Link2,
  Newspaper,
  Sparkles,
  CornerDownLeft,
  X,
  Tag,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { parseClipImport, type ClipLink, type ClipTilDraft } from "@/lib/til/clipImport";
import {
  uploadTilImage,
  extractImagesFromClipboard,
  extractImagesFromDragEvent,
  formatTilImages,
} from "@/lib/til/image";

interface TilComposerProps {
  onCommit: (entry: {
    type: TilType;
    body: string;
    code?: string;
    codeLang?: string;
    linkUrl?: string;
    linkDensity?: "inline" | "card" | "quote" | "full";
    imageUrl?: string;
    tags: string[];
    saveToHoardQueue: boolean;
    replacesEntryId?: string;
  }) => Promise<void>;
  onCommitBatch?: (entries: ClipTilDraft[]) => Promise<{ failed: ClipTilDraft[] }>;
}

interface FormConfig {
  ask: string;
  colorVar: string;
  opt: string;
}

const FORMS_CONFIG: Record<TilType, FormConfig> = {
  FACT: {
    ask: "STATE WHAT YOU LEARNED TODAY.",
    colorVar: "var(--cyan)",
    opt: "ONE CRISP FACT OR FINDING. ⌘↵ TO SAVE.",
  },
  GOTCHA: {
    ask: "WHAT BIT YOU TODAY?",
    colorVar: "var(--pink)",
    opt: "SAVE THE WRONG ASSUMPTION AND THE REAL FIX.",
  },
  SNIPPET: {
    ask: "THE CODE, AND WHY IT MATTERS.",
    colorVar: "var(--lime)",
    opt: "LANGUAGE IS DETECTED AUTOMATICALLY. ⌘↵ TO SAVE.",
  },
  PATTERN: {
    ask: "WHAT PATTERN DID YOU NOTICE?",
    colorVar: "var(--violet)",
    opt: "CAPTURE REUSABLE MENTAL MODELS & EXAMPLES.",
  },
  QUOTE: {
    ask: "WHOSE WORDS, AND WHERE FROM.",
    colorVar: "var(--yellow, #FFE94A)",
    opt: "SAVE EXCERPTS WORTH REVISITING LATER.",
  },
  OPINION: {
    ask: "WHAT'S YOUR TAKE?",
    colorVar: "var(--shelf, #E7E2D8)",
    opt: "RECORD YOUR CURRENT VIEW AND REASONING.",
  },
  LINK: {
    ask: "SAVE A USEFUL LINK & WHY IT MATTERS.",
    colorVar: "var(--card, #FFFDF7)",
    opt: "ADD A SHORT NOTE — TAGS ARE GENERATED AUTOMATICALLY.",
  },
  NEWS: {
    ask: "WHAT HAPPENED? NOTES & HIGHLIGHTS.",
    colorVar: "var(--orange, #FF7A00)",
    opt: "ENTER HEADLINE & BULLETED KEY POINTS. ⌘↵ TO SAVE.",
  },
};

const KINDS: {
  key: TilType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  tagline: string;
}[] = [
  { key: "FACT", label: "FACT", icon: Lightbulb, tagline: "Empirical claim or verified knowledge" },
  { key: "GOTCHA", label: "GOTCHA", icon: AlertTriangle, tagline: "Hard-won debugging trap or sharp edge" },
  { key: "SNIPPET", label: "SNIPPET", icon: Code2, tagline: "High-leverage reusable code or query" },
  { key: "PATTERN", label: "PATTERN", icon: Layers, tagline: "Recurring architectural mental model" },
  { key: "QUOTE", label: "QUOTE", icon: Quote, tagline: "Memorable words, verbatim citation" },
  { key: "OPINION", label: "OPINION", icon: Flame, tagline: "Strong conviction tested over time" },
  { key: "LINK", label: "LINK", icon: Link2, tagline: "Primary evidence or foundational source" },
  { key: "NEWS", label: "NEWS", icon: Newspaper, tagline: "Intel dispatch & development notes" },
];

const DEFAULT_TAGS = ["technology", "architecture", "typescript", "perf", "database", "security"];

export const TilComposer: React.FC<TilComposerProps> = ({ onCommit, onCommitBatch }) => {
  const [type, setType] = useState<TilType>("FACT");

  // Fields for FACT
  const [factClaim, setFactClaim] = useState("");
  const [factSource, setFactSource] = useState("");

  // Fields for GOTCHA
  const [gotchaThought, setGotchaThought] = useState("");
  const [gotchaActually, setGotchaActually] = useState("");
  const [gotchaCost, setGotchaCost] = useState("");

  // Fields for SNIPPET
  const [snippetWhy, setSnippetWhy] = useState("");
  const [snippetCode, setSnippetCode] = useState("");
  const [snippetLang, setSnippetLang] = useState("typescript");

  // Fields for PATTERN
  const [patternStatement, setPatternStatement] = useState("");
  const [patternInstance, setPatternInstance] = useState("");

  // Fields for QUOTE
  const [quoteText, setQuoteText] = useState("");
  const [quoteWho, setQuoteWho] = useState("");
  const [quoteSource, setQuoteSource] = useState("");
  const [quoteUrl, setQuoteUrl] = useState("");

  // Fields for OPINION
  const [opinionTake, setOpinionTake] = useState("");
  const [opinionConviction, setOpinionConviction] = useState(4);

  // Fields for LINK
  const [linkUrl, setLinkUrl] = useState("");
  const [linkWhy, setLinkWhy] = useState("");

  // Fields for NEWS
  const [newsHeadline, setNewsHeadline] = useState("");
  const [newsBullets, setNewsBullets] = useState("");
  const [newsSource, setNewsSource] = useState("");
  const [saveToHoardQueue, setSaveToHoardQueue] = useState(false);

  // Global / Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clipBatch, setClipBatch] = useState<ClipLink[] | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    const handleOpenComposer = () => {
      setIsMinimized(false);
      setTimeout(() => {
        activeFieldRef.current?.focus();
      }, 60);
    };
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleOpenComposer();
      }
    };
    window.addEventListener("til:open-composer", handleOpenComposer);
    window.addEventListener("keydown", handleGlobalKey);
    return () => {
      window.removeEventListener("til:open-composer", handleOpenComposer);
      window.removeEventListener("keydown", handleGlobalKey);
    };
  }, []);

  // Derive structured title/content/url across all categories for Gist topic classification
  const draftClassification = useMemo(() => {
    switch (type) {
      case "FACT":
        return {
          title: factClaim.trim(),
          content: "",
          url: factSource.trim().startsWith("http") ? factSource.trim() : "",
        };
      case "GOTCHA":
        return {
          title: gotchaActually.trim() || gotchaThought.trim(),
          content: `${gotchaThought} ${gotchaActually} ${gotchaCost}`.trim(),
          url: "",
        };
      case "SNIPPET":
        return {
          title: snippetWhy.trim(),
          content: snippetCode.trim(),
          url: "",
        };
      case "PATTERN":
        return {
          title: patternStatement.trim(),
          content: patternInstance.trim(),
          url: "",
        };
      case "QUOTE":
        return {
          title: quoteSource.trim() || quoteText.trim(),
          content: `${quoteText} ${quoteWho}`.trim(),
          url: quoteUrl.trim(),
        };
      case "OPINION":
        return {
          title: opinionTake.trim(),
          content: "",
          url: "",
        };
      case "LINK":
        return {
          title: linkWhy.trim(),
          content: "",
          url: linkUrl.trim(),
        };
      case "NEWS":
        return {
          title: newsHeadline.trim(),
          content: newsBullets.trim(),
          url: newsSource.trim().startsWith("http") ? newsSource.trim() : "",
        };
      default:
        return { title: "", content: "", url: "" };
    }
  }, [
    type,
    factClaim,
    factSource,
    gotchaThought,
    gotchaActually,
    gotchaCost,
    snippetWhy,
    snippetCode,
    patternStatement,
    patternInstance,
    quoteText,
    quoteWho,
    quoteSource,
    quoteUrl,
    opinionTake,
    linkWhy,
    linkUrl,
    newsHeadline,
    newsBullets,
    newsSource,
  ]);

  const draftText = useMemo(
    () =>
      [draftClassification.title, draftClassification.content, draftClassification.url]
        .filter(Boolean)
        .join(" ")
        .trim(),
    [draftClassification]
  );

  // Debounced Gist topic tagging as user types
  useEffect(() => {
    if (!draftText || draftText.length < 8) {
      setSuggestedTags([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const res = await fetch("/api/suggest-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            title: draftClassification.title || undefined,
            content: draftClassification.content || undefined,
            url: draftClassification.url || undefined,
            text: draftText,
            topK: 4,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tags)) {
            setSuggestedTags(data.tags);
          }
        }
      } catch (e: unknown) {
        if ((e as { name?: string })?.name !== "AbortError") {
          // Gracefully ignore network errors
        }
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [draftText, draftClassification]);

  // Attached Images (supported across all categories)
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    activeFieldRef.current?.focus();
  }, [type]);

  const handleAddTag = (t: string) => {
    const cleaned = t.trim().toLowerCase().replace(/^#/, "");
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const processImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    try {
      setUploadingImage(true);
      for (const file of files) {
        const asset = await uploadTilImage(file);
        setAttachedImages((prev) => [...prev, asset.url]);
      }
    } catch (err) {
      console.error("Failed to upload image in TIL composer", err);
    } finally {
      setUploadingImage(false);
      setIsDragOver(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // 1. Check for pasted images first across every category
    const images = extractImagesFromClipboard(e);
    if (images.length > 0) {
      e.preventDefault();
      void processImageFiles(images);
      return;
    }

    // 2. Otherwise check for clip batch import
    const text = e.clipboardData.getData("text/plain");
    const parsed = parseClipImport(text);
    if (!parsed) return;
    e.preventDefault();
    setClipBatch(parsed.items);
    setType("LINK");
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const images = extractImagesFromDragEvent(e);
    if (images.length > 0) {
      e.preventDefault();
      void processImageFiles(images);
    } else {
      setIsDragOver(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processImageFiles(Array.from(files));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommit = async () => {
    if (submitting) return;

    let body = "";
    let code: string | undefined = undefined;
    let codeLang: string | undefined = undefined;
    let targetLinkUrl: string | undefined = undefined;

    if (type === "FACT") {
      if (!factClaim.trim()) return;
      body = factClaim.trim();
      if (factSource.trim()) targetLinkUrl = factSource.trim();
    } else if (type === "GOTCHA") {
      if (!gotchaActually.trim()) return;
      body = `I THOUGHT: ${gotchaThought.trim() || "The assumption held true."}\nACTUALLY: ${gotchaActually.trim()}`;
      if (gotchaCost.trim()) {
        body += `\nCOST: ${gotchaCost.trim()}`;
      }
    } else if (type === "SNIPPET") {
      if (!snippetCode.trim()) return;
      body = snippetWhy.trim() || "Code utility snippet";
      code = snippetCode.trim();
      codeLang = snippetLang.trim() || "typescript";
    } else if (type === "PATTERN") {
      if (!patternStatement.trim()) return;
      body = patternStatement.trim();
      if (patternInstance.trim()) {
        body += `\n- ${patternInstance.trim()}`;
      }
    } else if (type === "QUOTE") {
      if (!quoteText.trim()) return;
      body = `"${quoteText.trim()}"`;
      if (quoteWho.trim()) {
        body += ` — ${quoteWho.trim()}`;
        if (quoteSource.trim()) {
          body += `, ${quoteSource.trim()}`;
        }
      } else if (quoteSource.trim()) {
        body += ` — ${quoteSource.trim()}`;
      }
      if (quoteUrl.trim()) {
        targetLinkUrl = quoteUrl.trim();
      }
    } else if (type === "OPINION") {
      if (!opinionTake.trim()) return;
      body = `${opinionTake.trim()} [conviction:${opinionConviction}]`;
    } else if (type === "LINK") {
      if (!linkUrl.trim()) return;
      targetLinkUrl = linkUrl.trim();
      body = linkWhy.trim() || "Evidence reference link";
    } else if (type === "NEWS") {
      if (!newsBullets.trim() && !newsHeadline.trim()) return;
      let compiled = "";
      if (newsHeadline.trim()) {
        compiled = `HEADLINE: ${newsHeadline.trim()}\n\n`;
      }
      compiled += newsBullets.trim();
      if (newsSource.trim()) {
        targetLinkUrl = newsSource.trim().startsWith("http") ? newsSource.trim() : undefined;
        compiled += `\n\nSOURCE: ${newsSource.trim()}`;
      }
      body = compiled;
    }

    try {
      setSubmitting(true);
      await onCommit({
        type,
        body,
        code,
        codeLang,
        linkUrl: targetLinkUrl,
        imageUrl: formatTilImages(attachedImages) || undefined,
        tags,
        saveToHoardQueue,
      });

      // Clear fields
      setAttachedImages([]);
      setFactClaim("");
      setFactSource("");
      setGotchaThought("");
      setGotchaActually("");
      setGotchaCost("");
      setSnippetWhy("");
      setSnippetCode("");
      setPatternStatement("");
      setPatternInstance("");
      setQuoteText("");
      setQuoteWho("");
      setQuoteSource("");
      setQuoteUrl("");
      setOpinionTake("");
      setOpinionConviction(4);
      setLinkUrl("");
      setLinkWhy("");
      setNewsHeadline("");
      setNewsBullets("");
      setNewsSource("");
      setSaveToHoardQueue(false);
      setTags([]);
    } catch (err) {
      console.error("Failed to commit TIL entry", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    }
  };

  const currentConfig = FORMS_CONFIG[type];

  return (
    <div
      id="til-composer"
      className={`comp${isDragOver ? " comp--dragover" : ""}${isMinimized ? " comp--minimized" : ""}`}
      style={{ ["--kc" as string]: currentConfig.colorVar }}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Specimen Dispatch Slab Header */}
      <div
        className="comp__head"
        onClick={() => {
          if (isMinimized) {
            setIsMinimized(false);
            setTimeout(() => activeFieldRef.current?.focus(), 60);
          }
        }}
        style={{ cursor: isMinimized ? "pointer" : "default" }}
      >
        <div className="comp__head-left">
          <span className="comp__head-index">+ LOG TODAY&apos;S TIL</span>
          <span className="comp__head-kind">{type}</span>
          <span className="comp__head-tagline">
            {isMinimized
              ? "Click any category below or press N to record a new insight..."
              : KINDS.find((k) => k.key === type)?.tagline}
          </span>
        </div>
        <div className="comp__head-right">
          <span className="comp__head-shortcut" aria-hidden="true">
            {isMinimized ? "PRESS N" : "⌘⏎ COMMIT"}
          </span>
          <button
            type="button"
            className="comp__minimize-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized((prev) => !prev);
            }}
            aria-expanded={!isMinimized}
          >
            {isMinimized ? "+ OPEN COMPOSER" : "− COLLAPSE"}
          </button>
        </div>
      </div>

      {/* Morphing Kind Selector Bar */}
      <div className="kinds" style={{ ["--kc" as string]: currentConfig.colorVar }}>
        {KINDS.map((k, idx) => {
          const Icon = k.icon;
          const isSelected = type === k.key;
          return (
            <button
              key={k.key}
              type="button"
              data-k={k.key.toLowerCase()}
              aria-pressed={isSelected ? "true" : "false"}
              onClick={() => {
                setType(k.key);
                if (isMinimized) setIsMinimized(false);
              }}
              title={k.tagline}
            >
              <span className="kinds__idx" aria-hidden="true">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <Icon size={12} strokeWidth={2.5} />
              <span>{k.label}</span>
            </button>
          );
        })}
      </div>

      {/* Composer Input Surface */}
      {!isMinimized && (
        <div className="comp__in">
          <div className="comp__ask-row">
            <span className="comp__ask">{currentConfig.ask}</span>
            <span className="comp__ask-tagline">
              {KINDS.find((k) => k.key === type)?.tagline}
            </span>
          </div>

          {/* Dynamic Fields per Type */}
          <div id="fields">
            {type === "FACT" && (
              <>
                <div className="f">
                  <div className="f__label-row">
                    <label>THE CLAIM</label>
                    <span className="f__helper-pill">PRIMARY STATEMENT</span>
                  </div>
                  <div className="f__input-wrap">
                    <textarea
                      ref={activeFieldRef as React.RefObject<HTMLTextAreaElement>}
                      rows={2}
                      value={factClaim}
                      onChange={(e) => setFactClaim(e.target.value)}
                      placeholder="LPCAMM2 replaces both SO-DIMM and soldered RAM."
                    />
                  </div>
                </div>
                <div className="f">
                  <div className="f__label-row">
                    <label>SOURCE (OPTIONAL)</label>
                    <span className="f__helper-pill">EVIDENCE LINK</span>
                  </div>
                  <input
                    type="text"
                    value={factSource}
                    onChange={(e) => setFactSource(e.target.value)}
                    placeholder="paste a link — it attaches as evidence"
                  />
                </div>
              </>
            )}

          {type === "GOTCHA" && (
            <>
              <div className="f">
                <label>I THOUGHT</label>
                <input
                  ref={activeFieldRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={gotchaThought}
                  onChange={(e) => setGotchaThought(e.target.value)}
                  placeholder="the wrong belief, in your own words"
                />
              </div>
              <div className="f">
                <label>ACTUALLY</label>
                <textarea
                  rows={2}
                  value={gotchaActually}
                  onChange={(e) => setGotchaActually(e.target.value)}
                  placeholder="what's true"
                />
              </div>
              <div className="f">
                <label>WHAT IT COST</label>
                <input
                  type="text"
                  value={gotchaCost}
                  onChange={(e) => setGotchaCost(e.target.value)}
                  placeholder="two hours / one outage / a bad PR"
                />
              </div>
            </>
          )}

          {type === "SNIPPET" && (
            <>
              <div className="f">
                <label>WHY IT MATTERS</label>
                <input
                  ref={activeFieldRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={snippetWhy}
                  onChange={(e) => setSnippetWhy(e.target.value)}
                  placeholder="one line — what problem this solves"
                />
              </div>
              <div className="f mono">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>CODE</label>
                  <input
                    type="text"
                    value={snippetLang}
                    onChange={(e) => setSnippetLang(e.target.value)}
                    placeholder="lang (e.g. sql, ts)"
                    style={{ width: "120px", padding: "4px 8px", fontSize: "11px" }}
                  />
                </div>
                <textarea
                  rows={4}
                  value={snippetCode}
                  onChange={(e) => setSnippetCode(e.target.value)}
                  placeholder="CREATE UNIQUE INDEX … NULLS NOT DISTINCT;"
                />
              </div>
            </>
          )}

          {type === "PATTERN" && (
            <>
              <div className="f">
                <label>THE PATTERN</label>
                <input
                  ref={activeFieldRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={patternStatement}
                  onChange={(e) => setPatternStatement(e.target.value)}
                  placeholder="every X I've hit was really a Y"
                />
              </div>
              <div className="f">
                <label>FIRST INSTANCE</label>
                <input
                  type="text"
                  value={patternInstance}
                  onChange={(e) => setPatternInstance(e.target.value)}
                  placeholder="link an earlier entry or date instance"
                />
              </div>
            </>
          )}

          {type === "QUOTE" && (
            <>
              <div className="f">
                <label>THE QUOTE</label>
                <textarea
                  ref={activeFieldRef as React.RefObject<HTMLTextAreaElement>}
                  rows={3}
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="verbatim quote, keep it memorable..."
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="f" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label>WHO SAID IT</label>
                  <input
                    type="text"
                    value={quoteWho}
                    onChange={(e) => setQuoteWho(e.target.value)}
                    placeholder="author (e.g. Dieter Rams)"
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div>
                  <label>WORK / SOURCE (OPTIONAL)</label>
                  <input
                    type="text"
                    value={quoteSource}
                    onChange={(e) => setQuoteSource(e.target.value)}
                    placeholder="book, speech, essay..."
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
              <div className="f">
                <label>SOURCE URL (OPTIONAL)</label>
                <input
                  type="url"
                  value={quoteUrl}
                  onChange={(e) => setQuoteUrl(e.target.value)}
                  placeholder="https://..."
                  onKeyDown={handleKeyDown}
                />
              </div>
            </>
          )}

          {type === "OPINION" && (
            <>
              <div className="f">
                <label>THE TAKE</label>
                <textarea
                  ref={activeFieldRef as React.RefObject<HTMLTextAreaElement>}
                  rows={2}
                  value={opinionTake}
                  onChange={(e) => setOpinionTake(e.target.value)}
                  placeholder="say it plainly, you can retract later"
                />
              </div>
              <div className="f">
                <label>CONVICTION WHEN FILED (1–5)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setOpinionConviction(lvl)}
                      style={{
                        width: "28px",
                        height: "28px",
                        border: "2px solid var(--ink)",
                        background: lvl <= opinionConviction ? "var(--pink)" : "var(--paper)",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontFamily: "var(--mono)",
                        color: lvl <= opinionConviction ? "#FFF" : "var(--ink)",
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === "LINK" && (
            <>
              <div className="f">
                <label>URL</label>
                <input
                  ref={activeFieldRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="f">
                <label>WHY YOU KEPT IT</label>
                <textarea
                  rows={2}
                  value={linkWhy}
                  onChange={(e) => setLinkWhy(e.target.value)}
                  placeholder="not what it says — why it earned a slot"
                />
              </div>
            </>
          )}

          {type === "NEWS" && (
            <>
              <div className="f">
                <label>HEADLINE / TOPIC (OPTIONAL)</label>
                <input
                  ref={activeFieldRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={newsHeadline}
                  onChange={(e) => setNewsHeadline(e.target.value)}
                  placeholder="e.g. Frontline Military Intelligence Assessment"
                />
              </div>
              <div className="f">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label>KEY DEVELOPMENTS / BULLETS (* or -)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = newsBullets.length > 0 && !newsBullets.endsWith("\n") ? "\n* " : "* ";
                      setNewsBullets((prev) => prev + prefix);
                    }}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "var(--paper)",
                      border: "1px solid var(--ink)",
                      padding: "2px 6px",
                      cursor: "pointer",
                      boxShadow: "1px 1px 0 var(--ink)",
                    }}
                  >
                    + ADD BULLET
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={newsBullets}
                  onChange={(e) => setNewsBullets(e.target.value)}
                  placeholder={"* Leaked internal documents indicate low probability of total victory...\n* Ukrainian forces continue to secure minor territorial gains in south...\n* Russia escalates aerial attacks against logistics..."}
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: "13.5px",
                    lineHeight: "1.45",
                  }}
                />
              </div>
              <div className="f">
                <label>SOURCE / PUBLICATION (OPTIONAL)</label>
                <input
                  type="text"
                  value={newsSource}
                  onChange={(e) => setNewsSource(e.target.value)}
                  placeholder="e.g. Reuters / https://reuters.com/... attaches as evidence"
                />
              </div>
            </>
          )}
        </div>

        {/* Save to queue checkbox if link or URL is entered */}
        {(type === "LINK" || (type === "FACT" && factSource) || (type === "NEWS" && newsSource.startsWith("http"))) && (
          <div style={{ margin: "8px 0" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 700, cursor: "pointer", color: "var(--ink)" }}>
              <input
                type="checkbox"
                checked={saveToHoardQueue}
                onChange={(e) => setSaveToHoardQueue(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "var(--ink)" }}
              />
              ALSO SAVE LINK TO HOARD BOOKMARK QUEUE
            </label>
          </div>
        )}

        {/* Image Attachment Bar (In Every Category) */}
        <div className="comp__img-section">
          <div className="comp__img-header">
            <button
              type="button"
              className="comp__img-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              title="Upload image attachment (or paste from clipboard / drag & drop)"
            >
              {uploadingImage ? (
                <Loader2 size={12} className="comp__spin" />
              ) : (
                <ImageIcon size={12} strokeWidth={2.4} />
              )}
              <span>{uploadingImage ? "UPLOADING..." : "+ ATTACH IMAGE"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />
            <span className="comp__img-hint">
              or paste ⌘V / drag &amp; drop image
            </span>
          </div>

          {/* Attached Image Previews Strip */}
          {attachedImages.length > 0 && (
            <div className="comp__img-strip">
              {attachedImages.map((imgUrl, idx) => (
                <div key={idx} className="comp__img-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt={`Attachment ${idx + 1}`} />
                  <button
                    type="button"
                    className="comp__img-thumb-del"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove attached image"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadingImage && (
            <div className="comp__img-uploading">
              <Loader2 size={11} className="comp__spin" />
              <span>COMPRESSING &amp; UPLOADING EXHIBIT...</span>
            </div>
          )}
        </div>

        {/* Tags Section with Quick Suggestions */}
        <div className="comp__tags-section">
          <div className="comp__tags-row">
            <span className="comp__tags-lbl">
              <Tag size={11} strokeWidth={2.2} />
              TAGS:
            </span>
            {tags.map((t) => (
              <span key={t} className="comp__tag-chip">
                #{t}
                <X size={11} className="comp__tag-del" onClick={() => handleRemoveTag(t)} />
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }
              }}
              placeholder={tags.length === 0 ? "+ tag (auto-tagged from title if empty)" : "+ tag"}
              className="comp__tag-input"
            />
          </div>

          {(() => {
            const pool = suggestedTags.length > 0 ? suggestedTags : DEFAULT_TAGS;
            const available = pool.filter((t) => !tags.includes(t));
            if (available.length === 0) return null;

            return (
              <div className="comp__tag-suggestions">
                <span className="comp__tag-sug-lbl">
                  {loadingSuggestions ? "INDEXING…" : suggestedTags.length > 0 ? "GIST TOPICS:" : "SUGGESTIONS:"}
                </span>
                {available.slice(0, 6).map((stag) => (
                  <button
                    key={stag}
                    type="button"
                    onClick={() => handleAddTag(stag)}
                    className="comp__tag-sug-btn"
                  >
                    +{stag}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Composer Footer */}
        <div className="comp__foot">
          <span className="opt">{currentConfig.opt}</span>
          <button
            className="commit"
            type="button"
            onClick={handleCommit}
            disabled={submitting}
          >
            <span>{submitting ? "DISPATCHING..." : "FILE SPECIMEN"}</span>
            <CornerDownLeft size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      )}
    </div>
  );
};
