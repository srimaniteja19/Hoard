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

  const stampLabel: Record<string, string> = {
    seen: "SEEN",
    want: "WANT",
    watching: "ON NOW",
  };

  const status = record.s || "";
  const rankPre = item.custom
    ? "LOG"
    : item.kind === "film"
    ? "No."
    : "CH";

  const isTracker = item.kind === "tracker" || item.custom;

  return (
    <article className={`ch100-card card ${isTracker ? "tracker-card" : ""}`} data-id={item.id}>
      {/* Art Block / Badge with Hover Icon Scale & Tilt */}
      <button
        type="button"
        className={`ch100-art art ${art.pat}`}
        style={{ backgroundColor: art.bg }}
        onClick={() => onOpenModal(item.id)}
        aria-label={`Details for ${item.title}`}
      >
        <span className="ch100-rank rank">
          <small>{item.langFlag || rankPre}</small>
          {String(item.rank).padStart(2, "0")}
        </span>

        {status && (
          <span className={`ch100-stamp stamp ${status}`}>
            {stampLabel[status] || status}
          </span>
        )}

        {/* Inline SVG Motif + Filmstrip Perforations if film */}
        <span
          style={{ display: "contents" }}
          dangerouslySetInnerHTML={{ __html: art.svg + (art.stripHtml || "") }}
          aria-hidden="true"
        />
      </button>

      {/* Card Body */}
      <div className="ch100-cbody cbody">
        <div className="ch100-titlebox titlebox">
          <h3>
            <button
              type="button"
              onClick={() => onOpenModal(item.id)}
              title={`Open details for ${item.title}`}
            >
              {item.langFlag && <span className="ch100-title-flag">{item.langFlag} </span>}
              {item.title}
            </button>
          </h3>
          <div className="ch100-meta meta">
            {item.custom ? (
              <>
                <span>{item.lang || "Any language"}</span>
                <span>·</span>
                <span>{item.customKind ? item.customKind.toUpperCase() : "TITLE"}</span>
                {item.year && (
                  <>
                    <span>·</span>
                    <span>{item.year}</span>
                  </>
                )}
              </>
            ) : item.kind === "tv" ? (
              <>
                <span>{item.years}</span>
                <span>·</span>
                <span>{item.network}</span>
              </>
            ) : (
              <>
                <span>{item.year}</span>
                <span>·</span>
                <span>{item.director}</span>
              </>
            )}
            {record.r ? (
              <span
                className="ch100-mystars mystars"
                aria-label={`Your rating: ${record.r} of 5 stars`}
              >
                {"★".repeat(record.r)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Tags */}
        <div className="ch100-tags tags">
          {item.where && (
            <a
              className="ch100-tag tag where"
              href={jwUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              title="Check streaming availability"
              onClick={(e) => e.stopPropagation()}
            >
              ▶ {item.where}
            </a>
          )}
          {item.imdb > 0 && (
            <span
              className="ch100-tag tag imdb"
              title="Rating"
            >
              IMDb {item.imdb.toFixed(1)}
            </span>
          )}
          {item.genre && <span className="ch100-tag tag">{item.genre}</span>}
          {item.limited && (
            <span className="ch100-tag tag lim">Limited</span>
          )}
          {item.custom && item.lang && (
            <span className="ch100-tag tag lang-tag">
              {item.langFlag} {item.lang}
            </span>
          )}
        </div>

        {/* Sub-genres & Tone or Notes Preview */}
        <div className="ch100-sub sub">{item.blurb || item.sub}</div>

        {/* Runtime / Episode Statistics */}
        {item.custom ? (
          item.customKind === "film" ? (
            <div className="ch100-rt rt">
              <div>
                <b>{item.year || "—"}</b>
                <span>Year</span>
              </div>
              <div>
                <b>{fmtM(item.mins || 120)}</b>
                <span>Runtime</span>
              </div>
              <div>
                <b style={{ fontSize: (item.lang?.length || 0) > 9 ? 13 : 15 }}>
                  {item.lang ? item.lang.split(",")[0] : "Movie"}
                </b>
                <span>Language</span>
              </div>
            </div>
          ) : (
            <div className="ch100-rt rt ch100-rt-tracker">
              <div>
                <b>{item.season ? `S${item.season} · ` : ""}Ep {item.episode || 1}</b>
                <span>Current</span>
              </div>
              <div>
                <b>{item.totalEpisodes ? item.totalEpisodes : "—"}</b>
                <span>Total Eps</span>
              </div>
              <div>
                {onIncrementEpisode ? (
                  <button
                    type="button"
                    className="ch100-btn-quick-step"
                    onClick={(e) => {
                      e.stopPropagation();
                      onIncrementEpisode(item.id);
                    }}
                    title="Quickly advance +1 episode"
                  >
                    +1 Ep
                  </button>
                ) : (
                  <b>{fmtH(item.hours)}</b>
                )}
                <span>{onIncrementEpisode ? "Quick +" : "Runtime"}</span>
              </div>
            </div>
          )
        ) : item.kind === "tv" ? (
          <div
            className="ch100-rt rt"
            title={
              item.approx
                ? "Still airing or recently wrapped: counts are approximate"
                : "Approximate totals"
            }
          >
            <div>
              <b>{item.seasons}</b>
              <span>{item.seasons === 1 ? "Season" : "Seasons"}</span>
            </div>
            <div>
              <b>{item.approx ? "≈" : ""}{item.eps}</b>
              <span>Episodes</span>
            </div>
            <div>
              <b>{item.approx ? "≈" : ""}{fmtH(item.hours)}</b>
              <span>To watch</span>
            </div>
          </div>
        ) : (
          <div className="ch100-rt rt">
            <div>
              <b>{item.year}</b>
              <span>Released</span>
            </div>
            <div>
              <b>{fmtM(item.mins)}</b>
              <span>Runtime</span>
            </div>
            <div>
              <b style={{ fontSize: (item.lang?.length || 0) > 9 ? 13 : 15 }}>
                {item.lang ? item.lang.split(",")[0] : "English"}
              </b>
              <span>Language</span>
            </div>
          </div>
        )}

        {/* Action Buttons with Neo-Brutalist Active Click Effect */}
        <div className="ch100-acts acts">
          <button
            type="button"
            className="ch100-act act seen"
            data-act="seen"
            aria-pressed={status === "seen"}
            onClick={() => onToggleStatus(item.id, "seen")}
            title="Mark as seen"
          >
            <span aria-hidden="true">✓</span> Seen
          </button>
          <button
            type="button"
            className="ch100-act act watching"
            data-act="watching"
            aria-pressed={status === "watching"}
            onClick={() => onToggleStatus(item.id, "watching")}
            title="Mark as currently watching"
          >
            <span aria-hidden="true">▶</span> Watching
          </button>
          <button
            type="button"
            className="ch100-act act want"
            data-act="want"
            aria-pressed={status === "want"}
            onClick={() => onToggleStatus(item.id, "want")}
            title="Add to want list"
          >
            <span aria-hidden="true">+</span> Want
          </button>
        </div>
      </div>
    </article>
  );
};
