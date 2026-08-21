"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/library/searchLibrary";

const DEBOUNCE_MS = 200;

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const openResult = useCallback((result: SearchResult) => {
    window.open(result.url, "_blank");
    fetch(`/api/bookmarks/${result.id}/use`, { method: "POST", credentials: "include" }).catch((e) => {
      console.error("[CommandPalette] recordUse failed", e);
    });
    close();
  }, [close]);

  // Global ⌘K/Ctrl+K to open, Escape to close — matches the input-focus guard
  // style already used in useHomeLead.ts's keydown handler.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) openResult(selected);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, results, selectedIndex, close, openResult]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Debounced search against the shared ranked endpoint (LIBRARY.md §4) —
  // reused by the extension too, no second search implementation.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const q = query.trim();

    debounceRef.current = setTimeout(() => {
      if (!q) {
        setResults([]);
        setSelectedIndex(0);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/library/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data: SearchResult[]) => {
          setResults(data);
          setSelectedIndex(0);
        })
        .catch((e) => {
          if (e.name !== "AbortError") console.error("[CommandPalette] search failed", e);
        });
    }, q ? DEBOUNCE_MS : 0);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="k-overlay" onClick={close}>
      <div className="k-shell" onClick={(e) => e.stopPropagation()}>
        <div className="k-in">
          <span className="c">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library..."
            autoComplete="off"
          />
        </div>
        <div className="k-list" ref={listRef} role="listbox" aria-label="Search results">
          {query.trim() && results.length === 0 ? (
            <div className="k-empty">no results for &ldquo;{query}&rdquo;</div>
          ) : (
            results.map((r, i) => {
              return (
                <div
                  key={r.id}
                  className={`k-row ${i === selectedIndex ? "sel" : ""}`}
                  role="option"
                  aria-selected={i === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => openResult(r)}
                >
                  <span className="k-badge">{r.ty}</span>
                  <div>
                    <div className="k-t">{r.title}</div>
                    <div className="k-m">{r.src} · #{r.tag}</div>
                  </div>
                  <span className="k-uses">{r.useCount}×</span>
                </div>
              );
            })
          )}
        </div>
        <div className="k-foot">
          <span>↑↓ NAVIGATE</span>
          <span>↵ OPEN</span>
          <a href="/library/ask" onClick={close} style={{ color: "inherit", marginLeft: "auto" }}>
            ASK YOUR LIBRARY →
          </a>
        </div>
      </div>
    </div>
  );
}
