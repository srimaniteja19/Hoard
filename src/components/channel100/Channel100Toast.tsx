"use client";

import React from "react";

export function Channel100Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="ch100-toast toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
