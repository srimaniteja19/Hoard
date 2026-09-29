"use client";

import { useCallback, useState } from "react";
import type { Check } from "@/lib/studio/checks";
import { PILLAR_LABEL, type StudioPillar } from "@/lib/studio/types";

export function PillarDot({ pillar }: { pillar: StudioPillar }) {
  return <span className={`studio-dot studio-dot-${pillar}`} title={PILLAR_LABEL[pillar]} aria-label={PILLAR_LABEL[pillar]} role="img" />;
}

export function CheckList({ checks, id }: { checks: Check[]; id?: string }) {
  return (
    <ul className="studio-checks" id={id} aria-live="polite">
      {checks.map((c) => (
        <li key={c.text} className={`studio-check studio-check-${c.level}`}>
          {c.level === "ok" ? "✓ " : c.level === "warn" ? "! " : ""}
          {c.text}
        </li>
      ))}
    </ul>
  );
}

/** Copy to the clipboard; when the browser blocks it, show the text selected in a dialog. */
export function useCopy(onDone: (msg: string) => void) {
  const [fallback, setFallback] = useState<{ label: string; text: string } | null>(null);
  const copy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        onDone(`${label} copied`);
      } catch {
        setFallback({ label, text });
      }
    },
    [onDone]
  );
  const dialog = fallback ? (
    <div className="studio-scrim" onClick={() => setFallback(null)}>
      <div className="studio-modal" role="dialog" aria-modal="true" aria-label={`Copy ${fallback.label}`} onClick={(e) => e.stopPropagation()}>
        <div className="studio-row">
          <strong>{fallback.label}</strong>
          <button type="button" className="studio-btn studio-btn-plain" onClick={() => setFallback(null)}>
            Close
          </button>
        </div>
        <p className="studio-muted">Copying was blocked. The text is selected: press Ctrl+C or ⌘C.</p>
        <textarea className="studio-textarea studio-mono" rows={14} readOnly value={fallback.text} autoFocus onFocus={(e) => e.currentTarget.select()} />
      </div>
    </div>
  ) : null;
  return { copy, dialog };
}

export function Confirm({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="studio-scrim" onClick={onCancel}>
      <div className="studio-modal" role="alertdialog" aria-modal="true" aria-label={message} onClick={(e) => e.stopPropagation()}>
        <p className="studio-confirm-text">{message}</p>
        <div className="studio-row studio-row-start">
          <button type="button" className="studio-btn" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
          <button type="button" className="studio-btn studio-btn-plain" onClick={onCancel}>
            Keep
          </button>
        </div>
      </div>
    </div>
  );
}
