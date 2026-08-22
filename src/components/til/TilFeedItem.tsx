"use client";

import React, { useState } from "react";
import { TilType, tilTypeValues, LinkPreview } from "@/db/schema";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { EmbedRouter } from "@/components/til/embeds/EmbedRouter";
import {
  Edit2,
  Trash2,
  X,
  Copy,
  Check,
  Info,
  Terminal,
  Quote,
  Lightbulb,
  AlertTriangle,
  Cpu,
  MessageSquare,
  Link2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { confidence } from "@/lib/til/confidence";
import { tilTypeColorVar } from "@/lib/til/typeColorTokens";

export interface TilItem {
  id: string;
  userId: string;
  shortHash: string;
  type: TilType;
  body: string | null;
  code: string | null;
  codeLang: string | null;
  linkUrl: string | null;
  linkPreview: LinkPreview | null;
  linkDensity: string;
  dischargesBookmarkId: number | null;
  supersededById?: string | null;
  stability?: number;
  ease?: number;
  reviewCount?: number;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  confidence?: number;
  loggedFor: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

interface TilFeedItemProps {
  item: TilItem;
  onUpdate: (id: string, updated: Partial<TilItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelectTag?: (tag: string) => void;
  onSelectType?: (type: TilType) => void;
  validHashes?: Set<string>;
}

const TYPE_CONFIG: Record<
  TilType,
  { label: string; icon: React.FC<{ size: number; className?: string; style?: React.CSSProperties }> }
> = {
  FACT: { label: "FACT", icon: Lightbulb },
  GOTCHA: { label: "GOTCHA", icon: AlertTriangle },
  SNIPPET: { label: "SNIPPET", icon: Terminal },
  PATTERN: { label: "PATTERN", icon: Cpu },
  QUOTE: { label: "QUOTE", icon: Quote },
  OPINION: { label: "TAKE", icon: MessageSquare },
  LINK: { label: "EVIDENCE", icon: Link2 },
};

export const TilFeedItem: React.FC<TilFeedItemProps> = ({
  item,
  onUpdate,
  onDelete,
  onSelectTag,
  onSelectType,
  validHashes,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const [editBody, setEditBody] = useState(item.body || "");
  const [editCode, setEditCode] = useState(item.code || "");
  const [editCodeLang, setEditCodeLang] = useState(item.codeLang || "typescript");
  const [editType, setEditType] = useState<TilType>(item.type);
  const [editTags, setEditTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const typeTokenColor = tilTypeColorVar(item.type);
  const typeMeta = TYPE_CONFIG[item.type] || TYPE_CONFIG.FACT;
  const TypeIcon = typeMeta.icon;

  const itemConfidence =
    typeof item.confidence === "number"
      ? Math.round(item.confidence)
      : Math.round(
          confidence(
            item.stability ?? 1,
            item.lastReviewedAt ? new Date(item.lastReviewedAt) : new Date(item.createdAt)
          )
        );

  const handleCopyHash = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`#${item.shortHash}`);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch (err) {
      console.error("Failed to copy hash", err);
    }
  };

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.code) return;
    try {
      await navigator.clipboard.writeText(item.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  const handleCopyMarkdown = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let md = `> **[${item.type}] #${item.shortHash}**\n\n${item.body || ""}`;
    if (item.code) {
      md += `\n\n\`\`\`${item.codeLang || ""}\n${item.code}\n\`\`\``;
    }
    if (item.linkUrl) {
      md += `\n\nSource: ${item.linkUrl}`;
    }
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error("Failed to copy markdown", err);
    }
  };

  const handleSaveEdit = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await onUpdate(item.id, {
        type: editType,
        body: editBody,
        code: editType === "SNIPPET" ? editCode : undefined,
        codeLang: editType === "SNIPPET" ? editCodeLang : undefined,
        tags: editTags,
      });
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to update TIL item", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(item.id);
    } catch (e) {
      console.error("Failed to delete TIL item", e);
    }
  };

  const handleAddTag = () => {
    const cleaned = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (cleaned && !editTags.includes(cleaned)) {
      setEditTags([...editTags, cleaned]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setEditTags(editTags.filter((tag) => tag !== t));
  };

  // Battery Segment active count (out of 5)
  const activeCells = Math.max(1, Math.min(5, Math.ceil(itemConfidence / 20)));
  const cellColorClass =
    itemConfidence >= 70
      ? "active-high"
      : itemConfidence >= 40
      ? "active-med"
      : "active-low";

  return (
    <div
      id={`til-${item.shortHash}`}
      className={`til-card-root ${item.type === "PATTERN" ? "til-card-pattern-grid" : ""}`}
      style={{
        borderLeft: `6px solid ${typeTokenColor}`,
        opacity: item.supersededById ? 0.65 : 1,
      }}
    >
      {/* GOTCHA Caution Ribbon */}
      {item.type === "GOTCHA" && <div className="til-card-hazard-stripe" />}

      {/* Header bar: Hash anchor, Type Badge, Memory Gauge, Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "7px 12px",
          borderBottom: "1.5px solid var(--ink)",
          background: "color-mix(in srgb, var(--ink) 4%, var(--paper))",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
          {/* Type Badge */}
          <button
            type="button"
            onClick={() => onSelectType && onSelectType(item.type)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: typeTokenColor,
              color: "#000",
              border: "1px solid var(--ink)",
              padding: "2px 7px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "1px 1px 0 var(--ink)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
            title={`Filter by ${item.type}`}
          >
            <TypeIcon size={11} />
            {typeMeta.label}
          </button>

          {/* ShortHash Permlink Anchor */}
          <a
            href={`#til-${item.shortHash}`}
            onClick={handleCopyHash}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--ink)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              padding: "1px 4px",
              border: "1px solid transparent",
            }}
            title="Click to copy anchor permalink"
          >
            #{item.shortHash}
            {copiedHash ? (
              <span style={{ color: "var(--lime)", fontSize: "9px", fontWeight: 900 }}>COPIED</span>
            ) : (
              <Copy size={10} style={{ opacity: 0.6 }} />
            )}
          </a>

          {/* Segmented LED Memory Battery Gauge */}
          <div
            className="til-battery-meter"
            title={`Memory Retention: ${itemConfidence}% • Stability: ${(item.stability ?? 1).toFixed(1)}d • Reviews: ${item.reviewCount ?? 0}`}
          >
            <div className="til-battery-cells">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`til-battery-cell ${i < activeCells ? cellColorClass : ""}`}
                />
              ))}
            </div>
            <span>{itemConfidence}%</span>
          </div>

          {/* Discharged Badge */}
          {item.dischargesBookmarkId && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9.5px",
                fontWeight: 900,
                background: "var(--lime)",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "1.5px 5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                boxShadow: "1px 1px 0 var(--ink)",
              }}
              title="Discharged queued bookmark from debt"
            >
              <CheckCircle2 size={10} /> DISCHARGED
            </span>
          )}

          {/* Superseded Warning Banner */}
          {item.supersededById && (
            <span
              className="til-superseded-banner"
              title="This entry has been superseded by a newer entry"
            >
              <RotateCcw size={10} /> SUPERSEDED
            </span>
          )}
        </div>

        {/* Action Controls Dock */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {!isEditing ? (
            <>
              {/* Copy Markdown */}
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="til-action-btn"
                aria-label="Copy Markdown"
                title="Copy as formatted Markdown"
              >
                {copiedMarkdown ? <Check size={12} color="var(--lime)" /> : <Copy size={12} />}
                <span className="sr-only">Copy Markdown</span>
              </button>

              {/* Toggle Neural Dossier Info */}
              <button
                type="button"
                onClick={() => setShowDossier((prev) => !prev)}
                className="til-action-btn"
                style={{
                  background: showDossier ? "var(--ink)" : "transparent",
                  color: showDossier ? "var(--cream)" : "var(--ink)",
                  borderColor: showDossier ? "var(--ink)" : "transparent",
                }}
                aria-label="Inspect Dossier"
                title="Inspect FSRS Memory & Metadata Dossier"
              >
                <Info size={12} />
              </button>

              {/* Edit Button */}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="til-action-btn"
                aria-label="Edit TIL"
                title="Edit TIL entry"
              >
                <Edit2 size={12} />
              </button>

              {/* Delete Button */}
              {confirmDelete ? (
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--pink)", fontWeight: 900 }}>
                    Delete?
                  </span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      background: "var(--pink)",
                      color: "#FFF",
                      border: "1px solid var(--ink)",
                      fontSize: "9px",
                      fontWeight: 900,
                      padding: "1px 5px",
                      cursor: "pointer",
                    }}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      background: "var(--paper)",
                      color: "var(--ink)",
                      border: "1px solid var(--ink)",
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "1px 5px",
                      cursor: "pointer",
                    }}
                  >
                    NO
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="til-action-btn"
                  aria-label="Delete TIL"
                  title="Delete TIL entry"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </>
          ) : (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  background: "var(--lime)",
                  color: "#000",
                  border: "1px solid var(--ink)",
                  padding: "2px 8px",
                  fontSize: "10px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "1px 1px 0 var(--ink)",
                }}
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  background: "var(--paper)",
                  color: "var(--ink)",
                  border: "1px solid var(--ink)",
                  padding: "2px 8px",
                  fontSize: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Item Body / Content */}
      <div style={{ padding: "14px 16px", position: "relative" }}>
        {/* Decorative Quote Watermark for QUOTE type */}
        {item.type === "QUOTE" && <div className="til-quote-watermark">“</div>}

        {!isEditing ? (
          <>
            {/* Body Text */}
            {item.body && (
              <div
                style={{
                  fontSize: item.type === "QUOTE" ? "15.5px" : "14px",
                  lineHeight: "1.55",
                  fontWeight: item.type === "FACT" ? 500 : 400,
                  fontStyle: item.type === "QUOTE" ? "italic" : "normal",
                  color: "var(--ink)",
                  marginBottom: item.code || item.linkUrl || item.linkPreview ? "12px" : "8px",
                  textDecoration: item.supersededById ? "line-through" : "none",
                  borderLeft: item.type === "QUOTE" ? "3px solid var(--orange)" : "none",
                  paddingLeft: item.type === "QUOTE" ? "10px" : "0",
                }}
              >
                <MarkdownLite content={item.body} validHashes={validHashes} />
              </div>
            )}

            {/* Micro-Terminal for SNIPPET */}
            {item.code && (
              <div
                style={{
                  background: "#0E1117",
                  border: "1.5px solid var(--ink)",
                  boxShadow: "2px 2px 0 var(--ink)",
                  marginBottom: "12px",
                  overflow: "hidden",
                }}
              >
                {/* Terminal Header Chrome */}
                <div className="til-terminal-bar">
                  <div className="til-terminal-dots">
                    <span className="til-terminal-dot" style={{ background: "#FF5F56" }} />
                    <span className="til-terminal-dot" style={{ background: "#FFBD2E" }} />
                    <span className="til-terminal-dot" style={{ background: "#27C93F" }} />
                    <span style={{ marginLeft: "6px", color: "#8B949E", fontSize: "9.5px", textTransform: "uppercase" }}>
                      {item.codeLang || "code"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    style={{
                      background: copiedCode ? "var(--lime)" : "rgba(255,255,255,0.08)",
                      color: copiedCode ? "#000" : "#FFF",
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: "1px 6px",
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      borderRadius: "2px",
                    }}
                    title="Copy code to clipboard"
                  >
                    {copiedCode ? (
                      <>
                        <Check size={10} /> COPIED
                      </>
                    ) : (
                      <>
                        <Copy size={10} /> COPY
                      </>
                    )}
                  </button>
                </div>

                {/* Code Block Content */}
                <pre
                  style={{
                    margin: 0,
                    padding: "10px 12px",
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    color: "var(--cyan)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowX: "auto",
                  }}
                >
                  <code>{item.code}</code>
                </pre>
              </div>
            )}

            {/* Rich Link Embed */}
            {(item.linkUrl || item.linkPreview) && (
              <EmbedRouter
                preview={item.linkPreview}
                rawUrl={item.linkUrl}
                density={(item.linkDensity as "inline" | "card" | "quote" | "full") || "card"}
              />
            )}

            {/* Tactile Index Tag Tabs */}
            {item.tags && item.tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="til-tag-tab"
                    onClick={() => onSelectTag && onSelectTag(tag)}
                    title={`Filter by tag #${tag}`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Inline Editing View */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {tilTypeValues.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditType(t)}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 6px",
                    border: "1px solid var(--ink)",
                    background: editType === t ? tilTypeColorVar(t) : "transparent",
                    color: editType === t ? "#000" : "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                fontFamily: "inherit",
                fontSize: "13px",
                background: "transparent",
                color: "var(--ink)",
                border: "1.5px solid var(--ink)",
                padding: "6px 8px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            {editType === "SNIPPET" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800 }}>
                    SNIPPET CODE
                  </span>
                  <input
                    type="text"
                    value={editCodeLang}
                    onChange={(e) => setEditCodeLang(e.target.value)}
                    placeholder="language"
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      background: "transparent",
                      color: "var(--ink)",
                      border: "1px solid var(--ink)",
                      padding: "1px 4px",
                      width: "80px",
                    }}
                  />
                </div>
                <textarea
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                    background: "#1E1E1E",
                    color: "var(--cyan)",
                    border: "1.5px solid var(--ink)",
                    padding: "6px 8px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              {editTags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    background: "var(--ink)",
                    color: "var(--cream)",
                    padding: "1px 4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  #{t}
                  <X size={10} style={{ cursor: "pointer" }} onClick={() => handleRemoveTag(t)} />
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--ink)",
                  padding: "2px 4px",
                  width: "80px",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Backside Neural Dossier Panel */}
      {showDossier && !isEditing && (
        <div className="til-dossier-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              🧠 FSRS Neural Memory & Ledger Dossier
            </span>
            <button
              type="button"
              onClick={() => setShowDossier(false)}
              className="til-action-btn"
              style={{ padding: "0 4px" }}
            >
              <X size={12} />
            </button>
          </div>

          <div className="til-dossier-grid">
            <div className="til-dossier-stat">
              <div className="til-dossier-stat-label">Memory Stability</div>
              <div className="til-dossier-stat-val">{(item.stability ?? 1).toFixed(1)} days</div>
            </div>

            <div className="til-dossier-stat">
              <div className="til-dossier-stat-label">Review Count</div>
              <div className="til-dossier-stat-val">{item.reviewCount ?? 0} reviews</div>
            </div>

            <div className="til-dossier-stat">
              <div className="til-dossier-stat-label">Ease Factor</div>
              <div className="til-dossier-stat-val">{(item.ease ?? 2.5).toFixed(2)}</div>
            </div>

            <div className="til-dossier-stat">
              <div className="til-dossier-stat-label">Logged Date</div>
              <div className="til-dossier-stat-val">{item.loggedFor}</div>
            </div>

            {item.nextReviewAt && (
              <div className="til-dossier-stat">
                <div className="til-dossier-stat-label">Next Recall</div>
                <div className="til-dossier-stat-val">
                  {new Date(item.nextReviewAt).toLocaleDateString()}
                </div>
              </div>
            )}

            {item.dischargesBookmarkId && (
              <div className="til-dossier-stat">
                <div className="til-dossier-stat-label">Discharged Debt</div>
                <div className="til-dossier-stat-val">Bookmark #{item.dischargesBookmarkId}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
