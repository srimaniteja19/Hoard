"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Channel100Store,
  ChannelMediaItem,
  MediaKind,
  ShowStatus,
  ViewLayout,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";
import { formatIsoDate } from "@/lib/channel100/releases";
import { Channel100Card } from "./Channel100Card";

interface Channel100GridProps {
  items: ChannelMediaItem[];
  store: Channel100Store;
  layout: ViewLayout;
  cat?: MediaKind;
  totalCatalogCount?: number;
  onOpenModal: (id: string) => void;
  onToggleStatus: (id: string, status: ShowStatus) => void;
  onIncrementEpisode?: (id: string) => void;
  onClearFilters?: () => void;
  onOpenLogModal?: () => void;
  onOpenTriageModal?: () => void;
}

const PAGE_SIZE = 60;

export const Channel100Grid: React.FC<Channel100GridProps> = ({
  items,
  store,
  layout,
  cat = "tv",
  totalCatalogCount = items.length,
  onOpenModal,
  onToggleStatus,
  onIncrementEpisode,
  onClearFilters,
  onOpenLogModal,
  onOpenTriageModal,
}) => {
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [cat, items.length, layout]);

  const isEmptyTracker = cat === "tracker" && totalCatalogCount === 0;
  const visibleItems = items.slice(0, visibleCount);
  const remaining = Math.max(0, items.length - visibleCount);

  const releaseGroups = useMemo(() => {
    if (cat !== "releases") return null;

    const now = new Date();
    const todayStr = formatIsoDate(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = formatIsoDate(tomorrow);

    const groupsMap = new Map<
      string,
      { key: string; label: string; badge: string; items: ChannelMediaItem[] }
    >();

    for (const item of visibleItems) {
      const dateStr = item.releaseDate || "";
      let key = dateStr || "upcoming";
      let label = "Upcoming";
      let badge = "📅";

      if (dateStr === todayStr) {
        const formatted = now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        label = `Today — ${formatted}`;
        badge = "🟢";
      } else if (dateStr === tomorrowStr) {
        const formatted = tomorrow.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        label = `Tomorrow — ${formatted}`;
        badge = "🟡";
      } else if (dateStr) {
        const d = new Date(`${dateStr}T12:00:00`);
        if (!Number.isNaN(d.getTime())) {
          if (item.releasePeriod === "week") {
            label = d.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            });
            badge = "📅";
          } else if (item.releasePeriod === "month") {
            key = `month_${dateStr.slice(0, 7)}`;
            label = `This Month — ${d.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}`;
            badge = "🗓️";
          } else {
            key = `year_${dateStr.slice(0, 4)}`;
            label = `${d.getFullYear()} Releases`;
            badge = "📆";
          }
        }
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { key, label, badge, items: [] });
      }
      groupsMap.get(key)!.items.push(item);
    }

    return Array.from(groupsMap.values());
  }, [cat, visibleItems]);

  return (
    <section className="ch100-wrap wrap ch100-shows shows">
      {isEmptyTracker ? (
        <div className="ch100-empty empty ch100-empty-onboard">
          <h3>Your personal watch log is empty</h3>
          <p>
            Log any series, film, anime, mini-series, or documentary in any language—or run the Decision Matrix to pick tonight&apos;s watch.
          </p>
          <div className="ch100-empty-actions">
            {onOpenLogModal && (
              <button
                type="button"
                className="ch100-btn-primary"
                onClick={onOpenLogModal}
              >
                + Log First Title
              </button>
            )}
            {onOpenTriageModal && (
              <button
                type="button"
                className="ch100-nav-btn"
                onClick={onOpenTriageModal}
              >
                Decision Matrix
              </button>
            )}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="ch100-empty empty">
          <p>
            No titles match your active filters.
          </p>
          {onClearFilters && (
            <button
              type="button"
              className="ch100-nav-btn"
              style={{ marginTop: "10px" }}
              onClick={onClearFilters}
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <>
          {releaseGroups ? (
            <div className="ch100-release-groups">
              {releaseGroups.map((grp) => (
                <div key={grp.key} className="ch100-release-group">
                  <div className="ch100-release-group-head">
                    <h3>
                      <span aria-hidden="true">{grp.badge}</span> {grp.label}
                    </h3>
                    <span className="ch100-release-group-count">
                      {grp.items.length}{" "}
                      {grp.items.length === 1 ? "release" : "releases"}
                    </span>
                  </div>
                  <div
                    className={`ch100-cards cards ${
                      layout === "list" ? "list" : ""
                    }`}
                  >
                    {grp.items.map((item) => {
                      const record = getMediaRecord(store, item.id);
                      return (
                        <Channel100Card
                          key={item.id}
                          item={item}
                          record={record}
                          onOpenModal={onOpenModal}
                          onToggleStatus={onToggleStatus}
                          onIncrementEpisode={onIncrementEpisode}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`ch100-cards cards ${layout === "list" ? "list" : ""}`}
            >
              {visibleItems.map((item) => {
                const record = getMediaRecord(store, item.id);
                return (
                  <Channel100Card
                    key={item.id}
                    item={item}
                    record={record}
                    onOpenModal={onOpenModal}
                    onToggleStatus={onToggleStatus}
                    onIncrementEpisode={onIncrementEpisode}
                  />
                );
              })}
            </div>
          )}

          {remaining > 0 && (
            <div className="ch100-load-more">
              <button
                type="button"
                className="ch100-nav-btn"
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(items.length, prev + PAGE_SIZE)
                  )
                }
              >
                Show next {Math.min(PAGE_SIZE, remaining)} ({visibleItems.length}{" "}
                of {items.length} shown)
              </button>
              {remaining > PAGE_SIZE && (
                <button
                  type="button"
                  className="ch100-util-btn"
                  onClick={() => setVisibleCount(items.length)}
                >
                  Show all {items.length}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};
