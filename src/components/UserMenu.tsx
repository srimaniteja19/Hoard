"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";

export const UserMenu: React.FC = () => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div style={{ padding: "12px 14px", borderTop: "2px solid #000" }}>
        <Link
          href="/login"
          style={{
            display: "block",
            textAlign: "center",
            border: "2px solid #000",
            background: "#FFE600",
            boxShadow: "3px 3px 0 #000",
            padding: "8px 10px",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "#000",
            textDecoration: "none",
          }}
        >
          SIGN IN / OAUTH ↗
        </Link>
      </div>
    );
  }

  const user = session.user;

  return (
    <div
      style={{
        padding: "12px 14px",
        borderTop: "2px solid #000",
        background: "var(--paper)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name || "User"}
            style={{ width: "26px", height: "26px", border: "2px solid #000" }}
          />
        ) : (
          <div
            style={{
              width: "26px",
              height: "26px",
              border: "2px solid #000",
              background: "#00F0FF",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            {(user.name || "U")[0].toUpperCase()}
          </div>
        )}
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: "12px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {user.name || "Owner"}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", opacity: 0.6, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {user.email}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px" }}>
        <Link
          href="/settings"
          style={{
            flex: 1,
            display: "block",
            textAlign: "center",
            border: "2px solid #000",
            background: "#00F0FF",
            color: "#000",
            padding: "6px",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          SETTINGS ⚙️
        </Link>

        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
          style={{
            flex: 1,
            border: "2px solid #000",
            background: "#FF007A",
            color: "#fff",
            padding: "6px",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          SIGN OUT
        </button>
      </div>
    </div>
  );
};
