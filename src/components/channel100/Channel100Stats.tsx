"use client";

import React, { useMemo } from "react";
import {
  Channel100Store,
  ChannelMediaItem,
  CatalogConfig,
  MediaKind,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";
import { getLanguageFlag } from "@/lib/channel100/data";

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
  const tierGroups = useMemo(() => {
    if (items.length > 250) {
      return groupItems(
        items,
        store,
        (s) =>
          s.rank <= 100
            ? "Top 100"
            : s.rank <= 250
            ? "101–250"
            : s.rank <= 400
            ? "251–400"
            : "401–500",
        ["Top 100", "101–250", "251–400", "401–500"]
      );
    }
    if (items.length > 100) {
      return groupItems(
        items,
        store,
        (s) =>
          s.rank <= 50
            ? "Top 50"
            : s.rank <= 100
            ? "51–100"
            : s.rank <= 175
            ? "101–175"
            : "176–250",
        ["Top 50", "51–100", "101–175", "176–250"]
      );
    }
    return groupItems(
      items,
      store,
      (s) =>
        s.rank <= 25
          ? "Top 25"
          : s.rank <= 50
          ? "26–50"
          : s.rank <= 75
          ? "51–75"
          : "76+",
      ["Top 25", "26–50", "51–75", "76+"]
    );
  }, [items, store]);

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
        (s) =>
          s.start < 1980
            ? "Pre-1980s"
            : s.start < 2000
            ? "1980s–90s"
            : s.start < 2010
            ? "2000s"
            : s.start < 2020
            ? "2010s"
            : "2020s",
        ["Pre-1980s", "1980s–90s", "2000s", "2010s", "2020s"]
      ),
    [items, store]
  );

  const genreGroups = useMemo(
    () => groupItems(items, store, (s) => s.genre).slice(0, 8),
    [items, store]
  );

  const langGroups = useMemo(
    () =>
      cat === "film" || cat === "vgf" || cat === "tracker"
        ? groupItems(
            items,
            store,
            (i) => {
              const lang = (i.lang || "English").trim();
              const flag = getLanguageFlag(lang);
              return flag && flag !== "🌐" ? `${flag} ${lang}` : lang;
            }
          ).slice(0, 8)
        : [],
    [items, store, cat]
  );

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
        <div key={g.label} className="ch100-brow">
          <span className="ch100-brow-lab" title={g.label}>
            {g.label}
          </span>
          <span
            className="ch100-btrack"
            role="img"
            aria-label={`${g.seen} of ${g.total} seen`}
          >
            <i className="s" style={{ width: `${pct}%` }} />
          </span>
          <span className="ch100-brow-num">
            {g.seen}/{g.total}
          </span>
        </div>
      );
    });
  }

  if (cat === "tracker" && items.length === 0) {
    return null;
  }

  return (
    <section className="ch100-wrap ch100-stats" id="stats">
      <details className="ch100-stats-details">
        <summary className="ch100-stats-summary">
          <div className="ch100-stats-summary-title">
            <span className="ch100-stats-dot" aria-hidden="true" />
            <span>Analytics &amp; Breakdown</span>
            <small>Rank tier · Era · Genre · Queue</small>
          </div>
          <span className="ch100-stats-toggle-hint">Toggle breakdown ▾</span>
        </summary>

        <div className="ch100-panels" id="panels">
          {cat !== "tracker" && (
            <div className="ch100-panel">
              <h3>By rank tier</h3>
              {renderBarRows(tierGroups)}
            </div>
          )}

          {(cat === "film" || cat === "vgf" || cat === "tracker") && (
            <div className="ch100-panel">
              <h3>By language</h3>
              {renderBarRows(langGroups)}
            </div>
          )}

          <div className="ch100-panel">
            <h3>{cat === "tv" ? "By total time" : "By runtime"}</h3>
            {renderBarRows(lengthGroups)}
          </div>

          <div className="ch100-panel">
            <h3>By era</h3>
            {renderBarRows(decadeGroups)}
          </div>

          <div className="ch100-panel">
            <h3>By genre</h3>
            {renderBarRows(genreGroups)}
          </div>

          <div className="ch100-panel">
            <h3>Your top rated</h3>
            <ul className="ch100-tops">
              {topRated.length > 0 ? (
                topRated.map((s) => {
                  const rec = getMediaRecord(store, s.id);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="ch100-top-btn"
                        onClick={() => onOpenModal(s.id)}
                      >
                        <span>
                          #{s.rank} {s.title}
                        </span>
                        <span className="ch100-top-stars" aria-label={`${rec.r || 0} stars`}>
                          {"★".repeat(rec.r || 0)}
                        </span>
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="ch100-tops-empty">
                  Rate a {catalog.one} to see your favorites here.
                </li>
              )}
            </ul>
          </div>

          <div className="ch100-panel">
            <h3>Next up in queue</h3>
            <ul className="ch100-tops">
              {nextUp.length > 0 ? (
                nextUp.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="ch100-top-btn"
                      onClick={() => onOpenModal(s.id)}
                    >
                      <span>
                        #{s.rank} {s.title}
                      </span>
                      <span>{s.where}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="ch100-tops-empty">
                  Mark {catalog.noun} as Want or Watching.
                </li>
              )}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
};
