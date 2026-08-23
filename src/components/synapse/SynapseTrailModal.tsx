"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bookmark } from "@/types";
import {
  SynapseNode,
  layoutSynapseNodes,
  findLocalSynapseCandidates,
} from "@/lib/synapse/synapseTrail";
import { TYPES } from "@/data/initialBookmarks";
import {
  X,
  Zap,
  ExternalLink,
  BookOpen,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Radio,
} from "lucide-react";

interface SynapseTrailModalProps {
  targetBookmark: Bookmark | null;
  allBookmarks: Bookmark[];
  onClose: () => void;
  onOpenBookmark: (id: number) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
}

export const SynapseTrailModal: React.FC<SynapseTrailModalProps> = ({
  targetBookmark,
  allBookmarks,
  onClose,
  onOpenBookmark,
  onGhostRead,
  onDischarge,
}) => {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<SynapseNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<SynapseNode | null>(null);

  const fetchSynapseTrail = useCallback(async () => {
    if (!targetBookmark) return;

    try {
      setLoading(true);

      // 1. First get instant local heuristic candidates so modal opens instantly
      const localCandidates = findLocalSynapseCandidates(targetBookmark, allBookmarks);
      if (localCandidates.length > 0) {
        const laidOut = layoutSynapseNodes(localCandidates, 160);
        setNodes(laidOut);
        setSelectedNode(laidOut[0] || null);
      }

      // 2. Fetch remote vector embeddings connections
      const res = await fetch("/api/synapse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkId: targetBookmark.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.connections && data.connections.length > 0) {
          // Merge vector connections with local candidates
          const combined = [...data.connections];
          for (const local of localCandidates) {
            if (!combined.some((c) => c.id === local.id)) {
              combined.push(local);
            }
          }
          const finalNodes = layoutSynapseNodes(combined.slice(0, 6), 160);
          setNodes(finalNodes);
          setSelectedNode(finalNodes[0] || null);
        }
      }
    } catch (err) {
      console.warn("[Synapse Modal] fallback to local candidates:", err);
    } finally {
      setLoading(false);
    }
  }, [targetBookmark, allBookmarks]);

  useEffect(() => {
    if (targetBookmark) {
      fetchSynapseTrail();
    }
  }, [targetBookmark, fetchSynapseTrail]);

  if (!targetBookmark) return null;

  const matchedBookmark = selectedNode
    ? allBookmarks.find((b) => String(b.id) === selectedNode.id.replace("bookmark-", ""))
    : null;

  return (
    <div className="synapse-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="synapse-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Strip */}
        <header className="synapse-header">
          <div className="synapse-brand">
            <Radio size={16} className="synapse-radio-icon" />
            <span className="synapse-badge">🌌 SYNAPSE TRAIL</span>
            <span className="synapse-title-sub">SEMANTIC SERENDIPITY ENGINE</span>
          </div>

          <button className="synapse-close-btn" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </header>

        {/* Constellation Canvas Viewport */}
        <div className="synapse-canvas-wrap">
          <div className="synapse-canvas-inner">
            <svg
              className="synapse-svg-lines"
              viewBox="-200 -200 400 400"
              width="100%"
              height="100%"
            >
              {/* Radar Grid Circles */}
              <circle cx="0" cy="0" r="70" className="synapse-radar-ring ring-1" />
              <circle cx="0" cy="0" r="130" className="synapse-radar-ring ring-2" />
              <circle cx="0" cy="0" r="180" className="synapse-radar-ring ring-3" />

              {/* Connecting Vector Lines from Center to Satellites */}
              {nodes.map((node) => (
                <g key={`line-${node.id}`}>
                  <line
                    x1="0"
                    y1="0"
                    x2={node.x || 0}
                    y2={node.y || 0}
                    className={`synapse-vector-line ${selectedNode?.id === node.id ? "active" : ""}`}
                    strokeDasharray={node.connectionType === "TIL Synthesis" ? "4 2" : "none"}
                  />
                </g>
              ))}
            </svg>

            {/* Center Node: Active Target Bookmark */}
            <div className="synapse-center-node" title={targetBookmark.t}>
              <div className="center-node-pulse" />
              <div className="center-node-core">
                <span className="center-icon">⚡</span>
                <span className="center-label">ORIGIN</span>
              </div>
            </div>

            {/* Orbiting Satellite Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const meta = TYPES[node.kind as keyof typeof TYPES] || { c: "var(--yel)", fg: "#000" };

              return (
                <div
                  key={node.id}
                  className={`synapse-satellite-node ${isSelected ? "selected" : ""}`}
                  style={{
                    transform: `translate(${node.x || 0}px, ${node.y || 0}px)`,
                  }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div
                    className="satellite-badge"
                    style={{ background: meta.c, color: meta.fg }}
                  >
                    {node.ownerType === "til" ? "💡 TIL" : node.kind}
                  </div>
                  <div className="satellite-sim-tag">{node.similarity}% MATCH</div>
                  <div className="satellite-title-pill">{node.title}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Connection Inspector Card */}
        <footer className="synapse-footer">
          {selectedNode ? (
            <div className="synapse-inspector-card">
              <div className="inspector-top-row">
                <span className="inspector-tag-type">
                  ⚡ {selectedNode.connectionType.toUpperCase()}
                </span>
                <span className="inspector-sim-badge">
                  {selectedNode.similarity}% SEMANTIC AFFINITY
                </span>
                <span className="inspector-time-tag">
                  {selectedNode.timeDistance}
                </span>
              </div>

              <h3 className="inspector-title">{selectedNode.title}</h3>

              {selectedNode.note && (
                <p className="inspector-note">&ldquo;{selectedNode.note}&rdquo;</p>
              )}

              <div className="inspector-actions-row">
                <a
                  href={selectedNode.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="synapse-act-btn open"
                >
                  <ExternalLink size={11} /> OPEN LINK
                </a>

                {matchedBookmark && onGhostRead && (
                  <button
                    className="synapse-act-btn ghost"
                    onClick={() => onGhostRead(matchedBookmark)}
                  >
                    <BookOpen size={11} /> GHOST READ
                  </button>
                )}

                {matchedBookmark && onDischarge && (
                  <button
                    className="synapse-act-btn til"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onDischarge(matchedBookmark, rect);
                    }}
                  >
                    <Zap size={11} /> DISCHARGE TO TIL
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="synapse-empty-inspector">
              <Sparkles size={16} color="var(--yel)" />
              <span>No related connections found for this item yet.</span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
