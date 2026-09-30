"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { estimateSeconds, parseHashtags } from "@/lib/studio/checks";
import { matchPiece, matchSeries, parseStudioPaste, PASTE_FIELDS, STUDIO_BLOCK_TEMPLATE, type PasteField, type PastedPiece } from "@/lib/studio/paste";
import { FORMAT_LABEL, PILLAR_LABEL, STATUS_LABEL, type StudioPiece, type StudioSeries } from "@/lib/studio/types";

export type PasteResult = {
  pasted: PastedPiece;
  fields: PasteField[];
  /** Existing piece to update, or null to create a new one. */
  targetId: string | null;
  /** Create the series when no series with that name exists. */
  createSeries: boolean;
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
  onClose: () => void;
};

export function PasteImport({ pieces, series, lockTarget = null, onApply, onClose }: Props) {
  const [text, setText] = useState("");
  const [off, setOff] = useState<Set<PasteField>>(new Set());
  const [asNew, setAsNew] = useState(false);
  const [createSeries, setCreateSeries] = useState(true);
  const [showFormat, setShowFormat] = useState(false);
  const [clipErr, setClipErr] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pasted = useMemo(() => parseStudioPaste(text, { seriesTitles: series.map((s) => s.title) }), [text, series]);
  const seriesMatch = matchSeries(series, pasted.seriesTitle);
  const found = lockTarget ?? matchPiece(pieces, seriesMatch, pasted);
  const target = lockTarget ?? (asNew ? null : found);
  const present = PASTE_FIELDS.filter((f) => pasted[f] !== undefined && !(Array.isArray(pasted[f]) && !(pasted[f] as unknown[]).length));
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
    if (Array.isArray(cur)) return cur.some((x) => (typeof x === "object" && x && "text" in x ? String((x as { text: string }).text).trim() : true));
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
              <input type="checkbox" checked={createSeries} onChange={(e) => setCreateSeries(e.target.checked)} /> create this series
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
            {pasted.script!.length} scenes · {words} words · about {Math.round(seconds)}s{cards ? ` · ${cards} title cards` : ""}
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
            {tags.length} tags{f === "hashtags" && tags.length > 5 ? " (Instagram allows 5; the first 5 are copied)" : ""}
            <span className="studio-paste-quote studio-mono">{clip(tags.join(" "), 160)}</span>
          </>
        );
      }
      case "sources":
        return (
          <>
            {pasted.sources!.length} sources
            <span className="studio-paste-quote">{clip(pasted.sources!.map((s) => s.title).join(" · "), 160)}</span>
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

  const canApply = fields.length > 0 && (Boolean(target) || Boolean(pasted.title || pasted.script || pasted.caption));

  return (
    <div className="studio-scrim" onClick={onClose}>
      <div className="studio-modal studio-paste" role="dialog" aria-modal="true" aria-labelledby="studio-paste-h" onClick={(e) => e.stopPropagation()}>
        <div className="studio-row">
          <h2 id="studio-paste-h" className="studio-paste-h">
            {lockTarget ? "Paste into this piece" : "Paste everything"}
          </h2>
          <button type="button" className="studio-btn studio-btn-plain studio-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="studio-muted studio-small">
          Paste Claude&apos;s whole reply or a Studio block. Script, title cards, caption, both hashtag sets, sources, notes, series and part are sorted into place.
        </p>

        <div className="studio-paste-grid">
          <div className="studio-paste-in">
            <div className="studio-row">
              <label className="studio-label" htmlFor="studio-paste-box">
                Paste here
              </label>
              <span className="studio-row studio-row-start">
                <button type="button" className="studio-btn studio-btn-plain studio-btn-sm" onClick={() => void fromClipboard()}>
                  From clipboard
                </button>
                <button type="button" className="studio-btn studio-btn-quiet studio-btn-sm" aria-expanded={showFormat} onClick={() => setShowFormat((v) => !v)}>
                  {showFormat ? "Hide format" : "Format"}
                </button>
              </span>
            </div>
            {clipErr ? <p className="studio-muted studio-small">The browser blocked clipboard access. Press Ctrl+V or ⌘V in the box.</p> : null}
            {showFormat ? <pre className="studio-paste-format studio-mono">{STUDIO_BLOCK_TEMPLATE}</pre> : null}
            <textarea
              id="studio-paste-box"
              ref={box}
              className="studio-textarea studio-mono studio-paste-box"
              rows={16}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"=== STUDIO ===\nTitle: …\nSeries: …\nPart: …\n\n## Script\n…"}
            />
          </div>

          <div className="studio-paste-out" aria-live="polite">
            <span className="studio-label">Goes to</span>
            {lockTarget ? (
              <p className="studio-paste-target">
                <strong>{lockTarget.title}</strong>
              </p>
            ) : text.trim() ? (
              <div className="studio-paste-target">
                {found ? (
                  <>
                    <label className="studio-paste-choice">
                      <input type="radio" name="studio-paste-target" checked={!asNew} onChange={() => setAsNew(false)} />
                      <span>
                        Update <strong>{found.title}</strong>
                      </span>
                    </label>
                    <label className="studio-paste-choice">
                      <input type="radio" name="studio-paste-target" checked={asNew} onChange={() => setAsNew(true)} />
                      <span>Create a new piece</span>
                    </label>
                  </>
                ) : (
                  <p>
                    <strong>A new piece</strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="studio-muted">Nothing pasted yet.</p>
            )}

            {present.length ? (
              <ul className="studio-paste-fields">
                {present.map((f) => (
                  <li key={f} className={off.has(f) ? "is-off" : ""}>
                    <label className="studio-paste-check">
                      <input type="checkbox" checked={!off.has(f)} onChange={() => toggle(f)} />
                      <span className="studio-label">{LABEL[f]}</span>
                      {replaces(f) && !off.has(f) ? <span className="studio-pill">replaces</span> : null}
                    </label>
                    <div className="studio-paste-val">{summary(f)}</div>
                  </li>
                ))}
              </ul>
            ) : text.trim() ? (
              <p className="studio-muted">Couldn&apos;t find any fields. Use headings like “Script”, “Caption”, “Instagram hashtags” and “Sources”, or the Studio block format.</p>
            ) : null}
          </div>
        </div>

        <div className="studio-row">
          <span className="studio-muted studio-small">
            {fields.length ? `${fields.length} of ${present.length} fields selected` : ""}
          </span>
          <button
            type="button"
            className="studio-btn"
            disabled={!canApply}
            onClick={() => onApply({ pasted, fields, targetId: target?.id ?? null, createSeries })}
          >
            {target ? "Update piece" : "Create piece"}
          </button>
        </div>
      </div>
    </div>
  );
}
