"use client";

import React from "react";
import { TilItem, TilFeedItem } from "@/components/til/TilFeedItem";
import { BookOpen } from "lucide-react";

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

export const TilCodexView: React.FC<TilCodexViewProps> = ({
  index,
  activeTopic,
  selectedTopic,
  onSelectTopic,
  onUpdate,
  onDelete,
  validHashes,
}) => {
  const maxEntryCount = React.useMemo(() => {
    return Math.max(1, ...index.map((t) => t.entryCount));
  }, [index]);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 70) return "#B6FF3C";
    if (conf >= 40) return "#FFE600";
    return "#FF007A";
  };

  return (
    <div
      style={{
        display: "flex",
        background: "var(--paper)",
        border: "var(--bd)",
        boxShadow: "var(--sh)",
        minHeight: "650px",
      }}
    >
      {/* Left Pane: Topic Index (~230px) */}
      <div
        style={{
          width: "240px",
          borderRight: "1.5px solid var(--ink)",
          background: "rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1.5px solid var(--ink)",
            background: "var(--paper)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "var(--mono)",
            fontSize: "12px",
            fontWeight: 900,
          }}
        >
          <BookOpen size={14} /> CODEX INDEX ({index.length})
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {index.length === 0 ? (
            <div style={{ padding: "16px", fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.6 }}>
              No topics created yet.
            </div>
          ) : (
            index.map((topic) => {
              const isSelected =
                (selectedTopic && selectedTopic.toLowerCase() === topic.tag.toLowerCase()) ||
                (!selectedTopic && activeTopic && activeTopic.name.toLowerCase() === topic.tag.toLowerCase());

              const barWidthPercent = (topic.entryCount / maxEntryCount) * 100;
              const barColor = getConfidenceColor(topic.averageConfidence);

              return (
                <button
                  key={topic.tag}
                  type="button"
                  onClick={() => onSelectTopic(topic.tag)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: "1px solid var(--ink)",
                    background: isSelected ? "var(--ink)" : "transparent",
                    color: isSelected ? "var(--cream)" : "var(--ink)",
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 800 }}>
                      #{topic.tag}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        fontWeight: 900,
                        background: isSelected ? "#00F0FF" : "var(--ink)",
                        color: isSelected ? "#000" : "var(--cream)",
                        padding: "1px 5px",
                        borderRadius: "2px",
                      }}
                    >
                      {topic.entryCount}
                    </span>
                  </div>

                  {/* Relative Entry Count Bar colored by Average Confidence */}
                  <div
                    style={{
                      height: "4px",
                      width: "100%",
                      background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barWidthPercent}%`,
                        background: barColor,
                      }}
                      title={`Avg Confidence: ${topic.averageConfidence}%`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Topic Page */}
      <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
        {!activeTopic ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              fontWeight: 800,
              opacity: 0.6,
            }}
          >
            SELECT A TOPIC FROM THE INDEX TO READ DOCUMENTATION
          </div>
        ) : (
          <div>
            {/* Topic Header */}
            <div
              style={{
                borderBottom: "2px solid var(--ink)",
                paddingBottom: "16px",
                marginBottom: "24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "20px",
                    fontWeight: 900,
                    background: "var(--yel, #FFE600)",
                    color: "#000",
                    padding: "4px 10px",
                    border: "2px solid var(--ink)",
                    boxShadow: "2px 2px 0 var(--ink)",
                  }}
                >
                  #{activeTopic.name.toUpperCase()}
                </span>

                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    fontWeight: 900,
                    background: getConfidenceColor(activeTopic.averageConfidence),
                    color: "#000",
                    padding: "3px 8px",
                    border: "1.5px solid var(--ink)",
                  }}
                >
                  {activeTopic.averageConfidence}% AVG CONFIDENCE
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  opacity: 0.8,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  <strong>{activeTopic.entryCount}</strong> ENTRIES
                </span>
                <span>•</span>
                <span>
                  LEARNED OVER <strong>{activeTopic.spanDays}</strong> {activeTopic.spanDays === 1 ? "DAY" : "DAYS"}
                </span>
                {activeTopic.firstLoggedFor && (
                  <>
                    <span>•</span>
                    <span>
                      {activeTopic.firstLoggedFor} → {activeTopic.lastLoggedFor}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Entries Body (Oldest First) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {activeTopic.entries.map((item) => (
                <div key={item.id}>
                  {/* Entry Card */}
                  <TilFeedItem
                    item={item}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onSelectTag={onSelectTopic}
                    validHashes={validHashes}
                  />

                  {/* ALSO SEE Line linking entries sharing a second tag */}
                  {item.alsoSeeTags && item.alsoSeeTags.length > 0 && (
                    <div
                      style={{
                        marginTop: "-6px",
                        marginBottom: "12px",
                        paddingLeft: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "var(--mono)",
                        fontSize: "10.5px",
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ opacity: 0.6, color: "var(--ink)" }}>ALSO SEE:</span>
                      {item.alsoSeeTags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onSelectTopic(t)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--ink)",
                            fontWeight: 800,
                            textDecoration: "underline",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
