"use client";

import React from "react";
import { ScrapRow } from "@/db/schema";
import { playSound } from "@/lib/sound";

interface ScratchCorkboardCardProps {
  scrap: ScrapRow;
  x: number;
  y: number;
  onPointerDownDrag: (id: string, e: React.PointerEvent) => void;
  onOpen: (scrap: ScrapRow) => void;
}

export const ScratchCorkboardCard: React.FC<ScratchCorkboardCardProps> = ({
  scrap,
  x,
  y,
  onPointerDownDrag,
  onOpen,
}) => {
  const preview = scrap.content.length > 120 ? `${scrap.content.slice(0, 117)}...` : scrap.content;

  return (
    <div
      className="corkboard-card"
      style={
        {
          left: `${x}px`,
          top: `${y}px`,
          "--c": `var(--${scrap.color || "cyan"})`,
          "--tilt": scrap.tilt || "0deg",
        } as React.CSSProperties
      }
      onPointerDown={(e) => onPointerDownDrag(scrap.id, e)}
      onClick={() => {
        playSound.click();
        onOpen(scrap);
      }}
    >
      <span className="corkboard-card__pin" aria-hidden="true" />
      <span className="corkboard-card__kind">{scrap.kind}</span>
      <div className="corkboard-card__body">{preview}</div>
    </div>
  );
};
