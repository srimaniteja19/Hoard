"use client";

import React from "react";
import { Bookmark } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import { formatRelativeTime } from "@/lib/library/formatRelativeTime";

interface ListViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  currentTimeLimit: number;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  items,
  selectedIds,
  currentTimeLimit,
  onToggleSelect,
  onOpen,
}) => {
  const formatMins = (m: number) => {
    return m < 60 ? `${m} MIN` : `${Math.floor(m / 60)}H${m % 60 ? ` ${m % 60}M` : ""}`;
  };

  const getMetaBits = (x: Bookmark) => {
    const bits: string[] = [x.src];
    Object.entries(x.ex)
      .filter(([k, v]) => k !== "coverData" && typeof v === "string")
      .slice(0, 2)
      .forEach(([k, v]) => {
        bits.push(x.ty === "GIT" && k === "Stars" ? `${v}★` : v);
      });
    return bits;
  };

  return (
    <div className="list">
      {items.map((x) => {
        const typeMeta = TYPES[x.ty];
        const isSel = selectedIds.has(x.id);
        const fits = currentTimeLimit < 180 && x.mins <= currentTimeLimit;
        const metaBits = getMetaBits(x);
        const neverOpened = x.itemType === "REFERENCE" && (x.useCount ?? 0) === 0;

        return (
          <div
            key={x.id}
            className={`row ${isSel ? "sel" : ""}`}
            onClick={(evt) => {
              if (evt.metaKey || evt.ctrlKey) {
                onToggleSelect(x.id, evt);
              } else {
                onOpen(x.id);
              }
            }}
            style={neverOpened ? { borderLeft: "3px solid var(--orange)" } : undefined}
          >
            <div className="swatch" data-kind={x.ty}>
              {x.ty}
            </div>

            <div>
              <div className="rt">
                {x.t}
                {x.unread && <span style={{ color: "#FF007A", marginLeft: 6 }}>●</span>}
              </div>
              <div className="rm">
                {metaBits.map((b, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                    <span>{b}</span>
                  </React.Fragment>
                ))}
                <span style={{ opacity: 0.4 }}>·</span>
                <span>#{x.tag}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{x.when}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>
                  {x.useCount ?? 0}× · {formatRelativeTime(x.lastUsedAt)}
                </span>
              </div>
            </div>

            <div className={`cost ${fits ? "fits" : ""}`}>
              {typeMeta.verb} {formatMins(x.mins)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
