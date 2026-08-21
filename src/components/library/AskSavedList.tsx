"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AskAnswer } from "@/components/library/AskMarkdown";
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
    fetch("/api/library/ask/saves", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { items: SavedItem[] };
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load saved answers.");
      });
    return () => {
      cancelled = true;
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
  if (!items) return <p className="ask-saved-status">Loading kept answers…</p>;
  if (items.length === 0) {
    return (
      <div className="ask-empty">
        <p className="ask-empty-kicker">NOTHING KEPT YET</p>
        <p>
          Like an answer at the desk and it lands here — question, write-up, and the shelf as it was that day.
        </p>
        <p>
          <Link href="/ask">Ask something →</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="ask-saved-list">
      {error ? <div className="ask-error">{error}</div> : null}
      {items.map((item) => (
        <article key={item.id} className="ask-saved-card">
          <header className="ask-saved-head">
            <h2>{item.question}</h2>
            <div className="ask-saved-meta">
              <span>{formatKeptAt(item.createdAt)}</span>
              <span className="sep">·</span>
              <span>{item.model}</span>
            </div>
          </header>
          <AskAnswer text={item.answer} />
          {item.citations.length > 0 ? (
            <div className="ask-shelf">
              <div className="ask-shelf-kicker">FROM THE SHELF</div>
              <ul className="ask-cites">
                {item.citations.map((cite) => (
                  <li key={`${cite.ownerType}:${cite.ownerId}`}>
                    <Link href={cite.href} target={cite.ownerType === "til" ? undefined : "_blank"}>
                      <span className="ask-cite-kind">{cite.ownerType === "til" ? "TIL" : cite.kind || "BM"}</span>
                      <span className="ask-cite-title">{cite.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            className="ask-saved-drop"
            onClick={() => drop(item.id)}
            disabled={dropping === item.id}
          >
            {dropping === item.id ? "DROPPING…" : "DROP"}
          </button>
        </article>
      ))}
    </div>
  );
}
