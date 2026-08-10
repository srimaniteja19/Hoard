"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ThemePicker } from "@/components/ThemePicker";
import { UserMenu } from "@/components/UserMenu";
import { ArrowLeft, Key, Copy, Check, Trash2, Plus, ShieldCheck, Clock } from "lucide-react";

interface ExtensionTokenItem {
  id: string;
  name: string;
  scopes: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const [tokens, setTokens] = useState<ExtensionTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTokenName, setNewTokenName] = useState("Chrome Extension");
  const [issuedSecretToken, setIssuedSecretToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/extension/tokens", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTokens(data);
      }
    } catch (e) {
      console.error("Failed to load extension tokens", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Idiomatic fetch-on-mount; fetchTokens sets loading state before its first await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTokens();
  }, []);

  const handleIssueToken = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newTokenName.trim() || issuing) return;

    try {
      setIssuing(true);
      const res = await fetch("/api/extension/tokens", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setIssuedSecretToken(data.token);
        setNewTokenName("Chrome Extension");
        fetchTokens();
      }
    } catch (err) {
      console.error("Failed to issue extension token", err);
    } finally {
      setIssuing(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    try {
      const res = await fetch(`/api/extension/tokens?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to revoke token", err);
    }
  };

  const handleCopySecret = () => {
    if (issuedSecretToken) {
      navigator.clipboard.writeText(issuedSecretToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="settings-page-container"
      style={{
        height: "100vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: "var(--bg, #FFFDF8)",
        color: "var(--ink)",
      }}
    >
      {/* Top Header Navigation Bar */}
      <header
        style={{
          background: "var(--paper)",
          borderBottom: "var(--bd)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "var(--sh-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--ink)",
              textDecoration: "none",
              background: "var(--bg, #FFFDF8)",
              border: "1.5px solid var(--ink)",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "2px 2px 0 var(--ink)",
            }}
          >
            <ArrowLeft size={13} /> QUEUE
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, color: "var(--ink)" }}>
              HOARD
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.5, color: "var(--ink)" }}>/</span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "12px",
                fontWeight: 900,
                background: "#00F0FF",
                color: "#000",
                padding: "2px 6px",
                border: "1px solid var(--ink)",
              }}
            >
              SETTINGS & EXTENSION TOKENS
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ThemePicker />
          <UserMenu />
        </div>
      </header>

      <main style={{ maxWidth: "840px", margin: "0 auto", padding: "28px 16px" }}>
        {/* Section Title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontFamily: "var(--mono)", fontSize: "22px", fontWeight: 900, margin: 0, color: "var(--ink)" }}>
            ⚡ EXTENSION TOKENS & SECURITY
          </h1>
          <p style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.7, margin: "4px 0 0 0" }}>
            Issue long-lived bearer tokens for the HOARD Chrome MV3 extension. Never relies on fragile web session cookies.
          </p>
        </div>

        {/* Issued Secret Banner */}
        {issuedSecretToken && (
          <div
            style={{
              background: "#FFE600",
              border: "3px solid #000",
              boxShadow: "4px 4px 0 #000",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 900, color: "#000", marginBottom: "6px" }}>
              🔑 NEW EXTENSION TOKEN ISSUED (COPY NOW — WON&apos;T BE SHOWN AGAIN)
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
              <input
                type="text"
                readOnly
                value={issuedSecretToken}
                style={{
                  flex: 1,
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  fontWeight: 800,
                  background: "#000",
                  color: "#00F0FF",
                  border: "2px solid #000",
                  padding: "8px 12px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleCopySecret}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  fontWeight: 900,
                  background: copied ? "#B6FF3C" : "#00F0FF",
                  color: "#000",
                  border: "2px solid #000",
                  padding: "8px 14px",
                  cursor: "pointer",
                  boxShadow: "2px 2px 0 #000",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "COPIED!" : "COPY TOKEN"}
              </button>
            </div>

            <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#000" }}>
              Paste this token into the HOARD Chrome extension popup settings tab.
            </div>
          </div>
        )}

        {/* Issue New Token Form */}
        <div
          style={{
            background: "var(--paper)",
            border: "var(--bd)",
            boxShadow: "var(--sh)",
            padding: "20px",
            marginBottom: "28px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 900, color: "var(--ink)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Key size={16} /> ISSUE NEW EXTENSION TOKEN
          </div>

          <form onSubmit={handleIssueToken} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Token name (e.g. Macbook Chrome)"
              required
              style={{
                flex: 1,
                minWidth: "200px",
                fontFamily: "var(--mono)",
                fontSize: "13px",
                background: "transparent",
                color: "var(--ink)",
                border: "2px solid var(--ink)",
                padding: "8px 12px",
                outline: "none",
              }}
            />

            <button
              type="submit"
              disabled={issuing || !newTokenName.trim()}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "12px",
                fontWeight: 900,
                background: "#B6FF3C",
                color: "#000",
                border: "2px solid var(--ink)",
                padding: "8px 18px",
                cursor: issuing ? "wait" : "pointer",
                boxShadow: "3px 3px 0 var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Plus size={14} /> {issuing ? "ISSUING..." : "GENERATE TOKEN"}
            </button>
          </form>
        </div>

        {/* Active Tokens List */}
        <div
          style={{
            background: "var(--paper)",
            border: "var(--bd)",
            boxShadow: "var(--sh)",
            padding: "20px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 900, color: "var(--ink)", marginBottom: "14px" }}>
            ACTIVE EXTENSION TOKENS ({tokens.length})
          </div>

          {loading ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "16px 0", textAlign: "center" }}>
              LOADING TOKENS...
            </div>
          ) : tokens.length === 0 ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.6, padding: "16px 0", textAlign: "center" }}>
              No active extension tokens found. Generate one above to connect the Chrome extension!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tokens.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "var(--bg, #FFFDF8)",
                    border: "1.5px solid var(--ink)",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, color: "var(--ink)", marginBottom: "4px" }}>
                      {t.name}
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9.5px",
                          fontWeight: 800,
                          background: "#00F0FF",
                          color: "#000",
                          border: "1px solid var(--ink)",
                          padding: "1px 5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <ShieldCheck size={10} /> {t.scopes}
                      </span>

                      <span style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.7, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <Clock size={10} /> Last used: {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : "Never"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeToken(t.id)}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 900,
                      background: "#FF007A",
                      color: "#FFF",
                      border: "1.5px solid var(--ink)",
                      padding: "4px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      boxShadow: "2px 2px 0 var(--ink)",
                    }}
                  >
                    <Trash2 size={12} /> REVOKE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
