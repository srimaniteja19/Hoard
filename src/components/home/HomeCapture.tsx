"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  buildCaptureRequest,
  canCommitCapture,
  routeCapture,
  type CaptureDestination,
  type CapturePreview,
} from "@/lib/home/routeCapture";
import {
  applyPaletteSelection,
  CAPTURE_STARTERS,
  commandPrefix,
  displayPills,
  parseSlash,
  slashPaletteState,
  type PaletteEntry,
} from "@/lib/home/slashCommands";
import { SlashPalette } from "@/components/home/SlashPalette";

const FILED_LABEL: Record<CaptureDestination, string> = {
  queue: "FILED TO THE QUEUE",
  record: "FILED TO THE RECORD",
  agenda: "FILED TO THE AGENDA",
};

export function HomeCapture({
  onFiled,
}: {
  onFiled?: (preview: CapturePreview) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filed, setFiled] = useState<CaptureDestination | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paletteKey, setPaletteKey] = useState("");

  const preview = useMemo(
    () =>
      routeCapture(
        input,
        new Date(),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
    [input],
  );
  const palette = slashPaletteState(input, focused);
  const slash = parseSlash(input);
  const nextPaletteKey = `${palette.mode}:${palette.query}:${palette.open}`;
  if (nextPaletteKey !== paletteKey) {
    setPaletteKey(nextPaletteKey);
    setSelectedIndex(0);
  }
  const safeIndex = palette.matches.length
    ? Math.min(selectedIndex, palette.matches.length - 1)
    : 0;
  const locked = slash.kind === "command";
  const prefix = locked ? commandPrefix(input) : "";
  const visible = locked ? input.slice(prefix.length) : input;
  const pills = locked ? displayPills(input) : [];
  const selected = palette.matches[safeIndex] ?? null;
  const tabHint = palette.open && selected ? `tab /${selected.name}` : "";
  const shellTone =
    preview.destination ?? (preview.chips[0]?.label === "UNKNOWN" ? "unknown" : "idle");
  const capturePlaceholder =
    slash.kind === "command"
      ? slash.entry.placeholder
      : "https://…  or  /til  or  /todo call the vet ~10m";
  const modeLabel =
    preview.destination === "queue"
      ? "QUEUE"
      : preview.destination === "record"
        ? "RECORD"
        : preview.destination === "agenda"
          ? "AGENDA"
          : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (
        event.key === "/" &&
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!filed) return;
    const timer = window.setTimeout(() => setFiled(null), 1600);
    return () => window.clearTimeout(timer);
  }, [filed]);

  function setVisibleValue(nextVisible: string) {
    setInput(locked ? prefix + nextVisible : nextVisible);
    setFiled(null);
  }

  function completeSelected(entry: PaletteEntry | null = selected) {
    if (!entry) return;
    setInput(applyPaletteSelection(input, entry, palette.mode));
    setFiled(null);
    inputRef.current?.focus();
  }

  async function commit() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const previewNow = routeCapture(input, new Date(), tz);
    if (!canCommitCapture(previewNow) || submitting || !previewNow.destination) return;
    const request = buildCaptureRequest(previewNow);
    if (!request) return;
    const snapshot = input;
    const dest = previewNow.destination;
    setInput("");
    setSubmitting(true);
    try {
      const res = await fetch(request.url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      if (!res.ok) {
        setInput(snapshot);
      } else {
        if (onFiled) onFiled(previewNow);
        else setFiled(dest);
        router.refresh();
      }
    } catch {
      setInput(snapshot);
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (palette.open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) =>
          palette.matches.length ? (index + 1) % palette.matches.length : 0,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) =>
          palette.matches.length
            ? (index - 1 + palette.matches.length) % palette.matches.length
            : 0,
        );
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        completeSelected();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (canCommitCapture(preview)) commit();
        else completeSelected();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (locked) {
          if (slash.kind === "command") setInput(`/${slash.token}`);
        } else {
          setInput("");
        }
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      commit();
      return;
    }

    if (event.key === "Backspace" && locked && visible === "") {
      event.preventDefault();
      if (slash.kind === "command") setInput(`/${slash.token}`);
      return;
    }

    if (event.key === "Escape") {
      if (locked) {
        event.preventDefault();
        if (slash.kind === "command") setInput(`/${slash.token}`);
      } else if (input) {
        event.preventDefault();
        setInput("");
      } else {
        inputRef.current?.blur();
      }
    }
  }

  return (
    <section className="home-capture">
      <div className="home-capture-label-row">
        <label htmlFor="home-capture" className="home-capture-label">
          CAPTURE
          {modeLabel ? <span className="home-capture-mode"> · {modeLabel}</span> : null}
        </label>
        <span className="home-capture-kbd" aria-hidden="true">
          {palette.open ? "↑↓ tab  ·  ↵ enter  ·  esc" : "type / for commands"}
        </span>
      </div>

      <div className="home-capture-field">
        <div className={`home-capture-shell home-capture-shell-${shellTone}`}>
          {pills.map((pill) => (
            <span key={pill} className="home-cmd-pill">
              {pill}
            </span>
          ))}
          <input
            ref={inputRef}
            id="home-capture"
            type="text"
            role="combobox"
            aria-label="Capture a link, learning, or task"
            aria-autocomplete="list"
            aria-expanded={palette.open}
            aria-controls={palette.open ? "home-slash-list" : undefined}
            aria-activedescendant={palette.open && selected ? `home-slash-${safeIndex}` : undefined}
            value={visible}
            placeholder={capturePlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={submitting}
            onChange={(event) => setVisibleValue(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
          />
          {tabHint ? (
            <span className="home-capture-tabhint" aria-hidden="true">
              {tabHint}
            </span>
          ) : null}
        </div>
        {palette.open ? (
          <SlashPalette
            matches={palette.matches}
            selectedIndex={safeIndex}
            mode={palette.mode}
            query={palette.query}
            onSelect={completeSelected}
          />
        ) : null}
      </div>

      <div className="home-capture-chips" aria-live="polite">
        {filed ? (
          <span className={`home-filed-flash home-filed-flash-${filed}`}>{FILED_LABEL[filed]} →</span>
        ) : !input.trim() ? (
          CAPTURE_STARTERS.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className="home-starter-chip"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setInput(`/${entry.name} `);
                inputRef.current?.focus();
              }}
            >
              /{entry.name}
            </button>
          ))
        ) : (
          preview.chips.map((chip, index) => (
            <span key={`${chip.label}-${index}`} className="home-preview-chip">
              {chip.label}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
