"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Check, Crown, Play, Plus, Star } from "lucide-react";
import { ChannelMediaItem, ShowUserRecord, ShowStatus } from "@/lib/channel100/types";
import { artFor, fmtH, fmtM, jwUrl } from "@/lib/channel100/data";
import { formatReleaseBadge } from "@/lib/channel100/releases";
import { fetchItemArtwork, getCachedArtwork } from "@/lib/channel100/artworkClient";

interface Channel100CardProps {
  item: ChannelMediaItem;
  record: ShowUserRecord;
  isFavorite?: boolean;
  onOpenModal: (id: string) => void;
  onToggleStatus: (id: string, status: ShowStatus) => void;
  onToggleFavorite?: (item: ChannelMediaItem) => void;
  onIncrementEpisode?: (id: string) => void;
}

export const Channel100Card: React.FC<Channel100CardProps> = ({
  item,
  record,
  isFavorite = false,
  onOpenModal,
  onToggleStatus,
  onToggleFavorite,
  onIncrementEpisode,
}) => {
  const art = useMemo(() => artFor(item), [item]);
  const status = record.s || "";
  const artRef = useRef<HTMLDivElement | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(() => {
    const cached = getCachedArtwork(item);
    return cached ?? null;
  });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    const cached = getCachedArtwork(item);
    if (cached !== undefined) {
      setPosterUrl(cached);
      return;
    }
    setPosterUrl(null);

    const el = artRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      let cancelled = false;
      fetchItemArtwork(item).then((url) => {
        if (!cancelled && url) setPosterUrl(url);
      });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          fetchItemArtwork(item).then((url) => {
            if (!cancelled && url) setPosterUrl(url);
          });
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [item]);

  const showPoster = Boolean(posterUrl && !imgFailed);
  const showLangTag = Boolean(
    item.lang && item.lang.trim().toLowerCase() !== "english"
  );

  const statusMeta: Record<string, { label: string }> = {
    seen: { label: "Seen" },
    want: { label: "Want to watch" },
    watching: { label: "Watching now" },
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
      className={`ch100-card ${status ? `is-${status}` : ""}`}
      data-id={item.id}
    >
      {/* Poster / Artwork Banner */}
      <div
        ref={artRef}
        className={`ch100-art art ${showPoster ? "has-img" : art.pat}`}
        style={showPoster ? undefined : { backgroundColor: art.bg }}
        onClick={() => onOpenModal(item.id)}
      >
        {showPoster && posterUrl ? (
          <>
            <img
              className="ch100-art-bg"
              src={posterUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <img
              className="ch100-art-img"
              src={posterUrl}
              alt={item.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          </>
        ) : (
          <span
            className="ch100-art-svg"
            dangerouslySetInnerHTML={{ __html: art.svg }}
            aria-hidden="true"
          />
        )}

        <span className="ch100-rank">
          #{String(item.rank).padStart(3, "0")}
        </span>

        {item.imdb > 0 && !item.custom && (
          <span className="ch100-art-imdb" title="Aggregate rating">
            <Star size={10} fill="currentColor" strokeWidth={2} aria-hidden="true" />
            {item.imdb.toFixed(1)}
          </span>
        )}

        {onToggleFavorite && (
          <button
            type="button"
            className={`ch100-card-fav-btn ${isFavorite ? "is-fav" : ""}`}
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
            title={
              isFavorite
                ? "Remove from All-Time Favorites"
                : "Induct into All-Time Favorites"
            }
            aria-label={
              isFavorite
                ? `Remove ${item.title} from All-Time Favorites`
                : `Add ${item.title} to All-Time Favorites`
            }
          >
            <Crown size={12} strokeWidth={2.4} aria-hidden="true" />
          </button>
        )}

        {status && (
          <span
            className={`ch100-stamp ${status}`}
            title={statusMeta[status]?.label || status}
            aria-label={statusMeta[status]?.label || status}
          >
            {status === "seen" && <Check size={12} strokeWidth={3} aria-hidden="true" />}
            {status === "watching" && <Play size={10} fill="currentColor" strokeWidth={2} aria-hidden="true" />}
            {status === "want" && <Plus size={12} strokeWidth={3} aria-hidden="true" />}
          </span>
        )}
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

        {/* Refined Single-Line Tags */}
        <div className="ch100-tags">
          {item.releaseDate && (
            <span className="ch100-tag release">
              <Calendar size={10} strokeWidth={2.4} aria-hidden="true" />
              {formatReleaseBadge(item.releaseDate)}
            </span>
          )}
          {item.where && (
            <a
              className="ch100-tag where"
              href={jwUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={`Watch on ${item.where}`}
            >
              <Play size={9} fill="currentColor" strokeWidth={2} aria-hidden="true" />
              <span>{item.where}</span>
            </a>
          )}
          {item.genre && <span className="ch100-tag genre">{item.genre}</span>}
          {showLangTag && (
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
              <Check size={11} strokeWidth={2.7} aria-hidden="true" />
              Seen
            </button>
            <button
              type="button"
              className="ch100-act act watching"
              aria-pressed={status === "watching"}
              onClick={() => onToggleStatus(item.id, "watching")}
              title="Mark as watching"
            >
              <Play size={9.5} fill={status === "watching" ? "currentColor" : "none"} strokeWidth={2.5} aria-hidden="true" />
              Watching
            </button>
            <button
              type="button"
              className="ch100-act act want"
              aria-pressed={status === "want"}
              onClick={() => onToggleStatus(item.id, "want")}
              title="Mark as want to watch"
            >
              <Plus size={11} strokeWidth={2.7} aria-hidden="true" />
              Want
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
