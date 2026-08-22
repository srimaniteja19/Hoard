"use client";

import { useState } from "react";
import type { AtlasStation as AtlasStationRecord } from "@/lib/atlas/types";

export function AtlasStation({
  station,
  onToggle,
  onSaveNote,
}: {
  station: AtlasStationRecord;
  onToggle: () => void;
  onSaveNote: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(station.note ?? "");
  const done = station.state === "DONE";
  const filedOn = station.doneAt
    ? (() => {
        const date = new Date(station.doneAt);
        if (Number.isNaN(date.getTime())) return "";
        const day = date.getDate();
        const mon = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
        const year = String(date.getFullYear()).slice(-2);
        return `${day} ${mon} ${year}`;
      })()
    : "";

  const startEdit = () => {
    setDraft(station.note ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setDraft(station.note ?? "");
    setEditing(false);
  };

  const save = () => {
    onSaveNote(draft);
    setEditing(false);
  };

  const holdings = station.resources ?? [];

  return (
    <article
      className={[
        "atlas-slip",
        `is-${station.energy.toLowerCase()}`,
        `is-${station.kind}`,
        done ? "is-done" : "",
        station.required ? "" : "is-optional",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="atlas-slip-stub" aria-hidden>
        <span className="atlas-slip-id">{station.id.toUpperCase()}</span>
        <span className="atlas-slip-energy">{station.energy}</span>
      </div>
      <div className="atlas-slip-sheet">
        {done ? (
          <span className="atlas-filed-stamp">
            FILED
            {filedOn ? <em>{filedOn}</em> : null}
          </span>
        ) : null}
        <header className="atlas-slip-rail">
          <label className="atlas-slip-punch">
            <input
              type="checkbox"
              className="atlas-slip-check"
              checked={done}
              aria-label={station.title}
              onChange={() => onToggle()}
            />
            <span className="atlas-slip-box" />
          </label>
          <span className="atlas-slip-kind">{station.kind}</span>
          {!station.required ? <span className="atlas-slip-overflow">OVERFLOW</span> : null}
          <span className="atlas-slip-mins">
            {station.estimatedMinutes}
            <small>MIN</small>
          </span>
        </header>
        <button type="button" className="atlas-slip-title" onClick={startEdit}>
          {station.title}
        </button>
        <p className="atlas-slip-why">{station.why}</p>
        {holdings.length > 0 ? (
          <div className="atlas-slip-holdings">
            <span className="atlas-slip-holdings-kicker">Holdings</span>
            <ul className="atlas-slip-resources">
              {holdings.map((resource) => (
                <li key={resource.href}>
                  <a
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`atlas-cite is-${resource.kind}`}
                  >
                    <span className="atlas-cite-kind">{resource.kind === "video" ? "YT" : "ART"}</span>
                    <span className="atlas-cite-title">{resource.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {editing ? (
          <input
            type="text"
            className="atlas-slip-note"
            value={draft}
            autoFocus
            placeholder="One-line note"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
          />
        ) : station.note ? (
          <p className="atlas-slip-note-text">{station.note}</p>
        ) : null}
      </div>
    </article>
  );
}
