"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Block, generateBlockId } from "@/lib/notebooks/blocks";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { FloatingFormatBubble } from "./FloatingFormatBubble";
import { playSound } from "@/lib/sound";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
} from "lucide-react";

interface BlockEditorProps {
  blocks: Block[];
  onChange: (updatedBlocks: Block[]) => void;
  onExplain?: (text: string) => void;
  accentColor?: string;
}

const SLASH_MENU_ITEMS: { type: string; glyph: string; label: string; shortcut: string }[] = [
  { type: "paragraph", glyph: "¶", label: "Text Paragraph", shortcut: "/text" },
  { type: "h2", glyph: "H2", label: "Heading 1 (#)", shortcut: "/h1" },
  { type: "h3", glyph: "H3", label: "Heading 2 (##)", shortcut: "/h2" },
  { type: "code", glyph: "<>", label: "Code Snippet (```)", shortcut: "/code" },
  { type: "todo", glyph: "☑", label: "To-Do Checklist ([])", shortcut: "/todo" },
  { type: "quote", glyph: '"', label: "Quote Block (>)", shortcut: "/quote" },
  { type: "gotcha", glyph: "!", label: "Gotcha Callout (!)", shortcut: "/gotcha" },
  { type: "question", glyph: "?", label: "Question for Me (?)", shortcut: "/q" },
  { type: "fact", glyph: "★", label: "Key Takeaway (Lime)", shortcut: "/fact" },
  { type: "connects", glyph: "↗", label: "Connects To (Cyan)", shortcut: "/connects" },
  { type: "image", glyph: "📷", label: "Image / Screenshot", shortcut: "/image" },
  { type: "toggle", glyph: "▸", label: "Collapsible Toggle", shortcut: "/toggle" },
];

export const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  onChange,
  onExplain,
  accentColor = "#7B5CF0",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{
    isOpen: boolean;
    blockIndex: number;
    query: string;
    activeIndex: number;
    position: { top: number; left: number } | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [insertImageAfterIdx, setInsertImageAfterIdx] = useState<number | undefined>(undefined);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<Block[][]>([blocks]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const commitBlocks = useCallback(
    (nextBlocks: Block[]) => {
      onChange(nextBlocks);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, nextBlocks].slice(-50);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex, onChange]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      playSound.click();
      const prevBlocks = history[historyIndex - 1];
      setHistoryIndex((idx) => idx - 1);
      onChange(prevBlocks);
    }
  }, [history, historyIndex, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      playSound.click();
      const nextBlocks = history[historyIndex + 1];
      setHistoryIndex((idx) => idx + 1);
      onChange(nextBlocks);
    }
  }, [history, historyIndex, onChange]);

  // Global Undo / Redo keyboard listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        ((e.shiftKey && e.key.toLowerCase() === "z") || e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  const handleUpdateBlock = (index: number, updated: Block) => {
    const next = [...blocks];
    next[index] = updated;
    commitBlocks(next);
  };

  const handleDeleteBlock = (index: number) => {
    playSound.pop();
    const next = blocks.filter((_, idx) => idx !== index);
    if (next.length === 0) {
      next.push({ id: generateBlockId(), type: "paragraph", text: "" });
    }
    commitBlocks(next);
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;
    playSound.click();
    const next = [...blocks];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    commitBlocks(next);
  };

  // Transform existing block (e.g. from typing '# ', '> ', or from slash menu)
  const handleTransformBlock = (index: number, props: any) => {
    playSound.pop();
    const current = blocks[index] || { id: generateBlockId(), type: "paragraph", text: "" };
    let transformed: Block;

    const baseId = current.id || generateBlockId();

    switch (props.type) {
      case "heading":
        transformed = { id: baseId, type: "heading", level: props.level || 2, text: props.text || "" };
        break;
      case "code":
        transformed = { id: baseId, type: "code", lang: props.lang || "PYTHON", note: "SNIPPET", code: props.code || "# Write code here\n" };
        break;
      case "quote":
        transformed = { id: baseId, type: "quote", text: props.text || "", attribution: "" };
        break;
      case "todo":
        transformed = { id: baseId, type: "todo", items: props.items || [{ text: "", done: false }] };
        break;
      case "callout":
        transformed = { id: baseId, type: "callout", kind: props.kind || "gotcha", text: props.text || "" };
        break;
      case "toggle":
        transformed = { id: baseId, type: "toggle", summary: props.summary || "Toggle Title", body: "" };
        break;
      case "paragraph":
      default:
        transformed = { id: baseId, type: "paragraph", text: props.text || "" };
        break;
    }

    const next = [...blocks];
    next[index] = transformed;
    commitBlocks(next);
    setSlashMenu(null);
  };

  const handleInsertBlock = (type: string, afterIndex?: number) => {
    playSound.click();

    if (type === "image") {
      setInsertImageAfterIdx(afterIndex);
      fileInputRef.current?.click();
      setSlashMenu(null);
      return;
    }

    let newBlock: Block;

    switch (type) {
      case "h2":
        newBlock = { id: generateBlockId(), type: "heading", level: 2, text: "" };
        break;
      case "h3":
        newBlock = { id: generateBlockId(), type: "heading", level: 3, text: "" };
        break;
      case "gotcha":
        newBlock = { id: generateBlockId(), type: "callout", kind: "gotcha", text: "" };
        break;
      case "question":
        newBlock = { id: generateBlockId(), type: "callout", kind: "question", text: "" };
        break;
      case "fact":
        newBlock = { id: generateBlockId(), type: "callout", kind: "fact", text: "" };
        break;
      case "connects":
        newBlock = { id: generateBlockId(), type: "callout", kind: "connects", text: "" };
        break;
      case "code":
        newBlock = { id: generateBlockId(), type: "code", lang: "PYTHON", note: "SNIPPET", code: "# Write code here\n" };
        break;
      case "toggle":
        newBlock = { id: generateBlockId(), type: "toggle", summary: "Toggle heading", body: "" };
        break;
      case "todo":
        newBlock = { id: generateBlockId(), type: "todo", items: [{ text: "", done: false }] };
        break;
      case "quote":
        newBlock = { id: generateBlockId(), type: "quote", text: "", attribution: "" };
        break;
      case "paragraph":
      default:
        newBlock = { id: generateBlockId(), type: "paragraph", text: "" };
        break;
    }

    const next = [...blocks];
    const insertIdx = typeof afterIndex === "number" ? afterIndex + 1 : next.length;
    next.splice(insertIdx, 0, newBlock);

    commitBlocks(next);
    setSlashMenu(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const imageBlock: Block = {
          id: generateBlockId(),
          type: "image",
          url: dataUrl,
          caption: file.name || "IMAGE ATTACHMENT",
        };
        const next = [...blocks];
        const insertIdx = typeof insertImageAfterIdx === "number" ? insertImageAfterIdx + 1 : next.length;
        next.splice(insertIdx, 0, imageBlock);
        commitBlocks(next);
        playSound.fileIt();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Filter slash menu items based on query
  const filteredSlashItems = SLASH_MENU_ITEMS.filter((item) => {
    if (!slashMenu || !slashMenu.query) return true;
    const q = slashMenu.query.toLowerCase().replace(/^\//, "");
    if (!q) return true;
    return (
      item.type.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.shortcut.toLowerCase().includes(q)
    );
  });

  // Handle slash keyboard navigation
  const handleSlashKeyDown = (e: React.KeyboardEvent): boolean => {
    if (!slashMenu || !slashMenu.isOpen) return false;

    if (e.key === "Escape") {
      e.preventDefault();
      setSlashMenu(null);
      return true;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashMenu((prev) =>
        prev
          ? { ...prev, activeIndex: (prev.activeIndex + 1) % filteredSlashItems.length }
          : null
      );
      return true;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashMenu((prev) =>
        prev
          ? {
              ...prev,
              activeIndex:
                (prev.activeIndex - 1 + filteredSlashItems.length) % filteredSlashItems.length,
            }
          : null
      );
      return true;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredSlashItems[slashMenu.activeIndex] || filteredSlashItems[0];
      if (selected) {
        handleTransformBlock(slashMenu.blockIndex, { type: selected.type as any });
      }
      return true;
    }

    return false;
  };

  // Handle clipboard paste (images & links)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
              const dataUrl = uploadEvent.target?.result as string;
              if (dataUrl) {
                const imageBlock: Block = {
                  id: generateBlockId(),
                  type: "image",
                  url: dataUrl,
                  caption: `PASTED IMAGE · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                };
                commitBlocks([...blocks, imageBlock]);
                playSound.fileIt();
              }
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }

    const text = e.clipboardData?.getData("text");

    if (text && (/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(text.trim()) || text.trim().startsWith("data:image/"))) {
      e.preventDefault();
      const imageBlock: Block = {
        id: generateBlockId(),
        type: "image",
        url: text.trim(),
        caption: "PASTED IMAGE",
      };
      commitBlocks([...blocks, imageBlock]);
      playSound.fileIt();
      return;
    }

    if (text && /^https?:\/\//i.test(text.trim())) {
      e.preventDefault();
      try {
        const urlObj = new URL(text.trim());
        const hostname = urlObj.hostname.toUpperCase();
        const linkBlock: Block = {
          id: generateBlockId(),
          type: "link",
          url: text.trim(),
          title: text.trim().slice(0, 60),
          site: `${hostname} · PASTED LINK`,
        };
        commitBlocks([...blocks, linkBlock]);
        playSound.fileIt();
      } catch {
        // regular paste
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        position: "relative",
        minHeight: "450px",
        paddingBottom: "140px",
      }}
      onPaste={handlePaste}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Floating Selection Tooltip */}
      <FloatingFormatBubble containerRef={containerRef} onExplain={onExplain} />

      {/* Hidden Image File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Mini Undo / Redo Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "8px",
          marginBottom: "4px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9px",
          fontWeight: 700,
          opacity: 0.5,
        }}
      >
        <button
          type="button"
          disabled={historyIndex <= 0}
          onClick={handleUndo}
          title="Undo (Cmd+Z)"
          style={{
            background: "transparent",
            border: "1px solid rgba(10,10,10,0.2)",
            color: "inherit",
            cursor: historyIndex > 0 ? "pointer" : "default",
            opacity: historyIndex > 0 ? 1 : 0.3,
            padding: "2px 6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "8.5px",
          }}
        >
          <RotateCcw size={10} />
          UNDO
        </button>
        <button
          type="button"
          disabled={historyIndex >= history.length - 1}
          onClick={handleRedo}
          title="Redo (Cmd+Shift+Z)"
          style={{
            background: "transparent",
            border: "1px solid rgba(10,10,10,0.2)",
            color: "inherit",
            cursor: historyIndex < history.length - 1 ? "pointer" : "default",
            opacity: historyIndex < history.length - 1 ? 1 : 0.3,
            padding: "2px 6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "8.5px",
          }}
        >
          <RotateCw size={10} />
          REDO
        </button>
      </div>

      {/* Note Blocks List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {blocks.map((block, idx) => {
          const isHovered = hoveredBlockId === block.id;

          return (
            <div
              key={block.id}
              onMouseEnter={() => setHoveredBlockId(block.id)}
              onMouseLeave={() => setHoveredBlockId(null)}
              style={{
                position: "relative",
                paddingLeft: "54px", // Safe, generous gutter so handles NEVER overlap text
                minHeight: "28px",
              }}
            >
              {/* Hover Action Gutter (Contained safely inside the 54px left gutter) */}
              <div
                style={{
                  position: "absolute",
                  left: "0px",
                  top: "4px",
                  width: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "2px",
                  opacity: isHovered ? 1 : 0,
                  transition: "opacity 0.12s ease",
                  userSelect: "none",
                }}
              >
                <button
                  type="button"
                  title="Insert block below"
                  onClick={() => {
                    playSound.click();
                    setSlashMenu({
                      isOpen: true,
                      blockIndex: idx,
                      query: "",
                      activeIndex: 0,
                      position: null,
                    });
                  }}
                  style={{
                    width: "14px",
                    height: "18px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "inherit",
                    opacity: 0.5,
                    fontSize: "13px",
                    padding: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                >
                  ＋
                </button>
                <button
                  type="button"
                  disabled={idx === 0}
                  title="Move up"
                  onClick={() => handleMoveBlock(idx, "up")}
                  style={{
                    width: "12px",
                    height: "18px",
                    border: "none",
                    background: "transparent",
                    cursor: idx > 0 ? "pointer" : "default",
                    color: "inherit",
                    opacity: idx > 0 ? 0.45 : 0.15,
                    padding: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <ArrowUp size={10} />
                </button>
                <button
                  type="button"
                  disabled={idx === blocks.length - 1}
                  title="Move down"
                  onClick={() => handleMoveBlock(idx, "down")}
                  style={{
                    width: "12px",
                    height: "18px",
                    border: "none",
                    background: "transparent",
                    cursor: idx < blocks.length - 1 ? "pointer" : "default",
                    color: "inherit",
                    opacity: idx < blocks.length - 1 ? 0.45 : 0.15,
                    padding: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <ArrowDown size={10} />
                </button>
                <button
                  type="button"
                  title="Delete line"
                  onClick={() => handleDeleteBlock(idx)}
                  style={{
                    width: "12px",
                    height: "18px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#DC2626",
                    opacity: 0.45,
                    padding: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
                >
                  <Trash2 size={10} />
                </button>
              </div>

              {/* Block Content */}
              <BlockRenderer
                block={block}
                onUpdateBlock={(updated) => handleUpdateBlock(idx, updated)}
                onDeleteBlock={() => handleDeleteBlock(idx)}
                onInsertBelow={() => handleInsertBlock("paragraph", idx)}
                onTransformBlock={(props) => handleTransformBlock(idx, props)}
                onSlashCommand={(query, rect) => {
                  if (query.startsWith("/")) {
                    setSlashMenu({
                      isOpen: true,
                      blockIndex: idx,
                      query,
                      activeIndex: 0,
                      position: rect ? { top: rect.bottom + 4, left: rect.left } : null,
                    });
                  } else {
                    setSlashMenu(null);
                  }
                }}
                onSlashKeyDown={handleSlashKeyDown}
                accentColor={accentColor}
              />

              {/* In-Line Notion-Style Slash Palette Popover */}
              {slashMenu?.isOpen && slashMenu.blockIndex === idx && (
                <div
                  style={{
                    position: "absolute",
                    left: "54px",
                    top: "100%",
                    zIndex: 9999,
                    width: "300px",
                    border: "3px solid #0A0A0A",
                    background: "#FFFFFF",
                    boxShadow: "7px 7px 0 #0A0A0A",
                    overflow: "hidden",
                    animation: "fadeIn 0.1s ease",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      padding: "7px 12px",
                      background: "#EBE7DC",
                      borderBottom: "2px solid #0A0A0A",
                      color: "#0A0A0A",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>TRANSFORM BLOCK</span>
                    <span>ESC TO CLOSE</span>
                  </div>
                  <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                    {filteredSlashItems.map((item, itemIdx) => {
                      const isActive = slashMenu.activeIndex === itemIdx;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleTransformBlock(idx, { type: item.type as any });
                          }}
                          style={{
                            display: "flex",
                            width: "100%",
                            alignItems: "center",
                            gap: "10px",
                            background: isActive ? "#FCE94F" : "transparent",
                            border: "none",
                            borderBottom: "1.5px solid rgba(10,10,10,0.1)",
                            padding: "8px 12px",
                            cursor: "pointer",
                            textAlign: "left",
                            color: "#0A0A0A",
                            transition: "background 0.08s ease",
                          }}
                          onMouseEnter={() =>
                            setSlashMenu((prev) => (prev ? { ...prev, activeIndex: itemIdx } : null))
                          }
                        >
                          <span
                            style={{
                              width: "22px",
                              height: "22px",
                              border: "2px solid #0A0A0A",
                              display: "grid",
                              placeItems: "center",
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "10px",
                              fontWeight: 700,
                              flex: "none",
                              background: "#FFFFFF",
                            }}
                          >
                            {item.glyph}
                          </span>
                          <b style={{ fontSize: "13px", fontWeight: 700 }}>{item.label}</b>
                          <span
                            style={{
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "8.5px",
                              letterSpacing: "0.08em",
                              opacity: 0.45,
                              marginLeft: "auto",
                            }}
                          >
                            {item.shortcut}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blank Document Click Area at Bottom */}
      <div
        onClick={() => {
          const lastBlock = blocks[blocks.length - 1];
          if (!lastBlock || (lastBlock.type === "paragraph" && lastBlock.text === "")) {
            return;
          }
          handleInsertBlock("paragraph", blocks.length - 1);
        }}
        style={{
          flex: 1,
          minHeight: "220px",
          cursor: "text",
          paddingLeft: "54px",
        }}
      />
    </div>
  );
};
