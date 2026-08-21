"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AskDocket } from "@/components/library/AskDocket";
import { AskLibraryChat } from "@/components/library/AskLibraryChat";
import type { AskModelId } from "@/lib/ai/askModels";
import type { AskUIMessage } from "@/lib/library/askLibrary";
import {
  asStoredMessages,
  previewFromMessages,
  titleFromMessages,
  type AskThreadListItem,
} from "@/lib/library/askThread";

function subscribeNever() {
  return () => {};
}

function newSheetId() {
  return crypto.randomUUID();
}

function setAskPath(id: string | null) {
  const next = id ? `/ask/c/${id}` : "/ask";
  if (window.location.pathname !== next) {
    window.history.replaceState(null, "", next);
  }
}

type LoadedThread = {
  messages: AskUIMessage[];
  model?: AskModelId;
  web?: boolean;
};

export function AskDesk({ initialThreadId = null }: { initialThreadId?: string | null }) {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [docketOpen, setDocketOpen] = useState(false);
  const [threads, setThreads] = useState<AskThreadListItem[]>([]);
  const [sheetId, setSheetId] = useState(initialThreadId ?? "");
  const [activeId, setActiveId] = useState<string | null>(initialThreadId);
  const [loaded, setLoaded] = useState<LoadedThread | null>(initialThreadId ? null : { messages: [] });
  const persistSeq = useRef(0);

  useEffect(() => {
    if (!sheetId) setSheetId(newSheetId());
  }, [sheetId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/library/ask/threads", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("list failed");
        const data = (await res.json()) as { items: AskThreadListItem[] };
        if (!cancelled) setThreads(data.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialThreadId) return;
    let cancelled = false;
    fetch(`/api/library/ask/threads/${initialThreadId}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) {
            setActiveId(null);
            setLoaded({ messages: [] });
            setSheetId(newSheetId());
            setAskPath(null);
          }
          return;
        }
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as {
          item: { messages: AskUIMessage[]; model: string; web: boolean };
        };
        if (!cancelled) {
          setLoaded({
            messages: data.item.messages ?? [],
            model: data.item.model as AskModelId,
            web: data.item.web,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded({ messages: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [initialThreadId]);

  const fresh = useCallback(() => {
    persistSeq.current += 1;
    const id = newSheetId();
    setSheetId(id);
    setActiveId(null);
    setLoaded({ messages: [] });
    setDocketOpen(false);
    setAskPath(null);
  }, []);

  const openThread = useCallback(async (id: string) => {
    persistSeq.current += 1;
    setDocketOpen(false);
    const res = await fetch(`/api/library/ask/threads/${id}`, { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      item: { messages: AskUIMessage[]; model: string; web: boolean };
    };
    setSheetId(id);
    setActiveId(id);
    setLoaded({
      messages: data.item.messages ?? [],
      model: data.item.model as AskModelId,
      web: data.item.web,
    });
    setAskPath(id);
  }, []);

  const dropThread = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/library/ask/threads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return;
      setThreads((current) => current.filter((thread) => thread.id !== id));
      if (activeId === id) fresh();
    },
    [activeId, fresh]
  );

  const persist = useCallback(
    async (input: { messages: AskUIMessage[]; model: AskModelId; web: boolean }) => {
      if (input.messages.length === 0 || !sheetId) return;
      const seq = persistSeq.current;
      const stored = asStoredMessages(input.messages);
      const title = titleFromMessages(stored);
      const preview = previewFromMessages(stored);
      const now = new Date().toISOString();
      setActiveId(sheetId);
      setThreads((current) => {
        const next: AskThreadListItem = { id: sheetId, title, preview, updatedAt: now };
        const rest = current.filter((thread) => thread.id !== sheetId);
        return [next, ...rest];
      });
      setAskPath(sheetId);
      try {
        const res = await fetch(`/api/library/ask/threads/${sheetId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            model: input.model,
            web: input.web,
            messages: stored,
          }),
        });
        if (!res.ok || seq !== persistSeq.current) return;
        const data = (await res.json()) as { item: AskThreadListItem };
        setThreads((current) =>
          current.map((thread) => (thread.id === sheetId ? { ...thread, ...data.item } : thread))
        );
      } catch {
        /* keep optimistic folio */
      }
    },
    [sheetId]
  );

  return (
    <div className={docketOpen ? "ask-room ask-room-split is-docket" : "ask-room ask-room-split"}>
      <AskDocket
        threads={threads}
        activeId={activeId}
        open={docketOpen}
        onFresh={fresh}
        onOpen={(id) => void openThread(id)}
        onDrop={(id) => void dropThread(id)}
        onClose={() => setDocketOpen(false)}
      />
      {mounted && sheetId && loaded ? (
        <AskLibraryChat
          key={sheetId}
          chatId={sheetId}
          initialMessages={loaded.messages}
          initialModel={loaded.model}
          initialWeb={loaded.web}
          threadTitle={threads.find((thread) => thread.id === activeId)?.title}
          docketOpen={docketOpen}
          onToggleDocket={() => setDocketOpen((open) => !open)}
          onFresh={fresh}
          onPersist={persist}
        />
      ) : (
        <div className="ask-shell is-empty" />
      )}
    </div>
  );
}
