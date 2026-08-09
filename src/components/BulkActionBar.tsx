"use client";

import React from "react";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClear,
  onMarkRead,
  onDelete,
}) => {
  return (
    <div className={`bulk ${selectedCount > 0 ? "on" : ""}`}>
      <b>{selectedCount} SELECTED</b>
      <button onClick={onMarkRead}>MARK READ</button>
      <button onClick={onDelete}>DELETE</button>
      <button onClick={onClear}>CLEAR</button>
    </div>
  );
};
