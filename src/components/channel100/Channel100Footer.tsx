"use client";

import React from "react";

export const Channel100Footer: React.FC = () => {
  return (
    <footer className="ch100-wrap wrap ch100-footer">
      <p>
        <strong>Live Data Sources:</strong> Television rankings sync with the{" "}
        <a
          href="https://www.imdb.com/chart/toptv/"
          target="_blank"
          rel="noopener noreferrer"
        >
          IMDb Top 250 TV
        </a>{" "}
        &amp; TVMaze datasets; feature film rankings sync with{" "}
        <a
          href="https://letterboxd.com/official/list/letterboxds-top-500-films/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Letterboxd Official Top 500
        </a>{" "}
        &amp; Wikidata film canons; indie/arthouse picks sync from{" "}
        <a
          href="https://verygoodfilms.co/"
          target="_blank"
          rel="noopener noreferrer"
        >
          verygoodfilms.co
        </a>
        . All progress, ratings, and notes are saved locally and synced to your Hoard database.
      </p>
    </footer>
  );
};
