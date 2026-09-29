"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudio } from "@/hooks/useStudio";
import { matchSeries, pastePatch } from "@/lib/studio/paste";
import { addPart, attachPiece, detachPiece, movePart, movePieceTo, placePiece, removePart, sortParts } from "@/lib/studio/series";
import {
  FORMAT_LABEL,
  PILLAR_LABEL,
  STATUS_LABEL,
  STUDIO_PILLARS,
  STUDIO_STATUSES,
  type StudioPart,
  type StudioPiece,
  type StudioPillar,
  type StudioSeries,
} from "@/lib/studio/types";
import { PasteImport, type PasteResult } from "./PasteImport";
import { PieceEditor } from "./PieceEditor";
import { SeriesView } from "./SeriesView";
import { PillarDot, useCopy } from "./StudioShared";

type View = "pieces" | "series" | "ideas";

export function StudioApp() {
  const studio = useStudio();
  const { data, loading, update, create, remove } = studio;
  const [view, setView] = useState<View>("pieces");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [idea, setIdea] = useState<{ title: string; pillar: StudioPillar }>({ title: "", pillar: "finance" });
  const [pasting, setPasting] = useState<"new" | "piece" | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const { copy, dialog } = useCopy(setToast);
  const open = data.pieces.find((p) => p.id === openId) ?? null;

  const openPiece = (id: string) => {
    setOpenId(id);
    window.scrollTo({ top: 0 });
  };

  /* series helpers: keep series.parts and piece.part in step */
  const saveParts = useCallback(
    (s: StudioSeries, parts: StudioPart[], nextPart = s.nextPart) => {
      update("series", s.id, { parts, nextPart });
      for (const p of parts) {
        if (!p.pieceId) continue;
        const piece = data.pieces.find((x) => x.id === p.pieceId);
        if (piece && (piece.part !== p.n || piece.seriesId !== s.id)) update("pieces", piece.id, { part: p.n, seriesId: s.id });
      }
    },
    [data.pieces, update]
  );

  const newPiece = async (values: Partial<StudioPiece> = {}) => {
    const piece = await create("pieces", { title: "Untitled piece", script: [{ text: "", cards: [] }], ...values });
    if (piece) openPiece(piece.id);
    return piece;
  };

  const openPart = async (seriesId: string, n: number) => {
    const s = data.series.find((x) => x.id === seriesId);
    const part = s?.parts.find((p) => p.n === n);
    if (!s || !part) return;
    const existing = part.pieceId ? data.pieces.find((p) => p.id === part.pieceId) : null;
    if (existing) return openPiece(existing.id);
    const piece = await newPiece({ title: `${s.title} P${n}: ${part.title}`, pillar: s.pillar, seriesId: s.id, part: n, notes: part.summary ?? "" });
    if (piece) update("series", s.id, { parts: s.parts.map((p) => (p.n === n ? { ...p, pieceId: piece.id } : p)) });
  };

  const setPieceSeries = (piece: StudioPiece, seriesId: string | null) => {
    if (piece.seriesId === seriesId) return;
    const old = piece.seriesId ? data.series.find((s) => s.id === piece.seriesId) : null;
    if (old) update("series", old.id, { parts: detachPiece(old.parts, piece.id) });
    if (!seriesId) return update("pieces", piece.id, { seriesId: null, part: null });
    const target = data.series.find((s) => s.id === seriesId);
    if (!target) return;
    const { parts, part } = attachPiece(target.parts, piece);
    update("series", target.id, { parts });
    update("pieces", piece.id, { seriesId, part });
  };

  /** Paste everything: update or create the piece, then put it in its series part. */
  const applyPaste = async ({ pasted, fields, targetId, createSeries }: PasteResult) => {
    setPasting(null);
    const patch = pastePatch(pasted, fields);
    let piece: StudioPiece | null = targetId ? data.pieces.find((p) => p.id === targetId) ?? null : null;
    let seriesList = data.series;
    let target: StudioSeries | null = null;
    if (fields.includes("seriesTitle") && pasted.seriesTitle) {
      target = matchSeries(seriesList, pasted.seriesTitle);
      if (!target && createSeries) {
        target = await create("series", { title: pasted.seriesTitle, theme: "", pillar: patch.pillar ?? piece?.pillar ?? "finance", parts: [], nextPart: 1 });
        if (target) seriesList = [...seriesList, target];
      }
    }
    if (piece) {
      update("pieces", piece.id, patch);
      piece = { ...piece, ...patch };
    } else {
      const title = patch.title ?? (target && pasted.part ? `${target.title} P${pasted.part}` : pasted.caption?.split("\n")[0].slice(0, 80) || "Pasted piece");
      piece = await create("pieces", { script: [{ text: "", cards: [] }], ...patch, title });
      if (!piece) return;
    }
    if (target) {
      const old = piece.seriesId && piece.seriesId !== target.id ? seriesList.find((s) => s.id === piece!.seriesId) : null;
      if (old) update("series", old.id, { parts: detachPiece(old.parts, piece.id) });
      const done = piece.status === "ready" || piece.status === "posted";
      const r = placePiece(target.parts, piece, pasted.part, target.nextPart, done);
      update("series", target.id, { parts: r.parts, nextPart: r.nextPart });
      update("pieces", piece.id, { seriesId: target.id, part: r.part });
    }
    setOpenId(piece.id);
    window.scrollTo({ top: 0 });
    setToast(targetId ? "Piece updated" : "Piece created");
  };

  const tabs: { id: View; label: string }[] = [
    { id: "pieces", label: "Pieces" },
    { id: "series", label: "Series" },
    { id: "ideas", label: "Ideas" },
  ];

  return (
    <div className="studio">
      <header className="studio-top">
        <h1 className="studio-logo">Studio</h1>
        <nav className="studio-tabs" aria-label="Studio sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className="studio-tab"
              aria-current={view === t.id && !open ? "page" : undefined}
              onClick={() => {
                setView(t.id);
                setOpenId(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span className="studio-state" aria-live="polite">
          {studio.saving ? "Saving…" : loading ? "Loading…" : "Saved"}
        </span>
        <div className="studio-top-acts">
          <button type="button" className="studio-btn studio-btn-plain" onClick={() => setPasting("new")}>
            Paste everything
          </button>
          <button type="button" className="studio-btn" onClick={() => void newPiece()}>
            + New piece
          </button>
        </div>
      </header>

      {studio.error ? (
        <p className="studio-error" role="alert">
          {studio.error}
        </p>
      ) : null}

      {open ? (
        <PieceEditor
          piece={open}
          series={data.series}
          copy={(text, label) => void copy(text, label)}
          onBack={() => setOpenId(null)}
          onChange={(patch, debounce) => update("pieces", open.id, patch, { debounce })}
          onSeries={(sid) => setPieceSeries(open, sid)}
          onPaste={() => setPasting("piece")}
          onPartPosition={(to) => {
            const s = data.series.find((x) => x.id === open.seriesId);
            if (!s) return;
            const r = movePieceTo(s.parts, open.id, to, s.nextPart);
            saveParts(s, r.parts, r.nextPart);
          }}
          onDelete={() => {
            const s = open.seriesId ? data.series.find((x) => x.id === open.seriesId) : null;
            if (s) update("series", s.id, { parts: detachPiece(s.parts, open.id) });
            void remove("pieces", open.id);
            setOpenId(null);
            setToast("Deleted");
          }}
        />
      ) : view === "pieces" ? (
        <PiecesView pieces={data.pieces} series={data.series} loading={loading} onOpen={openPiece} onOpenPart={(s, n) => void openPart(s, n)} />
      ) : view === "series" ? (
        <SeriesView
          series={data.series}
          pieces={data.pieces}
          loading={loading}
          onCreate={(title, theme) => void create("series", { title, theme, parts: [], nextPart: 1 }).then((s) => s && setToast("Series created"))}
          onRename={(id, patch) => update("series", id, patch, { debounce: true })}
          onPartTitle={(id, n, title) => {
            const s = data.series.find((x) => x.id === id);
            if (s) update("series", id, { parts: s.parts.map((p) => (p.n === n ? { ...p, title } : p)) }, { debounce: true });
          }}
          onAddPart={(id, title) => {
            const s = data.series.find((x) => x.id === id);
            if (s) update("series", id, { parts: addPart(s.parts, title) });
          }}
          onMovePart={(id, n) => {
            const s = data.series.find((x) => x.id === id);
            if (!s) return;
            const r = movePart(s.parts, n, -1, s.nextPart);
            saveParts(s, r.parts, r.nextPart);
          }}
          onRemovePart={(id, n) => {
            const s = data.series.find((x) => x.id === id);
            if (!s) return;
            const gone = s.parts.find((p) => p.n === n);
            if (gone?.pieceId) update("pieces", gone.pieceId, { seriesId: null, part: null });
            const r = removePart(s.parts, n, s.nextPart);
            saveParts(s, r.parts, r.nextPart);
          }}
          onSetNext={(id, n) => update("series", id, { nextPart: n })}
          onOpenPart={(id, n) => void openPart(id, n)}
          onDelete={(id) => {
            studio.setData((d) => ({ ...d, pieces: d.pieces.map((p) => (p.seriesId === id ? { ...p, seriesId: null, part: null } : p)) }));
            void remove("series", id);
            setToast("Series deleted");
          }}
        />
      ) : (
        <div className="studio-ideas">
          <form
            className="studio-capture"
            onSubmit={(e) => {
              e.preventDefault();
              if (!idea.title.trim()) return;
              void create("ideas", { title: idea.title.trim(), pillar: idea.pillar });
              setIdea({ ...idea, title: "" });
            }}
          >
            <label className="studio-sr" htmlFor="studio-idea">
              New idea
            </label>
            <input id="studio-idea" placeholder="Type an idea and press Enter" value={idea.title} onChange={(e) => setIdea({ ...idea, title: e.target.value })} />
            <label className="studio-sr" htmlFor="studio-idea-pillar">
              Topic
            </label>
            <select id="studio-idea-pillar" value={idea.pillar} onChange={(e) => setIdea({ ...idea, pillar: e.target.value as StudioPillar })}>
              {STUDIO_PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </select>
            <button type="submit" className="studio-btn">
              Add
            </button>
          </form>
          {(() => {
            const list = data.ideas.filter((i) => i.status === "new");
            if (loading) return <p className="studio-muted">Loading…</p>;
            if (!list.length) return <div className="studio-empty">No ideas saved. Add one above.</div>;
            return (
              <ul className="studio-list">
                {list.map((i) => (
                  <li key={i.id} className="studio-idea">
                    <PillarDot pillar={i.pillar} />
                    <div className="studio-idea-t">
                      <strong>{i.title}</strong>
                      {i.hook ? <span>{i.hook}</span> : null}
                    </div>
                    <button
                      type="button"
                      className="studio-btn studio-btn-plain"
                      onClick={() => {
                        update("ideas", i.id, { status: "started" });
                        void newPiece({ title: i.title, pillar: i.pillar, format: i.format, notes: i.hook });
                      }}
                    >
                      Start
                    </button>
                    <button type="button" className="studio-btn studio-btn-quiet" aria-label={`Delete idea: ${i.title}`} onClick={() => void remove("ideas", i.id)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}

      {pasting ? (
        <PasteImport
          pieces={data.pieces}
          series={data.series}
          lockTarget={pasting === "piece" ? open : null}
          onApply={(r) => void applyPaste(r)}
          onClose={() => setPasting(null)}
        />
      ) : null}
      {dialog}
      {toast ? (
        <div className="studio-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function PiecesView({
  pieces,
  series,
  loading,
  onOpen,
  onOpenPart,
}: {
  pieces: StudioPiece[];
  series: StudioSeries[];
  loading: boolean;
  onOpen: (id: string) => void;
  onOpenPart: (seriesId: string, n: number) => void;
}) {
  if (loading) return <p className="studio-muted">Loading your pieces…</p>;
  return (
    <div className="studio-pieces">
      {series.map((s) => (
        <section className="studio-strip" key={s.id} aria-label={`Series: ${s.title}`}>
          <div className="studio-row studio-row-start">
            <span className="studio-label">Series</span>
            <h2 className="studio-strip-title">{s.title}</h2>
            {s.theme ? <span className="studio-muted studio-small">Theme: {s.theme}</span> : null}
          </div>
          <div className="studio-strip-parts">
            {sortParts(s.parts).map((p) => {
              const piece = p.pieceId ? pieces.find((x) => x.id === p.pieceId) : null;
              const isNext = p.n === s.nextPart;
              const cls = isNext ? "is-next" : piece ? (piece.status === "posted" || piece.status === "ready" ? "is-done" : "") : "is-planned";
              return (
                <button key={p.n} type="button" className={`studio-chip-part ${cls}`} title={p.summary || undefined} onClick={() => onOpenPart(s.id, p.n)}>
                  <b>{p.n}</b>
                  {p.title}
                  {isNext ? <span className="studio-pill">next</span> : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {!pieces.length ? <div className="studio-empty">No pieces yet. Start one with “+ New piece”, or start an idea.</div> : null}

      {STUDIO_STATUSES.map((st) => {
        const list = pieces
          .filter((p) => p.status === st)
          .sort((a, b) => (a.seriesId ?? "~").localeCompare(b.seriesId ?? "~") || (a.part ?? 0) - (b.part ?? 0) || a.title.localeCompare(b.title));
        if (!pieces.length || (!list.length && st === "posted")) return null;
        return (
          <section className="studio-group" key={st} aria-labelledby={`studio-g-${st}`}>
            <div className="studio-group-h">
              <h2 id={`studio-g-${st}`}>{STATUS_LABEL[st]}</h2>
              <span className="studio-muted studio-mono studio-small">{list.length}</span>
            </div>
            {list.length ? (
              <ul className="studio-list">
                {list.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="studio-item" onClick={() => onOpen(p.id)}>
                      {p.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="studio-thumb" src={p.coverUrl} alt="" />
                      ) : (
                        <span className="studio-thumb studio-thumb-none" />
                      )}
                      <span className="studio-item-t">{p.title}</span>
                      <span className="studio-item-m">
                        {p.seriesId ? <span className="studio-pill">Part {p.part}</span> : null}
                        <span className="studio-pill">{FORMAT_LABEL[p.format]}</span>
                        <PillarDot pillar={p.pillar} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="studio-empty">Nothing here.</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
