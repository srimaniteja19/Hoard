"use client";

import React, { useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { computeYearWall } from "@/lib/scratch/tallies";

interface ScratchYearWallProps {
  scraps: ScrapRow[];
  year?: number;
  onSelectDate?: (dateIso: string) => void;
}

export const ScratchYearWall: React.FC<ScratchYearWallProps> = ({
  scraps,
  year = new Date().getFullYear(),
  onSelectDate,
}) => {
  const wallData = useMemo(() => {
    return computeYearWall(scraps, year);
  }, [scraps, year]);

  return (
    <div className="wall">
      <div className="wall__h">
        <span>THE YEAR · LOGGED DAYS</span>
        <span>
          {wallData.daysLogged} DAYS LOGGED · CURRENT RUN {wallData.currentRun}
        </span>
      </div>

      <div className="wall__g" id="wall">
        {wallData.cells.map((cell) => (
          <i
            key={cell.dateIso}
            className={cell.shade === "a0" ? undefined : cell.shade}
            title={`${cell.dateIso}: ${cell.count} logged`}
            onClick={() => onSelectDate?.(cell.dateIso)}
          />
        ))}
      </div>

      <div className="wall__f">
        <span>{year} · {wallData.daysInYear} DAYS IN</span>
        <span>{wallData.daysLogged} LOGGED</span>
        <span>LONGEST RUN {wallData.longestRun}</span>
        <span>LONGEST GAP {wallData.longestGap}</span>
      </div>
    </div>
  );
};
