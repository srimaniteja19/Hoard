"use client";

import { useEffect, useState, use } from "react";
import { Bookmark } from "@/types";
import { MasonryView } from "@/components/views/MasonryView";
import { GridView } from "@/components/views/GridView";
import Link from "next/link";
import { sigil } from "@/lib/sigil";
import { AppLoading } from "@/components/chrome/AppLoading";
import { PublicHeader } from "@/components/chrome/PublicHeader";

interface SharedCollectionData {
  collection: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  bookmarks: Bookmark[];
}

export default function ShareCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SharedCollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"masonry" | "grid">("masonry");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/${id}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Collection not found" : "Failed to load collection");
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading collection");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <AppLoading label="LOADING SHARED COLLECTION..." />;
  }

  if (error || !data) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center", fontFamily: "var(--mono)" }}>
        <div
          style={{
            display: "inline-block",
            background: "#FF007A",
            color: "#fff",
            border: "3px solid var(--ink)",
            boxShadow: "4px 4px 0 var(--ink)",
            padding: "10px 20px",
            fontWeight: 800,
            fontSize: "18px",
            marginBottom: "16px",
          }}
        >
          COLLECTION NOT FOUND
        </div>
        <p style={{ marginBottom: "20px" }}>{error || "This collection is private or does not exist."}</p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#FFE600",
            color: "#000",
            border: "2px solid var(--ink)",
            padding: "8px 16px",
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "2px 2px 0 var(--ink)",
          }}
        >
          ← GO TO HOARD HOME
        </Link>
      </div>
    );
  }

  const { collection, bookmarks } = data;
  const totalMins = bookmarks.reduce((acc, b) => acc + b.mins, 0);

  return (
    <div className="page-scroll" style={{ background: "var(--cream)", color: "var(--ink)", padding: "20px" }}>
      <PublicHeader
        actions={
          <>
            <button
              type="button"
              onClick={handleCopyLink}
              className={copied ? "public-header-btn copied" : "public-header-btn"}
            >
              {copied ? "LINK COPIED!" : "COPY SHARE LINK"}
            </button>
            <Link href="/" className="public-header-btn open">
              OPEN HOARD APP
            </Link>
          </>
        }
      />

      {/* Collection Header */}
      <div style={{ maxWidth: "1200px", margin: "0 auto 24px auto" }}>
        <div
          style={{
            border: "3px solid var(--ink)",
            background: "var(--paper)",
            boxShadow: "5px 5px 0 var(--ink)",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span
              style={{
                width: "36px",
                height: "36px",
                display: "block",
                border: "2px solid var(--ink)",
                overflow: "hidden",
              }}
              dangerouslySetInnerHTML={{ __html: sigil(collection.name, 36).svg }}
            />
            <h1 style={{ fontSize: "clamp(20px, 6vw, 28px)", fontWeight: 800, margin: 0, textTransform: "uppercase", overflowWrap: "anywhere" }}>
              {collection.name}
            </h1>
          </div>

          <div style={{ display: "flex", gap: "12px", fontFamily: "var(--mono)", fontSize: "12px", flexWrap: "wrap" }}>
            <span style={{ border: "1.5px solid var(--ink)", background: "var(--yel)", padding: "2px 8px", fontWeight: 800 }}>
              <b>{bookmarks.length}</b> BOOKMARKS
            </span>
            <span style={{ border: "1.5px solid var(--ink)", background: "var(--lime)", padding: "2px 8px", fontWeight: 800 }}>
              <b>{Math.floor(totalMins / 60)}H {totalMins % 60}M</b> TOTAL CONTENT
            </span>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", gap: "6px" }}>
          <button
            onClick={() => setView("masonry")}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
              border: "2px solid var(--ink)",
              background: view === "masonry" ? "#000" : "#fff",
              color: view === "masonry" ? "#FFE600" : "#000",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            MASONRY
          </button>
          <button
            onClick={() => setView("grid")}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
              border: "2px solid var(--ink)",
              background: view === "grid" ? "#000" : "#fff",
              color: view === "grid" ? "#FFE600" : "#000",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            GRID
          </button>
        </div>
      </div>

      {/* Bookmarks Display */}
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {bookmarks.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", fontFamily: "var(--mono)" }}>
            This public collection is currently empty.
          </div>
        ) : view === "masonry" ? (
          <MasonryView
            items={bookmarks}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
            onOpen={(id) => {
              const item = bookmarks.find((b) => b.id === id);
              if (item?.url) window.open(item.url, "_blank");
            }}
          />
        ) : (
          <GridView
            items={bookmarks}
            selectedIds={new Set()}
            onToggleSelect={() => {}}
            onOpen={(id) => {
              const item = bookmarks.find((b) => b.id === id);
              if (item?.url) window.open(item.url, "_blank");
            }}
          />
        )}
      </div>
    </div>
  );
}
