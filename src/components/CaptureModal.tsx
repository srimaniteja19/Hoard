"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Bookmark, Collection, DetectionResult, ItemType, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { cleanTitle } from "@/lib/cleanTitle";
import { detectKindFromMetadata, detectKindFromUrl } from "@/lib/detectKind";
import { flattenCollections, primaryTag } from "@/lib/library/triageCapture";

interface FetchedMeta {
  title: string | null;
  description: string | null;
  image: string | null;
  ogType: string | null;
}

interface CaptureModalProps {
  isOpen: boolean;
  collections: Collection[];
  bookmarks?: Bookmark[];
  initialUrl?: string;
  onClose: () => void;
  onSave: (bm: Omit<Bookmark, "id" | "when">) => void;
  onSelectExisting?: (id: number) => void;
}

const DETECTION_COPY: Record<KindType, Pick<DetectionResult, "f" | "n">> = {
  PLY: {
    f: { Source: "Streaming", Suggested: "Listening" },
    n: "Playlists never enter the unread queue. They're ambient, not debt.",
  },
  VID: {
    f: { Source: "Video", Suggested: "AI & retrieval" },
    n: "Chapters are stored too — a 2-hour video can still surface in a 20-minute slot as one chapter.",
  },
  GIT: {
    f: { Source: "GitHub", Suggested: "AI & retrieval" },
    n: "Stars and last-commit refresh on a schedule, so an abandoned repo tells you it's abandoned.",
  },
  PPR: {
    f: { Source: "Paper", Suggested: "AI & retrieval" },
    n: "The PDF is mirrored locally, so link rot is not your problem.",
  },
  APP: {
    f: { Platform: "Web / Desktop", Suggested: "Build shelf" },
    n: "Tools and apps skip the reading queue and land on a shelf you check when setting up a machine.",
  },
  DOC: {
    f: { Source: "Documentation", Section: "Reference", Suggested: "Engineering" },
    n: "Docs are reference, never unread. You don't owe a docs page a read-through.",
  },
  ART: {
    f: { Author: "Web Article", Suggested: "Data & storage" },
    n: "Full text is archived at save time so the article outlives the site.",
  },
};

/**
 * Live preview shown as the user types — URL-pattern only (synchronous, no
 * network wait). The final kind used to actually save is decided in
 * handleSave, which also has fetched page metadata (og:type) to fall back on
 * for URLs this pass can't confidently classify.
 */
export function detectUrlMeta(u: string): DetectionResult | null {
  const urlLower = u.toLowerCase().trim();
  if (urlLower.length <= 8) return null;

  const ty = detectKindFromUrl(urlLower) ?? "APP";
  return { ty, ...DETECTION_COPY[ty] };
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
  const [manualKind, setManualKind] = useState<KindType | null>(null);
  const [fetchedMeta, setFetchedMeta] = useState<FetchedMeta | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [tag, setTag] = useState("");
  const [itemType, setItemType] = useState<ItemType>("REFERENCE");
  const [summary, setSummary] = useState("");
  const [triageStatus, setTriageStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const touched = useRef({ coll: false, tag: false, itemType: false, summary: false });

  // Sync local url from the initialUrl prop when it changes (adjusting state during
  // render, per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [prevInitialUrl, setPrevInitialUrl] = useState(initialUrl);
  if (initialUrl && initialUrl !== prevInitialUrl) {
    setPrevInitialUrl(initialUrl);
    setUrl(initialUrl);
  }

  // Clear the stale fetched meta and manualKind override as soon as the url changes
  const [prevUrlForTitle, setPrevUrlForTitle] = useState(url);
  if (url !== prevUrlForTitle) {
    setPrevUrlForTitle(url);
    setFetchedMeta(null);
    setManualKind(null);
    setTag("");
    setSummary("");
    setTriageStatus("idle");
  }

  // Debounced metadata fetch (title, description, og:image, og:type) — fires
  // 500ms after the URL stops changing. og:type feeds the kind classifier's
  // fallback pass for URLs the pattern-matcher can't confidently place, and
  // og:image becomes the card's real cover instead of synthetic SVG art.
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
          setFetchedMeta({
            title: data.title ?? null,
            description: data.description ?? null,
            image: data.image ?? null,
            ogType: data.ogType ?? null,
          });
        }
      } catch {
        // Network error — silently ignore, fall back to URL slug
      } finally {
        setIsFetchingMeta(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    touched.current = { coll: false, tag: false, itemType: false, summary: false };
  }, [url]);

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || trimmed.length < 8) return;
    if (isFetchingMeta) return;

    const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const kind = manualKind ?? detectKindFromUrl(url) ?? detectKindFromMetadata(fetchedMeta?.ogType);
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setTriageStatus("loading");
      fetch("/api/bookmarks/triage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          url: fullUrl,
          title: fetchedMeta?.title ?? null,
          description: fetchedMeta?.description ?? null,
          kind,
        }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data: { tags?: string[]; suggestedCollection?: string; itemType?: ItemType; summary?: string }) => {
          if (!touched.current.tag && data.tags) setTag(primaryTag(data.tags));
          if (!touched.current.coll && data.suggestedCollection) setSelectedColl(data.suggestedCollection);
          if (!touched.current.itemType && (data.itemType === "REFERENCE" || data.itemType === "QUEUED")) {
            setItemType(data.itemType);
          }
          if (!touched.current.summary && data.summary) setSummary(data.summary);
          setTriageStatus("ready");
        })
        .catch((e) => {
          if (e.name === "AbortError") return;
          setTriageStatus("error");
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, fetchedMeta, isFetchingMeta, manualKind]);

  // Duplicate Check
  const duplicateMatch = useMemo(() => {
    if (!url.trim() || bookmarks.length === 0) return null;
    const targetNorm = normalizeUrl(url);
    return bookmarks.find((b) => normalizeUrl(b.url) === targetNorm) || null;
  }, [url, bookmarks]);

  if (!isOpen) return null;

  const availableFolders = flattenCollections(collections);

  // Auto-detected kind
  const autoKind: KindType = detectKindFromUrl(url) ?? detectKindFromMetadata(fetchedMeta?.ogType);
  const effectiveKind: KindType = manualKind ?? autoKind;
  const detectionCopy = DETECTION_COPY[effectiveKind];

  const handleSave = async () => {
    if (!url.trim()) return;
    let domain = "web";
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, "");
    } catch {
      domain = "web";
    }

    // Priority: fetched metadata → a fresh fetch if the debounce hasn't
    // resolved yet
    let meta = fetchedMeta;
    if (!meta) {
      try {
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        const res = await fetch(`/api/meta?url=${encodeURIComponent(fullUrl)}`);
        if (res.ok) {
          const data = await res.json();
          meta = {
            title: data.title ?? null,
            description: data.description ?? null,
            image: data.image ?? null,
            ogType: data.ogType ?? null,
          };
        }
      } catch {
        // Ignore
      }
    }

    const ty: KindType = manualKind ?? detectKindFromUrl(url) ?? detectKindFromMetadata(meta?.ogType);
    const detected = DETECTION_COPY[ty];
    const finalTitle = cleanTitle(meta?.title ?? null, url);

    onSave({
      t: finalTitle,
      ty,
      src: domain,
      url: url.startsWith("http") ? url : `https://${url}`,
      mins: ty === "VID" ? 45 : ty === "PPR" ? 40 : 12,
      tag: tag || (ty === "GIT" ? "craft" : ty === "VID" ? "ai" : "systems"),
      coll: selectedColl || (ty === "PLY" ? "listen" : "unsorted"),
      unread: true,
      itemType,
      itemTypeGuessed: false,
      ex: detected.f,
      note: summary || meta?.description || "",
      coverImage: meta?.image ?? undefined,
    });

    setUrl("");
    setFetchedMeta(null);
    setManualKind(null);
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
              opacity: isFetchingMeta ? 0.5 : fetchedMeta?.title ? 1 : 0.4,
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
            ) : fetchedMeta?.title ? (
              <>
                <span style={{ color: "var(--acc)" }}>✓</span>
                {fetchedMeta?.title}
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
              border: "3px solid var(--ink)",
              background: "#FFE600",
              boxShadow: "3px 3px 0 var(--ink)",
              padding: "10px 12px",
              margin: "10px 0",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <span>⚠️ DUPLICATE DETECTED: Saved on {duplicateMatch.when}</span>
              {onSelectExisting && (
                <button
                  onClick={() => {
                    onSelectExisting(duplicateMatch.id);
                    onClose();
                  }}
                  style={{
                    border: "2px solid var(--ink)",
                    background: "var(--ink)",
                    color: "#FFE600",
                    padding: "8px 10px",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                    minHeight: "36px",
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
          ) : (
            <>
              <div className="drow">
                <dt>TYPE</dt>
                <dd style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <select
                    value={effectiveKind}
                    onChange={(e) => setManualKind(e.target.value as KindType)}
                    style={{
                      border: "2px solid var(--ink)",
                      background: TYPES[effectiveKind].c,
                      color: TYPES[effectiveKind].fg,
                      padding: "3px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      fontWeight: "900",
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: "2px 2px 0 var(--ink)",
                    }}
                  >
                    <option value="ART">ART — Article / Post</option>
                    <option value="VID">VID — Video</option>
                    <option value="PLY">PLY — Playlist / Audio</option>
                    <option value="GIT">GIT — Code Repo</option>
                    <option value="APP">APP — Tool / Application</option>
                    <option value="PPR">PPR — Research Paper</option>
                    <option value="DOC">DOC — Documentation</option>
                  </select>

                  {manualKind ? (
                    <button
                      type="button"
                      onClick={() => setManualKind(null)}
                      style={{
                        border: "1.5px solid var(--ink)",
                        background: "#FFE600",
                        color: "#000",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 6px",
                        cursor: "pointer",
                        fontFamily: "var(--mono)",
                      }}
                      title="Reset to auto-detected type"
                    >
                      RESET AUTO ⟲
                    </button>
                  ) : (
                    <span style={{ fontSize: "10px", fontFamily: "var(--mono)", opacity: 0.6, fontWeight: 700 }}>
                      (AUTO-DETECTED)
                    </span>
                  )}
                </dd>
              </div>
              {Object.entries(detectionCopy.f).map(([k, v]) => (
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
                    onChange={(e) => {
                      touched.current.coll = true;
                      setSelectedColl(e.target.value);
                    }}
                    style={{
                      border: "2px solid var(--ink)",
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
                        {"— ".repeat(f.depth ?? 0)}{f.name}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div className="drow">
                <dt>SHELF</dt>
                <dd style={{ display: "flex", border: "2px solid var(--ink)" }}>
                  {(["REFERENCE", "QUEUED"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        touched.current.itemType = true;
                        setItemType(value);
                      }}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "4px 8px",
                        border: "none",
                        borderRight: value === "REFERENCE" ? "2px solid var(--ink)" : "none",
                        cursor: "pointer",
                        background: itemType === value ? "var(--ink)" : "var(--paper)",
                        color: itemType === value ? "var(--yel)" : "var(--ink)",
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </dd>
              </div>
              <div className="drow">
                <dt>TAG</dt>
                <dd>
                  <input
                    value={tag}
                    onChange={(e) => {
                      touched.current.tag = true;
                      setTag(e.target.value);
                    }}
                    placeholder="rate-limiting"
                    style={{
                      border: "2px solid var(--ink)",
                      background: "#FFE600",
                      padding: "4px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      fontWeight: 700,
                      outline: "none",
                      width: "100%",
                    }}
                  />
                </dd>
              </div>
              <div className="drow">
                <dt>SUMMARY</dt>
                <dd>
                  <input
                    value={summary}
                    onChange={(e) => {
                      touched.current.summary = true;
                      setSummary(e.target.value);
                    }}
                    placeholder={triageStatus === "loading" ? "triaging…" : "one-line summary"}
                    style={{
                      border: "2px solid var(--ink)",
                      background: "#FFE600",
                      padding: "4px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      fontWeight: 700,
                      outline: "none",
                      width: "100%",
                    }}
                  />
                </dd>
              </div>
              <div className="dnote">
                {triageStatus === "loading"
                  ? "Auto-triage is filling tag, shelf, and summary — edit anything that looks wrong."
                  : detectionCopy.n}
              </div>
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
