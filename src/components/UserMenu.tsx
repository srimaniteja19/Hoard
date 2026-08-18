"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";

interface UserMenuProps {
  variant?: "sidebar" | "compact";
}

export const UserMenu: React.FC<UserMenuProps> = ({ variant = "sidebar" }) => {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!session) {
    if (variant === "compact") {
      return (
        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "36px",
            boxSizing: "border-box",
            border: "var(--bd)",
            background: "var(--yel)",
            boxShadow: "var(--sh-sm)",
            padding: "0 10px",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "#000",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          SIGN IN
        </Link>
      );
    }

    return (
      <div style={{ padding: "12px 14px", borderTop: "2px solid var(--ink)" }}>
        <Link
          href="/login"
          style={{
            display: "block",
            textAlign: "center",
            border: "2px solid var(--ink)",
            background: "#FFE600",
            boxShadow: "3px 3px 0 var(--ink)",
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
  const initial = (user.name || "U")[0].toUpperCase();

  const avatar = user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.image}
      alt={user.name || "User"}
      style={{ width: "26px", height: "26px", border: "2px solid var(--ink)", objectFit: "cover" }}
    />
  ) : (
    <div
      style={{
        width: "26px",
        height: "26px",
        border: "2px solid var(--ink)",
        background: "var(--cyan)",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--mono)",
        fontSize: "10px",
        fontWeight: 800,
        color: "#000",
      }}
    >
      {initial}
    </div>
  );

  const accountActions = (
    <div style={{ display: "flex", gap: "6px" }}>
      <Link
        href="/settings"
        onClick={() => setOpen(false)}
        style={{
          flex: 1,
          display: "block",
          textAlign: "center",
          border: "2px solid var(--ink)",
          background: "var(--cyan)",
          color: "#000",
          padding: "8px 6px",
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        SETTINGS
      </Link>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          window.location.href = "/login";
        }}
        style={{
          flex: 1,
          border: "2px solid var(--ink)",
          background: "var(--pink)",
          color: "#fff",
          padding: "8px 6px",
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        SIGN OUT
      </button>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="user-menu-compact" ref={rootRef}>
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          style={{
            width: "36px",
            height: "36px",
            border: "var(--bd)",
            background: "var(--paper)",
            boxShadow: "var(--sh-sm)",
            padding: 0,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          {avatar}
        </button>
        {open ? (
          <div className="user-menu-compact-panel">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              {avatar}
              <div style={{ overflow: "hidden", minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "12px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {user.name || "Owner"}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", opacity: 0.6, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {user.email}
                </div>
              </div>
            </div>
            {accountActions}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px 14px",
        borderTop: "2px solid var(--ink)",
        background: "var(--paper)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        {avatar}
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: "12px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {user.name || "Owner"}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", opacity: 0.6, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {user.email}
          </div>
        </div>
      </div>
      {accountActions}
    </div>
  );
};
