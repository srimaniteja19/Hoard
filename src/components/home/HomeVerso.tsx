"use client";

import { useCallback, useEffect, useState } from "react";
import type { Rating } from "@/lib/til/confidence";
import type { RecallCard, ResurfaceItem } from "@/lib/home/types";

const RATES: { rating: Rating; label: string; key: string }[] = [
  { rating: "FORGOT", label: "FORGOT [1]", key: "1" },
  { rating: "FUZZY", label: "FUZZY [2]", key: "2" },
  { rating: "GOT_IT", label: "GOT IT [3]", key: "3" },
];

function openResurface(item: ResurfaceItem) {
  window.open(item.url, "_blank");
  fetch(`/api/bookmarks/${item.id}/use`, { method: "POST", credentials: "include" }).catch((e) => {
    console.error("[HomeVerso] recordUse failed", e);
  });
}

export function HomeVerso({
  recall,
  resurface,
}: {
  recall: RecallCard;
  resurface: ResurfaceItem[];
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

  if (!recall && resurface.length === 0) return null;

  return (
    <div className="home-foot">
      {recall ? (
        <section className="home-verso" aria-label="Recall">
          <div className="home-kicker">THE VERSO</div>
          {rated ? (
            <p className="home-verso-text">Rated. That is the edition.</p>
          ) : (
            <>
              <p className="home-verso-text">{recall.text}</p>
              <p className="home-verso-meta">
                {recall.ageDays}d ago · confidence {recall.confidence}
              </p>
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
      ) : null}

      {resurface.length > 0 ? (
        <section className="home-stacks" aria-label="From the stacks">
          <div className="home-kicker">FROM THE STACKS</div>
          <ul className="home-stacks-list">
            {resurface.map((item) => (
              <li key={item.id}>
                <button type="button" className="home-stacks-item" onClick={() => openResurface(item)}>
                  <span className="home-stacks-title">{item.title}</span>
                  <span className="home-stacks-meta">
                    {item.useCount}× · {item.idleDays}d idle
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
