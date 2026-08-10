"use client";

import React, { useState } from "react";
import { TilType, tilTypeValues, LinkPreview } from "@/db/schema";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { EmbedRouter } from "@/components/til/embeds/EmbedRouter";
import { Edit2, Trash2, X } from "lucide-react";

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
}

const TYPE_RAIL_COLOR: Record<TilType, string> = {
  FACT: "#00F0FF",
  GOTCHA: "#FF007A",
  SNIPPET: "#FFE600",
  PATTERN: "#B6FF3C",
  QUOTE: "#9D4EDD",
  OPINION: "#FF9100",
  LINK: "#7209B7",
};

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

  const railColor = TYPE_RAIL_COLOR[item.type] || "#00F0FF";

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

  return (
    <div
      id={`til-${item.shortHash}`}
      style={{
        background: "var(--paper)",
        border: "var(--bd)",
        boxShadow: "var(--sh-sm)",
        marginBottom: "12px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        borderLeft: `6px solid ${railColor}`,
      }}
    >
      {/* Header bar: Hash anchor, Type Badge, Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid var(--ink)",
          background: "rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => onSelectType && onSelectType(item.type)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: railColor,
              color: "#000",
              border: "1px solid var(--ink)",
              padding: "1px 6px",
              cursor: "pointer",
            }}
          >
            {item.type}
          </button>

          <a
            href={`#til-${item.shortHash}`}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--ink)",
              textDecoration: "none",
              opacity: 0.7,
            }}
          >
            #{item.shortHash}
          </a>

          {item.dischargesBookmarkId && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9px",
                fontWeight: 800,
                background: "#B6FF3C",
                color: "#000",
                border: "1px solid var(--ink)",
                padding: "1px 4px",
              }}
              title="Discharged queued bookmark"
            >
              ✓ DISCHARGED
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink)",
                  padding: "2px",
                }}
                title="Edit TIL"
              >
                <Edit2 size={13} />
              </button>

              {confirmDelete ? (
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "#FF007A", fontWeight: 800 }}>
                    Delete?
                  </span>
                  <button
                    onClick={handleDelete}
                    style={{
                      background: "#FF007A",
                      color: "#FFF",
                      border: "1px solid var(--ink)",
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "1px 4px",
                      cursor: "pointer",
                    }}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      background: "var(--paper)",
                      color: "var(--ink)",
                      border: "1px solid var(--ink)",
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "1px 4px",
                      cursor: "pointer",
                    }}
                  >
                    NO
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink)",
                    padding: "2px",
                  }}
                  title="Delete TIL"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          ) : (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  background: "#B6FF3C",
                  color: "#000",
                  border: "1px solid var(--ink)",
                  padding: "2px 6px",
                  fontSize: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                SAVE
              </button>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  background: "var(--paper)",
                  color: "var(--ink)",
                  border: "1px solid var(--ink)",
                  padding: "2px 6px",
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

      {/* Item Body / Edit View */}
      <div style={{ padding: "12px 14px" }}>
        {!isEditing ? (
          <>
            {item.body && (
              <div style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--ink)", marginBottom: "8px" }}>
                <MarkdownLite content={item.body} />
              </div>
            )}

            {/* Code Snippet Box */}
            {item.code && (
              <div
                style={{
                  background: "#1E1E1E",
                  border: "1.5px solid var(--ink)",
                  padding: "10px",
                  marginBottom: "8px",
                  position: "relative",
                  overflowX: "auto",
                }}
              >
                {item.codeLang && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      background: "#000",
                      color: "#FFE600",
                      fontFamily: "var(--mono)",
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderLeft: "1px solid #333",
                      borderBottom: "1px solid #333",
                    }}
                  >
                    {item.codeLang}
                  </div>
                )}
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                    color: "#00F0FF",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
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

            {/* Tag Badges */}
            {item.tags && item.tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => onSelectTag && onSelectTag(tag)}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "rgba(0,0,0,0.06)",
                      color: "var(--ink)",
                      border: "1px solid var(--ink)",
                      padding: "1px 5px",
                      cursor: "pointer",
                    }}
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
                    background: editType === t ? TYPE_RAIL_COLOR[t] : "transparent",
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
                    color: "#00F0FF",
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
    </div>
  );
};
