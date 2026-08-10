"use client";

import React from "react";
import { Bookmark } from "@/types";
import { BookmarkCard } from "./BookmarkCard";
import { calculateCardWidth } from "../covers/lib/cover-geometry";
import { useSizeByTimePreference } from "../ThemePicker";

interface GridViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
}

export const GridView: React.FC<GridViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onOpenDiff,
}) => {
  const { sizeByTime } = useSizeByTimePreference();

  return (
    <div className="grid" style={sizeByTime ? { display: "flex", flexWrap: "wrap", gap: "16px" } : undefined}>
      {items.map((item) => {
        const cardWidthPx = sizeByTime ? calculateCardWidth(item.mins || 5) : undefined;
        return (
          <BookmarkCard
            key={item.id}
            bookmark={item}
            isSelected={selectedIds.has(item.id)}
            heightClass=""
            cardWidthPx={cardWidthPx}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
            onOpenDiff={onOpenDiff}
          />
        );
      })}
    </div>
  );
};
