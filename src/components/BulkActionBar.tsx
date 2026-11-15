"use client";

import React, { useState } from "react";
import { Archive, Trash2, X } from "lucide-react";

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
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount <= 0) return null;

  return (
    <div className="bulk on" role="region" aria-label="Bulk bookmark actions">
      <b>{selectedCount} SELECTED</b>
      <button
        type="button"
        onClick={() => {
          setConfirmDelete(false);
          onMarkRead();
        }}
        style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px" }}
      >
        <Archive size={12} /> MOVE TO VAULT (MARK READ)
      </button>

      {confirmDelete ? (
        <>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onDelete();
            }}
            style={{
              background: "var(--pink)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "11px",
            }}
          >
            <Trash2 size={12} /> CONFIRM DELETE ({selectedCount})
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            style={{ fontSize: "11px" }}
          >
            CANCEL
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px" }}
        >
          <Trash2 size={12} /> DELETE
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setConfirmDelete(false);
          onClear();
        }}
        style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
      >
        <X size={12} /> CLEAR
      </button>
    </div>
  );
};
