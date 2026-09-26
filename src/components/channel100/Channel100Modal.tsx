"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { ChannelMediaItem, ShowUserRecord, ShowStatus } from "@/lib/channel100/types";
import { artFor, fmtH, fmtM, bingeDays, jwUrl, imdbUrl } from "@/lib/channel100/data";

interface Channel100ModalProps {
  item: ChannelMediaItem | null;
  record: ShowUserRecord;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (id: string, status: ShowStatus) => void;
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
  onClose,
  onToggleStatus,
  onSetRating,
  onUpdateNotes,
  onNavigateShow,
  onEditCustom,
  onDeleteCustom,
  onIncrementEpisode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const art = useMemo(() => (item ? artFor(item) : null), [item]);

  const status = record.s || "";
  const stampLabel: Record<string, string> = {
    seen: "SEEN",
    want: "WANT",
    watching: "ON NOW",
  };

  // Keyboard navigation & Esc to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && onNavigateShow) {
        onNavigateShow(-1);
      } else if (e.key === "ArrowRight" && onNavigateShow) {
        onNavigateShow(1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNavigateShow]);

  // Focus trap / auto-focus on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // CRT TV Static Noise Burst
  useEffect(() => {
    if (!isOpen || !item) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      canvas.style.display = "none";
      return;
    }

    canvas.style.display = "block";
    const w = (canvas.width = 160);
    const h = (canvas.height = 120);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const context = ctx;
    const img = context.createImageData(w, h);
    let animId: number;
    const t0 = performance.now();

    function frame(now: number) {
      const k = 1 - (now - t0) / 600;
      if (k <= 0) {
        if (canvas) canvas.style.display = "none";
        return;
      }
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255 * k;
      }
      context.putImageData(img, 0, 0);
      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, item]);

  if (!isOpen || !item || !art) return null;

  const evenings = item.hours ? bingeDays(item.hours) : 1;
  const rankPre = item.custom ? "LOG" : item.kind === "film" ? "No." : "CH";

  return (
    <div
      className="ch100-overlay overlay"
      id="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch100-mtitle"
    >
      <div className="ch100-modal modal">
        {/* Left Visual Art Column */}
        <div
          className={`ch100-art art ${art.pat}`}
          style={{ backgroundColor: art.bg }}
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

          <span
            style={{ display: "contents" }}
            dangerouslySetInnerHTML={{
              __html: art.svg + (art.stripHtml || ""),
            }}
            aria-hidden="true"
          />

          <canvas ref={canvasRef} className="ch100-static static" id="static" />
        </div>

        {/* Right Info Column */}
        <div className="ch100-mbody mbody">
          {/* Close button */}
          <button
            ref={closeBtnRef}
            type="button"
            className="ch100-x x"
            id="mclose"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            ✕
          </button>

          {/* Quick item navigation bar */}
          {onNavigateShow && !item.custom && (
            <div className="ch100-modal-nav">
              <button
                type="button"
                className="ch100-modal-nav-btn"
                onClick={() => onNavigateShow(-1)}
                title="Previous title (Left Arrow)"
              >
                ◀ {rankPre}{" "}
                {item.rank === 1
                  ? "100"
                  : String(item.rank - 1).padStart(2, "0")}
              </button>
              <button
                type="button"
                className="ch100-modal-nav-btn"
                onClick={() => onNavigateShow(1)}
                title="Next title (Right Arrow)"
              >
                {rankPre}{" "}
                {item.rank === 100
                  ? "01"
                  : String(item.rank + 1).padStart(2, "0")}{" "}
                ▶
              </button>
            </div>
          )}

          <h2 id="ch100-mtitle">
            {item.langFlag && <span>{item.langFlag} </span>}
            {item.title}
          </h2>
          <p className="ch100-blurb blurb">{item.blurb}</p>

          {/* Facts Definition List */}
          <dl className="ch100-facts facts">
            {item.custom ? (
              <>
                <dt>Language</dt>
                <dd>{item.langFlag || "🌐"} {item.lang || "Not specified"}</dd>

                <dt>Medium</dt>
                <dd>{item.customKind ? item.customKind.toUpperCase() : "TITLE"} {item.genre ? `· ${item.genre}` : ""}</dd>

                <dt>Platform</dt>
                <dd>{item.where || "Personal library"}</dd>

                {item.customKind === "film" ? (
                  <>
                    <dt>Runtime</dt>
                    <dd>{fmtM(item.mins || 120)} ({fmtH(item.hours)})</dd>
                  </>
                ) : (
                  <>
                    <dt>Progress</dt>
                    <dd style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>
                        {item.season ? `Season ${item.season}, ` : ""}Episode {item.episode || 1} {item.totalEpisodes ? `of ${item.totalEpisodes}` : ""}
                      </span>
                      {onIncrementEpisode && (
                        <button
                          type="button"
                          className="ch100-chip chip"
                          style={{
                            padding: "2px 8px",
                            fontSize: "11px",
                            background: "var(--ch-green)",
                            color: "#111",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
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
                <dt>NYT rank</dt>
                <dd>#{item.rank} of 100 TV shows</dd>

                <dt>Aired</dt>
                <dd>
                  {item.years}
                  {item.limited ? " · limited run" : ""}
                </dd>

                <dt>Network</dt>
                <dd>{item.network}</dd>

                <dt>Stream (US)</dt>
                <dd>{item.where}</dd>

                <dt>IMDb</dt>
                <dd>{item.imdb.toFixed(1)} / 10 (approx.)</dd>

                <dt>Genre</dt>
                <dd>
                  {item.genre} <small>· {item.sub}</small>
                </dd>

                <dt>Seasons</dt>
                <dd>
                  {item.seasons}
                  {item.approx ? " " : ""}
                  {item.approx && <small>(approx. as of 2026)</small>}
                </dd>

                <dt>Episodes</dt>
                <dd>
                  {item.approx ? "≈ " : ""}
                  {item.eps} <small>· about {item.mins} min each</small>
                </dd>

                <dt>Total time</dt>
                <dd>
                  {item.approx ? "≈ " : ""}
                  {fmtH(item.hours)}{" "}
                  <small>
                    · {evenings} {evenings === 1 ? "evening" : "evenings"} at 2 h
                    a night
                  </small>
                </dd>
              </>
            ) : (
              <>
                <dt>NYT rank</dt>
                <dd>#{item.rank} of 100 movies</dd>

                <dt>Released</dt>
                <dd>{item.year}</dd>

                <dt>Director</dt>
                <dd>{item.director}</dd>

                <dt>Runtime</dt>
                <dd>
                  {fmtM(item.mins)} <small>· {item.mins} min</small>
                </dd>

                <dt>Language</dt>
                <dd>{item.lang}</dd>

                <dt>Stream (US)</dt>
                <dd>{item.where}</dd>

                <dt>IMDb</dt>
                <dd>{item.imdb.toFixed(1)} / 10 (approx.)</dd>

                <dt>Genre</dt>
                <dd>
                  {item.genre} <small>· {item.sub}</small>
                </dd>
              </>
            )}
          </dl>

          {/* Status Buttons */}
          <div className="ch100-acts acts">
            <button
              type="button"
              className="ch100-act act seen"
              aria-pressed={status === "seen"}
              onClick={() => onToggleStatus(item.id, "seen")}
            >
              <span aria-hidden="true">✓</span> Seen
            </button>
            <button
              type="button"
              className="ch100-act act watching"
              aria-pressed={status === "watching"}
              onClick={() => onToggleStatus(item.id, "watching")}
            >
              <span aria-hidden="true">▶</span> Watching
            </button>
            <button
              type="button"
              className="ch100-act act want"
              aria-pressed={status === "want"}
              onClick={() => onToggleStatus(item.id, "want")}
            >
              <span aria-hidden="true">+</span> Want
            </button>
          </div>

          {/* User Star Rating */}
          <div className="ch100-lbl lbl">Your Rating</div>
          <div className="ch100-stars stars" role="group" aria-label="Your rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`ch100-star-btn star ${(record.r || 0) >= n ? "on" : ""}`}
                onClick={() =>
                  onSetRating(item.id, (record.r || 0) === n ? 0 : n)
                }
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                aria-pressed={(record.r || 0) === n}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" />
                </svg>
              </button>
            ))}
            {(record.r || 0) > 0 && (
              <button
                type="button"
                className="ch100-chip chip"
                onClick={() => onSetRating(item.id, 0)}
                style={{
                  marginLeft: "8px",
                  padding: "4px 10px",
                  fontSize: "12px",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Notes Area */}
          <label className="ch100-lbl lbl" htmlFor="note">
            Your Notes
          </label>
          <textarea
            id="note"
            className="ch100-note note"
            placeholder={
              item.custom
                ? "Episode reactions, favorite scene, memorable quotes, where you left off…"
                : item.kind === "tv"
                ? "Favorite episode, who recommended it, where you left off…"
                : "Who you watched it with, favorite scene, what it reminded you of…"
            }
            value={record.n || ""}
            onChange={(e) => onUpdateNotes(item.id, e.target.value)}
          />

          {/* Action Links */}
          <div className="ch100-links links">
            {item.custom && onEditCustom && (
              <button
                type="button"
                className="ch100-btn btn g"
                onClick={() => onEditCustom(item.id)}
                title="Edit title details"
              >
                ✏️ Edit Title
              </button>
            )}
            {item.custom && onDeleteCustom && (
              <button
                type="button"
                className="ch100-btn btn r"
                onClick={() => onDeleteCustom(item.id)}
                title="Delete title from tracker"
              >
                🗑️ Delete
              </button>
            )}
            <a
              className="ch100-btn btn c"
              href={jwUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Where to watch ↗
            </a>
            <a
              className="ch100-btn btn y"
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

