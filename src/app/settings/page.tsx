"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ThemePicker } from "@/components/ThemePicker";
import { UserMenu } from "@/components/UserMenu";
import { AppNav } from "@/components/AppNav";
import { Key, Copy, Check, Trash2, Plus, ShieldCheck, Clock, Gauge } from "lucide-react";

interface CalibrationResult {
  overall: number | null;
  byEnergy: Record<"DEEP" | "SHALLOW" | "ERRAND", number | null>;
  sampleCount: number;
}

interface BusyBlockItem {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

  const [paddingEnabled, setPaddingEnabled] = useState(false);
  const [paddingSaving, setPaddingSaving] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);

  useEffect(() => {
    async function loadCalibrationSettings() {
      try {
        const [settingsRes, calRes] = await Promise.all([
          fetch("/api/settings", { credentials: "include" }),
          fetch("/api/todos/calibration", { credentials: "include" }),
        ]);
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setPaddingEnabled(Boolean(s.todoCalibrationPaddingEnabled));
        }
        if (calRes.ok) setCalibrationResult(await calRes.json());
      } catch (e) {
        console.error("Failed to load calibration settings", e);
      }
    }
    loadCalibrationSettings();
  }, []);

  const togglePadding = async () => {
    const next = !paddingEnabled;
    setPaddingEnabled(next);
    setPaddingSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoCalibrationPaddingEnabled: next }),
      });
    } catch (e) {
      console.error("Failed to save calibration padding setting", e);
      setPaddingEnabled(!next);
    } finally {
      setPaddingSaving(false);
    }
  };

  const [busyBlocks, setBusyBlocks] = useState<BusyBlockItem[]>([]);
  const [newBlock, setNewBlock] = useState({ title: "", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" });
  const [addingBlock, setAddingBlock] = useState(false);

  useEffect(() => {
    async function loadBusyBlocks() {
      try {
        const res = await fetch("/api/busy-blocks", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setBusyBlocks(data.items || []);
        }
      } catch (e) {
        console.error("Failed to load busy blocks", e);
      }
    }
    loadBusyBlocks();
  }, []);

  const addBusyBlock = async () => {
    if (!newBlock.title.trim() || newBlock.endTime <= newBlock.startTime) return;
    setAddingBlock(true);
    try {
      const res = await fetch("/api/busy-blocks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBlock),
      });
      if (res.ok) {
        const created = await res.json();
        setBusyBlocks((prev) => [...prev, created]);
        setNewBlock((prev) => ({ ...prev, title: "" }));
      }
    } catch (e) {
      console.error("Failed to add busy block", e);
    } finally {
      setAddingBlock(false);
    }
  };

  const deleteBusyBlock = async (id: string) => {
    setBusyBlocks((prev) => prev.filter((b) => b.id !== id));
    try {
      await fetch(`/api/busy-blocks/${id}`, { method: "DELETE", credentials: "include" });
    } catch (e) {
      console.error("Failed to delete busy block", e);
    }
  };

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
    <div className="dvh-page settings-page-container" style={{ background: "var(--cream)", color: "var(--ink)" }}>
      {/* Top Header Navigation Bar */}
      <header
        className="page-app-header"
        style={{
          background: "var(--paper)",
          borderBottom: "var(--bd)",
          padding: "10px 16px",
          paddingTop: "max(10px, env(safe-area-inset-top))",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "var(--sh-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/" className="app-wordmark">
            HOARD
          </Link>
          <span style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.5, color: "var(--ink)" }}>/</span>
          <span
            className="settings-title-badge"
            style={{
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 900,
              background: "var(--cyan)",
              color: "#000",
              padding: "2px 6px",
              border: "1px solid var(--ink)",
            }}
          >
            SETTINGS
          </span>
        </div>

        <AppNav />

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ThemePicker />
          <UserMenu variant="compact" />
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
              border: "3px solid var(--ink)",
              boxShadow: "4px 4px 0 var(--ink)",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 900, color: "#000", marginBottom: "6px" }}>
              🔑 NEW EXTENSION TOKEN ISSUED (COPY NOW — WON&apos;T BE SHOWN AGAIN)
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
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
                  border: "2px solid var(--ink)",
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
                  border: "2px solid var(--ink)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  boxShadow: "2px 2px 0 var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                  minHeight: "44px",
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
                    background: "var(--cream)",
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

        {/* Todo estimate calibration — TODOS.md §6 */}
        <div style={{ marginTop: "32px" }}>
          <h1 style={{ fontFamily: "var(--mono)", fontSize: "22px", fontWeight: 900, margin: "0 0 16px", color: "var(--ink)" }}>
            <Gauge size={18} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
            TODO ESTIMATE CALIBRATION
          </h1>

          <div
            style={{
              background: "var(--paper)",
              border: "var(--bd)",
              boxShadow: "var(--sh-sm)",
              padding: "16px",
            }}
          >
            {calibrationResult && calibrationResult.overall === null ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.7, marginBottom: "12px" }}>
                {calibrationResult.sampleCount}/30 completed tasks with a recorded actual time. Need at least 30
                before a multiplier means anything — a multiplier from ten tasks is noise dressed as insight.
              </div>
            ) : calibrationResult && calibrationResult.overall !== null ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "12px" }}>
                <div style={{ marginBottom: "6px" }}>
                  Your tasks take <b>{calibrationResult.overall}×</b> your estimate on average ({calibrationResult.sampleCount}{" "}
                  samples).
                </div>
                {(["DEEP", "SHALLOW", "ERRAND"] as const).map((energy) => (
                  <div key={energy} style={{ opacity: 0.7 }}>
                    {energy}: {calibrationResult.byEnergy[energy] !== null ? `${calibrationResult.byEnergy[energy]}×` : "not enough samples yet"}
                  </div>
                ))}
              </div>
            ) : null}

            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={paddingEnabled}
                onChange={togglePadding}
                disabled={paddingSaving}
                style={{ width: "18px", height: "18px" }}
              />
              <span style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 700 }}>
                Pad new estimates by my calibration multiplier
              </span>
            </label>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.5, marginTop: "6px", paddingLeft: "28px" }}>
              Default off. When on, today&apos;s free-time calculation on the home page accounts for how long tasks
              actually take you, not just how long you guessed.
            </div>
          </div>
        </div>

        {/* Weekly busy blocks — TODOS.md §7. A manually-filled recurring
            template, not calendar sync (that's explicitly out of scope). */}
        <div style={{ marginTop: "32px" }}>
          <h1 style={{ fontFamily: "var(--mono)", fontSize: "22px", fontWeight: 900, margin: "0 0 16px", color: "var(--ink)" }}>
            <Clock size={18} style={{ verticalAlign: "-3px", marginRight: "6px" }} />
            WEEKLY BUSY BLOCKS
          </h1>

          <div style={{ background: "var(--paper)", border: "var(--bd)", boxShadow: "var(--sh-sm)", padding: "16px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.6, marginBottom: "12px" }}>
              Fills the day plan on /todos. Recurring weekly slots you set once — not synced from a calendar.
            </div>

            {busyBlocks.length === 0 ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.5, marginBottom: "12px" }}>
                Nothing blocked out yet.
              </div>
            ) : (
              <div style={{ marginBottom: "12px" }}>
                {busyBlocks.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--ink)",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: 800, width: "34px" }}>{DAY_NAMES[b.dayOfWeek]}</span>
                    <span style={{ flex: 1 }}>{b.title}</span>
                    <span style={{ opacity: 0.6 }}>
                      {b.startTime}–{b.endTime}
                    </span>
                    <button
                      onClick={() => deleteBusyBlock(b.id)}
                      aria-label="Delete busy block"
                      style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, display: "flex" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <select
                value={newBlock.dayOfWeek}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "5px", border: "1.5px solid var(--ink)", background: "var(--paper)", color: "var(--ink)" }}
              >
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Title (e.g. Standup)"
                value={newBlock.title}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, title: e.target.value }))}
                style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "5px 8px", border: "1.5px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", flex: 1, minWidth: "120px" }}
              />
              <input
                type="time"
                value={newBlock.startTime}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, startTime: e.target.value }))}
                style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "5px", border: "1.5px solid var(--ink)", background: "var(--paper)", color: "var(--ink)" }}
              />
              <input
                type="time"
                value={newBlock.endTime}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, endTime: e.target.value }))}
                style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "5px", border: "1.5px solid var(--ink)", background: "var(--paper)", color: "var(--ink)" }}
              />
              <button
                onClick={addBusyBlock}
                disabled={addingBlock}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "6px 12px",
                  border: "1.5px solid var(--ink)",
                  background: "var(--lime)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Plus size={12} /> ADD
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
