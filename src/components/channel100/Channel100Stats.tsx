"use client";

import React, { useMemo } from "react";
import {
  Channel100Store,
  ChannelMediaItem,
  CatalogConfig,
  MediaKind,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";

interface Channel100StatsProps {
  items: ChannelMediaItem[];
  store: Channel100Store;
  cat: MediaKind;
  catalog: CatalogConfig;
  onOpenModal: (id: string) => void;
}

interface GroupSummary {
  label: string;
  total: number;
  seen: number;
}

function groupItems(
  items: ChannelMediaItem[],
  store: Channel100Store,
  getKey: (i: ChannelMediaItem) => string,
  order?: string[]
): GroupSummary[] {
  const map = new Map<string, GroupSummary>();
  items.forEach((item) => {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, { label: key, total: 0, seen: 0 });
    }
    const g = map.get(key)!;
    g.total++;
    if (getMediaRecord(store, item.id).s === "seen") {
      g.seen++;
    }
  });

  const arr = Array.from(map.values());
  if (order) {
    arr.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  } else {
    arr.sort((a, b) => b.total - a.total);
  }
  return arr;
}

export const Channel100Stats: React.FC<Channel100StatsProps> = ({
  items,
  store,
  cat,
  catalog,
  onOpenModal,
}) => {
  const tierGroups = useMemo(
    () =>
      groupItems(
        items,
        store,
        (s) =>
          s.rank <= 25
            ? "Top 25"
            : s.rank <= 50
            ? "26–50"
            : s.rank <= 75
            ? "51–75"
            : "76–100",
        ["Top 25", "26–50", "51–75", "76–100"]
      ),
    [items, store]
  );

  const lengthGroups = useMemo(() => {
    const bandMap = Object.fromEntries(catalog.bands);
    const order = catalog.bands.map((b) => b[1]);
    return groupItems(
      items,
      store,
      (item) => bandMap[catalog.band(item)] || catalog.bands[0][1],
      order
    );
  }, [items, store, catalog]);

  const decadeGroups = useMemo(
    () =>
      groupItems(
        items,
        store,
        (s) => (s.start < 2010 ? "2000s" : s.start < 2020 ? "2010s" : "2020s"),
        ["2000s", "2010s", "2020s"]
      ),
    [items, store]
  );

  const genreGroups = useMemo(
    () => groupItems(items, store, (s) => s.genre),
    [items, store]
  );

  const langGroups = useMemo(
    () =>
      cat === "film" || cat === "tracker"
        ? groupItems(
            items,
            store,
            (i) => (i.lang ? `${i.langFlag || "🌐"} ${i.lang}` : "English")
          ).slice(0, 10)
        : [],
    [items, store, cat]
  );

  const streamerGroups = useMemo(
    () => groupItems(items, store, (s) => s.where),
    [items, store]
  );

  // Top rated items by user
  const topRated = useMemo(() => {
    return items
      .filter((s) => (getMediaRecord(store, s.id).r || 0) > 0)
      .sort((a, b) => {
        const rA = getMediaRecord(store, a.id).r || 0;
        const rB = getMediaRecord(store, b.id).r || 0;
        return rB - rA || a.rank - b.rank;
      })
      .slice(0, 7);
  }, [items, store]);

  // Next up queue (highest NYT ranked on user's want or watching list)
  const nextUp = useMemo(() => {
    return items
      .filter((s) => {
        const status = getMediaRecord(store, s.id).s;
        return status === "want" || status === "watching";
      })
      .slice(0, 7);
  }, [items, store]);

  function renderBarRows(groups: GroupSummary[]) {
    return groups.map((g) => {
      const pct = g.total ? Math.round((g.seen / g.total) * 100) : 0;
      return (
        <div key={g.label} className="ch100-brow brow">
          <span className="lab" title={g.label}>
            {g.label}
          </span>
          <span
            className="ch100-btrack btrack"
            role="img"
            aria-label={`${g.seen} of ${g.total} seen`}
          >
            <i className="s" style={{ width: `${pct}%` }} />
          </span>
          <span className="num">
            {g.seen}/{g.total}
          </span>
        </div>
      );
    });
  }

  return (
    <section className="ch100-wrap wrap ch100-stats stats" id="stats">
      <h2 className="ch100-h2 h2" id="statsTitle">
        By the numbers
      </h2>
      <p className="ch100-subhead sub" id="statsSub">
        {cat === "tv"
          ? "Your progress through the TV list, broken down by rank, time to finish, premiere decade, genre and streaming home."
          : cat === "film"
          ? "Your progress through the movie list, broken down by rank, runtime, decade, genre, language and streaming home."
          : "Your personal watch diary metrics, broken down by language, media type, streamers, and your top star ratings."}
      </p>

      <div className="ch100-panels panels" id="panels">
        {/* Tier panel (TV/Film) */}
        {cat !== "tracker" && (
          <div className="ch100-panel panel">
            <h3>By rank tier</h3>
            {renderBarRows(tierGroups)}
          </div>
        )}

        {/* Language panel (Film & Tracker) */}
        {(cat === "film" || cat === "tracker") && (
          <div className="ch100-panel panel">
            <h3>By language</h3>
            {renderBarRows(langGroups)}
          </div>
        )}

        {/* Time to finish / Runtime panel */}
        <div className="ch100-panel panel">
          <h3>{cat === "tv" ? "By time to finish" : "By runtime"}</h3>
          {renderBarRows(lengthGroups)}
        </div>

        {/* Premiere decade panel */}
        <div className="ch100-panel panel">
          <h3>{cat === "tv" ? "By premiere decade" : "By decade"}</h3>
          {renderBarRows(decadeGroups)}
        </div>

        {/* Genre panel */}
        <div className="ch100-panel panel">
          <h3>By genre</h3>
          {renderBarRows(genreGroups)}
        </div>


        {/* Streaming home panel */}
        <div className="ch100-panel panel">
          <h3>By streaming home</h3>
          {renderBarRows(streamerGroups.slice(0, 8))}
        </div>

        {/* Top rated panel */}
        <div className="ch100-panel panel">
          <h3>Your top rated</h3>
          <ul className="ch100-tops tops">
            {topRated.length > 0 ? (
              topRated.map((s) => {
                const rec = getMediaRecord(store, s.id);
                return (
                  <li
                    key={s.id}
                    onClick={() => onOpenModal(s.id)}
                    style={{ cursor: "pointer" }}
                    title="Click to view details"
                  >
                    <span>
                      {s.rank}. {s.title}
                    </span>
                    <span style={{ color: "var(--ch-yellow)" }}>
                      {"★".repeat(rec.r || 0)}
                    </span>
                  </li>
                );
              })
            ) : (
              <li>
                <span>
                  Rate a {catalog.one} you&apos;ve seen and it shows up here.
                </span>
                <span />
              </li>
            )}
          </ul>
        </div>

        {/* Next up queue panel */}
        <div className="ch100-panel panel">
          <h3>Next up (highest ranked in queue)</h3>
          <ul className="ch100-tops tops">
            {nextUp.length > 0 ? (
              nextUp.map((s) => (
                <li
                  key={s.id}
                  onClick={() => onOpenModal(s.id)}
                  style={{ cursor: "pointer" }}
                  title="Click to view details"
                >
                  <span>
                    #{s.rank}. {s.title}
                  </span>
                  <span>{s.where}</span>
                </li>
              ))
            ) : (
              <li>
                <span>
                  Mark {catalog.noun} as Want or Watching to build your queue.
                </span>
                <span />
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};
