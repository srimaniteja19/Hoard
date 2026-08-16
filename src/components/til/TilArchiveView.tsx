"use client";

import React, { useState, useMemo } from "react";
import { TilItem } from "@/components/til/TilFeedItem";
import { TilType, tilTypeValues } from "@/db/schema";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import {
  Archive,
  BookOpen,
  Code,
  Sparkles,
  Search,
  Download,
  Copy,
  Check,
  RotateCcw,
  Zap,
  GitBranch,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  ExternalLink,
  ShieldAlert,
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

const TYPE_COLORS: Record<TilType, string> = {
  FACT: "#00F0FF",
  GOTCHA: "#FF007A",
  SNIPPET: "#FFE600",
  PATTERN: "#B6FF3C",
  QUOTE: "#9D4EDD",
  OPINION: "#FF9100",
  LINK: "#7209B7",
};

export const TilArchiveView: React.FC<TilArchiveViewProps> = ({
  items,
  onUpdate,
  onDelete,
  onSelectTag,
  onSelectType,
}) => {
  const [subFilter, setSubFilter] = useState<TilArchiveSubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<TilType | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);
  const [activeCapsuleMonth, setActiveCapsuleMonth] = useState<string | null>(null);

  // Quick lookup map for shortHash / ID to find superseded parents
  const itemMap = useMemo(() => {
    const map = new Map<string, TilItem>();
    items.forEach((it) => {
      map.set(it.id, it);
      map.set(it.shortHash.toLowerCase(), it);
    });
    return map;
  }, [items]);

  // Partitions
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

  // Available Code Languages
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    codeSnippetItems.forEach((it) => {
      if (it.codeLang) set.add(it.codeLang.toLowerCase());
    });
    return Array.from(set).sort();
  }, [codeSnippetItems]);

  // Timeline capsules grouping (by YYYY-MM)
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

  // Base list based on subFilter
  const baseList = useMemo(() => {
    switch (subFilter) {
      case "superseded":
        return supersededItems;
      case "mastered":
        return masteredItems;
      case "code":
        return codeSnippetItems;
      case "discharged":
        return dischargedItems;
      case "timeline":
        if (activeCapsuleMonth) {
          return items.filter((it) => it.loggedFor?.startsWith(activeCapsuleMonth));
        }
        return items;
      case "all":
      default:
        return items;
    }
  }, [
    subFilter,
    supersededItems,
    masteredItems,
    codeSnippetItems,
    dischargedItems,
    activeCapsuleMonth,
    items,
  ]);

  // Filtered by search, type, language, tag
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter((it) => {
      if (selectedType && it.type !== selectedType) return false;
      if (selectedLanguage && it.codeLang?.toLowerCase() !== selectedLanguage.toLowerCase()) {
        return false;
      }
      if (selectedTag && !it.tags?.includes(selectedTag)) return false;
      if (q) {
        const hay = `${it.shortHash} ${it.body || ""} ${it.code || ""} ${it.tags?.join(" ") || ""} ${it.linkPreview?.title || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [baseList, selectedType, selectedLanguage, selectedTag, searchQuery]);

  // All tags in this view
  const allTags = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((it) => {
      it.tags?.forEach((t) => {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  // Export full markdown compendium
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
        md += `> ⚠️ Superseded by knowledge entry #${it.supersededById}\n\n`;
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

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ─── Vault Header Banner ────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--paper)",
          border: "var(--bd)",
          boxShadow: "var(--sh)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                background: "var(--yel)",
                border: "2px solid var(--ink)",
                display: "grid",
                placeItems: "center",
                boxShadow: "2px 2px 0 var(--ink)",
              }}
            >
              <Archive size={22} strokeWidth={2.5} color="#000" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--ink)",
                }}
              >
                TIL KNOWLEDGE VAULT & ARCHIVE
                <span
                  style={{
                    fontSize: "10px",
                    background: "var(--cyan)",
                    color: "#000",
                    padding: "2px 6px",
                    border: "1px solid var(--ink)",
                    boxShadow: "1px 1px 0 var(--ink)",
                  }}
                >
                  COMPENDIUM
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  color: "var(--ink)",
                  opacity: 0.7,
                  marginTop: "2px",
                }}
              >
                Historical knowledge lineage, code snippet vault, superseded evolution trees, and mastered recall cards.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={handleExportMarkdown}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 900,
                background: copiedExport ? "var(--lime)" : "var(--yel)",
                color: "#000",
                border: "2px solid var(--ink)",
                boxShadow: "2px 2px 0 var(--ink)",
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {copiedExport ? <Check size={13} /> : <Download size={13} />}
              {copiedExport ? "COMPENDIUM EXPORTED!" : "EXPORT VAULT MARKDOWN"}
            </button>
          </div>
        </div>

        {/* ─── Vault Telemetry Grid ────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "12px",
            borderTop: "1.5px dashed var(--ink)",
            paddingTop: "14px",
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              TOTAL INSIGHTS
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--ink)",
                marginTop: "2px",
              }}
            >
              {items.length}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              EVOLUTION & SUPERSEDED
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--pink)",
                WebkitTextStroke: "0.5px var(--ink)",
                marginTop: "2px",
              }}
            >
              {supersededItems.length}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              MASTERED RECALL
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--lime)",
                WebkitTextStroke: "0.5px var(--ink)",
                marginTop: "2px",
              }}
            >
              {masteredItems.length}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              CODE SNIPPETS
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--cyan)",
                WebkitTextStroke: "0.5px var(--ink)",
                marginTop: "2px",
              }}
            >
              {codeSnippetItems.length}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6, fontWeight: 700 }}>
              DISCHARGED SOURCES
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "20px",
                fontWeight: 900,
                color: "var(--yel)",
                WebkitTextStroke: "0.5px var(--ink)",
                marginTop: "2px",
              }}
            >
              {dischargedItems.length}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Vault Sub-Tabs & Filtering Strip ─────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            { id: "all", label: "ALL INSIGHTS", count: items.length },
            { id: "superseded", label: "EVOLUTION / SUPERSEDED", count: supersededItems.length },
            { id: "mastered", label: "MASTERED CARDS", count: masteredItems.length },
            { id: "code", label: "CODE VAULT", count: codeSnippetItems.length },
            { id: "discharged", label: "DISCHARGED SOURCES", count: dischargedItems.length },
            { id: "timeline", label: "TIME CAPSULES", count: timelineCapsules.length },
          ].map((tab) => {
            const isActive = subFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSubFilter(tab.id as TilArchiveSubFilter);
                  if (tab.id !== "timeline") setActiveCapsuleMonth(null);
                }}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "6px 12px",
                  border: "2px solid var(--ink)",
                  background: isActive ? "var(--yel)" : "var(--paper)",
                  color: isActive ? "#000" : "var(--ink)",
                  boxShadow: isActive ? "2px 2px 0 var(--ink)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.1s ease",
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: "9px",
                    background: isActive ? "var(--ink)" : "rgba(0,0,0,0.08)",
                    color: isActive ? "#fff" : "var(--ink)",
                    padding: "1px 5px",
                    fontWeight: 800,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--paper)",
            border: "2px solid var(--ink)",
            padding: "4px 10px",
            flex: "1 1 240px",
            maxWidth: "360px",
            boxShadow: "2px 2px 0 var(--ink)",
          }}
        >
          <Search size={14} color="var(--ink)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, tags, text, hash..."
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              width: "100%",
              color: "var(--ink)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--mono)",
                fontWeight: 800,
                fontSize: "11px",
                color: "var(--ink)",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter Pills: Types, Code Languages & Time Capsules ─────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 800,
            opacity: 0.6,
            color: "var(--ink)",
            marginRight: "4px",
          }}
        >
          TYPES:
        </span>
        {tilTypeValues.map((t) => {
          const isSel = selectedType === t;
          return (
            <button
              key={t}
              onClick={() => setSelectedType(isSel ? null : t)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 8px",
                border: "1.5px solid var(--ink)",
                background: isSel ? TYPE_COLORS[t] : "var(--paper)",
                color: "#000",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          );
        })}

        {availableLanguages.length > 0 && (
          <>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                opacity: 0.6,
                color: "var(--ink)",
                marginLeft: "12px",
                marginRight: "4px",
              }}
            >
              LANGUAGES:
            </span>
            {availableLanguages.map((lang) => {
              const isSel = selectedLanguage === lang;
              return (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(isSel ? null : lang)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    border: "1.5px solid var(--ink)",
                    background: isSel ? "var(--cyan)" : "var(--paper)",
                    color: "#000",
                    cursor: "pointer",
                  }}
                >
                  {lang}
                </button>
              );
            })}
          </>
        )}

        {subFilter === "timeline" && (
          <div
            style={{
              width: "100%",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginTop: "8px",
              padding: "10px",
              background: "rgba(0,0,0,0.03)",
              border: "1.5px solid var(--ink)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--ink)",
                marginRight: "6px",
              }}
            >
              <Calendar size={12} /> SELECT MONTH CAPSULE:
            </span>
            {timelineCapsules.map(([month, capsuleItems]) => {
              const isSel = activeCapsuleMonth === month;
              return (
                <button
                  key={month}
                  onClick={() => setActiveCapsuleMonth(isSel ? null : month)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 900,
                    padding: "3px 8px",
                    border: "1.5px solid var(--ink)",
                    background: isSel ? "var(--yel)" : "var(--paper)",
                    color: "#000",
                    cursor: "pointer",
                  }}
                >
                  {month} ({capsuleItems.length})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Vault Cards List ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "16px",
        }}
      >
        {filteredList.length === 0 ? (
          <div
            style={{
              background: "var(--paper)",
              border: "var(--bd)",
              boxShadow: "var(--sh-sm)",
              padding: "50px 20px",
              textAlign: "center",
              gridColumn: "1 / -1",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontWeight: 900,
                fontSize: "16px",
                color: "var(--ink)",
              }}
            >
              NO MATCHING INSIGHTS IN VAULT
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                color: "var(--ink)",
                opacity: 0.7,
                marginTop: "6px",
              }}
            >
              Try clearing filters or search queries.
            </div>
          </div>
        ) : (
          filteredList.map((it) => {
            const isSuperseded = Boolean(it.supersededById);
            const successor = it.supersededById
              ? itemMap.get(it.supersededById) || itemMap.get(it.supersededById.toLowerCase())
              : null;
            const isMastered = (it.stability && it.stability >= 3) || (it.confidence && it.confidence >= 0.8);
            const typeColor = TYPE_COLORS[it.type] || "#00F0FF";

            return (
              <div
                key={it.id}
                style={{
                  background: "var(--paper)",
                  border: isSuperseded ? "2px dashed var(--ink)" : "var(--bd)",
                  boxShadow: isSuperseded ? "none" : "var(--sh-sm)",
                  display: "flex",
                  flexDirection: "column",
                  opacity: isSuperseded ? 0.85 : 1,
                  position: "relative",
                }}
              >
                {/* Card Top Header */}
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.03)",
                    borderBottom: "1.5px solid var(--ink)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 900,
                        fontSize: "11px",
                        background: typeColor,
                        color: "#000",
                        padding: "1px 6px",
                        border: "1px solid var(--ink)",
                      }}
                    >
                      {it.type}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "var(--ink)",
                      }}
                    >
                      #{it.shortHash}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {isMastered && (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9px",
                          fontWeight: 800,
                          background: "var(--lime)",
                          color: "#000",
                          border: "1px solid var(--ink)",
                          padding: "1px 5px",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <CheckCircle2 size={10} /> MASTERED
                      </span>
                    )}

                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        opacity: 0.6,
                        color: "var(--ink)",
                      }}
                    >
                      {it.loggedFor}
                    </span>
                  </div>
                </div>

                {/* Supersession Knowledge Lineage Banner */}
                {isSuperseded && (
                  <div
                    style={{
                      background: "rgba(255, 0, 122, 0.08)",
                      borderBottom: "1.5px solid var(--ink)",
                      padding: "6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "10px",
                      fontFamily: "var(--mono)",
                      fontWeight: 800,
                      color: "var(--ink)",
                    }}
                  >
                    <GitBranch size={12} color="var(--pink)" />
                    <span>SUPERSEDED BY KNOWLEDGE ENTRY</span>
                    <span
                      style={{
                        background: "var(--yel)",
                        padding: "1px 4px",
                        border: "1px solid var(--ink)",
                      }}
                    >
                      #{it.supersededById}
                    </span>
                  </div>
                )}

                {/* Card Body */}
                <div
                  style={{
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    flex: 1,
                  }}
                >
                  {it.body && (
                    <div
                      style={{
                        fontFamily: "var(--grot)",
                        fontSize: "13px",
                        lineHeight: "1.5",
                        color: "var(--ink)",
                      }}
                    >
                      <MarkdownLite content={it.body} />
                    </div>
                  )}

                  {it.code && (
                    <div
                      style={{
                        position: "relative",
                        background: "#1E1E1E",
                        borderRadius: "2px",
                        border: "1.5px solid var(--ink)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "3px 8px",
                          background: "#2D2D2D",
                          borderBottom: "1px solid #444",
                          fontFamily: "var(--mono)",
                          fontSize: "9px",
                          fontWeight: 800,
                          color: "#AAA",
                        }}
                      >
                        <span>{it.codeLang || "code"}</span>
                        <button
                          onClick={() => handleCopySnippet(it.code!, it.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: copiedId === it.id ? "var(--lime)" : "#FFF",
                            cursor: "pointer",
                            fontSize: "9px",
                            fontFamily: "var(--mono)",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          {copiedId === it.id ? <Check size={10} /> : <Copy size={10} />}
                          {copiedId === it.id ? "COPIED" : "COPY"}
                        </button>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: "10px",
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          color: "#E0E0E0",
                          overflowX: "auto",
                          lineHeight: "1.4",
                        }}
                      >
                        <code>{it.code}</code>
                      </pre>
                    </div>
                  )}

                  {it.linkUrl && (
                    <a
                      href={it.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        color: "var(--ink)",
                        textDecoration: "none",
                        background: "rgba(0,0,0,0.03)",
                        padding: "6px 8px",
                        border: "1px solid var(--ink)",
                      }}
                    >
                      <ExternalLink size={12} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.linkPreview?.title || it.linkUrl}
                      </span>
                    </a>
                  )}

                  {/* Tags */}
                  {it.tags && it.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                      {it.tags.map((tg) => (
                        <span
                          key={tg}
                          onClick={() => onSelectTag?.(tg)}
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "10px",
                            fontWeight: 800,
                            background: "var(--paper)",
                            color: "var(--ink)",
                            border: "1px solid var(--ink)",
                            padding: "1px 5px",
                            cursor: "pointer",
                          }}
                        >
                          #{tg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Strip */}
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.02)",
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px" }}>
                    {isSuperseded ? (
                      <button
                        onClick={() => onUpdate(it.id, { supersededById: null })}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "10px",
                          fontWeight: 800,
                          background: "var(--paper)",
                          color: "var(--ink)",
                          border: "1.5px solid var(--ink)",
                          padding: "2px 6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                        title="Reactivate this insight as current"
                      >
                        <RotateCcw size={10} /> REVIVE
                      </button>
                    ) : (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "10px",
                          opacity: 0.5,
                        }}
                      >
                        STABILITY: {it.stability || 1}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onDelete(it.id)}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "transparent",
                      color: "#FF4444",
                      border: "none",
                      padding: "2px 6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                    title="Delete insight"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
