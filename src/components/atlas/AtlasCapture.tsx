"use client";

import { useMemo, useState } from "react";
import { parseAtlas } from "@/lib/atlas/parse";
import type { AtlasCadence, AtlasDepth, AtlasRecord } from "@/lib/atlas/types";
import type { AtlasChips } from "@/hooks/useAtlas";

const DEPTHS: AtlasDepth[] = ["tourist", "working", "dangerous"];
const CADENCES: AtlasCadence[] = ["weeknights", "weekends", "daily"];

export function AtlasCapture({
  onCreate,
}: {
  onCreate: (prompt: string, chips?: AtlasChips) => Promise<AtlasRecord | null>;
}) {
  const [input, setInput] = useState("");
  const [depth, setDepth] = useState<AtlasDepth | null>(null);
  const [cadence, setCadence] = useState<AtlasCadence | null>(null);
  const [antiScope, setAntiScope] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const chips: AtlasChips = {
    ...(depth ? { depth } : {}),
    ...(cadence ? { cadence } : {}),
    ...(antiScope.trim() ? { antiScope } : {}),
  };

  const preview = useMemo(() => {
    if (!input.trim()) return null;
    return parseAtlas(input, {
      ...(depth ? { depth } : {}),
      ...(cadence ? { cadence } : {}),
      ...(antiScope.trim() ? { antiScope } : {}),
    });
  }, [antiScope, cadence, depth, input]);

  const commit = async () => {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setInput("");
    const created = await onCreate(text, Object.keys(chips).length ? chips : undefined);
    if (!created) setInput(text);
    else {
      setDepth(null);
      setCadence(null);
      setAntiScope("");
    }
    setSubmitting(false);
  };

  return (
    <div className="atlas-capture-wrap">
      <form
        className="atlas-capture"
        onSubmit={(event) => {
          event.preventDefault();
          void commit();
        }}
      >
        <button type="submit" className="atlas-capture-new" disabled={submitting}>
          NEW
        </button>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="systems from JS ~4w 45m weeknights, no leetcode"
          disabled={submitting}
        />
      </form>
      <div className="atlas-chips">
        {DEPTHS.map((value) => (
          <button
            key={value}
            type="button"
            className={`atlas-chip${depth === value ? " is-on" : ""}`}
            onClick={() => setDepth((cur) => (cur === value ? null : value))}
          >
            {value}
          </button>
        ))}
        {CADENCES.map((value) => (
          <button
            key={value}
            type="button"
            className={`atlas-chip${cadence === value ? " is-on" : ""}`}
            onClick={() => setCadence((cur) => (cur === value ? null : value))}
          >
            {value}
          </button>
        ))}
        <input
          type="text"
          className="atlas-antiscope"
          value={antiScope}
          onChange={(event) => setAntiScope(event.target.value)}
          placeholder="anti-scope"
          disabled={submitting}
        />
      </div>
      {preview ? (
        <p className="atlas-preview">
          {preview.weeksPlanned}w · {preview.minutesPerSession}m · {preview.cadence} · {preview.depth}
          {preview.antiScope.length ? ` · no ${preview.antiScope.join(", ")}` : ""}
        </p>
      ) : null}
    </div>
  );
}
