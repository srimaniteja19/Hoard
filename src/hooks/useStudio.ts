"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudioData, StudioIdea, StudioPiece, StudioSeries } from "@/lib/studio/types";
import type { StudioKind } from "@/lib/studio/validate";

type ItemOf<K extends StudioKind> = K extends "pieces" ? StudioPiece : K extends "series" ? StudioSeries : StudioIdea;
type Pending = { kind: StudioKind; id: string; patch: Record<string, unknown>; timer: ReturnType<typeof setTimeout> | null };

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const EMPTY: StudioData = { pieces: [], series: [], ideas: [] };

export function useStudio() {
  const [data, setData] = useState<StudioData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const pending = useRef(new Map<string, Pending>());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/studio", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as StudioData;
        if (!cancelled) setData(json);
      })
      .catch(() => !cancelled && setError("Couldn't load Studio. Refresh to try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async (kind: StudioKind, id: string, patch: Record<string, unknown>, keepalive = false) => {
    setInFlight((n) => n + 1);
    try {
      const res = await fetch(`/api/studio/${kind}/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(patch),
        keepalive,
      });
      if (!res.ok) throw new Error(String(res.status));
      setError(null);
    } catch {
      setError("Couldn't save your last change. Check your connection.");
    } finally {
      setInFlight((n) => n - 1);
    }
  }, []);

  const flush = useCallback(
    (keepalive = false) => {
      pending.current.forEach((p, key) => {
        if (p.timer) clearTimeout(p.timer);
        pending.current.delete(key);
        void send(p.kind, p.id, p.patch, keepalive);
      });
    },
    [send]
  );

  useEffect(() => {
    const onHide = () => flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flush(true);
    };
  }, [flush]);

  /** Update locally right away; save now, or after a pause when `debounce` is set (typing). */
  const update = useCallback(
    <K extends StudioKind>(kind: K, id: string, patch: Partial<ItemOf<K>>, opts: { debounce?: boolean } = {}) => {
      setData((d) => ({ ...d, [kind]: (d[kind] as ItemOf<K>[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      const key = `${kind}:${id}`;
      const prev = pending.current.get(key);
      if (prev?.timer) clearTimeout(prev.timer);
      const merged: Pending = { kind, id, patch: { ...(prev?.patch ?? {}), ...patch }, timer: null };
      if (opts.debounce) {
        merged.timer = setTimeout(() => {
          pending.current.delete(key);
          void send(kind, id, merged.patch);
        }, 600);
        pending.current.set(key, merged);
      } else {
        pending.current.delete(key);
        void send(kind, id, merged.patch);
      }
    },
    [send]
  );

  const create = useCallback(async <K extends StudioKind>(kind: K, values: Partial<ItemOf<K>>): Promise<ItemOf<K> | null> => {
    setInFlight((n) => n + 1);
    try {
      const res = await fetch("/api/studio", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ kind, data: values }) });
      if (!res.ok) throw new Error(String(res.status));
      const { item } = (await res.json()) as { item: ItemOf<K> };
      setData((d) => ({ ...d, [kind]: kind === "series" ? [...d[kind], item] : [item, ...d[kind]] }));
      setError(null);
      return item;
    } catch {
      setError("Couldn't create that. Try again.");
      return null;
    } finally {
      setInFlight((n) => n - 1);
    }
  }, []);

  const remove = useCallback(async (kind: StudioKind, id: string) => {
    const key = `${kind}:${id}`;
    const p = pending.current.get(key);
    if (p?.timer) clearTimeout(p.timer);
    pending.current.delete(key);
    setData((d) => ({ ...d, [kind]: (d[kind] as { id: string }[]).filter((x) => x.id !== id) }));
    setInFlight((n) => n + 1);
    try {
      const res = await fetch(`/api/studio/${kind}/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
    } catch {
      setError("Couldn't delete that. Refresh and try again.");
    } finally {
      setInFlight((n) => n - 1);
    }
  }, []);

  return { data, setData, loading, error, saving: inFlight > 0, update, create, remove };
}

export type StudioApi = ReturnType<typeof useStudio>;
