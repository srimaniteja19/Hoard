"use client";

import React, { useEffect, useRef, useState } from "react";

interface ClampedTextProps {
  text?: string;
  children?: React.ReactNode;
  className?: string;
  as?: "p" | "div" | "blockquote";
  /** Number of lines to show before offering "Read more". */
  lines?: number;
  style?: React.CSSProperties;
}

/**
 * Renders text/rich content normally when short. When it overflows the given line count
 * (e.g. a full article or news bulletin pasted into a TIL entry), it clips with a fade-out
 * edge and a "Read more" toggle instead of rendering unbounded — keeps
 * feed cards scannable while still letting long entries be read in full.
 */
export const ClampedText: React.FC<ClampedTextProps> = ({
  text,
  children,
  className = "",
  as = "div",
  lines = 6,
  style,
}) => {
  const ref = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  const contentToRender = children !== undefined ? children : text;

  useEffect(() => {
    // Only measure while collapsed: once expanded, the line-clamp style is
    // removed so scrollHeight === clientHeight always.
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollHeight - el.clientHeight > 4);
  }, [text, children, lines, expanded]);

  const collapsedStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    maxHeight: `${lines * 2.2}em`,
  };

  return (
    <div className="clamped-text">
      {React.createElement(
        as,
        {
          ref,
          className,
          style: expanded ? style : { ...style, ...collapsedStyle },
        },
        contentToRender
      )}
      {!expanded && overflowing && <div className="clamped-text__fade" />}
      {overflowing && (
        <button
          type="button"
          className="clamped-text__toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "SHOW LESS ▴" : "READ MORE ▾"}
        </button>
      )}
    </div>
  );
};
