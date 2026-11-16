"use client";

import React, { useState, useEffect } from "react";
import {
  Channel100Store,
  ChannelMediaItem,
  MediaKind,
  ShowStatus,
  ViewLayout,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";
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
