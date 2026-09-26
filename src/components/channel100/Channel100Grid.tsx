"use client";

import React from "react";
import {
  Channel100Store,
  ChannelMediaItem,
  ShowStatus,
  ViewLayout,
} from "@/lib/channel100/types";
import { getMediaRecord } from "@/lib/channel100/storage";
import { Channel100Card } from "./Channel100Card";

interface Channel100GridProps {
  items: ChannelMediaItem[];
  store: Channel100Store;
  layout: ViewLayout;
  onOpenModal: (id: string) => void;
  onToggleStatus: (id: string, status: ShowStatus) => void;
  onIncrementEpisode?: (id: string) => void;
}

export const Channel100Grid: React.FC<Channel100GridProps> = ({
  items,
  store,
  layout,
  onOpenModal,
  onToggleStatus,
  onIncrementEpisode,
}) => {
  return (
    <section className="ch100-wrap wrap ch100-shows shows">
      {items.length === 0 ? (
        <div className="ch100-empty empty">
          Nothing matches those filters. Try clearing your search or picking &ldquo;All&rdquo;.
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

