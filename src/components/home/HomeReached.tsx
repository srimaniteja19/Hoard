"use client";

import { REACH_TICKS, kindChip, type DeskReachedItem } from "@/lib/home/deskModel";

function openReached(item: DeskReachedItem) {
  window.open(item.url, "_blank");
  fetch(`/api/bookmarks/${item.id}/use`, { method: "POST", credentials: "include" }).catch((error) => {
    console.error("[HomeReached] recordUse failed", error);
  });
}

export function HomeReached({ items }: { items: DeskReachedItem[] }) {
  return (
    <section className="home-reached" aria-label="Most reached for">
      <h2 className="home-display">MOST REACHED FOR</h2>
      {items.length === 0 ? (
        <p className="home-empty-line">Reach for something and it will show wear.</p>
      ) : (
        <ul className="home-reached-list">
          {items.map((item) => {
            const chip = kindChip(item.kind);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="home-reached-row"
                  style={{ ["--wear" as string]: String(item.wear) }}
                  onClick={() => openReached(item)}
                >
                  <span className="home-reached-ear" aria-hidden="true" />
                  <span className="home-reached-count">×{item.reachCount}</span>
                  <span className="home-reached-ticks" aria-hidden="true">
                    {Array.from({ length: REACH_TICKS }, (_, index) => (
                      <i key={index} data-on={index < item.ticksFilled} />
                    ))}
                  </span>
                  <span className="home-reached-copy">
                    <span className="home-reached-title">{item.title}</span>
                    <span className="home-reached-meta">{item.collection}</span>
                  </span>
                  <span className={`home-kind-chip home-kind-chip-${chip.tone}`}>{chip.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
