"use client";

import React, { useState, useEffect } from "react";
import { SyncStatus, subscribeSyncStatus } from "@/lib/notebooks/realtime";
import { Check, RefreshCw, CloudOff, AlertCircle } from "lucide-react";

interface SyncStatusPillProps {
  theme?: "cream" | "ink";
  onRetry?: () => void;
}

export const SyncStatusPill: React.FC<SyncStatusPillProps> = ({ theme = "cream", onRetry }) => {
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [timeAgo, setTimeAgo] = useState<string>("just now");
  const isInk = theme === "ink";

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStatus, savedAt) => {
      setStatus(newStatus);
      if (savedAt) setLastSavedAt(savedAt);
    });
    return unsubscribe;
  }, []);

  // Update relative time display
  useEffect(() => {
    const updateRelative = () => {
      if (!lastSavedAt) {
        setTimeAgo("just now");
        return;
      }
      const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
      if (seconds < 5) {
        setTimeAgo("just now");
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else {
        const mins = Math.floor(seconds / 60);
        setTimeAgo(`${mins}m ago`);
      }
    };

    updateRelative();
    const timer = setInterval(updateRelative, 5000);
    return () => clearInterval(timer);
  }, [lastSavedAt]);

  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          icon: <RefreshCw size={11} className="animate-spin" />,
          label: "SAVING…",
          dotColor: "#3B82F6", // Blue
          textColor: isInk ? "#93C5FD" : "#1D4ED8",
          borderColor: isInk ? "rgba(147, 197, 253, 0.3)" : "rgba(29, 78, 216, 0.3)",
          background: isInk ? "rgba(59, 130, 246, 0.12)" : "rgba(239, 246, 255, 0.9)",
          tooltip: "Syncing changes to cloud database...",
        };
      case "offline":
        return {
          icon: <CloudOff size={11} />,
          label: "OFFLINE",
          dotColor: "#F59E0B", // Amber
          textColor: isInk ? "#FCD34D" : "#B45309",
          borderColor: isInk ? "rgba(252, 211, 77, 0.3)" : "rgba(180, 83, 9, 0.3)",
          background: isInk ? "rgba(245, 158, 11, 0.12)" : "rgba(254, 243, 199, 0.9)",
          tooltip: "Offline. Changes saved locally and will auto-sync when online.",
        };
      case "error":
        return {
          icon: <AlertCircle size={11} />,
          label: "UNSAVED",
          dotColor: "#EF4444", // Red
          textColor: isInk ? "#FCA5A5" : "#B91C1C",
          borderColor: isInk ? "rgba(252, 165, 165, 0.3)" : "rgba(185, 28, 28, 0.3)",
          background: isInk ? "rgba(239, 68, 68, 0.12)" : "rgba(254, 242, 242, 0.9)",
          tooltip: "Failed to sync changes. Click to retry.",
        };
      case "saved":
      default:
        return {
          icon: <Check size={11} strokeWidth={3} />,
          label: "SAVED",
          dotColor: "#10B981", // Green
          textColor: isInk ? "#86EFAC" : "#047857",
          borderColor: isInk ? "rgba(134, 239, 172, 0.25)" : "rgba(4, 120, 87, 0.25)",
          background: isInk ? "rgba(16, 185, 129, 0.08)" : "rgba(236, 253, 245, 0.9)",
          tooltip: `Saved to cloud · ${timeAgo}`,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      title={config.tooltip}
      onClick={status === "error" && onRetry ? onRetry : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--mono, monospace)",
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        padding: "3px 8px",
        border: `1.5px solid ${config.borderColor}`,
        borderRadius: "4px",
        background: config.background,
        color: config.textColor,
        cursor: status === "error" ? "pointer" : "default",
        userSelect: "none",
        transition: "all 0.2s ease",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: config.dotColor,
          display: "inline-block",
          boxShadow:
            status === "saving"
              ? `0 0 8px ${config.dotColor}`
              : "none",
          animation: status === "saving" ? "pulse 1.5s infinite" : "none",
        }}
      />
      <span>{config.label}</span>
      {status === "saved" && (
        <span style={{ opacity: 0.6, fontWeight: 500, marginLeft: "2px" }}>
          {timeAgo}
        </span>
      )}
    </div>
  );
};
