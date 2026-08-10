"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Bookmark, Collection, DetectionResult, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { cleanTitle } from "@/lib/cleanTitle";

interface CaptureModalProps {
  isOpen: boolean;
  collections: Collection[];
  bookmarks?: Bookmark[];
  initialUrl?: string;
  onClose: () => void;
  onSave: (bm: Omit<Bookmark, "id" | "when">) => void;
  onSelectExisting?: (id: number) => void;
}

export function detectUrlMeta(u: string): DetectionResult | null {
  const urlLower = u.toLowerCase().trim();
  if (!urlLower) return null;

  if (/youtube\.com\/playlist/.test(urlLower)) {
    return {
      ty: "PLY",
      f: { Source: "YouTube", Contains: "22 videos", Runtime: "9h 40m", Suggested: "Listening" },
      n: "Playlists store item count and total runtime, so the time filter can reason about them.",
    };
  }
  if (/youtube\.com|youtu\.be/.test(urlLower)) {
    return {
      ty: "VID",
      f: { Source: "YouTube", Channel: "A. Karpathy", Runtime: "1:56:20", Chapters: "9", Suggested: "AI & retrieval" },
      n: "Chapters are stored too — a 2-hour video can still surface in a 20-minute slot as one chapter.",
    };
  }
  if (/spotify|music\.apple/.test(urlLower)) {
    return {
      ty: "PLY",
      f: { Source: "Spotify", Tracks: "84", Runtime: "5h 12m", Suggested: "Listening" },
      n: "Playlists never enter the unread queue. They're ambient, not debt.",
    };
  }
  if (/github\.com\/[\w.-]+\/[\w.-]+/.test(urlLower)) {
    return {
      ty: "GIT",
      f: { Source: "GitHub", Language: "TypeScript / C", Stars: "12.4k", Updated: "1 day ago", Suggested: "AI & retrieval" },
      n: "Stars and last-commit refresh on a schedule, so an abandoned repo tells you it's abandoned.",
    };
  }
  if (/arxiv|acm\.org|ieee/.test(urlLower)) {
    return {
      ty: "PPR",
      f: { Source: "arXiv", Authors: "Lewis et al.", Pages: "19", Year: "2020", Suggested: "AI & retrieval" },
      n: "The PDF is mirrored locally, so link rot is not your problem.",
    };
  }
  if (/raycast|warp\.dev|excalidraw|apps\.apple|play\.google/.test(urlLower)) {
    return {
      ty: "APP",
      f: { Platform: "macOS / Web", Price: "Free tier", Suggested: "Build shelf" },
      n: "Apps skip the reading queue and land on a shelf you check when setting up a machine.",
    };
  }
  if (/docs\.|developer\.|\/docs\//.test(urlLower)) {
    return {
      ty: "DOC",
      f: { Source: "Documentation", Section: "Reference", Suggested: "Engineering" },
      n: "Docs are reference, never unread. You don't owe a docs page a read-through.",
    };
  }
  if (urlLower.length > 8) {
    return {
      ty: "ART",
      f: { Author: "Web Article", Words: "3,500", Reading: "15 min", Suggested: "Data & storage" },
      n: "Full text is archived at save time so the article outlives the site.",
    };
  }
  return null;
}

function normalizeUrl(u: string): string {
  try {
    const raw = u.trim().toLowerCase();
    const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
    const parsed = new URL(withProto);
    return (parsed.hostname + parsed.pathname).replace(/\/$/, "");
  } catch {
    return u.trim().toLowerCase();
  }
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  collections,
  bookmarks = [],
  initialUrl = "",
  onClose,
  onSave,
  onSelectExisting,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [selectedColl, setSelectedColl] = useState("unsorted");
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  // Sync local url from the initialUrl prop when it changes (adjusting state during
  // render, per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [prevInitialUrl, setPrevInitialUrl] = useState(initialUrl);
  if (initialUrl && initialUrl !== prevInitialUrl) {
    setPrevInitialUrl(initialUrl);
    setUrl(initialUrl);
  }

  // Clear the stale fetched title as soon as the url changes, same render-time pattern.
  const [prevUrlForTitle, setPrevUrlForTitle] = useState(url);
  if (url !== prevUrlForTitle) {
    setPrevUrlForTitle(url);
    setFetchedTitle(null);
  }

  // Debounced og:title fetch — fires 500ms after URL stops changing
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || trimmed.length < 8) return;

    const timer = setTimeout(async () => {
      try {
        setIsFetchingMeta(true);
        const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
        const res = await fetch(`/api/meta?url=${encodeURIComponent(fullUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) setFetchedTitle(data.title);
        }
      } catch {
        // Network error — silently ignore, fall back to URL slug
      } finally {
        setIsFetchingMeta(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url]);

  // Duplicate Check
  const duplicateMatch = useMemo(() => {
    if (!url.trim() || bookmarks.length === 0) return null;
    const targetNorm = normalizeUrl(url);
    return bookmarks.find((b) => normalizeUrl(b.url) === targetNorm) || null;
  }, [url, bookmarks]);

  if (!isOpen) return null;

  const flattenCollections = (list: Collection[], depth = 0): { id: string; name: string }[] => {
    let res: { id: string; name: string }[] = [];
    list.forEach((item) => {
      if (item.id !== "all") {
        const prefix = "— ".repeat(depth);
        res.push({ id: item.id, name: `${prefix}${item.name}` });
      }
      if (item.kids) {
        res = res.concat(flattenCollections(item.kids, depth + 1));
      }
    });
    return res;
  };

  const availableFolders = flattenCollections(collections);
  const detection = detectUrlMeta(url);

  const handleSave = async () => {
    if (!url.trim()) return;
    const detected = detectUrlMeta(url);
    const ty: KindType = detected?.ty || "ART";
    let domain = "web";
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, "");
    } catch {
      domain = "web";
    }

    // Priority: fetched og:title → smart cleanTitle from URL
    let title = fetchedTitle;
    if (!title) {
      // Attempt a fresh fetch if the debounce hasn't resolved yet
      try {
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        const res = await fetch(`/api/meta?url=${encodeURIComponent(fullUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.title) title = data.title;
        }
      } catch {
        // Ignore — cleanTitle handles fallbacks cleanly
      }
    }

    const finalTitle = cleanTitle(title, url);

    onSave({
      t: finalTitle,
      ty,
      src: domain,
      url: url.startsWith("http") ? url : `https://${url}`,
      mins: ty === "VID" ? 45 : ty === "PPR" ? 40 : 12,
      tag: ty === "GIT" ? "craft" : ty === "VID" ? "ai" : "systems",
      coll: selectedColl || (ty === "PLY" ? "listen" : "unsorted"),
      unread: true,
      ex: detected?.f || { Words: "1,500" },
      note: detected?.n || "Saved via link capture.",
    });

    setUrl("");
    setFetchedTitle(null);
    onClose();
  };

  const presets = [
    { label: "youtube.com/watch", u: "https://www.youtube.com/watch?v=kCc8FmEb1nY" },
    { label: "github.com/repo", u: "https://github.com/pgvector/pgvector" },
    { label: "spotify playlist", u: "https://open.spotify.com/playlist/37i9" },
    { label: "arxiv.org", u: "https://arxiv.org/abs/2005.11401" },
    { label: "raycast.com", u: "https://www.raycast.com" },
    { label: "a blog post", u: "https://alexdebrie.com/posts/dynamodb/" },
  ];

  return (
    <div
      className="veil on"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("veil")) onClose();
      }}
    >
      <div className="sheet">
        <header>
          <b>SAVE A LINK</b>
          <button onClick={onClose}>✕</button>
        </header>

        <input
          className="urlin"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste any URL…"
          autoFocus
          autoComplete="off"
        />

        {/* Title resolution preview */}
        {url.trim().length > 8 && (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 700,
              padding: "5px 0 2px",
              color: "var(--fg)",
              opacity: isFetchingMeta ? 0.5 : fetchedTitle ? 1 : 0.4,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minHeight: "20px",
              letterSpacing: "0.04em",
            }}
          >
            {isFetchingMeta ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                FETCHING TITLE…
              </>
            ) : fetchedTitle ? (
              <>
                <span style={{ color: "var(--acc)" }}>✓</span>
                {fetchedTitle}
              </>
            ) : (
              "TITLE NOT FOUND — WILL USE URL"
            )}
          </div>
        )}

        {/* Duplicate Warning Banner */}
        {duplicateMatch && (
          <div
            style={{
              border: "3px solid #000",
              background: "#FFE600",
              boxShadow: "3px 3px 0 #000",
              padding: "10px 12px",
              margin: "10px 0",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚠️ DUPLICATE DETECTED: Saved on {duplicateMatch.when}</span>
              {onSelectExisting && (
                <button
                  onClick={() => {
                    onSelectExisting(duplicateMatch.id);
                    onClose();
                  }}
                  style={{
                    border: "2px solid #000",
                    background: "#000",
                    color: "#FFE600",
                    padding: "3px 8px",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  OPEN EXISTING ↗
                </button>
              )}
            </div>
            <div style={{ marginTop: "4px", fontSize: "10px", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Title: &quot;{duplicateMatch.t}&quot;
            </div>
          </div>
        )}

        <div className="hints">
          {presets.map((p) => (
            <button key={p.label} onClick={() => setUrl(p.u)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="detect">
          {!url.trim() ? (
            <div className="dnote">
              Paste anything. What kind of thing it is decides which fields get captured — a repo needs stars and a language, a video needs a runtime, an app needs a platform.
            </div>
          ) : !detection ? (
            <div className="dnote">Not a URL yet.</div>
          ) : (
            <>
              <div className="drow">
                <dt>DETECTED</dt>
                <dd>
                  <span
                    className="ctag"
                    style={{
                      background: TYPES[detection.ty].c,
                      color: TYPES[detection.ty].fg,
                      padding: "3px 7px",
                    }}
                  >
                    {detection.ty}
                  </span>
                  <span style={{ marginLeft: 8 }}>
                    {TYPES[detection.ty].name.replace(/s$/, "")}
                  </span>
                </dd>
              </div>
              {Object.entries(detection.f).map(([k, v]) => (
                <div className="drow" key={k}>
                  <dt>{k.toUpperCase()}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="drow" style={{ marginTop: 8 }}>
                <dt>TARGET FOLDER</dt>
                <dd>
                  <select
                    value={selectedColl}
                    onChange={(e) => setSelectedColl(e.target.value)}
                    style={{
                      border: "2px solid #000",
                      background: "#FFE600",
                      padding: "4px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      fontWeight: "700",
                      outline: "none",
                    }}
                  >
                    {availableFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div className="dnote">{detection.n}</div>
            </>
          )}
        </div>

        <div className="sfoot">
          <button onClick={onClose}>CANCEL</button>
          <button className="prime" onClick={handleSave}>
            {duplicateMatch ? "SAVE ANYWAY" : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
};
