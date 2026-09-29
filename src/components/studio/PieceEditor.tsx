"use client";

import { useState } from "react";
import { bufferText, captionChecks, productionBrief, scriptChecks, voiceScript } from "@/lib/studio/checks";
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
import { CheckList, Confirm } from "./StudioShared";

type Props = {
  piece: StudioPiece;
  series: StudioSeries[];
  onChange: (patch: Partial<StudioPiece>, debounce?: boolean) => void;
  onSeries: (seriesId: string | null) => void;
  onPartPosition: (to: number) => void;
  onDelete: () => void;
  onBack: () => void;
  copy: (text: string, label: string) => void;
};

export function PieceEditor({ piece, series, onChange, onSeries, onPartPosition, onDelete, onBack, copy }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [src, setSrc] = useState({ title: "", url: "" });
  const current = piece.seriesId ? series.find((s) => s.id === piece.seriesId) ?? null : null;
  const scenes = piece.script.length ? piece.script : [{ text: "" }];

  const setScene = (i: number, text: string) => {
    const next = scenes.map((s, j) => (j === i ? { ...s, text } : s));
    onChange({ script: next }, true);
  };

  return (
    <article className="studio-editor">
      <button type="button" className="studio-btn studio-btn-plain" onClick={onBack}>
        ← Pieces
      </button>

      <header className="studio-ed-head">
        <div className="studio-cover">
          {piece.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={piece.coverUrl} alt="Cover" />
          ) : (
            <span className="studio-label">No cover</span>
          )}
        </div>
        <div className="studio-ed-main">
          {current ? (
            <span className="studio-label">
              {current.title} · Part {piece.part}
            </span>
          ) : null}
          <label className="studio-sr" htmlFor="studio-title">
            Title
          </label>
          <input
            id="studio-title"
            className="studio-title-input"
            value={piece.title}
            onChange={(e) => onChange({ title: e.target.value }, true)}
            onBlur={(e) => !e.target.value.trim() && onChange({ title: "Untitled piece" })}
          />
          <div className="studio-meta">
            <Select label="Status" value={piece.status} onChange={(v) => onChange({ status: v as StudioPiece["status"] })}>
              {STUDIO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Select label="Format" value={piece.format} onChange={(v) => onChange({ format: v as StudioPiece["format"] })}>
              {STUDIO_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </option>
              ))}
            </Select>
            <Select label="Topic" value={piece.pillar} onChange={(v) => onChange({ pillar: v as StudioPiece["pillar"] })}>
              {STUDIO_PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </Select>
            <Select label="Series" value={piece.seriesId ?? ""} onChange={(v) => onSeries(v || null)}>
              <option value="">No series</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
            {current ? (
              <Select label="Part" value={String(piece.part ?? 1)} onChange={(v) => onPartPosition(Number(v))}>
                {Array.from({ length: Math.max(current.parts.length, piece.part ?? 1) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Part {n}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
          <label className="studio-cover-url">
            <span className="studio-sr">Cover image link</span>
            <input
              className="studio-input studio-mono"
              placeholder="Cover image link (optional)"
              value={piece.coverUrl ?? ""}
              onChange={(e) => onChange({ coverUrl: e.target.value.trim() || null }, true)}
            />
          </label>
        </div>
      </header>

      <section className="studio-sec" aria-labelledby="studio-script-h">
        <div className="studio-sec-h">
          <h2 id="studio-script-h">Script</h2>
          <div className="studio-row">
            <button type="button" className="studio-btn studio-btn-plain" onClick={() => copy(voiceScript(piece.script), "Voice script")}>
              Copy voice script
            </button>
            <button type="button" className="studio-btn" onClick={() => copy(productionBrief(piece, current), "Brief")}>
              Copy brief
            </button>
          </div>
        </div>
        {scenes.map((s, i) => (
          <div className="studio-scene" key={i}>
            <div className="studio-row">
              <label className="studio-label" htmlFor={`studio-scene-${i}`}>
                Scene {i + 1}
              </label>
              {scenes.length > 1 ? (
                <button type="button" className="studio-btn studio-btn-quiet" onClick={() => onChange({ script: scenes.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              ) : null}
            </div>
            <textarea
              id={`studio-scene-${i}`}
              className="studio-textarea"
              rows={Math.max(2, Math.ceil((s.text || "").length / 80) + 1)}
              value={s.text}
              onChange={(e) => setScene(i, e.target.value)}
            />
          </div>
        ))}
        <button type="button" className="studio-btn studio-btn-plain" onClick={() => onChange({ script: [...scenes, { text: "", cards: [] }] })}>
          + Scene
        </button>
        <CheckList checks={scriptChecks(piece)} />
      </section>

      <section className="studio-sec" aria-labelledby="studio-caption-h">
        <div className="studio-sec-h">
          <h2 id="studio-caption-h">Caption</h2>
          <button type="button" className="studio-btn" onClick={() => copy(bufferText(piece), "Caption")}>
            Copy for Buffer
          </button>
        </div>
        <label className="studio-sr" htmlFor="studio-caption">
          Caption
        </label>
        <textarea id="studio-caption" className="studio-textarea" rows={8} value={piece.caption} onChange={(e) => onChange({ caption: e.target.value }, true)} />
        <label className="studio-label studio-gap" htmlFor="studio-tags">
          Hashtags
        </label>
        <input
          id="studio-tags"
          className="studio-input studio-mono"
          placeholder="#predictionmarkets #finance"
          value={piece.hashtags}
          onChange={(e) => onChange({ hashtags: e.target.value }, true)}
        />
        <CheckList checks={captionChecks(piece)} />
      </section>

      <section className="studio-sec" aria-labelledby="studio-sources-h">
        <div className="studio-sec-h">
          <h2 id="studio-sources-h">Sources</h2>
        </div>
        {piece.sources.length ? (
          <ul className="studio-sources">
            {piece.sources.map((s, i) => (
              <li key={`${s.title}-${i}`}>
                <div>
                  <strong>{s.title || s.url}</strong>
                  {s.url ? (
                    <a className="studio-mono" href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.url}
                    </a>
                  ) : null}
                </div>
                <button type="button" className="studio-btn studio-btn-quiet" onClick={() => onChange({ sources: piece.sources.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="studio-muted">No sources yet.</p>
        )}
        <form
          className="studio-src-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!src.title.trim()) return;
            onChange({ sources: [...piece.sources, { title: src.title.trim(), url: src.url.trim() || undefined }] });
            setSrc({ title: "", url: "" });
          }}
        >
          <label className="studio-sr" htmlFor="studio-src-title">
            Source title
          </label>
          <input id="studio-src-title" className="studio-input" placeholder="Title" value={src.title} onChange={(e) => setSrc({ ...src, title: e.target.value })} />
          <label className="studio-sr" htmlFor="studio-src-url">
            Link
          </label>
          <input id="studio-src-url" className="studio-input" type="url" placeholder="https://" value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} />
          <button type="submit" className="studio-btn studio-btn-plain">
            Add
          </button>
        </form>
      </section>

      <section className="studio-sec" aria-labelledby="studio-notes-h">
        <div className="studio-sec-h">
          <h2 id="studio-notes-h">Notes</h2>
        </div>
        <label className="studio-sr" htmlFor="studio-notes">
          Notes
        </label>
        <textarea
          id="studio-notes"
          className="studio-textarea"
          rows={5}
          placeholder="Design ideas, fixes, anything"
          value={piece.notes}
          onChange={(e) => onChange({ notes: e.target.value }, true)}
        />
      </section>

      <footer className="studio-danger">
        <button type="button" className="studio-btn studio-btn-quiet" onClick={() => setConfirming(true)}>
          Delete this piece
        </button>
      </footer>
      {confirming ? (
        <Confirm
          message={`Delete “${piece.title}”? The script, caption and sources go with it.`}
          confirmLabel="Delete"
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

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="studio-select">
      <span className="studio-sr">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {children}
      </select>
    </label>
  );
}
