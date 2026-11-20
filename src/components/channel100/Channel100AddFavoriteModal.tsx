"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Crown,
  ExternalLink,
  Film,
  Loader2,
  MessageSquareQuote,
  Plus,
  Search,
  Sparkles,
  Tv,
  X,
} from "lucide-react";
import {
  ChannelMediaItem,
  FavoriteItem,
  FavoriteMediaType,
  FavoriteReview,
  FavoritesVault,
} from "@/lib/channel100/types";
import {
  channelItemToFavorite,
  FAVORITE_VIBES,
  isItemInFavorites,
  normalizeFavoriteKey,
} from "@/lib/channel100/favorites";
import type {
  LookupCandidate,
  LookupEnrichedResult,
} from "@/app/api/channel100/lookup/route";

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
  const [lang, setLang] = useState("");
  const [hours, setHours] = useState<number | undefined>(undefined);
  const [posterUrl, setPosterUrl] = useState<string | undefined>(undefined);
  const [imdbId, setImdbId] = useState<string | undefined>(undefined);
  const [synopsis, setSynopsis] = useState<string | undefined>(undefined);
  const [letterboxdUrl, setLetterboxdUrl] = useState<string | undefined>(undefined);
  const [reviews, setReviews] = useState<FavoriteReview[]>([]);
  const [pitch, setPitch] = useState("");
  const [vibe, setVibe] = useState("");

  // Live lookup state
  const [candidates, setCandidates] = useState<LookupCandidate[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  const skipNextAutocompleteRef = useRef(false);

  // Inline Letterboxd review adder
  const [addingLbReview, setAddingLbReview] = useState(false);
  const [lbAuthor, setLbAuthor] = useState("");
  const [lbRating, setLbRating] = useState("★★★★★");
  const [lbText, setLbText] = useState("");

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
    setLang("");
    setHours(undefined);
    setPosterUrl(undefined);
    setImdbId(undefined);
    setSynopsis(undefined);
    setLetterboxdUrl(undefined);
    setReviews([]);
    setPitch("");
    setVibe("");
    setCandidates([]);
    setShowCandidates(false);
    setLookupStatus(null);
    setAddingLbReview(false);
    setLbAuthor("");
    setLbRating("★★★★★");
    setLbText("");
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

  // Debounced live autocomplete when typing in the Custom Title input
  useEffect(() => {
    if (!isOpen || mode !== "custom") return;
    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }

    const q = customTitle.trim();
    if (q.length < 2) {
      setCandidates([]);
      setShowCandidates(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingCandidates(true);
      try {
        const res = await fetch(
          `/api/channel100/lookup?q=${encodeURIComponent(q)}&type=${mediaType}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.candidates)) {
          setCandidates(data.candidates);
          setShowCandidates(data.candidates.length > 0);
        }
      } catch {
        // Ignore transient lookup error
      } finally {
        if (!cancelled) setSearchingCandidates(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, mode, customTitle, mediaType]);

  const enrichTitle = async (params: {
    title: string;
    mediaType: FavoriteMediaType;
    year?: string;
    imdbId?: string;
    image?: string;
  }) => {
    setEnriching(true);
    setShowCandidates(false);
    setLookupStatus("Fetching movie details & top reviews…");
    try {
      const qs = new URLSearchParams({
        enrich: "1",
        title: params.title,
        type: params.mediaType,
      });
      if (params.year) qs.set("year", params.year);
      if (params.imdbId) qs.set("imdbId", params.imdbId);
      if (params.image) qs.set("image", params.image);

      const res = await fetch(`/api/channel100/lookup?${qs.toString()}`);
      if (!res.ok) {
        setLookupStatus("Could not auto-fill metadata — you can still enter details manually.");
        return;
      }
      const data = (await res.json()) as LookupEnrichedResult;

      skipNextAutocompleteRef.current = true;
      setCustomTitle(data.title || params.title);
      setMediaType(data.mediaType || params.mediaType);
      if (data.year) setYear(data.year);
      if (data.creator) setCreator(data.creator);
      if (data.genre) setGenre(data.genre);
      if (data.where) setWhere(data.where);
      if (data.lang) setLang(data.lang);
      if (data.hours) setHours(data.hours);
      if (data.image) setPosterUrl(data.image);
      if (data.imdbId) setImdbId(data.imdbId);
      if (data.synopsis) setSynopsis(data.synopsis);
      if (data.letterboxdUrl) setLetterboxdUrl(data.letterboxdUrl);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);

      setLookupStatus(
        data.reviews?.length
          ? `Auto-filled details + ${data.reviews.length} top reviews`
          : "Auto-filled movie details — open Letterboxd to grab reader reviews"
      );
    } catch {
      setLookupStatus("Auto-fill unavailable — enter details manually.");
    } finally {
      setEnriching(false);
    }
  };

  // Auto-fetch reviews when user picks "+ Note" on a catalog item too
  const handleSelectCatalogForNote = async (item: ChannelMediaItem) => {
    setSelectedCatalogItem(item);
    setReviews([]);
    setLetterboxdUrl(undefined);
    setPitch("");
    setVibe("");
    const inferredType: FavoriteMediaType =
      item.kind === "tv" || (item.custom && item.customKind !== "film")
        ? "show"
        : "movie";
    try {
      const qs = new URLSearchParams({
        enrich: "1",
        title: item.title,
        type: inferredType,
      });
      if (item.year || item.start) qs.set("year", String(item.year || item.start));
      const res = await fetch(`/api/channel100/lookup?${qs.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as LookupEnrichedResult;
      if (data.letterboxdUrl) setLetterboxdUrl(data.letterboxdUrl);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);
    } catch {
      // Optional enrichment
    }
  };

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
        letterboxdUrl,
        reviews: reviews.length > 0 ? reviews : undefined,
      })
    );
    setSelectedCatalogItem(null);
    setPitch("");
    setVibe("");
    setReviews([]);
  };

  const handleAddLetterboxdReview = () => {
    const text = lbText.trim();
    if (!text) return;
    setReviews((prev) => [
      {
        author: lbAuthor.trim() || "Letterboxd Member",
        rating: lbRating.trim() || undefined,
        text,
        source: "letterboxd",
      },
      ...prev,
    ]);
    setLbAuthor("");
    setLbRating("★★★★★");
    setLbText("");
    setAddingLbReview(false);
  };

  const handleRemoveReview = (idx: number) => {
    setReviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const fav: FavoriteItem = {
      id: imdbId || `fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: customTitle.trim(),
      mediaType,
      year: year.trim() || undefined,
      creator: creator.trim() || undefined,
      genre: genre.trim() || undefined,
      lang: lang.trim() || undefined,
      where: where.trim() || undefined,
      pitch: pitch.trim(),
      vibe: vibe || undefined,
      rating: 5,
      hours: hours || (mediaType === "movie" ? 2.1 : 24),
      image: posterUrl,
      imdbId,
      synopsis,
      letterboxdUrl:
        letterboxdUrl ||
        `https://letterboxd.com/search/films/${encodeURIComponent(customTitle.trim())}/`,
      reviews: reviews.length > 0 ? reviews : undefined,
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
                              onClick={() => handleSelectCatalogForNote(item)}
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
                      <Sparkles size={14} strokeWidth={2.4} aria-hidden="true" />
                      Auto-Lookup &ldquo;{query.trim()}&rdquo;
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

              {reviews.length > 0 && (
                <div className="ch100-lookup-reviews-box">
                  <div className="ch100-lookup-reviews-head">
                    <span>
                      <MessageSquareQuote size={13} strokeWidth={2.2} aria-hidden="true" />
                      Top Reviews Attached ({reviews.length})
                    </span>
                  </div>
                  <div className="ch100-lookup-reviews-list">
                    {reviews.map((rev, idx) => (
                      <div key={idx} className="ch100-lookup-review-item">
                        <div className="ch100-lookup-review-meta">
                          <strong>{rev.author}</strong>
                          {rev.rating && <span>{rev.rating}</span>}
                          <button
                            type="button"
                            className="ch100-lookup-review-del"
                            onClick={() => handleRemoveReview(idx)}
                            aria-label="Remove review"
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                        </div>
                        <p>&ldquo;{rev.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              {/* Smart Auto-Lookup Title Input */}
              <div className="ch100-dgroup ch100-lookup-field-wrap">
                <div className="ch100-lookup-label-row">
                  <label htmlFor="favCustomTitle">Title</label>
                  <button
                    type="button"
                    className="ch100-lookup-autofill-btn"
                    disabled={enriching || customTitle.trim().length < 2}
                    onClick={() =>
                      enrichTitle({
                        title: customTitle.trim(),
                        mediaType,
                        year: year.trim() || undefined,
                      })
                    }
                  >
                    {enriching ? (
                      <>
                        <Loader2 size={12} className="ch100-spin" aria-hidden="true" />
                        Looking up…
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} strokeWidth={2.3} aria-hidden="true" />
                        Auto-Fill Info &amp; Reviews
                      </>
                    )}
                  </button>
                </div>

                <div className="ch100-lookup-input-wrap">
                  <input
                    id="favCustomTitle"
                    type="text"
                    className="ch100-dinput"
                    placeholder="Type any movie or show (e.g. Sahasam, Interstellar, Dark)..."
                    value={customTitle}
                    onChange={(e) => {
                      setCustomTitle(e.target.value);
                      setLookupStatus(null);
                    }}
                    onFocus={() => {
                      if (candidates.length > 0) setShowCandidates(true);
                    }}
                    required
                    autoComplete="off"
                    autoFocus
                  />
                  {searchingCandidates && (
                    <Loader2
                      size={14}
                      className="ch100-lookup-spinner ch100-spin"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Instant Autocomplete Candidates */}
                {showCandidates && candidates.length > 0 && (
                  <div className="ch100-lookup-dropdown" role="listbox" aria-label="Matching titles">
                    {candidates.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="ch100-lookup-option"
                        onClick={() =>
                          enrichTitle({
                            title: cand.title,
                            mediaType: cand.mediaType,
                            year: cand.year,
                            imdbId: cand.imdbId,
                            image: cand.image,
                          })
                        }
                      >
                        {cand.image ? (
                          <img
                            src={cand.image}
                            alt=""
                            className="ch100-lookup-thumb"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="ch100-lookup-thumb-ph">
                            {cand.mediaType === "show" ? (
                              <Tv size={14} aria-hidden="true" />
                            ) : (
                              <Film size={14} aria-hidden="true" />
                            )}
                          </span>
                        )}
                        <div className="ch100-lookup-opt-info">
                          <strong>
                            {cand.title}
                            {cand.year ? ` (${cand.year})` : ""}
                          </strong>
                          <span>
                            {cand.mediaType === "show" ? "TV Show" : "Movie"}
                            {cand.stars ? ` · ${cand.stars}` : ""}
                          </span>
                        </div>
                        <span className="ch100-lookup-opt-pick">Auto-Fill</span>
                      </button>
                    ))}
                  </div>
                )}

                {lookupStatus && (
                  <div className="ch100-lookup-status">
                    <Sparkles size={12} strokeWidth={2.3} aria-hidden="true" />
                    <span>{lookupStatus}</span>
                  </div>
                )}
              </div>

              {/* Matched Poster + Synopsis Preview Strip */}
              {(posterUrl || synopsis) && (
                <div className="ch100-lookup-preview-card">
                  {posterUrl && (
                    <img
                      src={posterUrl}
                      alt={customTitle}
                      className="ch100-lookup-preview-poster"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="ch100-lookup-preview-info">
                    <div className="ch100-lookup-preview-top">
                      <strong>
                        {customTitle}
                        {year ? ` (${year})` : ""}
                      </strong>
                      {lang && <span className="ch100-lookup-lang-pill">{lang}</span>}
                    </div>
                    {synopsis && (
                      <p className="ch100-lookup-preview-syn">{synopsis}</p>
                    )}
                    {letterboxdUrl && (
                      <a
                        href={letterboxdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ch100-lookup-lb-link"
                      >
                        Open Letterboxd Top Reviews
                        <ExternalLink size={11} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              )}

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
                    placeholder="2013"
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
                      mediaType === "movie" ? "Chandra Sekhar Yeleti" : "HBO"
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
                    placeholder="Action, Adventure..."
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
                    placeholder="Netflix, Prime Video, Criterion..."
                    value={where}
                    onChange={(e) => setWhere(e.target.value)}
                  />
                </div>
              </div>

              {/* Top Reviews Section (Auto-Fetched + Add Letterboxd Review) */}
              <div className="ch100-lookup-reviews-box">
                <div className="ch100-lookup-reviews-head">
                  <span>
                    <MessageSquareQuote size={13} strokeWidth={2.2} aria-hidden="true" />
                    Top Reviews ({reviews.length})
                  </span>
                  <div className="ch100-lookup-reviews-head-acts">
                    {(letterboxdUrl || customTitle.trim()) && (
                      <a
                        href={
                          letterboxdUrl ||
                          `https://letterboxd.com/search/films/${encodeURIComponent(
                            customTitle.trim()
                          )}/`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ch100-lookup-lb-mini"
                      >
                        Letterboxd ↗
                      </a>
                    )}
                    <button
                      type="button"
                      className="ch100-lookup-add-rev-btn"
                      onClick={() => setAddingLbReview((prev) => !prev)}
                    >
                      <Plus size={11} strokeWidth={2.5} aria-hidden="true" />
                      Add Letterboxd Review
                    </button>
                  </div>
                </div>

                {addingLbReview && (
                  <div className="ch100-lookup-lb-composer">
                    <div className="ch100-drow">
                      <input
                        type="text"
                        className="ch100-dinput"
                        placeholder="Reviewer (e.g. @karsten)"
                        value={lbAuthor}
                        onChange={(e) => setLbAuthor(e.target.value)}
                      />
                      <input
                        type="text"
                        className="ch100-dinput"
                        placeholder="Rating (e.g. ★★★★★)"
                        value={lbRating}
                        onChange={(e) => setLbRating(e.target.value)}
                      />
                    </div>
                    <textarea
                      rows={2}
                      className="ch100-dtextarea"
                      placeholder="Paste a favorite Letterboxd review quote..."
                      value={lbText}
                      onChange={(e) => setLbText(e.target.value)}
                    />
                    <div className="ch100-fav-inline-actions">
                      <button
                        type="button"
                        className="ch100-btn-primary"
                        onClick={handleAddLetterboxdReview}
                      >
                        Attach Review
                      </button>
                      <button
                        type="button"
                        className="ch100-util-btn"
                        onClick={() => setAddingLbReview(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {reviews.length > 0 ? (
                  <div className="ch100-lookup-reviews-list">
                    {reviews.map((rev, idx) => (
                      <div key={idx} className="ch100-lookup-review-item">
                        <div className="ch100-lookup-review-meta">
                          <strong>{rev.author}</strong>
                          <span className={`ch100-rev-src ${rev.source}`}>
                            {rev.source === "letterboxd"
                              ? "Letterboxd"
                              : rev.source === "tmdb"
                                ? "TMDB"
                                : "Critic"}
                          </span>
                          {rev.rating && (
                            <span className="ch100-rev-score">{rev.rating}</span>
                          )}
                          <button
                            type="button"
                            className="ch100-lookup-review-del"
                            onClick={() => handleRemoveReview(idx)}
                            aria-label="Remove review"
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                        </div>
                        <p>&ldquo;{rev.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ch100-lookup-reviews-hint">
                    Pick a match above or click <strong>Auto-Fill Info &amp; Reviews</strong> to pull top reviews automatically.
                  </p>
                )}
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
