"use client";

import { useCallback, useState } from "react";
import { AlertCircle, Check, Film, Flame, Layers, Tv, X } from "lucide-react";
import type { Check as StudioCheck } from "@/lib/studio/checks";
import {
  FORMAT_LABEL,
  PILLAR_LABEL,
  STATUS_LABEL,
  type StudioFormat,
  type StudioPillar,
  type StudioStatus,
} from "@/lib/studio/types";

export function PillarDot({ pillar }: { pillar: StudioPillar }) {
  return (
    <span
      className={`studio-dot studio-dot-${pillar}`}
      title={PILLAR_LABEL[pillar]}
      aria-label={PILLAR_LABEL[pillar]}
      role="img"
    />
  );
}

export function PillarBadge({ pillar }: { pillar: StudioPillar }) {
  return (
    <span className={`studio-pillar-tag studio-pillar-${pillar}`}>
      <span className={`studio-dot studio-dot-${pillar}`} />
      <span>{PILLAR_LABEL[pillar]}</span>
    </span>
  );
}

export function FormatBadge({ format }: { format: StudioFormat }) {
  const icon =
    format === "reel" ? (
      <Film size={12} aria-hidden="true" />
    ) : format === "carousel" ? (
      <Layers size={12} aria-hidden="true" />
    ) : format === "youtube" ? (
      <Tv size={12} aria-hidden="true" />
    ) : (
      <Flame size={12} aria-hidden="true" />
    );

  return (
    <span className={`studio-format-pill studio-format-${format}`}>
      {icon}
      <span>{FORMAT_LABEL[format]}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: StudioStatus }) {
  return (
    <span className={`studio-status-pill studio-status-${status}`}>
      <span className="studio-status-indicator" />
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}

export function CheckList({ checks, id }: { checks: StudioCheck[]; id?: string }) {
  if (!checks.length) return null;
  return (
    <ul className="studio-checks" id={id} aria-live="polite">
      {checks.map((c) => (
        <li key={c.text} className={`studio-check studio-check-${c.level}`}>
          {c.level === "ok" ? (
            <Check size={13} className="studio-check-ico" aria-hidden="true" />
          ) : (
            <AlertCircle size={13} className="studio-check-ico" aria-hidden="true" />
          )}
          <span>{c.text}</span>
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
      <div className="studio-modal studio-modal-copy" role="dialog" aria-modal="true" aria-label={`Copy ${fallback.label}`} onClick={(e) => e.stopPropagation()}>
        <div className="studio-modal-head">
          <div className="studio-modal-title">
            <Check size={16} aria-hidden="true" />
            <strong>{fallback.label}</strong>
          </div>
          <button type="button" className="studio-btn studio-btn-plain studio-btn-sm" onClick={() => setFallback(null)}>
            <X size={14} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>
        <p className="studio-muted studio-small">Copying was blocked by your browser. The text is selected below — press ⌘C or Ctrl+C to copy.</p>
        <textarea className="studio-textarea studio-mono" rows={12} readOnly value={fallback.text} autoFocus onFocus={(e) => e.currentTarget.select()} />
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
      <div className="studio-modal studio-modal-confirm" role="alertdialog" aria-modal="true" aria-label={message} onClick={(e) => e.stopPropagation()}>
        <div className="studio-modal-head">
          <div className="studio-modal-title studio-danger-title">
            <AlertCircle size={18} aria-hidden="true" />
            <strong>Confirm Action</strong>
          </div>
          <button type="button" className="studio-btn studio-btn-plain studio-btn-sm" onClick={onCancel} aria-label="Cancel">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <p className="studio-confirm-text">{message}</p>
        <div className="studio-row studio-row-start studio-confirm-acts">
          <button type="button" className="studio-btn studio-btn-danger" onClick={onConfirm} autoFocus>
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
