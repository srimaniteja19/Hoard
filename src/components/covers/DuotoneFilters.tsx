"use client";

import React from "react";
import { DUOTONE_PALETTES, getDuotoneTableValues } from "@/lib/covers/duotone";
import { KindType } from "@/types";

const KINDS: KindType[] = ["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"];

/**
 * Renders hidden SVG filter bank once at page root (§4.2).
 * Allows applying `filter: url(#duotone-{kind})` via CSS to any OG cover <img>.
 */
export const DuotoneFilters: React.FC = () => {
  return (
    <svg style={{ display: "none", position: "absolute", width: 0, height: 0 }} aria-hidden="true">
      <defs>
        {KINDS.map((kind) => {
          const palette = DUOTONE_PALETTES[kind];
          const { rTable, gTable, bTable } = getDuotoneTableValues(palette);
          return (
            <filter id={`duotone-${kind}`} key={kind} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="
                  0.33 0.59 0.11 0 0
                  0.33 0.59 0.11 0 0
                  0.33 0.59 0.11 0 0
                  0    0    0    1 0"
                result="gray"
              />
              <feComponentTransfer colorInterpolationFilters="sRGB">
                <feFuncR type="table" tableValues={rTable} />
                <feFuncG type="table" tableValues={gTable} />
                <feFuncB type="table" tableValues={bTable} />
              </feComponentTransfer>
            </filter>
          );
        })}
      </defs>
    </svg>
  );
};
