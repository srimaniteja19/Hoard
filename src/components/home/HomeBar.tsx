"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { HomeCapture } from "@/components/home/HomeCapture";
import { kindChip } from "@/lib/home/deskModel";
import { filterFindHits, type FindHit } from "@/lib/library/parseQuery";
import type { Bookmark } from "@/types";

const CHIPS = ["bookmark", "til", "todo", "roadmap"] as const;

function toFindHit(bookmark: Bookmark): FindHit {
  return {
    id: bookmark.id,
    title: bookmark.t,
    url: bookmark.url,
    ty: bookmark.ty,
    src: bookmark.src,
    tag: bookmark.tag,
    note: bookmark.note,
    unread: bookmark.unread,
  };
}

export function HomeBar() {
  const router = useRouter();
  const [mode, setMode] = useState<"find" | "stash">("find");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<FindHit[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stashSeed, setStashSeed] = useState("");
  const findRef = useRef<HTMLInputElement>(null);
  const stashRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      event.stopPropagation();
      setMode("find");
      window.setTimeout(() => findRef.current?.focus(), 0);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    if (mode !== "find" || catalog || catalogError) return;
    let cancelled = false;
    fetch("/api/bookmarks", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("catalog"))))
      .then((rows: Bookmark[]) => {
        if (!cancelled) setCatalog(rows.map(toFindHit));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("[HomeBar] catalog failed", error);
          setCatalogError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, catalog, catalogError]);

  const results = useMemo(
    () => (catalog ? filterFindHits(catalog, query) : []),
    [catalog, query],
  );

  function openResult(result: FindHit) {
    window.open(result.url, "_blank");
    fetch(`/api/bookmarks/${result.id}/use`, { method: "POST", credentials: "include" }).catch((error) => {
      console.error("[HomeBar] recordUse failed", error);
    });
  }

  function onFindChange(value: string) {
    if (value.startsWith("/")) {
      setStashSeed(value);
      setMode("stash");
      setQuery("");
      window.setTimeout(() => stashRef.current?.focus(), 0);
      return;
    }
    setQuery(value);
    setSelectedIndex(0);
  }

  function onFindKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[selectedIndex];
      if (selected) openResult(selected);
      return;
    }
    if (event.key === "Escape") {
      if (query) setQuery("");
      else findRef.current?.blur();
    }
  }

  function startStash(command: string) {
    setStashSeed(`/${command} `);
    setMode("stash");
    window.setTimeout(() => stashRef.current?.focus(), 0);
  }

  const showPanel = query.trim().length > 0;
  const searching = showPanel && catalog == null && !catalogError;

  return (
    <section className="home-bar" aria-label="The bar">
      <div className="home-bar-head">
        <div className="home-kicker">THE BAR</div>
        <div className="home-bar-toggle" role="tablist" aria-label="Bar mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "find"}
            data-on={mode === "find"}
            onClick={() => {
              setMode("find");
              window.setTimeout(() => findRef.current?.focus(), 0);
            }}
          >
            FIND
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "stash"}
            data-on={mode === "stash"}
            onClick={() => {
              setMode("stash");
              window.setTimeout(() => stashRef.current?.focus(), 0);
            }}
          >
            STASH
          </button>
        </div>
      </div>

      {mode === "find" ? (
        <div className="home-bar-field">
          <div className="home-capture-shell home-capture-shell-idle">
            <input
              ref={findRef}
              id="home-find"
              type="search"
              value={query}
              placeholder="reach for something.. drizzle · #devops · is:repo"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Find in the library"
              aria-autocomplete="list"
              aria-expanded={showPanel}
              aria-controls="home-find-list"
              onChange={(event) => onFindChange(event.target.value)}
              onKeyDown={onFindKeyDown}
            />
            <span className="home-bar-kbd" aria-hidden="true">
              ⌘K
            </span>
          </div>
          {showPanel ? (
            <div className="home-slash-palette" id="home-find-list" role="listbox" aria-label="Find results">
              {searching ? (
                <div className="home-slash-empty">searching…</div>
              ) : catalogError ? (
                <div className="home-slash-empty">couldn’t reach the library</div>
              ) : results.length === 0 ? (
                <div className="home-slash-empty">no results for “{query.trim()}”</div>
              ) : (
                results.map((result, index) => {
                  const chip = kindChip(result.ty);
                  return (
                    <button
                      key={result.id}
                      type="button"
                      role="option"
                      aria-selected={index === selectedIndex}
                      className={`home-find-row${index === selectedIndex ? " is-on" : ""}`}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => openResult(result)}
                    >
                      <span className="home-find-title">{result.title}</span>
                      <span className="home-find-meta">
                        {result.src} · #{result.tag}
                      </span>
                      <span className={`home-kind-chip home-kind-chip-${chip.tone}`}>{chip.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="home-bar-field">
          <HomeCapture
            key={stashSeed}
            compact
            hideChips
            seed={stashSeed}
            inputRef={stashRef}
          />
          <span className="home-bar-kbd home-bar-kbd-stash" aria-hidden="true">
            ⌘K
          </span>
        </div>
      )}

      <div className="home-bar-chips">
        {CHIPS.map((name) => (
          <button
            key={name}
            type="button"
            className="home-starter-chip"
            title={name === "roadmap" ? "Atlas" : `/${name}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => (name === "roadmap" ? router.push("/atlas") : startStash(name))}
          >
            /{name}
          </button>
        ))}
      </div>
    </section>
  );
}
