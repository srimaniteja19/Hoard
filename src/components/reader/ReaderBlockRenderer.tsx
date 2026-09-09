"use client";

import React from "react";
import { ReaderBlock } from "@/types/reader";

interface ReaderBlockRendererProps {
  blocks: ReaderBlock[];
  onKeepFigure?: (figureId: string, caption: string) => void;
}

export function CascadeRouterSvg() {
  return (
    <svg viewBox="0 0 660 220" xmlns="http://www.w3.org/2000/svg">
      <rect x="160" y="26" width="110" height="44" fill="#FCE94F" opacity=".45" />
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round">
        <rect x="14" y="26" width="96" height="44" />
        <rect x="160" y="26" width="110" height="44" />
        <rect x="330" y="12" width="110" height="34" />
        <rect x="330" y="60" width="110" height="34" />
        <path d="M110 48h46M156 41l10 7-10 7" />
        <path d="M270 40l56-11M318 24l12 5-9 9" />
        <path d="M270 56l56 11M321 58l9 9-12 5" />
      </g>
      <g fontFamily="Space Mono, monospace" fontSize="10.5" fontWeight="700" fill="currentColor">
        <text x="26" y="53">REQUEST</text>
        <text x="172" y="53">CLASSIFIER</text>
        <text x="342" y="33">SMALL MODEL</text>
        <text x="342" y="81">BIG MODEL</text>
      </g>
      <text x="160" y="20" fontFamily="Space Mono, monospace" fontSize="9" fill="#FF2D8A" fontWeight="700">
        GUESSES BEFORE ANSWERING
      </text>

      <rect x="160" y="150" width="110" height="44" fill="#B8F04A" opacity=".45" />
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round">
        <rect x="14" y="150" width="96" height="44" />
        <rect x="160" y="150" width="110" height="44" />
        <rect x="330" y="150" width="96" height="44" />
        <rect x="470" y="150" width="110" height="44" />
        <path d="M110 172h46M156 165l10 7-10 7" />
        <path d="M270 172h56M326 165l10 7-10 7" />
        <path d="M426 172h40M466 165l10 7-10 7" />
        <path d="M378 150 C 378 112, 214 112, 214 146M206 136l8 12 9-11" />
      </g>
      <g fontFamily="Space Mono, monospace" fontSize="10.5" fontWeight="700" fill="currentColor">
        <text x="26" y="177">REQUEST</text>
        <text x="176" y="177">SMALL MODEL</text>
        <text x="344" y="177">SCORE IT</text>
        <text x="486" y="177">BIG MODEL</text>
      </g>
      <text x="228" y="106" fontFamily="Space Mono, monospace" fontSize="9" fill="#B8F04A" fontWeight="700">
        ONLY IF THE SCORE IS LOW
      </text>
    </svg>
  );
}

export function ReaderBlockRenderer({ blocks, onKeepFigure }: ReaderBlockRendererProps) {
  return (
    <article className="reader-article" id="art">
      {blocks.map((block, i) => {
        if (block.type === "h") {
          return <h2 key={i}>{block.text}</h2>;
        }

        if (block.type === "ul") {
          return (
            <ul key={i}>
              {block.items.map((item, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          );
        }

        if (block.type === "fig") {
          return (
            <figure key={i} className="reader-figure">
              <div className="fh">
                <span>FIG · {block.figureId.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => onKeepFigure?.(block.figureId, block.caption)}
                >
                  ＋ KEEP FIGURE
                </button>
              </div>
              <div className="fb">
                {block.figureId === "cascade" ? (
                  <CascadeRouterSvg />
                ) : (
                  <div style={{ padding: "20px", fontFamily: "var(--reader-mono)", fontSize: "11px" }}>
                    [FIGURE: {block.figureId}]
                  </div>
                )}
              </div>
              <figcaption>{block.caption}</figcaption>
            </figure>
          );
        }

        // Paragraph block (lede + rest)
        return (
          <p key={i}>
            <span className="lede" dangerouslySetInnerHTML={{ __html: block.lede }} />
            <span className="rest" dangerouslySetInnerHTML={{ __html: block.rest }} />
          </p>
        );
      })}
    </article>
  );
}
