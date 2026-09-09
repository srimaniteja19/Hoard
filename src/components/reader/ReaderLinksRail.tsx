"use client";

import React from "react";
import { ReaderLink } from "@/types/reader";

interface ReaderLinksRailProps {
  links: ReaderLink[];
  savedLinks: Set<string>;
  onSaveLink: (link: ReaderLink) => void;
}

export function ReaderLinksRail({
  links,
  savedLinks,
  onSaveLink,
}: ReaderLinksRailProps) {
  return (
    <aside className="reader-rrail">
      <div className="reader-rr__h">
        <span>LINKS IN THIS ISSUE</span>
        <span id="lkN">{links.length}</span>
      </div>

      <div id="links">
        {links.length === 0 ? (
          <div className="reader-rr__f">NO LINKS EXTRACTED FROM THIS ISSUE.</div>
        ) : (
          links.map((l, i) => {
            const isSaved = savedLinks.has(l.title);
            return (
              <div key={i} className="reader-lk">
                <span className="t">
                  <b>{l.title}</b>
                  <span>{l.source}</span>
                </span>
                <button
                  type="button"
                  className={isSaved ? "on" : ""}
                  disabled={isSaved}
                  onClick={() => onSaveLink(l)}
                  title={isSaved ? "Saved to Stacks candidate queue" : "Save to Stacks candidate queue"}
                >
                  {isSaved ? "✓" : "＋"}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="reader-rr__f">
        SAVED LINKS LAND IN STACKS AS CANDIDATES — GREYED AND UNFILED UNTIL YOU WRITE THE WHY LINE. IF YOU DON&apos;T WITHIN A WEEK, THEY DROP.
      </div>
    </aside>
  );
}
