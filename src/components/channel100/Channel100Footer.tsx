"use client";

import React from "react";

export const Channel100Footer: React.FC = () => {
  return (
    <footer className="ch100-wrap wrap ch100-footer footer">
      <p>
        <strong>Sources:</strong> the rankings come from The New York Times&apos;
        &ldquo;The 100 Best TV Shows of the 21st Century&rdquo; (2026,{" "}
        <a
          href="https://www.nytimes.com/bestTV"
          target="_blank"
          rel="noopener noreferrer"
        >
          nytimes.com/bestTV
        </a>
        ) and &ldquo;The 100 Best Movies of the 21st Century&rdquo; (June 2025,
        voted by more than 500 filmmakers and actors).
      </p>
      <p>
        <strong>Where to watch</strong> shows each title&apos;s main US
        streaming home as of mid-2026, or Rent / Buy when there isn&apos;t a
        steady one. Catalogs move often, so every title links to JustWatch for
        current options. IMDb ratings are approximate and rounded.
      </p>
      <p>
        <strong>Seasons, episodes and runtimes</strong> are approximate, as of
        mid-2026. TV totals use a typical episode length, and shows still airing
        are marked &asymp;. &ldquo;Evenings&rdquo; assumes two hours a night.
      </p>
      <p>
        Illustrations are original motifs and broadcast test-card palettes
        drawn for this page.
      </p>
    </footer>
  );
};
