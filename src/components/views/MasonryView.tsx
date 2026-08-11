"use client";

import React from "react";
import { Bookmark } from "@/types";
import { BookmarkCard } from "./BookmarkCard";
import { calculateCoverHeight } from "../covers/lib/cover-geometry";
import { useSizeByTimePreference } from "../ThemePicker";

interface MasonryViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
}

export const MasonryView: React.FC<MasonryViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onOpenDiff,
  onDischarge,
}) => {
  const { sizeByTime } = useSizeByTimePreference();

  return (
    <div className="masonry">
      {items.map((item, i) => {
        const heightClass = i % 3 === 0 ? "tall" : i % 4 === 1 ? "short" : "";
        const coverHeightPx = sizeByTime ? calculateCoverHeight(item.mins || 5) : undefined;

        return (
          <BookmarkCard
            key={item.id}
            bookmark={item}
            isSelected={selectedIds.has(item.id)}
            heightClass={sizeByTime ? "" : heightClass}
            heightPx={coverHeightPx}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
            onOpenDiff={onOpenDiff}
            onDischarge={onDischarge}
          />
        );
      })}
    </div>
  );
};
