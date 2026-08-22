"use client";

import { useCallback, useEffect, useState } from "react";
import { applyStationPatch } from "@/lib/atlas/apply";
import { nextStatusAfterCheck } from "@/lib/atlas/progress";
import type { AtlasCadence, AtlasDepth, AtlasRecord, AtlasStationState } from "@/lib/atlas/types";

export type AtlasChips = {
  depth?: AtlasDepth;
  cadence?: AtlasCadence;
  antiScope?: string;
};

const json = { "Content-Type": "application/json" } as const;

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

  const create = useCallback(async (
    prompt: string,
    chips?: AtlasChips,
    syllabus?: unknown
  ): Promise<AtlasRecord | null> => {
    try {
      const body: { prompt: string; syllabus?: unknown } & AtlasChips = { prompt };
      if (chips?.depth) body.depth = chips.depth;
      if (chips?.cadence) body.cadence = chips.cadence;
      if (chips?.antiScope?.trim()) body.antiScope = chips.antiScope;
      if (syllabus !== undefined) body.syllabus = syllabus;

      const res = await fetch("/api/atlas", {
        method: "POST",
        credentials: "include",
        headers: json,
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const atlas = await readAtlas(res);
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
  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) {
    setSeenId(id);
    setAtlas(null);
    setLoading(true);
    setMissing(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadOne() {
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
        setAtlas(next);
        setMissing(false);
      } catch (e) {
        console.error("Failed to load atlas", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadOne();
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  return {
    atlas,
    loading,
    missing,
    toggle,
    setNote,
    pinWeek,
    archive,
    restore,
    drop,
  };
}
