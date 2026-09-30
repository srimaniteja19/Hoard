"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  Clapperboard,
  ClipboardPaste,
  Compass,
  ExternalLink,
  FileCode,
  FileText,
  Link,
  Mic,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import {
  bufferText,
  captionChecks,
  estimateSeconds,
  longText,
  parseHashtags,
  productionBrief,
  scriptChecks,
  voiceScript,
} from "@/lib/studio/checks";
import { toStudioBlock } from "@/lib/studio/paste";
import {
  FORMAT_LABEL,
  PILLAR_LABEL,
  STATUS_LABEL,
  STUDIO_FORMATS,
  STUDIO_PILLARS,
  STUDIO_STATUSES,
  type StudioPiece,
  type StudioSeries,
} from "@/lib/studio/types";
import { CheckList, Confirm, FormatBadge, PillarBadge, StatusBadge } from "./StudioShared";

type Props = {
  piece: StudioPiece;
  series: StudioSeries[];
  onChange: (patch: Partial<StudioPiece>, debounce?: boolean) => void;
  onSeries: (seriesId: string | null) => void;
  onPaste: () => void;
  onPartPosition: (to: number) => void;
  onDelete: () => void;
  onBack: () => void;
  copy: (text: string, label: string) => void;
};

export function PieceEditor({
  piece,
  series,
  onChange,
  onSeries,
  onPaste,
  onPartPosition,
  onDelete,
  onBack,
  copy,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [src, setSrc] = useState({ title: "", url: "" });
  const current = piece.seriesId ? series.find((s) => s.id === piece.seriesId) ?? null : null;
  const scenes = piece.script.length ? piece.script : [{ text: "" }];

  const setScene = (i: number, text: string) => {
    const next = scenes.map((s, j) => (j === i ? { ...s, text } : s));
    onChange({ script: next }, true);
  };

  const { words: totalWords, seconds: totalSeconds } = useMemo(
    () => estimateSeconds(piece.script),
    [piece.script]
  );

  const captionLength = piece.caption ? piece.caption.length : 0;
  const captionMax = 2200;
  const captionPct = Math.min(100, Math.round((captionLength / captionMax) * 100));

  const instaTags = useMemo(() => parseHashtags(piece.hashtags), [piece.hashtags]);
  const extraTags = useMemo(() => parseHashtags(piece.extraHashtags), [piece.extraHashtags]);

  return (
    <article className="studio-editor">
      {/* Top Director Action Bar */}
      <div className="studio-ed-bar">
        <button type="button" className="studio-btn studio-btn-plain" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Pieces</span>
        </button>

        <div className="studio-breadcrumb">
          {current ? (
            <>
              <span>{current.title}</span>
              <span className="studio-breadcrumb-sep">/</span>
              <span>Part {piece.part ?? 1}</span>
            </>
          ) : (
            <span>Standalone Content</span>
          )}
        </div>

        <div className="studio-row studio-row-start">
          <button
            type="button"
            className="studio-btn studio-btn-plain"
            onClick={() => copy(toStudioBlock(piece, current?.title), "Studio block")}
            title="Export as copy-pasteable Studio block"
          >
            <Share2 size={13} aria-hidden="true" />
            <span>Copy as block</span>
          </button>
          <button
            type="button"
            className="studio-btn"
            onClick={onPaste}
            title="Paste text from Claude into this piece"
          >
            <ClipboardPaste size={14} aria-hidden="true" />
            <span>Paste into piece</span>
          </button>
        </div>
      </div>

      {/* Hero Production Card */}
      <header className="studio-ed-hero">
        <div className="studio-cover-frame">
          {piece.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={piece.coverUrl} alt="Cover" />
          ) : (
            <div className="studio-cover-placeholder">
              <Clapperboard size={26} aria-hidden="true" />
              <span className="studio-mono studio-small">NO COVER</span>
            </div>
          )}
          <span className="studio-cover-badge">9:16</span>
        </div>

        <div className="studio-ed-main">
          <div className="studio-row">
            <StatusBadge status={piece.status} />
            <FormatBadge format={piece.format} />
            <PillarBadge pillar={piece.pillar} />
          </div>

          <label className="studio-sr" htmlFor="studio-title">
            Title
          </label>
          <input
            id="studio-title"
            className="studio-title-input"
            placeholder="Piece title…"
            value={piece.title}
            onChange={(e) => onChange({ title: e.target.value }, true)}
            onBlur={(e) => !e.target.value.trim() && onChange({ title: "Untitled piece" })}
          />

          <div className="studio-meta-grid">
            <Select
              label="Status"
              value={piece.status}
              onChange={(v) => onChange({ status: v as StudioPiece["status"] })}
            >
              {STUDIO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>

            <Select
              label="Format"
              value={piece.format}
              onChange={(v) => onChange({ format: v as StudioPiece["format"] })}
            >
              {STUDIO_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </option>
              ))}
            </Select>

            <Select
              label="Topic"
              value={piece.pillar}
              onChange={(v) => onChange({ pillar: v as StudioPiece["pillar"] })}
            >
              {STUDIO_PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </Select>

            <Select
              label="Series"
              value={piece.seriesId ?? ""}
              onChange={(v) => onSeries(v || null)}
            >
              <option value="">No series</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>

            {current ? (
              <Select
                label="Part"
                value={String(piece.part ?? 1)}
                onChange={(v) => onPartPosition(Number(v))}
              >
                {Array.from(
                  { length: Math.max(current.parts.length, piece.part ?? 1) },
                  (_, i) => i + 1
                ).map((n) => (
                  <option key={n} value={n}>
                    Part {n}
                  </option>
                ))}
              </Select>
            ) : null}

            <div className="studio-cover-url-input">
              <Link size={13} className="studio-muted" aria-hidden="true" />
              <input
                placeholder="Cover image URL (optional)"
                value={piece.coverUrl ?? ""}
                onChange={(e) => onChange({ coverUrl: e.target.value.trim() || null }, true)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Script Deck (Director Scenes) */}
      <section className="studio-sec" aria-labelledby="studio-script-h">
        <div className="studio-sec-h">
          <div className="studio-sec-title-wrap">
            <Clapperboard size={18} aria-hidden="true" />
            <h2 id="studio-script-h">Director Script</h2>
          </div>
          <div className="studio-sec-stats">
            <span className="studio-muted">
              {scenes.length} scenes · {totalWords} words · ~{Math.round(totalSeconds)}s
            </span>
            <div className="studio-row">
              <button
                type="button"
                className="studio-btn studio-btn-plain studio-btn-sm"
                onClick={() => copy(voiceScript(piece.script), "Voice script")}
                title="Generates voiceover script formatted for ElevenLabs with pauses"
              >
                <Mic size={13} aria-hidden="true" />
                <span>Copy voice script</span>
              </button>
              <button
                type="button"
                className="studio-btn studio-btn-plain studio-btn-sm"
                onClick={() => copy(productionBrief(piece, current), "Brief")}
                title="Builds a production brief with script, house rules, and theme for Claude"
              >
                <Sparkles size={13} aria-hidden="true" />
                <span>Copy brief</span>
              </button>
            </div>
          </div>
        </div>

        <div className="studio-scene-deck">
          {scenes.map((s, i) => {
            const words = (s.text || "").split(/\s+/).filter(Boolean).length;
            const sec = Math.round((words / 165) * 60);

            // Extract title cards if written like [cards: ...]
            const cardsMatch = s.text?.match(/\[cards:\s*([^\]]+)\]/i);
            const inlineCards = cardsMatch ? cardsMatch[1].split("/").map((c) => c.trim()) : [];
            const allCards = [...(s.cards ?? []), ...inlineCards].filter(Boolean);

            return (
              <div className="studio-scene-card" key={i}>
                <div className="studio-scene-head">
                  <div className="studio-scene-id">
                    <span>Scene {String(i + 1).padStart(2, "0")}</span>
                    <span className="studio-scene-meta">
                      · {words}w · ~{sec}s
                    </span>
                  </div>
                  {scenes.length > 1 ? (
                    <button
                      type="button"
                      className="studio-btn studio-btn-quiet studio-btn-sm"
                      onClick={() => onChange({ script: scenes.filter((_, j) => j !== i) })}
                      aria-label={`Remove scene ${i + 1}`}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>

                <textarea
                  id={`studio-scene-${i}`}
                  className="studio-textarea studio-scene-text studio-mono"
                  rows={Math.max(2, Math.ceil((s.text || "").length / 90) + 1)}
                  placeholder={`Scene ${i + 1} narration or hook…`}
                  value={s.text}
                  onChange={(e) => setScene(i, e.target.value)}
                />

                {allCards.length ? (
                  <div className="studio-title-card-chips">
                    <span className="studio-label" style={{ fontSize: "10px" }}>
                      Title Cards:
                    </span>
                    {allCards.map((c, ci) => (
                      <span className="studio-card-chip" key={ci}>
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="studio-row studio-gap">
          <button
            type="button"
            className="studio-btn studio-btn-plain"
            onClick={() => onChange({ script: [...scenes, { text: "", cards: [] }] })}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add scene</span>
          </button>
        </div>

        <CheckList checks={scriptChecks(piece)} />
      </section>

      {/* Caption & Social Platform Suite */}
      <section className="studio-sec" aria-labelledby="studio-caption-h">
        <div className="studio-sec-h">
          <div className="studio-sec-title-wrap">
            <Share2 size={18} aria-hidden="true" />
            <h2 id="studio-caption-h">Caption & Social Platform Exports</h2>
          </div>
          <div className="studio-row studio-row-start">
            <button
              type="button"
              className="studio-btn"
              onClick={() => copy(bufferText(piece), "Instagram caption")}
              title="Caption + first 5 hashtags ready for Buffer"
            >
              <Camera size={14} aria-hidden="true" />
              <span>Copy for Instagram</span>
            </button>
            <button
              type="button"
              className="studio-btn studio-btn-plain"
              onClick={() => copy(longText(piece), "TikTok / YouTube caption")}
              title="Caption + full TikTok/YouTube hashtag set"
            >
              <Tv size={14} aria-hidden="true" />
              <span>Copy for TikTok / YouTube</span>
            </button>
          </div>
        </div>

        <label className="studio-sr" htmlFor="studio-caption">
          Caption
        </label>
        <textarea
          id="studio-caption"
          className="studio-textarea"
          rows={7}
          placeholder="Write your post caption here…"
          value={piece.caption}
          onChange={(e) => onChange({ caption: e.target.value }, true)}
        />

        <div className="studio-caption-meter">
          <span>
            {captionLength.toLocaleString()} / {captionMax.toLocaleString()} characters
          </span>
          <div className="studio-meter-bar">
            <div
              className={`studio-meter-fill ${
                captionLength > 2200 ? "is-danger" : captionLength > 1900 ? "is-warning" : ""
              }`}
              style={{ width: `${captionPct}%` }}
            />
          </div>
        </div>

        <div className="studio-gap">
          <label className="studio-label" htmlFor="studio-tags">
            Instagram Hashtags (Target: 5)
          </label>
          <input
            id="studio-tags"
            className="studio-input studio-mono"
            placeholder="#predictionmarkets #finance #economics #investing #oddlyinteresting"
            value={piece.hashtags}
            onChange={(e) => onChange({ hashtags: e.target.value }, true)}
          />
          {instaTags.length ? (
            <div className="studio-tags-preview">
              {instaTags.map((t, idx) => (
                <span className="studio-tag-chip" key={idx}>
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="studio-gap">
          <label className="studio-label" htmlFor="studio-tags-long">
            TikTok & YouTube Hashtags ({extraTags.length} tags)
          </label>
          <input
            id="studio-tags-long"
            className="studio-input studio-mono"
            placeholder="The extended hashtag set for TikTok, YouTube Shorts, and YouTube"
            value={piece.extraHashtags}
            onChange={(e) => onChange({ extraHashtags: e.target.value }, true)}
          />
          {extraTags.length ? (
            <div className="studio-tags-preview">
              {extraTags.map((t, idx) => (
                <span className="studio-tag-chip" key={idx}>
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <CheckList checks={captionChecks(piece)} />
      </section>

      {/* Sources & Research Hub */}
      <section className="studio-sec" aria-labelledby="studio-sources-h">
        <div className="studio-sec-h">
          <div className="studio-sec-title-wrap">
            <Compass size={18} aria-hidden="true" />
            <h2 id="studio-sources-h">Sources & Research</h2>
          </div>
          <span className="studio-muted studio-small">
            {piece.sources.length} {piece.sources.length === 1 ? "source" : "sources"}
          </span>
        </div>

        {piece.sources.length ? (
          <ul className="studio-sources">
            {piece.sources.map((s, i) => (
              <li className="studio-source-item" key={`${s.title}-${i}`}>
                <div className="studio-source-info">
                  <span className="studio-source-title">{s.title || s.url}</span>
                  {s.url ? (
                    <a
                      className="studio-source-link"
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>{s.url}</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="studio-btn studio-btn-quiet studio-btn-sm"
                  onClick={() => onChange({ sources: piece.sources.filter((_, j) => j !== i) })}
                  aria-label={`Remove source: ${s.title}`}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="studio-muted studio-small">No research links or sources recorded yet.</p>
        )}

        <form
          className="studio-src-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!src.title.trim()) return;
            onChange({
              sources: [...piece.sources, { title: src.title.trim(), url: src.url.trim() || undefined }],
            });
            setSrc({ title: "", url: "" });
          }}
        >
          <label className="studio-sr" htmlFor="studio-src-title">
            Source title
          </label>
          <input
            id="studio-src-title"
            className="studio-input"
            placeholder="Source title or article name…"
            value={src.title}
            onChange={(e) => setSrc({ ...src, title: e.target.value })}
          />
          <label className="studio-sr" htmlFor="studio-src-url">
            Link
          </label>
          <input
            id="studio-src-url"
            className="studio-input"
            type="url"
            placeholder="https://…"
            value={src.url}
            onChange={(e) => setSrc({ ...src, url: e.target.value })}
          />
          <button type="submit" className="studio-btn studio-btn-plain">
            <Plus size={14} aria-hidden="true" />
            <span>Add source</span>
          </button>
        </form>
      </section>

      {/* Production Notes & Slate */}
      <section className="studio-sec" aria-labelledby="studio-notes-h">
        <div className="studio-sec-h">
          <div className="studio-sec-title-wrap">
            <FileText size={18} aria-hidden="true" />
            <h2 id="studio-notes-h">Production Notes & Slate</h2>
          </div>
        </div>
        <label className="studio-sr" htmlFor="studio-notes">
          Notes
        </label>
        <textarea
          id="studio-notes"
          className="studio-textarea studio-mono"
          rows={5}
          placeholder="Design ideas, B-roll notes, teleprompter directions, audio prompts…"
          value={piece.notes}
          onChange={(e) => onChange({ notes: e.target.value }, true)}
        />
      </section>

      {/* Danger Zone */}
      <footer className="studio-danger">
        <button
          type="button"
          className="studio-btn studio-btn-danger studio-btn-sm"
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={13} aria-hidden="true" />
          <span>Delete this piece</span>
        </button>
      </footer>

      {confirming ? (
        <Confirm
          message={`Are you sure you want to delete “${piece.title}”? The scenes, caption, hashtags, and sources will be removed.`}
          confirmLabel="Delete Piece"
          onConfirm={() => {
            setConfirming(false);
            onDelete();
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </article>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="studio-select-wrap">
      <span className="studio-label">{label}</span>
      <div className="studio-select">
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {children}
        </select>
      </div>
    </label>
  );
}
