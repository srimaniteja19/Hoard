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
  return (
    <div className="heads">
      {items.map((x) => {
        const isSel = selectedIds.has(x.id);
        const neverOpened = x.itemType === "REFERENCE" && (x.useCount ?? 0) === 0;

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
            style={neverOpened ? { borderLeft: "3px solid var(--orange)" } : undefined}
          >
            <span className="hb" data-kind={x.ty}>
              {x.ty}
            </span>
            <span className="ht">{x.t}</span>
            {x.isQuote && <span className="quote-badge">QUOTE</span>}
            <span className="hm hsrc">{x.src}</span>
            <span className="hm huses" style={{ textAlign: "right" }}>
              {x.useCount ?? 0}×
            </span>
            <span className="hm hdur" style={{ textAlign: "right" }}>
              {x.ty === "ART" && x.mins > 0 ? `${x.mins}m` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
};
