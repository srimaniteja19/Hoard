import { describe, expect, it } from "vitest";
import type { AskShelfItem, AskUIMessage } from "./askLibrary";
import {
  assignProvenance,
  nextCardsFromShelf,
  notesFromShelf,
  plainAskText,
  shelfFromAskMessage,
  splitProse,
} from "./askDesk";

function hit(partial: Partial<AskShelfItem> & Pick<AskShelfItem, "ownerId" | "title">): AskShelfItem {
  return {
    ownerType: "bookmark",
    kind: "DOC",
    snippet: "",
    note: "",
    url: "https://example.com",
    href: "https://example.com",
    thin: false,
    ...partial,
  };
}

describe("splitProse", () => {
  it("breaks on sentence ends", () => {
    expect(splitProse("The bus was the bottleneck. Thermals killed it.")).toEqual([
      "The bus was the bottleneck.",
      "Thermals killed it.",
    ]);
  });
});

describe("assignProvenance", () => {
  it("pins a sentence to the shelf card that shares its words", () => {
    const shelf = [
      hit({
        ownerId: "1",
        title: "GPU SSD experiment",
        snippet: "On-package SSDs never beat a normal NVMe path because of thermals.",
      }),
      hit({ ownerId: "2", title: "Rate limiting", snippet: "token bucket versus sliding window" }),
    ];
    const spans = assignProvenance(
      "Thermals and the NVMe path killed on-package SSDs. Token buckets are a different story.",
      shelf
    );
    expect(spans[0]?.citeIndex).toBe(0);
    expect(spans[1]?.citeIndex).toBe(1);
  });

  it("leaves unrelated prose unmarked", () => {
    const spans = assignProvenance("The sky is usually blue at noon.", [
      hit({ ownerId: "1", title: "Rate limiting", snippet: "token bucket" }),
    ]);
    expect(spans[0]?.citeIndex).toBeNull();
  });
});

describe("notesFromShelf / nextCardsFromShelf", () => {
  it("returns only cards that carry a personal note", () => {
    expect(
      notesFromShelf([
        hit({ ownerId: "1", title: "A", note: "  HNSW is the knob.  " }),
        hit({ ownerId: "2", title: "B", note: "" }),
      ]).map((item) => item.ownerId)
    ).toEqual(["1"]);
  });

  it("prefers unused shelf cards for follow-ups", () => {
    const shelf = [
      hit({
        ownerId: "1",
        title: "GPU SSD experiment",
        snippet: "On-package SSDs never beat NVMe because of thermals.",
      }),
      hit({ ownerId: "2", title: "pgvector HNSW", snippet: "ef_construction is the real knob" }),
      hit({ ownerId: "3", title: "Zod first", snippet: "copy the schema, do not install a kit" }),
    ];
    const cards = nextCardsFromShelf(
      "why didn't SSDs inside the GPU work?",
      "Thermals and the NVMe path killed on-package SSDs.",
      shelf
    );
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((card) => /pgvector|Zod/i.test(card.from))).toBe(true);
    expect(cards.every((card) => card.question.endsWith("?"))).toBe(true);
  });
});

describe("shelfFromAskMessage", () => {
  it("keeps notes and drops incomplete hits", () => {
    const message = {
      id: "a",
      role: "assistant",
      parts: [
        {
          type: "data-shelf",
          data: [
            {
              ownerType: "bookmark",
              ownerId: "12",
              title: "pgvector",
              href: "https://x.com",
              kind: "GIT",
              snippet: "HNSW",
              note: "ef_construction",
              url: "https://x.com",
              thin: false,
            },
            { ownerType: "bookmark", ownerId: "9", title: "", href: "https://y.com", kind: "ART" },
          ],
        },
      ],
    } as AskUIMessage;
    expect(shelfFromAskMessage(message)).toEqual([
      {
        ownerType: "bookmark",
        ownerId: "12",
        title: "pgvector",
        href: "https://x.com",
        kind: "GIT",
        snippet: "HNSW",
        note: "ef_construction",
        url: "https://x.com",
        thin: false,
      },
    ]);
  });
});

describe("plainAskText", () => {
  it("strips markdown markers", () => {
    expect(plainAskText("**NVMe** beat the `SSD` path.")).toBe("NVMe beat the SSD path.");
  });
});
