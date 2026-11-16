"use client";

import React, { useMemo } from "react";
import { ChannelMediaItem, ShowUserRecord, ShowStatus } from "@/lib/channel100/types";
import { artFor, fmtH, fmtM, jwUrl } from "@/lib/channel100/data";

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
  const art = useMemo(() => artFor(item), [item]);
  const status = record.s || "";

  const stampLabel: Record<string, string> = {
    seen: "✓ SEEN",
    want: "+ WANT",
    watching: "▶ ON NOW",
  };

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
    ? `${item.seasons ? `${item.seasons}S · ` : ""}${
        item.eps ? `${item.eps} eps · ` : ""
      }${fmtH(item.hours)}`
    : fmtM(item.mins);

  return (
    <article
      className={`ch100-card card ${status ? `is-${status}` : ""}`}
      data-id={item.id}
    >
      {/* Colorful Illustrated Banner / Swatch */}
      <div
        className={`ch100-art art ${art.pat}`}
        style={{ backgroundColor: art.bg }}
        onClick={() => onOpenModal(item.id)}
      >
        <span className="ch100-rank">
          #{String(item.rank).padStart(3, "0")}
        </span>

        {item.imdb > 0 && !item.custom && (
          <span className="ch100-art-imdb" title="Aggregate rating">
            ★ {item.imdb.toFixed(1)}
          </span>
        )}

        {status && (
          <span className={`ch100-stamp ${status}`}>
            {stampLabel[status] || status}
          </span>
        )}

        <span
          className="ch100-art-svg"
          dangerouslySetInnerHTML={{ __html: art.svg }}
          aria-hidden="true"
        />
      </div>

      {/* Card Body */}
      <div className="ch100-cbody">
        <div className="ch100-titlebox">
          <div className="ch100-title-row">
            <h3>
              <button
                type="button"
                className="ch100-card-title-btn"
                onClick={() => onOpenModal(item.id)}
              >
                {item.title}
              </button>
            </h3>
            {record.r ? (
              <span
                className="ch100-user-rating"
                aria-label={`Your rating: ${record.r} of 5 stars`}
              >
                {"★".repeat(record.r)}
              </span>
            ) : null}
          </div>
          <div className="ch100-meta">{metaPrimary}</div>
        </div>

        {/* Colorful Tags */}
        <div className="ch100-tags">
          {item.where && (
            <a
              className="ch100-tag where"
              href={jwUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Where to watch"
            >
              ▶ {item.where}
            </a>
          )}
          {item.genre && <span className="ch100-tag genre">{item.genre}</span>}
          {item.lang && (
            <span className="ch100-tag lang">
              {item.langFlag} {item.lang}
            </span>
          )}
        </div>

        {/* Concise Synopsis (clickable to open full details & cast) */}
        <button
          type="button"
          className="ch100-sub-btn"
          onClick={() => onOpenModal(item.id)}
          title="Click for full description, cast, and details"
        >
          <span className="ch100-sub">{item.blurb || item.sub}</span>
        </button>

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

          <div
            className="ch100-acts acts"
            role="group"
            aria-label={`Status for ${item.title}`}
          >
            <button
              type="button"
              className="ch100-act act seen"
              aria-pressed={status === "seen"}
              onClick={() => onToggleStatus(item.id, "seen")}
              title="Mark as seen"
            >
              ✓ Seen
            </button>
            <button
              type="button"
              className="ch100-act act watching"
              aria-pressed={status === "watching"}
              onClick={() => onToggleStatus(item.id, "watching")}
              title="Mark as watching"
            >
              ▶ Watching
            </button>
            <button
              type="button"
              className="ch100-act act want"
              aria-pressed={status === "want"}
              onClick={() => onToggleStatus(item.id, "want")}
              title="Mark as want to watch"
            >
              + Want
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
