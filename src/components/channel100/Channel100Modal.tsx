"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { ChannelMediaItem, ShowUserRecord, ShowStatus } from "@/lib/channel100/types";
import { artFor, fmtH, fmtM, bingeDays, jwUrl, imdbUrl } from "@/lib/channel100/data";

interface Channel100ModalProps {
  item: ChannelMediaItem | null;
  record: ShowUserRecord;
  isOpen: boolean;
  prevLabel?: string | null;
  nextLabel?: string | null;
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
  prevLabel,
  nextLabel,
  onClose,
  onToggleStatus,
  onSetRating,
  onUpdateNotes,
  onNavigateShow,
  onEditCustom,
  onDeleteCustom,
  onIncrementEpisode,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteSaveState, setNoteSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const art = useMemo(() => (item ? artFor(item) : null), [item]);

  const status = record.s || "";
  const stampLabel: Record<string, string> = {
    seen: "SEEN",
    want: "WANT",
    watching: "ON NOW",
  };

  // Reset per-item ephemeral modal states when switching items
  useEffect(() => {
    setConfirmDelete(false);
    setNoteSaveState("idle");
  }, [item?.id, isOpen]);

  // Keyboard navigation, shortcuts, focus trap & Esc to close
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

  // Focus trap / auto-focus on open and restore focus on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
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
      <div ref={modalRef} className="ch100-modal modal">
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

          {/* Quick item navigation bar (follows active filtered/sorted list) */}
          {onNavigateShow && (prevLabel || nextLabel) && (
            <div className="ch100-modal-nav">
              <button
                type="button"
                className="ch100-modal-nav-btn"
                onClick={() => onNavigateShow(-1)}
                title="Previous title in current view (Left Arrow)"
              >
                ◀ {prevLabel || "Prev"}
              </button>
              <button
                type="button"
                className="ch100-modal-nav-btn"
                onClick={() => onNavigateShow(1)}
                title="Next title in current view (Right Arrow)"
              >
                {nextLabel || "Next"} ▶
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
              title="Shortcut: S"
            >
              <span aria-hidden="true">✓</span> Seen
            </button>
            <button
              type="button"
              className="ch100-act act watching"
              aria-pressed={status === "watching"}
              onClick={() => onToggleStatus(item.id, "watching")}
              title="Shortcut: W"
            >
              <span aria-hidden="true">▶</span> Watching
            </button>
            <button
              type="button"
              className="ch100-act act want"
              aria-pressed={status === "want"}
              onClick={() => onToggleStatus(item.id, "want")}
              title="Shortcut: Q"
            >
              <span aria-hidden="true">+</span> Want
            </button>
          </div>

          {/* User Star Rating */}
          <div className="ch100-lbl lbl">Your Rating (Shortcuts: 1–5)</div>
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

          {/* Notes Area with Auto-Save Status Indicator */}
          <div className="ch100-note-header">
            <label className="ch100-lbl lbl" htmlFor="note">
              Your Notes
            </label>
            {noteSaveState !== "idle" && (
              <span className="ch100-note-status" aria-live="polite">
                {noteSaveState === "saving" ? "Saving…" : "✓ Saved"}
              </span>
            )}
          </div>
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

          {/* Action Links & Two-Step Delete Confirmation */}
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
              confirmDelete ? (
                <>
                  <button
                    type="button"
                    className="ch100-btn btn r"
                    onClick={() => onDeleteCustom(item.id)}
                    title="Permanently remove this title"
                  >
                    ⚠️ Confirm Delete
                  </button>
                  <button
                    type="button"
                    className="ch100-btn btn"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ch100-btn btn r"
                  onClick={() => setConfirmDelete(true)}
                  title="Delete title from tracker"
                >
                  🗑️ Delete
                </button>
              )
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

