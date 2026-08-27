"use client";

import React, { useState, useMemo } from "react";
import { TilItem, TilFeedItem } from "@/components/til/TilFeedItem";
import { BookOpen, Search, X, ArrowUpDown, Tag, Sparkles, Clock, Calendar, ArrowRight } from "lucide-react";

export interface CodexTopicSummary {
  tag: string;
  color: string;
  entryCount: number;
  averageConfidence: number;
}

export interface CodexTopicDetail {
  name: string;
  entryCount: number;
  firstLoggedFor: string;
  lastLoggedFor: string;
  spanDays: number;
  averageConfidence: number;
  entries: Array<TilItem & { alsoSeeTags?: string[] }>;
}

interface TilCodexViewProps {
  index: CodexTopicSummary[];
  activeTopic: CodexTopicDetail | null;
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
  onUpdate: (id: string, updated: Partial<TilItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  validHashes?: Set<string>;
}

type TopicSortMode = "count" | "confidence" | "alpha";

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
  const [sortMode, setSortMode] = useState<TopicSortMode>("count");
  const [entrySearch, setEntrySearch] = useState("");

  const maxEntryCount = useMemo(() => {
    return Math.max(1, ...index.map((t) => t.entryCount));
  }, [index]);

  const getConfidenceInfo = (conf: number) => {
    if (conf >= 70) {
      return {
        color: "var(--lime, #B6FF3C)",
        label: "HOLDING",
        textColor: "#000",
        border: "1.5px solid var(--ink)",
      };
    }
    if (conf >= 40) {
      return {
        color: "var(--yel, #FFE600)",
        label: "FADING",
        textColor: "#000",
        border: "1.5px solid var(--ink)",
      };
    }
    return {
      color: "var(--pink, #FF007A)",
      label: "GHOST",
      textColor: "#FFF",
      border: "1.5px solid var(--ink)",
    };
  };

  // Filter and sort the index topics
  const processedIndex = useMemo(() => {
    const q = topicSearch.trim().toLowerCase().replace(/^#/, "");
    let list = index;
    if (q) {
      list = list.filter((t) => t.tag.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      if (sortMode === "count") {
        return b.entryCount - a.entryCount;
      }
      if (sortMode === "confidence") {
        return a.averageConfidence - b.averageConfidence; // Show lowest confidence / needing review first
      }
      if (sortMode === "alpha") {
        return a.tag.localeCompare(b.tag);
      }
      return 0;
    });
  }, [index, topicSearch, sortMode]);

  // Filter entries in active topic if entrySearch is populated
  const filteredActiveEntries = useMemo(() => {
    if (!activeTopic?.entries) return [];
    const eq = entrySearch.trim().toLowerCase();
    if (!eq) return activeTopic.entries;
    return activeTopic.entries.filter((item) => {
      const hay = `${item.shortHash} ${item.body || ""} ${item.code || ""} ${item.tags?.join(" ") || ""}`.toLowerCase();
      return hay.includes(eq);
    });
  }, [activeTopic, entrySearch]);

  const activeConf = activeTopic ? getConfidenceInfo(activeTopic.averageConfidence) : null;

  return (
    <div className="til-codex-container">
      <div className="til-codex">
        {/* Left Pane: Topic Index Sidebar (~260px) */}
        <aside className="til-codex-index">
          {/* Header Masthead */}
          <div className="til-codex-index-head">
            <div className="til-codex-index-title">
              <BookOpen size={14} strokeWidth={2.4} />
              <span>CODEX TOPICS</span>
              <span className="til-codex-count-badge">{index.length}</span>
            </div>

            {/* Quick Sort Toggle */}
            <div className="til-codex-sort-pills">
              <button
                type="button"
                className={`til-sort-pill ${sortMode === "count" ? "on" : ""}`}
                onClick={() => setSortMode("count")}
                title="Sort by most entries"
              >
                # COUNT
              </button>
              <button
                type="button"
                className={`til-sort-pill ${sortMode === "confidence" ? "on" : ""}`}
                onClick={() => setSortMode("confidence")}
                title="Sort by lowest retention first"
              >
                % MEMORY
              </button>
              <button
                type="button"
                className={`til-sort-pill ${sortMode === "alpha" ? "on" : ""}`}
                onClick={() => setSortMode("alpha")}
                title="Sort alphabetically A-Z"
              >
                A → Z
              </button>
            </div>

            {/* Topic Filter Input */}
            <div className="til-codex-search-box">
              <Search size={12} className="til-search-icon" />
              <input
                type="text"
                placeholder="Find topic..."
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
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Topics List Scrollport */}
          <div className="til-codex-index-scroll">
            {processedIndex.length === 0 ? (
              <div className="til-codex-empty-topics">
                {topicSearch ? `No topics match "${topicSearch}"` : "No topics filed yet."}
              </div>
            ) : (
              processedIndex.map((topic) => {
                const isSelected =
                  (selectedTopic && selectedTopic.toLowerCase() === topic.tag.toLowerCase()) ||
                  (!selectedTopic && activeTopic && activeTopic.name.toLowerCase() === topic.tag.toLowerCase());

                const barWidthPercent = Math.max(8, (topic.entryCount / maxEntryCount) * 100);
                const confInfo = getConfidenceInfo(topic.averageConfidence);

                return (
                  <button
                    key={topic.tag}
                    type="button"
                    onClick={() => onSelectTopic(topic.tag)}
                    className={`til-codex-topic-row ${isSelected ? "selected" : ""}`}
                  >
                    <div className="til-codex-topic-content">
                      <div className="til-codex-topic-top">
                        <span className="til-codex-topic-name">#{topic.tag}</span>
                        <div className="til-codex-topic-badges">
                          <span
                            className="til-topic-conf-tag"
                            style={{
                              background: confInfo.color,
                              color: confInfo.textColor,
                            }}
                            title={`Retention: ${topic.averageConfidence}% (${confInfo.label})`}
                          >
                            {topic.averageConfidence}%
                          </span>
                          <span className="til-topic-count-pill">{topic.entryCount}</span>
                        </div>
                      </div>

                      {/* Tactile Retention Progress Bar */}
                      <div className="til-topic-retention-meter">
                        <div
                          className="til-topic-retention-bar"
                          style={{
                            width: `${barWidthPercent}%`,
                            background: confInfo.color,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Topic Page Documentation */}
        <main className="til-codex-page">
          {!activeTopic ? (
            <div className="til-codex-placeholder">
              <div className="til-codex-placeholder-icon">
                <BookOpen size={36} />
              </div>
              <h2 className="til-codex-placeholder-title">CHOOSE A KNOWLEDGE TOPIC</h2>
              <p className="til-codex-placeholder-sub">
                Select any topic from the codex index on the left to review its insights, learning arc, and cross-references.
              </p>
            </div>
          ) : (
            <div className="til-codex-article">
              {/* Hero Topic Masthead Banner */}
              <div className="til-codex-hero-header">
                <div className="til-codex-hero-top">
                  <div className="til-codex-hero-tag-badge">
                    <span className="til-hash-symbol">#</span>
                    <span>{activeTopic.name.toUpperCase()}</span>
                  </div>

                  {activeConf && (
                    <div
                      className="til-codex-hero-retention-pill"
                      style={{
                        background: activeConf.color,
                        color: activeConf.textColor,
                      }}
                    >
                      <Sparkles size={13} />
                      <span>
                        {activeTopic.averageConfidence}% RETENTION · {activeConf.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arc Statistics Strip */}
                <div className="til-codex-stats-strip">
                  <div className="til-codex-stat-item">
                    <Tag size={12} />
                    <span>
                      <b>{activeTopic.entryCount}</b> {activeTopic.entryCount === 1 ? "ENTRY" : "ENTRIES"}
                    </span>
                  </div>

                  <span className="til-stat-dot">•</span>

                  <div className="til-codex-stat-item">
                    <Clock size={12} />
                    <span>
                      LEARNED OVER <b>{activeTopic.spanDays}</b> {activeTopic.spanDays === 1 ? "DAY" : "DAYS"}
                    </span>
                  </div>

                  {activeTopic.firstLoggedFor && (
                    <>
                      <span className="til-stat-dot">•</span>
                      <div className="til-codex-stat-item">
                        <Calendar size={12} />
                        <span>
                          {activeTopic.firstLoggedFor} → {activeTopic.lastLoggedFor}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Filter in Active Topic */}
                {activeTopic.entries.length > 2 && (
                  <div className="til-codex-entry-filter-bar">
                    <Search size={12} className="til-search-icon" />
                    <input
                      type="text"
                      placeholder={`Filter within #${activeTopic.name}...`}
                      value={entrySearch}
                      onChange={(e) => setEntrySearch(e.target.value)}
                      className="til-codex-entry-search-input"
                    />
                    {entrySearch && (
                      <button
                        type="button"
                        onClick={() => setEntrySearch("")}
                        className="til-search-clear-btn"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Entries Body (Oldest First for Knowledge Arc) */}
              <div className="til-codex-entries-list">
                {filteredActiveEntries.length === 0 ? (
                  <div className="til-codex-no-entries">
                    No entries in this topic matched your filter.
                  </div>
                ) : (
                  filteredActiveEntries.map((item) => (
                    <div key={item.id} className="til-codex-entry-wrapper">
                      {/* Entry Card */}
                      <TilFeedItem
                        item={item}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onSelectTag={onSelectTopic}
                        validHashes={validHashes}
                      />

                      {/* ALSO SEE Cross-link Bar */}
                      {item.alsoSeeTags && item.alsoSeeTags.length > 0 && (
                        <div className="til-codex-also-see">
                          <span className="til-also-see-label">
                            <ArrowRight size={11} /> ALSO SEE:
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

