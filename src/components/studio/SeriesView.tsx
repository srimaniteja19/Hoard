"use client";

import { useState } from "react";
import { sortParts, type PartState } from "@/lib/studio/series";
import type { StudioPiece, StudioSeries } from "@/lib/studio/types";
import { Confirm } from "./StudioShared";

const STATE_LABEL: Record<PartState, string> = {
  planned: "Planned",
  writing: "Writing",
  recording: "Recording",
  making: "Making",
  ready: "Ready",
  posted: "Posted",
};

type Props = {
  series: StudioSeries[];
  pieces: StudioPiece[];
  loading: boolean;
  onCreate: (title: string, theme: string) => void;
  onRename: (id: string, patch: { title?: string; theme?: string }) => void;
  onPartTitle: (id: string, n: number, title: string) => void;
  onAddPart: (id: string, title: string) => void;
  onMovePart: (id: string, n: number) => void;
  onRemovePart: (id: string, n: number) => void;
  onSetNext: (id: string, n: number) => void;
  onOpenPart: (id: string, n: number) => void;
  onDelete: (id: string) => void;
};

export function SeriesView(props: Props) {
  const { series, pieces, loading } = props;
  const [draft, setDraft] = useState({ title: "", theme: "" });
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<null | { message: string; label: string; run: () => void }>(null);

  const stateOf = (pieceId?: string | null): PartState => {
    const p = pieceId ? pieces.find((x) => x.id === pieceId) : undefined;
    return p ? p.status : "planned";
  };

  return (
    <div className="studio-series-view">
      <form
        className="studio-capture"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.title.trim()) return;
          props.onCreate(draft.title.trim(), draft.theme.trim());
          setDraft({ title: "", theme: "" });
        }}
      >
        <label className="studio-sr" htmlFor="studio-ns-title">
          New series name
        </label>
        <input id="studio-ns-title" placeholder="New series name, e.g. How money works" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <label className="studio-sr" htmlFor="studio-ns-theme">
          Visual theme
        </label>
        <input id="studio-ns-theme" className="studio-capture-narrow" placeholder="Visual theme (optional)" value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value })} />
        <button type="submit" className="studio-btn">
          + Series
        </button>
      </form>

      {loading ? <p className="studio-muted">Loading…</p> : null}
      {!loading && !series.length ? <div className="studio-empty">No series yet. Name one above to plan a story in parts.</div> : null}

      {series.map((s) => {
        const parts = sortParts(s.parts);
        const count = (st: PartState) => parts.filter((p) => stateOf(p.pieceId) === st).length;
        const posted = count("posted");
        const ready = count("ready");
        const planned = count("planned");
        const active = parts.length - posted - ready - planned;
        const total = parts.length || 1;
        return (
          <section className="studio-scard" key={s.id} aria-label={s.title}>
            <div className="studio-scard-h">
              <label className="studio-sr" htmlFor={`studio-sn-${s.id}`}>
                Series name
              </label>
              <input id={`studio-sn-${s.id}`} className="studio-s-title" value={s.title} onChange={(e) => props.onRename(s.id, { title: e.target.value })} />
              <label className="studio-sr" htmlFor={`studio-st-${s.id}`}>
                Theme
              </label>
              <input id={`studio-st-${s.id}`} className="studio-s-theme" placeholder="Visual theme" value={s.theme} onChange={(e) => props.onRename(s.id, { theme: e.target.value })} />
            </div>
            <div className="studio-prog" role="img" aria-label={`${posted} posted, ${ready} ready, ${active} in progress, ${planned} planned`}>
              <span className="studio-prog-posted" style={{ width: `${(posted / total) * 100}%` }} />
              <span className="studio-prog-ready" style={{ width: `${(ready / total) * 100}%` }} />
              <span className="studio-prog-active" style={{ width: `${(active / total) * 100}%` }} />
            </div>
            <p className="studio-muted studio-mono studio-small">
              {parts.length} parts · {posted} posted · {ready} ready · {active} in progress · {planned} planned
            </p>
            <ol className="studio-parts">
              {parts.map((p, i) => {
                const st = stateOf(p.pieceId);
                const isNext = p.n === s.nextPart;
                return (
                  <li key={`${p.n}-${p.pieceId ?? p.title}`} className={isNext ? "is-next" : undefined}>
                    <span className="studio-part-n">{p.n}</span>
                    <label className="studio-sr" htmlFor={`studio-pt-${s.id}-${p.n}`}>
                      Part {p.n} title
                    </label>
                    <input id={`studio-pt-${s.id}-${p.n}`} className="studio-part-title" value={p.title} onChange={(e) => props.onPartTitle(s.id, p.n, e.target.value)} />
                    <span className="studio-part-acts">
                      {isNext ? (
                        <span className="studio-pill studio-pill-next">Next</span>
                      ) : (
                        <button type="button" className="studio-btn studio-btn-quiet" onClick={() => props.onSetNext(s.id, p.n)}>
                          Set next
                        </button>
                      )}
                      <span className={`studio-pill studio-state-${st}`}>{STATE_LABEL[st]}</span>
                      <button type="button" className="studio-btn studio-btn-plain studio-btn-sm" onClick={() => props.onOpenPart(s.id, p.n)}>
                        {p.pieceId && st !== "planned" ? "Open" : "Start"}
                      </button>
                      {i > 0 ? (
                        <button type="button" className="studio-btn studio-btn-quiet" aria-label={`Move part ${p.n} up`} onClick={() => props.onMovePart(s.id, p.n)}>
                          ↑
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="studio-btn studio-btn-quiet"
                        aria-label={`Remove part ${p.n}`}
                        onClick={() =>
                          setConfirm({
                            message: `Remove part ${p.n}, “${p.title}”?${p.pieceId ? " Its piece stays in Pieces." : ""}`,
                            label: "Remove",
                            run: () => props.onRemovePart(s.id, p.n),
                          })
                        }
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
            <form
              className="studio-addpart"
              onSubmit={(e) => {
                e.preventDefault();
                const t = (adding[s.id] ?? "").trim();
                if (!t) return;
                props.onAddPart(s.id, t);
                setAdding({ ...adding, [s.id]: "" });
              }}
            >
              <label className="studio-sr" htmlFor={`studio-ap-${s.id}`}>
                New part title
              </label>
              <input id={`studio-ap-${s.id}`} placeholder={`Add part ${parts.length + 1}`} value={adding[s.id] ?? ""} onChange={(e) => setAdding({ ...adding, [s.id]: e.target.value })} />
              <button type="submit" className="studio-btn studio-btn-plain">
                Add
              </button>
            </form>
            <div className="studio-right">
              <button
                type="button"
                className="studio-btn studio-btn-quiet"
                onClick={() => setConfirm({ message: `Delete the series “${s.title}”? Its pieces stay in Pieces.`, label: "Delete series", run: () => props.onDelete(s.id) })}
              >
                Delete series
              </button>
            </div>
          </section>
        );
      })}
      {confirm ? (
        <Confirm
          message={confirm.message}
          confirmLabel={confirm.label}
          onConfirm={() => {
            confirm.run();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
