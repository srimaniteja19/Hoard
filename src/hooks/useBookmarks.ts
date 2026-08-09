"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Bookmark, Collection, ContextType, KindType, SearchFilter, SortMode, ViewMode } from "@/types";
import { INITIAL_BOOKMARKS, CTX, COLLS } from "@/data/initialBookmarks";

const BOOKMARKS_STORAGE_KEY = "hoard_bookmarks_v2";
const COLLECTIONS_STORAGE_KEY = "hoard_collections_v2";

export function parseQ(q: string): SearchFilter {
  const f: SearchFilter = {
    text: [],
    ty: null,
    under: null,
    tag: null,
    lang: null,
    unread: false,
  };

  q.toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((tok) => {
      let m: RegExpMatchArray | null;
      if (tok === "is:unread") {
        f.unread = true;
      } else if ((m = tok.match(/^is:(\w+)$/))) {
        const map: Record<string, KindType> = {
          video: "VID",
          videos: "VID",
          article: "ART",
          articles: "ART",
          repo: "GIT",
          repos: "GIT",
          playlist: "PLY",
          app: "APP",
          paper: "PPR",
          docs: "DOC",
          doc: "DOC",
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
        const addSub = (c: Collection) => {
          ids.add(c.id);
          if (c.kids) c.kids.forEach(addSub);
        };
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

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // App Filter & View State
  const [query, setQuery] = useState("");
  const [coll, setColl] = useState("all");
  const [ty, setTy] = useState<KindType | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [time, setTime] = useState(180);
  const [ctx, setCtx] = useState<ContextType>("all");
  const [view, setView] = useState<ViewMode>("masonry");
  const [sort, setSort] = useState<SortMode>("recent");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [openId, setOpenId] = useState<number | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);

  // Load bookmarks & collections from localStorage on mount
  useEffect(() => {
    try {
      const savedBms = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (savedBms) {
        setBookmarks(JSON.parse(savedBms));
      } else {
        const initial = INITIAL_BOOKMARKS.map((item, i) => ({ ...item, id: i }));
        setBookmarks(initial);
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(initial));
      }

      const savedColls = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
      if (savedColls) {
        setCollections(JSON.parse(savedColls));
      } else {
        setCollections(COLLS);
        localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(COLLS));
      }
    } catch {
      const initial = INITIAL_BOOKMARKS.map((item, i) => ({ ...item, id: i }));
      setBookmarks(initial);
      setCollections(COLLS);
    }
    setIsLoaded(true);
  }, []);

  // Save bookmarks to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
      } catch (e) {
        console.error("Failed to save bookmarks to localStorage", e);
      }
    }
  }, [bookmarks, isLoaded]);

  // Save collections to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
      } catch (e) {
        console.error("Failed to save collections to localStorage", e);
      }
    }
  }, [collections, isLoaded]);

  // Compute filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    const f = parseQ(query);
    const okKinds = CTX[ctx];

    const list = bookmarks.filter((x) => {
      if (!inColl(x, coll, collections)) return false;
      if (ty && x.ty !== ty) return false;
      if (tag && x.tag !== tag) return false;
      if (unreadOnly && !x.unread) return false;
      if (f.ty && x.ty !== f.ty) return false;
      if (f.tag && !x.tag.toLowerCase().startsWith(f.tag)) return false;
      if (f.unread && !x.unread) return false;
      if (f.under && x.mins > f.under) return false;
      if (f.lang && !((x.ex.Lang || "").toLowerCase().startsWith(f.lang))) return false;
      if (!okKinds.includes(x.ty)) return false;
      if (time < 180 && x.mins > time) return false;

      if (f.text.length) {
        const hay = (
          x.t +
          " " +
          x.src +
          " " +
          x.tag +
          " " +
          x.note +
          " " +
          Object.values(x.ex).join(" ")
        ).toLowerCase();
        if (!f.text.every((t) => hay.includes(t))) return false;
      }
      return true;
    });

    if (sort === "short") {
      return [...list].sort((a, b) => a.mins - b.mins);
    }
    if (sort === "az") {
      return [...list].sort((a, b) => a.t.localeCompare(b.t));
    }
    return list;
  }, [bookmarks, collections, query, coll, ty, tag, time, ctx, sort, unreadOnly]);

  // Selection handlers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // CRUD actions for Bookmarks
  const addBookmark = useCallback((newBm: Omit<Bookmark, "id" | "when">) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    const whenStr = `${months[d.getMonth()]} ${d.getDate()}`;

    setBookmarks((prev) => {
      const maxId = prev.reduce((acc, x) => Math.max(acc, x.id), -1);
      const created: Bookmark = {
        ...newBm,
        id: maxId + 1,
        when: whenStr,
      };
      return [created, ...prev];
    });
  }, []);

  const toggleReadStatus = useCallback((id: number) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, unread: !b.unread } : b))
    );
  }, []);

  const updateNote = useCallback((id: number, note: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, note } : b))
    );
  }, []);

  const changeBookmarkCollection = useCallback((id: number, newCollId: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, coll: newCollId } : b))
    );
  }, []);

  const bulkMarkRead = useCallback(() => {
    setBookmarks((prev) =>
      prev.map((b) => (selectedIds.has(b.id) ? { ...b, unread: false } : b))
    );
    setSelectedIds(new Set());
  }, [selectedIds]);

  const bulkDelete = useCallback(() => {
    setBookmarks((prev) => prev.filter((b) => !selectedIds.has(b.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  // Folder/Collection CRUD actions
  const addCollection = useCallback(
    ({
      name,
      ic,
      c,
      parentId,
    }: {
      name: string;
      ic: string;
      c: string;
      parentId?: string;
    }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const id = parentId ? `${parentId}-${slug}` : slug || `folder-${Date.now()}`;
      const newColl: Collection = { id, name, ic, c };

      setCollections((prev) => {
        if (!parentId || parentId === "root") {
          return [...prev, newColl];
        }

        const insertChild = (list: Collection[]): Collection[] => {
          return list.map((item) => {
            if (item.id === parentId) {
              return {
                ...item,
                kids: [...(item.kids || []), newColl],
              };
            }
            if (item.kids) {
              return { ...item, kids: insertChild(item.kids) };
            }
            return item;
          });
        };

        return insertChild(prev);
      });
    },
    []
  );

  const openBookmark = useMemo(() => {
    return bookmarks.find((b) => b.id === openId) || null;
  }, [bookmarks, openId]);

  return {
    bookmarks,
    collections,
    filteredBookmarks,
    isLoaded,
    query,
    setQuery,
    coll,
    setColl,
    ty,
    setTy,
    tag,
    setTag,
    time,
    setTime,
    ctx,
    setCtx,
    view,
    setView,
    sort,
    setSort,
    unreadOnly,
    setUnreadOnly,
    selectedIds,
    toggleSelect,
    clearSelection,
    openId,
    setOpenId,
    openBookmark,
    isCaptureOpen,
    setIsCaptureOpen,
    isNewFolderOpen,
    setIsNewFolderOpen,
    addBookmark,
    toggleReadStatus,
    updateNote,
    changeBookmarkCollection,
    bulkMarkRead,
    bulkDelete,
    addCollection,
  };
}
