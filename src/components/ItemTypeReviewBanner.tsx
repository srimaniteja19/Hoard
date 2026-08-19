"use client";

import Link from "next/link";

export function ItemTypeReviewBanner({ guessedCount }: { guessedCount: number }) {
  if (guessedCount <= 0) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        border: "var(--bd)",
        background: "var(--yel)",
        boxShadow: "var(--sh-sm)",
        padding: "8px 14px",
        margin: "0 0 12px",
        fontFamily: "var(--mono)",
        fontSize: "11px",
        fontWeight: 800,
        color: "#000",
      }}
    >
      <span>
        WE GUESSED ON {guessedCount} ITEM{guessedCount === 1 ? "" : "S"} — correct any that are wrong.
      </span>
      <Link
        href="/library/review"
        style={{ color: "#000", textDecoration: "underline", whiteSpace: "nowrap" }}
      >
        REVIEW →
      </Link>
    </div>
  );
}
