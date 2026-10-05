"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clapperboard,
  ClipboardPaste,
  Columns3,
  Film,
  Flame,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { useStudio } from "@/hooks/useStudio";
import { estimateSeconds } from "@/lib/studio/checks";
import { matchSeries, pastePatch } from "@/lib/studio/paste";
import {
  addPart,
  attachPiece,
  detachPiece,
  movePart,
  movePieceTo,
  placePiece,
  removePart,
  sortParts,
} from "@/lib/studio/series";
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
  type StudioStatus,
} from "@/lib/studio/types";
import { KanbanBoard } from "./KanbanBoard";
import { PasteImport, type PasteResult } from "./PasteImport";
import { PieceEditor } from "./PieceEditor";
import { SeriesRoadmap } from "./SeriesRoadmap";
import { SeriesView } from "./SeriesView";
import { StudioCardThumbnail } from "./StudioCardThumbnail";
import { FormatBadge, PillarBadge, PillarDot, useCopy } from "./StudioShared";

type View = "pieces" | "series" | "ideas";
type LayoutMode = "cards" | "kanban" | "list";

export function StudioApp() {
  const studio = useStudio();
  const { data, loading, update, create, remove } = studio;
  const [view, setView] = useState<View>("pieces");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [idea, setIdea] = useState<{ title: string; pillar: StudioPillar }>({ title: "", pillar: "finance" });
  const [pasting, setPasting] = useState<"new" | "piece" | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPillar, setSelectedPillar] = useState<StudioPillar | "all">("all");
  const [draftingId, setDraftingId] = useState<string | null>(null);

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
        if (piece && (piece.part !== p.n || piece.seriesId !== s.id))
          update("pieces", piece.id, { part: p.n, seriesId: s.id });
      }
    },
    [data.pieces, update]
  );

  const newPiece = async (values: Partial<StudioPiece> = {}) => {
    const piece = await create("pieces", {
      title: "Untitled piece",
      script: [{ text: "", cards: [] }],
      ...values,
    });
    if (piece) openPiece(piece.id);
    return piece;
  };

  const openPart = async (seriesId: string, n: number) => {
    const s = data.series.find((x) => x.id === seriesId);
    const part = s?.parts.find((p) => p.n === n);
    if (!s || !part) return;
    const existing = part.pieceId ? data.pieces.find((p) => p.id === part.pieceId) : null;
    if (existing) return openPiece(existing.id);
    const piece = await newPiece({
      title: `${s.title} P${n}: ${part.title}`,
      pillar: s.pillar,
      seriesId: s.id,
      part: n,
      notes: part.summary ?? "",
    });
    if (piece)
      update("series", s.id, {
        parts: s.parts.map((p) => (p.n === n ? { ...p, pieceId: piece.id } : p)),
      });
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
        target = await create("series", {
          title: pasted.seriesTitle,
          theme: "",
          pillar: patch.pillar ?? piece?.pillar ?? "finance",
          parts: [],
          nextPart: 1,
        });
        if (target) seriesList = [...seriesList, target];
      }
    }
    if (piece) {
      update("pieces", piece.id, patch);
      piece = { ...piece, ...patch };
    } else {
      const title =
        patch.title ??
        (target && pasted.part
          ? `${target.title} P${pasted.part}`
          : pasted.caption?.split("\n")[0].slice(0, 80) || "Pasted piece");
      piece = await create("pieces", { script: [{ text: "", cards: [] }], ...patch, title });
      if (!piece) return;
    }
    if (target) {
      const old =
        piece.seriesId && piece.seriesId !== target.id
          ? seriesList.find((s) => s.id === piece!.seriesId)
          : null;
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

  /** Instant Idea Expansion: Generate full script, caption, hashtags via AI */
  const draftIdeaWithAi = async (targetIdea: {
    id: string;
    title: string;
    hook: string;
    pillar: StudioPillar;
    format: StudioPiece["format"];
  }) => {
    setDraftingId(targetIdea.id);
    setToast("Drafting video script with AI…");
    try {
      const res = await fetch("/api/studio/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: targetIdea.title,
          hook: targetIdea.hook,
          pillar: targetIdea.pillar,
          format: targetIdea.format || "reel",
        }),
      });

      if (!res.ok) throw new Error("Failed to draft script");
      const dataJson = await res.json();
      const draft = dataJson.draft;

      const piece = await create("pieces", {
        title: draft.title || targetIdea.title,
        format: draft.format || targetIdea.format || "reel",
        pillar: draft.pillar || targetIdea.pillar || "finance",
        script: draft.script,
        caption: draft.caption,
        hashtags: draft.hashtags,
        extraHashtags: draft.extraHashtags,
        sources: draft.sources || [],
        notes: draft.notes || targetIdea.hook,
        status: "writing",
      });

      update("ideas", targetIdea.id, { status: "started" });
      if (piece) openPiece(piece.id);
      setToast("AI script drafted!");
    } catch (err) {
      console.error(err);
      setToast("Could not draft script with AI");
    } finally {
      setDraftingId(null);
    }
  };

  const tabs: { id: View; label: string; icon: typeof Clapperboard; count?: number }[] = [
    { id: "pieces", label: "Pieces", icon: Clapperboard, count: data.pieces.length },
    { id: "series", label: "Series", icon: Film, count: data.series.length },
    { id: "ideas", label: "Ideas", icon: Sparkles, count: data.ideas.filter((i) => i.status === "new").length },
  ];

  // Pipeline metrics
  const inProductionCount = useMemo(
    () =>
      data.pieces.filter(
        (p) => p.status === "writing" || p.status === "recording" || p.status === "making"
      ).length,
    [data.pieces]
  );
  const readyCount = useMemo(
    () => data.pieces.filter((p) => p.status === "ready").length,
    [data.pieces]
  );
  const activeSeriesCount = useMemo(
    () => data.series.filter((s) => s.status !== "completed").length,
    [data.series]
  );
  const completedSeriesCount = useMemo(
    () => data.series.filter((s) => s.status === "completed").length,
    [data.series]
  );

  // Filtered pieces
  const filteredPieces = useMemo(() => {
    return data.pieces.filter((p) => {
      if (selectedPillar !== "all" && p.pillar !== selectedPillar) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesNotes = p.notes?.toLowerCase().includes(q);
        const matchesCaption = p.caption?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCaption) return false;
      }
      return true;
    });
  }, [data.pieces, selectedPillar, searchQuery]);

  return (
    <div className="studio">
      <header className="studio-top">
        <div className="studio-brand">
          <h1 className="studio-logo">Studio</h1>
          <span className="studio-badge-live">
            <span className="studio-live-pulse" />
            ON AIR
          </span>
        </div>

        <nav className="studio-tabs" aria-label="Studio sections">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = view === t.id && !open;
            return (
              <button
                key={t.id}
                type="button"
                className="studio-tab"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setView(t.id);
                  setOpenId(null);
                }}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{t.label}</span>
                {typeof t.count === "number" ? <span className="studio-tab-count">{t.count}</span> : null}
              </button>
            );
          })}
        </nav>

        <span className="studio-state" aria-live="polite">
          <span className={`studio-state-dot ${studio.saving ? "is-saving" : ""}`} />
          {studio.saving ? "Saving…" : loading ? "Loading…" : "Synced"}
        </span>

        <div className="studio-top-acts">
          <button
            type="button"
            className="studio-btn studio-btn-plain"
            onClick={() => setPasting("new")}
            title="Paste script, caption, hashtags or JSON block from Claude"
          >
            <ClipboardPaste size={14} aria-hidden="true" />
            <span>Paste everything</span>
          </button>
          <button type="button" className="studio-btn" onClick={() => void newPiece()}>
            <Plus size={15} aria-hidden="true" />
            <span>New piece</span>
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
            setToast("Piece deleted");
          }}
        />
      ) : view === "pieces" ? (
        <>
          {/* Studio Metrics Deck */}
          <div className="studio-deck">
            <div className="studio-stat-card">
              <div className="studio-stat-icon">
                <Clapperboard size={20} aria-hidden="true" />
              </div>
              <div className="studio-stat-info">
                <span className="studio-stat-val">{data.pieces.length}</span>
                <span className="studio-stat-lbl">Total Pieces</span>
              </div>
            </div>

            <div className="studio-stat-card">
              <div className="studio-stat-icon is-violet">
                <Video size={20} aria-hidden="true" />
              </div>
              <div className="studio-stat-info">
                <span className="studio-stat-val">{inProductionCount}</span>
                <span className="studio-stat-lbl">In Production</span>
              </div>
            </div>

            <div className="studio-stat-card">
              <div className="studio-stat-icon is-lime">
                <Flame size={20} aria-hidden="true" />
              </div>
              <div className="studio-stat-info">
                <span className="studio-stat-val">{readyCount}</span>
                <span className="studio-stat-lbl">Ready for Buffer</span>
              </div>
            </div>

            <div className="studio-stat-card">
              <div className="studio-stat-icon is-cyan">
                <Layers size={20} aria-hidden="true" />
              </div>
              <div className="studio-stat-info">
                <span className="studio-stat-val">{activeSeriesCount}</span>
                <span className="studio-stat-lbl">
                  {completedSeriesCount > 0 ? `Active (${completedSeriesCount} done)` : "Active Series"}
                </span>
              </div>
            </div>
          </div>

          {/* View Toolbar: Search & Mode Switch */}
          <div className="studio-view-bar">
            <div className="studio-filter-group">
              <div className="studio-search-box">
                <Search size={14} className="studio-muted" aria-hidden="true" />
                <input
                  placeholder="Filter pieces…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="studio-select">
                <select
                  value={selectedPillar}
                  onChange={(e) => setSelectedPillar(e.target.value as StudioPillar | "all")}
                  aria-label="Filter by Topic"
                >
                  <option value="all">All Topics</option>
                  {STUDIO_PILLARS.map((p) => (
                    <option key={p} value={p}>
                      {PILLAR_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="studio-view-toggle">
              <button
                type="button"
                className={`studio-view-btn ${layoutMode === "cards" ? "is-active" : ""}`}
                onClick={() => setLayoutMode("cards")}
                title="Board cards view"
              >
                <LayoutGrid size={14} aria-hidden="true" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`studio-view-btn ${layoutMode === "kanban" ? "is-active" : ""}`}
                onClick={() => setLayoutMode("kanban")}
                title="Interactive Kanban drag-and-drop board"
              >
                <Columns3 size={14} aria-hidden="true" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                className={`studio-view-btn ${layoutMode === "list" ? "is-active" : ""}`}
                onClick={() => setLayoutMode("list")}
                title="Compact list view"
              >
                <List size={14} aria-hidden="true" />
                <span>List</span>
              </button>
            </div>
          </div>

          <PiecesView
            pieces={filteredPieces}
            allPieces={data.pieces}
            series={data.series}
            loading={loading}
            layoutMode={layoutMode}
            onOpen={openPiece}
            onOpenPart={(s, n) => void openPart(s, n)}
            onUpdateStatus={(pieceId, status) => {
              update("pieces", pieceId, { status });
              setToast(`Moved to ${STATUS_LABEL[status]}`);
            }}
            onNewPiece={(v) => void newPiece(v)}
          />
        </>
      ) : view === "series" ? (
        <SeriesView
          series={data.series}
          pieces={data.pieces}
          loading={loading}
          onCreate={(title, theme) =>
            void create("series", { title, theme, parts: [], nextPart: 1, status: "active" }).then(
              (s) => s && setToast("Series created")
            )
          }
          onRename={(id, patch) => update("series", id, patch, { debounce: true })}
          onPartTitle={(id, n, title) => {
            const s = data.series.find((x) => x.id === id);
            if (s)
              update(
                "series",
                id,
                { parts: s.parts.map((p) => (p.n === n ? { ...p, title } : p)) },
                { debounce: true }
              );
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
          onToggleStatus={(id, status) => {
            update("series", id, { status });
            const s = data.series.find((x) => x.id === id);
            if (status === "completed") {
              setToast(`Series “${s?.title || "Series"}” completed`);
            } else {
              setToast(`Series “${s?.title || "Series"}” reopened as active`);
            }
          }}
          onDisband={(id) => {
            const s = data.series.find((x) => x.id === id);
            studio.setData((d) => ({
              ...d,
              pieces: d.pieces.map((p) =>
                p.seriesId === id ? { ...p, seriesId: null, part: null } : p
              ),
            }));
            void remove("series", id);
            setToast(`Series “${s?.title || "Series"}” disbanded — pieces kept safe`);
          }}
          onDelete={(id) => {
            studio.setData((d) => ({
              ...d,
              pieces: d.pieces.map((p) =>
                p.seriesId === id ? { ...p, seriesId: null, part: null } : p
              ),
            }));
            void remove("series", id);
            setToast("Series deleted");
          }}
          onBatchExpandParts={async (id) => {
            const s = data.series.find((x) => x.id === id);
            if (!s) return;
            const planned = s.parts.filter((p) => !p.pieceId);
            if (!planned.length) return;
            let currentParts = [...s.parts];
            for (const p of planned) {
              const piece = await create("pieces", {
                title: `${s.title} P${p.n}: ${p.title}`,
                pillar: s.pillar,
                seriesId: s.id,
                part: p.n,
                notes: p.summary ?? "",
                script: [{ text: "", cards: [] }],
                status: "writing",
              });
              if (piece) {
                currentParts = currentParts.map((item) =>
                  item.n === p.n ? { ...item, pieceId: piece.id } : item
                );
              }
            }
            update("series", s.id, { parts: currentParts });
            setToast(`Draft pieces created for ${planned.length} planned parts`);
          }}
          onAddMultipleParts={(id, count) => {
            const s = data.series.find((x) => x.id === id);
            if (!s) return;
            let newParts = [...s.parts];
            for (let i = 0; i < count; i++) {
              newParts = addPart(newParts, `Part ${newParts.length + 1}`);
            }
            update("series", s.id, { parts: newParts });
            setToast(`Expanded series with ${count} parts`);
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
            <input
              id="studio-idea"
              placeholder="Jot an idea or hook… e.g. Why credit card points are actually a hidden tax"
              value={idea.title}
              onChange={(e) => setIdea({ ...idea, title: e.target.value })}
            />
            <label className="studio-sr" htmlFor="studio-idea-pillar">
              Topic
            </label>
            <select
              id="studio-idea-pillar"
              value={idea.pillar}
              onChange={(e) => setIdea({ ...idea, pillar: e.target.value as StudioPillar })}
            >
              {STUDIO_PILLARS.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </select>
            <button type="submit" className="studio-btn">
              <Plus size={14} aria-hidden="true" />
              <span>Add idea</span>
            </button>
          </form>
          {(() => {
            const list = data.ideas.filter((i) => i.status === "new");
            if (loading) return <p className="studio-muted">Loading ideas…</p>;
            if (!list.length)
              return (
                <div className="studio-empty">
                  No ideas in the hopper. Quick-capture one above to start a concept!
                </div>
              );
            return (
              <ul className="studio-list">
                {list.map((i) => (
                  <li key={i.id} className="studio-idea">
                    <PillarDot pillar={i.pillar} />
                    <div className="studio-idea-t">
                      <strong>{i.title}</strong>
                      {i.hook ? <span>{i.hook}</span> : null}
                    </div>

                    <div className="studio-row studio-row-start" style={{ gap: "6px" }}>
                      <button
                        type="button"
                        className="studio-btn studio-btn-plain studio-btn-sm"
                        disabled={draftingId === i.id}
                        onClick={() => void draftIdeaWithAi(i)}
                        title="Use AI to generate script scenes, title cards, caption, and hashtags from this idea"
                      >
                        <Sparkles
                          size={13}
                          className={draftingId === i.id ? "studio-spin" : ""}
                          aria-hidden="true"
                        />
                        <span>{draftingId === i.id ? "Drafting…" : "Draft Script (AI)"}</span>
                      </button>

                      <button
                        type="button"
                        className="studio-btn studio-btn-plain studio-btn-sm"
                        onClick={() => {
                          update("ideas", i.id, { status: "started" });
                          void newPiece({
                            title: i.title,
                            pillar: i.pillar,
                            format: i.format,
                            notes: i.hook,
                          });
                        }}
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>Start manual</span>
                      </button>

                      <button
                        type="button"
                        className="studio-btn studio-btn-quiet studio-btn-sm"
                        aria-label={`Delete idea: ${i.title}`}
                        onClick={() => void remove("ideas", i.id)}
                      >
                        Delete
                      </button>
                    </div>
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

const STAGE_HINT: Record<StudioStatus, string> = {
  writing: "Hook & Scene drafting",
  recording: "Teleprompter & voiceover capture",
  making: "Editing, captions & title cards",
  ready: "Hashtags and caption verified",
  posted: "Published & archived",
};

function PiecesView({
  pieces,
  allPieces,
  series,
  loading,
  layoutMode,
  onOpen,
  onOpenPart,
  onUpdateStatus,
  onNewPiece,
}: {
  pieces: StudioPiece[];
  allPieces: StudioPiece[];
  series: StudioSeries[];
  loading: boolean;
  layoutMode: LayoutMode;
  onOpen: (id: string) => void;
  onOpenPart: (seriesId: string, n: number) => void;
  onUpdateStatus: (pieceId: string, status: StudioStatus) => void;
  onNewPiece: (v?: Partial<StudioPiece>) => void;
}) {
  if (loading) return <p className="studio-muted">Loading your production pieces…</p>;

  return (
    <div className="studio-pieces">
      {/* Series Episode Roadmaps (Active only) */}
      {series
        .filter((s) => s.status !== "completed")
        .map((s) => (
          <SeriesRoadmap
            key={s.id}
            series={s}
            pieces={allPieces}
            onOpenPiece={onOpen}
            onOpenPart={onOpenPart}
            onUpdateStatus={onUpdateStatus}
          />
        ))}

      {!allPieces.length ? (
        <div className="studio-empty">
          No pieces created yet. Click “+ New piece” above, draft with AI in Ideas, or paste from Claude using “Paste everything”.
        </div>
      ) : null}

      {/* Kanban Board View */}
      {layoutMode === "kanban" ? (
        <KanbanBoard
          pieces={pieces}
          series={series}
          onOpenPiece={onOpen}
          onMovePiece={onUpdateStatus}
          onNewPiece={onNewPiece}
        />
      ) : (
        /* Card Grid or List View */
        STUDIO_STATUSES.map((st) => {
          const list = pieces
            .filter((p) => p.status === st)
            .sort(
              (a, b) =>
                (a.seriesId ?? "~").localeCompare(b.seriesId ?? "~") ||
                (a.part ?? 0) - (b.part ?? 0) ||
                a.title.localeCompare(b.title)
            );

          if (!allPieces.length || (!list.length && st === "posted")) return null;

          return (
            <section className="studio-group" key={st} aria-labelledby={`studio-g-${st}`}>
              <div className="studio-group-h">
                <div className="studio-group-title">
                  <h2 id={`studio-g-${st}`}>{STATUS_LABEL[st]}</h2>
                  <span className="studio-muted studio-small">· {STAGE_HINT[st]}</span>
                </div>
                <span className="studio-group-badge">{list.length}</span>
              </div>

              {list.length ? (
                layoutMode === "cards" ? (
                  <div className="studio-grid">
                    {list.map((p) => {
                      const s = p.seriesId ? series.find((x) => x.id === p.seriesId) : null;
                      const { words, seconds } = estimateSeconds(p.script);
                      const sceneCount = p.script.length;

                      return (
                        <article
                          key={p.id}
                          className="studio-card"
                          tabIndex={0}
                          role="button"
                          onClick={() => onOpen(p.id)}
                          onKeyDown={(e) => e.key === "Enter" && onOpen(p.id)}
                        >
                          <div className="studio-card-head">
                            <FormatBadge format={p.format} />
                            <PillarBadge pillar={p.pillar} />
                          </div>

                          <div className="studio-card-body">
                            <div className="studio-card-thumb-wrap">
                              <StudioCardThumbnail coverUrl={p.coverUrl} size="card" />
                            </div>

                            <div className="studio-card-content">
                              {s ? (
                                <span className="studio-card-series-tag">
                                  {s.title} · P{p.part}
                                </span>
                              ) : null}
                              <h3 className="studio-card-title">{p.title}</h3>
                            </div>
                          </div>

                          <div className="studio-card-foot">
                            <div className="studio-card-stats">
                              <span>⏱ ~{Math.round(seconds)}s</span>
                              <span>·</span>
                              <span>{words}w</span>
                              <span>·</span>
                              <span>{sceneCount} scenes</span>
                            </div>
                            <span className="studio-pill studio-btn-sm">Edit →</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <ul className="studio-list">
                    {list.map((p) => {
                      const s = p.seriesId ? series.find((x) => x.id === p.seriesId) : null;
                      const { seconds } = estimateSeconds(p.script);

                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="studio-item"
                            onClick={() => onOpen(p.id)}
                          >
                            <StudioCardThumbnail coverUrl={p.coverUrl} size="list" />
                            <div className="studio-item-t">
                              <span>{p.title}</span>
                              {s ? (
                                <span
                                  className="studio-muted studio-small studio-mono"
                                  style={{ marginLeft: "8px" }}
                                >
                                  ({s.title} P{p.part})
                                </span>
                              ) : null}
                            </div>
                            <div className="studio-item-m">
                              <span className="studio-muted studio-mono studio-small">
                                ~{Math.round(seconds)}s
                              </span>
                              <FormatBadge format={p.format} />
                              <PillarDot pillar={p.pillar} />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                <div className="studio-empty">No pieces in this stage.</div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
