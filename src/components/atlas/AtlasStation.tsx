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

  return (
    <article className={`atlas-slip${done ? " is-done" : ""}${station.required ? "" : " is-optional"}`}>
      <span className={`atlas-slip-spine is-${station.energy.toLowerCase()}`} />
      {done ? (
        <span className="atlas-filed-stamp">
          FILED
          {filedOn ? <em>{filedOn}</em> : null}
        </span>
      ) : null}
      <div className="atlas-slip-sheet">
        <div className="atlas-slip-top">
          <input
            type="checkbox"
            className="atlas-slip-check"
            checked={done}
            disabled={false}
            aria-label={station.title}
            onChange={() => onToggle()}
          />
          <div className="atlas-slip-copy">
            <button type="button" className="atlas-slip-title" onClick={startEdit}>
              {station.title}
            </button>
            <p className="atlas-slip-why">{station.why}</p>
            <p className="atlas-slip-run">
              {station.estimatedMinutes}m · {station.energy} · {station.kind}
            </p>
            {(station.resources ?? []).length > 0 ? (
              <ul className="atlas-slip-resources">
                {(station.resources ?? []).map((resource) => (
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
        </div>
      </div>
    </article>
  );
}
