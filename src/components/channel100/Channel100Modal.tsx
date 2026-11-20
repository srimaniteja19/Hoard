"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Crown } from "lucide-react";
import { ChannelMediaItem, ShowUserRecord, ShowStatus } from "@/lib/channel100/types";
import { artFor, fmtH, fmtM, bingeDays, jwUrl, imdbUrl } from "@/lib/channel100/data";
import { fetchItemArtwork, getCachedArtwork } from "@/lib/channel100/artworkClient";

interface EnrichedMediaDetails {
  fullDescription: string | null;
  cast: string[];
  creatorOrDirector: string | null;
  country: string | null;
  source: string;
}

const CLIENT_DETAILS_CACHE = new Map<string, EnrichedMediaDetails>();

interface Channel100ModalProps {
  item: ChannelMediaItem | null;
  record: ShowUserRecord;
  isOpen: boolean;
  isFavorite?: boolean;
  prevLabel?: string | null;
  nextLabel?: string | null;
  onClose: () => void;
  onToggleStatus: (id: string, status: ShowStatus) => void;
  onToggleFavorite?: (item: ChannelMediaItem) => void;
  onSetRating: (id: string, rating: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onNavigateShow?: (direction: -1 | 1) => void;
  onEditCustom?: (id: string) => void;
  onDeleteCustom?: (id: string) => void;
  onIncrementEpisode?: (id: string) => void;
}

export const Channel100Modal: React.FC<Channel100ModalProps> = ({
  item,
  record,
  isOpen,
  isFavorite = false,
  prevLabel,
  nextLabel,
  onClose,
  onToggleStatus,
  onToggleFavorite,
  onSetRating,
  onUpdateNotes,
  onNavigateShow,
  onEditCustom,
  onDeleteCustom,
  onIncrementEpisode,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteSaveState, setNoteSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [enriched, setEnriched] = useState<EnrichedMediaDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const art = useMemo(() => (item ? artFor(item) : null), [item]);
  const status = record.s || "";

  useEffect(() => {
    setConfirmDelete(false);
    setNoteSaveState("idle");
    setImgFailed(false);
    if (!item) {
      setPosterUrl(null);
      return;
    }
    const cached = getCachedArtwork(item);
    if (cached !== undefined) {
      setPosterUrl(cached);
      return;
    }
    setPosterUrl(null);
    let cancelled = false;
    fetchItemArtwork(item).then((url) => {
      if (!cancelled && url) setPosterUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [item, isOpen]);

  // Fetch full description, lead cast, and creator/director details when modal opens
  useEffect(() => {
    if (!isOpen || !item) {
      setEnriched(null);
      setLoadingDetails(false);
      return;
    }

    const cached = CLIENT_DETAILS_CACHE.get(item.id);
    if (cached) {
      setEnriched(cached);
      setLoadingDetails(false);
      return;
    }

    let cancelled = false;
    setEnriched(null);
    setLoadingDetails(true);

    const imdbMatch = item.id.match(/^(?:tv|film)_(tt\d+)$/);
    const params = new URLSearchParams({
      title: item.title,
      kind: item.kind === "tv" || item.customKind === "tv" ? "tv" : "film",
    });
    if (item.year || item.start) {
      params.set("year", String(item.year || item.start));
    }
    if (imdbMatch?.[1]) {
      params.set("imdbId", imdbMatch[1]);
    }

    fetch(`/api/channel100/details?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: EnrichedMediaDetails | null) => {
        if (cancelled || !data) return;
        CLIENT_DETAILS_CACHE.set(item.id, data);
        setEnriched(data);
      })
      .catch(() => {
        // Gracefully keep base item.blurb
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen || !item) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable);
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft" && onNavigateShow) {
        e.preventDefault();
        onNavigateShow(-1);
      } else if (e.key === "ArrowRight" && onNavigateShow) {
        e.preventDefault();
        onNavigateShow(1);
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onToggleStatus(item!.id, "seen");
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        onToggleStatus(item!.id, "watching");
      } else if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        onToggleStatus(item!.id, "want");
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        const n = Number(e.key);
        onSetRating(item!.id, (record.r || 0) === n ? 0 : n);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, item, record.r, onClose, onNavigateShow, onToggleStatus, onSetRating]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => closeBtnRef.current?.focus(), 40);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen]);

  if (!isOpen || !item || !art) return null;

  const evenings = item.hours ? bingeDays(item.hours) : 1;

  return (
    <div
      className="ch100-overlay"
      id="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch100-mtitle"
    >
      <div ref={modalRef} className="ch100-modal">
        {/* Colorful Illustrated Modal Banner */}
        <div
          className={`ch100-modal-banner ${art.pat}`}
          style={{ backgroundColor: art.bg }}
        >
          {posterUrl && !imgFailed ? (
            <>
              <img
                className="ch100-modal-banner-bg"
                src={posterUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
              />
              <img
                className="ch100-modal-banner-img"
                src={posterUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
              />
            </>
          ) : (
            <span
              className="ch100-modal-banner-svg"
              dangerouslySetInnerHTML={{ __html: art.svg }}
              aria-hidden="true"
            />
          )}

          <span className="ch100-rank">
            #{String(item.rank).padStart(3, "0")}
          </span>

          <span
            className="ch100-modal-banner-svg"
            dangerouslySetInnerHTML={{ __html: art.svg }}
            aria-hidden="true"
          />

          <div className="ch100-modal-top-actions">
            {onNavigateShow && (prevLabel || nextLabel) && (
              <div className="ch100-modal-nav">
                <button
                  type="button"
                  className="ch100-modal-nav-btn"
                  onClick={() => onNavigateShow(-1)}
                  title="Previous title (Left Arrow)"
                >
                  ← {prevLabel || "Prev"}
                </button>
                <button
                  type="button"
                  className="ch100-modal-nav-btn"
                  onClick={() => onNavigateShow(1)}
                  title="Next title (Right Arrow)"
                >
                  {nextLabel || "Next"} →
                </button>
              </div>
            )}

            <button
              ref={closeBtnRef}
              type="button"
              className="ch100-x"
              id="mclose"
              onClick={onClose}
              aria-label="Close dialog"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="ch100-mbody">
          <div className="ch100-modal-meta-badges">
            {item.genre && <span className="ch100-tag genre">{item.genre}</span>}
            {item.lang && (
              <span className="ch100-tag lang">
                {item.langFlag} {item.lang}
              </span>
            )}
            {item.imdb > 0 && !item.custom && (
              <span className="ch100-art-imdb">★ {item.imdb.toFixed(1)}</span>
            )}
          </div>

          <h2 id="ch100-mtitle">{item.title}</h2>

          <div className="ch100-blurb-wrap">
            <p className="ch100-blurb">
              {enriched?.fullDescription &&
                enriched.fullDescription.length > (item.blurb?.length || 0)
                ? enriched.fullDescription
                : item.blurb}
            </p>
            {loadingDetails && (
              <span className="ch100-details-loading">
                Loading full synopsis &amp; cast…
              </span>
            )}
          </div>

          {/* Lead Actors / Cast */}
          {enriched?.cast && enriched.cast.length > 0 && (
            <div className="ch100-cast-block">
              <span className="ch100-lbl">Lead Cast</span>
              <div className="ch100-cast-list">
                {enriched.cast.map((actor) => (
                  <span key={actor} className="ch100-cast-pill">
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Structured Metadata Grid */}
          <dl className="ch100-facts">
            {item.custom ? (
              <>
                <dt>Language</dt>
                <dd>
                  {item.langFlag || "🌐"} {item.lang || "Not specified"}
                </dd>

                <dt>Medium</dt>
                <dd>
                  {item.customKind ? item.customKind.toUpperCase() : "TITLE"}{" "}
                  {item.genre ? `· ${item.genre}` : ""}
                </dd>

                <dt>Platform</dt>
                <dd>{item.where || "Personal library"}</dd>

                {item.customKind === "film" ? (
                  <>
                    <dt>Runtime</dt>
                    <dd>
                      {fmtM(item.mins || 120)} ({fmtH(item.hours)})
                    </dd>
                  </>
                ) : (
                  <>
                    <dt>Progress</dt>
                    <dd
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>
                        {item.season ? `Season ${item.season}, ` : ""}Episode{" "}
                        {item.episode || 1}{" "}
                        {item.totalEpisodes ? `of ${item.totalEpisodes}` : ""}
                      </span>
                      {onIncrementEpisode && (
                        <button
                          type="button"
                          className="ch100-ep-step-btn"
                          onClick={() => onIncrementEpisode(item.id)}
                          title="Advance watched episode by 1"
                        >
                          +1 Ep
                        </button>
                      )}
                    </dd>
                  </>
                )}

                {item.year && (
                  <>
                    <dt>Year</dt>
                    <dd>{item.year}</dd>
                  </>
                )}
              </>
            ) : item.kind === "tv" ? (
              <>
                <dt>Rank</dt>
                <dd>#{item.rank} in IMDb Top 250 TV</dd>

                <dt>Aired</dt>
                <dd>
                  {item.years || item.year}
                  {item.limited ? " · limited series" : ""}
                </dd>

                {item.network && (
                  <>
                    <dt>Network</dt>
                    <dd>{item.network}</dd>
                  </>
                )}

                {enriched?.creatorOrDirector && (
                  <>
                    <dt>Creator</dt>
                    <dd>{enriched.creatorOrDirector}</dd>
                  </>
                )}

                {enriched?.country && (
                  <>
                    <dt>Country</dt>
                    <dd>{enriched.country}</dd>
                  </>
                )}

                <dt>Where</dt>
                <dd>{item.where}</dd>

                <dt>Runtime</dt>
                <dd>
                  {item.seasons
                    ? `${item.seasons} ${item.seasons === 1 ? "season" : "seasons"} · `
                    : ""}
                  {item.eps
                    ? `${item.eps} ${item.eps === 1 ? "episode" : "episodes"} · `
                    : ""}
                  {fmtH(item.hours)}{" "}
                  <small>
                    ({evenings} {evenings === 1 ? "evening" : "evenings"} at 2h/night)
                  </small>
                </dd>
              </>
            ) : (
              <>
                <dt>Rank</dt>
                <dd>
                  #{item.rank} in{" "}
                  {item.kind === "vgf" ? "Very Good Films" : "Letterboxd 500"}
                  {item.kind === "vgf"
                    ? "Very Good Films"
                    : item.kind === "releases"
                      ? "Streaming Release Calendar"
                      : "Letterboxd 500"}
                </dd>

                {item.releaseDate && (
                  <>
                    <dt>Releases</dt>
                    <dd>{item.releaseDate}</dd>
                  </>
                )}

                <dt>Released</dt>
                <dd>{item.year}</dd>

                {(item.director || enriched?.creatorOrDirector) && (
                  <>
                    <dt>Director</dt>
                    <dd>{item.director || enriched?.creatorOrDirector}</dd>
                  </>
                )}

                {enriched?.country && (
                  <>
                    <dt>Country</dt>
                    <dd>{enriched.country}</dd>
                  </>
                )}

                <dt>Runtime</dt>
                <dd>
                  {fmtM(item.mins)} <small>({item.mins} min)</small>
                </dd>

                <dt>Language</dt>
                <dd>
                  {item.langFlag} {item.lang || "English"}
                </dd>

                <dt>Where</dt>
                <dd>{item.where}</dd>
              </>
            )}
          </dl>

          {/* Status Controls */}
          <div className="ch100-acts">
            <button
              type="button"
              className="ch100-act seen"
              aria-pressed={status === "seen"}
              onClick={() => onToggleStatus(item.id, "seen")}
              title="Shortcut: S"
            >
              ✓ Seen
            </button>
            <button
              type="button"
              className="ch100-act watching"
              aria-pressed={status === "watching"}
              onClick={() => onToggleStatus(item.id, "watching")}
              title="Shortcut: W"
            >
              ▶ Watching
            </button>
            <button
              type="button"
              className="ch100-act want"
              aria-pressed={status === "want"}
              onClick={() => onToggleStatus(item.id, "want")}
              title="Shortcut: Q"
            >
              + Want
            </button>
            {onToggleFavorite && (
              <button
                type="button"
                className={`ch100-act ch100-act-fav ${isFavorite ? "is-fav" : ""}`}
                aria-pressed={isFavorite}
                onClick={() => onToggleFavorite(item)}
                title="Induct into All-Time Favorites"
              >
                <Crown size={12} strokeWidth={2.4} aria-hidden="true" />
                {isFavorite ? "All-Timer" : "All-Time"}
              </button>
            )}
          </div>

          {/* Star Rating */}
          <div className="ch100-rating-row">
            <span className="ch100-lbl">Your Rating (1–5)</span>
            <div className="ch100-stars" role="group" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`ch100-star-btn ${(record.r || 0) >= n ? "on" : ""
                    }`}
                  onClick={() =>
                    onSetRating(item.id, (record.r || 0) === n ? 0 : n)
                  }
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  aria-pressed={(record.r || 0) === n}
                >
                  ★
                </button>
              ))}
              {(record.r || 0) > 0 && (
                <button
                  type="button"
                  className="ch100-util-btn"
                  onClick={() => onSetRating(item.id, 0)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notes Area */}
          <div className="ch100-note-header">
            <label className="ch100-lbl" htmlFor="note">
              Notes
            </label>
            {noteSaveState !== "idle" && (
              <span className="ch100-note-status" aria-live="polite">
                {noteSaveState === "saving" ? "Saving…" : "✓ Saved"}
              </span>
            )}
          </div>
          <textarea
            id="note"
            className="ch100-note"
            placeholder="Reflections, favorite episode or scene, where you left off…"
            value={record.n || ""}
            onChange={(e) => {
              const nextVal = e.target.value;
              setNoteSaveState("saving");
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveTimerRef.current = setTimeout(() => {
                setNoteSaveState("saved");
              }, 450);
              onUpdateNotes(item.id, nextVal);
            }}
          />

          {/* External Links & Custom Actions */}
          <div className="ch100-links">
            {item.custom && onEditCustom && (
              <button
                type="button"
                className="ch100-nav-btn"
                onClick={() => onEditCustom(item.id)}
              >
                ✏️ Edit Title
              </button>
            )}
            {item.custom && onDeleteCustom && (
              confirmDelete ? (
                <>
                  <button
                    type="button"
                    className="ch100-clear-btn"
                    onClick={() => onDeleteCustom(item.id)}
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    className="ch100-util-btn"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ch100-util-btn"
                  onClick={() => setConfirmDelete(true)}
                >
                  🗑️ Delete
                </button>
              )
            )}
            {item.kind === "film" && (
              <a
                className="ch100-nav-btn"
                href={`https://letterboxd.com/search/${encodeURIComponent(
                  `${item.title} ${item.year || ""}`.trim()
                )}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Letterboxd ↗
              </a>
            )}
            {item.kind === "vgf" && (
              <a
                className="ch100-nav-btn"
                href="https://verygoodfilms.co/"
                target="_blank"
                rel="noopener noreferrer"
              >
                verygoodfilms.co ↗
              </a>
            )}
            <a
              className="ch100-nav-btn"
              href={jwUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Where to watch ↗
            </a>
            <a
              className="ch100-btn-primary"
              href={imdbUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
            >
              IMDb ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
