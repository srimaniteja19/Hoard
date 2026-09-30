"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Film,
  Flame,
  Layers,
  Play,
  Sparkles,
} from "lucide-react";
import { sortParts, type PartState } from "@/lib/studio/series";
import {
  STATUS_LABEL,
  STUDIO_STATUSES,
  type StudioPiece,
  type StudioSeries,
  type StudioStatus,
} from "@/lib/studio/types";

interface Props {
  series: StudioSeries;
  pieces: StudioPiece[];
  onOpenPiece: (id: string) => void;
  onOpenPart: (seriesId: string, n: number) => void;
  onUpdateStatus?: (pieceId: string, status: StudioStatus) => void;
}

export function SeriesRoadmap({
  series,
  pieces,
  onOpenPiece,
  onOpenPart,
  onUpdateStatus,
}: Props) {
  const parts = useMemo(() => sortParts(series.parts), [series.parts]);

  const pieceMap = useMemo(() => {
    const map = new Map<number, StudioPiece>();
    for (const p of parts) {
      if (p.pieceId) {
        const found = pieces.find((x) => x.id === p.pieceId);
        if (found) map.set(p.n, found);
      }
    }
    return map;
  }, [parts, pieces]);

  const advancePiece = (piece: StudioPiece) => {
    if (!onUpdateStatus) return;
    const idx = STUDIO_STATUSES.indexOf(piece.status);
    if (idx < STUDIO_STATUSES.length - 1) {
      onUpdateStatus(piece.id, STUDIO_STATUSES[idx + 1]);
    }
  };

  const completedCount = parts.filter((p) => {
    const piece = pieceMap.get(p.n);
    return piece && (piece.status === "ready" || piece.status === "posted");
  }).length;

  const pct = Math.round((completedCount / (parts.length || 1)) * 100);

  return (
    <div className="studio-roadmap">
      <div className="studio-roadmap-head">
        <div className="studio-roadmap-title">
          <Film size={15} aria-hidden="true" />
          <strong>{series.title} — Episode Roadmap</strong>
          {series.theme ? <span className="studio-theme-tag">{series.theme}</span> : null}
        </div>
        <div className="studio-roadmap-stat">
          <span>{completedCount} of {parts.length} episodes complete ({pct}%)</span>
          <div className="studio-roadmap-bar">
            <div className="studio-roadmap-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="studio-roadmap-track">
        {parts.map((p, idx) => {
          const piece = pieceMap.get(p.n);
          const isNext = p.n === series.nextPart;
          const status = piece ? piece.status : "planned";
          const isDone = status === "ready" || status === "posted";

          return (
            <div
              key={p.n}
              className={`studio-roadmap-node ${isNext ? "is-next" : ""} ${isDone ? "is-done" : ""}`}
            >
              {idx > 0 ? (
                <div
                  className={`studio-roadmap-connector ${
                    parts[idx - 1] &&
                    (pieceMap.get(parts[idx - 1].n)?.status === "ready" ||
                      pieceMap.get(parts[idx - 1].n)?.status === "posted")
                      ? "is-active"
                      : ""
                  }`}
                />
              ) : null}

              <div
                className="studio-roadmap-card"
                role="button"
                tabIndex={0}
                onClick={() => onOpenPart(series.id, p.n)}
                onKeyDown={(e) => e.key === "Enter" && onOpenPart(series.id, p.n)}
              >
                <div className="studio-roadmap-card-top">
                  <span className="studio-roadmap-part-num">P{String(p.n).padStart(2, "0")}</span>
                  {isNext ? (
                    <span className="studio-pill studio-pill-next">NEXT UP</span>
                  ) : isDone ? (
                    <span className="studio-pill is-done">
                      <Check size={11} aria-hidden="true" /> Done
                    </span>
                  ) : null}
                </div>

                <h4 className="studio-roadmap-card-title">{p.title}</h4>

                <div className="studio-roadmap-card-foot">
                  <span className={`studio-pill studio-status-${status}`}>
                    {STATUS_LABEL[status as StudioStatus] || "Planned"}
                  </span>

                  {piece && piece.status !== "posted" && onUpdateStatus ? (
                    <button
                      type="button"
                      className="studio-roadmap-advance-btn"
                      title="Advance to next production stage"
                      onClick={(e) => {
                        e.stopPropagation();
                        advancePiece(piece);
                      }}
                    >
                      <span>Advance</span>
                      <ArrowRight size={11} aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="studio-muted studio-mono studio-small">
                      {piece ? "View →" : "Start →"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
