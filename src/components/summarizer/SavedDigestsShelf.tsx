"use client";

import React, { useState, useMemo } from "react";
import { SavedDigestItem, deleteSavedDigest, updateDigestTags } from "@/lib/summarizer/storage";
import { DigestResult } from "@/lib/summarizer/types";
import { playSound } from "@/lib/sound";
import {
  Bookmark,
  Search,
  Tag,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  BookOpen,
  Layers,
  ShieldAlert,
  Plus,
  X,
} from "lucide-react";

interface SavedDigestsShelfProps {
  savedItems: SavedDigestItem[];
  onOpenDigest: (digest: DigestResult) => void;
  onRefreshList: () => void;
  onStartNew: () => void;
}

export const SavedDigestsShelf: React.FC<SavedDigestsShelfProps> = ({
  savedItems,
  onOpenDigest,
  onRefreshList,
  onStartNew,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tagEditingId, setTagEditingId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>("");

  // Extract all unique tags and counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: savedItems.length };
    savedItems.forEach((item) => {
      item.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [savedItems]);

  const uniqueTags = Object.keys(tagCounts);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return savedItems.filter((item) => {
      const matchesTag = selectedTag === "ALL" || item.tags.includes(selectedTag);
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.thesis.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        (item.digest.terms || []).some((t) => t.term.toLowerCase().includes(q));
      return matchesTag && matchesQuery;
    });
  }, [savedItems, selectedTag, searchQuery]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this saved digest from your shelf?")) {
      playSound.click();
      deleteSavedDigest(id);
      onRefreshList();
    }
  };

  const handleCopyMarkdown = async (item: SavedDigestItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound.click();
    const digest = item.digest;
    let md = `# ${digest.title}\n\n> **Thesis**: ${digest.thesis}\n\n---\n\n`;
    digest.sections.forEach((sec) => {
      md += `## ${sec.heading}\n\n`;
      sec.paragraphs.forEach((p) => {
        md += `${p.replace(/<strong>/g, "**").replace(/<\/strong>/g, "**")}\n\n`;
      });
    });
    if (digest.takeaway) {
      md += `### Core Takeaway\n\n${digest.takeaway}\n\n`;
    }
    await navigator.clipboard.writeText(md);
    setCopiedId(item.id);
    playSound.fileIt();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddTag = (itemId: string, currentTags: string[]) => {
    const tag = newTagInput.trim().toUpperCase();
    if (!tag) return;
    if (!currentTags.includes(tag)) {
      const nextTags = [...currentTags, tag];
      updateDigestTags(itemId, nextTags);
      onRefreshList();
    }
    setNewTagInput("");
    setTagEditingId(null);
    playSound.fileIt();
  };

  const handleRemoveTag = (itemId: string, currentTags: string[], tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTags = currentTags.filter((t) => t !== tagToRemove);
    updateDigestTags(itemId, nextTags);
    onRefreshList();
    playSound.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── SEARCH & TAG FILTER TOOLBAR ── */}
      <div
        style={{
          background: "#0A0A0A",
          border: "2px solid #222222",
          borderRadius: "4px",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "4px 4px 0 #000000",
        }}
      >
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={15} color="#FFE600" style={{ position: "absolute", left: "14px", pointerEvents: "none" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved digests by title, thesis, concepts, or terms..."
              style={{
                width: "100%",
                padding: "10px 14px 10px 40px",
                background: "#141414",
                color: "#FFFFFF",
                border: "1.5px solid #2E2E2E",
                borderRadius: "3px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                outline: "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  color: "#888888",
                  cursor: "pointer",
                  fontFamily: "var(--mono, monospace)",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tag pills filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", marginRight: "4px" }}>
            FILTER BY TAG:
          </span>
          {uniqueTags.map((tag) => {
            const isSelected = selectedTag === tag;
            const count = tagCounts[tag];

            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  playSound.click();
                  setSelectedTag(tag);
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10.5px",
                  fontWeight: 900,
                  padding: "4px 10px",
                  background: isSelected ? "#FFE600" : "#181818",
                  color: isSelected ? "#0A0A0A" : "#A3A3A3",
                  border: `1.5px solid ${isSelected ? "#FFE600" : "#2E2E2E"}`,
                  borderRadius: "3px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tag === "ALL" ? "🌐 ALL" : `#${tag}`}</span>
                <span style={{ fontSize: "9.5px", opacity: 0.8 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SAVED DIGESTS GRID ── */}
      {filteredItems.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                playSound.click();
                onOpenDigest(item.digest);
              }}
              style={{
                background: "#0C0C0C",
                border: "2px solid #242424",
                borderRadius: "4px",
                boxShadow: "4px 4px 0 #000000",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
                cursor: "pointer",
                transition: "border-color 0.15s ease, transform 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#FFE600";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#242424";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Top Meta & Tags */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 900, background: "#1C1C1C", color: "#4ADE80", border: "1px solid #166534", padding: "2px 6px", borderRadius: "2px" }}>
                    ~{item.readMinutes} MIN READ
                  </span>

                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#666666" }}>
                    {new Date(item.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: "var(--display, sans-serif)",
                    fontSize: "18px",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    margin: 0,
                    lineHeight: "1.25",
                  }}
                >
                  {item.title}
                </h3>

                {/* Thesis Snippet */}
                <div
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "12px",
                    color: "#D4D4D8",
                    background: "#141414",
                    borderLeft: "3px solid #FFE600",
                    padding: "8px 10px",
                    borderRadius: "0 2px 2px 0",
                    lineHeight: "1.5",
                  }}
                >
                  &ldquo;{item.thesis}&rdquo;
                </div>

                {/* Tag Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", marginTop: "2px" }}>
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        background: "#1C1917",
                        color: "#FBBF24",
                        border: "1px solid #78350F",
                        padding: "1px 6px",
                        borderRadius: "2px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveTag(item.id, item.tags, t, e)}
                        style={{ background: "none", border: "none", color: "#A8A29E", cursor: "pointer", padding: "0 1px", fontSize: "9px" }}
                        title="Remove tag"
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  {tagEditingId === item.id ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "center", gap: "2px" }}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTag(item.id, item.tags);
                          if (e.key === "Escape") setTagEditingId(null);
                        }}
                        placeholder="TAG"
                        style={{
                          width: "60px",
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "9.5px",
                          padding: "1px 4px",
                          background: "#181818",
                          color: "#FFE600",
                          border: "1px solid #FFE600",
                          borderRadius: "2px",
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag(item.id, item.tags)}
                        style={{ background: "#FFE600", color: "#0A0A0A", border: "none", borderRadius: "2px", padding: "1px 4px", fontSize: "9.5px", fontWeight: 900, cursor: "pointer" }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagEditingId(item.id);
                        setNewTagInput("");
                      }}
                      style={{
                        background: "#1C1C1C",
                        border: "1px dashed #444444",
                        color: "#888888",
                        borderRadius: "2px",
                        padding: "1px 5px",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                      title="Add a custom tag"
                    >
                      <Plus size={9} /> TAG
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div
                style={{
                  borderTop: "1px solid #1E1E1E",
                  paddingTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#777777" }}>
                  {item.digest.sections.length} Sec · {item.digest.figures.length} Fig · {item.digest.claims.length} Claims
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={(e) => handleCopyMarkdown(item, e)}
                    className="btn-card-action"
                    style={{ background: "#1C1C1C", color: copiedId === item.id ? "#4ADE80" : "#A3A3A3", padding: "3px 6px", fontSize: "10px" }}
                    title="Copy Markdown"
                  >
                    {copiedId === item.id ? <Check size={11} /> : <Copy size={11} />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="btn-card-action"
                    style={{ background: "#1C1C1C", color: "#F87171", padding: "3px 6px", fontSize: "10px" }}
                    title="Delete Digest"
                  >
                    <Trash2 size={11} />
                  </button>

                  <span
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 900,
                      color: "#FFE600",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      marginLeft: "4px",
                    }}
                  >
                    OPEN ↗
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            background: "#0A0A0A",
            border: "2px dashed #282828",
            borderRadius: "4px",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Bookmark size={36} color="#FFE600" style={{ opacity: 0.5 }} />
          <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
            {searchQuery || selectedTag !== "ALL" ? "No matching digests found" : "No saved digests yet"}
          </h3>
          <p style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#888888", maxWidth: "420px", margin: 0 }}>
            {searchQuery || selectedTag !== "ALL"
              ? "Try adjusting your search keywords or switching to ALL tags."
              : "Synthesize any long article, paper, or transcript and hit SAVE DIGEST to structure your knowledge shelf with tags."}
          </p>
          <button
            type="button"
            onClick={() => {
              playSound.click();
              onStartNew();
            }}
            className="btn-ledger btn-ledger-primary"
            style={{
              marginTop: "8px",
              padding: "10px 18px",
              fontSize: "11px",
              fontWeight: 900,
              background: "#FFE600",
              color: "#0A0A0A",
              border: "2px solid #000000",
            }}
          >
            ⚡ SYNTHESIZE A DIGEST NOW
          </button>
        </div>
      )}
    </div>
  );
};
