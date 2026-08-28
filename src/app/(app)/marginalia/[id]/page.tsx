"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { BookRow } from "@/db/schema";
import { BookDetailView } from "@/components/marginalia/BookDetailView";

function BookDetailPageContent({ id }: { id: string }) {
  const router = useRouter();
  const [book, setBook] = useState<BookRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) {
          throw new Error("Volume not found");
        }
        const data = await res.json();
        setBook(data.book);
      } catch (err: any) {
        setError(err.message || "Failed to load volume");
      } finally {
        setLoading(false);
      }
    }
    loadBook();
  }, [id]);

  if (loading) {
    return <AppLoading label="OPENING VOLUME..." />;
  }

  if (error || !book) {
    return (
      <AppPage width="wide">
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 800, color: "var(--pink)" }}>
            {error || "Volume not found"}
          </div>
          <button
            type="button"
            onClick={() => router.push("/marginalia")}
            style={{
              marginTop: "16px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              padding: "8px 16px",
              border: "2px solid var(--ink)",
              background: "var(--card)",
              cursor: "pointer",
            }}
          >
            ← BACK TO THE SHELF
          </button>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage width="wide">
      <div className="marginalia-wrap">
        <BookDetailView
          book={book}
          onBack={() => router.push("/marginalia")}
          onUpdateBook={(updated) => setBook(updated)}
        />
      </div>
    </AppPage>
  );
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <Suspense fallback={<AppLoading label="OPENING VOLUME..." />}>
      <BookDetailPageContent id={id} />
    </Suspense>
  );
}
