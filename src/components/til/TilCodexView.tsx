"use client";

import React, { useState, useMemo } from "react";
import { TilFeedItem, TilItem } from "./TilFeedItem";
import {
  Search,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  X,
  List,
  LayoutList,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Code2,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

export interface CodexTopicSummary {
  tag: string;
  color?: string | null;
  entryCount: number;
  averageConfidence: number;
}

export interface CodexTopicDetail {
  name: string;
  entryCount: number;
  averageConfidence: number;
  firstLoggedFor?: string | null;
  lastLoggedFor?: string | null;
  spanDays?: number;
  entries: Array<TilItem & { alsoSeeTags?: string[] }>;
}

interface TilCodexViewProps {
  index: CodexTopicSummary[];
  activeTopic: CodexTopicDetail | null;
  selectedTopic: string | null;
  onSelectTopic: (tag: string) => void;
  onUpdate: (id: string, updated: Partial<TilItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  validHashes?: Set<string>;
}

type TopicSortMode = "count" | "alpha";
type CodexViewDensity = "index" | "cards";
type CodexSortOrder = "newest" | "oldest";

interface ParsedDayMeta {
  dateKey: string;
  weekdayShort: string;
  weekdayLong: string;
  monthShort: string;
  dayNum: string;
  year: string;
  fullFormatted: string;
}

function parseDayMeta(dateStr: string): ParsedDayMeta {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return {
      dateKey: dateStr,
      weekdayShort: "DAY",
      weekdayLong: "Archive Entry",
      monthShort: "LOG",
      dayNum: "--",
      year: "",
      fullFormatted: dateStr,
    };
  }
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  return {
    dateKey: dateStr,
    weekdayShort: dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    weekdayLong: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
    monthShort: dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    dayNum: String(d).padStart(2, "0"),
    year: String(y),
    fullFormatted: dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function extractEntryHeadline(item: TilItem): { headline: string; subline: string | null } {
  const raw = (item.body || "").trim();
  if (!raw) {
    if (item.linkPreview?.title) {
      return { headline: item.linkPreview.title, subline: item.linkUrl || null };
    }
    if (item.code) {
      const firstCodeLine = item.code.trim().split("\n")[0] || "Code snippet";
      return { headline: firstCodeLine, subline: item.codeLang ? `Language: ${item.codeLang}` : null };
    }
    return { headline: `Untitled ${item.type} entry`, subline: null };
  }

  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/^>\s*/, "").trim())
    .filter(Boolean);

  const firstLine = (lines[0] || raw).replace(/\*\*/g, "").replace(/`/g, "");
  const secondLine = lines.length > 1 ? lines[1].replace(/\*\*/g, "").replace(/`/g, "") : null;

  return {
    headline: firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine,
    subline: secondLine
      ? secondLine.length > 110
        ? `${secondLine.slice(0, 107)}...`
        : secondLine
      : null,
  };
}

export const TilCodexView: React.FC<TilCodexViewProps> = ({
  index,
  activeTopic,
  selectedTopic,
  onSelectTopic,
  onUpdate,
  onDelete,
  validHashes,
}) => {
  const [topicSearch, setTopicSearch] = useState("");
  const [entrySearch, setEntrySearch] = useState("");
  const [sortMode, setSortMode] = useState<TopicSortMode>("count");
  const [viewDensity, setViewDensity] = useState<CodexViewDensity>("cards");
  const [sortOrder, setSortOrder] = useState<CodexSortOrder>("newest");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set());

  const filteredAndSortedTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    const list = q
      ? index.filter((t) => (t.tag ?? "").toLowerCase().includes(q))
      : [...index];

    list.sort((a, b) => {
      if (sortMode === "count") return b.entryCount - a.entryCount;
      return (a.tag ?? "").localeCompare(b.tag ?? "");
    });

    return list;
  }, [index, topicSearch, sortMode]);

  const filteredActiveEntries = useMemo(() => {
    if (!activeTopic) return [];
    const q = entrySearch.trim().toLowerCase();
    let list = activeTopic.entries;
    if (q) {
      list = list.filter(
        (e) =>
          (e.body && e.body.toLowerCase().includes(q)) ||
          (e.code && e.code.toLowerCase().includes(q)) ||
          (e.shortHash && e.shortHash.toLowerCase().includes(q)) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [activeTopic, entrySearch]);

  // Group topic entries by Day & Date (YYYY-MM-DD)
  const dayGroups = useMemo(() => {
    const map = new Map<string, Array<TilItem & { alsoSeeTags?: string[] }>>();
    for (const entry of filteredActiveEntries) {
      const key = entry.loggedFor || "Undated";
      const bucket = map.get(key) || [];
      bucket.push(entry);
      map.set(key, bucket);
    }

    const entries = Array.from(map.entries()).map(([dateKey, items]) => ({
      dateKey,
      meta: parseDayMeta(dateKey),
      items,
    }));

    entries.sort((a, b) =>
      sortOrder === "newest"
        ? b.dateKey.localeCompare(a.dateKey)
        : a.dateKey.localeCompare(b.dateKey)
    );

    return entries;
  }, [filteredActiveEntries, sortOrder]);

  const visibleDayGroups = useMemo(() => {
    if (!selectedDateKey) return dayGroups;
    return dayGroups.filter((g) => g.dateKey === selectedDateKey);
  }, [dayGroups, selectedDateKey]);

  const toggleExpandEntry = (id: string) => {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="til-codex-container">
      <div className="til-codex">
        {/* ─── Left Pane: Topic Index Dossier ────────────────────────────── */}
        <aside className="til-codex-index" aria-label="Codex Topic Index">
          <div className="til-codex-index-head">
            <div className="til-codex-index-title">
              <BookOpen size={14} strokeWidth={2.5} />
              <span>CODEX // TOPICS</span>
              <span className="til-codex-count-badge">{index.length}</span>
            </div>

            <div className="til-codex-sort-pills til-codex-sort-pills--two" role="group" aria-label="Sort topics">
              <button
                type="button"
                className={`til-sort-pill ${sortMode === "count" ? "on" : ""}`}
                onClick={() => setSortMode("count")}
                title="Sort by entry volume"
              >
                VOLUME
              </button>
              <button
                type="button"
                className={`til-sort-pill ${sortMode === "alpha" ? "on" : ""}`}
                onClick={() => setSortMode("alpha")}
                title="Sort alphabetically"
              >
                A–Z
              </button>
            </div>

            <div className="til-codex-search-box">
              <Search size={12} className="til-search-icon" />
              <input
                type="text"
                placeholder="Filter topics..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="til-codex-search-input"
              />
              {topicSearch && (
                <button
                  type="button"
                  onClick={() => setTopicSearch("")}
                  className="til-search-clear-btn"
                  aria-label="Clear topic filter"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          <div className="til-codex-index-scroll">
            {filteredAndSortedTopics.length === 0 ? (
              <div className="til-codex-empty-topics">
                {index.length === 0 ? "NO TOPICS INDEXED YET." : "NO MATCHING TOPICS."}
              </div>
            ) : (
              filteredAndSortedTopics.map((t, idx) => {
                const topicLabel = t.tag ?? "";
                const activeName = activeTopic?.name ?? "";
                const isSelected =
                  (selectedTopic && selectedTopic.toLowerCase() === topicLabel.toLowerCase()) ||
                  (!selectedTopic && activeName.toLowerCase() === topicLabel.toLowerCase());

                return (
                  <button
                    key={topicLabel || idx}
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(null);
                      onSelectTopic(topicLabel);
                    }}
                    className={`til-codex-topic-row ${isSelected ? "selected" : ""}`}
                  >
                    <div className="til-codex-topic-content">
                      <div className="til-codex-topic-top">
                        <span className="til-codex-topic-name">
                          <span className="til-codex-topic-rank">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          #{topicLabel}
                        </span>
                        <div className="til-codex-topic-badges">
                          <span className="til-topic-count-pill">{t.entryCount}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── Right Pane: Topic Chronicle & Day Folios ──────────────────── */}
        <main className="til-codex-page">
          {!activeTopic ? (
            <div className="til-codex-directory">
              <div className="til-codex-placeholder">
                <div className="til-codex-placeholder-icon">
                  <BookOpen size={26} strokeWidth={2.2} />
                </div>
                <h2 className="til-codex-placeholder-title">
                  {index.length === 0 ? "YOUR KNOWLEDGE CODEX IS EMPTY" : "SELECT A TOPIC DOSSIER"}
                </h2>
                <p className="til-codex-placeholder-sub">
                  {index.length === 0
                    ? "Tag your daily TIL entries with #topics in the Stream to automatically assemble topical dossiers organized by day and date."
                    : "Choose any #topic from the left index or click a dossier card below to inspect its chronological learning arc."}
                </p>
              </div>

              {index.length > 0 && (
                <div className="til-codex-directory-grid">
                  {filteredAndSortedTopics.slice(0, 18).map((t, idx) => {
                    const topicLabel = t.tag ?? "";
                    return (
                      <button
                        key={topicLabel || idx}
                        type="button"
                        className="til-codex-directory-card"
                        onClick={() => onSelectTopic(topicLabel)}
                      >
                        <div className="til-codex-directory-card__top">
                          <span className="til-codex-directory-card__name">#{topicLabel}</span>
                          <span className="til-codex-directory-card__count">
                            {t.entryCount} {t.entryCount === 1 ? "ENTRY" : "ENTRIES"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="til-codex-content">
              {/* Topic Masthead Header */}
              <div className="til-codex-hero-header">
                <div className="til-codex-hero-top">
                  <h2 className="til-codex-hero-tag-badge">
                    <span className="til-hash-symbol">#</span>
                    {activeTopic.name}
                  </h2>

                  <div className="til-codex-hero-controls">
                    <button
                      type="button"
                      className="til-codex-order-btn"
                      onClick={() =>
                        setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
                      }
                      title="Switch chronological order"
                    >
                      <ArrowUpDown size={11} />
                      <span>{sortOrder === "newest" ? "NEWEST FIRST" : "KNOWLEDGE ARC"}</span>
                    </button>

                    <div className="til-view-density-toggle" role="group" aria-label="Topic entry density">
                      <button
                        type="button"
                        className={`til-density-btn ${viewDensity === "index" ? "on" : ""}`}
                        onClick={() => setViewDensity("index")}
                      >
                        <List size={12} />
                        <span>INDEX BY DATE</span>
                      </button>
                      <button
                        type="button"
                        className={`til-density-btn ${viewDensity === "cards" ? "on" : ""}`}
                        onClick={() => setViewDensity("cards")}
                      >
                        <LayoutList size={12} />
                        <span>FULL CARDS</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Telemetry & Search Strip */}
                <div className="til-codex-toolbar-row">
                  <div className="til-codex-stats-strip">
                    <span className="til-codex-stat-item">
                      <Layers size={12} />
                      <b>{activeTopic.entryCount}</b>{" "}
                      {activeTopic.entryCount === 1 ? "INSIGHT" : "INSIGHTS"}
                    </span>
                    <span className="til-stat-dot">·</span>
                    <span className="til-codex-stat-item">
                      <Calendar size={12} />
                      <b>{dayGroups.length}</b> {dayGroups.length === 1 ? "DAY" : "DAYS"} LOGGED
                    </span>
                    {activeTopic.firstLoggedFor && (
                      <>
                        <span className="til-stat-dot">·</span>
                        <span className="til-codex-stat-item">
                          SPAN: <b>{activeTopic.firstLoggedFor}</b> →{" "}
                          <b>{activeTopic.lastLoggedFor}</b>
                        </span>
                      </>
                    )}
                  </div>

                  {activeTopic.entries.length > 1 && (
                    <div className="til-codex-entry-filter-bar">
                      <Search size={12} className="til-search-icon" />
                      <input
                        type="text"
                        placeholder={`Search within #${activeTopic.name}...`}
                        value={entrySearch}
                        onChange={(e) => setEntrySearch(e.target.value)}
                        className="til-codex-entry-search-input"
                      />
                      {entrySearch && (
                        <button
                          type="button"
                          onClick={() => setEntrySearch("")}
                          className="til-search-clear-btn"
                          aria-label="Clear search"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Date Pills Bar when topic spans multiple dates */}
                {dayGroups.length > 1 && (
                  <div className="til-codex-date-pills">
                    <span className="til-codex-date-pills__lbl">
                      <Calendar size={11} /> DATES IN #{activeTopic.name.toUpperCase()}:
                    </span>
                    <button
                      type="button"
                      className={`til-codex-date-pill ${selectedDateKey === null ? "on" : ""}`}
                      onClick={() => setSelectedDateKey(null)}
                    >
                      ALL DATES ({filteredActiveEntries.length})
                    </button>
                    {dayGroups.map((group) => (
                      <button
                        key={group.dateKey}
                        type="button"
                        className={`til-codex-date-pill ${
                          selectedDateKey === group.dateKey ? "on" : ""
                        }`}
                        onClick={() =>
                          setSelectedDateKey(
                            selectedDateKey === group.dateKey ? null : group.dateKey
                          )
                        }
                      >
                        {group.meta.monthShort} {group.meta.dayNum}, {group.meta.year} (
                        {group.items.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date-Categorized Topic Entries */}
              <div className="til-codex-entries-list">
                {visibleDayGroups.length === 0 ? (
                  <div className="til-codex-no-entries">
                    No insights in #{activeTopic.name} matched your filter.
                  </div>
                ) : (
                  visibleDayGroups.map((group) => (
                    <section key={group.dateKey} className="til-day-folio">
                      <div className="til-day-folio__header">
                        <div className="til-day-folio__leaf">
                          <span className="til-day-folio__leaf-month">
                            {group.meta.monthShort}
                          </span>
                          <span className="til-day-folio__leaf-num">
                            {group.meta.dayNum}
                          </span>
                        </div>
                        <div className="til-day-folio__title-wrap">
                          <div className="til-day-folio__title-row">
                            <h3 className="til-day-folio__title">
                              {group.meta.weekdayLong}, {group.meta.fullFormatted}
                            </h3>
                          </div>
                          <div className="til-day-folio__sub">
                            <span>{group.dateKey}</span>
                            <span className="til-day-folio__sep">·</span>
                            <span>
                              {group.items.length}{" "}
                              {group.items.length === 1 ? "insight" : "insights"} in #
                              {activeTopic.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="til-day-folio__body">
                        {viewDensity === "index" ? (
                          <div className="til-day-index-table">
                            {group.items.map((item, idx) => {
                              const isExpanded = expandedEntryIds.has(item.id);
                              const { headline, subline } = extractEntryHeadline(item);
                              const typeLower = item.type.toLowerCase();

                              return (
                                <div
                                  key={item.id}
                                  className={`til-index-item ${isExpanded ? "is-expanded" : ""}`}
                                >
                                  <div
                                    className={`til-index-row til-index-row--${typeLower}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isExpanded}
                                    onClick={() => toggleExpandEntry(item.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleExpandEntry(item.id);
                                      }
                                    }}
                                  >
                                    <span className="til-index-row__num">
                                      {String(idx + 1).padStart(2, "0")}
                                    </span>
                                    <span className={`til-index-row__type type--${typeLower}`}>
                                      {item.type}
                                    </span>
                                    <div className="til-index-row__main">
                                      <span className="til-index-row__headline">{headline}</span>
                                      {subline && !isExpanded && (
                                        <span className="til-index-row__subline">
                                          {" "}
                                          — {subline}
                                        </span>
                                      )}
                                    </div>
                                    <div className="til-index-row__indicators">
                                      {item.code && (
                                        <span className="til-index-indicator">
                                          <Code2 size={11} />
                                          {item.codeLang ? <b>{item.codeLang}</b> : null}
                                        </span>
                                      )}
                                      {item.imageUrl && (
                                        <span className="til-index-indicator">
                                          <ImageIcon size={11} />
                                        </span>
                                      )}
                                      {item.linkUrl && (
                                        <span className="til-index-indicator">
                                          <ExternalLink size={11} />
                                        </span>
                                      )}
                                    </div>
                                    {item.alsoSeeTags && item.alsoSeeTags.length > 0 && (
                                      <div
                                        className="til-index-row__tags"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {item.alsoSeeTags.slice(0, 3).map((t) => (
                                          <button
                                            key={t}
                                            type="button"
                                            className="til-index-tag"
                                            onClick={() => onSelectTopic(t)}
                                            title={`Jump to #${t}`}
                                          >
                                            #{t}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <span className="til-index-row__hash">#{item.shortHash}</span>
                                    <span className="til-index-row__expand-icon">
                                      {isExpanded ? (
                                        <ChevronDown size={14} />
                                      ) : (
                                        <ChevronRight size={14} />
                                      )}
                                    </span>
                                  </div>

                                  {isExpanded && (
                                    <div className="til-index-item__expanded-card">
                                      <TilFeedItem
                                        item={item}
                                        onUpdate={onUpdate}
                                        onDelete={onDelete}
                                        onSelectTag={onSelectTopic}
                                        validHashes={validHashes}
                                      />
                                      {item.alsoSeeTags && item.alsoSeeTags.length > 0 && (
                                        <div className="til-codex-also-see">
                                          <span className="til-also-see-label">
                                            <ArrowRight size={11} /> ALSO FILED UNDER:
                                          </span>
                                          <div className="til-also-see-tags">
                                            {item.alsoSeeTags.map((t) => (
                                              <button
                                                key={t}
                                                type="button"
                                                onClick={() => onSelectTopic(t)}
                                                className="til-also-see-btn"
                                                title={`Jump to topic #${t}`}
                                              >
                                                #{t}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="til-day-cards-stack">
                            {group.items.map((item) => (
                              <div key={item.id} className="til-codex-entry-wrapper">
                                <TilFeedItem
                                  item={item}
                                  onUpdate={onUpdate}
                                  onDelete={onDelete}
                                  onSelectTag={onSelectTopic}
                                  validHashes={validHashes}
                                />
                                {item.alsoSeeTags && item.alsoSeeTags.length > 0 && (
                                  <div className="til-codex-also-see">
                                    <span className="til-also-see-label">
                                      <ArrowRight size={11} /> ALSO FILED UNDER:
                                    </span>
                                    <div className="til-also-see-tags">
                                      {item.alsoSeeTags.map((t) => (
                                        <button
                                          key={t}
                                          type="button"
                                          onClick={() => onSelectTopic(t)}
                                          className="til-also-see-btn"
                                          title={`Jump to topic #${t}`}
                                        >
                                          #{t}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
