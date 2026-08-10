import { describe, it, expect } from "vitest";
import { generatePressMarkdown } from "./pressMarkdown";
import { TilItem } from "@/components/til/TilFeedItem";

describe("generatePressMarkdown", () => {
  const sampleEntries: TilItem[] = [
    {
      id: "1",
      userId: "u1",
      shortHash: "a3f9",
      type: "FACT",
      body: "PostgreSQL index scans are fast on [docs](https://postgresql.org).",
      code: null,
      codeLang: null,
      linkUrl: null,
      linkPreview: null,
      linkDensity: "card",
      dischargesBookmarkId: null,
      loggedFor: "2025-01-15",
      createdAt: "2025-01-15T12:00:00Z",
      updatedAt: "2025-01-15T12:00:00Z",
      tags: ["postgres", "sql"],
    },
    {
      id: "2",
      userId: "u1",
      shortHash: "0c67",
      type: "SNIPPET",
      body: "Helper for calculating sum",
      code: "const sum = (a: number, b: number) => a + b;",
      codeLang: "typescript",
      linkUrl: null,
      linkPreview: null,
      linkDensity: "card",
      dischargesBookmarkId: null,
      loggedFor: "2025-01-16",
      createdAt: "2025-01-16T12:00:00Z",
      updatedAt: "2025-01-16T12:00:00Z",
      tags: ["typescript"],
    },
  ];

  it("produces clean markdown with header, numbered entries, code fences, and italicized tags", () => {
    const md = generatePressMarkdown(sampleEntries, "January 2025");

    expect(md).toContain("# HOARD TIL ROUNDUP — JANUARY 2025");
    expect(md).toContain("### 1. [FACT] 2025-01-15 (#a3f9)");
    expect(md).toContain("PostgreSQL index scans are fast on [docs](https://postgresql.org).");
    expect(md).toContain("*#postgres* *#sql*");
    expect(md).toContain("### 2. [SNIPPET] 2025-01-16 (#0c67)");
    expect(md).toContain("```typescript\nconst sum = (a: number, b: number) => a + b;\n```");
    expect(md).toContain("*#typescript*");
  });

  it("strips HTML tags and preserves code blocks", () => {
    const htmlEntry: TilItem = {
      ...sampleEntries[0],
      body: "Use <code>div</code> tag <span>cleanly</span>.",
    };
    const md = generatePressMarkdown([htmlEntry], "January 2025");

    expect(md).toContain("Use div tag cleanly.");
    expect(md).not.toContain("<span>");
  });
});
