"use client";

import React, { useState, useEffect, useRef } from "react";
import { TilType } from "@/db/schema";
import { X } from "lucide-react";
import { parseClipImport, type ClipLink, type ClipTilDraft } from "@/lib/til/clipImport";

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

interface FormConfig {
  ask: string;
  colorVar: string;
  opt: string;
}

const FORMS_CONFIG: Record<TilType, FormConfig> = {
  FACT: {
    ask: "STATE WHAT'S TRUE. ONE SENTENCE.",
    colorVar: "var(--cyan)",
    opt: "IT WILL BE TESTED BACK TO YOU IN 3 DAYS.",
  },
  GOTCHA: {
    ask: "WHAT BIT YOU?",
    colorVar: "var(--pink)",
    opt: "GOTCHAS ARE TESTED TWICE AS OFTEN. THEY'RE THE ONES THAT STICK.",
  },
  SNIPPET: {
    ask: "THE CODE, AND WHY IT MATTERS.",
    colorVar: "var(--lime)",
    opt: "LANGUAGE IS DETECTED. ⌘↵ TO COMMIT.",
  },
  PATTERN: {
    ask: "WHAT KEEPS HAPPENING?",
    colorVar: "var(--violet)",
    opt: "A PATTERN WITH 3+ INSTANCES CAN BE PROMOTED TO AN ATLAS.",
  },
  QUOTE: {
    ask: "WHOSE WORDS, AND WHOSE MOUTH.",
    colorVar: "var(--yellow, #FFE94A)",
    opt: "QUOTES AREN'T TESTED — THEY'RE FOR RE-READING.",
  },
  OPINION: {
    ask: "WHAT'S YOUR TAKE?",
    colorVar: "var(--shelf, #E7E2D8)",
    opt: "YOU'LL BE ASKED IF YOU STILL BELIEVE THIS IN 60 DAYS.",
  },
  LINK: {
    ask: "WHY IS THIS WORTH KEEPING?",
    colorVar: "var(--card, #FFFDF7)",
    opt: "WITHOUT A REASON THIS IS A BOOKMARK, NOT A TIL.",
  },
  NEWS: {
    ask: "WHAT HAPPENED? INTEL & NEWS DISPATCH.",
    colorVar: "var(--orange, #FF7A00)",
    opt: "ENTER HEADLINE & BULLETED DEVELOPMENTS. ⌘↵ TO COMMIT.",
  },
};

const KINDS: { key: TilType; label: string }[] = [
  { key: "FACT", label: "FACT" },
  { key: "GOTCHA", label: "GOTCHA" },
  { key: "SNIPPET", label: "SNIPPET" },
  { key: "PATTERN", label: "PATTERN" },
  { key: "QUOTE", label: "QUOTE" },
  { key: "OPINION", label: "OPINION" },
  { key: "LINK", label: "LINK" },
  { key: "NEWS", label: "NEWS" },
];

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
  const [submitting, setSubmitting] = useState(false);
  const [clipBatch, setClipBatch] = useState<ClipLink[] | null>(null);

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

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    const parsed = parseClipImport(text);
    if (!parsed) return;
    e.preventDefault();
    setClipBatch(parsed.items);
    setType("LINK");
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
        tags,
        saveToHoardQueue,
      });

      // Clear fields
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
    <div className="comp" onPaste={handlePaste} onKeyDown={handleKeyDown}>
      {/* Morphing Kind Selector Bar */}
      <div className="kinds" style={{ ["--kc" as string]: currentConfig.colorVar }}>
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            data-k={k.key.toLowerCase()}
            aria-pressed={type === k.key ? "true" : "false"}
            onClick={() => setType(k.key)}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Composer Input Surface */}
      <div className="comp__in">
        <div className="comp__ask">{currentConfig.ask}</div>

        {/* Dynamic Fields per Type */}
        <div id="fields">
          {type === "FACT" && (
            <>
              <div className="f">
                <label>THE CLAIM</label>
                <textarea
                  ref={activeFieldRef as React.RefObject<HTMLTextAreaElement>}
                  rows={2}
                  value={factClaim}
                  onChange={(e) => setFactClaim(e.target.value)}
                  placeholder="LPCAMM2 replaces both SO-DIMM and soldered RAM."
                />
              </div>
              <div className="f">
                <label>SOURCE (OPTIONAL)</label>
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
                  rows={2}
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="keep it short enough to remember"
                />
              </div>
              <div className="f">
                <label>WHO SAID IT</label>
                <input
                  type="text"
                  value={quoteWho}
                  onChange={(e) => setQuoteWho(e.target.value)}
                  placeholder="name · where · when"
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

        {/* Tags Row */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", margin: "10px 0" }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10.5px",
                fontWeight: 700,
                background: "var(--ink)",
                color: "var(--yellow, #FFE94A)",
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              #{t}
              <X size={11} style={{ cursor: "pointer" }} onClick={() => handleRemoveTag(t)} />
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
            placeholder="+ tag"
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              background: "transparent",
              color: "var(--ink)",
              border: "1.5px solid var(--ink)",
              padding: "3px 7px",
              width: "80px",
            }}
          />
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
            {submitting ? "COMMITTING..." : "COMMIT ↵"}
          </button>
        </div>
      </div>
    </div>
  );
};
