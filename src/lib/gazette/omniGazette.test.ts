import { describe, it, expect } from "vitest";
import { exportOmniGazetteMarkdown, OmniGazetteIssue } from "./omniGazette";

describe("omniGazette", () => {
  it("exports omni gazette to clean Markdown format matching the editorial layout", () => {
    const mockIssue: OmniGazetteIssue = {
      volumeNumber: 3,
      issueNumber: 34,
      dateRange: "17–23 AUGUST 2026",
      publishedDate: "SUNDAY, 23 AUGUST 2026",
      totalEditions: 34,
      verdict: {
        headline: "Thirteen in, one out.",
        body: "Your worst intake-to-use ratio in eight weeks. You saved thirteen things, opened one of them, and finished a single todo.",
      },
      vsAverage: [
        { label: "SAVED", val: "13", diff: "▲ +5", dir: "up" },
        { label: "OPENED", val: "1", diff: "▼ −6", dir: "dn" },
        { label: "TODOS DONE", val: "1", diff: "▼ −3", dir: "dn" },
        { label: "TIL FILED", val: "6", diff: "▲ +2", dir: "up" },
        { label: "ATLAS STATIONS", val: "0", diff: "0 — flat", dir: "flat" },
        { label: "READ TIME", val: "39m", diff: "▼ −2h 10m", dir: "dn" },
      ],
      flow: {
        opened: 1,
        filed: 2,
        untouched: 10,
        note: "TEN OF THIRTEEN NEVER LEFT THE INBOX. AT THIS WEEK'S RATE THE LIBRARY CLEARS IN 224 DAYS.",
      },
      acquisitions: [
        {
          tag: "postgresql",
          title: "PostgreSQL for Everything",
          source: "RAPHAELBAUER.COM · THE ONE YOU ACTUALLY READ",
          note: "An article exploring versatility",
          status: "READ",
          statusType: "warm",
          url: "https://raphaelbauer.com",
        },
      ],
      mintedTils: [
        {
          id: "til-1",
          body: "mix-blend-mode composites against the nearest stacking context, not the page.",
          type: "GOTCHA",
          dateStr: "22 AUG",
        },
      ],
      gaps: [
        {
          stat: "0/20",
          desc: "Atlas stations walked. Advanced Postgres Mastery has sat at zero.",
        },
      ],
      weather: [
        {
          tag: "#ai",
          count: 3,
          trend: "▲ RISING · 4 WEEKS RUNNING",
          trendType: "up",
          sparks: [30, 45, 62, 100],
        },
      ],
      nextActions: [
        {
          kicker: "WALK ONE STATION",
          desc: "Deconstructing EXPLAIN ANALYZE — 45 minutes.",
        },
      ],
      ledger: {
        totalHoards: 13,
        totalReads: 1,
        readingMinutes: 39,
        totalTodosCompleted: 1,
        totalTilMinted: 6,
        curatorScore: 92,
        topTopic: "postgresql",
      },
    };

    const markdown = exportOmniGazetteMarkdown(mockIssue);
    expect(markdown).toContain("# 📰 THE HOARD GAZETTE — NO. 34");
    expect(markdown).toContain("Vol. 3 · Issue 34");
    expect(markdown).toContain("THE WEEK'S VERDICT: Thirteen in, one out.");
    expect(markdown).toContain("PostgreSQL for Everything");
    expect(markdown).toContain("mix-blend-mode composites against the nearest stacking context");
  });
});
