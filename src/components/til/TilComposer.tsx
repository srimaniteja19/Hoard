"use client";

import React, { useState, useEffect, useRef } from "react";
import { TilType, tilTypeValues } from "@/db/schema";
import { Code, Tag, Link as LinkIcon, X, CornerDownLeft } from "lucide-react";
import { parseClipImport, clipLinksToTilDrafts, type ClipLink, type ClipTilDraft } from "@/lib/til/clipImport";

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
    replacesEntryId?: string;
  }) => Promise<void>;
  onCommitBatch?: (entries: ClipTilDraft[]) => Promise<{ failed: ClipTilDraft[] }>;
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

export const TilComposer: React.FC<TilComposerProps> = ({ onCommit, onCommitBatch }) => {
  const [type, setType] = useState<TilType>("FACT");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [codeLang, setCodeLang] = useState("typescript");
  const [linkUrl, setLinkUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saveToHoardQueue, setSaveToHoardQueue] = useState(false); // default OFF per spec
  const [submitting, setSubmitting] = useState(false);
  const [clipBatch, setClipBatch] = useState<ClipLink[] | null>(null);
  const [clipDropped, setClipDropped] = useState(0);
  const [clipError, setClipError] = useState<string | null>(null);

  const composerRef = useRef<HTMLDivElement | null>(null);
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

  const [replacesEntryId, setReplacesEntryId] = useState<string | null>(null);
  const [replacesSearch, setReplacesSearch] = useState("");
  const [candidateEntries, setCandidateEntries] = useState<Array<{ id: string; shortHash: string; body: string | null; tags: string[] }>>([]);
  const [showReplacesPicker, setShowReplacesPicker] = useState(false);

  // Fetch candidate entries for supersession picker (scoped to first tag if available)
  useEffect(() => {
    if (!showReplacesPicker) return;
    let isMounted = true;
    const fetchCandidates = async () => {
      try {
        const tagFilter = tags[0] ? `&tag=${encodeURIComponent(tags[0])}` : "";
        const res = await fetch(`/api/til?limit=15${tagFilter}`, { credentials: "include" });
        if (res.ok && isMounted) {
          const data = await res.json();
          setCandidateEntries(data.items || []);
        }
      } catch (err) {
        console.error("Failed to load supersession candidates", err);
      }
    };
    fetchCandidates();
    return () => { isMounted = false; };
  }, [showReplacesPicker, tags]);

  const clearClipBatch = () => {
    setClipBatch(null);
    setClipDropped(0);
    setClipError(null);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    const parsed = parseClipImport(text);
    if (!parsed) return;
    e.preventDefault();
    setClipBatch(parsed.items);
    setClipDropped(parsed.dropped);
    setClipError(null);
    setType("LINK");
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const removeClipItem = (index: number) => {
    if (!clipBatch) return;
    const next = clipBatch.filter((_, i) => i !== index);
    if (next.length === 0) {
      clearClipBatch();
      return;
    }
    setClipBatch(next);
  };

  const commitSequentially = async (entries: ClipTilDraft[]): Promise<{ failed: ClipTilDraft[] }> => {
    const failed: ClipTilDraft[] = [];
    for (const entry of entries) {
      try {
        await onCommit(entry);
      } catch {
        failed.push(entry);
      }
    }
    return { failed };
  };

  const handleBatchSubmit = async () => {
    if (!clipBatch?.length || submitting) return;

    try {
      setSubmitting(true);
      setClipError(null);
      const drafts = clipLinksToTilDrafts(clipBatch);
      const { failed } = onCommitBatch
        ? await onCommitBatch(drafts)
        : await commitSequentially(drafts);

      if (failed.length === 0) {
        clearClipBatch();
        setBody("");
        setCode("");
        setLinkUrl("");
        setTags([]);
        setTagInput("");
        setSaveToHoardQueue(false);
        setReplacesEntryId(null);
        setShowReplacesPicker(false);
        return;
      }

      setClipBatch(failed.map((entry) => ({ title: entry.body, url: entry.linkUrl })));
      setClipDropped(0);
      setClipError(`${failed.length} failed to save. Review and commit remaining.`);
    } catch (err) {
      console.error("Batch commit failed:", err);
      setClipError("Batch commit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (clipBatch) {
      await handleBatchSubmit();
      return;
    }
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
        replacesEntryId: replacesEntryId || undefined,
      });

      // Reset form
      setBody("");
      setCode("");
      setLinkUrl("");
      setTags([]);
      setTagInput("");
      setSaveToHoardQueue(false);
      setReplacesEntryId(null);
      setShowReplacesPicker(false);
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

  const canCommitSingle = Boolean(body.trim() || (type === "SNIPPET" && code.trim()));
  const canCommit = clipBatch ? clipBatch.length > 0 : canCommitSingle;

  return (
    <div
      ref={composerRef}
      tabIndex={clipBatch ? -1 : undefined}
      onPasteCapture={handlePaste}
      onKeyDown={clipBatch ? handleKeyDown : undefined}
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
                className="til-type-chip"
                onClick={() => {
                  if (!clipBatch) setType(t);
                }}
                disabled={Boolean(clipBatch)}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "4px 8px",
                  border: "2px solid var(--ink)",
                  background: isSelected ? cfg.bg : "transparent",
                  color: isSelected ? cfg.color : "var(--ink)",
                  cursor: clipBatch ? "default" : "pointer",
                  boxShadow: isSelected ? "2px 2px 0 var(--ink)" : "none",
                  transform: isSelected ? "translate(-1px, -1px)" : "none",
                  transition: "all 0.1s ease",
                  opacity: clipBatch && !isSelected ? 0.4 : 1,
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="kbd-hint">⌘↵ to commit</div>
      </div>

      {clipBatch ? (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 900 }}>
              {clipBatch.length} {clipBatch.length === 1 ? "LINK" : "LINKS"} READY
            </span>
            {clipDropped > 0 && (
              <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 700, opacity: 0.75 }}>
                {clipDropped} skipped (missing title or url)
              </span>
            )}
          </div>
          {clipError && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                color: "#FF007A",
                marginBottom: "8px",
              }}
            >
              {clipError}
            </div>
          )}
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              border: "2px solid var(--ink)",
            }}
          >
            {clipBatch.map((item, index) => {
              let host = item.url;
              try {
                host = new URL(item.url).hostname.replace(/^www\./, "");
              } catch {
                // keep raw url
              }
              return (
                <div
                  key={`${item.url}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "7px 8px",
                    borderBottom: index === clipBatch.length - 1 ? "none" : "1px solid var(--ink)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "10.5px",
                        opacity: 0.7,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {host}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="filter-clear-btn"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => removeClipItem(index)}
                    disabled={submitting}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
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
            minWidth: "min(200px, 100%)",
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
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800 }}>DENSITY:</span>
            {(["inline", "card", "quote", "full"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className="til-density-chip"
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
            <button type="button" className="filter-clear-btn" aria-label={`Remove tag ${t}`} onClick={() => handleRemoveTag(t)}>
              <X size={12} />
            </button>
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

      {/* Supersession Picker: "Does this replace an earlier entry?" */}
      <div style={{ marginBottom: "12px" }}>
        {!showReplacesPicker && !replacesEntryId ? (
          <button
            type="button"
            onClick={() => setShowReplacesPicker(true)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              background: "transparent",
              color: "var(--ink)",
              border: "1px dashed var(--ink)",
              padding: "3px 8px",
              cursor: "pointer",
              opacity: 0.8,
            }}
          >
            + REPLACES AN EARLIER ENTRY?
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--ink)", padding: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 900, color: "var(--ink)" }}>
                REPLACES EARLIER ENTRY:
              </span>
              <button
                type="button"
                onClick={() => { setShowReplacesPicker(false); setReplacesEntryId(null); setReplacesSearch(""); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)" }}
              >
                <X size={12} />
              </button>
            </div>

            {replacesEntryId ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 900,
                    background: "#FF007A",
                    color: "#FFF",
                    padding: "2px 8px",
                    border: "1px solid var(--ink)",
                  }}
                >
                  REPLACES #{candidateEntries.find(c => c.id === replacesEntryId)?.shortHash || "ENTRY"}
                </span>
                <button
                  type="button"
                  onClick={() => setReplacesEntryId(null)}
                  style={{ fontFamily: "var(--mono)", fontSize: "10px", background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer" }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <input
                  type="text"
                  value={replacesSearch}
                  onChange={(e) => setReplacesSearch(e.target.value)}
                  placeholder="Filter entries by text or tag..."
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    padding: "3px 6px",
                    border: "1px solid var(--ink)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    outline: "none",
                  }}
                />
                <select
                  onChange={(e) => setReplacesEntryId(e.target.value || null)}
                  defaultValue=""
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    padding: "4px",
                    border: "1px solid var(--ink)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  <option value="">-- Select entry to supersede --</option>
                  {candidateEntries
                    .filter((c) => !replacesSearch || (c.body && c.body.toLowerCase().includes(replacesSearch.toLowerCase())) || c.shortHash.includes(replacesSearch))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.shortHash} — {(c.body || "").slice(0, 60)}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Footer Controls: Bookmark Opt-In & Commit Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1.5px solid var(--ink)", paddingTop: "10px", flexWrap: "wrap", gap: "8px" }}>
        {clipBatch ? (
          <button
            type="button"
            onClick={clearClipBatch}
            disabled={submitting}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              background: "transparent",
              color: "var(--ink)",
              border: "1px dashed var(--ink)",
              padding: "3px 8px",
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            DISMISS
          </button>
        ) : (
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
        )}

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={submitting || !canCommit}
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
            opacity: canCommit ? 1 : 0.5,
          }}
        >
          {submitting
            ? "COMMITTING..."
            : clipBatch
              ? `COMMIT ${clipBatch.length}`
              : "COMMIT"}{" "}
          <CornerDownLeft size={13} />
        </button>
      </div>
    </div>
  );
};
