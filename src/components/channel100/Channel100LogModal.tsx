"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CustomMediaItem,
  CustomMediaKind,
  ShowStatus,
} from "@/lib/channel100/types";
import {
  POPULAR_LANGUAGES,
  COLOR_PALETTE,
  getLanguageFlag,
} from "@/lib/channel100/data";
import { playSound } from "@/lib/sound";

interface Channel100LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (item: CustomMediaItem) => void;
  onSaveItem?: (item: CustomMediaItem) => void;
  initialItem?: CustomMediaItem | null;
  initialData?: CustomMediaItem | null;
}

const KIND_OPTIONS: { id: CustomMediaKind; label: string; icon: string }[] = [
  { id: "tv", label: "Series", icon: "📺" },
  { id: "film", label: "Movie", icon: "🎬" },
  { id: "anime", label: "Anime", icon: "⚔️" },
  { id: "mini", label: "Mini-Series", icon: "🎞️" },
  { id: "doc", label: "Doc", icon: "📹" },
];

const PLATFORM_PRESETS = [
  "Netflix",
  "Crunchyroll",
  "Prime Video",
  "HBO Max",
  "Disney+",
  "Apple TV+",
  "Cinema",
  "Criterion",
  "Other",
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  0: "Unrated",
  1: "1★ Disappointing",
  2: "2★ Decent",
  3: "3★ Good",
  4: "4★ Great",
  5: "5★ Masterpiece",
};

export const Channel100LogModal: React.FC<Channel100LogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveItem = onSave,
  initialItem,
  initialData = initialItem,
}) => {
  const effectiveInitial = initialData || initialItem;

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CustomMediaKind>("tv");
  const [lang, setLang] = useState("Korean");
  const [customLang, setCustomLang] = useState("");
  const [status, setStatus] = useState<ShowStatus>("watching");
  const [rating, setRating] = useState<number>(0);
  const [year, setYear] = useState<string>(() => String(new Date().getFullYear()));
  const [where, setWhere] = useState("Netflix");
  const [genre, setGenre] = useState("");
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [totalEpisodes, setTotalEpisodes] = useState<string>("");
  const [runtimeMins, setRuntimeMins] = useState<string>("120");
  const [notes, setNotes] = useState("");

  const inputTitleRef = useRef<HTMLInputElement | null>(null);

  // Sync initial item if editing or reset defaults
  useEffect(() => {
    if (effectiveInitial) {
      setTitle(effectiveInitial.title || "");
      setKind(effectiveInitial.kind || "tv");
      const isPreset = POPULAR_LANGUAGES.some(
        (l) => l.name.toLowerCase() === (effectiveInitial.lang || "").toLowerCase()
      );
      if (isPreset) {
        setLang(effectiveInitial.lang);
        setCustomLang("");
      } else {
        setLang("Other");
        setCustomLang(effectiveInitial.lang || "");
      }
      setStatus(effectiveInitial.status || "watching");
      setRating(effectiveInitial.rating || 0);
      setYear(effectiveInitial.year ? String(effectiveInitial.year) : "");
      setWhere(effectiveInitial.where || "Netflix");
      setGenre(effectiveInitial.genre || "");
      setSeason(effectiveInitial.season || 1);
      setEpisode(effectiveInitial.episode || 1);
      setTotalEpisodes(
        effectiveInitial.totalEpisodes ? String(effectiveInitial.totalEpisodes) : ""
      );
      setRuntimeMins(
        effectiveInitial.runtimeMins ? String(effectiveInitial.runtimeMins) : "120"
      );
      setNotes(effectiveInitial.notes || "");
    } else {
      setTitle("");
      setKind("tv");
      setLang("Korean");
      setCustomLang("");
      setStatus("watching");
      setRating(0);
      setYear(String(new Date().getFullYear()));
      setWhere("Netflix");
      setGenre("");
      setSeason(1);
      setEpisode(1);
      setTotalEpisodes("");
      setRuntimeMins("120");
      setNotes("");
    }
  }, [effectiveInitial, isOpen]);

  // Focus title on open & handle Escape
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => inputTitleRef.current?.focus(), 60);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveLang = lang === "Other" && customLang.trim() ? customLang.trim() : lang;
  const flag = getLanguageFlag(effectiveLang);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const itemToSave: CustomMediaItem = {
      id: effectiveInitial?.id || `c_${Date.now()}`,
      title: title.trim(),
      kind,
      lang: effectiveLang,
      langFlag: flag,
      status,
      rating,
      year: parseInt(year, 10) || undefined,
      where: where || "Streaming",
      genre: genre.trim() || (kind === "anime" ? "Anime" : "Entertainment"),
      season: kind !== "film" ? season : undefined,
      episode: kind !== "film" ? episode : undefined,
      totalEpisodes: kind !== "film" && totalEpisodes ? parseInt(totalEpisodes, 10) : undefined,
      runtimeMins: kind === "film" ? parseInt(runtimeMins, 10) || 120 : undefined,
      notes: notes.trim(),
      icon: kind === "anime" ? "sword" : kind === "film" ? "clapper" : "tv",
      color:
        kind === "anime"
          ? "#E4509E"
          : kind === "film"
          ? "#3F6BF0"
          : "#F6D32D",
      updatedAt: Date.now(),
    };

    playSound.promote();
    if (onSaveItem) {
      onSaveItem(itemToSave);
    }
    onClose();
  }

  return (
    <div
      className="ch100-overlay overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logModalTitle"
    >
      <div className="ch100-log-dialog">
        {/* Minimal Header */}
        <div className="ch100-log-dheader">
          <div>
            <h2 id="logModalTitle">
              {effectiveInitial ? "Edit Title" : "Log What You're Watching"}
            </h2>
            <p className="ch100-log-dsub">Track entertainment in any language</p>
          </div>
          <button
            type="button"
            className="ch100-log-dclose"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Minimal Form */}
        <form className="ch100-log-dform" onSubmit={handleSubmit}>
          {/* Title Input */}
          <div className="ch100-dgroup">
            <label htmlFor="customTitle">Title</label>
            <input
              ref={inputTitleRef}
              id="customTitle"
              type="text"
              className="ch100-dinput"
              placeholder="e.g. Squid Game, Demon Slayer, RRR, Parasite..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Type / Medium */}
          <div className="ch100-dgroup">
            <label>Type</label>
            <div className="ch100-dpills">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  className={`ch100-dpill ${kind === k.id ? "active" : ""}`}
                  onClick={() => setKind(k.id)}
                >
                  <span>{k.icon}</span> {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="ch100-dgroup">
            <label>Language</label>
            <div className="ch100-dpills ch100-dpills-wrap">
              {POPULAR_LANGUAGES.slice(0, 8).map((l) => (
                <button
                  key={l.name}
                  type="button"
                  className={`ch100-dpill ${lang === l.name ? "active" : ""}`}
                  onClick={() => setLang(l.name)}
                >
                  <span>{l.flag}</span> {l.name}
                </button>
              ))}
              <button
                type="button"
                className={`ch100-dpill ${lang === "Other" ? "active" : ""}`}
                onClick={() => setLang("Other")}
              >
                <span>🌐</span> Other
              </button>
            </div>

            {lang === "Other" && (
              <input
                type="text"
                className="ch100-dinput"
                style={{ marginTop: "6px" }}
                placeholder="Enter language (e.g. Tamil, Turkish, Swedish...)"
                value={customLang}
                onChange={(e) => setCustomLang(e.target.value)}
                autoFocus
              />
            )}
          </div>

          {/* Status Toggle */}
          <div className="ch100-dgroup">
            <label>Status</label>
            <div className="ch100-dpills ch100-dpills-grow">
              <button
                type="button"
                className={`ch100-dpill watching ${status === "watching" ? "active" : ""}`}
                onClick={() => setStatus("watching")}
              >
                ▶ Watching
              </button>
              <button
                type="button"
                className={`ch100-dpill seen ${status === "seen" ? "active" : ""}`}
                onClick={() => setStatus("seen")}
              >
                ✓ Seen
              </button>
              <button
                type="button"
                className={`ch100-dpill want ${status === "want" ? "active" : ""}`}
                onClick={() => setStatus("want")}
              >
                + Want to See
              </button>
            </div>
          </div>

          {/* Episode Progress (for Series/Anime/Mini) or Runtime (for Movies) */}
          {kind !== "film" ? (
            <div className="ch100-drow">
              <div className="ch100-dgroup">
                <label>Season</label>
                <div className="ch100-dstepper">
                  <button
                    type="button"
                    onClick={() => setSeason((s) => Math.max(1, s - 1))}
                  >
                    –
                  </button>
                  <span>S{season}</span>
                  <button
                    type="button"
                    onClick={() => setSeason((s) => s + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="ch100-dgroup">
                <label>Episode</label>
                <div className="ch100-dstepper">
                  <button
                    type="button"
                    onClick={() => setEpisode((e) => Math.max(1, e - 1))}
                  >
                    –
                  </button>
                  <span>Ep {episode}</span>
                  <button
                    type="button"
                    onClick={() => setEpisode((e) => e + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="ch100-dgroup">
                <label>Total Eps</label>
                <input
                  type="number"
                  min="1"
                  className="ch100-dinput ch100-dinput-num"
                  placeholder="e.g. 16"
                  value={totalEpisodes}
                  onChange={(e) => setTotalEpisodes(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="ch100-drow">
              <div className="ch100-dgroup">
                <label>Runtime (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  className="ch100-dinput"
                  placeholder="e.g. 120"
                  value={runtimeMins}
                  onChange={(e) => setRuntimeMins(e.target.value)}
                />
              </div>
              <div className="ch100-dgroup">
                <label>Release Year</label>
                <input
                  type="number"
                  className="ch100-dinput"
                  placeholder="2025"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Platform / Streamer */}
          <div className="ch100-dgroup">
            <label>Platform / Where to Watch</label>
            <div className="ch100-dpills ch100-dpills-wrap">
              {PLATFORM_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`ch100-dpill ${where === p ? "active" : ""}`}
                  onClick={() => setWhere(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 5-Star Rating */}
          <div className="ch100-dgroup">
            <div className="ch100-dgroup-head">
              <label>Your Rating</label>
              <span className="ch100-drating-label">
                {RATING_DESCRIPTIONS[rating]}
              </span>
            </div>
            <div className="ch100-dstars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`ch100-dstar ${rating >= n ? "on" : ""}`}
                  onClick={() => setRating(rating === n ? 0 : n)}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  className="ch100-dclear-star"
                  onClick={() => setRating(0)}
                  title="Clear rating"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notes (Optional) */}
          <div className="ch100-dgroup">
            <label htmlFor="customNotes">Notes (Optional)</label>
            <textarea
              id="customNotes"
              className="ch100-dtextarea"
              rows={2}
              placeholder="Thoughts, favorite moments, memorable quotes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="ch100-dactions">
            <button type="submit" className="ch100-dbtn-primary">
              ⚡ {effectiveInitial ? "Save Changes" : "Save to Tracker"}
            </button>
            <button
              type="button"
              className="ch100-dbtn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
