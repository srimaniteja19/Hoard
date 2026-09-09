"use client";

import React, { useState, useEffect, useRef } from "react";
import { validateKeepReason } from "@/lib/reader/validation";

interface ReaderPopoverProps {
  quote: string;
  position: { top: number; left: number } | null;
  isOpen: boolean;
  onKeep: (quote: string, reason: string) => void;
  onClose: () => void;
}

export function ReaderPopover({
  quote,
  position,
  isOpen,
  onKeep,
  onClose,
}: ReaderPopoverProps) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validation = validateKeepReason(reason);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen || !position) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (validation.valid) {
        onKeep(quote, reason.trim());
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleKeepClick = () => {
    if (validation.valid) {
      onKeep(quote, reason.trim());
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="reader-pop on"
      id="pop"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="reader-pop__q" id="popQ">
        “{quote}”
      </div>
      <input
        ref={inputRef}
        id="popR"
        type="text"
        placeholder="why does this matter to you? one line"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="reader-pop__f">
        <span
          id="popState"
          className={validation.isWarn ? "warn" : "good"}
        >
          {validation.status}
        </span>
        <span className="sp" />
        <span style={{ opacity: 0.45 }}>ENTER TO KEEP · ESC TO DROP</span>
        <button
          id="popGo"
          type="button"
          disabled={!validation.valid}
          onClick={handleKeepClick}
        >
          KEEP
        </button>
      </div>
    </div>
  );
}
