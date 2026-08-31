"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CourseFolder,
  FolderNoteItem,
  FolderAskItem,
  getCourseFolders,
  saveCourseFolder,
  deleteCourseFolder,
  getFolderNotes,
  saveFolderNote,
  deleteFolderNote,
  getFolderAsks,
  saveFolderAsk,
  exportFolderDossierMarkdown,
} from "@/lib/summarizer/folders";
import { SavedDigestItem, assignDigestFolder } from "@/lib/summarizer/storage";
import { DigestResult } from "@/lib/summarizer/types";
import { playSound } from "@/lib/sound";
import {
  Folder,
  FolderPlus,
  Bookmark,
  FileText,
  MessageSquare,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Share2,
  ArrowRight,
  Search,
  BookOpen,
  Layers,
  Code,
  Tag,
  X,
  ExternalLink,
} from "lucide-react";

interface CourseFolderHubProps {
  savedDigests: SavedDigestItem[];
  onOpenDigest: (digest: DigestResult) => void;
  onStartDigestForFolder: (folder: CourseFolder) => void;
  onRefreshAll: () => void;
}

export const CourseFolderHub: React.FC<CourseFolderHubProps> = ({
  savedDigests,
  onOpenDigest,
  onStartDigestForFolder,
  onRefreshAll,
}) => {
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>("");
  const [activeTypeTab, setActiveTypeTab] = useState<"ALL" | "DIGEST" | "NOTE" | "ASK">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("🤖");
  const [newFolderColor, setNewFolderColor] = useState("#00F0FF");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderTags, setNewFolderTags] = useState("");

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportCopied, setExportCopied] = useState(false);

  useEffect(() => {
    const loaded = getCourseFolders();
    setFolders(loaded);
    if (loaded.length > 0) {
      setActiveFolderId(loaded[0].id);
    }
  }, []);

  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === activeFolderId) || folders[0];
  }, [folders, activeFolderId]);

  // Artifacts inside active folder
  const folderDigests = useMemo(() => {
    if (!activeFolder) return [];
    return savedDigests.filter((d) => d.folderId === activeFolder.id);
  }, [savedDigests, activeFolder]);

  const folderNotes = useMemo(() => {
    if (!activeFolder) return [];
    return getFolderNotes(activeFolder.id);
  }, [activeFolder]);

  const folderAsks = useMemo(() => {
    if (!activeFolder) return [];
    return getFolderAsks(activeFolder.id);
  }, [activeFolder]);

  const totalItemCount = folderDigests.length + folderNotes.length + folderAsks.length;

  const refreshFolders = () => {
    const updated = getCourseFolders();
    setFolders(updated);
    if (updated.length > 0 && !updated.some((f) => f.id === activeFolderId)) {
      setActiveFolderId(updated[0].id);
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    playSound.click();

    const tags = newFolderTags
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const created = saveCourseFolder({
      name: newFolderName,
      icon: newFolderIcon,
      color: newFolderColor,
      description: newFolderDesc,
      tags,
    });

    playSound.fileIt();
    refreshFolders();
    setActiveFolderId(created.id);
    setShowCreateModal(false);
    setNewFolderName("");
    setNewFolderDesc("");
    setNewFolderTags("");
  };

  const handleDeleteFolder = (folderId: string) => {
    if (window.confirm("Delete this course folder? Associated digests will remain in your global shelf.")) {
      playSound.click();
      deleteCourseFolder(folderId);
      refreshFolders();
      onRefreshAll();
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder || !newNoteContent.trim()) return;
    playSound.click();

    saveFolderNote(activeFolder.id, newNoteTitle, newNoteContent, activeFolder.tags);
    playSound.fileIt();
    setShowAddNoteModal(false);
    setNewNoteTitle("");
    setNewNoteContent("");
    onRefreshAll();
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Delete this note?")) {
      playSound.click();
      deleteFolderNote(noteId);
      onRefreshAll();
    }
  };

  const handleExportDossier = async () => {
    if (!activeFolder) return;
    playSound.click();
    const md = exportFolderDossierMarkdown(activeFolder, folderDigests, folderNotes, folderAsks);
    await navigator.clipboard.writeText(md);
    setExportCopied(true);
    playSound.fileIt();
    setTimeout(() => setExportCopied(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── TOP COURSE FOLDERS STRIP ── */}
      <div
        style={{
          background: "#0A0A0A",
          border: "2px solid #222222",
          borderRadius: "4px",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "4px 4px 0 #000000",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", marginRight: "4px" }}>
            COURSE FOLDERS:
          </span>

          {folders.map((f) => {
            const isSelected = f.id === activeFolderId;
            const count = savedDigests.filter((d) => d.folderId === f.id).length;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  playSound.click();
                  setActiveFolderId(f.id);
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "6px 12px",
                  background: isSelected ? "#161616" : "#111111",
                  color: isSelected ? "#FFFFFF" : "#A3A3A3",
                  border: `2px solid ${isSelected ? f.color : "#282828"}`,
                  boxShadow: isSelected ? `2px 2px 0 ${f.color}` : "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{f.icon}</span>
                <span>{f.name}</span>
                <span
                  style={{
                    fontSize: "9px",
                    background: isSelected ? f.color : "#222222",
                    color: isSelected ? "#0A0A0A" : "#888888",
                    padding: "1px 5px",
                    borderRadius: "2px",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Create Folder Button */}
        <button
          type="button"
          onClick={() => {
            playSound.click();
            setShowCreateModal(true);
          }}
          className="btn-card-action"
          style={{
            background: "#181818",
            color: "#FFE600",
            borderColor: "#333333",
            fontSize: "11px",
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
          }}
        >
          <FolderPlus size={13} />
          + NEW COURSE FOLDER
        </button>
      </div>

      {/* ── ACTIVE FOLDER HERO HEADER ── */}
      {activeFolder && (
        <div
          style={{
            background: "#0D0D0D",
            border: `2px solid ${activeFolder.color}`,
            borderRadius: "4px",
            boxShadow: `6px 6px 0 #000000, 0 0 25px ${activeFolder.color}15`,
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Title row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "32px", background: "#181818", border: "1px solid #333333", padding: "6px 10px", borderRadius: "4px" }}>
                {activeFolder.icon}
              </span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 900, background: activeFolder.color, color: "#0A0A0A", padding: "2px 6px", borderRadius: "2px" }}>
                    COURSE DOSSIER
                  </span>
                  <h2 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "24px", fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
                    {activeFolder.name}
                  </h2>
                </div>
                {activeFolder.description && (
                  <p style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#A3A3A3", margin: "4px 0 0 0", maxWidth: "680px" }}>
                    {activeFolder.description}
                  </p>
                )}
              </div>
            </div>

            {/* Folder Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleExportDossier}
                className="btn-card-action"
                style={{
                  background: exportCopied ? "#166534" : "#1C1C1C",
                  color: exportCopied ? "#FFFFFF" : activeFolder.color,
                  borderColor: exportCopied ? "#22C55E" : "#333333",
                  fontSize: "11px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                }}
                title="Combines all digests and notes into a unified study markdown file"
              >
                {exportCopied ? <Check size={12} /> : <Download size={12} />}
                {exportCopied ? "DOSSIER COPIED!" : "EXPORT STUDY BINDER"}
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  setShowAddNoteModal(true);
                }}
                className="btn-card-action"
                style={{ background: "#1C1C1C", color: "#4ADE80", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px" }}
              >
                <Plus size={12} />
                + ADD NOTE
              </button>

              <button
                type="button"
                onClick={() => onStartDigestForFolder(activeFolder)}
                className="btn-card-action"
                style={{ background: "#1C1C1C", color: "#FFE600", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px" }}
              >
                <Sparkles size={12} />
                ⚡ NEW DIGEST FOR COURSE
              </button>

              <button
                type="button"
                onClick={() => handleDeleteFolder(activeFolder.id)}
                className="btn-card-action"
                style={{ background: "#1C1C1C", color: "#F87171", fontSize: "11px", padding: "6px 8px" }}
                title="Delete Folder"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Folder Tags & Stats Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderTop: "1px solid #1E1E1E", paddingTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {activeFolder.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    background: "#181818",
                    color: activeFolder.color,
                    border: "1px solid #2C2C2C",
                    padding: "2px 7px",
                    borderRadius: "2px",
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>

            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#888888", display: "flex", gap: "14px" }}>
              <span><b>{folderDigests.length}</b> Digests</span>
              <span><b>{folderNotes.length}</b> Notes &amp; Code</span>
              <span><b>{folderAsks.length}</b> Ask Threads</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ARTIFACT TYPE TABS & SEARCH ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        {/* Type tabs */}
        <div style={{ display: "flex", background: "#0A0A0A", padding: "3px", borderRadius: "4px", gap: "3px", border: "1px solid #222222" }}>
          {[
            { id: "ALL", label: `🌐 ALL ITEMS (${totalItemCount})` },
            { id: "DIGEST", label: `📑 DIGESTS (${folderDigests.length})` },
            { id: "NOTE", label: `📝 NOTES & CODE (${folderNotes.length})` },
            { id: "ASK", label: `💬 ASK SESSIONS (${folderAsks.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                playSound.click();
                setActiveTypeTab(t.id as any);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 900,
                padding: "5px 12px",
                background: activeTypeTab === t.id ? "#FFE600" : "transparent",
                color: activeTypeTab === t.id ? "#0A0A0A" : "#888888",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={14} color="#FFE600" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within this course folder..."
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              background: "#0D0D0D",
              color: "#FFFFFF",
              border: "1.5px solid #242424",
              borderRadius: "3px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* ── ARTIFACTS CONTAINER ── */}
      {totalItemCount > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 1. DIGESTS SECTION */}
          {(activeTypeTab === "ALL" || activeTypeTab === "DIGEST") && folderDigests.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#FFE600" }}>
                📑 SYNTHESIZED COURSE DIGESTS ({folderDigests.length})
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                {folderDigests.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      playSound.click();
                      onOpenDigest(item.digest);
                    }}
                    style={{
                      background: "#0D0D0D",
                      border: "1.5px solid #282828",
                      borderRadius: "4px",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "10px",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#FFE600")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#282828")}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", fontWeight: 900, background: "#1C1C1C", color: "#4ADE80", padding: "1px 5px", borderRadius: "2px" }}>
                          DIGEST · ~{item.readMinutes} MIN
                        </span>
                        <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", color: "#666666" }}>
                          {new Date(item.savedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "16px", fontWeight: 900, color: "#FFFFFF", margin: "0 0 6px 0" }}>
                        {item.title}
                      </h4>
                      <p style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#D4D4D8", margin: 0, lineHeight: "1.4" }}>
                        &ldquo;{item.thesis}&rdquo;
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1A1A1A", paddingTop: "8px" }}>
                      <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", color: "#777777" }}>
                        {item.digest.sections.length} Sec · {item.digest.figures.length} Fig
                      </span>
                      <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#FFE600" }}>
                        OPEN ↗
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. NOTES & LAB SNIPPETS SECTION */}
          {(activeTypeTab === "ALL" || activeTypeTab === "NOTE") && folderNotes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#4ADE80" }}>
                📝 LAB &amp; SCRATCHPAD NOTES ({folderNotes.length})
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                {folderNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      background: "#0D0D0D",
                      border: "1.5px solid #166534",
                      borderRadius: "4px",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", fontWeight: 900, background: "#166534", color: "#FFFFFF", padding: "1px 5px", borderRadius: "2px" }}>
                        LAB NOTE
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: "11px" }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "15px", color: "#FFFFFF" }}>{note.title}</b>
                    <pre
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "11.5px",
                        color: "#86EFAC",
                        background: "#121212",
                        padding: "10px",
                        borderRadius: "3px",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        maxHeight: "180px",
                        overflowY: "auto",
                        border: "1px solid #1F2937",
                      }}
                    >
                      {note.content}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. ASK Q&A SESSIONS */}
          {(activeTypeTab === "ALL" || activeTypeTab === "ASK") && folderAsks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 900, color: "#38BDF8" }}>
                💬 ASK SESSIONS &amp; DEEP-DIVES ({folderAsks.length})
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                {folderAsks.map((ask) => (
                  <div
                    key={ask.id}
                    style={{
                      background: "#0D0D0D",
                      border: "1.5px solid #0369A1",
                      borderRadius: "4px",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", fontWeight: 900, background: "#0369A1", color: "#FFFFFF", padding: "1px 5px", borderRadius: "2px", alignSelf: "flex-start" }}>
                      Q&amp;A
                    </span>
                    <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "14px", color: "#38BDF8" }}>{ask.question}</b>
                    <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#D1D5DB", maxHeight: "120px", overflowY: "auto" }}>
                      {ask.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Folder State */
        <div
          style={{
            background: "#0D0D0D",
            border: "2px dashed #282828",
            borderRadius: "4px",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "36px" }}>{activeFolder?.icon || "📁"}</span>
          <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
            {activeFolder?.name} is currently empty
          </h3>
          <p style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#888888", maxWidth: "460px", margin: 0 }}>
            Add lecture transcripts, course readings, lab scratchpad notes, or Ask sessions into this folder to create your unified study dossier.
          </p>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => onStartDigestForFolder(activeFolder)}
              className="btn-ledger btn-ledger-primary"
              style={{ padding: "8px 16px", fontSize: "11px", fontWeight: 900, background: "#FFE600", color: "#0A0A0A" }}
            >
              ⚡ SYNTHESIZE DIGEST FOR THIS COURSE
            </button>
            <button
              type="button"
              onClick={() => setShowAddNoteModal(true)}
              className="btn-card-action"
              style={{ background: "#1C1C1C", color: "#4ADE80", fontSize: "11px", padding: "8px 16px" }}
            >
              + ADD LAB NOTE
            </button>
          </div>
        </div>
      )}

      {/* ── CREATE FOLDER MODAL ── */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <form
            onSubmit={handleCreateFolder}
            style={{
              background: "#0D0D0D",
              border: "2px solid #FFE600",
              boxShadow: "6px 6px 0 #000000",
              borderRadius: "4px",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
                📁 CREATE NEW COURSE FOLDER
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", color: "#888888", cursor: "pointer", fontSize: "14px" }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", display: "block", marginBottom: "4px" }}>
                COURSE / FOLDER NAME
              </label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Agentic AI (DeepLearning.AI)"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#181818",
                  color: "#FFFFFF",
                  border: "1.5px solid #333333",
                  borderRadius: "3px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", display: "block", marginBottom: "4px" }}>
                  ICON
                </label>
                <input
                  type="text"
                  value={newFolderIcon}
                  onChange={(e) => setNewFolderIcon(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#181818",
                    color: "#FFFFFF",
                    border: "1.5px solid #333333",
                    borderRadius: "3px",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                />
              </div>
              <div>
                <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", display: "block", marginBottom: "4px" }}>
                  THEME COLOR
                </label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                  {["#00F0FF", "#FFE600", "#A855F7", "#10B981", "#F43F5E", "#F97316"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "2px",
                        background: color,
                        border: newFolderColor === color ? "2px solid #FFFFFF" : "1px solid #000000",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", display: "block", marginBottom: "4px" }}>
                DESCRIPTION / SYLLABUS SCOPE
              </label>
              <textarea
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                placeholder="What topics, labs, or materials belong in this folder..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#181818",
                  color: "#FFFFFF",
                  border: "1.5px solid #333333",
                  borderRadius: "3px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11.5px",
                  resize: "none",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", display: "block", marginBottom: "4px" }}>
                TAGS (COMMA SEPARATED)
              </label>
              <input
                type="text"
                value={newFolderTags}
                onChange={(e) => setNewFolderTags(e.target.value)}
                placeholder="AGENTS, DEEPLEARNING, LLMS"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#181818",
                  color: "#FFE600",
                  border: "1.5px solid #333333",
                  borderRadius: "3px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-card-action"
                style={{ background: "#1C1C1C", color: "#888888", fontSize: "11px" }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="btn-ledger btn-ledger-primary"
                style={{ background: "#FFE600", color: "#0A0A0A", fontSize: "11px", fontWeight: 900, padding: "8px 16px" }}
              >
                CREATE FOLDER
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ADD NOTE MODAL ── */}
      {showAddNoteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <form
            onSubmit={handleSaveNote}
            style={{
              background: "#0D0D0D",
              border: "2px solid #4ADE80",
              boxShadow: "6px 6px 0 #000000",
              borderRadius: "4px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, color: "#4ADE80", margin: 0 }}>
                📝 ADD LAB / SCRATCH NOTE TO {activeFolder?.name.toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                style={{ background: "none", border: "none", color: "#888888", cursor: "pointer", fontSize: "14px" }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", display: "block", marginBottom: "4px" }}>
                NOTE TITLE
              </label>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="e.g. Agent Memory Architecture & ReAct Loop"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#181818",
                  color: "#FFFFFF",
                  border: "1.5px solid #333333",
                  borderRadius: "3px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888", display: "block", marginBottom: "4px" }}>
                CONTENT (MARKDOWN / CODE)
              </label>
              <textarea
                required
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write your scratchpad notes, code snippet, formula, or takeaway..."
                rows={8}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#141414",
                  color: "#86EFAC",
                  border: "1.5px solid #166534",
                  borderRadius: "3px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "12px",
                  lineHeight: "1.5",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                className="btn-card-action"
                style={{ background: "#1C1C1C", color: "#888888", fontSize: "11px" }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="btn-ledger btn-ledger-primary"
                style={{ background: "#4ADE80", color: "#0A0A0A", fontSize: "11px", fontWeight: 900, padding: "8px 16px" }}
              >
                SAVE TO FOLDER
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
