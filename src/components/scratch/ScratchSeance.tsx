"use client";

import React from "react";
import { ScrapRow } from "@/db/schema";
import { playSound } from "@/lib/sound";

interface ScratchSeanceProps {
  scrap: ScrapRow;
  onRestore: (id: string) => Promise<void> | void;
  onDismiss: () => void;
}

export const ScratchSeance: React.FC<ScratchSeanceProps> = ({ scrap, onRestore, onDismiss }) => {
  const buriedAt = scrap.buriedAt ? new Date(scrap.buriedAt) : new Date(scrap.createdAt);
  const daysAgo = Math.max(
    0,
    Math.floor((Date.now() - buriedAt.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="seance">
      <div className="seance__h">
        <span>⛏ DUG UP FROM THE COMPOST</span>
        <span>
          BURIED {daysAgo} DAY{daysAgo === 1 ? "" : "S"} AGO
        </span>
      </div>
      <div className="seance__body">{scrap.content}</div>
      <div className="seance__a">
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onDismiss();
          }}
        >
          REBURY
        </button>
        <button
          type="button"
          onClick={() => {
            playSound.pin(true);
            void onRestore(scrap.id);
          }}
        >
          RESTORE TO SHELF
        </button>
      </div>
    </div>
  );
};
