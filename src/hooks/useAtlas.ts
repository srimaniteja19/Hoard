"use client";

import { useCallback, useEffect, useState } from "react";
import type { AtlasCadence, AtlasDepth, AtlasRecord } from "@/lib/atlas/types";

export type AtlasChips = {
  depth?: AtlasDepth;
  cadence?: AtlasCadence;
  antiScope?: string;
};

const json = { "Content-Type": "application/json" } as const;

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
      const data = (await res.json()) as { atlas: AtlasRecord };
      setAtlases((prev) => [data.atlas, ...prev]);
      return data.atlas;
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
