"use client";

import React, { useState } from "react";
import { Bookmark } from "@/types";
import { LivingTopicCluster } from "@/lib/library/topicClustering";
import { TYPES } from "@/data/initialBookmarks";
import {
  X,
  Sparkles,
  Zap,
  ExternalLink,
  BookOpen,
  Check,
  FolderPlus,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface TopicClusterHubModalProps {
  cluster: LivingTopicCluster | null;
  onClose: () => void;
  onOpenBookmark: (id: number) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
  onToggleRead: (id: number) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
  onCreateCollectionFromCluster?: (cluster: LivingTopicCluster) => Promise<void>;
}

export const TopicClusterHubModal: React.FC<TopicClusterHubModalProps> = ({
  cluster,
  onClose,
  onOpenBookmark,
  onGhostRead,
  onToggleRead,
  onDischarge,
  onCreateCollectionFromCluster,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [creatingColl, setCreatingColl] = useState(false);
  const [collCreated, setCollCreated] = useState(false);

  if (!cluster) return null;

  const unreadItems = cluster.bookmarks.filter((b) => b.unread);
  const readItems = cluster.bookmarks.filter((b) => !b.unread);

  const displayedItems =
    activeTab === "unread"
      ? unreadItems
      : activeTab === "read"
      ? readItems
      : cluster.bookmarks;

  const handleCreateCollection = async () => {
    if (!onCreateCollectionFromCluster) return;
    try {
      setCreatingColl(true);
      await onCreateCollectionFromCluster(cluster);
      setCollCreated(true);
      setTimeout(() => setCollCreated(false), 2500);
    } catch {
      // Ignore
    } finally {
      setCreatingColl(false);
    }
  };

  return (
    <div className="cluster-hub-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cluster-hub-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Strip */}
        <header className="cluster-hub-header" style={{ borderTop: `4px solid ${cluster.color}` }}>
          <div className="cluster-hub-title-row">
            <div className="cluster-hub-badge">
              <span className="hub-icon">{cluster.icon}</span>
              <span className="hub-title">{cluster.title}</span>
            </div>

            <button className="cluster-hub-close-btn" onClick={onClose} aria-label="Close">
              <X size={14} />
            </button>
          </div>

          {/* Metrics Radar & Knowledge Density Row */}
          <div className="cluster-hub-metrics-bar">
            <div className="metric-pill density" style={{ borderColor: cluster.color }}>
              <TrendingUp size={12} color={cluster.color} />
              <span>DENSITY: <b>{cluster.densityLevel.toUpperCase()}</b></span>
              <span className="metric-score">({cluster.densityScore}/100)</span>
            </div>

            <div className="metric-pill explored">
              <span>EXPLORED: <b>{cluster.exploredPercentage}%</b></span>
              <span className="metric-sub">({cluster.readCount} read · {cluster.unreadCount} in queue)</span>
            </div>

            <div className="metric-kinds">
              {cluster.dominantKinds.map((k) => {
                const meta = TYPES[k] || { c: "#000", fg: "#fff" };
                return (
                  <span
                    key={k}
                    className="kind-tag"
                    style={{ background: meta.c, color: meta.fg }}
                  >
                    {k}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Explored Progress Bar */}
          <div className="cluster-progress-bar-wrap">
            <div
              className="cluster-progress-bar-fill"
              style={{ width: `${cluster.exploredPercentage}%`, background: cluster.color }}
            />
          </div>

          {/* Tabs Filter */}
          <div className="cluster-hub-tabs">
            <button
              className={`hub-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              ALL ITEMS ({cluster.totalCount})
            </button>
            <button
              className={`hub-tab ${activeTab === "unread" ? "active" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              🔥 BACKLOG / UNREAD ({cluster.unreadCount})
            </button>
            <button
              className={`hub-tab ${activeTab === "read" ? "active" : ""}`}
              onClick={() => setActiveTab("read")}
            >
              ✓ EXPLORED / REFERENCES ({cluster.readCount})
            </button>

            {onCreateCollectionFromCluster && (
              <button
                className="hub-action-btn-collection"
                onClick={handleCreateCollection}
                disabled={creatingColl}
                title="Create a smart live collection for this topic"
              >
                {collCreated ? <Check size={12} /> : <FolderPlus size={12} />}
                <span>{collCreated ? "COLLECTION CREATED!" : "CREATE COLLECTION"}</span>
              </button>
            )}
          </div>
        </header>

        {/* Bookmarks Reel */}
        <div className="cluster-hub-body">
          {displayedItems.length === 0 ? (
            <div className="cluster-hub-empty">
              <Sparkles size={16} color="var(--yel)" />
              <span>No bookmarks in this view tab.</span>
            </div>
          ) : (
            <div className="cluster-hub-grid">
              {displayedItems.map((bm) => {
                const typeMeta = TYPES[bm.ty] || { c: "var(--ink)", fg: "var(--paper)", icon: "📄" };

                return (
                  <article key={bm.id} className="cluster-hub-card">
                    <div className="card-top-row">
                      <span
                        className="card-type-badge"
                        style={{ background: typeMeta.c, color: typeMeta.fg }}
                      >
                        {typeMeta.icon} {bm.ty}
                      </span>
                      <span className="card-src">{bm.src}</span>
                      <span className="card-tag">#{bm.tag}</span>
                      {bm.unread ? (
                        <span className="card-status-unread">UNREAD</span>
                      ) : (
                        <span className="card-status-read">READ</span>
                      )}
                    </div>

                    <h4 className="card-title" onClick={() => onOpenBookmark(bm.id)}>
                      {bm.t}
                    </h4>

                    {bm.note && <p className="card-note">{bm.note}</p>}

                    <div className="card-actions-row">
                      <button
                        className="hub-card-btn open"
                        onClick={() => onOpenBookmark(bm.id)}
                      >
                        <ExternalLink size={11} /> OPEN
                      </button>

                      {onGhostRead && (
                        <button
                          className="hub-card-btn ghost"
                          onClick={() => onGhostRead(bm)}
                        >
                          <BookOpen size={11} /> GHOST READ
                        </button>
                      )}

                      <button
                        className="hub-card-btn mark"
                        onClick={() => onToggleRead(bm.id)}
                      >
                        <Check size={11} /> {bm.unread ? "MARK READ" : "UNREAD"}
                      </button>

                      {onDischarge && (
                        <button
                          className="hub-card-btn til"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            onDischarge(bm, rect);
                          }}
                        >
                          <Zap size={11} /> TIL
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
