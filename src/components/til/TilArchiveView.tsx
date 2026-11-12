"use client";

import React, { useState, useMemo } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { TilType, tilTypeValues } from "@/db/schema";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import {
  Archive,
  Search,
  Download,
  Copy,
  Check,
  RotateCcw,
  GitBranch,
  CheckCircle2,
  Calendar,
  Trash2,
  ExternalLink,
  List,
  LayoutList,
  ChevronDown,
  ChevronRight,
  Code2,
  X,
} from "lucide-react";

export type TilArchiveSubFilter =
  | "all"
  | "superseded"
  | "mastered"
  | "code"
  | "discharged"
  | "timeline";

interface TilArchiveViewProps {
  items: TilItem[];
  onUpdate: (id: string, updated: Partial<TilItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelectTag?: (tag: string) => void;
  onSelectType?: (type: TilType) => void;
}

interface ParsedDayMeta {
  dateKey: string;
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
    headline: firstLine.length > 115 ? `${firstLine.slice(0, 112)}...` : firstLine,
    subline: secondLine
      ? secondLine.length > 105
        ? `${secondLine.slice(0, 102)}...`
        : secondLine
      : null,
  };
}

export const TilArchiveView: React.FC<TilArchiveViewProps> = ({
  items,
  onUpdate,
  onDelete,
  onSelectTag,
}) => {
  const [subFilter, setSubFilter] = useState<TilArchiveSubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<TilType | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);
  const [activeCapsuleMonth, setActiveCapsuleMonth] = useState<string | null>(null);
  const [viewDensity, setViewDensity] = useState<"index" | "cards">("index");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const supersededItems = useMemo(
    () => items.filter((it) => Boolean(it.supersededById)),
    [items]
  );

  const masteredItems = useMemo(
    () =>
      items.filter(
        (it) =>
          (it.stability && it.stability >= 3) ||
          (it.reviewCount && it.reviewCount >= 3) ||
          (it.confidence && it.confidence >= 0.8)
      ),
    [items]
  );

  const codeSnippetItems = useMemo(
    () => items.filter((it) => Boolean(it.code && it.code.trim().length > 0)),
    [items]
  );

  const dischargedItems = useMemo(
    () => items.filter((it) => Boolean(it.dischargesBookmarkId)),
    [items]
  );

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    codeSnippetItems.forEach((it) => {
      if (it.codeLang) set.add(it.codeLang.toLowerCase());
    });
    return Array.from(set).sort();
  }, [codeSnippetItems]);

  const timelineCapsules = useMemo(() => {
    const map = new Map<string, TilItem[]>();
    items.forEach((it) => {
      const month = it.loggedFor ? it.loggedFor.slice(0, 7) : "Undated";
      const list = map.get(month) || [];
      list.push(it);
      map.set(month, list);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  const baseList = useMemo(() => {
    let list: TilItem[];
    switch (subFilter) {
      case "superseded":
        list = supersededItems;
        break;
      case "mastered":
        list = masteredItems;
        break;
      case "code":
        list = codeSnippetItems;
        break;
      case "discharged":
        list = dischargedItems;
        break;
      case "timeline":
      case "all":
      default:
        list = items;
        break;
    }
    if (activeCapsuleMonth) {
      list = list.filter((it) => it.loggedFor?.startsWith(activeCapsuleMonth));
    }
    return list;
  }, [
    subFilter,
    supersededItems,
    masteredItems,
    codeSnippetItems,
    dischargedItems,
    activeCapsuleMonth,
    items,
  ]);

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter((it) => {
      if (selectedType && it.type !== selectedType) return false;
      if (selectedLanguage && it.codeLang?.toLowerCase() !== selectedLanguage.toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = `${it.shortHash} ${it.body || ""} ${it.code || ""} ${
          it.tags?.join(" ") || ""
        } ${it.linkPreview?.title || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [baseList, selectedType, selectedLanguage, searchQuery]);

  // Group filtered vault items by Day & Date (YYYY-MM-DD)
  const dayGroups = useMemo(() => {
    const map = new Map<string, TilItem[]>();
    for (const item of filteredList) {
      const key = item.loggedFor || "Undated";
      const bucket = map.get(key) || [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return Array.from(map.entries())
      .map(([dateKey, dayItems]) => ({
        dateKey,
        meta: parseDayMeta(dateKey),
        items: dayItems,
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredList]);

  const handleExportMarkdown = () => {
    let md = `# HOARD TIL KNOWLEDGE VAULT\n`;
    md += `Exported on ${new Date().toLocaleDateString()} • Total Insights: ${filteredList.length}\n\n`;
    md += `---\n\n`;

    filteredList.forEach((it) => {
      md += `### [${it.shortHash}] ${it.type} (${it.loggedFor})\n`;
      if (it.tags && it.tags.length > 0) {
        md += `Tags: ${it.tags.map((t) => `#${t}`).join(" ")}\n\n`;
      }
      if (it.body) {
        md += `${it.body}\n\n`;
      }
      if (it.code) {
        md += `\`\`\`${it.codeLang || "text"}\n${it.code}\n\`\`\`\n\n`;
      }
      if (it.linkUrl) {
        md += `Source: [${it.linkPreview?.title || it.linkUrl}](${it.linkUrl})\n\n`;
      }
      if (it.supersededById) {
        md += `> [SUPERSEDED] Replaced by knowledge entry #${it.supersededById}\n\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hoard-til-vault-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const handleCopySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderVaultCard = (it: TilItem) => {
    const isSuperseded = Boolean(it.supersededById);
    const isMastered =
      (it.stability && it.stability >= 3) || (it.confidence && it.confidence >= 0.8);

    return (
      <article
        key={it.id}
        className={`til-archive-card ${isSuperseded ? "is-superseded" : ""}`}
      >
        <div className="til-archive-card__head">
          <div className="til-archive-card__head-left">
            <span className={`til-index-row__type type--${it.type.toLowerCase()}`}>
              {it.type}
            </span>
            <span className="til-archive-card__hash">#{it.shortHash}</span>
            <span className="til-archive-card__date">{it.loggedFor}</span>
          </div>

          <div className="til-archive-card__head-right">
            {isMastered && (
              <span className="til-archive-badge til-archive-badge--mastered">
                <CheckCircle2 size={10} /> MASTERED
              </span>
            )}
            {isSuperseded && (
              <span className="til-archive-badge til-archive-badge--superseded">
                <GitBranch size={10} /> SUPERSEDED BY #{it.supersededById}
              </span>
            )}
          </div>
        </div>

        <div className="til-archive-card__body">
          {it.body && (
            <div className="til-archive-card__prose">
              <MarkdownLite content={it.body} />
            </div>
          )}

          {it.code && (
            <div className="til-archive-code">
              <div className="til-archive-code__bar">
                <span>{it.codeLang || "code"}</span>
                <button
                  type="button"
                  onClick={() => handleCopySnippet(it.code!, it.id)}
                  className="til-archive-code__copy"
                >
                  {copiedId === it.id ? <Check size={10} /> : <Copy size={10} />}
                  <span>{copiedId === it.id ? "COPIED" : "COPY"}</span>
                </button>
              </div>
              <pre className="til-archive-code__pre">
                <code>{it.code}</code>
              </pre>
            </div>
          )}

          {it.linkUrl && (
            <a
              href={it.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="til-archive-card__link"
            >
              <ExternalLink size={12} />
              <span>{it.linkPreview?.title || it.linkUrl}</span>
            </a>
          )}
        </div>

        <div className="til-archive-card__foot">
          <div className="til-archive-card__tags">
            {it.tags &&
              it.tags.map((tg) => (
                <button
                  key={tg}
                  type="button"
                  onClick={() => onSelectTag?.(tg)}
                  className="til-index-tag"
                >
                  #{tg}
                </button>
              ))}
          </div>

          <div className="til-archive-card__actions">
            {isSuperseded && (
              <button
                type="button"
                onClick={() => onUpdate(it.id, { supersededById: null })}
                className="til-archive-action-btn"
                title="Reactivate this insight as current"
              >
                <RotateCcw size={11} /> REVIVE
              </button>
            )}

            <button
              type="button"
              onClick={() => onDelete(it.id)}
              className="til-archive-delete-btn"
              title="Delete insight"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="til-archive-container">
      {/* ─── Vault Masthead ──────────────────────────────────────────────── */}
      <header className="til-secondary-masthead">
        <div className="til-secondary-masthead__left">
          <div className="til-secondary-masthead__title-row">
            <h2 className="til-secondary-masthead__title">
              ARCHIVE // KNOWLEDGE VAULT & LINEAGE
            </h2>
            <span className="til-secondary-masthead__badge">COMPENDIUM</span>
          </div>
          <p className="til-secondary-masthead__desc">
            Searchable ledger of all filed insights, code snippets, superseded evolution chains, and mastered recall cards organized by day and date.
          </p>
        </div>

        <div className="til-secondary-masthead__right">
          <div className="til-secondary-telemetry">
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{items.length}</span>
              <span className="til-secondary-stat__lbl">TOTAL</span>
            </div>
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{supersededItems.length}</span>
              <span className="til-secondary-stat__lbl">SUPERSEDED</span>
            </div>
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{masteredItems.length}</span>
              <span className="til-secondary-stat__lbl">MASTERED</span>
            </div>
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{codeSnippetItems.length}</span>
              <span className="til-secondary-stat__lbl">CODE</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportMarkdown}
            className="til-secondary-action-btn"
          >
            {copiedExport ? <Check size={13} /> : <Download size={13} />}
            <span>{copiedExport ? "EXPORTED MD" : "EXPORT VAULT (.MD)"}</span>
          </button>
        </div>
      </header>

      {/* ─── 2-Column Vault Workspace ────────────────────────────────────── */}
      <div className="til-codex">
        {/* Left Sidebar: Vault Partitions & Time Capsules */}
        <aside className="til-codex-index" aria-label="Vault Partitions and Filters">
          <div className="til-codex-index-head">
            <div className="til-codex-index-title">
              <Archive size={14} strokeWidth={2.5} />
              <span>VAULT PARTITIONS</span>
              <span className="til-codex-count-badge">{filteredList.length}</span>
            </div>
          </div>

          <div className="til-archive-sidebar-body">
            {/* Partition Tabs */}
            <div className="til-archive-partition-list">
              {[
                { id: "all", label: "ALL INSIGHTS", count: items.length },
                { id: "superseded", label: "EVOLUTION / SUPERSEDED", count: supersededItems.length },
                { id: "mastered", label: "MASTERED RECALL", count: masteredItems.length },
                { id: "code", label: "CODE SNIPPET VAULT", count: codeSnippetItems.length },
                { id: "discharged", label: "DISCHARGED SOURCES", count: dischargedItems.length },
              ].map((tab) => {
                const isActive = subFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`til-archive-partition-btn ${isActive ? "on" : ""}`}
                    onClick={() => setSubFilter(tab.id as TilArchiveSubFilter)}
                  >
                    <span>{tab.label}</span>
                    <span className="til-topic-count-pill">{tab.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Month Time Capsules */}
            {timelineCapsules.length > 0 && (
              <div className="til-archive-sidebar-section">
                <div className="til-archive-sidebar-section__head">
                  <Calendar size={11} />
                  <span>MONTH CAPSULES</span>
                  {activeCapsuleMonth && (
                    <button
                      type="button"
                      className="til-archive-clear-mini"
                      onClick={() => setActiveCapsuleMonth(null)}
                    >
                      ALL
                    </button>
                  )}
                </div>
                <div className="til-archive-capsule-pills">
                  {timelineCapsules.map(([month, capsuleItems]) => {
                    const isSel = activeCapsuleMonth === month;
                    return (
                      <button
                        key={month}
                        type="button"
                        className={`til-codex-date-pill ${isSel ? "on" : ""}`}
                        onClick={() => setActiveCapsuleMonth(isSel ? null : month)}
                      >
                        {month} ({capsuleItems.length})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Archetype Filter */}
            <div className="til-archive-sidebar-section">
              <div className="til-archive-sidebar-section__head">
                <span>ARCHETYPE FILTER</span>
                {selectedType && (
                  <button
                    type="button"
                    className="til-archive-clear-mini"
                    onClick={() => setSelectedType(null)}
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <div className="til-archive-capsule-pills">
                {tilTypeValues.map((t) => {
                  const isSel = selectedType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`til-codex-date-pill ${isSel ? "on" : ""}`}
                      onClick={() => setSelectedType(isSel ? null : t)}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Languages Filter */}
            {availableLanguages.length > 0 && (
              <div className="til-archive-sidebar-section">
                <div className="til-archive-sidebar-section__head">
                  <Code2 size={11} />
                  <span>CODE LANGUAGES</span>
                </div>
                <div className="til-archive-capsule-pills">
                  {availableLanguages.map((lang) => {
                    const isSel = selectedLanguage === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        className={`til-codex-date-pill ${isSel ? "on" : ""}`}
                        onClick={() => setSelectedLanguage(isSel ? null : lang)}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Pane: Search & Date-Categorized Ledger */}
        <main className="til-codex-page">
          {/* Top Control Bar */}
          <div className="til-archive-toolbar">
            <div className="til-codex-entry-filter-bar til-archive-search">
              <Search size={13} className="til-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vault by keyword, code, #tag, or #hash..."
                className="til-codex-entry-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="til-search-clear-btn"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="til-view-density-toggle" role="group" aria-label="Vault display mode">
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
                <span>VAULT CARDS</span>
              </button>
            </div>
          </div>

          {/* Date-Grouped Vault Entries */}
          {dayGroups.length === 0 ? (
            <div className="til-codex-no-entries">
              NO MATCHING INSIGHTS IN VAULT. TRY CLEARING ACTIVE FILTERS.
            </div>
          ) : (
            <div className="til-codex-entries-list">
              {dayGroups.map((group) => (
                <section key={group.dateKey} className="til-day-folio">
                  <div className="til-day-folio__header">
                    <div className="til-day-folio__leaf">
                      <span className="til-day-folio__leaf-month">{group.meta.monthShort}</span>
                      <span className="til-day-folio__leaf-num">{group.meta.dayNum}</span>
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
                          {group.items.length === 1 ? "archived insight" : "archived insights"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="til-day-folio__body">
                    {viewDensity === "index" ? (
                      <div className="til-day-index-table">
                        {group.items.map((it, idx) => {
                          const isExpanded = expandedIds.has(it.id);
                          const { headline, subline } = extractEntryHeadline(it);
                          const typeLower = it.type.toLowerCase();
                          const isSuperseded = Boolean(it.supersededById);

                          return (
                            <div
                              key={it.id}
                              className={`til-index-item ${isExpanded ? "is-expanded" : ""}`}
                            >
                              <div
                                className={`til-index-row til-index-row--${typeLower}`}
                                role="button"
                                tabIndex={0}
                                aria-expanded={isExpanded}
                                onClick={() => toggleExpand(it.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleExpand(it.id);
                                  }
                                }}
                              >
                                <span className="til-index-row__num">
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <span className={`til-index-row__type type--${typeLower}`}>
                                  {it.type}
                                </span>
                                <div className="til-index-row__main">
                                  <span className="til-index-row__headline">{headline}</span>
                                  {subline && !isExpanded && (
                                    <span className="til-index-row__subline"> — {subline}</span>
                                  )}
                                </div>
                                {isSuperseded && (
                                  <span className="til-archive-badge til-archive-badge--superseded">
                                    SUPERSEDED
                                  </span>
                                )}
                                {it.tags && it.tags.length > 0 && (
                                  <div
                                    className="til-index-row__tags"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {it.tags.slice(0, 3).map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        className="til-index-tag"
                                        onClick={() => onSelectTag?.(t)}
                                      >
                                        #{t}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <span className="til-index-row__hash">#{it.shortHash}</span>
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
                                  {renderVaultCard(it)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="til-archive-cards-grid">
                        {group.items.map((it) => renderVaultCard(it))}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
