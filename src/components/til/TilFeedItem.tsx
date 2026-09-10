"use client";

import React, { useState, useEffect, useRef } from "react";
import { TilType, tilTypeValues, LinkPreview } from "@/db/schema";
import { confidence } from "@/lib/til/confidence";
import {
  parseGotcha,
  parseQuote,
  parseOpinion,
  parsePattern,
  parseNote,
  stripNote,
  combineWithNote,
  parseNews,
  extractBulletPoints,
} from "@/lib/til/entryParser";
import {
  Lightbulb,
  AlertTriangle,
  Code2,
  Layers,
  Quote,
  Flame,
  Link2,
  Newspaper,
  Edit2,
  Trash2,
  X,
  Check,
  ExternalLink,
  StickyNote,
  Sparkles,
  Copy,
  RotateCcw,
  Play,
  Plus,
  Bookmark,
  Image as ImageIcon,
  Maximize2,
  Loader2,
} from "lucide-react";
import { tilTypeColorVar } from "@/lib/til/typeColorTokens";
import { TilMediaPreview } from "@/components/til/TilMediaPreview";
import { ClampedText } from "@/components/til/ClampedText";
import { MarkdownLite } from "@/components/til/MarkdownLite";
import { useYouTubeDigest } from "@/components/youtube/YouTubeDigestProvider";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { DigestJsonViewer } from "@/components/youtube/DigestJsonViewer";
import { DigestJson } from "@/lib/youtube/digest";
import { parseTilImages, formatTilImages, uploadTilImage } from "@/lib/til/image";

const KIND_CONFIG: Record<
  TilType,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  }
> = {
  FACT: { label: "FACT", icon: Lightbulb },
  GOTCHA: { label: "GOTCHA", icon: AlertTriangle },
  SNIPPET: { label: "SNIPPET", icon: Code2 },
  PATTERN: { label: "PATTERN", icon: Layers },
  QUOTE: { label: "QUOTE", icon: Quote },
  OPINION: { label: "OPINION", icon: Flame },
  LINK: { label: "LINK", icon: Link2 },
  NEWS: { label: "NEWS", icon: Newspaper },
};

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
  imageUrl?: string | null;
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
  validHashes,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(parseNote(item.body) || "");
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [savedDigestData, setSavedDigestData] = useState<{ title?: string; content: string } | null>(null);
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [editBody, setEditBody] = useState(item.body || "");
  const [editCode, setEditCode] = useState(item.code || "");
  const [editCodeLang, setEditCodeLang] = useState(item.codeLang || "typescript");
  const [editLinkUrl, setEditLinkUrl] = useState(item.linkUrl || "");
  const [editType, setEditType] = useState<TilType>(item.type);
  const [editTags, setEditTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Attached Images & Lightbox
  const attachedImages = parseTilImages(item.imageUrl);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [editAttachedImages, setEditAttachedImages] = useState<string[]>(parseTilImages(item.imageUrl));
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditAttachedImages(parseTilImages(item.imageUrl));
  }, [item.imageUrl]);

  const handleEditFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploadingEditImage(true);
      for (const file of Array.from(files)) {
        const asset = await uploadTilImage(file);
        setEditAttachedImages((prev) => [...prev, asset.url]);
      }
    } catch (err) {
      console.error("Failed to upload image in edit mode", err);
    } finally {
      setUploadingEditImage(false);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
  };

  const { openYouTubeDigest, isDigestSaved } = useYouTubeDigest();
  const ytVideoId = item.linkUrl ? extractYouTubeVideoId(item.linkUrl) : null;
  const isSavedDigest = Boolean(ytVideoId && typeof isDigestSaved === "function" && isDigestSaved(ytVideoId));

  const handleToggleDigest = async () => {
    if (!item.linkUrl) return;

    if (!isDigestOpen) {
      if (!savedDigestData) {
        setLoadingDigest(true);
        try {
          const res = await fetch(`/api/youtube/saved?url=${encodeURIComponent(item.linkUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.saved && data.digest) {
              setSavedDigestData(data.digest);
              setIsDigestOpen(true);
              setLoadingDigest(false);
              return;
            }
          }
        } catch {
          // ignore
        }
        setLoadingDigest(false);
      }

      if (!savedDigestData && !isSavedDigest) {
        openYouTubeDigest(item.linkUrl, item.linkPreview?.title || item.body?.slice(0, 40));
        return;
      }
    }

    setIsDigestOpen((v) => !v);
  };

  const note = parseNote(item.body);

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
    if (item.type === "QUOTE") {
      const q = parseQuote(item.body);
      text = `“${q.quote}”`;
      if (q.author) text += `\n— ${q.author}`;
      if (q.source) text += `, ${q.source}`;
      if (item.linkUrl) text += `\n${item.linkUrl}`;
    } else if (item.code) {
      text += `\n\n\`\`\`${item.codeLang || ""}\n${item.code}\n\`\`\``;
    }
    try {
      await navigator.clipboard.writeText(text);
      triggerFeedback(item.type === "QUOTE" ? "COPIED QUOTE!" : "COPIED!");
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
        linkUrl: editLinkUrl.trim() || null,
        imageUrl: formatTilImages(editAttachedImages) || null,
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

  // Render card based on 8 distinct architectural archetypes
  const renderCardContent = () => {
    switch (item.type) {
      case "GOTCHA": {
        const gotcha = parseGotcha(item.body);
        return (
          <div className="gt">
            <div className="gt__panel trap">
              <div className="gt__panel-head">
                <AlertTriangle size={11} strokeWidth={2.4} />
                <span>I THOUGHT (ASSUMPTION)</span>
              </div>
              <ClampedText className="gt__panel-text wrong" as="div" lines={4}>
                <MarkdownLite content={gotcha.thought} validHashes={validHashes} />
              </ClampedText>
            </div>
            <div className="gt__panel truth">
              <div className="gt__panel-head">
                <Check size={11} strokeWidth={3} />
                <span>ACTUALLY (REALITY)</span>
              </div>
              <ClampedText className="gt__panel-text right" as="div" lines={4}>
                <MarkdownLite content={gotcha.actually} validHashes={validHashes} />
              </ClampedText>
            </div>
            {gotcha.cost && (
              <div className="gt__cost">
                <b>WHAT IT COST</b>
                <span><MarkdownLite content={gotcha.cost} validHashes={validHashes} /></span>
              </div>
            )}
          </div>
        );
      }

      case "SNIPPET": {
        const lines = (item.code || "").split("\n");
        return (
          <>
            <ClampedText className="snip__why" as="div" lines={4}>
              <MarkdownLite content={item.body || "Key code snippet"} validHashes={validHashes} />
            </ClampedText>
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
            <ClampedText className="pat__n" as="div" lines={5}>
              <MarkdownLite content={pattern.name || item.body || ""} validHashes={validHashes} />
            </ClampedText>
            <div className="pat__seen">
              <div className="pat__seen-head">
                <Layers size={11} strokeWidth={2.4} />
                <span>RECURRING INSTANCES TIMELINE</span>
              </div>
              {pattern.instances.length > 0 ? (
                pattern.instances.map((inst, idx) => (
                  <div key={idx} className="pat__instance-row">
                    <b>{inst.date}</b>
                    <span><MarkdownLite content={inst.note} validHashes={validHashes} /></span>
                  </div>
                ))
              ) : (
                <div className="pat__instance-row">
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
        const targetUrl = item.linkUrl || item.linkPreview?.url;
        const isLong = (parsed.quote || "").length > 110;

        return (
          <div className="qt-card">
            <div className="qt-layout">
              <div className="qt-content">
                <div className="qt-quote-box">
                  <span className="qt-mark" aria-hidden="true">“</span>
                  <ClampedText
                    className={`qt ${isLong ? "qt--long" : "qt--short"}`}
                    as="blockquote"
                    lines={isLong ? 8 : 5}
                  >
                    <MarkdownLite content={parsed.quote} validHashes={validHashes} />
                  </ClampedText>
                </div>

                {(parsed.author || parsed.source || targetUrl) && (
                  <div className="qt__attribution">
                    <div className="qt__by">
                      {parsed.author && (
                        <span className="qt__author">
                          — {parsed.author.toUpperCase()}
                        </span>
                      )}
                      {parsed.source && (
                        <span className="qt__source">
                          {parsed.source}
                        </span>
                      )}
                      {!parsed.author && !parsed.source && (
                        <span className="qt__badge">VERBATIM QUOTE</span>
                      )}
                    </div>

                    {targetUrl && (
                      <div className="qt__src">
                        <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                          {item.linkPreview?.title
                            ? item.linkPreview.title.length > 36
                              ? `${item.linkPreview.title.slice(0, 36)}…`
                              : item.linkPreview.title
                            : item.linkPreview?.host || "SOURCE ↗"}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {targetUrl && (
                <div className="qt-preview-slot">
                  <TilMediaPreview url={targetUrl} preview={item.linkPreview} />
                </div>
              )}
            </div>
          </div>
        );
      }

      case "NEWS": {
        const news = parseNews(item.body);
        const targetUrl = item.linkUrl || item.linkPreview?.url;

        return (
          <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              {news.headline && (
                <div className="news__headline">
                  <MarkdownLite content={news.headline} validHashes={validHashes} />
                </div>
              )}

              <ClampedText lines={6} as="div">
                <ul className="til-bullet-list">
                  {news.items.map((bullet, idx) => (
                    <li key={idx} className="til-bullet-item">
                      <span className="til-bullet-pip" aria-hidden="true" />
                      <span className="til-bullet-text">
                        <MarkdownLite content={bullet} validHashes={validHashes} />
                      </span>
                    </li>
                  ))}
                </ul>
              </ClampedText>

              {(news.source || targetUrl) && (
                <div className="news__src">
                  SOURCE ▸{" "}
                  {targetUrl ? (
                    <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                      {news.source || item.linkPreview?.host || targetUrl}
                    </a>
                  ) : (
                    <span>{news.source}</span>
                  )}
                </div>
              )}
            </div>

            {targetUrl && (
              <TilMediaPreview url={targetUrl} preview={item.linkPreview} />
            )}
          </div>
        );
      }

      case "OPINION": {
        const opinion = parseOpinion(item.body, item.createdAt);
        const bulletData = extractBulletPoints(opinion.take);

        return (
          <>
            {bulletData ? (
              <ClampedText lines={6} as="div">
                {bulletData.intro && (
                  <div className="news__headline" style={{ marginBottom: "10px" }}>
                    <MarkdownLite content={bulletData.intro} validHashes={validHashes} />
                  </div>
                )}
                <ul className="til-bullet-list">
                  {bulletData.bullets.map((bullet, idx) => (
                    <li key={idx} className="til-bullet-item">
                      <span className="til-bullet-pip" aria-hidden="true" />
                      <span className="til-bullet-text">
                        <MarkdownLite content={bullet} validHashes={validHashes} />
                      </span>
                    </li>
                  ))}
                </ul>
              </ClampedText>
            ) : (
              <ClampedText
                className={`op ${opinion.take.length < 80 ? "op--short" : ""}`}
                as="div"
                lines={5}
              >
                <MarkdownLite content={opinion.take} validHashes={validHashes} />
              </ClampedText>
            )}

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

        return (
          <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              {item.body && (
                <ClampedText
                  className="lk__why"
                  as="div"
                  lines={4}
                  style={{ margin: "0 0 12px", border: "none", padding: 0 }}
                >
                  <MarkdownLite content={item.body} validHashes={validHashes} />
                </ClampedText>
              )}
              {targetUrl && (
                <div className="src" style={{ marginTop: "8px", paddingTop: "8px" }}>
                  SOURCE ▸{" "}
                  <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                    {preview?.host || targetUrl}
                  </a>
                </div>
              )}
            </div>

            {targetUrl && (
              <TilMediaPreview url={targetUrl} preview={item.linkPreview} />
            )}
          </div>
        );
      }

      case "FACT":
      default: {
        const bulletData = extractBulletPoints(item.body);
        const cleanBody = (item.body || "").replace(/^["“](.*)["”]$/, "$1");
        const targetUrl = item.linkUrl || item.linkPreview?.url;
        return (
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              {bulletData ? (
                <ClampedText lines={6} as="div">
                  {bulletData.intro && (
                    <div style={{ fontWeight: 800, marginBottom: "8px", fontSize: "16px" }}>
                      <MarkdownLite content={bulletData.intro} validHashes={validHashes} />
                    </div>
                  )}
                  <ul className="til-bullet-list">
                    {bulletData.bullets.map((b, idx) => (
                      <li key={idx} className="til-bullet-item">
                        <span className="til-bullet-pip" aria-hidden="true" />
                        <span className="til-bullet-text">
                          <MarkdownLite content={b} validHashes={validHashes} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </ClampedText>
              ) : (
                <ClampedText lines={6} as="div" className="claim">
                  <MarkdownLite content={cleanBody} validHashes={validHashes} />
                </ClampedText>
              )}
              {targetUrl && (
                <div className="src">
                  <span className="src__lbl">SOURCE</span>
                  <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="src__link">
                    <span>{item.linkPreview?.host || targetUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>

            {targetUrl && (
              <TilMediaPreview url={targetUrl} preview={item.linkPreview} />
            )}
          </div>
        );
      }
    }
  };

  const cardClass = `e e--${item.type.toLowerCase()}`;

  return (
    <>
      <article
        id={`til-${item.shortHash}`}
      className={cardClass}
      data-s={decayState}
      style={{ ["--f" as string]: fVal }}
    >
      {/* Card Header Bar */}
      <div className="e__h">
        <div
          className="e__kind-badge"
          onClick={() => onSelectType && onSelectType(item.type)}
          style={{ cursor: "pointer" }}
          title={`Filter by ${item.type}`}
        >
          {React.createElement(KIND_CONFIG[item.type]?.icon || Lightbulb, { size: 12, strokeWidth: 2.5 })}
          <span>{item.type}</span>
        </div>
        <span className="e__id">#{item.shortHash}</span>

        {item.type === "SNIPPET" && item.codeLang && (
          <span className="e__pill-badge">{item.codeLang.toUpperCase()}</span>
        )}

        {item.type === "PATTERN" && (
          <span className="e__pill-badge">SEEN {item.reviewCount ? item.reviewCount + 1 : 1}×</span>
        )}

        <span className="e__sp" />

        {/* Memory Holding Bar */}
        <div className="hold" title={`Memory Retention: ${Math.round(fVal * 100)}%`}>
          <span className="hold__l">{decayLabel}</span>
          <span className="hold__t">
            <span className="hold__f" style={{ width: `${Math.round(fVal * 100)}%` }} />
          </span>
          <span className="hold__pct">{Math.round(fVal * 100)}%</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="e__b">
        {!isEditing ? (
          <>
            {renderCardContent()}

            {/* Attached Images */}
            {attachedImages.length > 0 && (
              <div className="til-feed-item-images">
                {attachedImages.map((imgUrl, i) => (
                  <div
                    key={i}
                    className="til-feed-item-img-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImg(imgUrl);
                    }}
                    title="Click to zoom image"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={`Attachment ${i + 1}`} loading="lazy" />
                    <span className="til-feed-item-img-overlay">
                      <Maximize2 size={12} strokeWidth={2.4} />
                      <span>ZOOM</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Attached Note Preview or Inline Editor */}
            {isNoteOpen ? (
              <div
                style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  background: "var(--shelf, #E7E2D8)",
                  border: "2px solid var(--ink)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 800, letterSpacing: "0.1em", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <StickyNote size={12} /> PERSONAL NOTE
                  </span>
                  {note && (
                    <button
                      type="button"
                      onClick={async () => {
                        const updatedBody = combineWithNote(item.body, "");
                        await onUpdate(item.id, { body: updatedBody });
                        setNoteDraft("");
                        setIsNoteOpen(false);
                        triggerFeedback("NOTE DELETED");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--pink)",
                        fontSize: "10px",
                        fontFamily: "var(--mono)",
                        fontWeight: 800,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      DELETE NOTE
                    </button>
                  )}
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="Type personal takeaways, reflections, timestamps..."
                  style={{
                    width: "100%",
                    border: "1.5px solid var(--ink)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    fontFamily: "var(--body)",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    padding: "8px 10px",
                    boxSizing: "border-box",
                    outline: "none",
                    resize: "vertical",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNoteDraft(note || "");
                      setIsNoteOpen(false);
                    }}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      background: "var(--paper)",
                      color: "var(--ink)",
                      border: "1.5px solid var(--ink)",
                      padding: "5px 12px",
                      cursor: "pointer",
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const updatedBody = combineWithNote(item.body, noteDraft.trim());
                      await onUpdate(item.id, { body: updatedBody });
                      setIsNoteOpen(false);
                      triggerFeedback(noteDraft.trim() ? "NOTE SAVED!" : "NOTE CLEARED!");
                    }}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      background: "var(--ink)",
                      color: "var(--yellow, #FFE94A)",
                      border: "1.5px solid var(--ink)",
                      padding: "5px 16px",
                      cursor: "pointer",
                      boxShadow: "2px 2px 0 var(--pink)",
                    }}
                  >
                    SAVE NOTE
                  </button>
                </div>
              </div>
            ) : note ? (
              <div
                onClick={() => {
                  setNoteDraft(note);
                  setIsNoteOpen(true);
                }}
                className="til-note-preview-pill"
                style={{
                  marginTop: "12px",
                  padding: "7px 10px",
                  background: "var(--yel, #FFE600)",
                  color: "#000",
                  border: "1.5px solid var(--ink)",
                  boxShadow: "2px 2px 0 var(--ink)",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.1s ease",
                }}
                title="Click to edit note"
              >
                <StickyNote size={12} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 900, letterSpacing: "0.06em", flexShrink: 0 }}>NOTE:</span>
                <span
                  style={{
                    fontFamily: "var(--body)",
                    fontWeight: 600,
                    fontSize: "12.5px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {note}
                </span>
                <span style={{ fontSize: "9px", opacity: 0.7, fontWeight: 900, flexShrink: 0 }}>
                  EDIT ✎
                </span>
              </div>
            ) : null}

            {/* Inline Saved Digest Drawer on the Entry */}
            {isDigestOpen && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "16px 18px",
                  background: "var(--card, #FFFDF7)",
                  border: "2.5px solid var(--ink)",
                  boxShadow: "4px 4px 0 var(--ink)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1.5px solid var(--ink)",
                    paddingBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "var(--ink)",
                    }}
                  >
                    <Sparkles size={13} className="text-[#FF2D8A]" />
                    {savedDigestData?.title || "SAVED YOUTUBE DIGEST"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() =>
                        item.linkUrl &&
                        openYouTubeDigest(item.linkUrl, item.linkPreview?.title || item.body?.slice(0, 40))
                      }
                      style={{
                        background: "var(--paper)",
                        border: "1px solid var(--ink)",
                        fontFamily: "var(--mono)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        padding: "3px 6px",
                        cursor: "pointer",
                      }}
                      title="Open in full modal"
                    >
                      EXPAND MODAL ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDigestOpen(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--ink)",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontSize: "12px",
                        padding: "2px 4px",
                      }}
                      title="Collapse digest"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {loadingDigest ? (
                  <div
                    style={{
                      padding: "20px 0",
                      textAlign: "center",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <Sparkles
                      size={16}
                      className="animate-spin text-[#FF2D8A]"
                      style={{ margin: "0 auto 6px auto", display: "block" }}
                    />
                    Loading saved digest...
                  </div>
                ) : savedDigestData?.content ? (
                  (() => {
                    let parsed: DigestJson | null = null;
                    try {
                      const trimmed = savedDigestData.content.trim();
                      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                        parsed = JSON.parse(trimmed);
                      } else {
                        const match = trimmed.match(/\{[\s\S]*\}/);
                        if (match) parsed = JSON.parse(match[0]);
                      }
                    } catch {
                      // fallback to raw text
                    }

                    if (parsed) {
                      return <DigestJsonViewer digest={parsed} />;
                    }

                    return (
                      <div
                        style={{
                          fontFamily: "var(--body)",
                          fontSize: "13px",
                          lineHeight: 1.5,
                          color: "var(--ink)",
                          whiteSpace: "pre-wrap",
                          maxHeight: "450px",
                          overflowY: "auto",
                        }}
                      >
                        {savedDigestData.content}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ padding: "12px 0", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() =>
                        item.linkUrl &&
                        openYouTubeDigest(item.linkUrl, item.linkPreview?.title || item.body?.slice(0, 40))
                      }
                      style={{
                        background: "var(--ink)",
                        color: "var(--yellow, #FFE94A)",
                        border: "2px solid var(--ink)",
                        boxShadow: "2px 2px 0 var(--pink)",
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "6px 12px",
                        cursor: "pointer",
                      }}
                    >
                      ✦ GENERATE DIGEST NOW
                    </button>
                  </div>
                )}
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
              rows={6}
              style={{
                width: "100%",
                fontFamily: "var(--body)",
                fontSize: "14px",
                lineHeight: "1.45",
                border: "2px solid var(--ink)",
                padding: "8px 10px",
                boxSizing: "border-box",
                minHeight: "120px",
                background: "var(--paper)",
                color: "var(--ink)",
              }}
            />

            <div>
              <label style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, opacity: 0.7, display: "block", marginBottom: "4px" }}>
                SOURCE LINK (OPTIONAL)
              </label>
              <input
                type="text"
                value={editLinkUrl}
                onChange={(e) => setEditLinkUrl(e.target.value)}
                placeholder="https://... source evidence link"
                style={{
                  width: "100%",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  border: "1.5px solid var(--ink)",
                  padding: "6px 8px",
                  boxSizing: "border-box",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </div>

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

            {/* Edit Mode Attached Images */}
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, opacity: 0.7 }}>
                  ATTACHED IMAGES
                </span>
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  disabled={uploadingEditImage}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    background: "var(--paper)",
                    border: "1.5px solid var(--ink)",
                    padding: "3px 8px",
                    cursor: "pointer",
                    boxShadow: "1.5px 1.5px 0 var(--ink)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {uploadingEditImage ? <Loader2 size={11} className="comp__spin" /> : <ImageIcon size={11} />}
                  <span>{uploadingEditImage ? "UPLOADING..." : "+ ATTACH IMAGE"}</span>
                </button>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleEditFileInputChange}
                />
              </div>
              {editAttachedImages.length > 0 && (
                <div className="comp__img-strip" style={{ marginTop: "6px" }}>
                  {editAttachedImages.map((imgUrl, idx) => (
                    <div key={idx} className="comp__img-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`Attachment ${idx + 1}`} />
                      <button
                        type="button"
                        className="comp__img-thumb-del"
                        onClick={() => setEditAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                        title="Remove image"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                  <RotateCcw size={11} strokeWidth={2.4} />
                  <span>{actionFeedback || "TEST ME"}</span>
                </button>
                <button type="button" onClick={() => triggerFeedback("CONFIRMED STILL TRUE!")}>
                  <Check size={11} strokeWidth={2.6} />
                  <span>STILL TRUE</span>
                </button>
                <button type="button" onClick={handleCopy}>
                  <Copy size={11} strokeWidth={2.2} />
                  <span>COPY</span>
                </button>
              </>
            )}

            {item.type === "SNIPPET" && (
              <>
                <button className="p" type="button" onClick={handleCopyCode}>
                  <Copy size={11} strokeWidth={2.2} />
                  <span>{actionFeedback || "COPY CODE"}</span>
                </button>
                <button type="button" onClick={() => triggerFeedback("TEST QUEUED!")}>
                  <RotateCcw size={11} strokeWidth={2.4} />
                  <span>TEST ME</span>
                </button>
                <button type="button" onClick={() => triggerFeedback("EXECUTING...")}>
                  <Play size={11} strokeWidth={2.4} />
                  <span>RUN IT</span>
                </button>
              </>
            )}

            {item.type === "PATTERN" && (
              <>
                <button className="p" type="button" onClick={() => triggerFeedback("TEST QUEUED!")}>
                  <RotateCcw size={11} strokeWidth={2.4} />
                  <span>{actionFeedback || "TEST ME"}</span>
                </button>
                <button type="button" onClick={() => setIsEditing(true)}>
                  <Plus size={11} strokeWidth={2.4} />
                  <span>ADD INSTANCE</span>
                </button>
                <button type="button" onClick={() => triggerFeedback("PROMOTED TO ATLAS!")}>
                  <Layers size={11} strokeWidth={2.4} />
                  <span>PROMOTE TO ATLAS</span>
                </button>
              </>
            )}

            {item.type === "QUOTE" && (() => {
              const q = parseQuote(item.body);
              const searchQuery = `"${q.quote}" ${q.author || ""}`.trim();
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

              return (
                <>
                  <button className="p" type="button" onClick={handleCopy}>
                    <Copy size={11} strokeWidth={2.2} />
                    <span>{actionFeedback || "COPY QUOTE"}</span>
                  </button>
                  {item.linkUrl ? (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <button type="button">
                        <ExternalLink size={11} strokeWidth={2.2} />
                        <span>VIEW SOURCE ↗</span>
                      </button>
                    </a>
                  ) : (
                    <a
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <button type="button" title="Search web for original source">
                        <ExternalLink size={11} strokeWidth={2.2} />
                        <span>SEARCH SOURCE ↗</span>
                      </button>
                    </a>
                  )}
                </>
              );
            })()}

            {item.type === "NEWS" && (
              <>
                <button className="p" type="button" onClick={handleCopy}>
                  <Copy size={11} strokeWidth={2.2} />
                  <span>{actionFeedback || "COPY BRIEFING"}</span>
                </button>
                {item.linkUrl ? (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <button type="button">
                      <ExternalLink size={11} strokeWidth={2.2} />
                      <span>SOURCE ↗</span>
                    </button>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const newCount = (item.reviewCount || 0) + 1;
                      await onUpdate(item.id, {
                        reviewCount: newCount,
                        lastReviewedAt: new Date().toISOString(),
                      });
                      triggerFeedback(`LOGGED REVIEW ${newCount}×`);
                    }}
                  >
                    <RotateCcw size={11} strokeWidth={2.4} />
                    <span>{actionFeedback || "REVIEWED"}</span>
                  </button>
                )}
                <button type="button" onClick={() => setIsEditing(true)}>
                  <Edit2 size={11} strokeWidth={2.2} />
                  <span>UPDATE</span>
                </button>
              </>
            )}

            {item.type === "OPINION" && (
              <>
                <button
                  className="p"
                  type="button"
                  onClick={async () => {
                    const newCount = (item.reviewCount || 0) + 1;
                    await onUpdate(item.id, {
                      reviewCount: newCount,
                      lastReviewedAt: new Date().toISOString(),
                    });
                    triggerFeedback(`CONFIRMED! REVISITED ${newCount}×`);
                  }}
                >
                  <Flame size={11} strokeWidth={2.4} />
                  <span>{actionFeedback || "STILL BELIEVE THIS?"}</span>
                </button>
                <button type="button" onClick={() => setIsEditing(true)}>
                  <Edit2 size={11} strokeWidth={2.2} />
                  <span>REVISE</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const updatedBody = item.body?.startsWith("[RETRACTED]")
                      ? item.body
                      : `[RETRACTED] ${item.body || ""}`;
                    await onUpdate(item.id, { body: updatedBody });
                    triggerFeedback("RETRACTED");
                  }}
                >
                  <X size={11} strokeWidth={2.4} />
                  <span>RETRACT</span>
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
                      <ExternalLink size={11} strokeWidth={2.2} />
                      <span>OPEN ↗</span>
                    </button>
                  </a>
                ) : (
                  <button className="p" type="button">
                    <ExternalLink size={11} strokeWidth={2.2} />
                    <span>OPEN ↗</span>
                  </button>
                )}
                <button type="button" onClick={() => triggerFeedback("FILED TO SHELF!")}>
                  <Bookmark size={11} strokeWidth={2.2} />
                  <span>FILE TO SHELF</span>
                </button>
              </>
            )}

            {item.type === "FACT" && (
              <>
                <button className="p" type="button" onClick={() => triggerFeedback("TEST QUEUED!")}>
                  <RotateCcw size={11} strokeWidth={2.4} />
                  <span>{actionFeedback || "TEST ME"}</span>
                </button>
                <button type="button" onClick={() => triggerFeedback("CONFIRMED STILL TRUE!")}>
                  <Check size={11} strokeWidth={2.6} />
                  <span>STILL TRUE</span>
                </button>
                <button type="button" onClick={handleCopy}>
                  <Copy size={11} strokeWidth={2.2} />
                  <span>COPY</span>
                </button>
              </>
            )}

            {/* Note Button */}
            <button
              type="button"
              onClick={() => {
                setNoteDraft(note || "");
                setIsNoteOpen((v) => !v);
              }}
              title={note ? "Edit note" : "Add personal note"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: (isNoteOpen || note) ? "color-mix(in srgb, var(--yellow, #FFE94A) 35%, var(--card, #FFFDF7))" : undefined,
                fontWeight: 800,
              }}
            >
              <StickyNote size={11} />
              {note ? "NOTE" : "+ NOTE"}
            </button>

            {/* Saved Digest Button */}
            {ytVideoId && (
              <button
                type="button"
                onClick={handleToggleDigest}
                title={isSavedDigest ? "View saved AI digest on this entry" : "Generate/view AI digest"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: isSavedDigest
                    ? "var(--lime, #B8F04A)"
                    : isDigestOpen
                    ? "var(--yellow, #FFE94A)"
                    : undefined,
                  color: isSavedDigest ? "#000" : undefined,
                  fontWeight: 800,
                }}
              >
                {isSavedDigest ? (
                  <Check size={11} strokeWidth={3} />
                ) : (
                  <Sparkles size={11} className={isSavedDigest ? "text-[#000]" : "text-[#FF2D8A]"} />
                )}
                {isSavedDigest ? "SAVED DIGEST" : "+ DIGEST"}
              </button>
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

    {/* Full-Screen Image Lightbox Modal */}
    {lightboxImg && (
      <div
        className="til-image-lightbox"
        onClick={() => setLightboxImg(null)}
        role="dialog"
        aria-modal="true"
      >
        <div className="til-image-lightbox__content" onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImg} alt="Enlarged TIL attachment" />
          <button
            type="button"
            className="til-image-lightbox__close"
            onClick={() => setLightboxImg(null)}
            title="Close"
          >
            <X size={16} strokeWidth={2.6} />
          </button>
          <a
            href={lightboxImg}
            target="_blank"
            rel="noopener noreferrer"
            className="til-image-lightbox__link"
          >
            <ExternalLink size={12} />
            <span>OPEN ORIGINAL</span>
          </a>
        </div>
      </div>
    )}
  </>
  );
};
