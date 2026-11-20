"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Crown,
  ExternalLink,
  Film,
  GalleryHorizontalEnd,
  LayoutGrid,
  Tv,
} from "lucide-react";
import { FavoriteItem, FavoritesVault } from "@/lib/channel100/types";
import {
  decodeVaultFromHash,
  favoriteToChannelItem,
  filterFavoritesByScope,
  formatFavoritesForShare,
  ShareFilterScope,
} from "@/lib/channel100/favorites";
import { artFor, fmtH, imdbUrl, jwUrl } from "@/lib/channel100/data";
import { fetchItemArtwork, getCachedArtwork } from "@/lib/channel100/artworkClient";

const PublicPoster: React.FC<{ item: FavoriteItem; rank: number }> = ({
  item,
  rank,
}) => {
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
      className={`ch100-fav-poster ${showPoster ? "has-img" : art.pat}`}
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

export default function PublicFavoritesSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [vault, setVault] = useState<FavoritesVault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<ShareFilterScope>("all");
  const [viewMode, setViewMode] = useState<"gallery" | "reel">("gallery");
  const [copied, setCopied] = useState<"link" | "list" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search);
      const filterParam = qs.get("filter");
      if (filterParam === "movie" || filterParam === "show") {
        setScope(filterParam);
      }
    }

    async function load() {
      if (id === "local") {
        const decoded = decodeVaultFromHash(window.location.hash || "");
        if (decoded) {
          setVault(decoded);
        } else {
          setError("This local share link is missing its favorites payload.");
        }
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/channel100/favorites/share/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error || "This favorites collection is private or unavailable."
          );
        }
        const data = await res.json();
        setVault(data.vault);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load shared favorites."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const filteredItems = useMemo(
    () => (vault ? filterFavoritesByScope(vault.items, scope) : []),
    [vault, scope]
  );

  const moviesCount = useMemo(
    () => (vault ? vault.items.filter((i) => i.mediaType === "movie").length : 0),
    [vault]
  );
  const showsCount = useMemo(
    () => (vault ? vault.items.filter((i) => i.mediaType === "show").length : 0),
    [vault]
  );
  const totalHours = useMemo(
    () =>
      vault
        ? vault.items.reduce(
            (acc, item) =>
              acc + (item.hours || (item.mediaType === "movie" ? 2.1 : 24)),
            0
          )
        : 0,
    [vault]
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyList = async () => {
    if (!vault) return;
    const text = formatFavoritesForShare(vault, scope, "clean", window.location.href);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("list");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="ch100-root ch100-public-share-root">
        <div className="ch100-bars" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i />
        </div>
        <div className="ch100-public-state">
          <Crown size={26} strokeWidth={2.2} aria-hidden="true" />
          <p>Loading screening room…</p>
        </div>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="ch100-root ch100-public-share-root">
        <div className="ch100-bars" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i />
        </div>
        <div className="ch100-public-state">
          <h1>Screening Room Unavailable</h1>
          <p>{error || "This collection could not be found."}</p>
          <Link href="/channel100" className="ch100-btn-primary">
            Open Channel 100
          </Link>
        </div>
      </div>
    );
  }

  const topThree = filteredItems.slice(0, 3);
  const restItems = filteredItems.slice(3);

  return (
    <div className="ch100-root ch100-public-share-root">
      {/* 7-Stripe Broadcast Color Ribbon */}
      <div className="ch100-bars" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i />
      </div>

      {/* Top Bar */}
      <header className="ch100-wrap ch100-public-top">
        <Link href="/channel100" className="ch100-logo">
          <b>CH·100</b>
        </Link>
        <div className="ch100-public-actions">
          <button
            type="button"
            className="ch100-util-btn"
            onClick={handleCopyList}
          >
            {copied === "list" ? (
              <>
                <Check size={13} strokeWidth={2.6} aria-hidden="true" />
                List Copied
              </>
            ) : (
              <>
                <Copy size={13} strokeWidth={2.2} aria-hidden="true" />
                Copy List
              </>
            )}
          </button>
          <button
            type="button"
            className="ch100-btn-primary"
            onClick={handleCopyLink}
          >
            {copied === "link" ? (
              <>
                <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                Link Copied
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2.2} aria-hidden="true" />
                Share Link
              </>
            )}
          </button>
        </div>
      </header>

      {/* Public Marquee */}
      <section className="ch100-wrap ch100-fav-marquee-wrap">
        <div className="ch100-fav-marquee">
          <div className="ch100-fav-marquee-main">
            <h1 className="ch100-fav-h1">{vault.profile.displayName}</h1>
            <p className="ch100-fav-lede">{vault.profile.tagline}</p>
          </div>
          <aside className="ch100-fav-ticket">
            <div className="ch100-fav-ticket-head">
              <span className="ch100-fav-ticket-code">SCREENING ROOM</span>
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
              <span className="ch100-fav-ticket-crown-lbl">NO. 01 PICK</span>
              <span className="ch100-fav-ticket-crown-val">
                {vault.items[0]?.title || "—"}
              </span>
            </div>
          </aside>
        </div>
      </section>

      {/* Filter & View Bar */}
      <section className="ch100-fav-toolbar-wrap">
        <div className="ch100-wrap ch100-fav-toolbar">
          <div className="ch100-fav-scope-pills" role="group" aria-label="Filter by format">
            <button
              type="button"
              className={`ch100-fav-scope-btn ${scope === "all" ? "active" : ""}`}
              onClick={() => setScope("all")}
            >
              All <small>{vault.items.length}</small>
            </button>
            <button
              type="button"
              className={`ch100-fav-scope-btn ${scope === "movie" ? "active" : ""}`}
              onClick={() => setScope("movie")}
            >
              <Film size={13} strokeWidth={2.2} aria-hidden="true" />
              Movies <small>{moviesCount}</small>
            </button>
            <button
              type="button"
              className={`ch100-fav-scope-btn ${scope === "show" ? "active" : ""}`}
              onClick={() => setScope("show")}
            >
              <Tv size={13} strokeWidth={2.2} aria-hidden="true" />
              Shows <small>{showsCount}</small>
            </button>
          </div>

          <div className="ch100-fav-layout-tog">
            <button
              type="button"
              aria-pressed={viewMode === "gallery"}
              onClick={() => setViewMode("gallery")}
            >
              <LayoutGrid size={13} strokeWidth={2.2} aria-hidden="true" />
              Gallery
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "reel"}
              onClick={() => setViewMode("reel")}
            >
              <GalleryHorizontalEnd size={13} strokeWidth={2.2} aria-hidden="true" />
              35mm Reel
            </button>
          </div>
        </div>
      </section>

      {/* Public Showcase */}
      <main className="ch100-wrap ch100-fav-body">
        {viewMode === "reel" ? (
          <div className="ch100-fav-reel-shell">
            <div className="ch100-fav-sprockets" aria-hidden="true">
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
            <div className="ch100-fav-reel-track">
              {filteredItems.map((item, idx) => {
                const channelItem = favoriteToChannelItem(item, idx);
                return (
                  <article key={item.id} className="ch100-fav-reel-frame">
                    <div className="ch100-fav-reel-frame-top">
                      <span className="ch100-fav-frame-code">
                        FRAME {String(idx + 1).padStart(2, "0")}A
                      </span>
                      <span className="ch100-fav-frame-type">
                        {item.mediaType === "movie" ? "35MM FILM" : "SERIES"}
                      </span>
                    </div>
                    <div className="ch100-fav-reel-poster-wrap">
                      <PublicPoster item={item} rank={idx + 1} />
                      <span className="ch100-fav-rank-stamp">
                        NO. {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="ch100-fav-reel-caption">
                      <h3>{item.title}</h3>
                      <div className="ch100-fav-reel-meta">
                        {item.year && <span>{item.year}</span>}
                        {item.vibe && (
                          <span className="ch100-fav-vibe-pill">{item.vibe}</span>
                        )}
                      </div>
                      {item.pitch && (
                        <p className="ch100-fav-reel-pitch">&ldquo;{item.pitch}&rdquo;</p>
                      )}
                      <div className="ch100-public-ext-links">
                        <a
                          href={jwUrl(channelItem)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Watch <ExternalLink size={11} aria-hidden="true" />
                        </a>
                        <a
                          href={imdbUrl(channelItem)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          IMDb <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      </div>
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
        ) : (
          <div className="ch100-fav-gallery">
            <div className={`ch100-fav-podium count-${Math.min(3, topThree.length)}`}>
              {topThree.map((item, idx) => {
                const channelItem = favoriteToChannelItem(item, idx);
                return (
                  <article
                    key={item.id}
                    className={`ch100-fav-podium-card ${idx === 0 ? "is-headliner" : "is-cofeature"}`}
                  >
                    <div className="ch100-fav-podium-art">
                      <PublicPoster item={item} rank={idx + 1} />
                      <div className="ch100-fav-medallion">
                        {idx === 0 && (
                          <Crown size={12} strokeWidth={2.5} aria-hidden="true" />
                        )}
                        <span>NO. {String(idx + 1).padStart(2, "0")}</span>
                      </div>
                      <span className={`ch100-fav-kind-float ${item.mediaType}`}>
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
                      <h2 className="ch100-fav-podium-title">{item.title}</h2>
                      {item.pitch && (
                        <blockquote className="ch100-fav-quote">
                          &ldquo;{item.pitch}&rdquo;
                        </blockquote>
                      )}
                      <div className="ch100-fav-card-foot">
                        <span className="ch100-fav-genre-meta">
                          {[item.genre, item.where].filter(Boolean).join(" · ")}
                        </span>
                        <div className="ch100-public-ext-links">
                          <a
                            href={jwUrl(channelItem)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Where to watch <ExternalLink size={11} aria-hidden="true" />
                          </a>
                          <a
                            href={imdbUrl(channelItem)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            IMDb <ExternalLink size={11} aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {restItems.length > 0 && (
              <div className="ch100-fav-wall">
                {restItems.map((item, idx) => {
                  const rank = idx + 4;
                  const channelItem = favoriteToChannelItem(item, rank - 1);
                  return (
                    <article key={item.id} className="ch100-fav-wall-card">
                      <div className="ch100-fav-wall-art">
                        <PublicPoster item={item} rank={rank} />
                        <span className="ch100-fav-rank-stamp">
                          NO. {String(rank).padStart(2, "0")}
                        </span>
                        <span className={`ch100-fav-kind-float ${item.mediaType}`}>
                          {item.mediaType === "movie" ? "FILM" : "TV"}
                        </span>
                      </div>
                      <div className="ch100-fav-wall-body">
                        <h3>{item.title}</h3>
                        <div className="ch100-fav-wall-meta">
                          {item.year && <span>{item.year}</span>}
                          {item.vibe && (
                            <span className="ch100-fav-vibe-pill">{item.vibe}</span>
                          )}
                        </div>
                        {item.pitch && (
                          <p className="ch100-fav-wall-pitch">
                            &ldquo;{item.pitch}&rdquo;
                          </p>
                        )}
                        <div className="ch100-public-ext-links">
                          <a
                            href={jwUrl(channelItem)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Watch <ExternalLink size={11} aria-hidden="true" />
                          </a>
                          <a
                            href={imdbUrl(channelItem)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            IMDb <ExternalLink size={11} aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
