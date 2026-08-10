"use client";

import React from "react";
import { Bookmark } from "@/types";

interface HeadlinesViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
}

export const HeadlinesView: React.FC<HeadlinesViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
}) => {
  const formatMins = (m: number) => {
    return m < 60 ? `${m} MIN` : `${Math.floor(m / 60)}H${m % 60 ? ` ${m % 60}M` : ""}`;
  };

  return (
    <div className="heads">
      {items.map((x) => {
        const isSel = selectedIds.has(x.id);

        return (
          <div
            key={x.id}
            className={`hrow ${isSel ? "sel" : ""}`}
            onClick={(evt) => {
              if (evt.metaKey || evt.ctrlKey) {
                onToggleSelect(x.id, evt);
              } else {
                onOpen(x.id);
              }
            }}
          >
            <span className="hb" data-kind={x.ty}>
              {x.ty}
            </span>
            <span className="ht">{x.t}</span>
            <span className="hm">{x.src}</span>
            <span className="hm" style={{ textAlign: "right" }}>
              {formatMins(x.mins)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
