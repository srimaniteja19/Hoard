"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  ExternalLink,
  Film,
  GalleryHorizontalEnd,
  LayoutGrid,
  List,
  MessageSquareQuote,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import {
  ChannelMediaItem,
  FavoriteItem,
  FavoritesCuratorProfile,
  FavoritesVault,
} from "@/lib/channel100/types";
import {
  FAVORITE_VIBES,
  favoriteToChannelItem,
  filterFavoritesByScope,
  ShareFilterScope,
} from "@/lib/channel100/favorites";
import { artFor, fmtH } from "@/lib/channel100/data";
import { fetchItemArtwork, getCachedArtwork } from "@/lib/channel100/artworkClient";

type FavoritesLayoutMode = "gallery" | "reel" | "index";

interface Channel100FavoritesViewProps {
  vault: FavoritesVault;
  suggestions: ChannelMediaItem[];
  onOpenAddModal: () => void;
  onOpenShareModal: (initialScope?: ShareFilterScope) => void;
  onUpdateProfile: (profile: FavoritesCuratorProfile) => void;
  onUpdateItem: (id: string, patch: Partial<FavoriteItem>) => void;
  onRemoveItem: (id: string) => void;
  onReorderItem: (fromIndex: number, toIndex: number) => void;
  onQuickInduct: (item: ChannelMediaItem) => void;
  onOpenMediaModal?: (item: FavoriteItem) => void;
}

interface PosterThumbProps {
  item: FavoriteItem;
  rank: number;
  className?: string;
}

const FavoritePoster: React.FC<PosterThumbProps> = ({ item, rank, className }) => {
  const channelItem = useMemo(
    () => favoriteToChannelItem(item, rank - 1),
    [item, rank]
  );
  const art = useMemo(() => artFor(channelItem), [channelItem]);
  const [posterUrl, setPosterUrl] = useState<string | null>(() => {
    const cached = getCachedArtwork(channelItem);
    return cached ?? item.image ?? null;
  });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    const cached = getCachedArtwork(channelItem);
    if (cached !== undefined) {
      setPosterUrl(cached);
      return;
    }
    let cancelled = false;
    fetchItemArtwork(channelItem).then((url) => {
      if (!cancelled && url) setPosterUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [channelItem]);

  const showPoster = Boolean(posterUrl && !imgFailed);

  return (
    <div
      className={`ch100-fav-poster ${showPoster ? "has-img" : art.pat} ${className || ""}`}
      style={showPoster ? undefined : { backgroundColor: art.bg }}
    >
      {showPoster && posterUrl ? (
        <>
          <img
            className="ch100-fav-poster-bg"
            src={posterUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <img
            className="ch100-fav-poster-img"
            src={posterUrl}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        </>
      ) : (
        <span
          className="ch100-fav-poster-svg"
          dangerouslySetInnerHTML={{ __html: art.svg }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export const Channel100FavoritesView: React.FC<Channel100FavoritesViewProps> = ({
  vault,
  suggestions,
  onOpenAddModal,
  onOpenShareModal,
  onUpdateProfile,
  onUpdateItem,
  onRemoveItem,
  onReorderItem,
  onQuickInduct,
  onOpenMediaModal,
}) => {
  const [scope, setScope] = useState<ShareFilterScope>("all");
  const [layoutMode, setLayoutMode] = useState<FavoritesLayoutMode>("gallery");
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(vault.profile.displayName);
  const [draftTagline, setDraftTagline] = useState(vault.profile.tagline);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [expandedReviewsId, setExpandedReviewsId] = useState<string | null>(null);
  const [draftPitch, setDraftPitch] = useState("");
  const [draftVibe, setDraftVibe] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const reelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftName(vault.profile.displayName);
    setDraftTagline(vault.profile.tagline);
  }, [vault.profile.displayName, vault.profile.tagline]);

  const moviesCount = useMemo(
    () => vault.items.filter((i) => i.mediaType === "movie").length,
    [vault.items]
  );
  const showsCount = useMemo(
    () => vault.items.filter((i) => i.mediaType === "show").length,
    [vault.items]
  );
  const totalHours = useMemo(
    () =>
      vault.items.reduce(
        (acc, item) => acc + (item.hours || (item.mediaType === "movie" ? 2.1 : 24)),
        0
      ),
    [vault.items]
  );

  const filteredItems = useMemo(
    () => filterFavoritesByScope(vault.items, scope),
    [vault.items, scope]
  );

  const startEditItem = (item: FavoriteItem) => {
    setEditingItemId(item.id);
    setDraftPitch(item.pitch || "");
    setDraftVibe(item.vibe || "");
  };

  const commitEditItem = (id: string) => {
    onUpdateItem(id, {
      pitch: draftPitch.trim(),
      vibe: draftVibe || undefined,
    });
    setEditingItemId(null);
  };

  const commitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...vault.profile,
      displayName: draftName.trim() || "All-Time Canon",
      tagline: draftTagline.trim(),
    });
    setEditingProfile(false);
  };

  const getGlobalIndex = (id: string) =>
    vault.items.findIndex((i) => i.id === id);

  const handleMove = (id: string, delta: -1 | 1) => {
    const idx = getGlobalIndex(id);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= vault.items.length) return;
    onReorderItem(idx, nextIdx);
  };

  const handlePinFirst = (id: string) => {
    const idx = getGlobalIndex(id);
    if (idx <= 0) return;
    onReorderItem(idx, 0);
  };

  const handleDropOn = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = getGlobalIndex(draggedId);
    const toIdx = getGlobalIndex(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      onReorderItem(fromIdx, toIdx);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const topThree = filteredItems.slice(0, 3);
  const restItems = filteredItems.slice(3);

  return (
    <div className="ch100-fav-stage">
      {/* Cinema Marquee Header & Perforated Admission Ticket */}
      <section className="ch100-wrap ch100-fav-marquee-wrap">
        <div className="ch100-fav-marquee">
          <div className="ch100-fav-marquee-main">
            {editingProfile ? (
              <form className="ch100-fav-profile-form" onSubmit={commitProfile}>
                <input
                  type="text"
                  className="ch100-fav-profile-name-input"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Your Canon Title (e.g. Mani's All-Time Canon)"
                  maxLength={60}
                  autoFocus
                />
                <input
                  type="text"
                  className="ch100-fav-profile-tag-input"
                  value={draftTagline}
                  onChange={(e) => setDraftTagline(e.target.value)}
                  placeholder="A short note shown when you share your favorites..."
                  maxLength={140}
                />
                <div className="ch100-fav-profile-actions">
                  <button type="submit" className="ch100-btn-primary">
                    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    Save Marquee
                  </button>
                  <button
                    type="button"
                    className="ch100-util-btn"
                    onClick={() => setEditingProfile(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="ch100-fav-title-row">
                  <h1 className="ch100-fav-h1">{vault.profile.displayName}</h1>
                  <button
                    type="button"
                    className="ch100-fav-edit-marquee-btn"
                    onClick={() => setEditingProfile(true)}
                    title="Customize your canon title and note"
                    aria-label="Edit canon title and note"
                  >
                    <Pencil size={13} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </div>
                <p className="ch100-fav-lede">
                  {vault.profile.tagline ||
                    "Your permanent pantheon of desert-island movies and television."}
                </p>
              </>
            )}

            <div className="ch100-fav-cta-row">
              <button
                type="button"
                className="ch100-fav-btn-induct"
                onClick={onOpenAddModal}
              >
                <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
                Induct Movie or Show
              </button>

              <button
                type="button"
                className="ch100-fav-btn-share"
                onClick={() => onOpenShareModal(scope)}
                disabled={vault.items.length === 0}
              >
                <Share2 size={14} strokeWidth={2.3} aria-hidden="true" />
                {scope === "movie"
                  ? "Share Favorite Movies"
                  : scope === "show"
                    ? "Share Favorite Shows"
                    : "Share All Favorites"}
              </button>
            </div>
          </div>

          {/* Perforated Cinema Admission Ticket Stub */}
          <aside className="ch100-fav-ticket" aria-label="Collection summary">
            <div className="ch100-fav-ticket-head">
              <span className="ch100-fav-ticket-code">ADMIT ONE · VAULT</span>
              <Crown size={15} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div className="ch100-fav-ticket-stats">
              <div>
                <strong>{moviesCount}</strong>
                <span>Movies</span>
              </div>
              <div>
                <strong>{showsCount}</strong>
                <span>Shows</span>
              </div>
              <div>
                <strong>{fmtH(totalHours)}</strong>
                <span>Runtime</span>
              </div>
            </div>
            <div className="ch100-fav-ticket-foot">
              <span className="ch100-fav-ticket-crown-lbl">NO. 01 CROWN</span>
              <span className="ch100-fav-ticket-crown-val">
                {vault.items[0]?.title || "Unclaimed"}
              </span>
            </div>
          </aside>
        </div>
      </section>

      {/* Filter & View Switcher Bar */}
      {vault.items.length > 0 && (
        <section className="ch100-fav-toolbar-wrap">
          <div className="ch100-wrap ch100-fav-toolbar">
            <div
              className="ch100-fav-scope-pills"
              role="group"
              aria-label="Filter favorites by type"
            >
              <button
                type="button"
                className={`ch100-fav-scope-btn ${scope === "all" ? "active" : ""}`}
                aria-pressed={scope === "all"}
                onClick={() => setScope("all")}
              >
                All <small>{vault.items.length}</small>
              </button>
              <button
                type="button"
                className={`ch100-fav-scope-btn ${scope === "movie" ? "active" : ""}`}
                aria-pressed={scope === "movie"}
                onClick={() => setScope("movie")}
              >
                <Film size={13} strokeWidth={2.2} aria-hidden="true" />
                Movies <small>{moviesCount}</small>
              </button>
              <button
                type="button"
                className={`ch100-fav-scope-btn ${scope === "show" ? "active" : ""}`}
                aria-pressed={scope === "show"}
                onClick={() => setScope("show")}
              >
                <Tv size={13} strokeWidth={2.2} aria-hidden="true" />
                Shows <small>{showsCount}</small>
              </button>
            </div>

            <div className="ch100-fav-toolbar-right">
              <div
                className="ch100-fav-layout-tog"
                role="group"
                aria-label="Showcase layout"
              >
                <button
                  type="button"
                  aria-pressed={layoutMode === "gallery"}
                  onClick={() => setLayoutMode("gallery")}
                  title="Premiere Gallery Wall"
                >
                  <LayoutGrid size={13} strokeWidth={2.2} aria-hidden="true" />
                  Gallery
                </button>
                <button
                  type="button"
                  aria-pressed={layoutMode === "reel"}
                  onClick={() => setLayoutMode("reel")}
                  title="35mm Filmstrip Reel"
                >
                  <GalleryHorizontalEnd size={13} strokeWidth={2.2} aria-hidden="true" />
                  35mm Reel
                </button>
                <button
                  type="button"
                  aria-pressed={layoutMode === "index"}
                  onClick={() => setLayoutMode("index")}
                  title="Ranked Collector Index"
                >
                  <List size={13} strokeWidth={2.2} aria-hidden="true" />
                  Index
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="ch100-wrap ch100-fav-body">
        {vault.items.length === 0 ? (
          <div className="ch100-fav-empty">
            <div className="ch100-fav-empty-head">
              <div className="ch100-fav-empty-icon">
                <Crown size={24} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <h2>Build your desert-island canon</h2>
              <p>
                Add the movies and shows you&apos;d recommend to anyone who asks. Rank
                them, write a one-line pitch, and share a live cinema page or
                collector&apos;s poster in one click.
              </p>
              <button
                type="button"
                className="ch100-fav-btn-induct"
                onClick={onOpenAddModal}
              >
                <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
                Induct Your First Title
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="ch100-fav-suggestions">
                <div className="ch100-fav-suggestions-head">
                  <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>Quick-induct from your library &amp; canons</span>
                </div>
                <div className="ch100-fav-suggestion-chips">
                  {suggestions.slice(0, 12).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="ch100-fav-suggestion-chip"
                      onClick={() => onQuickInduct(item)}
                    >
                      <Plus size={12} strokeWidth={2.6} aria-hidden="true" />
                      <span>{item.title}</span>
                      <small>{item.year || item.start || ""}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="ch100-fav-empty">
            <h2>
              No {scope === "movie" ? "movies" : "shows"} in your canon yet
            </h2>
            <p>
              Induct a {scope === "movie" ? "film" : "series"} or switch back to
              All to see your full list.
            </p>
            <div className="ch100-fav-cta-row" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="ch100-fav-btn-induct"
                onClick={onOpenAddModal}
              >
                <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
                Add {scope === "movie" ? "Movie" : "Show"}
              </button>
              <button
                type="button"
                className="ch100-util-btn"
                onClick={() => setScope("all")}
              >
                Show All
              </button>
            </div>
          </div>
        ) : layoutMode === "reel" ? (
          /* 35MM CELLULOID FILMSTRIP REEL */
          <div className="ch100-fav-reel-shell">
            <div className="ch100-fav-sprockets" aria-hidden="true">
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <div className="ch100-fav-reel-track" ref={reelRef}>
              {filteredItems.map((item, idx) => {
                const frameCode = `${String(idx + 1).padStart(2, "0")}A`;
                return (
                  <article key={item.id} className="ch100-fav-reel-frame">
                    <div className="ch100-fav-reel-frame-top">
                      <span className="ch100-fav-frame-code">FRAME {frameCode}</span>
                      <span className="ch100-fav-frame-type">
                        {item.mediaType === "movie" ? "35MM FILM" : "SERIES"}
                      </span>
                    </div>
                    <div
                      className="ch100-fav-reel-poster-wrap"
                      onClick={() => onOpenMediaModal?.(item)}
                    >
                      <FavoritePoster item={item} rank={idx + 1} />
                      <span className="ch100-fav-rank-stamp">
                        NO. {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="ch100-fav-reel-caption">
                      <h3>{item.title}</h3>
                      <div className="ch100-fav-reel-meta">
                        {item.year && <span>{item.year}</span>}
                        {item.creator && <span>{item.creator}</span>}
                        {item.vibe && (
                          <span className="ch100-fav-vibe-pill">{item.vibe}</span>
                        )}
                      </div>
                      {item.pitch && (
                        <p className="ch100-fav-reel-pitch">&ldquo;{item.pitch}&rdquo;</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="ch100-fav-sprockets" aria-hidden="true">
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
          </div>
        ) : layoutMode === "index" ? (
          /* RANKED COLLECTOR INDEX */
          <div className="ch100-fav-index-list">
            {filteredItems.map((item, idx) => {
              const globalIdx = getGlobalIndex(item.id);
              return (
                <div
                  key={item.id}
                  className={`ch100-fav-index-row ${dragOverId === item.id ? "is-drag-over" : ""}`}
                  draggable
                  onDragStart={() => setDraggedId(item.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverId(item.id);
                  }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={() => handleDropOn(item.id)}
                >
                  <span className="ch100-fav-index-rank">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="ch100-fav-index-main">
                    <div className="ch100-fav-index-title-row">
                      <button
                        type="button"
                        className="ch100-fav-title-link"
                        onClick={() => onOpenMediaModal?.(item)}
                      >
                        {item.title}
                      </button>
                      <span
                        className={`ch100-fav-kind-badge ${item.mediaType}`}
                      >
                        {item.mediaType === "movie" ? "Film" : "Show"}
                      </span>
                      {item.year && (
                        <span className="ch100-fav-year">{item.year}</span>
                      )}
                      {item.vibe && (
                        <span className="ch100-fav-vibe-pill">{item.vibe}</span>
                      )}
                    </div>
                    {item.pitch && (
                      <p className="ch100-fav-index-pitch">
                        &ldquo;{item.pitch}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="ch100-fav-row-controls">
                    <button
                      type="button"
                      className="ch100-fav-icon-btn"
                      onClick={() => handleMove(item.id, -1)}
                      disabled={globalIdx <= 0}
                      title="Move up"
                      aria-label={`Move ${item.title} up`}
                    >
                      <ArrowUp size={13} strokeWidth={2.3} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="ch100-fav-icon-btn"
                      onClick={() => handleMove(item.id, 1)}
                      disabled={globalIdx >= vault.items.length - 1}
                      title="Move down"
                      aria-label={`Move ${item.title} down`}
                    >
                      <ArrowDown size={13} strokeWidth={2.3} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="ch100-fav-icon-btn"
                      onClick={() => startEditItem(item)}
                      title="Edit pitch & vibe"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Pencil size={13} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="ch100-fav-icon-btn danger"
                      onClick={() => onRemoveItem(item.id)}
                      title="Remove from favorites"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 size={13} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* PREMIERE GALLERY WALL (TOP 3 SPOTLIGHT + COLLECTOR'S WALL) */
          <div className="ch100-fav-gallery">
            {/* Top 3 Premiere Podium */}
            <div
              className={`ch100-fav-podium count-${Math.min(3, topThree.length)}`}
            >
              {topThree.map((item, idx) => {
                const isFirst = idx === 0;
                const globalIdx = getGlobalIndex(item.id);
                const isEditing = editingItemId === item.id;
                return (
                  <article
                    key={item.id}
                    className={`ch100-fav-podium-card ${isFirst ? "is-headliner" : "is-cofeature"} ${dragOverId === item.id ? "is-drag-over" : ""}`}
                    draggable
                    onDragStart={() => setDraggedId(item.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverId(item.id);
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={() => handleDropOn(item.id)}
                  >
                    <div
                      className="ch100-fav-podium-art"
                      onClick={() => onOpenMediaModal?.(item)}
                    >
                      <FavoritePoster item={item} rank={idx + 1} />
                      <div className="ch100-fav-medallion">
                        {isFirst && (
                          <Crown size={12} strokeWidth={2.5} aria-hidden="true" />
                        )}
                        <span>NO. {String(idx + 1).padStart(2, "0")}</span>
                      </div>
                      <span
                        className={`ch100-fav-kind-float ${item.mediaType}`}
                      >
                        {item.mediaType === "movie" ? "FILM" : "SERIES"}
                      </span>
                    </div>

                    <div className="ch100-fav-podium-body">
                      <div className="ch100-fav-podium-meta">
                        {item.year && <span>{item.year}</span>}
                        {item.creator && <span>{item.creator}</span>}
                        {item.vibe && (
                          <span className="ch100-fav-vibe-pill">{item.vibe}</span>
                        )}
                      </div>

                      <h2 className="ch100-fav-podium-title">
                        <button
                          type="button"
                          className="ch100-fav-title-link"
                          onClick={() => onOpenMediaModal?.(item)}
                        >
                          {item.title}
                        </button>
                      </h2>

                      {isEditing ? (
                        <div className="ch100-fav-inline-editor">
                          <textarea
                            rows={2}
                            value={draftPitch}
                            onChange={(e) => setDraftPitch(e.target.value)}
                            placeholder="Why is this an all-timer? Write a 1-line pitch for friends..."
                            autoFocus
                          />
                          <div className="ch100-fav-vibe-picker">
                            {FAVORITE_VIBES.map((v) => (
                              <button
                                key={v}
                                type="button"
                                className={`ch100-fav-vibe-opt ${draftVibe === v ? "active" : ""}`}
                                onClick={() =>
                                  setDraftVibe(draftVibe === v ? "" : v)
                                }
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                          <div className="ch100-fav-inline-actions">
                            <button
                              type="button"
                              className="ch100-btn-primary"
                              onClick={() => commitEditItem(item.id)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="ch100-util-btn"
                              onClick={() => setEditingItemId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.pitch ? (
                            <blockquote className="ch100-fav-quote">
                              &ldquo;{item.pitch}&rdquo;
                            </blockquote>
                          ) : (
                            <button
                              type="button"
                              className="ch100-fav-add-pitch-btn"
                              onClick={() => startEditItem(item)}
                            >
                              + Add your &ldquo;why you must watch this&rdquo; pitch
                            </button>
                          )}

                          {item.reviews && item.reviews.length > 0 && (
                            <div className="ch100-fav-reviews-block">
                              <button
                                type="button"
                                className="ch100-fav-reviews-toggle"
                                onClick={() =>
                                  setExpandedReviewsId((cur) =>
                                    cur === item.id ? null : item.id
                                  )
                                }
                              >
                                <MessageSquareQuote
                                  size={13}
                                  strokeWidth={2.2}
                                  aria-hidden="true"
                                />
                                <span>
                                  Top Reviews ({item.reviews.length})
                                </span>
                                {expandedReviewsId === item.id ? (
                                  <ChevronUp size={13} aria-hidden="true" />
                                ) : (
                                  <ChevronDown size={13} aria-hidden="true" />
                                )}
                              </button>

                              {expandedReviewsId === item.id && (
                                <div className="ch100-fav-reviews-list">
                                  {item.reviews.map((rev, rIdx) => (
                                    <div key={rIdx} className="ch100-fav-review-card">
                                      <div className="ch100-fav-review-top">
                                        <strong>{rev.author}</strong>
                                        {rev.rating && (
                                          <span className="ch100-rev-score">
                                            {rev.rating}
                                          </span>
                                        )}
                                      </div>
                                      <p>&ldquo;{rev.text}&rdquo;</p>
                                    </div>
                                  ))}
                                  {item.letterboxdUrl && (
                                    <a
                                      href={item.letterboxdUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ch100-lookup-lb-link"
                                    >
                                      Read more on Letterboxd
                                      <ExternalLink size={11} aria-hidden="true" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      <div className="ch100-fav-card-foot">
                        <span className="ch100-fav-genre-meta">
                          {[item.genre, item.where].filter(Boolean).join(" · ")}
                        </span>
                        <div className="ch100-fav-row-controls">
                          {!isFirst && (
                            <button
                              type="button"
                              className="ch100-fav-icon-btn"
                              onClick={() => handlePinFirst(item.id)}
                              title="Crown as #1"
                              aria-label={`Crown ${item.title} as number 1`}
                            >
                              <Crown size={13} strokeWidth={2.2} aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="ch100-fav-icon-btn"
                            onClick={() => handleMove(item.id, -1)}
                            disabled={globalIdx <= 0}
                            title="Move up"
                            aria-label={`Move ${item.title} up`}
                          >
                            <ArrowUp size={13} strokeWidth={2.3} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ch100-fav-icon-btn"
                            onClick={() => handleMove(item.id, 1)}
                            disabled={globalIdx >= vault.items.length - 1}
                            title="Move down"
                            aria-label={`Move ${item.title} down`}
                          >
                            <ArrowDown size={13} strokeWidth={2.3} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ch100-fav-icon-btn"
                            onClick={() =>
                              isEditing ? setEditingItemId(null) : startEditItem(item)
                            }
                            title="Edit pitch & vibe"
                            aria-label={`Edit ${item.title}`}
                          >
                            {isEditing ? (
                              <X size={13} strokeWidth={2.3} aria-hidden="true" />
                            ) : (
                              <Pencil size={13} strokeWidth={2.2} aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="ch100-fav-icon-btn danger"
                            onClick={() => onRemoveItem(item.id)}
                            title="Remove from canon"
                            aria-label={`Remove ${item.title}`}
                          >
                            <Trash2 size={13} strokeWidth={2.2} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Collector's Wall (Ranks #4+) */}
            {restItems.length > 0 && (
              <div className="ch100-fav-wall">
                {restItems.map((item, idx) => {
                  const rank = idx + 4;
                  const globalIdx = getGlobalIndex(item.id);
                  const isEditing = editingItemId === item.id;
                  return (
                    <article
                      key={item.id}
                      className={`ch100-fav-wall-card ${dragOverId === item.id ? "is-drag-over" : ""}`}
                      draggable
                      onDragStart={() => setDraggedId(item.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(item.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={() => handleDropOn(item.id)}
                    >
                      <div
                        className="ch100-fav-wall-art"
                        onClick={() => onOpenMediaModal?.(item)}
                      >
                        <FavoritePoster item={item} rank={rank} />
                        <span className="ch100-fav-rank-stamp">
                          NO. {String(rank).padStart(2, "0")}
                        </span>
                        <span
                          className={`ch100-fav-kind-float ${item.mediaType}`}
                        >
                          {item.mediaType === "movie" ? "FILM" : "TV"}
                        </span>
                      </div>

                      <div className="ch100-fav-wall-body">
                        <h3>
                          <button
                            type="button"
                            className="ch100-fav-title-link"
                            onClick={() => onOpenMediaModal?.(item)}
                          >
                            {item.title}
                          </button>
                        </h3>
                        <div className="ch100-fav-wall-meta">
                          {item.year && <span>{item.year}</span>}
                          {item.vibe && (
                            <span className="ch100-fav-vibe-pill">{item.vibe}</span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="ch100-fav-inline-editor">
                            <textarea
                              rows={2}
                              value={draftPitch}
                              onChange={(e) => setDraftPitch(e.target.value)}
                              placeholder="One-line pitch..."
                              autoFocus
                            />
                            <div className="ch100-fav-vibe-picker">
                              {FAVORITE_VIBES.slice(0, 6).map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  className={`ch100-fav-vibe-opt ${draftVibe === v ? "active" : ""}`}
                                  onClick={() =>
                                    setDraftVibe(draftVibe === v ? "" : v)
                                  }
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                            <div className="ch100-fav-inline-actions">
                              <button
                                type="button"
                                className="ch100-btn-primary"
                                onClick={() => commitEditItem(item.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="ch100-util-btn"
                                onClick={() => setEditingItemId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : item.pitch ? (
                          <p className="ch100-fav-wall-pitch">
                            &ldquo;{item.pitch}&rdquo;
                          </p>
                        ) : null}

                        {!isEditing && item.reviews && item.reviews.length > 0 && (
                          <div className="ch100-fav-reviews-block compact">
                            <button
                              type="button"
                              className="ch100-fav-reviews-toggle"
                              onClick={() =>
                                setExpandedReviewsId((cur) =>
                                  cur === item.id ? null : item.id
                                )
                              }
                            >
                              <MessageSquareQuote size={12} strokeWidth={2.2} aria-hidden="true" />
                              <span>{item.reviews.length} Reviews</span>
                              {expandedReviewsId === item.id ? (
                                <ChevronUp size={12} aria-hidden="true" />
                              ) : (
                                <ChevronDown size={12} aria-hidden="true" />
                              )}
                            </button>
                            {expandedReviewsId === item.id && (
                              <div className="ch100-fav-reviews-list">
                                {item.reviews.map((rev, rIdx) => (
                                  <div key={rIdx} className="ch100-fav-review-card">
                                    <div className="ch100-fav-review-top">
                                      <strong>{rev.author}</strong>
                                      {rev.rating && (
                                        <span className="ch100-rev-score">
                                          {rev.rating}
                                        </span>
                                      )}
                                    </div>
                                    <p>&ldquo;{rev.text}&rdquo;</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="ch100-fav-card-foot compact">
                          <div className="ch100-fav-row-controls">
                            <button
                              type="button"
                              className="ch100-fav-icon-btn"
                              onClick={() => handlePinFirst(item.id)}
                              title="Crown as #1"
                              aria-label={`Crown ${item.title} as number 1`}
                            >
                              <Crown size={12} strokeWidth={2.2} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="ch100-fav-icon-btn"
                              onClick={() => handleMove(item.id, -1)}
                              disabled={globalIdx <= 0}
                              title="Move up"
                              aria-label={`Move ${item.title} up`}
                            >
                              <ArrowUp size={12} strokeWidth={2.3} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="ch100-fav-icon-btn"
                              onClick={() => handleMove(item.id, 1)}
                              disabled={globalIdx >= vault.items.length - 1}
                              title="Move down"
                              aria-label={`Move ${item.title} down`}
                            >
                              <ArrowDown size={12} strokeWidth={2.3} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="ch100-fav-icon-btn"
                              onClick={() =>
                                isEditing ? setEditingItemId(null) : startEditItem(item)
                              }
                              title="Edit pitch & vibe"
                              aria-label={`Edit ${item.title}`}
                            >
                              <Pencil size={12} strokeWidth={2.2} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="ch100-fav-icon-btn danger"
                              onClick={() => onRemoveItem(item.id)}
                              title="Remove"
                              aria-label={`Remove ${item.title}`}
                            >
                              <Trash2 size={12} strokeWidth={2.2} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
