"use client";

import { useState } from "react";
import {
  ArrowRight,
  Clapperboard,
  Film,
  Flame,
  Layers,
  Mic,
  Plus,
  Send,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { estimateSeconds } from "@/lib/studio/checks";
import {
  STATUS_LABEL,
  STUDIO_STATUSES,
  type StudioPiece,
  type StudioSeries,
  type StudioStatus,
} from "@/lib/studio/types";
import { FormatBadge, PillarDot } from "./StudioShared";

interface Props {
  pieces: StudioPiece[];
  series: StudioSeries[];
  onOpenPiece: (id: string) => void;
  onMovePiece: (id: string, status: StudioStatus) => void;
  onNewPiece: (values?: Partial<StudioPiece>) => void;
}

const STAGE_ICONS: Record<StudioStatus, typeof Clapperboard> = {
  writing: Film,
  recording: Mic,
  making: SlidersHorizontal,
  ready: Flame,
  posted: Clapperboard,
};

export function KanbanBoard({
  pieces,
  series,
  onOpenPiece,
  onMovePiece,
  onNewPiece,
}: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<StudioStatus | null>(null);

  const seriesMap = new Map<string, StudioSeries>(series.map((s) => [s.id, s]));

  return (
    <div className="studio-kanban">
      {STUDIO_STATUSES.map((st) => {
        const columnPieces = pieces.filter((p) => p.status === st);
        const Icon = STAGE_ICONS[st];
        const isDropTarget = dropTargetStatus === st;

        return (
          <div
            key={st}
            className={`studio-kanban-col studio-kanban-${st} ${isDropTarget ? "is-drop-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (dropTargetStatus !== st) setDropTargetStatus(st);
            }}
            onDragLeave={(e) => {
              // Only clear if leaving the column element itself
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDropTargetStatus(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDropTargetStatus(null);
              const pieceId = e.dataTransfer.getData("text/plain") || draggedId;
              if (pieceId) {
                onMovePiece(pieceId, st);
              }
            }}
          >
            {/* Column Header */}
            <div className="studio-kanban-col-head">
              <div className="studio-kanban-col-title">
                <Icon size={14} aria-hidden="true" />
                <h3>{STATUS_LABEL[st]}</h3>
                <span className="studio-kanban-count">{columnPieces.length}</span>
              </div>
              <button
                type="button"
                className="studio-btn studio-btn-plain studio-btn-sm"
                title={`New piece in ${STATUS_LABEL[st]}`}
                onClick={() => onNewPiece({ status: st })}
              >
                <Plus size={12} aria-hidden="true" />
              </button>
            </div>

            {/* Cards List in Column */}
            <div className="studio-kanban-cards">
              {columnPieces.map((p) => {
                const s = p.seriesId ? seriesMap.get(p.seriesId) : null;
                const { seconds } = estimateSeconds(p.script);
                const isDragging = draggedId === p.id;

                return (
                  <article
                    key={p.id}
                    className={`studio-kanban-card ${isDragging ? "is-dragging" : ""}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", p.id);
                      setDraggedId(p.id);
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDropTargetStatus(null);
                    }}
                    onClick={() => onOpenPiece(p.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => e.key === "Enter" && onOpenPiece(p.id)}
                  >
                    <div className="studio-kanban-card-top">
                      <FormatBadge format={p.format} />
                      <PillarDot pillar={p.pillar} />
                    </div>

                    {s ? (
                      <span className="studio-card-series-tag">
                        {s.title} · P{p.part}
                      </span>
                    ) : null}

                    <h4 className="studio-kanban-card-title">{p.title}</h4>

                    <div className="studio-kanban-card-foot">
                      <span className="studio-mono studio-small studio-muted">
                        ~{Math.round(seconds)}s · {p.script.length} scenes
                      </span>

                      {st !== "posted" ? (
                        <button
                          type="button"
                          className="studio-btn studio-btn-quiet studio-btn-sm"
                          title="Advance stage"
                          onClick={(e) => {
                            e.stopPropagation();
                            const idx = STUDIO_STATUSES.indexOf(st);
                            if (idx < STUDIO_STATUSES.length - 1) {
                              onMovePiece(p.id, STUDIO_STATUSES[idx + 1]);
                            }
                          }}
                        >
                          <ArrowRight size={13} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}

              {!columnPieces.length ? (
                <div className="studio-kanban-empty">
                  <span>Drop cards here</span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
