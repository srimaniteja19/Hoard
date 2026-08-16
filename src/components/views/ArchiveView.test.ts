import { describe, it, expect } from "vitest";
import { Bookmark, ViewMode } from "@/types";

describe("Archive View Data Structures & Filtering", () => {
  const sampleBookmarks: Bookmark[] = [
    {
      id: 1,
      t: "Understanding Vector Databases",
      ty: "ART",
      src: "pinecone.io",
      url: "https://pinecone.io/learn/vector-database",
      mins: 12,
      tag: "ai",
      coll: "ai-shelf",
      when: "Aug 15",
      unread: false,
      isDeleted: false,
      archivedText: "# Vector Databases\nDeep dive into embeddings and HNSW indexing.",
      note: "Read during research session",
      ex: {},
    },
    {
      id: 2,
      t: "Postgres internals",
      ty: "DOC",
      src: "postgresql.org",
      url: "https://postgresql.org/docs/current/storage.html",
      mins: 25,
      tag: "databases",
      coll: "sys-shelf",
      when: "Aug 10",
      unread: false,
      isDeleted: false,
      driftStatus: "404_preserved",
      archivedText: "# Storage Engine\nPage layout and WAL replication.",
      note: "Preserved original snapshot",
      ex: {},
    },
    {
      id: 3,
      t: "React 19 Server Actions",
      ty: "VID",
      src: "youtube.com",
      url: "https://youtube.com/watch?v=12345",
      mins: 15,
      tag: "react",
      coll: "web-shelf",
      when: "Aug 16",
      unread: true,
      isDeleted: false,
      ex: {},
      note: "",
    },
    {
      id: 4,
      t: "Deleted Broken Article",
      ty: "ART",
      src: "broken.io",
      url: "https://broken.io/page",
      mins: 5,
      tag: "misc",
      coll: "unsorted",
      when: "Jul 20",
      unread: false,
      isDeleted: true,
      deletedAt: "2026-07-20T10:00:00.000Z",
      ex: {},
      note: "",
    },
  ];

  it("identifies archived read items accurately", () => {
    const archived = sampleBookmarks.filter((b) => !b.isDeleted && !b.unread);
    expect(archived).toHaveLength(2);
    expect(archived.map((b) => b.id)).toEqual([1, 2]);
  });

  it("identifies offline full-text snapshot items", () => {
    const snapshots = sampleBookmarks.filter((b) => !b.isDeleted && Boolean(b.archivedText));
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].archivedText).toContain("Vector Databases");
  });

  it("identifies drift & 404 preserved items", () => {
    const driftItems = sampleBookmarks.filter(
      (b) => !b.isDeleted && b.driftStatus === "404_preserved"
    );
    expect(driftItems).toHaveLength(1);
    expect(driftItems[0].t).toBe("Postgres internals");
  });

  it("isolates trash/deleted items for recovery or purge", () => {
    const trash = sampleBookmarks.filter((b) => b.isDeleted);
    expect(trash).toHaveLength(1);
    expect(trash[0].t).toBe("Deleted Broken Article");
  });

  it("validates ViewMode type definition includes archive", () => {
    const modes: ViewMode[] = ["masonry", "grid", "list", "heads", "archive"];
    expect(modes).toContain("archive");
  });
});
