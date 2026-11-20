"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Crown, Film, Plus, Search, Tv, X } from "lucide-react";
import {
  ChannelMediaItem,
  FavoriteItem,
  FavoriteMediaType,
  FavoritesVault,
} from "@/lib/channel100/types";
import {
  channelItemToFavorite,
  FAVORITE_VIBES,
  isItemInFavorites,
  normalizeFavoriteKey,
} from "@/lib/channel100/favorites";

interface Channel100AddFavoriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: FavoritesVault;
  catalogPool: ChannelMediaItem[];
  onAddFavorite: (item: FavoriteItem) => void;
}

export const Channel100AddFavoriteModal: React.FC<Channel100AddFavoriteModalProps> = ({
  isOpen,
  onClose,
  vault,
  catalogPool,
  onAddFavorite,
}) => {
  const [mode, setMode] = useState<"search" | "custom">("search");
  const [query, setQuery] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<ChannelMediaItem | null>(null);

  // Custom / annotation fields
  const [customTitle, setCustomTitle] = useState("");
  const [mediaType, setMediaType] = useState<FavoriteMediaType>("movie");
  const [year, setYear] = useState("");
  const [creator, setCreator] = useState("");
  const [genre, setGenre] = useState("");
  const [where, setWhere] = useState("");
  const [pitch, setPitch] = useState("");
  const [vibe, setVibe] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedCatalogItem(null);
    setCustomTitle("");
    setYear("");
    setCreator("");
    setGenre("");
    setWhere("");
    setPitch("");
    setVibe("");
    setMode("search");
    const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onEsc);
    };
  }, [isOpen, onClose]);

  const dedupedPool = useMemo(() => {
    const seen = new Set<string>();
    const out: ChannelMediaItem[] = [];
    for (const item of catalogPool) {
      const k = normalizeFavoriteKey(item.title);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(item);
    }
    return out;
  }, [catalogPool]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dedupedPool.slice(0, 14);
    return dedupedPool
      .filter((item) => {
        const hay = `${item.title} ${item.director || ""} ${item.network || ""} ${item.genre} ${item.year || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [dedupedPool, query]);

  if (!isOpen) return null;

  const handleQuickAddCatalog = (item: ChannelMediaItem) => {
    onAddFavorite(channelItemToFavorite(item));
  };

  const handleSubmitSelected = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem) return;
    onAddFavorite(
      channelItemToFavorite(selectedCatalogItem, {
        pitch: pitch.trim(),
        vibe: vibe || undefined,
      })
    );
    setSelectedCatalogItem(null);
    setPitch("");
    setVibe("");
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const fav: FavoriteItem = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: customTitle.trim(),
      mediaType,
      year: year.trim() || undefined,
      creator: creator.trim() || undefined,
      genre: genre.trim() || undefined,
      where: where.trim() || undefined,
      pitch: pitch.trim(),
      vibe: vibe || undefined,
      rating: 5,
      hours: mediaType === "movie" ? 2.1 : 24,
      addedAt: Date.now(),
    };
    onAddFavorite(fav);
    onClose();
  };

  return (
    <div
      className="ch100-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch100-induct-title"
    >
      <div className="ch100-fav-modal">
        <div className="ch100-fav-modal-head">
          <div className="ch100-fav-modal-title-group">
            <Crown size={18} strokeWidth={2.3} aria-hidden="true" />
            <h2 id="ch100-induct-title">Induct into All-Time Canon</h2>
          </div>
          <button
            type="button"
            className="ch100-log-dclose"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <div className="ch100-fav-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "search"}
            className={`ch100-fav-modal-tab ${mode === "search" ? "active" : ""}`}
            onClick={() => {
              setMode("search");
              setSelectedCatalogItem(null);
            }}
          >
            <Search size={13} strokeWidth={2.2} aria-hidden="true" />
            Search Canons &amp; Log
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "custom"}
            className={`ch100-fav-modal-tab ${mode === "custom" ? "active" : ""}`}
            onClick={() => {
              setMode("custom");
              if (query.trim() && !customTitle) {
                setCustomTitle(query.trim());
              }
            }}
          >
            <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
            Add Any Custom Title
          </button>
        </div>

        <div className="ch100-fav-modal-body">
          {mode === "search" && !selectedCatalogItem && (
            <>
              <div className="ch100-fav-search-box">
                <Search size={15} strokeWidth={2.2} aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search 800+ shows & films (e.g. Breaking Bad, Parasite, Interstellar)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="ch100-fav-search-results">
                {results.map((item) => {
                  const alreadyIn = isItemInFavorites(vault, item.id, item.title);
                  const isShow =
                    item.kind === "tv" ||
                    (item.custom && item.customKind !== "film");
                  return (
                    <div key={item.id} className="ch100-fav-search-row">
                      <div className="ch100-fav-search-info">
                        <strong>{item.title}</strong>
                        <span>
                          {isShow ? "Series" : "Film"}
                          {item.year || item.start ? ` · ${item.year || item.start}` : ""}
                          {item.director || item.network
                            ? ` · ${item.director || item.network}`
                            : ""}
                        </span>
                      </div>
                      <div className="ch100-fav-search-btns">
                        {alreadyIn ? (
                          <span className="ch100-fav-inducted-pill">
                            <Check size={12} strokeWidth={2.8} aria-hidden="true" />
                            Inducted
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="ch100-util-btn"
                              onClick={() => setSelectedCatalogItem(item)}
                            >
                              + Note
                            </button>
                            <button
                              type="button"
                              className="ch100-btn-primary"
                              onClick={() => handleQuickAddCatalog(item)}
                            >
                              <Plus size={13} strokeWidth={2.6} aria-hidden="true" />
                              Add
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {results.length === 0 && (
                  <div className="ch100-fav-search-empty">
                    <p>No match in loaded canons for &ldquo;{query}&rdquo;.</p>
                    <button
                      type="button"
                      className="ch100-btn-primary"
                      onClick={() => {
                        setCustomTitle(query.trim());
                        setMode("custom");
                      }}
                    >
                      <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
                      Add &ldquo;{query.trim()}&rdquo; as Custom Title
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {mode === "search" && selectedCatalogItem && (
            <form className="ch100-fav-custom-form" onSubmit={handleSubmitSelected}>
              <div className="ch100-fav-selected-banner">
                <div>
                  <strong>{selectedCatalogItem.title}</strong>
                  <span>
                    {selectedCatalogItem.year || selectedCatalogItem.start}
                    {selectedCatalogItem.director || selectedCatalogItem.network
                      ? ` · ${selectedCatalogItem.director || selectedCatalogItem.network}`
                      : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="ch100-util-btn"
                  onClick={() => setSelectedCatalogItem(null)}
                >
                  Change
                </button>
              </div>

              <div className="ch100-dgroup">
                <label htmlFor="favPitchInput">
                  Why it&apos;s an all-timer (shown when you share)
                </label>
                <textarea
                  id="favPitchInput"
                  className="ch100-dtextarea"
                  rows={2}
                  placeholder="e.g. The greatest character transformation ever put on television."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="ch100-dgroup">
                <label>Vibe Stamp (Optional)</label>
                <div className="ch100-fav-vibe-picker">
                  {FAVORITE_VIBES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`ch100-fav-vibe-opt ${vibe === v ? "active" : ""}`}
                      onClick={() => setVibe(vibe === v ? "" : v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ch100-dactions">
                <button type="submit" className="ch100-btn-primary">
                  <Crown size={14} strokeWidth={2.3} aria-hidden="true" />
                  Induct into Canon
                </button>
                <button
                  type="button"
                  className="ch100-util-btn"
                  onClick={() => setSelectedCatalogItem(null)}
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {mode === "custom" && (
            <form className="ch100-fav-custom-form" onSubmit={handleSubmitCustom}>
              <div className="ch100-dgroup">
                <label htmlFor="favCustomTitle">Title</label>
                <input
                  id="favCustomTitle"
                  type="text"
                  className="ch100-dinput"
                  placeholder="e.g. Interstellar, Dark, Attack on Titan, RRR..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="ch100-dgroup">
                <label>Format</label>
                <div className="ch100-fav-type-toggle">
                  <button
                    type="button"
                    aria-pressed={mediaType === "movie"}
                    className={mediaType === "movie" ? "active" : ""}
                    onClick={() => setMediaType("movie")}
                  >
                    <Film size={14} strokeWidth={2.2} aria-hidden="true" />
                    Movie
                  </button>
                  <button
                    type="button"
                    aria-pressed={mediaType === "show"}
                    className={mediaType === "show" ? "active" : ""}
                    onClick={() => setMediaType("show")}
                  >
                    <Tv size={14} strokeWidth={2.2} aria-hidden="true" />
                    TV Show / Series
                  </button>
                </div>
              </div>

              <div className="ch100-drow">
                <div className="ch100-dgroup">
                  <label htmlFor="favCustomYear">Year</label>
                  <input
                    id="favCustomYear"
                    type="text"
                    className="ch100-dinput"
                    placeholder="2014"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
                <div className="ch100-dgroup">
                  <label htmlFor="favCustomCreator">
                    {mediaType === "movie" ? "Director" : "Creator / Network"}
                  </label>
                  <input
                    id="favCustomCreator"
                    type="text"
                    className="ch100-dinput"
                    placeholder={
                      mediaType === "movie" ? "Christopher Nolan" : "HBO"
                    }
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                  />
                </div>
              </div>

              <div className="ch100-drow">
                <div className="ch100-dgroup">
                  <label htmlFor="favCustomGenre">Genre</label>
                  <input
                    id="favCustomGenre"
                    type="text"
                    className="ch100-dinput"
                    placeholder="Sci-Fi, Thriller..."
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                  />
                </div>
                <div className="ch100-dgroup">
                  <label htmlFor="favCustomWhere">Where to Watch</label>
                  <input
                    id="favCustomWhere"
                    type="text"
                    className="ch100-dinput"
                    placeholder="Netflix, HBO Max, Criterion..."
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                  />
                </div>
              </div>

              <div className="ch100-dgroup">
                <label htmlFor="favCustomPitch">
                  Your 1-line pitch (Why people have to watch it)
                </label>
                <textarea
                  id="favCustomPitch"
                  className="ch100-dtextarea"
                  rows={2}
                  placeholder="Optional personal note shown on your shared page..."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                />
              </div>

              <div className="ch100-dgroup">
                <label>Vibe Stamp</label>
                <div className="ch100-fav-vibe-picker">
                  {FAVORITE_VIBES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`ch100-fav-vibe-opt ${vibe === v ? "active" : ""}`}
                      onClick={() => setVibe(vibe === v ? "" : v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ch100-dactions">
                <button type="submit" className="ch100-btn-primary">
                  <Crown size={14} strokeWidth={2.3} aria-hidden="true" />
                  Induct into Canon
                </button>
                <button
                  type="button"
                  className="ch100-util-btn"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
