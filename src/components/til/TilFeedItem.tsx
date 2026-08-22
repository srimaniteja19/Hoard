"use client";

import React, { useState } from "react";
import { TilType, tilTypeValues, LinkPreview } from "@/db/schema";
import { confidence } from "@/lib/til/confidence";
import {
  parseGotcha,
  parseQuote,
  parseOpinion,
  parsePattern,
} from "@/lib/til/entryParser";
import { Edit2, Trash2, X, Check, ExternalLink } from "lucide-react";
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

export const TilFeedItem: React.FC<TilFeedItemProps> = ({
  item,
  onUpdate,
  onDelete,
  onSelectTag,
  onSelectType,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(item.body || "");
  const [editCode, setEditCode] = useState(item.code || "");
  const [editCodeLang, setEditCodeLang] = useState(item.codeLang || "typescript");
  const [editType, setEditType] = useState<TilType>(item.type);
  const [editTags, setEditTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const itemConfidence =
    typeof item.confidence === "number"
      ? item.confidence
      : confidence(
          item.stability ?? 1,
          item.lastReviewedAt ? new Date(item.lastReviewedAt) : new Date(item.createdAt)
        );

  const fVal = Math.max(0.05, Math.min(1, itemConfidence / 100));
  const decayState = fVal >= 0.7 ? "fresh" : fVal >= 0.4 ? "fading" : "ghost";
  const decayLabel = fVal >= 0.7 ? "HOLDING" : fVal >= 0.4 ? "FADING" : "GHOST";

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleCopyCode = async () => {
    if (!item.code) return;
    try {
      await navigator.clipboard.writeText(item.code);
      triggerFeedback("COPIED CODE!");
    } catch {
      // fallback
    }
  };

  const handleCopy = async () => {
    let text = item.body || "";
    if (item.code) text += `\n\n\`\`\`${item.codeLang || ""}\n${item.code}\n\`\`\``;
    try {
      await navigator.clipboard.writeText(text);
      triggerFeedback("COPIED!");
    } catch {
      // fallback
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

  // Render card based on 7 distinct architectural archetypes
  const renderCardContent = () => {
    switch (item.type) {
      case "GOTCHA": {
        const gotcha = parseGotcha(item.body);
        return (
          <div className="gt">
            <div className="gt__row">
              <div className="gt__l">I THOUGHT</div>
              <div className="gt__v wrong">{gotcha.thought}</div>
            </div>
            <div className="gt__row">
              <div className="gt__l">ACTUALLY</div>
              <div className="gt__v right">{gotcha.actually}</div>
            </div>
            {gotcha.cost && (
              <div className="gt__cost">
                <b>COST</b> {gotcha.cost}
              </div>
            )}
          </div>
        );
      }

      case "SNIPPET": {
        const lines = (item.code || "").split("\n");
        return (
          <>
            <div className="snip__why">{item.body || "Key code snippet"}</div>
            <pre className="code">
              {lines.map((line, idx) => (
                <div key={idx} className={idx === lines.length - 1 && lines.length > 2 ? "h" : ""}>
                  <span className="ln">{idx + 1}</span>
                  <code>{line}</code>
                </div>
              ))}
            </pre>
          </>
        );
      }

      case "PATTERN": {
        const pattern = parsePattern(item.body, item.loggedFor || "TODAY");
        return (
          <>
            <p className="pat__n">{pattern.name || item.body}</p>
            <div className="pat__seen">
              {pattern.instances.length > 0 ? (
                pattern.instances.map((inst, idx) => (
                  <div key={idx}>
                    <b>{inst.date}</b>
                    <span>{inst.note}</span>
                  </div>
                ))
              ) : (
                <div>
                  <b>{item.loggedFor}</b>
                  <span>First recurring pattern recognized</span>
                </div>
              )}
            </div>
          </>
        );
      }

      case "QUOTE": {
        const parsed = parseQuote(item.body);
        return (
          <>
            <blockquote className="qt">{parsed.quote}</blockquote>
            {parsed.author && (
              <div className="qt__by">
                {parsed.author.toUpperCase()} <span>· QUOTE</span>
              </div>
            )}
          </>
        );
      }

      case "OPINION": {
        const opinion = parseOpinion(item.body, item.createdAt);
        return (
          <>
            <p className="op">{opinion.take}</p>
            <div className="conv">
              <span className="conv__l">CONVICTION WHEN FILED</span>
              <span className="conv__d">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <i key={lvl} className={lvl <= opinion.conviction ? "on" : ""} />
                ))}
              </span>
              <span className="conv__age">
                FILED {opinion.ageDays} {opinion.ageDays === 1 ? "DAY" : "DAYS"} AGO · {item.reviewCount ? `REVISITED ${item.reviewCount}×` : "NEVER REVISITED"}
              </span>
            </div>
          </>
        );
      }

      case "LINK": {
        const preview = item.linkPreview;
        const targetUrl = item.linkUrl || preview?.url;
        const title = preview?.title || targetUrl || "Reference Link";
        const host = preview?.host || (targetUrl ? new URL(targetUrl).hostname : "web");
        const thumbUrl = preview?.thumbnailKey;

        return (
          <>
            <div className="lk">
              <span
                className="lk__thumb"
                style={thumbUrl ? { backgroundImage: `url(${thumbUrl})` } : {}}
              />
              <div className="lk__t">
                <b>{title}</b>
                <span>
                  {host.toUpperCase()} {preview?.durationSec ? `· ${Math.ceil(preview.durationSec / 60)} MIN` : ""}
                </span>
              </div>
            </div>
            {item.body && <div className="lk__why">{item.body}</div>}
          </>
        );
      }

      case "FACT":
      default: {
        return (
          <>
            <p className="claim">{item.body}</p>
            {item.linkUrl && (
              <div className="src">
                FROM ▸{" "}
                <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
                  {item.linkPreview?.host || item.linkUrl}
                </a>
              </div>
            )}
          </>
        );
      }
    }
  };

  // Card kind icon prefix
  const kindIcons: Record<TilType, string> = {
    FACT: "◆ FACT",
    GOTCHA: "⚠ GOTCHA",
    SNIPPET: "▤ SNIPPET",
    PATTERN: "◈ PATTERN",
    QUOTE: "❝ QUOTE",
    OPINION: "✱ OPINION",
    LINK: "⇱ LINK",
  };

  const cardClass = `e e--${item.type.toLowerCase()}`;

  return (
    <article
      id={`til-${item.shortHash}`}
      className={cardClass}
      data-s={decayState}
      style={{ ["--f" as string]: fVal }}
    >
      {/* Card Header Bar */}
      <div className="e__h">
        <span
          className="e__kind"
          onClick={() => onSelectType && onSelectType(item.type)}
          style={{ cursor: "pointer" }}
        >
          {kindIcons[item.type] || item.type}
        </span>
        <span className="e__id">#{item.shortHash}</span>

        {item.type === "SNIPPET" && item.codeLang && (
          <>
            <span className="e__sp" />
            <span className="e__id">{item.codeLang.toUpperCase()}</span>
          </>
        )}

        {item.type === "PATTERN" && (
          <>
            <span className="e__sp" />
            <span className="e__id">SEEN {item.reviewCount ? item.reviewCount + 1 : 1}×</span>
          </>
        )}

        <span className="e__sp" />

        {/* Memory Holding Bar */}
        <span className="hold" title={`Memory Retention: ${Math.round(fVal * 100)}%`}>
          <span className="hold__l">{decayLabel}</span>
          <span className="hold__t">
            <span className="hold__f" style={{ width: `${Math.round(fVal * 100)}%` }} />
          </span>
        </span>
      </div>

      {/* Card Body */}
      <div className="e__b">
        {!isEditing ? (
          renderCardContent()
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
                    fontWeight: 700,
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
                fontSize: "14px",
                border: "2px solid var(--ink)",
                padding: "6px 8px",
                boxSizing: "border-box",
              }}
            />

            {editType === "SNIPPET" && (
              <textarea
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  background: "#161616",
                  color: "var(--lime)",
                  border: "2px solid var(--ink)",
                  padding: "6px 8px",
                }}
              />
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              {editTags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "var(--ink)",
                    color: "var(--yellow, #FFE94A)",
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
                  border: "1px solid var(--ink)",
                  padding: "2px 4px",
                  width: "80px",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Footer per Type */}
      <div className="e__f">
        {!isEditing ? (
          <>
            {item.type === "GOTCHA" && (
              <>
                <button
                  className="p"
                  type="button"
                  onClick={() => triggerFeedback("TEST QUEUED!")}
                >
                  {actionFeedback || "TEST ME"}
                </button>
                <button type="button" onClick={() => triggerFeedback("CONFIRMED STILL TRUE!")}>
                  STILL TRUE
                </button>
                <button type="button" onClick={handleCopy}>
                  COPY
                </button>
              </>
            )}

            {item.type === "SNIPPET" && (
              <>
                <button className="p" type="button" onClick={handleCopyCode}>
                  {actionFeedback || "COPY CODE"}
                </button>
                <button type="button" onClick={() => triggerFeedback("TEST QUEUED!")}>
                  TEST ME
                </button>
                <button type="button" onClick={() => triggerFeedback("EXECUTING...")}>
                  RUN IT
                </button>
              </>
            )}

            {item.type === "PATTERN" && (
              <>
                <button className="p" type="button" onClick={() => triggerFeedback("TEST QUEUED!")}>
                  {actionFeedback || "TEST ME"}
                </button>
                <button type="button" onClick={() => setIsEditing(true)}>
                  ADD INSTANCE
                </button>
                <button type="button" onClick={() => triggerFeedback("PROMOTED TO ATLAS!")}>
                  PROMOTE TO ATLAS
                </button>
              </>
            )}

            {item.type === "QUOTE" && (
              <>
                <button className="p" type="button" onClick={handleCopy}>
                  {actionFeedback || "COPY"}
                </button>
                {item.linkUrl ? (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <button type="button">FIND SOURCE ↗</button>
                  </a>
                ) : (
                  <button type="button" onClick={() => triggerFeedback("NO URL ATTACHED")}>
                    FIND SOURCE
                  </button>
                )}
              </>
            )}

            {item.type === "OPINION" && (
              <>
                <button className="p" type="button" onClick={() => triggerFeedback("STILL BELIEVED!")}>
                  {actionFeedback || "STILL BELIEVE THIS?"}
                </button>
                <button type="button" onClick={() => setIsEditing(true)}>
                  REVISE
                </button>
                <button type="button" onClick={() => triggerFeedback("RETRACTED")}>
                  RETRACT
                </button>
              </>
            )}

            {item.type === "LINK" && (
              <>
                {item.linkUrl ? (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <button className="p" type="button">
                      OPEN ↗
                    </button>
                  </a>
                ) : (
                  <button className="p" type="button">
                    OPEN ↗
                  </button>
                )}
                <button type="button" onClick={() => triggerFeedback("FILED TO SHELF!")}>
                  FILE TO SHELF
                </button>
              </>
            )}

            {item.type === "FACT" && (
              <>
                <button className="p" type="button" onClick={() => triggerFeedback("TEST QUEUED!")}>
                  {actionFeedback || "TEST ME"}
                </button>
                <button type="button" onClick={() => triggerFeedback("CONFIRMED STILL TRUE!")}>
                  STILL TRUE
                </button>
                <button type="button" onClick={handleCopy}>
                  COPY
                </button>
              </>
            )}

            {/* Edit / Delete small controls */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              title="Edit entry"
              style={{ padding: "11px 10px", opacity: 0.6 }}
            >
              <Edit2 size={12} />
            </button>

            {confirmDelete ? (
              <div style={{ display: "flex", alignItems: "center", background: "var(--pink)", padding: "0 6px" }}>
                <span style={{ fontSize: "9px", color: "#fff", fontWeight: 800, marginRight: "4px" }}>DEL?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{ background: "#000", color: "#fff", padding: "3px 6px", fontSize: "9px" }}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{ background: "transparent", color: "#fff", padding: "3px 4px", fontSize: "9px" }}
                >
                  NO
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Delete entry"
                style={{ padding: "11px 10px", opacity: 0.6 }}
              >
                <Trash2 size={12} />
              </button>
            )}

            <span className="sp" />

            {/* Tag Pills */}
            {item.tags &&
              item.tags.map((t) => (
                <span
                  key={t}
                  className="tag"
                  onClick={() => onSelectTag && onSelectTag(t)}
                  title={`Filter by #${t}`}
                >
                  #{t}
                </span>
              ))}
          </>
        ) : (
          /* Save / Cancel Controls */
          <div style={{ display: "flex", width: "100%" }}>
            <button
              className="p"
              type="button"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <button type="button" onClick={() => setIsEditing(false)}>
              CANCEL
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
