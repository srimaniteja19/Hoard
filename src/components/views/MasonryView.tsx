"use client";

import React from "react";
import { Bookmark } from "@/types";
import { BookmarkCard } from "./BookmarkCard";

interface MasonryViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onRecordUse?: (id: number) => void;
  onSelectTag?: (tag: string) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
  onOpenSynapse?: (bookmark: Bookmark) => void;
}

export const MasonryView: React.FC<MasonryViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onRecordUse,
  onSelectTag,
  onOpenDiff,
  onDischarge,
  onGhostRead,
  onOpenSynapse,
}) => {
  return (
    <div className="masonry">
      {items.map((item) => {
        // Content-driven cover sizing rather than arbitrary index modulo
        const heightClass =
          item.mins >= 18 || item.ty === "VID" || item.ty === "PPR"
            ? "tall"
            : item.mins > 0 && item.mins <= 4
              ? "short"
              : "";

        return (
          <BookmarkCard
            key={item.id}
            bookmark={item}
            isSelected={selectedIds.has(item.id)}
            heightClass={heightClass}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
            onRecordUse={onRecordUse}
            onSelectTag={onSelectTag}
            onOpenDiff={onOpenDiff}
            onDischarge={onDischarge}
            onGhostRead={onGhostRead}
            onOpenSynapse={onOpenSynapse}
          />
        );
      })}
    </div>
  );
};
