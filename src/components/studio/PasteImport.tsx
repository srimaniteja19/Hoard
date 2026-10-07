"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Clapperboard,
  ClipboardPaste,
  Code,
  Copy,
  Film,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import { estimateSeconds, parseHashtags } from "@/lib/studio/checks";
import {
  matchPiece,
  matchSeries,
  parseSeriesPaste,
  parseStudioPaste,
  PASTE_FIELDS,
  STUDIO_BLOCK_TEMPLATE,
  type PasteField,
  type PastedPiece,
  type PastedSeries,
  type PastedSeriesPart,
} from "@/lib/studio/paste";
import {
  FORMAT_LABEL,
  PILLAR_LABEL,
  STATUS_LABEL,
  STUDIO_FORMATS,
  STUDIO_PILLARS,
  type StudioFormat,
  type StudioPiece,
  type StudioPillar,
  type StudioSeries,
} from "@/lib/studio/types";

export type PasteResult = {
  pasted: PastedPiece;
  fields: PasteField[];
  /** Existing piece to update, or null to create a new one. */
  targetId: string | null;
  /** Create the series when no series with that name exists. */
  createSeries: boolean;
};

export type PasteSeriesResult = {
  seriesTitle: string;
  theme?: string;
  pillar: StudioPillar;
  format: StudioFormat;
  parts: PastedSeriesPart[];
  createPieces: boolean;
  targetSeriesId?: string | null;
};

const LABEL: Record<PasteField, string> = {
  title: "Title",
  seriesTitle: "Series",
  status: "Status",
  format: "Format",
  pillar: "Topic",
  script: "Script",
  caption: "Caption",
  hashtags: "Instagram tags",
  extraHashtags: "TikTok / YouTube tags",
  sources: "Sources",
  notes: "Notes",
  coverUrl: "Cover",
};

const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

type Props = {
  pieces: StudioPiece[];
  series: StudioSeries[];
  /** When opened from a piece, the paste always goes into that piece. */
  lockTarget?: StudioPiece | null;
  onApply: (result: PasteResult) => void;
  onApplySeries?: (result: PasteSeriesResult) => void;
  onClose: () => void;
};

export function PasteImport({
  pieces,
  series,
  lockTarget = null,
  onApply,
  onApplySeries,
  onClose,
}: Props) {
  const [text, setText] = useState("");
  const [off, setOff] = useState<Set<PasteField>>(new Set());
  const [asNew, setAsNew] = useState(false);
  const [createSeries, setCreateSeries] = useState(true);
  const [showFormat, setShowFormat] = useState(false);
  const [clipErr, setClipErr] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  // Series mode states
  const [mode, setMode] = useState<"auto" | "series" | "piece">("auto");
  const [customSeriesTitle, setCustomSeriesTitle] = useState("");
  const [customPillar, setCustomPillar] = useState<StudioPillar>("world");
  const [customFormat, setCustomFormat] = useState<StudioFormat>("reel");
  const [createPieces, setCreatePieces] = useState(true);
  const [targetSeriesId, setTargetSeriesId] = useState<string>("new");

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);  const seriesPasted = useMemo(() => parseSeriesPaste(text), [text]);

  const isSeries = Boolean(
    !lockTarget &&
      seriesPasted &&
      seriesPasted.parts.length >= 2 &&
      (mode === "series" || mode === "auto")
  );

  useEffect(() => {
    if (seriesPasted) {
      setCustomSeriesTitle(seriesPasted.title || "");
      if (seriesPasted.pillar) setCustomPillar(seriesPasted.pillar);
      if (seriesPasted.format) setCustomFormat(seriesPasted.format);
    }
  }, [seriesPasted]);

  const pasted = useMemo(
    () => parseStudioPaste(text, { seriesTitles: series.map((s) => s.title) }),
    [text, series]
  );
  const seriesMatch = matchSeries(series, pasted.seriesTitle);
  const found = lockTarget ?? matchPiece(pieces, seriesMatch, pasted);
  const target = lockTarget ?? (asNew ? null : found);
  const present = PASTE_FIELDS.filter(
    (f) => pasted[f] !== undefined && !(Array.isArray(pasted[f]) && !(pasted[f] as unknown[]).length)
  );
  const fields = present.filter((f) => !off.has(f));

  const toggle = (f: PasteField) =>
    setOff((s) => {
      const n = new Set(s);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });

  const replaces = (f: PasteField): boolean => {
    if (!target) return false;
    if (f === "seriesTitle") return Boolean(target.seriesId) && target.seriesId !== seriesMatch?.id;
    const cur = target[f as keyof StudioPiece];
    if (Array.isArray(cur))
      return cur.some((x) =>
        typeof x === "object" && x && "text" in x ? String((x as { text: string }).text).trim() : true
      );
    return typeof cur === "string" ? cur.trim() !== "" && cur !== pasted[f] : false;
  };

  const summary = (f: PasteField): React.ReactNode => {
    switch (f) {
      case "seriesTitle": {
        const part = pasted.part ? ` · Part ${pasted.part}` : "";
        if (seriesMatch) return `${seriesMatch.title}${part}`;
        return (
          <>
            {pasted.seriesTitle}
            {part}{" "}
            <label className="studio-paste-inline">
              <input
                type="checkbox"
                checked={createSeries}
                onChange={(e) => setCreateSeries(e.target.checked)}
              />{" "}
              create this series
            </label>
          </>
        );
      }
      case "status":
        return STATUS_LABEL[pasted.status!];
      case "format":
        return FORMAT_LABEL[pasted.format!];
      case "pillar":
        return PILLAR_LABEL[pasted.pillar!];
      case "script": {
        const { words, seconds } = estimateSeconds(pasted.script!);
        const cards = pasted.script!.reduce((n, s) => n + (s.cards?.length ?? 0), 0);
        return (
          <>
            {pasted.script!.length} scenes · {words} words · about {Math.round(seconds)}s
            {cards ? ` · ${cards} title cards` : ""}
            <span className="studio-paste-quote">{clip(pasted.script![0].text, 110)}</span>
          </>
        );
      }
      case "caption":
        return <span className="studio-paste-quote">{clip(pasted.caption!, 160)}</span>;
      case "hashtags":
      case "extraHashtags": {
        const tags = parseHashtags(pasted[f]!);
        return (
          <>
            {tags.length} tags
            {f === "hashtags" && tags.length > 5
              ? " (Instagram allows 5; first 5 will be copied)"
              : ""}
            <span className="studio-paste-quote studio-mono">{clip(tags.join(" "), 160)}</span>
          </>
        );
      }
      case "sources":
        return (
          <>
            {pasted.sources!.length} sources
            <span className="studio-paste-quote">
              {clip(pasted.sources!.map((s) => s.title).join(" · "), 160)}
            </span>
          </>
        );
      case "notes":
        return <span className="studio-paste-quote">{clip(pasted.notes!, 140)}</span>;
      default:
        return clip(String(pasted[f]), 140);
    }
  };

  const fromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText(t);
    } catch {
      setClipErr(true);
      box.current?.focus();
    }
  };

  const canApplyPiece =
    fields.length > 0 &&
    (Boolean(target) || Boolean(pasted.title || pasted.script || pasted.caption));

  return (
    <div className="studio-scrim" onClick={onClose}>
      <div
        className="studio-modal studio-paste"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-paste-h"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-modal-head">
          <h2 id="studio-paste-h" className="studio-paste-h">
            {isSeries ? (
              <>
                <Film size={18} aria-hidden="true" />
                <span>Multi-Part Series Detected ({seriesPasted!.parts.length} Episodes)</span>
              </>
            ) : (
              <>
                <ClipboardPaste size={18} aria-hidden="true" />
                <span>{lockTarget ? "Paste Into This Piece" : "Paste Everything (Claude / Block)"}</span>
              </>
            )}
          </h2>
          <button
            type="button"
            className="studio-btn studio-btn-plain studio-btn-sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={14} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>

        <p className="studio-muted studio-small">
          {isSeries
            ? `Detected ${seriesPasted!.parts.length} distinct episodes. We can automatically create the series and all corresponding video pieces with full scripts in one click.`
            : "Paste Claude's entire response or a Studio block below. Script, title cards, caption, hashtags, sources, notes, series, and part are automatically routed into place."}
        </p>

        {seriesPasted && seriesPasted.parts.length >= 2 && !lockTarget ? (
          <div className="studio-paste-mode-bar">
            <button
              type="button"
              className={`studio-paste-mode-btn ${isSeries ? "is-active" : ""}`}
              onClick={() => setMode("series")}
            >
              <Film size={13} aria-hidden="true" />
              <span>Convert to Series ({seriesPasted.parts.length} Parts)</span>
              <span className="studio-badge-pill">Detected</span>
            </button>
            <button
              type="button"
              className={`studio-paste-mode-btn ${!isSeries ? "is-active" : ""}`}
              onClick={() => setMode("piece")}
            >
              <Clapperboard size={13} aria-hidden="true" />
              <span>Import as Single Piece</span>
            </button>
          </div>
        ) : null}

        <div className="studio-paste-grid">
          <div className="studio-paste-in">
            <div className="studio-row">
              <label className="studio-label" htmlFor="studio-paste-box">
                Input Text
              </label>
              <span className="studio-row studio-row-start">
                <button
                  type="button"
                  className="studio-btn studio-btn-plain studio-btn-sm"
                  onClick={() => void fromClipboard()}
                >
                  <Copy size={12} aria-hidden="true" />
                  <span>From clipboard</span>
                </button>
                <button
                  type="button"
                  className="studio-btn studio-btn-quiet studio-btn-sm"
                  aria-expanded={showFormat}
                  onClick={() => setShowFormat((v) => !v)}
                >
                  <Code size={12} aria-hidden="true" />
                  <span>{showFormat ? "Hide format" : "Show template"}</span>
                </button>
              </span>
            </div>

            {clipErr ? (
              <p className="studio-muted studio-small">
                Clipboard access was blocked by the browser. Please press ⌘V or Ctrl+V inside the box.
              </p>
            ) : null}

            {showFormat ? (
              <pre className="studio-paste-format studio-mono">{STUDIO_BLOCK_TEMPLATE}</pre>
            ) : null}

            <textarea
              id="studio-paste-box"
              ref={box}
              className="studio-textarea studio-mono studio-paste-box"
              rows={16}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "Paste your series outline or Claude response:\n\nSeries:\n### 1. Ben 10\nRemember when one watch could...\n---\n### 2. Power Rangers\nIt's morphin time!..."
              }
            />
          </div>

          <div className="studio-paste-out" aria-live="polite">
            {isSeries ? (
              <div className="studio-series-import-panel">
                <span className="studio-label">Series Destination & Configuration</span>

                <div className="studio-field" style={{ marginTop: "8px" }}>
                  <label className="studio-label" htmlFor="studio-series-title-input">
                    Series Title
                  </label>
                  <input
                    id="studio-series-title-input"
                    type="text"
                    className="studio-input"
                    value={customSeriesTitle}
                    onChange={(e) => setCustomSeriesTitle(e.target.value)}
                    placeholder="e.g. Childhood Shows We Miss"
                  />
                </div>

                <div className="studio-row studio-row-start" style={{ gap: "10px", marginTop: "8px" }}>
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label className="studio-label">Topic / Pillar</label>
                    <select
                      className="studio-select"
                      value={customPillar}
                      onChange={(e) => setCustomPillar(e.target.value as StudioPillar)}
                    >
                      {STUDIO_PILLARS.map((p) => (
                        <option key={p} value={p}>
                          {PILLAR_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label className="studio-label">Format</label>
                    <select
                      className="studio-select"
                      value={customFormat}
                      onChange={(e) => setCustomFormat(e.target.value as StudioFormat)}
                    >
                      {STUDIO_FORMATS.map((f) => (
                        <option key={f} value={f}>
                          {FORMAT_LABEL[f]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {series.length > 0 ? (
                  <div className="studio-field" style={{ marginTop: "10px" }}>
                    <label className="studio-label">Destination Series</label>
                    <div className="studio-row studio-row-start" style={{ gap: "16px" }}>
                      <label className="studio-paste-choice">
                        <input
                          type="radio"
                          name="target-series-radio"
                          checked={targetSeriesId === "new"}
                          onChange={() => setTargetSeriesId("new")}
                        />
                        <span>Create new series</span>
                      </label>
                      <label className="studio-paste-choice">
                        <input
                          type="radio"
                          name="target-series-radio"
                          checked={targetSeriesId !== "new"}
                          onChange={() => setTargetSeriesId(series[0]?.id || "new")}
                        />
                        <span>Append to existing series</span>
                      </label>
                    </div>
                    {targetSeriesId !== "new" ? (
                      <select
                        className="studio-select"
                        style={{ marginTop: "6px" }}
                        value={targetSeriesId}
                        onChange={(e) => setTargetSeriesId(e.target.value)}
                      >
                        {series.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({s.parts.length} parts)
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ) : null}

                <div className="studio-field" style={{ marginTop: "10px" }}>
                  <label className="studio-paste-check">
                    <input
                      type="checkbox"
                      checked={createPieces}
                      onChange={(e) => setCreatePieces(e.target.checked)}
                    />
                    <span className="studio-label" style={{ margin: 0 }}>
                      Generate pieces with full scripts for all {seriesPasted!.parts.length} episodes
                    </span>
                  </label>
                </div>

                <div className="studio-paste-episodes-preview">
                  <span className="studio-label">
                    Detected Episodes ({seriesPasted!.parts.length}):
                  </span>
                  <ul className="studio-paste-episodes-list">
                    {seriesPasted!.parts.map((p) => {
                      const wordCount =
                        p.script?.reduce(
                          (acc, s) => acc + (s.text ? s.text.split(/\s+/).length : 0),
                          0
                        ) ?? 0;
                      return (
                        <li key={p.n} className="studio-paste-episode-item">
                          <span className="studio-chip-part">P{p.n}</span>
                          <div className="studio-paste-ep-info">
                            <div className="studio-paste-ep-top">
                              <strong className="studio-paste-ep-title">{p.title}</strong>
                              <span className="studio-muted studio-small">
                                {p.script?.length ?? 0} scenes · ~{wordCount} words
                              </span>
                            </div>
                            {p.hook ? (
                              <div className="studio-paste-quote studio-small">
                                &ldquo;{clip(p.hook, 85)}&rdquo;
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <span className="studio-label">Destination & Detected Fields</span>
                {lockTarget ? (
                  <p className="studio-paste-target">
                    <strong>{lockTarget.title}</strong>
                  </p>
                ) : text.trim() ? (
                  <div className="studio-paste-target">
                    {found ? (
                      <>
                        <label className="studio-paste-choice">
                          <input
                            type="radio"
                            name="studio-paste-target"
                            checked={!asNew}
                            onChange={() => setAsNew(false)}
                          />
                          <span>
                            Update <strong>{found.title}</strong>
                          </span>
                        </label>
                        <label className="studio-paste-choice">
                          <input
                            type="radio"
                            name="studio-paste-target"
                            checked={asNew}
                            onChange={() => setAsNew(true)}
                          />
                          <span>Create a new piece</span>
                        </label>
                      </>
                    ) : (
                      <p>
                        <strong>A new piece will be created</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="studio-muted studio-small">Nothing pasted yet. Paste text on the left.</p>
                )}

                {present.length ? (
                  <ul className="studio-paste-fields">
                    {present.map((f) => (
                      <li key={f} className={off.has(f) ? "is-off" : ""}>
                        <label className="studio-paste-check">
                          <input
                            type="checkbox"
                            checked={!off.has(f)}
                            onChange={() => toggle(f)}
                          />
                          <span className="studio-label">{LABEL[f]}</span>
                          {replaces(f) && !off.has(f) ? (
                            <span className="studio-pill studio-btn-danger studio-btn-sm">
                              replaces
                            </span>
                          ) : null}
                        </label>
                        <div className="studio-paste-val">{summary(f)}</div>
                      </li>
                    ))}
                  </ul>
                ) : text.trim() ? (
                  <p className="studio-muted studio-small">
                    No matching fields found yet. Include section headers like “Script”, “Caption”, “Instagram hashtags” or the Studio block template.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="studio-row studio-gap">
          {isSeries ? (
            <>
              <span className="studio-muted studio-small">
                {seriesPasted!.parts.length} episodes ready to import into{" "}
                <strong>{customSeriesTitle.trim() || "Series"}</strong>
              </span>
              <button
                type="button"
                className="studio-btn"
                disabled={!customSeriesTitle.trim()}
                onClick={() => {
                  if (onApplySeries) {
                    onApplySeries({
                      seriesTitle: customSeriesTitle.trim(),
                      pillar: customPillar,
                      format: customFormat,
                      parts: seriesPasted!.parts,
                      createPieces,
                      targetSeriesId: targetSeriesId === "new" ? null : targetSeriesId,
                    });
                  }
                }}
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>Import Series ({seriesPasted!.parts.length} Parts)</span>
              </button>
            </>
          ) : (
            <>
              <span className="studio-muted studio-small">
                {fields.length ? `${fields.length} of ${present.length} fields selected` : ""}
              </span>
              <button
                type="button"
                className="studio-btn"
                disabled={!canApplyPiece}
                onClick={() =>
                  onApply({
                    pasted,
                    fields,
                    targetId: target?.id ?? null,
                    createSeries,
                  })
                }
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>{target ? "Apply & update piece" : "Create piece"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
