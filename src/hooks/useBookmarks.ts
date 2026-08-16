"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Collection,
  ContextType,
  KindType,
  SearchFilter,
  SortMode,
  ViewMode,
} from "@/types";
import { CTX } from "@/data/initialBookmarks";
import { dischargeBookmarkAction, DischargeResult } from "@/app/actions/discharge";
import { TilType } from "@/db/schema";

// ─── Query Parser ─────────────────────────────────────────────────────────────

export function parseQ(q: string): SearchFilter {
  const f: SearchFilter = { text: [], ty: null, under: null, tag: null, lang: null, unread: false };
  q.toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((tok) => {
      let m: RegExpMatchArray | null;
      if (tok === "is:unread") {
        f.unread = true;
      } else if ((m = tok.match(/^is:(\w+)$/))) {
        const map: Record<string, KindType> = {
          video: "VID", videos: "VID", article: "ART", articles: "ART",
          repo: "GIT", repos: "GIT", playlist: "PLY", app: "APP", paper: "PPR",
          docs: "DOC", doc: "DOC",
        };
        f.ty = map[m[1]] || null;
      } else if ((m = tok.match(/^under:(\d+)m?$/))) {
        f.under = +m[1];
      } else if ((m = tok.match(/^lang:(\w+)$/))) {
        f.lang = m[1];
      } else if (tok.startsWith("#")) {
        f.tag = tok.slice(1);
      } else {
        f.text.push(tok);
      }
    });
  return f;
}

export function getMatchingCollectionIds(collections: Collection[], targetId: string): Set<string> {
  const ids = new Set<string>();
  if (targetId === "all") return ids;
  ids.add(targetId);
  const collectKids = (list: Collection[]) => {
    for (const item of list) {
      if (item.id === targetId) {
        const addSub = (c: Collection) => { ids.add(c.id); if (c.kids) c.kids.forEach(addSub); };
        if (item.kids) item.kids.forEach(addSub);
      } else if (item.kids) {
        collectKids(item.kids);
      }
    }
  };
  collectKids(collections);
  return ids;
}

export function inColl(x: Bookmark, c: string, collections: Collection[]): boolean {
  if (c === "all") return true;
  const matchIds = getMatchingCollectionIds(collections, c);
  return matchIds.has(x.coll) || (c === "eng" && x.coll.startsWith("eng-"));
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || "API error"), { status: res.status });
  }
  return res.json();
}

// Helper to flatten collections for quick lookup by ID
function flattenCollections(list: Collection[]): Collection[] {
  let acc: Collection[] = [];
  list.forEach((c) => {
    acc.push(c);
    if (c.kids) acc = acc.concat(flattenCollections(c.kids));
  });
  return acc;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBookmarks() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter / view state
  const [query, setQuery]         = useState("");
  const [coll, setColl]           = useState("all");
  const [ty, setTy]               = useState<KindType | null>(null);
  const [tag, setTag]             = useState<string | null>(null);
  const [time, setTime]           = useState(180);
  const [ctx, setCtx]             = useState<ContextType>("all");
  const [view, setView]           = useState<ViewMode>("masonry");
  const [sort, setSort]           = useState<SortMode>("recent");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [openId, setOpenId]       = useState<number | null>(null);
  
  // Modals state
  const [isCaptureOpen, setIsCaptureOpen]     = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen]           = useState(false);
  const [diffBookmark, setDiffBookmark]       = useState<Bookmark | null>(null);

  // ── Initial data load ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [bms, colls] = await Promise.all([
        apiFetch<Bookmark[]>("/api/bookmarks?includeDeleted=true"),
        apiFetch<Collection[]>("/api/collections"),
      ]);
      setBookmarks(bms);
      setCollections(colls);
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err.status === 401) {
        router.push("/login");
        return;
      }
      console.error("[useBookmarks] load failed", e);
    } finally {
      setIsLoaded(true);
    }
  }, [router]);

  // Idiomatic fetch-on-mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  // ── Live update & real-time sync listeners ───────────────────────────────

  useEffect(() => {
    const refresh = () => { loadData(); };

    // 1. Listen for postMessage (e.g. from extension content script)
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "HOARD_BOOKMARKS_UPDATED") refresh();
    };

    // 2. Listen for tab focus & visibility change (auto-refresh when switching back to tab)
    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    // 3. Cross-tab BroadcastChannel for instant real-time sync across tabs
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel("hoard_live_sync");
        channel.onmessage = (msg) => {
          if (msg.data?.type === "REFRESH_BOOKMARKS") refresh();
        };
      } catch {}
    }

    // 4. Fast active polling (3s) while tab is visible so mobile/extension saves pop up dynamically
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, 3000);

    // 5. Listen for window storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "hoard_last_sync" || e.key === "hoard_bookmarks_v2") refresh();
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timer);
      if (channel) channel.close();
    };
  }, [loadData]);

  // ── Smart Collections lookup ─────────────────────────────────────────────

  const flatColls = useMemo(() => flattenCollections(collections), [collections]);
  const activeSmartColl = useMemo(() => {
    if (coll === "all") return null;
    return flatColls.find((c) => c.id === coll && Boolean(c.query)) || null;
  }, [coll, flatColls]);

  // ── Filtered view with Chapter Decomposition & Smart Collections ─────────

  const filteredBookmarks = useMemo(() => {
    // Combine explicit query string with active Smart Collection saved query (if any)
    const effectiveQueryStr = activeSmartColl?.query
      ? `${query} ${activeSmartColl.query}`.trim()
      : query;

    const f = parseQ(effectiveQueryStr);
    const okKinds = CTX[ctx];

    // Determine list of items to consider (parents + child chapters)
    const itemsToEvaluate: Bookmark[] = [];
    
    // Group child chapters by parentId
    const chaptersByParent = new Map<number, Bookmark[]>();
    bookmarks.forEach((b) => {
      if (b.parentId) {
        const list = chaptersByParent.get(b.parentId) || [];
        list.push(b);
        chaptersByParent.set(b.parentId, list);
      }
    });

    bookmarks.forEach((b) => {
      if (b.isDeleted) return; // Deleted items only appear in the Archive Vault view
      if (!b.unread) return; // Read items are archived and appear in the Archive Vault
      // Top level items
      if (!b.parentId) {
        const kids = (chaptersByParent.get(b.id) || []).filter((k) => !k.isDeleted && k.unread);
        const fullItem = { ...b, chapters: kids };

        if (time < 180 && b.mins > time) {
          // Parent is too long for current time filter! Surface fits child chapters instead
          kids.forEach((chap) => {
            if (chap.mins <= time) {
              itemsToEvaluate.push({
                ...chap,
                parentTitle: b.t,
              });
            }
          });
        } else {
          itemsToEvaluate.push(fullItem);
        }
      }
    });

    const list = itemsToEvaluate.filter((x) => {
      if (!activeSmartColl && !inColl(x, coll, collections)) return false;
      if (ty && x.ty !== ty)               return false;
      if (tag && x.tag !== tag)            return false;
      if (unreadOnly && !x.unread)         return false;
      if (f.ty && x.ty !== f.ty)           return false;
      if (f.tag && !x.tag.toLowerCase().startsWith(f.tag)) return false;
      if (f.unread && !x.unread)           return false;
      if (f.under && x.mins > f.under)     return false;
      if (f.lang && !((x.ex.Lang || "").toLowerCase().startsWith(f.lang))) return false;
      if (!okKinds.includes(x.ty))         return false;
      if (time < 180 && x.mins > time)     return false;
      if (f.text.length) {
        const hay = (x.t + " " + x.src + " " + x.tag + " " + x.note + " " + (x.parentTitle || "") + " " + Object.entries(x.ex).filter(([, v]) => typeof v === "string").map(([, v]) => v).join(" ")).toLowerCase();
        if (!f.text.every((t) => hay.includes(t))) return false;
      }
      return true;
    });

    if (sort === "short") return [...list].sort((a, b) => a.mins - b.mins);
    if (sort === "az")    return [...list].sort((a, b) => a.t.localeCompare(b.t));
    return list;
  }, [bookmarks, collections, query, coll, ty, tag, time, ctx, sort, unreadOnly, activeSmartColl]);

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── CRUD: Bookmarks ───────────────────────────────────────────────────────

  const addBookmark = useCallback(async (newBm: Omit<Bookmark, "id" | "when">) => {
    try {
      const created = await apiFetch<Bookmark>("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBm),
      });
      setBookmarks((prev) => [created, ...prev]);
    } catch (e) {
      console.error("[addBookmark]", e);
    }
  }, []);

  const addChapter = useCallback(
    async (
      parentId: number,
      chapData: { t: string; mins: number; url: string; startTimeSec?: number }
    ) => {
      const parent = bookmarks.find((b) => b.id === parentId);
      if (!parent) return;
      const newBm: Omit<Bookmark, "id" | "when"> = {
        t: chapData.t,
        ty: parent.ty,
        src: parent.src,
        url: chapData.url,
        mins: chapData.mins,
        tag: parent.tag,
        coll: parent.coll,
        unread: true,
        ex: parent.ex,
        note: `Chapter of ${parent.t}`,
        parentId: parent.id,
        parentTitle: parent.t,
        startTimeSec: chapData.startTimeSec || 0,
      };

      try {
        const created = await apiFetch<Bookmark>("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newBm),
        });
        setBookmarks((prev) => [...prev, created]);
      } catch (e) {
        console.error("[addChapter]", e);
      }
    },
    [bookmarks]
  );

  const toggleReadStatus = useCallback(async (id: number) => {
    // Optimistic update
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, unread: !b.unread } : b))
    );
    try {
      const bm = bookmarks.find((b) => b.id === id);
      await apiFetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unread: !bm?.unread }),
      });
    } catch (e) {
      console.error("[toggleReadStatus]", e);
      // Revert on failure
      setBookmarks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, unread: !b.unread } : b))
      );
    }
  }, [bookmarks]);

  const updateNote = useCallback(async (id: number, note: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, note } : b))
    );
    try {
      await apiFetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
    } catch (e) {
      console.error("[updateNote]", e);
    }
  }, []);

  const changeBookmarkCollection = useCallback(async (id: number, newCollId: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, coll: newCollId } : b))
    );
    try {
      await apiFetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coll: newCollId }),
      });
    } catch (e) {
      console.error("[changeBookmarkCollection]", e);
    }
  }, []);

  const changeBookmarkKind = useCallback(async (id: number, newKind: KindType) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ty: newKind } : b))
    );
    try {
      await apiFetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ty: newKind }),
      });
    } catch (e) {
      console.error("[changeBookmarkKind]", e);
    }
  }, []);

  const bulkMarkRead = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setBookmarks((prev) =>
      prev.map((b) => (selectedIds.has(b.id) ? { ...b, unread: false } : b))
    );
    setSelectedIds(new Set());
    try {
      await apiFetch("/api/bookmarks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, unread: false }),
      });
    } catch (e) {
      console.error("[bulkMarkRead]", e);
    }
  }, [selectedIds]);

  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setBookmarks((prev) => prev.filter((b) => !selectedIds.has(b.id)));
    setSelectedIds(new Set());
    try {
      await apiFetch("/api/bookmarks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch (e) {
      console.error("[bulkDelete]", e);
    }
  }, [selectedIds]);

  // ── Discharge: turn a queued bookmark into the TIL entry it produced ───────
  // Deliberately not optimistic here — the user is mid-compose in a modal, so
  // there's nothing to visually roll back yet. The FLIP/optimistic/counter-
  // pulse treatment lands in Phase 7 on top of this correctness-first write.

  const dischargeBookmark = useCallback(
    async (bookmarkId: number, input: { type: TilType; body: string; tags: string[] }): Promise<DischargeResult> => {
      const result = await dischargeBookmarkAction({ bookmarkId, ...input });
      setBookmarks((prev) =>
        prev.map((b) => (b.id === bookmarkId ? { ...b, unread: false } : b))
      );
      return result;
    },
    []
  );

  // ── Content Drift Check ───────────────────────────────────────────────────

  const checkDrift = useCallback(async (bookmarkId: number) => {
    try {
      const res = await apiFetch<{
        success: boolean;
        driftStatus: "clean" | "changed" | "404_preserved";
        driftPercent: number;
        archivedText: string;
      }>("/api/drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkId }),
      });

      if (res.success) {
        setBookmarks((prev) =>
          prev.map((b) =>
            b.id === bookmarkId
              ? {
                  ...b,
                  driftStatus: res.driftStatus,
                  driftPercent: res.driftPercent,
                  archivedText: res.archivedText,
                  lastFetchedAt: new Date().toISOString(),
                }
              : b
          )
        );
      }
    } catch (e) {
      console.error("[checkDrift]", e);
    }
  }, []);

  // ── Topic Clusters Merge ──────────────────────────────────────────────────

  const mergeCluster = useCallback(async (bookmarkIds: number[], clusterTitle: string) => {
    const clusterId = `cluster-${Date.now()}`;
    setBookmarks((prev) =>
      prev.map((b) =>
        bookmarkIds.includes(b.id) ? { ...b, clusterId, clusterTitle } : b
      )
    );
    try {
      await Promise.all(
        bookmarkIds.map((id) =>
          apiFetch(`/api/bookmarks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clusterId, clusterTitle }),
          })
        )
      );
    } catch (e) {
      console.error("[mergeCluster]", e);
    }
  }, []);

  // ── CRUD: Collections ─────────────────────────────────────────────────────

  const addCollection = useCallback(async ({
    name, ic, c, parentId, query: savedQuery,
  }: { name: string; ic: string; c: string; parentId?: string; query?: string }) => {
    try {
      const created = await apiFetch<Collection>("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ic, c, parentId, query: savedQuery }),
      });

      setCollections((prev) => {
        if (!parentId || parentId === "root") return [...prev, created];
        const insertChild = (list: Collection[]): Collection[] =>
          list.map((item) =>
            item.id === parentId
              ? { ...item, kids: [...(item.kids || []), created] }
              : { ...item, kids: item.kids ? insertChild(item.kids) : item.kids }
          );
        return insertChild(prev);
      });
    } catch (e) {
      console.error("[addCollection]", e);
    }
  }, []);

  // ── Restore / Purge (Archive & Trash) ────────────────────────────────────

  const restoreBookmark = useCallback(async (id: number) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isDeleted: false, deletedAt: null, unread: true } : b))
    );
    try {
      await apiFetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true, unread: true }),
      });
    } catch (e) {
      console.error("[restoreBookmark]", e);
    }
  }, []);

  const purgeBookmark = useCallback(async (id: number) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    try {
      await apiFetch(`/api/bookmarks/${id}?permanent=true`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("[purgeBookmark]", e);
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const openBookmark = useMemo(
    () => bookmarks.find((b) => b.id === openId) || null,
    [bookmarks, openId]
  );

  return {
    bookmarks,
    collections,
    filteredBookmarks,
    isLoaded,
    query,     setQuery,
    coll,      setColl,
    ty,        setTy,
    tag,       setTag,
    time,      setTime,
    ctx,       setCtx,
    view,      setView,
    sort,      setSort,
    unreadOnly, setUnreadOnly,
    selectedIds,
    toggleSelect,
    clearSelection,
    openId,
    setOpenId,
    openBookmark,
    isCaptureOpen,   setIsCaptureOpen,
    isNewFolderOpen, setIsNewFolderOpen,
    isDiffOpen,      setIsDiffOpen,
    diffBookmark,    setDiffBookmark,
    addBookmark,
    addChapter,
    toggleReadStatus,
    updateNote,
    changeBookmarkCollection,
    changeBookmarkKind,
    bulkMarkRead,
    bulkDelete,
    addCollection,
    checkDrift,
    mergeCluster,
    dischargeBookmark,
    restoreBookmark,
    purgeBookmark,
  };
}
