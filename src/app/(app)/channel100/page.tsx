"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { AppPage } from "@/components/chrome/AppPage";
import {
  Channel100Store,
  ChannelMediaItem,
  MediaKind,
  ShowStatus,
  ViewFilterState,
  StatusFilter,
  ShowUserRecord,
  CustomMediaItem,
} from "@/lib/channel100/types";
import {
  ALL_ITEMS,
  CATALOGS,
  customItemToChannelItem,
} from "@/lib/channel100/data";
import {
  VERIFIED_IMDB_TV_CATALOG,
  VERIFIED_LETTERBOXD_FILM_CATALOG,
} from "@/lib/channel100/curatedCanons";
import { INITIAL_VGF_ITEMS } from "@/lib/channel100/verygoodfilms";
import {
  loadStore,
  saveStore,
  loadSavedView,
  saveViewSettings,
  loadCachedVgfCatalog,
  saveCachedVgfCatalog,
  loadCachedLiveCatalogs,
  saveCachedLiveCatalogs,
  buildPersonalLogItems,
  normalizePersonalLogKey,
  getMediaRecord,
  computeStats,
  filterAndSortMedia,
  formatListForClipboard,
  exportBackup,
  importBackup,
} from "@/lib/channel100/storage";
import { playSound } from "@/lib/sound";

import { Channel100Header } from "@/components/channel100/Channel100Header";
import { Channel100Hero } from "@/components/channel100/Channel100Hero";
import { Channel100Controls } from "@/components/channel100/Channel100Controls";
import { Channel100Grid } from "@/components/channel100/Channel100Grid";
import { Channel100Stats } from "@/components/channel100/Channel100Stats";
import { Channel100Footer } from "@/components/channel100/Channel100Footer";
import { Channel100Modal } from "@/components/channel100/Channel100Modal";
import { Channel100Toast } from "@/components/channel100/Channel100Toast";
import { Channel100LogModal } from "@/components/channel100/Channel100LogModal";
import { Channel100TriageModal } from "@/components/channel100/Channel100TriageModal";

const DEFAULT_STORE: Channel100Store = { shows: {}, custom: {}, updated: 0 };

const DEFAULT_FILTERS: ViewFilterState = {
  cat: "tv",
  status: "all",
  genre: "all",
  where: "all",
  len: "all",
  lang: "all",
  customKind: "all",
  sort: "rank",
  q: "",
  layout: "grid",
};

export default function Channel100Page() {
  const [store, setStore] = useState<Channel100Store>(DEFAULT_STORE);
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [editingCustomItem, setEditingCustomItem] =
    useState<CustomMediaItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ViewFilterState>(DEFAULT_FILTERS);

  // Live-synced catalogs: IMDb Top 250 TV, Letterboxd 500 Films, and Very Good Films
  const [tvItems, setTvItems] = useState<ChannelMediaItem[]>(
    VERIFIED_IMDB_TV_CATALOG
  );
  const [filmItems, setFilmItems] = useState<ChannelMediaItem[]>(
    VERIFIED_LETTERBOXD_FILM_CATALOG
  );
  const [vgfItems, setVgfItems] = useState<ChannelMediaItem[]>(INITIAL_VGF_ITEMS);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const trackerItems = useMemo(
    () => buildPersonalLogItems(store, [tvItems, filmItems, vgfItems]),
    [store, tvItems, filmItems, vgfItems]
  );

  const catalog = CATALOGS[filters.cat] || CATALOGS.tv;
  const catalogItems = useMemo(() => {
    if (filters.cat === "tv") return tvItems;
    if (filters.cat === "film") return filmItems;
    if (filters.cat === "vgf") return vgfItems;
    return trackerItems;
  }, [filters.cat, tvItems, filmItems, vgfItems, trackerItems]);

  const itemLookup = useMemo(() => {
    const map: Record<string, ChannelMediaItem> = { ...ALL_ITEMS };
    tvItems.forEach((i) => {
      map[i.id] = i;
    });
    filmItems.forEach((i) => {
      map[i.id] = i;
    });
    vgfItems.forEach((i) => {
      map[i.id] = i;
    });
    return map;
  }, [tvItems, filmItems, vgfItems]);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2400);
  }, []);

  // Sync live catalogs (IMDb Top 250 TV, Letterboxd 500, and Very Good Films)
  const handleSyncAllLive = useCallback(
    async (force = false) => {
      setIsSyncing(true);
      try {
        const qs = force ? "?force=1" : "";
        const [catRes, vgfRes] = await Promise.allSettled([
          fetch(`/api/channel100/catalogs${qs}`),
          fetch(`/api/channel100/verygoodfilms${qs}`),
        ]);

        let nextTs = Date.now();
        let tvCount = tvItems.length;
        let filmCount = filmItems.length;
        let vgfCount = vgfItems.length;

        if (catRes.status === "fulfilled" && catRes.value.ok) {
          const data = await catRes.value.json();
          if (Array.isArray(data.tv) && data.tv.length > 0) {
            setTvItems(data.tv);
            tvCount = data.tv.length;
          }
          if (Array.isArray(data.film) && data.film.length > 0) {
            setFilmItems(data.film);
            filmCount = data.film.length;
          }
          nextTs = Number(data.syncedAt) || nextTs;
          saveCachedLiveCatalogs(
            data.tv || tvItems,
            data.film || filmItems,
            nextTs
          );
        }

        if (vgfRes.status === "fulfilled" && vgfRes.value.ok) {
          const vgfData = await vgfRes.value.json();
          if (Array.isArray(vgfData.items) && vgfData.items.length > 0) {
            setVgfItems(vgfData.items);
            vgfCount = vgfData.items.length;
            saveCachedVgfCatalog(
              vgfData.items,
              Number(vgfData.syncedAt) || nextTs,
              vgfData.source
            );
          }
        }

        setSyncedAt(nextTs);
        if (force) {
          playSound.promote();
          triggerToast(
            `Synced ${tvCount} TV series, ${filmCount} Letterboxd films & ${vgfCount} Very Good Films`
          );
        }
      } catch {
        if (force) {
          playSound.bury();
          triggerToast("Live sync unavailable — using cached lists.");
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [tvItems, filmItems, vgfItems, triggerToast]
  );

  const queueRemoteSync = useCallback(
    (id: string, record: ShowUserRecord, customMeta?: CustomMediaItem) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch("/api/channel100", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              id,
              record,
              customMeta,
            }),
          });
        } catch {
          // Silently preserve local storage
        }
      }, 400);
    },
    []
  );

  const updateMediaRecord = useCallback(
    (id: string, patch: Partial<{ s: ShowStatus; r: number; n: string }>) => {
      setStore((prev) => {
        const now = Date.now();
        const cur: ShowUserRecord = {
          ...getMediaRecord(prev, id),
          ...patch,
          updatedAt: now,
        };
        const newShows = { ...prev.shows };

        if (!cur.s && !cur.r && !cur.n && !id.startsWith("c_")) {
          delete newShows[id];
        } else {
          newShows[id] = cur;
        }

        let nextCustom = prev.custom;
        if (prev.custom && prev.custom[id]) {
          nextCustom = {
            ...prev.custom,
            [id]: {
              ...prev.custom[id],
              status: cur.s || prev.custom[id].status,
              rating: cur.r !== undefined ? cur.r : prev.custom[id].rating,
              notes: cur.n !== undefined ? cur.n : prev.custom[id].notes,
              updatedAt: now,
            },
          };
        }

        const nextStore: Channel100Store = {
          shows: newShows,
          custom: nextCustom,
          updated: now,
        };
        saveStore(nextStore);
        queueRemoteSync(id, cur, nextCustom ? nextCustom[id] : undefined);
        return nextStore;
      });
    },
    [queueRemoteSync]
  );

  const handleSaveCustomItem = useCallback(
    (item: CustomMediaItem) => {
      const normKey = normalizePersonalLogKey(item.title);
      const matchedCanonical =
        tvItems.find((s) => normalizePersonalLogKey(s.title) === normKey) ||
        filmItems.find((f) => normalizePersonalLogKey(f.title) === normKey) ||
        vgfItems.find((v) => normalizePersonalLogKey(v.title) === normKey);

      setStore((prev) => {
        const nextCustom = { ...(prev.custom || {}) };
        const nextShows = { ...prev.shows };

        // Deduplicate: if another custom entry shares the same normalized title, reuse its id or remove the duplicate
        const duplicateCustom = Object.values(nextCustom).find(
          (c) => c.id !== item.id && normalizePersonalLogKey(c.title) === normKey
        );
        const targetId = duplicateCustom ? duplicateCustom.id : item.id;
        const savedItem: CustomMediaItem = { ...item, id: targetId };

        nextCustom[targetId] = savedItem;
        if (duplicateCustom && item.id !== targetId) {
          delete nextCustom[item.id];
          delete nextShows[item.id];
        }

        nextShows[targetId] = {
          s: savedItem.status || "watching",
          r: savedItem.rating || 0,
          n: savedItem.notes || "",
          updatedAt: savedItem.updatedAt,
        };

        if (matchedCanonical) {
          const prevCanon = nextShows[matchedCanonical.id] || {};
          nextShows[matchedCanonical.id] = {
            s: savedItem.status || prevCanon.s || "watching",
            r: savedItem.rating || prevCanon.r || 0,
            n: savedItem.notes || prevCanon.n || "",
            updatedAt: savedItem.updatedAt,
          };
        }

        const nextStore: Channel100Store = {
          shows: nextShows,
          custom: nextCustom,
          updated: Date.now(),
        };
        saveStore(nextStore);

        fetch("/api/channel100", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id: targetId,
            record: nextShows[targetId],
            customMeta: savedItem,
          }),
        }).catch(() => {});

        if (matchedCanonical) {
          fetch("/api/channel100", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              id: matchedCanonical.id,
              record: nextShows[matchedCanonical.id],
            }),
          }).catch(() => {});
        }

        return nextStore;
      });

      setFilters((prev) => {
        if (prev.cat === "tracker") return prev;
        const next: ViewFilterState = {
          ...prev,
          cat: "tracker",
          status: "all",
          genre: "all",
          where: "all",
          len: "all",
          lang: "all",
          customKind: "all",
          sort: "recent",
          q: "",
        };
        saveViewSettings({ layout: next.layout, sort: next.sort, cat: next.cat });
        return next;
      });

      playSound.promote();
      triggerToast(
        matchedCanonical
          ? `Logged ${item.title} & synced with #${matchedCanonical.rank}`
          : `Logged: ${item.title}`
      );
      setIsLogModalOpen(false);
      setEditingCustomItem(null);
    },
    [tvItems, filmItems, vgfItems, triggerToast]
  );

  const handleDeleteCustomItem = useCallback(
    (id: string) => {
      setStore((prev) => {
        const nextCustom = { ...(prev.custom || {}) };
        delete nextCustom[id];

        const nextShows = { ...prev.shows };
        delete nextShows[id];

        const nextStore: Channel100Store = {
          shows: nextShows,
          custom: Object.keys(nextCustom).length ? nextCustom : undefined,
          updated: Date.now(),
        };
        saveStore(nextStore);

        fetch("/api/channel100", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            id,
          }),
        }).catch(() => {});

        return nextStore;
      });

      playSound.bury();
      triggerToast("Removed title from personal log");
      setActiveModalId(null);
    },
    [triggerToast]
  );

  const handleIncrementEpisode = useCallback(
    (id: string) => {
      setStore((prev) => {
        if (!prev.custom || !prev.custom[id]) return prev;
        const currentCustom = { ...prev.custom[id] };
        if (currentCustom.kind === "film") return prev;
        const nextEp = (currentCustom.episode || 1) + 1;
        currentCustom.episode = nextEp;

        let nextStatus = currentCustom.status || "watching";
        if (
          currentCustom.totalEpisodes &&
          nextEp >= currentCustom.totalEpisodes
        ) {
          nextStatus = "seen";
          currentCustom.status = "seen";
        }

        const nextCustom = { ...prev.custom, [id]: currentCustom };
        const nextShows = {
          ...prev.shows,
          [id]: {
            ...getMediaRecord(prev, id),
            s: nextStatus,
          },
        };

        const nextStore: Channel100Store = {
          shows: nextShows,
          custom: nextCustom,
          updated: Date.now(),
        };
        saveStore(nextStore);

        fetch("/api/channel100", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id,
            record: nextShows[id],
            customMeta: currentCustom,
          }),
        }).catch(() => {});

        playSound.fileIt();
        triggerToast(
          nextStatus === "seen"
            ? `Completed ${currentCustom.title} (${nextEp}/${currentCustom.totalEpisodes})`
            : `${currentCustom.title}: Ep ${nextEp}${
                currentCustom.totalEpisodes
                  ? ` of ${currentCustom.totalEpisodes}`
                  : ""
              }`
        );

        return nextStore;
      });
    },
    [triggerToast]
  );

  const handleEditCustom = useCallback(
    (id: string) => {
      if (store.custom && store.custom[id]) {
        setEditingCustomItem(store.custom[id]);
        setActiveModalId(null);
        setIsLogModalOpen(true);
      }
    },
    [store.custom]
  );

  // Hydrate local store, cached live catalogs, and remote DB on mount
  useEffect(() => {
    let isCancelled = false;

    try {
      const localStore = loadStore();
      if (
        localStore &&
        (Object.keys(localStore.shows || {}).length > 0 ||
          Object.keys(localStore.custom || {}).length > 0)
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStore(localStore);
      }

      const savedView = loadSavedView();
      const hash = (window.location.hash || "").slice(1);
      const initialCat: MediaKind =
        hash === "film" || hash === "tv" || hash === "vgf" || hash === "tracker"
          ? (hash as MediaKind)
          : savedView.cat === "film" ||
            savedView.cat === "vgf" ||
            savedView.cat === "tracker"
          ? (savedView.cat as MediaKind)
          : "tv";
      setFilters((prev) => ({
        ...prev,
        ...savedView,
        cat: initialCat,
        layout: "grid",
      }));

      const cachedLive = loadCachedLiveCatalogs();
      if (cachedLive) {
        setTvItems(cachedLive.tv);
        setFilmItems(cachedLive.film);
        setSyncedAt(cachedLive.syncedAt);
      }

      const cachedVgf = loadCachedVgfCatalog();
      if (cachedVgf) {
        setVgfItems(cachedVgf.items);
        if (!cachedLive) setSyncedAt(cachedVgf.syncedAt);
      }

      const needsLiveRefresh =
        !cachedLive ||
        !cachedVgf ||
        Date.now() - cachedLive.syncedAt > 60 * 60 * 1000;
      if (needsLiveRefresh) {
        handleSyncAllLive(false);
      }
    } catch (e) {
      console.warn("[Channel100] Failed to hydrate local settings:", e);
    }

    async function initDatabaseSync() {
      try {
        const res = await fetch("/api/channel100");
        if (!res.ok) return;

        const data = await res.json();
        if (data.authenticated && data.store) {
          const serverStore = data.store as Channel100Store;
          const localStore = loadStore();
          const hasLocalItems =
            Object.keys(localStore.shows || {}).length > 0 ||
            Object.keys(localStore.custom || {}).length > 0;
          const hasServerItems =
            Object.keys(serverStore.shows || {}).length > 0 ||
            Object.keys(serverStore.custom || {}).length > 0;

          if (hasLocalItems) {
            const syncRes = await fetch("/api/channel100", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "sync",
                shows: localStore.shows,
                custom: localStore.custom,
              }),
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (syncData.store && !isCancelled) {
                setStore(syncData.store);
                saveStore(syncData.store);
              }
            }
          } else if (hasServerItems && !isCancelled) {
            setStore(serverStore);
            saveStore(serverStore);
          }
        }
      } catch {
        // Fallback to local storage silently
      }
    }

    initDatabaseSync();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStatus = useCallback(
    (id: string, targetStatus: ShowStatus) => {
      const curStatus = getMediaRecord(store, id).s;
      const nextStatus = curStatus === targetStatus ? "" : targetStatus;
      updateMediaRecord(id, { s: nextStatus });

      const item =
        itemLookup[id] ||
        (store.custom && store.custom[id]
          ? customItemToChannelItem(store.custom[id])
          : null);
      const itemTitle = item ? item.title : id;

      if (nextStatus === "") {
        playSound.pop();
        triggerToast(`Cleared: ${itemTitle}`);
      } else if (nextStatus === "seen") {
        playSound.promote();
        triggerToast(
          filters.cat === "tracker"
            ? `✓ Seen: ${itemTitle}`
            : `✓ Seen & synced to Personal Log: ${itemTitle}`
        );
      } else if (nextStatus === "watching") {
        playSound.click();
        triggerToast(`▶ Watching: ${itemTitle}`);
      } else if (nextStatus === "want") {
        playSound.click();
        triggerToast(`+ Want: ${itemTitle}`);
      }
    },
    [store, itemLookup, filters.cat, updateMediaRecord, triggerToast]
  );

  const handleSetRating = useCallback(
    (id: string, rating: number) => {
      updateMediaRecord(id, { r: rating });
      playSound.fileIt();
      const item =
        itemLookup[id] ||
        (store.custom && store.custom[id]
          ? customItemToChannelItem(store.custom[id])
          : null);
      const itemTitle = item ? item.title : id;
      if (rating > 0) {
        triggerToast(`Rated ${itemTitle}: ${"★".repeat(rating)}`);
      } else {
        triggerToast(`Cleared rating for ${itemTitle}`);
      }
    },
    [store.custom, itemLookup, updateMediaRecord, triggerToast]
  );

  const handleUpdateNotes = useCallback(
    (id: string, notes: string) => {
      updateMediaRecord(id, { n: notes });
    },
    [updateMediaRecord]
  );

  const handleSelectCat = useCallback((cat: MediaKind) => {
    playSound.click(0.3);
    setFilters((prev) => {
      if (prev.cat === cat) return prev;
      const next: ViewFilterState = {
        ...prev,
        cat,
        status: "all",
        genre: "all",
        where: "all",
        len: "all",
        lang: "all",
        customKind: "all",
        sort: cat === "tracker" ? "recent" : "rank",
        q: "",
      };
      saveViewSettings({ layout: next.layout, sort: next.sort, cat: next.cat });
      return next;
    });
  }, []);

  const handleSurpriseMe = useCallback(() => {
    playSound.pop();
    let pool = catalogItems.filter(
      (item) => getMediaRecord(store, item.id).s === "want"
    );
    if (!pool.length) {
      pool = catalogItems.filter((item) => !getMediaRecord(store, item.id).s);
    }
    if (!pool.length) {
      pool = catalogItems;
    }
    if (!pool.length) {
      triggerToast("No titles available to recommend.");
      return;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setActiveModalId(chosen.id);
    triggerToast(`Random Pick: #${chosen.rank} ${chosen.title}`);
  }, [catalogItems, store, triggerToast]);

  const handleCopyList = useCallback(async () => {
    playSound.copy();
    const formatted = formatListForClipboard(store);
    try {
      await navigator.clipboard.writeText(formatted);
      triggerToast("Copied your watch lists to clipboard");
    } catch {
      triggerToast("Clipboard access denied.");
    }
  }, [store, triggerToast]);

  const handleExport = useCallback(() => {
    playSound.click();
    exportBackup(store);
    triggerToast("Downloaded Channel 100 backup JSON");
  }, [store, triggerToast]);

  const handleImport = useCallback(
    (file: File) => {
      const hasExisting =
        Object.keys(store.shows || {}).length > 0 ||
        Object.keys(store.custom || {}).length > 0;
      if (
        hasExisting &&
        typeof window !== "undefined" &&
        !window.confirm(
          "Importing this backup JSON will replace your current Channel 100 list. Continue?"
        )
      ) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        const res = importBackup(text);
        if (res.success) {
          const reloaded = loadStore();
          setStore(reloaded);
          playSound.promote();
          triggerToast(`Restored ${res.count} titles from backup`);

          fetch("/api/channel100", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "sync",
              shows: reloaded.shows,
              custom: reloaded.custom,
            }),
          }).catch(() => {});
        } else {
          playSound.bury();
          triggerToast(`Import failed: ${res.error || "Malformed file"}`);
        }
      };
      reader.readAsText(file);
    },
    [store.custom, store.shows, triggerToast]
  );

  const handleUpdateFilters = useCallback(
    (patch: Partial<ViewFilterState>) => {
      playSound.click(0.2);
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        saveViewSettings({
          layout: next.layout,
          sort: next.sort,
          cat: next.cat,
        });
        return next;
      });
    },
    []
  );

  const handleSelectStatusFilter = useCallback((status: StatusFilter) => {
    playSound.click();
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const tvStats = useMemo(() => computeStats(tvItems, store), [tvItems, store]);
  const filmStats = useMemo(
    () => computeStats(filmItems, store),
    [filmItems, store]
  );
  const vgfStats = useMemo(
    () => computeStats(vgfItems, store),
    [vgfItems, store]
  );
  const trackerStats = useMemo(
    () => computeStats(trackerItems, store),
    [trackerItems, store]
  );
  const currentStats =
    filters.cat === "tv"
      ? tvStats
      : filters.cat === "film"
      ? filmStats
      : filters.cat === "vgf"
      ? vgfStats
      : trackerStats;

  const filteredItems = useMemo(
    () => filterAndSortMedia(catalogItems, store, filters, catalog),
    [catalogItems, store, filters, catalog]
  );

  const navList = useMemo(
    () => (filteredItems.length > 0 ? filteredItems : catalogItems),
    [filteredItems, catalogItems]
  );

  const handleNavigateModal = useCallback(
    (direction: -1 | 1) => {
      playSound.click(0.25);
      setActiveModalId((currentId) => {
        if (!navList.length) return currentId;
        const idx = navList.findIndex((i) => i.id === currentId);
        if (idx === -1) return navList[0]?.id || null;
        const nextIdx = (idx + direction + navList.length) % navList.length;
        return navList[nextIdx]?.id || null;
      });
    },
    [navList]
  );

  const { prevItemLabel, nextItemLabel } = useMemo(() => {
    if (!activeModalId || navList.length <= 1) {
      return { prevItemLabel: null, nextItemLabel: null };
    }
    const idx = navList.findIndex((i) => i.id === activeModalId);
    if (idx === -1) return { prevItemLabel: null, nextItemLabel: null };
    const prev = navList[(idx - 1 + navList.length) % navList.length];
    const next = navList[(idx + 1) % navList.length];
    return {
      prevItemLabel: prev ? `#${String(prev.rank).padStart(3, "0")}` : null,
      nextItemLabel: next ? `#${String(next.rank).padStart(3, "0")}` : null,
    };
  }, [activeModalId, navList]);

  const handleClearFilters = useCallback(() => {
    handleUpdateFilters({
      status: "all",
      genre: "all",
      where: "all",
      len: "all",
      lang: "all",
      customKind: "all",
      q: "",
    });
  }, [handleUpdateFilters]);

  useEffect(() => {
    function handleSlashShortcut(e: KeyboardEvent) {
      if (e.key !== "/" || activeModalId || isLogModalOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const searchInput = document.getElementById("q") as HTMLInputElement | null;
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    }
    window.addEventListener("keydown", handleSlashShortcut);
    return () => window.removeEventListener("keydown", handleSlashShortcut);
  }, [activeModalId, isLogModalOpen]);

  const activeItem: ChannelMediaItem | null = useMemo(() => {
    if (!activeModalId) return null;
    if (itemLookup[activeModalId]) return itemLookup[activeModalId];
    if (store.custom && store.custom[activeModalId]) {
      return customItemToChannelItem(store.custom[activeModalId]);
    }
    return null;
  }, [activeModalId, itemLookup, store.custom]);

  const activeRecord = activeModalId
    ? getMediaRecord(store, activeModalId)
    : {};

  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);

  const openNewLogModal = useCallback(() => {
    setEditingCustomItem(null);
    setIsLogModalOpen(true);
  }, []);

  const openTriageModal = useCallback(() => {
    playSound.pop();
    setIsTriageModalOpen(true);
  }, []);

  const handleLogPrescription = useCallback((item: Partial<CustomMediaItem>) => {
    setEditingCustomItem(item as CustomMediaItem);
    setIsLogModalOpen(true);
  }, []);

  const { userWatchlistTitles, userSeenTitles } = useMemo(() => {
    const watchlist: string[] = [];
    const seen: string[] = [];
    const customList = Object.values(store.custom || {});
    customList.forEach((it) => {
      if (it.status === "want" || it.status === "watching") {
        watchlist.push(it.title);
      } else if (it.status === "seen") {
        seen.push(it.title);
      }
    });
    const showsRecord = store.shows || {};
    const checkList = (arr: ChannelMediaItem[]) => {
      arr.forEach((item) => {
        const rec = showsRecord[item.id];
        if (rec?.s === "want" || rec?.s === "watching") {
          watchlist.push(item.title);
        } else if (rec?.s === "seen") {
          seen.push(item.title);
        }
      });
    };
    checkList(tvItems);
    checkList(filmItems);
    checkList(vgfItems);
    return { userWatchlistTitles: watchlist, userSeenTitles: seen };
  }, [store.custom, store.shows, tvItems, filmItems, vgfItems]);

  const handleQuickMarkPrescription = useCallback(
    (partial: Partial<CustomMediaItem>, status: ShowStatus) => {
      const title = (partial.title || "").trim();
      if (!title) return;
      const normKey = normalizePersonalLogKey(title);
      const matchedCanonical =
        tvItems.find((s) => normalizePersonalLogKey(s.title) === normKey) ||
        filmItems.find((f) => normalizePersonalLogKey(f.title) === normKey) ||
        vgfItems.find((v) => normalizePersonalLogKey(v.title) === normKey);

      if (matchedCanonical) {
        updateMediaRecord(matchedCanonical.id, { s: status });
        triggerToast(
          status === "watching"
            ? `▶ Watching: ${matchedCanonical.title}`
            : `+ Added to Want: ${matchedCanonical.title}`
        );
        return;
      }

      const newItem: CustomMediaItem = {
        id: `c_${Date.now()}`,
        title,
        kind: partial.kind || "film",
        lang: partial.lang || "English",
        langFlag: partial.langFlag,
        status,
        rating: 0,
        year: partial.year,
        where: partial.where || "Streaming",
        genre: partial.genre || "Entertainment",
        notes: partial.notes || "",
        updatedAt: Date.now(),
      };
      handleSaveCustomItem(newItem);
    },
    [tvItems, filmItems, vgfItems, updateMediaRecord, handleSaveCustomItem, triggerToast]
  );

  return (
    <AppPage variant="flush">
      <div
        className="ch100-root"
        data-cat={filters.cat}
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Channel100Header
          currentCat={filters.cat}
          onSelectCat={handleSelectCat}
          tvSeenCount={tvStats.seen}
          tvTotalCount={tvItems.length}
          filmSeenCount={filmStats.seen}
          filmTotalCount={filmItems.length}
          vgfSeenCount={vgfStats.seen}
          vgfTotalCount={vgfItems.length}
          trackerCount={trackerItems.length}
          isSyncing={isSyncing}
          onSyncLive={() => handleSyncAllLive(true)}
          onOpenLogModal={openNewLogModal}
          onOpenTriageModal={openTriageModal}
        />

        <main
          id="ch100-main-panel"
          role="tabpanel"
          aria-labelledby={
            filters.cat === "tv"
              ? "tabTv"
              : filters.cat === "film"
              ? "tabFilm"
              : filters.cat === "vgf"
              ? "tabVgf"
              : "tabTracker"
          }
        >
          <Channel100Hero
            catalog={catalog}
            items={catalogItems}
            stats={currentStats}
            cat={filters.cat}
            activeStatus={filters.status}
            syncedAt={syncedAt}
            onSurpriseMe={handleSurpriseMe}
            onCopyList={handleCopyList}
            onExport={handleExport}
            onImport={handleImport}
            onSelectStatusFilter={handleSelectStatusFilter}
          />

          {!(filters.cat === "tracker" && catalogItems.length === 0) && (
            <Channel100Controls
              items={catalogItems}
              store={store}
              catalog={catalog}
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              resultCount={filteredItems.length}
              cat={filters.cat}
            />
          )}

          <Channel100Grid
            items={filteredItems}
            store={store}
            layout={filters.layout}
            cat={filters.cat}
            totalCatalogCount={catalogItems.length}
            onOpenModal={(id) => {
              playSound.pop();
              setActiveModalId(id);
            }}
            onToggleStatus={handleToggleStatus}
            onIncrementEpisode={handleIncrementEpisode}
            onClearFilters={handleClearFilters}
            onOpenLogModal={openNewLogModal}
            onOpenTriageModal={openTriageModal}
          />

          <Channel100Stats
            items={catalogItems}
            store={store}
            cat={filters.cat}
            catalog={catalog}
            onOpenModal={(id) => {
              playSound.pop();
              setActiveModalId(id);
            }}
          />
        </main>

        <Channel100Footer />

        <Channel100Modal
          item={activeItem}
          record={activeRecord}
          isOpen={activeModalId !== null}
          prevLabel={prevItemLabel}
          nextLabel={nextItemLabel}
          onClose={() => setActiveModalId(null)}
          onToggleStatus={handleToggleStatus}
          onSetRating={handleSetRating}
          onUpdateNotes={handleUpdateNotes}
          onNavigateShow={handleNavigateModal}
          onEditCustom={handleEditCustom}
          onDeleteCustom={handleDeleteCustomItem}
          onIncrementEpisode={handleIncrementEpisode}
        />

        <Channel100LogModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setEditingCustomItem(null);
          }}
          onSave={handleSaveCustomItem}
          initialData={editingCustomItem || undefined}
        />

        <Channel100TriageModal
          isOpen={isTriageModalOpen}
          onClose={() => setIsTriageModalOpen(false)}
          watchlistTitles={userWatchlistTitles}
          seenTitles={userSeenTitles}
          onLogPrescription={handleLogPrescription}
          onQuickMarkPrescription={handleQuickMarkPrescription}
        />

        <Channel100Toast message={toastMessage} />
      </div>
    </AppPage>
  );
}
