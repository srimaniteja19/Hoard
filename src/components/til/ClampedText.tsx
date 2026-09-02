"use client";

import React, { useEffect, useRef, useState } from "react";

interface ClampedTextProps {
  text: string;
  className?: string;
  as?: "p" | "div" | "blockquote";
  /** Number of lines to show before offering "Read more". */
  lines?: number;
  style?: React.CSSProperties;
}

/**
 * Renders text normally when short. When it overflows the given line count
 * (e.g. a full article pasted into a TIL entry), it clips with a fade-out
 * edge and a "Read more" toggle instead of rendering unbounded — keeps
 * feed cards scannable while still letting long entries be read in full.
 */
export const ClampedText: React.FC<ClampedTextProps> = ({ text, className = "", as = "p", lines = 6, style }) => {
  const ref = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    // Only measure while collapsed: once expanded, the line-clamp style is
    // removed so scrollHeight === clientHeight always, which would zero out
    // `overflowing` and make the "Show less" toggle disappear the moment
    // someone expands it. `overflowing` describes whether the text is
    // longer than the clamp, not the current expanded/collapsed state, so
    // skip re-measuring (and keep the last known value) while expanded.
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollHeight - el.clientHeight > 2);
  }, [text, lines, expanded]);

  const collapsedStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  return (
    <div className="clamped-text">
      {React.createElement(
        as,
        { ref, className, style: expanded ? style : { ...style, ...collapsedStyle } },
        text
      )}
      {!expanded && overflowing && <div className="clamped-text__fade" />}
      {overflowing && (
        <button type="button" className="clamped-text__toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "SHOW LESS ▴" : "READ MORE ▾"}
        </button>
      )}
    </div>
  );
};
