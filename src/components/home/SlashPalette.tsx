"use client";

import { useEffect, useRef } from "react";
import type { PaletteEntry } from "@/lib/home/slashCommands";

export function SlashPalette({
  matches,
  selectedIndex,
  mode,
  query,
  onSelect,
}: {
  matches: PaletteEntry[];
  selectedIndex: number;
  mode: "command" | "type";
  query: string;
  onSelect: (entry: PaletteEntry) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      ref={listRef}
      id="home-slash-list"
      className="home-slash-palette"
      role="listbox"
      aria-label={mode === "type" ? "TIL types" : "Capture commands"}
    >
      <div className="home-slash-kicker">{mode === "type" ? "RECORD TYPE" : "COMMANDS"}</div>
      {matches.length === 0 ? (
        <div className="home-slash-empty">no match for /{query}</div>
      ) : (
        matches.map((entry, index) => {
          const selected = index === selectedIndex;
          const aliasLine = entry.aliases.length
            ? entry.aliases.map((alias) => `/${alias}`).join("  ")
            : entry.example;
          return (
            <button
              key={`${entry.group}-${entry.name}`}
              type="button"
              role="option"
              id={`home-slash-${index}`}
              aria-selected={selected}
              className="home-slash-row"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(entry)}
            >
              <span className="home-slash-row-main">
                <span className="home-slash-name">/{entry.name}</span>
                <span className={`home-slash-dest home-slash-dest-${entry.destination}`}>
                  {entry.destLabel}
                </span>
              </span>
              <span className="home-slash-hint">{entry.hint}</span>
              <span className="home-slash-aliases">{aliasLine}</span>
            </button>
          );
        })
      )}
      <div className="home-slash-footer">
        {mode === "type"
          ? "skip and just write · tab to pick a type"
          : "also /fact /gotcha /quote /snippet · tab to complete"}
      </div>
    </div>
  );
}
