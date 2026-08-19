"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/components/chrome/AppPage";
import { ChromeSlot } from "@/components/chrome/slots";
import { AppLoading } from "@/components/chrome/AppLoading";
import { TYPES } from "@/data/initialBookmarks";
import type { Bookmark, ItemType } from "@/types";

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export default function LibraryReviewPage() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingAll, setConfirmingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<Bookmark[]>("/api/bookmarks?itemTypeGuessed=true");
        if (!cancelled) setItems(data);
      } catch (e) {
        console.error("[library/review] load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmOne = useCallback(async (id: number, chosen: ItemType) => {
    const prevItems = items;
    setItems((cur) => cur.filter((b) => b.id !== id));
    try {
      await apiFetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType: chosen, itemTypeGuessed: false }),
      });
    } catch (e) {
      console.error("[library/review] confirmOne failed", e);
      setItems(prevItems);
    }
  }, [items]);

  const confirmAll = useCallback(async () => {
    const ids = items.map((b) => b.id);
    if (ids.length === 0) return;
    const prevItems = items;
    setConfirmingAll(true);
    setItems([]);
    try {
      await apiFetch("/api/bookmarks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, itemTypeGuessed: false }),
      });
    } catch (e) {
      console.error("[library/review] confirmAll failed", e);
      setItems(prevItems);
    } finally {
      setConfirmingAll(false);
    }
  }, [items]);

  if (loading) return <AppLoading label="LOADING REVIEW QUEUE..." />;

  return (
    <AppPage width="lg">
      <ChromeSlot name="trailing">
        <Link href="/library" className="app-header-link">
          <ArrowLeft size={14} /> LIBRARY
        </Link>
      </ChromeSlot>

      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--mono)", fontSize: "22px", fontWeight: 900, margin: 0, color: "var(--ink)" }}>
          REVIEW ITEM TYPES
        </h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.7, margin: "4px 0 0 0" }}>
          We guessed whether each of these is a reference (something you come back to) or a queued
          item (something you read once and clear). Correct any that are wrong — this list empties
          as you go.
        </p>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            border: "var(--bd)",
            background: "var(--paper)",
            boxShadow: "var(--sh)",
            padding: "24px",
            fontFamily: "var(--mono)",
            fontWeight: 800,
            fontSize: "13px",
            color: "var(--ink)",
          }}
        >
          ALL REVIEWED — nothing left to check.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              opacity: 0.7,
            }}
          >
            <span>{items.length} GUESSED</span>
            <button
              onClick={confirmAll}
              disabled={confirmingAll}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.05em",
                border: "2px solid var(--ink)",
                background: "var(--paper)",
                color: "var(--ink)",
                padding: "6px 10px",
                cursor: confirmingAll ? "default" : "pointer",
                opacity: confirmingAll ? 0.5 : 1,
              }}
            >
              THE REST LOOK RIGHT
            </button>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {items.map((b) => {
              const meta = TYPES[b.ty];
              return (
                <div
                  key={b.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "12px",
                    alignItems: "center",
                    border: "2px solid var(--ink)",
                    background: "var(--paper)",
                    padding: "10px 12px",
                  }}
                >
                  <span
                    title={meta.name}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      background: meta.c,
                      color: meta.fg,
                      border: "2px solid var(--ink)",
                      padding: "3px 6px",
                    }}
                  >
                    {meta.icon} {b.ty}
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {b.t}
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 700, opacity: 0.5 }}>
                      {b.src}
                    </div>
                  </div>

                  <div style={{ display: "flex", border: "2px solid var(--ink)" }}>
                    <button
                      onClick={() => confirmOne(b.id, "REFERENCE")}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        padding: "6px 10px",
                        border: "none",
                        borderRight: "2px solid var(--ink)",
                        cursor: "pointer",
                        background: b.itemType === "REFERENCE" ? "var(--ink)" : "var(--paper)",
                        color: b.itemType === "REFERENCE" ? "var(--yel)" : "var(--ink)",
                      }}
                    >
                      REFERENCE
                    </button>
                    <button
                      onClick={() => confirmOne(b.id, "QUEUED")}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        padding: "6px 10px",
                        border: "none",
                        cursor: "pointer",
                        background: b.itemType === "QUEUED" ? "var(--ink)" : "var(--paper)",
                        color: b.itemType === "QUEUED" ? "var(--yel)" : "var(--ink)",
                      }}
                    >
                      QUEUED
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AppPage>
  );
}
