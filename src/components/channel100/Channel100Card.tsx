"use client";

import React from "react";
import { ChannelMediaItem, ShowUserRecord, ShowStatus } from "@/lib/channel100/types";
import { fmtH, fmtM } from "@/lib/channel100/data";

interface Channel100CardProps {
  item: ChannelMediaItem;
  record: ShowUserRecord;
  onOpenModal: (id: string) => void;
  onToggleStatus: (id: string, status: ShowStatus) => void;
  onIncrementEpisode?: (id: string) => void;
}

export const Channel100Card: React.FC<Channel100CardProps> = ({
  item,
  record,
  onOpenModal,
  onToggleStatus,
  onIncrementEpisode,
}) => {
  const status = record.s || "";

  const metaPrimary = item.custom
    ? `${item.customKind ? item.customKind.toUpperCase() : "LOG"}${
        item.year ? ` · ${item.year}` : ""
      }`
    : item.kind === "tv"
    ? `${item.years || item.year || ""}${
        item.network ? ` · ${item.network}` : ""
      }`
    : `${item.year || ""}${item.director ? ` · ${item.director}` : ""}`;

  const runtimeLabel = item.custom
    ? item.customKind === "film"
      ? fmtM(item.mins || 120)
      : `${item.season ? `S${item.season} ` : ""}Ep ${item.episode || 1}${
          item.totalEpisodes ? `/${item.totalEpisodes}` : ""
        }`
    : item.kind === "tv"
    ? `${item.eps ? `${item.eps} eps · ` : ""}${fmtH(item.hours)}`
    : fmtM(item.mins);

  return (
    <article
      className={`ch100-card card ${status ? `is-${status}` : ""}`}
      data-id={item.id}
    >
      {/* Top Meta Row: Rank, Genre/Language, Rating */}
      <div className="ch100-card-top">
        <div className="ch100-card-rank-group">
          <span className="ch100-rank-pill">
            #{String(item.rank).padStart(3, "0")}
          </span>
          {item.genre && <span className="ch100-genre-pill">{item.genre}</span>}
          {item.lang && item.lang !== "English" && (
            <span className="ch100-lang-pill">
              {item.langFlag} {item.lang}
            </span>
          )}
        </div>

        <div className="ch100-card-score-group">
          {record.r ? (
            <span
              className="ch100-user-rating"
              aria-label={`Your rating: ${record.r} of 5 stars`}
            >
              {"★".repeat(record.r)}
            </span>
          ) : null}
          {item.imdb > 0 && !item.custom && (
            <span className="ch100-imdb-pill" title="Aggregate rating">
              ★ {item.imdb.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Title & Creator/Year */}
      <div className="ch100-titlebox">
        <h3>
          <button
            type="button"
            className="ch100-card-title-btn"
            onClick={() => onOpenModal(item.id)}
          >
            {item.title}
          </button>
        </h3>
        <div className="ch100-meta">{metaPrimary}</div>
      </div>

      {/* Concise Synopsis */}
      <p className="ch100-sub">{item.blurb || item.sub}</p>

      {/* Bottom Bar: Runtime & Segmented Status Controls */}
      <div className="ch100-card-footer">
        <div className="ch100-runtime-meta">
          <span>{runtimeLabel}</span>
          {item.custom && item.customKind !== "film" && onIncrementEpisode && (
            <button
              type="button"
              className="ch100-ep-step-btn"
              onClick={(e) => {
                e.stopPropagation();
                onIncrementEpisode(item.id);
              }}
              title="Advance watched episode by 1"
            >
              +1 Ep
            </button>
          )}
        </div>

        <div className="ch100-acts acts" role="group" aria-label={`Status for ${item.title}`}>
          <button
            type="button"
            className="ch100-act act seen"
            aria-pressed={status === "seen"}
            onClick={() => onToggleStatus(item.id, "seen")}
            title="Mark as seen"
          >
            Seen
          </button>
          <button
            type="button"
            className="ch100-act act watching"
            aria-pressed={status === "watching"}
            onClick={() => onToggleStatus(item.id, "watching")}
            title="Mark as watching"
          >
            Watching
          </button>
          <button
            type="button"
            className="ch100-act act want"
            aria-pressed={status === "want"}
            onClick={() => onToggleStatus(item.id, "want")}
            title="Mark as want to watch"
          >
            Want
          </button>
        </div>
      </div>
    </article>
  );
};
