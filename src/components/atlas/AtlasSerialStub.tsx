"use client";

import { useState } from "react";

export function AtlasSerialStub({ serial }: { serial: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(serial);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" className="atlas-serial" onClick={() => void copy()} aria-label={`Copy ${serial}`}>
      <span className="atlas-serial-perf" aria-hidden />
      <span className="atlas-serial-text">{copied ? "COPIED" : serial}</span>
    </button>
  );
}
