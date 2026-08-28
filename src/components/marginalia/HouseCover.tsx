"use client";

import React, { useMemo } from "react";
import { BookMotif } from "@/db/schema";
import { renderMotifSvg } from "@/lib/marginalia/houseMotifs";

interface HouseCoverProps {
  title: string;
  author: string;
  accentColor?: string | null;
  fgColor?: string | null;
  motif?: BookMotif | null;
  className?: string;
}

export const HouseCover: React.FC<HouseCoverProps> = ({
  title,
  author,
  accentColor = "#7B5CF0",
  fgColor = "#FFFFFF",
  motif = "arcs",
  className = "",
}) => {
  const acc = accentColor || "#7B5CF0";
  const fg = fgColor || "#FFFFFF";
  const m = motif || "arcs";

  const svgHtml = useMemo(() => {
    return renderMotifSvg(m, fg, "0.14");
  }, [m, fg]);

  return (
    <div
      className={`house ${className}`}
      style={
        {
          "--acc": acc,
          "--fg": fg,
        } as React.CSSProperties
      }
    >
      <div
        className="art"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
      <div className="in">
        <div className="t">{title}</div>
        <div className="rl" />
        <div className="a">{author}</div>
        <div className="pub">HOARD EDITIONS</div>
      </div>
    </div>
  );
};
