"use client";

import React from "react";
import { Bookmark } from "@/types";
import { BookmarkCard } from "./BookmarkCard";

interface MasonryViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
}

export const MasonryView: React.FC<MasonryViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onOpenDiff,
}) => {
  return (
    <div className="masonry">
      {items.map((item, i) => {
        const heightClass = i % 3 === 0 ? "tall" : i % 4 === 1 ? "short" : "";
        return (
          <BookmarkCard
            key={item.id}
            bookmark={item}
            isSelected={selectedIds.has(item.id)}
            heightClass={heightClass}
            onToggleSelect={onToggleSelect}
            onOpen={onOpen}
            onOpenDiff={onOpenDiff}
          />
        );
      })}
    </div>
  );
};
