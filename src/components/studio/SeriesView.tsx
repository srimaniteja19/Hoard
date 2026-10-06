"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  ListPlus,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { sortParts, type PartState } from "@/lib/studio/series";
import type { StudioPiece, StudioSeries } from "@/lib/studio/types";
import { BatchEpisodesModal } from "./BatchEpisodesModal";
import { SeriesRoadmap } from "./SeriesRoadmap";
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
  onToggleStatus: (id: string, status: "active" | "completed") => void;
  onDisband: (id: string) => void;
  onDelete: (id: string) => void;
  onBatchExpandParts?: (id: string) => void;
  onAddMultipleParts?: (id: string, count: number) => void;
  onBatchAddTitles?: (seriesId: string, titles: string[]) => void;
};

export function SeriesView(props: Props) {
  const { series, pieces, loading } = props;
  const [draft, setDraft] = useState({ title: "", theme: "" });
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<null | { message: string; label: string; run: () => void }>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [batchSeries, setBatchSeries] = useState<StudioSeries | null>(null);

  const stateOf = (pieceId?: string | null): PartState => {
    const p = pieceId ? pieces.find((x) => x.id === pieceId) : undefined;
    return p ? p.status : "planned";
  };

  const isCollapsed = (s: StudioSeries) => {
    if (searchQuery.trim()) return false;
    if (collapsedMap[s.id] !== undefined) {
      return collapsedMap[s.id];
    }
    // Default is collapsed for all series
    return true;
  };

  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => {
      const currently = prev[id] !== undefined ? prev[id] : true;
      return { ...prev, [id]: !currently };
    });
  };

  const setAllCollapsed = (collapsed: boolean) => {
    const next: Record<string, boolean> = {};
    series.forEach((s) => {
      next[s.id] = collapsed;
    });
    setCollapsedMap(next);
  };

  const activeCount = useMemo(() => series.filter((s) => s.status !== "completed").length, [series]);
  const completedCount = useMemo(() => series.filter((s) => s.status === "completed").length, [series]);

  const displayedSeries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return series.filter((s) => {
      if (filter === "active" && s.status === "completed") return false;
      if (filter === "completed" && s.status !== "completed") return false;
      if (q) {
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesTheme = s.theme.toLowerCase().includes(q);
        const matchesPart = s.parts.some((p) => p.title.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTheme && !matchesPart) return false;
      }
      return true;
    });
  }, [series, filter, searchQuery]);

  return (
    <div className="studio-series-view">
      {/* Create New Series Deck */}
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
        <input
          id="studio-ns-title"
          placeholder="New series name, e.g. How money works, Prediction Markets…"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <label className="studio-sr" htmlFor="studio-ns-theme">
          Visual theme
        </label>
        <input
          id="studio-ns-theme"
          className="studio-capture-narrow"
          placeholder="Visual theme, e.g. paper / notebook, neon…"
          value={draft.theme}
          onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
        />
        <button type="submit" className="studio-btn">
          <Plus size={14} aria-hidden="true" />
          <span>New series</span>
        </button>
      </form>

      {/* Series View Toolbar: Filters & Expand/Collapse All */}
      {series.length > 0 ? (
        <div className="studio-series-toolbar">
          <div className="studio-series-filters" role="tablist" aria-label="Filter series by status">
            <button
              type="button"
              className={`studio-filter-chip ${filter === "all" ? "is-active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All Series ({series.length})
            </button>
            <button
              type="button"
              className={`studio-filter-chip ${filter === "active" ? "is-active" : ""}`}
              onClick={() => setFilter("active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`studio-filter-chip ${filter === "completed" ? "is-active" : ""}`}
              onClick={() => setFilter("completed")}
            >
              Completed ({completedCount})
            </button>
          </div>

          <div className="studio-search-box studio-series-search">
            <Search size={14} className="studio-muted" aria-hidden="true" />
            <input
              placeholder="Search series by title, theme, or episode…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="studio-omni-clear"
                onClick={() => setSearchQuery("")}
                title="Clear series search"
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="studio-scard-btn-group">
            <button
              type="button"
              className="studio-btn studio-btn-plain studio-btn-sm"
              onClick={() => setAllCollapsed(false)}
              title="Expand all series cards"
            >
              <ChevronsUpDown size={13} aria-hidden="true" />
              <span>Expand all</span>
            </button>
            <button
              type="button"
              className="studio-btn studio-btn-quiet studio-btn-sm"
              onClick={() => setAllCollapsed(true)}
              title="Collapse all series cards"
            >
              <ChevronsDownUp size={13} aria-hidden="true" />
              <span>Collapse all</span>
            </button>
          </div>
        </div>
      ) : null}

      {loading ? <p className="studio-muted">Loading series…</p> : null}
      {!loading && !series.length ? (
        <div className="studio-empty">
          No series planned yet. Name one above to orchestrate an episodic story in parts.
        </div>
      ) : null}

      {!loading && series.length > 0 && !displayedSeries.length ? (
        <div className="studio-empty">
          No {filter} series found. Switch to “All Series” or create one above.
        </div>
      ) : null}

      {/* Series Cards */}
      {displayedSeries.map((s) => {
        const parts = sortParts(s.parts);
        const count = (st: PartState) => parts.filter((p) => stateOf(p.pieceId) === st).length;
        const posted = count("posted");
        const ready = count("ready");
        const planned = count("planned");
        const active = parts.length - posted - ready - planned;
        const total = parts.length || 1;
        const isCompleted = s.status === "completed";
        const collapsed = isCollapsed(s);
        const allReadyOrPosted = parts.length > 0 && posted + ready === parts.length;

        return (
          <section
            className={`studio-scard ${isCompleted ? "is-completed" : ""} ${collapsed ? "is-collapsed" : ""}`}
            key={s.id}
            aria-label={s.title}
          >
            {/* Header: Title, Theme, Status & Main Action Buttons */}
            <div className="studio-scard-top-bar">
              <div className="studio-scard-titles">
                <label className="studio-sr" htmlFor={`studio-sn-${s.id}`}>
                  Series name
                </label>
                <input
                  id={`studio-sn-${s.id}`}
                  className="studio-s-title"
                  value={s.title}
                  onChange={(e) => props.onRename(s.id, { title: e.target.value })}
                />

                {isCompleted ? (
                  <span className="studio-pill studio-pill-completed" title="Series is completed and closed">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    <span>COMPLETED</span>
                  </span>
                ) : allReadyOrPosted ? (
                  <span className="studio-pill studio-pill-ready" title="All episodes are posted or ready for buffer">
                    <Sparkles size={11} aria-hidden="true" />
                    <span>100% READY</span>
                  </span>
                ) : null}

                <label className="studio-sr" htmlFor={`studio-st-${s.id}`}>
                  Theme
                </label>
                <input
                  id={`studio-st-${s.id}`}
                  className="studio-s-theme"
                  placeholder="Visual theme (e.g. vintage print)"
                  value={s.theme}
                  onChange={(e) => props.onRename(s.id, { theme: e.target.value })}
                />
              </div>

              <div className="studio-scard-btn-group">
                {/* Complete / Reopen Button */}
                {isCompleted ? (
                  <button
                    type="button"
                    className="studio-btn studio-btn-plain studio-btn-sm"
                    onClick={() => {
                      props.onToggleStatus(s.id, "active");
                      setCollapsedMap((prev) => ({ ...prev, [s.id]: false }));
                    }}
                    title="Reopen series as active production"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>Reopen series</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="studio-btn studio-btn-plain studio-btn-sm studio-btn-complete"
                    onClick={() => {
                      if (!allReadyOrPosted && (active > 0 || planned > 0)) {
                        setConfirm({
                          message: `Close & complete series “${s.title}”? ${posted + ready} of ${parts.length} episodes are finished (${active + planned} remain unfinished). You can reopen it at any time.`,
                          label: "Complete Series",
                          run: () => {
                            props.onToggleStatus(s.id, "completed");
                            setCollapsedMap((prev) => ({ ...prev, [s.id]: true }));
                          },
                        });
                      } else {
                        props.onToggleStatus(s.id, "completed");
                        setCollapsedMap((prev) => ({ ...prev, [s.id]: true }));
                      }
                    }}
                    title="Mark series as completed and close it"
                  >
                    <CheckCircle2 size={13} aria-hidden="true" />
                    <span>Complete series</span>
                  </button>
                )}

                {/* Expand / Collapse Toggle Button */}
                <button
                  type="button"
                  className="studio-btn studio-btn-plain studio-btn-sm"
                  onClick={() => toggleCollapse(s.id)}
                  title={collapsed ? "Expand series episodes & roadmap" : "Collapse series view"}
                  aria-expanded={!collapsed}
                >
                  {collapsed ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
                  <span>{collapsed ? "Expand" : "Collapse"}</span>
                </button>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div
              className="studio-prog"
              role="img"
              aria-label={`${posted} posted, ${ready} ready, ${active} in progress, ${planned} planned`}
            >
              <span className="studio-prog-posted" style={{ width: `${(posted / total) * 100}%` }} />
              <span className="studio-prog-ready" style={{ width: `${(ready / total) * 100}%` }} />
              <span className="studio-prog-active" style={{ width: `${(active / total) * 100}%` }} />
            </div>

            <p className="studio-muted studio-mono studio-small">
              {parts.length} parts · {posted} posted · {ready} ready · {active} in progress · {planned} planned
            </p>

            {/* Collapsed State Prompt Row */}
            {collapsed ? (
              <div
                className="studio-scard-collapsed-row"
                onClick={() => toggleCollapse(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse(s.id);
                  }
                }}
              >
                <span className="studio-mono studio-small studio-muted">
                  {isCompleted ? "✓ Series completed & closed." : "Series collapsed."} Click to expand {parts.length} episodes, roadmap & production brief
                </span>
                <div className="studio-scard-btn-group" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="studio-btn studio-btn-quiet studio-btn-xs"
                    onClick={() =>
                      setConfirm({
                        message: `Disband series “${s.title}”? This dissolves the series structure. All ${parts.length} pieces will remain safe in Pieces as standalone content.`,
                        label: "Disband Series",
                        run: () => props.onDisband(s.id),
                      })
                    }
                    title="Dissolve this series container while keeping all pieces safe"
                  >
                    <Unlink size={11} aria-hidden="true" />
                    <span>Disband</span>
                  </button>
                  <button
                    type="button"
                    className="studio-btn studio-btn-plain studio-btn-xs"
                    onClick={() => toggleCollapse(s.id)}
                  >
                    Expand series ↓
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Expanded: SeriesRoadmap Horizontal Carousel */}
                <div style={{ margin: "14px 0" }}>
                  <SeriesRoadmap
                    series={s}
                    pieces={pieces}
                    onOpenPiece={(id) => {
                      const part = s.parts.find((p) => p.pieceId === id);
                      if (part) props.onOpenPart(s.id, part.n);
                    }}
                    onOpenPart={(sid, n) => props.onOpenPart(sid, n)}
                  />
                </div>

                {/* Expanded: Parts Timeline */}
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
                        <input
                          id={`studio-pt-${s.id}-${p.n}`}
                          className="studio-part-title"
                          value={p.title}
                          onChange={(e) => props.onPartTitle(s.id, p.n, e.target.value)}
                        />

                        <span className="studio-part-acts">
                          {isNext ? (
                            <span className="studio-pill studio-pill-next">NEXT UP</span>
                          ) : (
                            <button
                              type="button"
                              className="studio-btn studio-btn-quiet studio-btn-sm"
                              onClick={() => props.onSetNext(s.id, p.n)}
                            >
                              Set next
                            </button>
                          )}

                          <span className={`studio-pill studio-status-${st}`}>
                            {STATE_LABEL[st]}
                          </span>

                          <button
                            type="button"
                            className="studio-btn studio-btn-plain studio-btn-sm"
                            onClick={() => props.onOpenPart(s.id, p.n)}
                          >
                            <Play size={11} aria-hidden="true" />
                            <span>{p.pieceId && st !== "planned" ? "Open" : "Start"}</span>
                          </button>

                          {i > 0 ? (
                            <button
                              type="button"
                              className="studio-btn studio-btn-quiet studio-btn-sm"
                              aria-label={`Move part ${p.n} up`}
                              onClick={() => props.onMovePart(s.id, p.n)}
                            >
                              <ArrowUp size={13} aria-hidden="true" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="studio-btn studio-btn-quiet studio-btn-sm"
                            aria-label={`Remove part ${p.n}`}
                            onClick={() =>
                              setConfirm({
                                message: `Remove part ${p.n}, “${p.title}”?${
                                  p.pieceId ? " Its piece stays safe in Pieces." : ""
                                }`,
                                label: "Remove Part",
                                run: () => props.onRemovePart(s.id, p.n),
                              })
                            }
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ol>

                {/* Quick Add Part */}
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
                  <input
                    id={`studio-ap-${s.id}`}
                    placeholder={`Add part ${parts.length + 1}…`}
                    value={adding[s.id] ?? ""}
                    onChange={(e) => setAdding({ ...adding, [s.id]: e.target.value })}
                  />
                  <button type="submit" className="studio-btn studio-btn-plain">
                    <Plus size={14} aria-hidden="true" />
                    <span>Add part</span>
                  </button>
                </form>

                {/* Expanded: Series Footer Actions (Batch Expand, Disband, Delete) */}
                <div className="studio-scard-footer">
                  <div className="studio-scard-btn-group">
                    {planned > 0 && props.onBatchExpandParts ? (
                      <button
                        type="button"
                        className="studio-btn studio-btn-plain studio-btn-sm"
                        onClick={() => props.onBatchExpandParts?.(s.id)}
                        title="Create draft pieces for all planned parts in this series"
                      >
                        <Sparkles size={12} aria-hidden="true" />
                        <span>Draft all planned ({planned})</span>
                      </button>
                    ) : null}
                    {props.onAddMultipleParts ? (
                      <button
                        type="button"
                        className="studio-btn studio-btn-quiet studio-btn-sm"
                        onClick={() => props.onAddMultipleParts?.(s.id, 3)}
                        title="Expand series with 3 new episode slots"
                      >
                        <Plus size={12} aria-hidden="true" />
                        <span>Expand (+3)</span>
                      </button>
                    ) : null}
                    {props.onBatchAddTitles ? (
                      <button
                        type="button"
                        className="studio-btn studio-btn-plain studio-btn-sm"
                        onClick={() => setBatchSeries(s)}
                        title="Paste multiple episode titles at once"
                      >
                        <ListPlus size={12} aria-hidden="true" />
                        <span>Batch add…</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="studio-scard-btn-group">
                    {/* Disband series button */}
                    <button
                      type="button"
                      className="studio-btn studio-btn-quiet studio-btn-sm"
                      onClick={() =>
                        setConfirm({
                          message: `Disband series “${s.title}”? This dissolves the series structure. All ${parts.length} pieces will remain safe in Pieces as standalone content.`,
                          label: "Disband Series",
                          run: () => props.onDisband(s.id),
                        })
                      }
                      title="Dissolve the series container while keeping all pieces safe"
                    >
                      <Unlink size={12} aria-hidden="true" />
                      <span>Disband series</span>
                    </button>

                    {/* Delete series button */}
                    <button
                      type="button"
                      className="studio-btn studio-btn-danger studio-btn-sm"
                      onClick={() =>
                        setConfirm({
                          message: `Delete the series “${s.title}”? Its pieces will stay safe in Pieces.`,
                          label: "Delete Series",
                          run: () => props.onDelete(s.id),
                        })
                      }
                      title="Permanently remove series container"
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      <span>Delete series</span>
                    </button>
                  </div>
                </div>
              </>
            )}
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

      <BatchEpisodesModal
        series={batchSeries}
        isOpen={Boolean(batchSeries)}
        onClose={() => setBatchSeries(null)}
        onSubmit={(sid, titles) => {
          props.onBatchAddTitles?.(sid, titles);
        }}
      />
    </div>
  );
}
