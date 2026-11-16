"use client";

import React from "react";
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
  const isEmptyTracker = cat === "tracker" && totalCatalogCount === 0;

  return (
    <section className="ch100-wrap wrap ch100-shows shows">
      {isEmptyTracker ? (
        <div className="ch100-empty empty ch100-empty-onboard">
          <h3>Your personal watch diary is ready</h3>
          <p>
            Log any series, movie, anime, mini-series, or documentary in any language—or run the Decision Matrix to pick tonight&apos;s watch.
          </p>
          <div className="ch100-empty-actions">
            {onOpenLogModal && (
              <button
                type="button"
                className="ch100-btn btn y"
                onClick={onOpenLogModal}
              >
                ⚡ + Log Your First Title
              </button>
            )}
            {onOpenTriageModal && (
              <button
                type="button"
                className="ch100-btn btn"
                onClick={onOpenTriageModal}
              >
                🎯 Run Decision Matrix
              </button>
            )}
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="ch100-empty empty">
          <p>
            Nothing matches those filters. Try clearing your search or resetting your active filters.
          </p>
          {onClearFilters && (
            <button
              type="button"
              className="ch100-btn btn y"
              style={{ marginTop: "12px" }}
              onClick={onClearFilters}
            >
              ✕ Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className={`ch100-cards cards ${layout === "list" ? "list" : ""}`}>
          {items.map((item) => {
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
    </section>
  );
};

