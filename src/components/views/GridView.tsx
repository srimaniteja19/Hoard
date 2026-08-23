"use client";

import React from "react";
import { Bookmark } from "@/types";
import { BookmarkCard } from "./BookmarkCard";

interface GridViewProps {
  items: Bookmark[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number, e: React.MouseEvent) => void;
  onOpen: (id: number) => void;
  onOpenDiff?: (bookmark: Bookmark) => void;
  onDischarge?: (bookmark: Bookmark, sourceRect: DOMRect) => void;
  onGhostRead?: (bookmark: Bookmark) => void;
}

export const GridView: React.FC<GridViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  onOpenDiff,
  onDischarge,
  onGhostRead,
}) => {
  return (
    <div className="grid">
      {items.map((item) => (
        <BookmarkCard
          key={item.id}
          bookmark={item}
          isSelected={selectedIds.has(item.id)}
          heightClass=""
          onToggleSelect={onToggleSelect}
          onOpen={onOpen}
          onOpenDiff={onOpenDiff}
          onDischarge={onDischarge}
          onGhostRead={onGhostRead}
        />
      ))}
    </div>
  );
};
