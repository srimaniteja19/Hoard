"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyStationPatch } from "@/lib/atlas/apply";
import type { AtlasStreamEvent } from "@/lib/atlas/generate";
import { parseAtlas } from "@/lib/atlas/parse";
import { nextStatusAfterCheck } from "@/lib/atlas/progress";
import type {
  AtlasCadence,
  AtlasDepth,
  AtlasRecord,
  AtlasStation,
  AtlasStationState,
  AtlasWeekDraft,
} from "@/lib/atlas/types";
import { hydrateStations, weeklyBudgetMinutes } from "@/lib/atlas/validate";

export type AtlasChips = {
  depth?: AtlasDepth;
  cadence?: AtlasCadence;
  antiScope?: string;
};

const json = { "Content-Type": "application/json" } as const;

type LiveFiling = {
  id: string;
  serial: string;
  filing: boolean;
  error: string | null;
  title?: string;
  brief?: string;
  weeks: AtlasWeekDraft[];
  stations: AtlasStation[];
  thin?: boolean;
};

const liveById = new Map<string, LiveFiling>();
const liveListeners = new Map<string, Set<(live: LiveFiling) => void>>();

function notifyLive(id: string) {
  const live = liveById.get(id);
  if (!live) return;
  liveListeners.get(id)?.forEach((fn) => fn(live));
}

function upsertLive(id: string, patch: Partial<LiveFiling>): LiveFiling {
  const prev = liveById.get(id) ?? {
    id,
    serial: "",
    filing: true,
    error: null,
    weeks: [],
    stations: [],
  };
  const next = { ...prev, ...patch };
  liveById.set(id, next);
  notifyLive(id);
  return next;
}

function subscribeLive(id: string, fn: (live: LiveFiling) => void): () => void {
  const set = liveListeners.get(id) ?? new Set<(live: LiveFiling) => void>();
  set.add(fn);
  liveListeners.set(id, set);
  const current = liveById.get(id);
  if (current) fn(current);
  return () => {
    set.delete(fn);
    if (set.size === 0) liveListeners.delete(id);
  };
}

function applyLiveEvent(id: string, event: AtlasStreamEvent) {
  const live = liveById.get(id) ?? upsertLive(id, {});
  if (event.type === "cover") {
    upsertLive(id, { title: event.title, brief: event.brief });
    return;
  }
  if (event.type === "week") {
    if (live.weeks.some((week) => week.id === event.week.id)) return;
    upsertLive(id, { weeks: [...live.weeks, event.week] });
    return;
  }
  if (event.type === "station") {
    if (live.stations.some((station) => station.id === event.station.id)) return;
    upsertLive(id, { stations: [...live.stations, hydrateStations([event.station])[0]!] });
    return;
  }
  if (event.type === "thin") {
    upsertLive(id, { thin: event.thin });
    return;
  }
  if (event.type === "done") {
    upsertLive(id, { filing: false, error: null });
    liveById.delete(id);
    return;
  }
  if (event.type === "error") {
    upsertLive(id, { filing: false, error: event.message });
  }
}

function overlayLive(atlas: AtlasRecord, live: LiveFiling): AtlasRecord {
  if (!live.filing) return atlas;
  return {
    ...atlas,
    title: live.title ?? atlas.title,
    brief: live.brief ?? atlas.brief,
    serial: live.serial || atlas.serial,
    syllabus: {
      ...atlas.syllabus,
      ...(live.thin !== undefined ? { thin: live.thin } : {}),
      weeks: live.weeks,
      stations: live.stations,
    },
  };
}

function stubAtlas(id: string, serial: string, prompt: string, chips?: AtlasChips): AtlasRecord {
  const parsed = parseAtlas(prompt, chips);
  const now = new Date().toISOString();
  return {
    id,
    serial,
    title: "Filing…",
    brief: "",
    prompt,
    depth: parsed.depth,
    cadence: parsed.cadence,
    minutesPerSession: parsed.minutesPerSession,
    weeksPlanned: parsed.weeksPlanned,
    antiScope: parsed.antiScope,
    status: "draft",
    currentWeekId: null,
    syllabus: {
      thin: false,
      hoursPerWeek: weeklyBudgetMinutes(parsed.minutesPerSession, parsed.cadence) / 60,
      weeks: [],
      stations: [],
    },
    model: "google/gemini-3.5-flash",
    createdAt: now,
    updatedAt: now,
  };
}

async function readAtlasNdjson(
  res: Response,
  handlers: {
    knownId?: string;
    onRow?: (id: string, serial: string) => void;
    onEvent?: (id: string, event: AtlasStreamEvent) => void;
  },
): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let id = handlers.knownId ?? null;

  const handle = (raw: unknown) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return;
    const event = raw as { type?: unknown };
    if (event.type === "row") {
      const row = raw as { id?: unknown; serial?: unknown };
      if (typeof row.id !== "string" || typeof row.serial !== "string") return;
      id = row.id;
      upsertLive(row.id, { id: row.id, serial: row.serial, filing: true, error: null, weeks: [], stations: [] });
      handlers.onRow?.(row.id, row.serial);
      return;
    }
    if (!id) return;
    const streamEvent = raw as AtlasStreamEvent;
    if (!streamEvent.type) return;
    applyLiveEvent(id, streamEvent);
    handlers.onEvent?.(id, streamEvent);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        handle(JSON.parse(trimmed) as unknown);
      } catch {
        // wait for a complete line
      }
    }
  }
  const tail = buf.trim();
  if (tail) {
    try {
      handle(JSON.parse(tail) as unknown);
    } catch {
      // ignore a truncated final line
    }
  }
}

async function startAtlasGenerate(prompt: string, chips?: AtlasChips): Promise<AtlasRecord | null> {
  const body: { prompt: string } & AtlasChips = { prompt };
  if (chips?.depth) body.depth = chips.depth;
  if (chips?.cadence) body.cadence = chips.cadence;
  if (chips?.antiScope?.trim()) body.antiScope = chips.antiScope;

  const res = await fetch("/api/atlas", {
    method: "POST",
    credentials: "include",
    headers: json,
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;

  return new Promise((resolve) => {
    let settled = false;
    const settle = (atlas: AtlasRecord | null) => {
      if (settled) return;
      settled = true;
      resolve(atlas);
    };
    void readAtlasNdjson(res, {
      onRow: (id, serial) => settle(stubAtlas(id, serial, prompt, chips)),
    }).then(() => settle(null)).catch(() => settle(null));
  });
}

async function readAtlas(res: Response): Promise<AtlasRecord | null> {
  const data = (await res.json()) as { atlas?: AtlasRecord };
  return data.atlas ?? null;
}

async function readList(res: Response): Promise<AtlasRecord[]> {
  const data = (await res.json()) as { atlases?: AtlasRecord[] };
  return data.atlases || [];
}

export function useAtlasList() {
  const [atlases, setAtlases] = useState<AtlasRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveItems, setArchiveItems] = useState<AtlasRecord[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveLoaded, setArchiveLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/atlas", { credentials: "include" });
      if (res.ok) setAtlases(await readList(res));
    } catch (e) {
      console.error("Failed to load atlases", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadDesk() {
      try {
        const res = await fetch("/api/atlas", { credentials: "include" });
        if (res.ok) setAtlases(await readList(res));
      } catch (e) {
        console.error("Failed to load atlases", e);
      } finally {
        setLoading(false);
      }
    }
    void loadDesk();
  }, []);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const res = await fetch("/api/atlas?archived=1", { credentials: "include" });
      if (res.ok) {
        setArchiveItems(await readList(res));
        setArchiveLoaded(true);
      }
    } catch (e) {
      console.error("Failed to load archived atlases", e);
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await load();
    if (archiveOpen || archiveLoaded) await loadArchive();
  }, [archiveLoaded, archiveOpen, load, loadArchive]);

  const create = useCallback(async (prompt: string, chips?: AtlasChips): Promise<AtlasRecord | null> => {
    try {
      const atlas = await startAtlasGenerate(prompt, chips);
      if (!atlas) return null;
      setAtlases((prev) => [atlas, ...prev]);
      return atlas;
    } catch (e) {
      console.error("Failed to create atlas", e);
      return null;
    }
  }, []);

  const patchStatus = useCallback(
    async (id: string, status: "archived" | "restore" | "drop"): Promise<boolean> => {
      try {
        const res = await fetch(`/api/atlas/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: json,
          body: JSON.stringify({ status }),
        });
        if (!res.ok) return false;
        await reload();
        return true;
      } catch (e) {
        console.error("Failed to update atlas", e);
        return false;
      }
    },
    [reload]
  );

  const archive = useCallback((id: string) => patchStatus(id, "archived"), [patchStatus]);
  const restore = useCallback((id: string) => patchStatus(id, "restore"), [patchStatus]);
  const drop = useCallback((id: string) => patchStatus(id, "drop"), [patchStatus]);

  const toggleArchive = useCallback(() => {
    const next = !archiveOpen;
    setArchiveOpen(next);
    if (next && !archiveLoaded) void loadArchive();
  }, [archiveLoaded, archiveOpen, loadArchive]);

  return {
    atlases,
    loading,
    archiveWell: { open: archiveOpen, items: archiveItems, loading: archiveLoading },
    create,
    archive,
    restore,
    drop,
    toggleArchive,
  };
}

export function useAtlasOne(id: string) {
  const [atlas, setAtlas] = useState<AtlasRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [filing, setFiling] = useState(() => liveById.get(id)?.filing ?? false);
  const [streamError, setStreamError] = useState<string | null>(() => liveById.get(id)?.error ?? null);
  const [seenId, setSeenId] = useState(id);
  const filingRef = useRef(liveById.get(id)?.filing ?? false);
  if (seenId !== id) {
    setSeenId(id);
    setAtlas(null);
    setLoading(true);
    setMissing(false);
    setFiling(liveById.get(id)?.filing ?? false);
    setStreamError(liveById.get(id)?.error ?? null);
  }

  const loadOne = useCallback(async () => {
    try {
      const res = await fetch(`/api/atlas/${id}`, { credentials: "include" });
      if (res.status === 404) {
        setAtlas(null);
        setMissing(true);
        return;
      }
      if (!res.ok) return;
      const next = await readAtlas(res);
      if (!next) return;
      const live = liveById.get(id);
      setAtlas(live ? overlayLive(next, live) : next);
      setMissing(false);
    } catch (e) {
      console.error("Failed to load atlas", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function firstLoad() {
      try {
        const res = await fetch(`/api/atlas/${id}`, { credentials: "include" });
        if (cancelled) return;
        if (res.status === 404) {
          setAtlas(null);
          setMissing(true);
          return;
        }
        if (!res.ok) return;
        const next = await readAtlas(res);
        if (cancelled || !next) return;
        const live = liveById.get(id);
        setAtlas(live ? overlayLive(next, live) : next);
        setMissing(false);
      } catch (e) {
        console.error("Failed to load atlas", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void firstLoad();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    filingRef.current = liveById.get(id)?.filing ?? false;
    return subscribeLive(id, (live) => {
      const wasFiling = filingRef.current;
      filingRef.current = live.filing;
      setFiling(live.filing);
      setStreamError(live.error);
      setAtlas((prev) => (prev ? overlayLive(prev, live) : prev));
      if (wasFiling && !live.filing && !live.error) {
        void loadOne();
      }
    });
  }, [id, loadOne]);

  const patchStation = useCallback(
    async (stationId: string, patch: { state?: AtlasStationState; note?: string | null }): Promise<boolean> => {
      if (!atlas) return false;
      const snapshot = atlas;
      if (patch.state) {
        const nextSyllabus = applyStationPatch(atlas.syllabus, stationId, { state: patch.state }, new Date().toISOString());
        if (nextSyllabus) {
          const becameDone = patch.state === "DONE";
          setAtlas({
            ...atlas,
            syllabus: nextSyllabus,
            status: becameDone ? nextStatusAfterCheck(atlas.status) : atlas.status,
          });
        }
      }
      try {
        const res = await fetch(`/api/atlas/${id}/stations/${stationId}`, {
          method: "PATCH",
          credentials: "include",
          headers: json,
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          setAtlas(snapshot);
          return false;
        }
        const next = await readAtlas(res);
        if (next) setAtlas(next);
        return true;
      } catch (e) {
        console.error("Failed to update station", e);
        setAtlas(snapshot);
        return false;
      }
    },
    [atlas, id]
  );

  const toggle = useCallback(
    (stationId: string) => {
      const station = atlas?.syllabus.stations.find((s) => s.id === stationId);
      if (!station) return Promise.resolve(false);
      return patchStation(stationId, { state: station.state === "DONE" ? "OPEN" : "DONE" });
    },
    [atlas, patchStation]
  );

  const setNote = useCallback(
    (stationId: string, note: string) => patchStation(stationId, { note: note.trim() === "" ? null : note }),
    [patchStation]
  );

  const pinWeek = useCallback(
    async (weekId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/atlas/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: json,
          body: JSON.stringify({ currentWeekId: weekId }),
        });
        if (!res.ok) return false;
        const next = await readAtlas(res);
        if (next) setAtlas(next);
        return true;
      } catch (e) {
        console.error("Failed to pin week", e);
        return false;
      }
    },
    [id]
  );

  const patchStatus = useCallback(
    async (status: "archived" | "restore" | "drop"): Promise<boolean> => {
      try {
        const res = await fetch(`/api/atlas/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: json,
          body: JSON.stringify({ status }),
        });
        if (status === "drop") {
          if (!res.ok && res.status !== 204) return false;
          setAtlas(null);
          return res.ok || res.status === 204;
        }
        if (!res.ok) return false;
        const next = await readAtlas(res);
        if (next) setAtlas(next);
        return true;
      } catch (e) {
        console.error("Failed to update atlas", e);
        return false;
      }
    },
    [id]
  );

  const archive = useCallback(() => patchStatus("archived"), [patchStatus]);
  const restore = useCallback(() => patchStatus("restore"), [patchStatus]);
  const drop = useCallback(() => {
    if (atlas?.status === "walking") return Promise.resolve(false);
    return patchStatus("drop");
  }, [atlas?.status, patchStatus]);

  const retryRest = useCallback(async (): Promise<boolean> => {
    try {
      upsertLive(id, { filing: true, error: null });
      const res = await fetch(`/api/atlas/${id}/retry`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        upsertLive(id, { filing: false, error: "Could not retry." });
        return false;
      }
      await readAtlasNdjson(res, { knownId: id });
      return true;
    } catch (e) {
      console.error("Failed to retry atlas", e);
      upsertLive(id, { filing: false, error: "Could not retry." });
      return false;
    }
  }, [id]);

  const regenerate = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/atlas/${id}/regenerate`, { method: "POST", credentials: "include" });
      if (res.status === 409) return false;
      if (!res.ok) return false;
      upsertLive(id, {
        filing: true,
        error: null,
        title: "Filing…",
        brief: "",
        weeks: [],
        stations: [],
        thin: false,
      });
      setAtlas((prev) =>
        prev
          ? {
              ...prev,
              title: "Filing…",
              brief: "",
              syllabus: { ...prev.syllabus, thin: false, weeks: [], stations: [] },
            }
          : prev
      );
      await readAtlasNdjson(res, { knownId: id });
      return true;
    } catch (e) {
      console.error("Failed to regenerate atlas", e);
      return false;
    }
  }, [id]);

  const fork = useCallback(async (): Promise<AtlasRecord | null> => {
    if (!atlas) return null;
    try {
      return await startAtlasGenerate(atlas.prompt, {
        depth: atlas.depth,
        cadence: atlas.cadence,
        antiScope: atlas.antiScope.join(","),
      });
    } catch (e) {
      console.error("Failed to fork atlas", e);
      return null;
    }
  }, [atlas]);

  return {
    atlas,
    loading,
    missing,
    filing,
    streamError,
    toggle,
    setNote,
    pinWeek,
    archive,
    restore,
    drop,
    retryRest,
    regenerate,
    fork,
  };
}
