"use client";

import React, { useState, useEffect } from "react";
import { Bookmark, Collection, DetectionResult, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";

interface CaptureModalProps {
  isOpen: boolean;
  collections: Collection[];
  initialUrl?: string;
  onClose: () => void;
  onSave: (bm: Omit<Bookmark, "id" | "when">) => void;
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

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  collections,
  initialUrl = "",
  onClose,
  onSave,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [selectedColl, setSelectedColl] = useState("unsorted");

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

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

  const handleSave = () => {
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

    const titleFallback =
      url
        .split("/")
        .pop()
        ?.replace(/[-_]/g, " ") || "New Bookmark";

    onSave({
      t: titleFallback.charAt(0).toUpperCase() + titleFallback.slice(1),
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
              Paste anything. What kind of thing it is decides which fields get captured — a repo needs stars and a language, a video needs a runtime, an app needs a platform. One shape for all of them loses all of that.
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
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
};
