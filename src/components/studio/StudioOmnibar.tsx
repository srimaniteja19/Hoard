"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clapperboard,
  ClipboardPaste,
  Command,
  CornerDownLeft,
  Film,
  Layers,
  Lightbulb,
  Play,
  Plus,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import {
  FORMAT_LABEL,
  PILLAR_LABEL,
  STATUS_LABEL,
  type StudioData,
  type StudioIdea,
  type StudioPiece,
  type StudioSeries,
} from "@/lib/studio/types";

type OmnibarFilter = "all" | "pieces" | "series" | "ideas" | "actions";

export interface OmnibarAction {
  id: string;
  kind: "action";
  title: string;
  subtitle: string;
  icon: typeof Plus;
  run: () => void;
}

export interface OmnibarPieceItem {
  id: string;
  kind: "piece";
  piece: StudioPiece;
  seriesTitle?: string;
  matchSnippet?: string;
}

export interface OmnibarSeriesItem {
  id: string;
  kind: "series";
  series: StudioSeries;
  matchSnippet?: string;
}

export interface OmnibarIdeaItem {
  id: string;
  kind: "idea";
  idea: StudioIdea;
  matchSnippet?: string;
}

export type OmnibarItem =
  | OmnibarAction
  | OmnibarPieceItem
  | OmnibarSeriesItem
  | OmnibarIdeaItem;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: StudioData;
  onOpenPiece: (id: string) => void;
  onOpenSeries: (id: string) => void;
  onSelectView: (view: "pieces" | "series" | "ideas") => void;
  onNewPiece: () => void;
  onNewSeries: () => void;
  onQuickIdea: () => void;
  onPaste: () => void;
}

export function StudioOmnibar({
  isOpen,
  onClose,
  data,
  onOpenPiece,
  onOpenSeries,
  onSelectView,
  onNewPiece,
  onNewSeries,
  onQuickIdea,
  onPaste,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OmnibarFilter>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setFilter("all");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const seriesMap = useMemo(() => {
    return new Map(data.series.map((s) => [s.id, s.title]));
  }, [data.series]);

  // Actions catalog
  const actions: OmnibarAction[] = useMemo(
    () => [
      {
        id: "act-new-piece",
        kind: "action",
        title: "Create New Piece",
        subtitle: "Start a fresh Reel, Carousel or video draft",
        icon: Plus,
        run: () => {
          onClose();
          onNewPiece();
        },
      },
      {
        id: "act-new-series",
        kind: "action",
        title: "Create New Series",
        subtitle: "Orchestrate a multi-episode story arc",
        icon: Film,
        run: () => {
          onClose();
          onNewSeries();
        },
      },
      {
        id: "act-quick-idea",
        kind: "action",
        title: "Capture Quick Idea",
        subtitle: "Save a video concept or hook to your hopper",
        icon: Lightbulb,
        run: () => {
          onClose();
          onQuickIdea();
        },
      },
      {
        id: "act-paste",
        kind: "action",
        title: "Paste Everything (Claude / GPT)",
        subtitle: "Import script block with automatic field routing",
        icon: ClipboardPaste,
        run: () => {
          onClose();
          onPaste();
        },
      },
      {
        id: "act-view-pieces",
        kind: "action",
        title: "Go to Pieces Board",
        subtitle: `Browse all ${data.pieces.length} production pieces`,
        icon: Clapperboard,
        run: () => {
          onClose();
          onSelectView("pieces");
        },
      },
      {
        id: "act-view-series",
        kind: "action",
        title: "Go to Series Roadmaps",
        subtitle: `Browse all ${data.series.length} series architectures`,
        icon: Layers,
        run: () => {
          onClose();
          onSelectView("series");
        },
      },
      {
        id: "act-view-ideas",
        kind: "action",
        title: "Go to Ideas Hopper",
        subtitle: `Browse all ${data.ideas.length} brainstorming ideas`,
        icon: Sparkles,
        run: () => {
          onClose();
          onSelectView("ideas");
        },
      },
    ],
    [data.pieces.length, data.series.length, data.ideas.length, onClose, onNewPiece, onNewSeries, onQuickIdea, onPaste, onSelectView]
  );

  // Filtered search results
  const items: OmnibarItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: OmnibarItem[] = [];

    // 1. Actions
    if (filter === "all" || filter === "actions") {
      const matchedActions = !q
        ? actions
        : actions.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.subtitle.toLowerCase().includes(q)
          );
      result.push(...matchedActions);
    }

    // 2. Pieces
    if (filter === "all" || filter === "pieces") {
      for (const piece of data.pieces) {
        let matchSnippet: string | undefined;
        let matches = !q;

        if (q) {
          if (piece.title.toLowerCase().includes(q)) {
            matches = true;
          } else if (piece.caption.toLowerCase().includes(q)) {
            matches = true;
            matchSnippet = `Caption: “${piece.caption.slice(0, 100)}…”`;
          } else if (piece.notes.toLowerCase().includes(q)) {
            matches = true;
            matchSnippet = `Notes: “${piece.notes.slice(0, 100)}…”`;
          } else if (piece.hashtags.toLowerCase().includes(q)) {
            matches = true;
            matchSnippet = `Tags: ${piece.hashtags}`;
          } else {
            // Deep search spoken script & cards
            for (let i = 0; i < piece.script.length; i++) {
              const sc = piece.script[i];
              if (sc.text.toLowerCase().includes(q)) {
                matches = true;
                matchSnippet = `Scene ${i + 1}: “${sc.text.slice(0, 90)}…”`;
                break;
              }
              const cardMatch = sc.cards?.find((c) => c.toLowerCase().includes(q));
              if (cardMatch) {
                matches = true;
                matchSnippet = `Card: [${cardMatch}]`;
                break;
              }
            }
          }
        }

        if (matches) {
          result.push({
            id: `piece-${piece.id}`,
            kind: "piece",
            piece,
            seriesTitle: piece.seriesId ? seriesMap.get(piece.seriesId) : undefined,
            matchSnippet,
          });
        }
      }
    }

    // 3. Series
    if (filter === "all" || filter === "series") {
      for (const s of data.series) {
        let matchSnippet: string | undefined;
        let matches = !q;

        if (q) {
          if (s.title.toLowerCase().includes(q)) {
            matches = true;
          } else if (s.theme.toLowerCase().includes(q)) {
            matches = true;
            matchSnippet = `Theme: ${s.theme}`;
          } else {
            // Check parts
            const partMatch = s.parts.find((p) => p.title.toLowerCase().includes(q));
            if (partMatch) {
              matches = true;
              matchSnippet = `Part ${partMatch.n}: “${partMatch.title}”`;
            }
          }
        }

        if (matches) {
          result.push({
            id: `series-${s.id}`,
            kind: "series",
            series: s,
            matchSnippet,
          });
        }
      }
    }

    // 4. Ideas
    if (filter === "all" || filter === "ideas") {
      for (const idea of data.ideas) {
        let matchSnippet: string | undefined;
        let matches = !q;

        if (q) {
          if (idea.title.toLowerCase().includes(q)) {
            matches = true;
          } else if (idea.hook.toLowerCase().includes(q)) {
            matches = true;
            matchSnippet = `Hook: “${idea.hook.slice(0, 90)}…”`;
          }
        }

        if (matches) {
          result.push({
            id: `idea-${idea.id}`,
            kind: "idea",
            idea,
            matchSnippet,
          });
        }
      }
    }

    return result;
  }, [query, filter, actions, data.pieces, data.series, data.ideas, seriesMap]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  // Keep selected element visible
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(".studio-omni-item.is-selected");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const selectItem = (item: OmnibarItem) => {
    if (item.kind === "action") {
      item.run();
    } else if (item.kind === "piece") {
      onClose();
      onOpenPiece(item.piece.id);
    } else if (item.kind === "series") {
      onClose();
      onOpenSeries(item.series.id);
    } else if (item.kind === "idea") {
      onClose();
      onSelectView("ideas");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        selectItem(items[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const filters: OmnibarFilter[] = ["all", "pieces", "series", "ideas", "actions"];
      const nextIdx = (filters.indexOf(filter) + 1) % filters.length;
      setFilter(filters[nextIdx]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="studio-scrim studio-omni-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="studio-modal studio-omni-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Input Bar */}
        <div className="studio-omni-bar">
          <Search size={18} className="studio-omni-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="studio-omni-input"
            placeholder="Search pieces, spoken scripts, series, ideas, or actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="studio-omni-clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              title="Clear search"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
          <kbd className="studio-kbd">ESC</kbd>
        </div>

        {/* Filter Pills */}
        <div className="studio-omni-filters">
          {(
            [
              { id: "all", label: "All" },
              { id: "pieces", label: `Pieces (${data.pieces.length})` },
              { id: "series", label: `Series (${data.series.length})` },
              { id: "ideas", label: `Ideas (${data.ideas.length})` },
              { id: "actions", label: "Actions" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              className={`studio-omni-filter-chip ${filter === f.id ? "is-active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <ul className="studio-omni-list" ref={listRef} role="listbox">
          {!items.length ? (
            <li className="studio-omni-empty">
              No results found for “{query}”. Try another keyword or switch category.
            </li>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              if (item.kind === "action") {
                const Icon = item.icon;
                return (
                  <li
                    key={item.id}
                    className={`studio-omni-item is-action ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="studio-omni-item-icon is-action-icon">
                      <Icon size={14} aria-hidden="true" />
                    </div>
                    <div className="studio-omni-item-content">
                      <div className="studio-omni-item-title-row">
                        <strong className="studio-omni-item-title">{item.title}</strong>
                        <span className="studio-omni-tag is-action">ACTION</span>
                      </div>
                      <span className="studio-omni-item-sub">{item.subtitle}</span>
                    </div>
                    {isSelected ? (
                      <span className="studio-omni-hint">
                        <CornerDownLeft size={12} aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                );
              }

              if (item.kind === "piece") {
                const p = item.piece;
                return (
                  <li
                    key={item.id}
                    className={`studio-omni-item is-piece ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="studio-omni-item-icon is-piece-icon">
                      <Clapperboard size={14} aria-hidden="true" />
                    </div>
                    <div className="studio-omni-item-content">
                      <div className="studio-omni-item-title-row">
                        <strong className="studio-omni-item-title">{p.title}</strong>
                        <span className={`studio-omni-tag is-status-${p.status}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                        <span className="studio-omni-tag">{FORMAT_LABEL[p.format]}</span>
                        <span className="studio-omni-tag">{PILLAR_LABEL[p.pillar]}</span>
                      </div>
                      <div className="studio-omni-item-sub">
                        {item.seriesTitle ? (
                          <span className="studio-omni-series-badge">
                            {item.seriesTitle} · Part {p.part ?? 1}
                          </span>
                        ) : null}
                        {item.matchSnippet ? (
                          <span className="studio-omni-snippet">{item.matchSnippet}</span>
                        ) : p.notes ? (
                          <span>{p.notes.slice(0, 70)}</span>
                        ) : (
                          <span>{p.script.length} scenes drafted</span>
                        )}
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="studio-omni-hint">
                        <span>Open</span>
                        <CornerDownLeft size={12} aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                );
              }

              if (item.kind === "series") {
                const s = item.series;
                const isCompleted = s.status === "completed";
                return (
                  <li
                    key={item.id}
                    className={`studio-omni-item is-series ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="studio-omni-item-icon is-series-icon">
                      <Film size={14} aria-hidden="true" />
                    </div>
                    <div className="studio-omni-item-content">
                      <div className="studio-omni-item-title-row">
                        <strong className="studio-omni-item-title">{s.title}</strong>
                        <span className={`studio-omni-tag ${isCompleted ? "is-completed" : "is-active"}`}>
                          {isCompleted ? "COMPLETED" : "ACTIVE"}
                        </span>
                        <span className="studio-omni-tag">{s.parts.length} EPISODES</span>
                        {s.theme ? <span className="studio-omni-tag">{s.theme}</span> : null}
                      </div>
                      <div className="studio-omni-item-sub">
                        {item.matchSnippet ? (
                          <span className="studio-omni-snippet">{item.matchSnippet}</span>
                        ) : (
                          <span>{s.parts.map((p) => `P${p.n}: ${p.title}`).slice(0, 3).join(" · ")}</span>
                        )}
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="studio-omni-hint">
                        <span>Jump</span>
                        <CornerDownLeft size={12} aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                );
              }

              if (item.kind === "idea") {
                const idea = item.idea;
                return (
                  <li
                    key={item.id}
                    className={`studio-omni-item is-idea ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="studio-omni-item-icon is-idea-icon">
                      <Lightbulb size={14} aria-hidden="true" />
                    </div>
                    <div className="studio-omni-item-content">
                      <div className="studio-omni-item-title-row">
                        <strong className="studio-omni-item-title">{idea.title}</strong>
                        <span className="studio-omni-tag">{PILLAR_LABEL[idea.pillar]}</span>
                        <span className="studio-omni-tag">{FORMAT_LABEL[idea.format]}</span>
                      </div>
                      <div className="studio-omni-item-sub">
                        {item.matchSnippet ? (
                          <span className="studio-omni-snippet">{item.matchSnippet}</span>
                        ) : idea.hook ? (
                          <span>{idea.hook.slice(0, 80)}</span>
                        ) : (
                          <span>Idea in hopper</span>
                        )}
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="studio-omni-hint">
                        <span>View</span>
                        <CornerDownLeft size={12} aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                );
              }

              return null;
            })
          )}
        </ul>

        {/* Footer shortcuts */}
        <div className="studio-omni-foot">
          <span className="studio-omni-foot-hint">
            <kbd className="studio-kbd">↑</kbd> <kbd className="studio-kbd">↓</kbd> Navigate
          </span>
          <span className="studio-omni-foot-hint">
            <kbd className="studio-kbd">↵</kbd> Select
          </span>
          <span className="studio-omni-foot-hint">
            <kbd className="studio-kbd">Tab</kbd> Cycle Category
          </span>
          <span className="studio-omni-foot-hint">
            <kbd className="studio-kbd">ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
