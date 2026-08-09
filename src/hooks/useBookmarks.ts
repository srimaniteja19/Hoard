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

// ─── Query Parser (unchanged) ─────────────────────────────────────────────────

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
  const [isCaptureOpen, setIsCaptureOpen]     = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);

  // ── Initial data load ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [bms, colls] = await Promise.all([
        apiFetch<Bookmark[]>("/api/bookmarks"),
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

  useEffect(() => { loadData(); }, [loadData]);

  // ── Live update from extension (MAIN-world executeScript → StorageEvent, 
  //    or content script → postMessage). Re-fetch from DB on either signal. ──

  useEffect(() => {
    const refresh = () => { loadData(); };

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "HOARD_BOOKMARKS_UPDATED") refresh();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadData]);

  // ── Filtered view ─────────────────────────────────────────────────────────

  const filteredBookmarks = useMemo(() => {
    const f = parseQ(query);
    const okKinds = CTX[ctx];

    const list = bookmarks.filter((x) => {
      if (!inColl(x, coll, collections))   return false;
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
        const hay = (x.t + " " + x.src + " " + x.tag + " " + x.note + " " + Object.values(x.ex).join(" ")).toLowerCase();
        if (!f.text.every((t) => hay.includes(t))) return false;
      }
      return true;
    });

    if (sort === "short") return [...list].sort((a, b) => a.mins - b.mins);
    if (sort === "az")    return [...list].sort((a, b) => a.t.localeCompare(b.t));
    return list;
  }, [bookmarks, collections, query, coll, ty, tag, time, ctx, sort, unreadOnly]);

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

  // ── CRUD: Collections ─────────────────────────────────────────────────────

  const addCollection = useCallback(async ({
    name, ic, c, parentId,
  }: { name: string; ic: string; c: string; parentId?: string }) => {
    try {
      const created = await apiFetch<Collection>("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ic, c, parentId }),
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
    addBookmark,
    toggleReadStatus,
    updateNote,
    changeBookmarkCollection,
    bulkMarkRead,
    bulkDelete,
    addCollection,
  };
}
