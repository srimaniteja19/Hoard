import { describe, expect, it } from "vitest";
import { filterFindHits, parseQ, type FindHit } from "./parseQuery";

function hit(partial: Partial<FindHit> & Pick<FindHit, "id" | "title">): FindHit {
  return {
    url: "https://example.com",
    ty: "ART",
    src: "example.com",
    tag: "general",
    ...partial,
  };
}

const library: FindHit[] = [
  hit({ id: 1, title: "Drizzle ORM guide", ty: "DOC", tag: "devops", src: "orm.drizzle.team" }),
  hit({ id: 2, title: "AI engineering notes", ty: "ART", tag: "ai", src: "example.com" }),
  hit({ id: 3, title: "hoard-shelf", ty: "GIT", tag: "devops", src: "github.com" }),
  hit({ id: 4, title: "Networking talk", ty: "VID", tag: "infra", src: "youtube.com" }),
];

describe("parseQ", () => {
  it("splits text, tags, and kind operators", () => {
    expect(parseQ("drizzle #devops is:repo")).toEqual({
      text: ["drizzle"],
      ty: "GIT",
      under: null,
      tag: "devops",
      lang: null,
      unread: false,
    });
  });
});

describe("filterFindHits", () => {
  it("substring-matches prefixes the FTS endpoint would drop", () => {
    expect(filterFindHits(library, "ai").map((item) => item.id)).toEqual([2]);
    expect(filterFindHits(library, "ho").map((item) => item.id)).toEqual([3]);
    expect(filterFindHits(library, "dri").map((item) => item.id)).toEqual([1]);
  });

  it("honors the placeholder grammar #tag and is:kind", () => {
    expect(filterFindHits(library, "#devops").map((item) => item.id)).toEqual([1, 3]);
    expect(filterFindHits(library, "is:repo").map((item) => item.id)).toEqual([3]);
    expect(filterFindHits(library, "drizzle #devops").map((item) => item.id)).toEqual([1]);
  });

  it("returns nothing for an empty or operator-only stub", () => {
    expect(filterFindHits(library, "")).toEqual([]);
    expect(filterFindHits(library, "is:")).toEqual([]);
  });
});
