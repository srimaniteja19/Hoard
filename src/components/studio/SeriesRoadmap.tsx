"use client";

import { useMemo, useRef } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Flame,
  Send,
  Sparkles,
} from "lucide-react";
import { sortParts } from "@/lib/studio/series";
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
  const trackRef = useRef<HTMLDivElement>(null);
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

  const scrollTrack = (direction: "left" | "right") => {
    if (!trackRef.current) return;
    const offset = direction === "left" ? -280 : 280;
    trackRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  // Detailed breakdown
  const postedCount = parts.filter((p) => pieceMap.get(p.n)?.status === "posted").length;
  const readyCount = parts.filter((p) => pieceMap.get(p.n)?.status === "ready").length;
  const inProgressCount = parts.filter((p) => {
    const st = pieceMap.get(p.n)?.status;
    return st === "writing" || st === "recording" || st === "making";
  }).length;
  const plannedCount = parts.length - (postedCount + readyCount + inProgressCount);

  const completedCount = postedCount + readyCount;
  const pct = Math.round((completedCount / (parts.length || 1)) * 100);

  return (
    <section className="studio-roadmap" aria-label={`${series.title} Episode Roadmap`}>
      {/* Editorial Broadcast Header */}
      <div className="studio-roadmap-head">
        <div className="studio-roadmap-title-group">
          <div className="studio-roadmap-badge-icon" aria-hidden="true">
            <Film size={15} />
          </div>
          <div className="studio-roadmap-meta">
            <div className="studio-roadmap-title-row">
              <h3 className="studio-roadmap-h3">{series.title}</h3>
              <span className="studio-roadmap-chip">{parts.length}-Episode Series</span>
              {series.theme ? (
                <span className="studio-roadmap-theme-chip" title="Series visual & editorial theme">
                  <Sparkles size={10} aria-hidden="true" />
                  <span>{series.theme}</span>
                </span>
              ) : null}
            </div>
            <p className="studio-roadmap-sub">
              {postedCount} posted · {readyCount} ready for buffer · {inProgressCount} in progress · {plannedCount} planned
            </p>
          </div>
        </div>

        {/* Progress bar & navigation controls */}
        <div className="studio-roadmap-controls">
          <div className="studio-roadmap-stat-box">
            <div className="studio-roadmap-stat-labels">
              <span className="studio-roadmap-pct">{pct}%</span>
              <span className="studio-roadmap-count">
                {completedCount} of {parts.length} Ready
              </span>
            </div>
            <div className="studio-roadmap-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="studio-roadmap-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="studio-roadmap-nav-btns">
            <button
              type="button"
              className="studio-roadmap-nav-btn"
              onClick={() => scrollTrack("left")}
              title="Scroll left"
              aria-label="Scroll episodes left"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              className="studio-roadmap-nav-btn"
              onClick={() => scrollTrack("right")}
              title="Scroll right"
              aria-label="Scroll episodes right"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Episode Timeline Track */}
      <div className="studio-roadmap-track" ref={trackRef}>
        {parts.map((p, idx) => {
          const piece = pieceMap.get(p.n);
          const isNext = p.n === series.nextPart && (!piece || piece.status !== "posted");
          const status = piece ? piece.status : "planned";

          // Unambiguous card state
          let cardState: "posted" | "ready" | "active" | "next" | "planned" = "planned";
          if (status === "posted") {
            cardState = "posted";
          } else if (status === "ready") {
            cardState = "ready";
          } else if (piece && (status === "writing" || status === "recording" || status === "making")) {
            cardState = "active";
          } else if (isNext) {
            cardState = "next";
          }

          return (
            <div
              key={p.n}
              className={`studio-roadmap-card state-${cardState} ${isNext ? "is-next" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpenPart(series.id, p.n)}
              onKeyDown={(e) => e.key === "Enter" && onOpenPart(series.id, p.n)}
            >
              {/* Stepper Rail Node & Badge */}
              <div className="studio-roadmap-card-top">
                <div className="studio-roadmap-num-wrap">
                  <span className="studio-roadmap-part-num">P{String(p.n).padStart(2, "0")}</span>
                  {cardState === "posted" && <Check size={11} className="studio-step-icon is-posted" aria-hidden="true" />}
                  {cardState === "ready" && <Send size={11} className="studio-step-icon is-ready" aria-hidden="true" />}
                  {cardState === "active" && <Flame size={11} className="studio-step-icon is-active" aria-hidden="true" />}
                  {cardState === "next" && <Sparkles size={11} className="studio-step-icon is-next" aria-hidden="true" />}
                </div>

                {/* Exactly ONE status badge */}
                {cardState === "posted" && (
                  <span className="studio-rm-badge is-posted">
                    <Check size={10} aria-hidden="true" />
                    <span>Posted</span>
                  </span>
                )}
                {cardState === "ready" && (
                  <span className="studio-rm-badge is-ready">
                    <Send size={10} aria-hidden="true" />
                    <span>Ready</span>
                  </span>
                )}
                {cardState === "active" && (
                  <span className="studio-rm-badge is-active">
                    <Clock size={10} aria-hidden="true" />
                    <span>{STATUS_LABEL[piece?.status as StudioStatus] || "Active"}</span>
                  </span>
                )}
                {cardState === "next" && (
                  <span className="studio-rm-badge is-next">
                    <span>NEXT UP</span>
                  </span>
                )}
                {cardState === "planned" && (
                  <span className="studio-rm-badge is-planned">
                    <span>Planned</span>
                  </span>
                )}
              </div>

              {/* Episode Title */}
              <h4 className="studio-roadmap-card-title" title={p.title}>
                {p.title}
              </h4>

              {/* Clean Contextual Footer */}
              <div className="studio-roadmap-card-foot">
                <span className="studio-roadmap-stage-text">
                  {cardState === "posted"
                    ? "Published"
                    : cardState === "ready"
                    ? "Buffer Queue"
                    : cardState === "active"
                    ? "In Studio"
                    : cardState === "next"
                    ? "Priority Episode"
                    : "Not Started"}
                </span>

                {cardState === "ready" && onUpdateStatus && piece ? (
                  <button
                    type="button"
                    className="studio-roadmap-action-btn is-advance"
                    title="Mark this episode as posted"
                    onClick={(e) => {
                      e.stopPropagation();
                      advancePiece(piece);
                    }}
                  >
                    <span>Mark Posted</span>
                    <Check size={10} aria-hidden="true" />
                  </button>
                ) : cardState === "active" && onUpdateStatus && piece ? (
                  <button
                    type="button"
                    className="studio-roadmap-action-btn is-advance"
                    title="Advance to next production stage"
                    onClick={(e) => {
                      e.stopPropagation();
                      advancePiece(piece);
                    }}
                  >
                    <span>Advance</span>
                    <ArrowRight size={10} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="studio-roadmap-action-link">
                    {piece ? "Open →" : "Draft →"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
