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
  SHOWS,
  FILMS,
  ALL_ITEMS,
  CATALOGS,
  customItemToChannelItem,
} from "@/lib/channel100/data";
import { INITIAL_VGF_ITEMS } from "@/lib/channel100/verygoodfilms";
import {
  loadStore,
  saveStore,
  loadSavedView,
  saveViewSettings,
  loadCachedVgfCatalog,
  saveCachedVgfCatalog,
  getMediaRecord,
  computeStats,
  filterAndSortMedia,
  formatListForClipboard,
  exportBackup,
  importBackup,
} from "@/lib/channel100/storage";
import { playSound, sound } from "@/lib/sound";

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
  const [crtMode, setCrtMode] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [filters, setFilters] = useState<ViewFilterState>(DEFAULT_FILTERS);
  const [vgfItems, setVgfItems] = useState<ChannelMediaItem[]>(INITIAL_VGF_ITEMS);
  const [vgfSyncedAt, setVgfSyncedAt] = useState<number | null>(null);
  const [isSyncingVgf, setIsSyncingVgf] = useState<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic tracker custom items converted to ChannelMediaItem format
  const trackerItems = useMemo(() => {
    const customMap = store.custom || {};
    return Object.values(customMap).map((item, idx) =>
      customItemToChannelItem(item, idx)
    );
  }, [store.custom]);

  const catalog = CATALOGS[filters.cat] || CATALOGS.tv;
  const catalogItems = useMemo(() => {
    if (filters.cat === "tracker") return trackerItems;
    if (filters.cat === "vgf") return vgfItems;
    return catalog.items;
  }, [filters.cat, catalog.items, trackerItems, vgfItems]);

  // Toast trigger helper
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2400);
  }, []);

  // Live sync from verygoodfilms.co
  const handleSyncVgf = useCallback(
    async (force = false) => {
      setIsSyncingVgf(true);
      try {
        const res = await fetch(
          `/api/channel100/verygoodfilms${force ? "?force=1" : ""}`
        );
        if (!res.ok) throw new Error("Failed to sync Very Good Films");
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setVgfItems(data.items);
          const ts = Number(data.syncedAt) || Date.now();
          setVgfSyncedAt(ts);
          saveCachedVgfCatalog(data.items, ts, data.source);
          if (force) {
            playSound.promote();
            triggerToast(
              `🎞️ Synced ${data.items.length} curated films from verygoodfilms.co!`
            );
          }
        }
      } catch {
        if (force) {
          playSound.bury();
          triggerToast("Could not reach verygoodfilms.co — using cached archive.");
        }
      } finally {
        setIsSyncingVgf(false);
      }
    },
    [triggerToast]
  );

  // Sync to PostgreSQL DB (debounced for snappy offline-first feel)
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

  // Update a single item's user record (by id: "s1".."s100", "f1".."f100", or "c_...")
  const updateMediaRecord = useCallback(
    (id: string, patch: Partial<{ s: ShowStatus; r: number; n: string }>) => {
      setStore((prev) => {
        const cur = { ...getMediaRecord(prev, id), ...patch };
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
            },
          };
        }

        const nextStore: Channel100Store = {
          shows: newShows,
          custom: nextCustom,
          updated: Date.now(),
        };
        saveStore(nextStore);
        queueRemoteSync(id, cur, nextCustom ? nextCustom[id] : undefined);
        return nextStore;
      });
    },
    [queueRemoteSync]
  );

  // Save or update a custom tracker title (and cross-sync if it matches a canonical NYT 100 title)
  const handleSaveCustomItem = useCallback(
    (item: CustomMediaItem) => {
      const normalizedTitle = item.title.trim().toLowerCase();
      const matchedCanonical =
        SHOWS.find((s) => s.title.toLowerCase() === normalizedTitle) ||
        FILMS.find((f) => f.title.toLowerCase() === normalizedTitle);

      setStore((prev) => {
        const nextCustom = { ...(prev.custom || {}) };
        nextCustom[item.id] = item;

        const nextShows = { ...prev.shows };
        nextShows[item.id] = {
          s: item.status || "watching",
          r: item.rating || 0,
          n: item.notes || "",
        };

        if (matchedCanonical) {
          const prevCanon = nextShows[matchedCanonical.id] || {};
          nextShows[matchedCanonical.id] = {
            s: item.status || prevCanon.s || "watching",
            r: item.rating || prevCanon.r || 0,
            n: item.notes || prevCanon.n || "",
          };
        }

        const nextStore: Channel100Store = {
          shows: nextShows,
          custom: nextCustom,
          updated: Date.now(),
        };
        saveStore(nextStore);

        // remote DB update
        fetch("/api/channel100", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            id: item.id,
            record: nextShows[item.id],
            customMeta: item,
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
          ? `⚡ Logged ${item.title} & synced with NYT #${matchedCanonical.rank}`
          : `⚡ Logged: ${item.title}`
      );
      setIsLogModalOpen(false);
      setEditingCustomItem(null);
    },
    [triggerToast]
  );

  // Delete a custom tracker title
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
      triggerToast("🗑️ Removed title from tracker");
      setActiveModalId(null);
    },
    [triggerToast]
  );

  // Quick increment episode
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
            ? `🎉 Completed ${currentCustom.title} (${nextEp}/${currentCustom.totalEpisodes})!`
            : `📺 ${currentCustom.title}: Ep ${nextEp}${
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

  // Edit custom item in log modal
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

  // Background Database Sync & Local Hydration on Mount
  useEffect(() => {
    let isCancelled = false;

    // 1. Post-mount local hydration (avoids SSR hydration mismatch)
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
      setFilters((prev) => ({ ...prev, ...savedView, cat: initialCat }));

      const cachedVgf = loadCachedVgfCatalog();
      if (cachedVgf) {
        setVgfItems(cachedVgf.items);
        setVgfSyncedAt(cachedVgf.syncedAt);
      }
      if (!cachedVgf || Date.now() - cachedVgf.syncedAt > 60 * 60 * 1000) {
        handleSyncVgf(false);
      }

      if (localStorage.getItem("hoard_ch100_crt") === "true") {
        setCrtMode(true);
      }

      setSfxEnabled(sound.isEnabled());
    } catch (e) {
      console.warn("[Channel100] Failed to hydrate local settings:", e);
    }

    // 2. Background sync with remote PostgreSQL database
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
            // Merge & sync local into PostgreSQL
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
  }, []);

  // Toggle status (seen, watching, want)
  const handleToggleStatus = useCallback(
    (id: string, targetStatus: ShowStatus) => {
      const curStatus = getMediaRecord(store, id).s;
      const nextStatus = curStatus === targetStatus ? "" : targetStatus;
      updateMediaRecord(id, { s: nextStatus });

      const item =
        ALL_ITEMS[id] ||
        (store.custom && store.custom[id]
          ? customItemToChannelItem(store.custom[id])
          : null);
      const itemTitle = item ? item.title : id;

      if (nextStatus === "") {
        playSound.pop();
        triggerToast(`Cleared: ${itemTitle}`);
      } else if (nextStatus === "seen") {
        playSound.promote();
        triggerToast(`✓ Marked Seen: ${itemTitle}`);
      } else if (nextStatus === "watching") {
        playSound.click();
        triggerToast(`▶ Watching: ${itemTitle}`);
      } else if (nextStatus === "want") {
        playSound.click();
        triggerToast(`+ Want to see: ${itemTitle}`);
      }
    },
    [store, updateMediaRecord, triggerToast]
  );

  // Set 1-5 rating
  const handleSetRating = useCallback(
    (id: string, rating: number) => {
      updateMediaRecord(id, { r: rating });
      playSound.fileIt();
      const item =
        ALL_ITEMS[id] ||
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
    [store.custom, updateMediaRecord, triggerToast]
  );

  // Update notes
  const handleUpdateNotes = useCallback(
    (id: string, notes: string) => {
      updateMediaRecord(id, { n: notes });
    },
    [updateMediaRecord]
  );

  // Switch Catalog (TV vs Film vs Tracker)
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

  // Surprise Me recommendation generator
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
    const prefix =
      chosen.kind === "film" ? "No." : chosen.kind === "tracker" ? "⚡" : "#";
    triggerToast(
      `Surprise Recommendation: ${prefix}${chosen.rank} ${chosen.title}`
    );
  }, [catalogItems, store, triggerToast]);

  // Copy lists to clipboard
  const handleCopyList = useCallback(async () => {
    playSound.copy();
    const formatted = formatListForClipboard(store);
    try {
      await navigator.clipboard.writeText(formatted);
      triggerToast("📋 Copied your watch lists to clipboard!");
    } catch {
      triggerToast("Clipboard access denied. Please try again.");
    }
  }, [store, triggerToast]);

  // Export JSON backup
  const handleExport = useCallback(() => {
    playSound.click();
    exportBackup(store);
    triggerToast("💾 Downloaded Channel 100 backup JSON");
  }, [store, triggerToast]);

  // Import JSON backup (with overwrite confirmation when existing records exist)
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
          triggerToast(`📂 Restored ${res.count} titles from backup!`);

          // Sync restored backup to database as well
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

  // Filter changes
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

  // Direct status filter pick from hero
  const handleSelectStatusFilter = useCallback(
    (status: StatusFilter) => {
      playSound.click();
      setFilters((prev) => ({ ...prev, status }));
      const el = document.getElementById("browse");
      el?.scrollIntoView({ behavior: "smooth" });
    },
    []
  );

  // Toggle CRT Mode
  const handleToggleCrt = useCallback(() => {
    setCrtMode((prev) => {
      const next = !prev;
      localStorage.setItem("hoard_ch100_crt", String(next));
      playSound.click();
      return next;
    });
  }, []);

  // Toggle SFX
  const handleToggleSfx = useCallback(() => {
    const next = sound.toggle();
    setSfxEnabled(next);
  }, []);

  // Computed statistics
  const tvStats = useMemo(() => computeStats(SHOWS, store), [store]);
  const filmStats = useMemo(() => computeStats(FILMS, store), [store]);
  const vgfStats = useMemo(() => computeStats(vgfItems, store), [vgfItems, store]);
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

  // Filtered and sorted media list for current catalog
  const filteredItems = useMemo(
    () => filterAndSortMedia(catalogItems, store, filters, catalog),
    [catalogItems, store, filters, catalog]
  );

  // Modal Next/Prev Navigation (follows active filtered/sorted items)
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
    const fmtLabel = (it: ChannelMediaItem) => {
      const pre = it.custom ? "LOG" : it.kind === "film" ? "No." : "CH";
      return `${pre} ${String(it.rank).padStart(2, "0")}`;
    };
    return {
      prevItemLabel: prev ? fmtLabel(prev) : null,
      nextItemLabel: next ? fmtLabel(next) : null,
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

  // Global "/" shortcut to focus search when no modal is open
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
    if (ALL_ITEMS[activeModalId]) return ALL_ITEMS[activeModalId];
    const fromVgf = vgfItems.find((i) => i.id === activeModalId);
    if (fromVgf) return fromVgf;
    if (store.custom && store.custom[activeModalId]) {
      return customItemToChannelItem(store.custom[activeModalId]);
    }
    return null;
  }, [activeModalId, store.custom, vgfItems]);

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

  // Compute watchlist titles for Triage prioritisation
  const userWatchlistTitles = useMemo(() => {
    const list: string[] = [];
    const customList = Object.values(store.custom || {});
    customList.forEach((it) => {
      if (it.status === "want" || it.status === "watching") {
        list.push(it.title);
      }
    });
    const showsRecord = store.shows || {};
    SHOWS.forEach((s) => {
      const rec = showsRecord[s.id];
      if (rec?.s === "want" || rec?.s === "watching") {
        list.push(s.title);
      }
    });
    FILMS.forEach((f) => {
      const rec = showsRecord[f.id];
      if (rec?.s === "want" || rec?.s === "watching") {
        list.push(f.title);
      }
    });
    return list;
  }, [store.custom, store.shows]);

  return (
    <AppPage variant="flush">
      <div
        className={`ch100-root ${crtMode ? "crt-mode" : ""}`}
        data-cat={filters.cat}
        style={{ height: "100%", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}
      >
        {/* Header with SMPTE 7-bar test pattern, brand & catalog switcher */}
        <Channel100Header
          currentCat={filters.cat}
          onSelectCat={handleSelectCat}
          tvSeenCount={tvStats.seen}
          filmSeenCount={filmStats.seen}
          vgfSeenCount={vgfStats.seen}
          vgfTotalCount={vgfItems.length}
          trackerCount={trackerItems.length}
          crtMode={crtMode}
          onToggleCrt={handleToggleCrt}
          sfxEnabled={sfxEnabled}
          onToggleSfx={handleToggleSfx}
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
          {/* Hero Section & 10x10 Test Card / Custom Entertainment Radar */}
          <Channel100Hero
            catalog={catalog}
            items={catalogItems}
            store={store}
            stats={currentStats}
            cat={filters.cat}
            activeStatus={filters.status}
            vgfSyncedAt={vgfSyncedAt}
            isSyncingVgf={isSyncingVgf}
            onSyncVgf={() => handleSyncVgf(true)}
            onOpenModal={(id) => {
              playSound.pop();
              setActiveModalId(id);
            }}
            onSurpriseMe={handleSurpriseMe}
            onCopyList={handleCopyList}
            onExport={handleExport}
            onImport={handleImport}
            onSelectStatusFilter={handleSelectStatusFilter}
            onOpenLogModal={openNewLogModal}
            onOpenTriageModal={openTriageModal}
          />

          {/* Sticky Filter Controls (hidden when tracker is brand-new & empty) */}
          {!(filters.cat === "tracker" && catalogItems.length === 0) && (
            <Channel100Controls
              items={catalogItems}
              store={store}
              catalog={catalog}
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              resultCount={filteredItems.length}
              cat={filters.cat}
              onOpenLogModal={openNewLogModal}
              onOpenTriageModal={openTriageModal}
            />
          )}

          {/* Media Grid / List View */}
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

          {/* "By the Numbers" Stats Analysis */}
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

        {/* Footer with Attribution */}
        <Channel100Footer />

        {/* Interactive Detail Modal with CRT Static */}
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

        {/* Universal Entertainment Log Modal */}
        <Channel100LogModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setEditingCustomItem(null);
          }}
          onSave={handleSaveCustomItem}
          initialData={editingCustomItem || undefined}
        />

        {/* Watchlist Decision Matrix (Triage Mode) Modal */}
        <Channel100TriageModal
          isOpen={isTriageModalOpen}
          onClose={() => setIsTriageModalOpen(false)}
          watchlistTitles={userWatchlistTitles}
          onLogPrescription={handleLogPrescription}
          sfxEnabled={sfxEnabled}
        />

        {/* Toast Alerts */}
        <Channel100Toast message={toastMessage} />
      </div>
    </AppPage>
  );
}

