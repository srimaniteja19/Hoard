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
  Sparkles,
} from "lucide-react";

interface BlockEditorProps {
  blocks: Block[];
  onChange: (updatedBlocks: Block[]) => void;
  onExplain?: (text: string) => void;
  accentColor?: string;
}

const SLASH_MENU_ITEMS: { type: string; glyph: string; label: string; shortcut: string }[] = [
  { type: "paragraph", glyph: "¶", label: "Text paragraph", shortcut: "/text" },
  { type: "h2", glyph: "H2", label: "Heading 2", shortcut: "/h2" },
  { type: "h3", glyph: "H3", label: "Heading 3", shortcut: "/h3" },
  { type: "image", glyph: "📷", label: "Paste / Upload Image", shortcut: "/image" },
  { type: "code", glyph: "<>", label: "Code Snippet", shortcut: "/code" },
  { type: "gotcha", glyph: "!", label: "Gotcha callout (Pink)", shortcut: "/gotcha" },
  { type: "question", glyph: "?", label: "Question for me (Yellow)", shortcut: "/q" },
  { type: "fact", glyph: "★", label: "Key takeaway (Lime)", shortcut: "/fact" },
  { type: "connects", glyph: "↗", label: "Connects to (Cyan)", shortcut: "/connects" },
  { type: "todo", glyph: "☑", label: "To-do items", shortcut: "/todo" },
  { type: "toggle", glyph: "▸", label: "Toggle section", shortcut: "/toggle" },
  { type: "quote", glyph: '"', label: "Quote", shortcut: "/quote" },
  { type: "mark", glyph: "⏱", label: "Timestamp mark", shortcut: "/mark" },
];

export const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  onChange,
  onExplain,
  accentColor = "#7B5CF0",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [newInput, setNewInput] = useState("");
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{
    isOpen: boolean;
    insertAfterIndex?: number;
    query: string;
    activeIndex: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [insertAfterIdx, setInsertAfterIdx] = useState<number | undefined>(undefined);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<Block[][]>([blocks]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const commitBlocks = useCallback(
    (nextBlocks: Block[]) => {
      onChange(nextBlocks);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, nextBlocks].slice(-50); // keep last 50 states
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

  const handleInsertBlock = (type: string, afterIndex?: number) => {
    playSound.click();

    if (type === "image") {
      setInsertAfterIdx(afterIndex);
      fileInputRef.current?.click();
      setSlashMenu(null);
      return;
    }

    let newBlock: Block;

    switch (type) {
      case "h2":
        newBlock = { id: generateBlockId(), type: "heading", level: 2, text: "New Heading" };
        break;
      case "h3":
        newBlock = { id: generateBlockId(), type: "heading", level: 3, text: "Subheading" };
        break;
      case "gotcha":
        newBlock = { id: generateBlockId(), type: "callout", kind: "gotcha", text: "The subtle trap to watch out for." };
        break;
      case "question":
        newBlock = { id: generateBlockId(), type: "callout", kind: "question", text: "Open question to verify." };
        break;
      case "fact":
        newBlock = { id: generateBlockId(), type: "callout", kind: "fact", text: "Core takeaway or rule." };
        break;
      case "connects":
        newBlock = { id: generateBlockId(), type: "callout", kind: "connects", text: "Connects to concept in another course." };
        break;
      case "code":
        newBlock = { id: generateBlockId(), type: "code", lang: "PYTHON", note: "SNIPPET", code: "# Write code snippet here\n" };
        break;
      case "toggle":
        newBlock = { id: generateBlockId(), type: "toggle", summary: "Toggle heading", body: "Hidden detail notes." };
        break;
      case "todo":
        newBlock = { id: generateBlockId(), type: "todo", items: [{ text: "Action item before next lesson", done: false }] };
        break;
      case "quote":
        newBlock = { id: generateBlockId(), type: "quote", text: "A phrase worth keeping in their words.", attribution: "Instructor" };
        break;
      case "mark":
        newBlock = { id: generateBlockId(), type: "mark", timestamp: "00:00", text: "Marked during lecture" };
        break;
      case "paragraph":
      default:
        newBlock = { id: generateBlockId(), type: "paragraph", text: newInput.trim() || "Start writing…" };
        break;
    }

    const next = [...blocks];
    if (typeof afterIndex === "number") {
      next.splice(afterIndex + 1, 0, newBlock);
    } else {
      next.push(newBlock);
    }

    commitBlocks(next);
    setNewInput("");
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
        if (typeof insertAfterIdx === "number") {
          next.splice(insertAfterIdx + 1, 0, imageBlock);
        } else {
          next.push(imageBlock);
        }
        commitBlocks(next);
        playSound.fileIt();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Filter slash menu items based on current query
  const filteredSlashItems = SLASH_MENU_ITEMS.filter((item) => {
    if (!slashMenu || !slashMenu.query) return true;
    const q = slashMenu.query.toLowerCase().replace(/^\//, "");
    return (
      item.type.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.shortcut.toLowerCase().includes(q)
    );
  });

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (slashMenu?.isOpen) {
      if (e.key === "Escape") {
        setSlashMenu(null);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashMenu((prev) =>
          prev ? { ...prev, activeIndex: (prev.activeIndex + 1) % filteredSlashItems.length } : null
        );
      } else if (e.key === "ArrowUp") {
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
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredSlashItems[slashMenu.activeIndex] || filteredSlashItems[0];
        if (selected) {
          handleInsertBlock(selected.type, slashMenu.insertAfterIndex);
        }
      }
    } else if (e.key === "Enter" && newInput.trim()) {
      handleInsertBlock("paragraph");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewInput(val);
    if (val.startsWith("/")) {
      setSlashMenu({
        isOpen: true,
        query: val,
        activeIndex: 0,
      });
    } else {
      setSlashMenu(null);
    }
  };

  // Handle image pasting (clipboard files & image URLs) and link cards
  const handlePaste = (e: React.ClipboardEvent) => {
    // 1. Direct Clipboard Image Paste (e.g. screenshots, copied images)
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
                setNewInput("");
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

    // 2. Image URL Paste
    if (text && (/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(text.trim()) || text.trim().startsWith("data:image/"))) {
      e.preventDefault();
      const imageBlock: Block = {
        id: generateBlockId(),
        type: "image",
        url: text.trim(),
        caption: "PASTED IMAGE",
      };
      commitBlocks([...blocks, imageBlock]);
      setNewInput("");
      playSound.fileIt();
      return;
    }

    // 3. Web URL Paste (into a link preview card)
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
        setNewInput("");
        playSound.fileIt();
      } catch {
        // regular text paste
      }
    }
  };

  // Drag and Drop Images directly into note area
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const dataUrl = uploadEvent.target?.result as string;
          if (dataUrl) {
            const imageBlock: Block = {
              id: generateBlockId(),
              type: "image",
              url: dataUrl,
              caption: file.name || "DROPPED IMAGE",
            };
            commitBlocks([...blocks, imageBlock]);
            playSound.fileIt();
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", flexDirection: "column", gap: "2px", position: "relative" }}
      onPaste={handlePaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Floating Selection Formatter Tooltip */}
      <FloatingFormatBubble containerRef={containerRef} onExplain={onExplain} />

      {/* Hidden Image File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Undo / Redo mini status bar if history exists */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9px",
          fontWeight: 700,
          opacity: 0.6,
        }}
      >
        <button
          type="button"
          disabled={historyIndex <= 0}
          onClick={handleUndo}
          title="Undo last change (Cmd+Z)"
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
          title="Redo change (Cmd+Shift+Z)"
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

      {/* Blocks List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {blocks.map((block, idx) => {
          const isHovered = hoveredBlockId === block.id;

          return (
            <div
              key={block.id}
              onMouseEnter={() => setHoveredBlockId(block.id)}
              onMouseLeave={() => setHoveredBlockId(null)}
              style={{
                position: "relative",
                padding: "4px 0 4px 44px",
                margin: "2px 0",
                borderRadius: "2px",
                transition: "background 0.1s ease",
              }}
            >
              {/* Hover Reorder & Action Controls */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "1px",
                  opacity: isHovered ? 1 : 0,
                  transition: "opacity 0.12s ease",
                }}
              >
                {/* Insert Below Button */}
                <button
                  type="button"
                  title="Insert block below"
                  onClick={() => {
                    playSound.click();
                    setSlashMenu({
                      isOpen: true,
                      insertAfterIndex: idx,
                      query: "",
                      activeIndex: 0,
                    });
                  }}
                  style={{
                    width: "16px",
                    height: "22px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "inherit",
                    opacity: 0.5,
                    fontSize: "14px",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
                >
                  ＋
                </button>

                {/* Move Up */}
                <button
                  type="button"
                  disabled={idx === 0}
                  title="Move block up"
                  onClick={() => handleMoveBlock(idx, "up")}
                  style={{
                    width: "14px",
                    height: "22px",
                    border: "none",
                    background: "transparent",
                    cursor: idx > 0 ? "pointer" : "default",
                    color: "inherit",
                    opacity: idx > 0 ? 0.45 : 0.15,
                    padding: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (idx > 0) e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    if (idx > 0) e.currentTarget.style.opacity = "0.45";
                  }}
                >
                  <ArrowUp size={11} />
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  disabled={idx === blocks.length - 1}
                  title="Move block down"
                  onClick={() => handleMoveBlock(idx, "down")}
                  style={{
                    width: "14px",
                    height: "22px",
                    border: "none",
                    background: "transparent",
                    cursor: idx < blocks.length - 1 ? "pointer" : "default",
                    color: "inherit",
                    opacity: idx < blocks.length - 1 ? 0.45 : 0.15,
                    padding: 0,
                    display: "grid",
                    placeItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (idx < blocks.length - 1) e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    if (idx < blocks.length - 1) e.currentTarget.style.opacity = "0.45";
                  }}
                >
                  <ArrowDown size={11} />
                </button>

                {/* Delete Block */}
                <button
                  type="button"
                  title="Delete block"
                  onClick={() => handleDeleteBlock(idx)}
                  style={{
                    width: "14px",
                    height: "22px",
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
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Rendered Block */}
              <BlockRenderer
                block={block}
                onUpdateBlock={(updated) => handleUpdateBlock(idx, updated)}
                onDeleteBlock={() => handleDeleteBlock(idx)}
                onInsertBelow={() => handleInsertBlock("paragraph", idx)}
                onFocusPrevious={() => {
                  // Handled naturally by block state
                }}
                accentColor={accentColor}
              />

              {/* In-Line Slash Command Popover if triggered at this index */}
              {slashMenu?.isOpen && slashMenu.insertAfterIndex === idx && (
                <div
                  style={{
                    position: "absolute",
                    left: "44px",
                    top: "100%",
                    zIndex: 60,
                    width: "292px",
                    border: "3px solid #0A0A0A",
                    background: "#FFFFFF",
                    boxShadow: "7px 7px 0 #0A0A0A",
                    overflow: "hidden",
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
                    <span>INSERT BLOCK</span>
                    <span>ESC TO CLOSE</span>
                  </div>
                  {filteredSlashItems.map((item, itemIdx) => {
                    const isActive = slashMenu.activeIndex === itemIdx;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleInsertBlock(item.type, idx)}
                        style={{
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                          gap: "11px",
                          background: isActive ? "#FCE94F" : "transparent",
                          border: "none",
                          borderBottom: "2px solid rgba(10,10,10,0.14)",
                          padding: "8px 12px",
                          cursor: "pointer",
                          textAlign: "left",
                          color: "#0A0A0A",
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={() => setSlashMenu((prev) => (prev ? { ...prev, activeIndex: itemIdx } : null))}
                      >
                        <span
                          style={{
                            width: "22px",
                            height: "22px",
                            border: "2px solid #0A0A0A",
                            display: "grid",
                            placeItems: "center",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            flex: "none",
                            background: "#FFFFFF",
                          }}
                        >
                          {item.glyph}
                        </span>
                        <b style={{ fontSize: "13.5px", fontWeight: 700 }}>{item.label}</b>
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
              )}
            </div>
          );
        })}
      </div>

      {/* New Line Input with Slash Command Popover at Bottom */}
      <div style={{ position: "relative", padding: "8px 0 8px 44px", marginTop: "10px" }}>
        <input
          ref={inputRef}
          type="text"
          value={newInput}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder="Write, or press / for blocks — paste an image or a link and it lands as a card"
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--body, sans-serif)",
            fontSize: "16.5px",
            padding: "6px 0",
            color: "inherit",
          }}
        />

        {/* Bottom Slash Menu Popover */}
        {slashMenu?.isOpen && slashMenu.insertAfterIndex === undefined && (
          <div
            style={{
              position: "absolute",
              left: "44px",
              top: "100%",
              zIndex: 50,
              width: "292px",
              border: "3px solid #0A0A0A",
              background: "#FFFFFF",
              boxShadow: "7px 7px 0 #0A0A0A",
              overflow: "hidden",
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
              <span>BLOCKS</span>
              <span>ESC TO CLOSE</span>
            </div>
            {filteredSlashItems.map((item, itemIdx) => {
              const isActive = slashMenu.activeIndex === itemIdx;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleInsertBlock(item.type)}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: "11px",
                    background: isActive ? "#FCE94F" : "transparent",
                    border: "none",
                    borderBottom: "2px solid rgba(10,10,10,0.14)",
                    padding: "8px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "#0A0A0A",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={() => setSlashMenu((prev) => (prev ? { ...prev, activeIndex: itemIdx } : null))}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      border: "2px solid #0A0A0A",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      flex: "none",
                      background: "#FFFFFF",
                    }}
                  >
                    {item.glyph}
                  </span>
                  <b style={{ fontSize: "13.5px", fontWeight: 700 }}>{item.label}</b>
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
        )}
      </div>
    </div>
  );
};
