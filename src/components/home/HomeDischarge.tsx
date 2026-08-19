"use client";

import { useEffect, useRef, useState } from "react";
import { tilTypeValues, type TilType } from "@/db/schema";

export function HomeDischarge({
  title,
  onCancel,
  onSubmit,
}: {
  title: string;
  onCancel: () => void;
  onSubmit: (type: TilType, body: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<TilType>("FACT");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function commit() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(type, body.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discharge failed");
      setBusy(false);
    }
  }

  return (
    <form
      className="home-discharge"
      onSubmit={(event) => {
        event.preventDefault();
        void commit();
      }}
    >
      <div className="home-kicker">DISCHARGE · {title}</div>
      <div className="home-discharge-types">
        {tilTypeValues.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => setType(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={body}
        disabled={busy}
        placeholder="what did you learn?"
        aria-label="What you learned from this bookmark"
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <div className="home-lead-actions">
        <button type="submit" className="home-btn" disabled={busy || !body.trim()}>
          FILE TO THE RECORD
        </button>
        <button type="button" className="home-btn-ghost" onClick={onCancel}>
          CANCEL
        </button>
      </div>
      {error ? <p className="home-discharge-error">{error}</p> : null}
    </form>
  );
}
