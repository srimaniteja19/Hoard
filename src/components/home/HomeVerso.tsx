"use client";

import { useCallback, useEffect, useState } from "react";
import type { Rating } from "@/lib/til/confidence";

const RATES: { rating: Rating; label: string; key: string }[] = [
  { rating: "FORGOT", label: "FORGOT 1", key: "1" },
  { rating: "FUZZY", label: "FUZZY 2", key: "2" },
  { rating: "GOT_IT", label: "GOT IT 3", key: "3" },
];

const DOTS = 5;

export function HomeVerso({
  recall,
}: {
  recall: { id: string; hash: string; text: string; confidence: number } | null;
}) {
  const [rated, setRated] = useState(false);
  const [busy, setBusy] = useState(false);

  const rate = useCallback(
    async (rating: Rating) => {
      if (!recall || busy || rated) return;
      setBusy(true);
      try {
        const res = await fetch("/api/til/recall", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: recall.id, rating }),
        });
        if (res.ok) setRated(true);
      } finally {
        setBusy(false);
      }
    },
    [busy, rated, recall],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const match = RATES.find((entry) => event.key === entry.key);
      if (!match) return;
      event.preventDefault();
      void rate(match.rating);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rate]);

  if (!recall) {
    return (
      <section className="home-verso" aria-label="The verso">
        <div className="home-verso-kicker">THE VERSO — RECALL</div>
        <p className="home-verso-text">Nothing due to recall.</p>
      </section>
    );
  }

  const filled = Math.max(0, Math.min(DOTS, Math.round(recall.confidence / 20)));

  return (
    <section className="home-verso" aria-label="The verso">
      <div className="home-verso-kicker">THE VERSO — RECALL</div>
      {rated ? (
        <p className="home-verso-text">Rated. That is the edition.</p>
      ) : (
        <>
          <p className="home-verso-text">{recall.text}</p>
          <div className="home-verso-conf">
            <span>CONFIDENCE</span>
            <span className="home-verso-dots" aria-label={`Confidence ${recall.confidence}`}>
              {Array.from({ length: DOTS }, (_, index) => (
                <i key={index} data-on={index < filled} />
              ))}
            </span>
          </div>
          <div className="home-verso-rate">
            {RATES.map((entry) => (
              <button
                key={entry.rating}
                type="button"
                data-rate={entry.rating}
                disabled={busy}
                onClick={() => void rate(entry.rating)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
