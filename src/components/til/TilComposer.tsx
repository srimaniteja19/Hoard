"use client";

import React, { useState, useEffect, useRef } from "react";
import { TilType, tilTypeValues } from "@/db/schema";
import { Code, Tag, Link as LinkIcon, X, CornerDownLeft } from "lucide-react";

interface TilComposerProps {
  onCommit: (entry: {
    type: TilType;
    body: string;
    code?: string;
    codeLang?: string;
    linkUrl?: string;
    linkDensity?: "inline" | "card" | "quote" | "full";
    tags: string[];
    saveToHoardQueue: boolean;
  }) => Promise<void>;
}

const TYPE_CONFIG: Record<
  TilType,
  { label: string; bg: string; color: string; placeholder: string; isMono?: boolean }
> = {
  FACT: {
    label: "FACT",
    bg: "#00F0FF",
    color: "#000",
    placeholder: "What did you learn today?",
  },
  GOTCHA: {
    label: "GOTCHA",
    bg: "#FF007A",
    color: "#FFF",
    placeholder: "What broke, and what the actual cause turned out to be.",
  },
  SNIPPET: {
    label: "SNIPPET",
    bg: "#FFE600",
    color: "#000",
    placeholder: "Describe what this snippet does or solves...",
    isMono: true,
  },
  PATTERN: {
    label: "PATTERN",
    bg: "#B6FF3C",
    color: "#000",
    placeholder: "What structural or algorithmic pattern did you recognize?",
  },
  QUOTE: {
    label: "QUOTE",
    bg: "#9D4EDD",
    color: "#FFF",
    placeholder: "Key passage or quote extracted...",
  },
  OPINION: {
    label: "OPINION",
    bg: "#FF9100",
    color: "#000",
    placeholder: "Your synthesis, architectural verdict, or hot take...",
  },
  LINK: {
    label: "LINK",
    bg: "#7209B7",
    color: "#FFF",
    placeholder: "Context or summary of the link...",
  },
};

const CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "css",
  "html",
  "sql",
  "sh",
  "rust",
  "go",
  "json",
];

export const TilComposer: React.FC<TilComposerProps> = ({ onCommit }) => {
  const [type, setType] = useState<TilType>("FACT");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [codeLang, setCodeLang] = useState("typescript");
  const [linkUrl, setLinkUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saveToHoardQueue, setSaveToHoardQueue] = useState(false); // default OFF per spec
  const [submitting, setSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
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

  const [linkDensity, setLinkDensity] = useState<"inline" | "card" | "quote" | "full">("card");

  // Reset or update linkDensity default based on URL type. Adjusting state during
  // render (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // so the user can still manually override the density afterward.
  const [prevLinkUrl, setPrevLinkUrl] = useState(linkUrl);
  if (linkUrl && linkUrl !== prevLinkUrl) {
    setPrevLinkUrl(linkUrl);
    if (linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be") || linkUrl.includes("vimeo.com")) {
      setLinkDensity("full");
    } else if (linkUrl.includes("x.com") || linkUrl.includes("twitter.com")) {
      setLinkDensity("quote");
    } else {
      setLinkDensity("card");
    }
  }

  const handleSubmit = async () => {
    if (!body.trim() && (type !== "SNIPPET" || !code.trim())) return;
    if (submitting) return;

    try {
      setSubmitting(true);
      await onCommit({
        type,
        body: body.trim(),
        code: type === "SNIPPET" ? code.trim() : undefined,
        codeLang: type === "SNIPPET" ? codeLang : undefined,
        linkUrl: linkUrl.trim() || undefined,
        linkDensity,
        tags,
        saveToHoardQueue,
      });

      // Reset form
      setBody("");
      setCode("");
      setLinkUrl("");
      setTags([]);
      setTagInput("");
      setSaveToHoardQueue(false);
    } catch (err) {
      console.error("Composer commit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const activeConfig = TYPE_CONFIG[type];

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "var(--bd)",
        boxShadow: "var(--sh)",
        padding: "16px",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        {/* Type selector chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          {tilTypeValues.map((t) => {
            const cfg = TYPE_CONFIG[t];
            const isSelected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "4px 8px",
                  border: "2px solid var(--ink)",
                  background: isSelected ? cfg.bg : "transparent",
                  color: isSelected ? cfg.color : "var(--ink)",
                  cursor: "pointer",
                  boxShadow: isSelected ? "2px 2px 0 var(--ink)" : "none",
                  transform: isSelected ? "translate(-1px, -1px)" : "none",
                  transition: "all 0.1s ease",
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, color: "var(--ink)" }}>
          ⌘↵ to commit
        </div>
      </div>

      {/* Main Body Textarea */}
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={activeConfig.placeholder}
        rows={type === "SNIPPET" ? 3 : 4}
        style={{
          width: "100%",
          fontFamily: activeConfig.isMono ? "var(--mono)" : "inherit",
          fontSize: "14px",
          background: activeConfig.isMono ? "rgba(0, 0, 0, 0.05)" : "transparent",
          color: "var(--ink)",
          border: "2px solid var(--ink)",
          padding: "10px 12px",
          boxSizing: "border-box",
          resize: "vertical",
          outline: "none",
          marginBottom: "10px",
        }}
      />

      {/* SNIPPET Code Block Field & Language Selector */}
      {type === "SNIPPET" && (
        <div style={{ marginBottom: "12px", background: "#1E1E1E", border: "2px solid var(--ink)", padding: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#FFE600", fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
              <Code size={12} /> CODE SNIPPET
            </span>
            <select
              value={codeLang}
              onChange={(e) => setCodeLang(e.target.value)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 700,
                background: "#000",
                color: "#00F0FF",
                border: "1px solid #00F0FF",
                padding: "2px 6px",
                cursor: "pointer",
              }}
            >
              {CODE_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="// Paste snippet code here..."
            rows={5}
            style={{
              width: "100%",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              background: "#0F0F0F",
              color: "#00F0FF",
              border: "1px solid #333",
              padding: "8px 10px",
              boxSizing: "border-box",
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Link URL Input Field & Density Selector */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, color: "var(--ink)", minWidth: "60px" }}>
          <LinkIcon size={12} /> LINK
        </div>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          style={{
            flex: 1,
            minWidth: "200px",
            fontFamily: "var(--mono)",
            fontSize: "12px",
            background: "transparent",
            color: "var(--ink)",
            border: "1.5px solid var(--ink)",
            padding: "5px 8px",
            outline: "none",
          }}
        />

        {linkUrl.trim() && (
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800 }}>DENSITY:</span>
            {(["inline", "card", "quote", "full"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setLinkDensity(d)}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "9.5px",
                  fontWeight: 900,
                  padding: "2px 5px",
                  border: "1px solid var(--ink)",
                  background: linkDensity === d ? "#00F0FF" : "transparent",
                  color: linkDensity === d ? "#000" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags Input */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, color: "var(--ink)", minWidth: "60px" }}>
          <Tag size={12} /> TAGS
        </div>

        {tags.map((t) => (
          <span
            key={t}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              background: "var(--ink)",
              color: "var(--cream)",
              padding: "2px 6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            #{t}
            <X
              size={10}
              style={{ cursor: "pointer" }}
              onClick={() => handleRemoveTag(t)}
            />
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
          placeholder="Add tag + Enter"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            background: "transparent",
            color: "var(--ink)",
            border: "1.5px solid var(--ink)",
            padding: "3px 6px",
            width: "120px",
            outline: "none",
          }}
        />
      </div>

      {/* Footer Controls: Bookmark Opt-In & Commit Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1.5px solid var(--ink)", paddingTop: "10px", flexWrap: "wrap", gap: "8px" }}>
        <label
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={saveToHoardQueue}
            onChange={(e) => setSaveToHoardQueue(e.target.checked)}
            style={{ cursor: "pointer", accentColor: "var(--accent, #00F0FF)" }}
          />
          also save to HOARD queue (default off)
        </label>

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={submitting || (!body.trim() && (type !== "SNIPPET" || !code.trim()))}
          style={{
            fontFamily: "var(--mono)",
            fontSize: "12px",
            fontWeight: 900,
            background: "var(--yel, #FFE600)",
            color: "#000",
            border: "2px solid var(--ink)",
            padding: "6px 16px",
            cursor: submitting ? "wait" : "pointer",
            boxShadow: "3px 3px 0 var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            opacity: (!body.trim() && (type !== "SNIPPET" || !code.trim())) ? 0.5 : 1,
          }}
        >
          {submitting ? "COMMITTING..." : "COMMIT"} <CornerDownLeft size={13} />
        </button>
      </div>
    </div>
  );
};
