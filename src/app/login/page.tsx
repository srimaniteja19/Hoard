"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    try {
      setLoadingProvider(provider);
      await signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (err) {
      console.error(`Sign in with ${provider} failed:`, err);
      setLoadingProvider(null);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        background: "var(--cream)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "min(460px, 94vw)",
          background: "var(--paper)",
          border: "4px solid #000",
          boxShadow: "10px 10px 0 #000",
          padding: "28px 24px",
        }}
      >
        {/* Brand Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "22px",
              letterSpacing: "-.06em",
              background: "var(--yel)",
              border: "3px solid #000",
              boxShadow: "3px 3px 0 #000",
              padding: "4px 12px",
            }}
          >
            HOARD
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
              border: "2px solid #000",
              background: "var(--lime)",
              padding: "3px 7px",
            }}
          >
            OAUTH AUTH
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--mono)",
            fontSize: "24px",
            fontWeight: 800,
            letterSpacing: "-.05em",
            margin: "0 0 8px",
            textTransform: "uppercase",
          }}
        >
          SIGN IN TO HOARD
        </h1>

        <p
          style={{
            fontSize: "13.5px",
            lineHeight: 1.45,
            color: "#3A3A3A",
            marginBottom: "24px",
          }}
        >
          OAuth authentication powered by Better Auth. No passwords, reset flows, or verification emails.
        </p>

        {/* OAuth Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={() => handleOAuthSignIn("github")}
            disabled={loadingProvider !== null}
            style={{
              border: "3px solid #000",
              background: "#000",
              color: "#fff",
              boxShadow: "4px 4px 0 #000",
              padding: "14px 16px",
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: ".05em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: ".1s",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {loadingProvider === "github" ? "CONNECTING TO GITHUB..." : "CONTINUE WITH GITHUB"}
          </button>

          <button
            onClick={() => handleOAuthSignIn("google")}
            disabled={loadingProvider !== null}
            style={{
              border: "3px solid #000",
              background: "#FFFDF8",
              color: "#000",
              boxShadow: "4px 4px 0 #000",
              padding: "14px 16px",
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: ".05em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: ".1s",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {loadingProvider === "google" ? "CONNECTING TO GOOGLE..." : "CONTINUE WITH GOOGLE"}
          </button>
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "2px solid #000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.6 }}>
            Single-tenant active (Maniteja)
          </span>
          <Link
            href="/"
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#000",
              textDecoration: "underline",
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
