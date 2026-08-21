"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AskAnswer } from "@/components/library/AskMarkdown";
import { AskShelf } from "@/components/library/AskShelf";
import type { AskSaveCitation } from "@/lib/library/askSave";

type SavedItem = {
  id: string;
  question: string;
  answer: string;
  summary: string;
  citations: AskSaveCitation[];
  model: string;
  createdAt: string;
};

function formatKeptAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function AskSavedList() {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [error, setError] = useState("");
  const [dropping, setDropping] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/library/ask/saves", { credentials: "include" })
        .then(async (res) => {
          if (!res.ok) throw new Error("load failed");
          const data = (await res.json()) as { items: SavedItem[] };
          if (!cancelled) setItems(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Could not load saved answers.");
        });
    };
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(load)
        : window.setTimeout(load, 0);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  async function drop(id: string) {
    if (dropping) return;
    setDropping(id);
    try {
      const res = await fetch(`/api/library/ask/saves/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("drop failed");
      setItems((current) => current?.filter((item) => item.id !== id) ?? null);
    } catch {
      setError("Could not drop that save.");
    } finally {
      setDropping(null);
    }
  }

  if (error && !items) return <div className="ask-error">{error}</div>;
  if (!items) return <p className="ask-saved-status">Pulling the file…</p>;
  if (items.length === 0) {
    return (
      <div className="ask-empty ask-empty-saved">
        <p className="ask-hero-kicker">NOTHING FILED YET</p>
        <p className="ask-hero-dek">
          Stamp KEEP on an answer at the desk and it lands here — question, write-up, and the shelf as it
          was that day.
        </p>
        <p>
          <Link href="/ask" prefetch={false} className="ask-back">
            Ask something →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="ask-saved-list">
      {error ? <div className="ask-error">{error}</div> : null}
      {items.map((item, index) => (
        <article key={item.id} className="ask-saved-card">
          <div className="ask-saved-spine" aria-hidden="true">
            {String(items.length - index).padStart(2, "0")}
          </div>
          <div className="ask-saved-body">
            <header className="ask-saved-head">
              <div className="ask-saved-stamp">{formatKeptAt(item.createdAt)}</div>
              <h2>{item.question}</h2>
              <div className="ask-saved-meta">
                <span>{item.model}</span>
              </div>
            </header>
            <AskAnswer text={item.answer} />
            <AskShelf citations={item.citations} />
            <button
              type="button"
              className="ask-saved-drop"
              onClick={() => drop(item.id)}
              disabled={dropping === item.id}
            >
              {dropping === item.id ? "DROPPING…" : "DROP"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
