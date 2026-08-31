"use client";

import React, { useState, useRef, useEffect } from "react";
import { Block, generateBlockId } from "@/lib/notebooks/blocks";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { playSound } from "@/lib/sound";
import { Plus, GripVertical, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface BlockEditorProps {
  blocks: Block[];
  onChange: (updatedBlocks: Block[]) => void;
  accentColor?: string;
}

const SLASH_MENU_ITEMS: { type: string; glyph: string; label: string; shortcut: string }[] = [
  { type: "h2", glyph: "H2", label: "Heading 2", shortcut: "/h2" },
  { type: "h3", glyph: "H3", label: "Heading 3", shortcut: "/h3" },
  { type: "paragraph", glyph: "¶", label: "Text paragraph", shortcut: "/text" },
  { type: "image", glyph: "📷", label: "Paste / Upload Image", shortcut: "/image" },
  { type: "gotcha", glyph: "!", label: "Gotcha callout (Pink)", shortcut: "/gotcha" },
  { type: "question", glyph: "?", label: "Question for me (Yellow)", shortcut: "/q" },
  { type: "fact", glyph: "★", label: "Key takeaway (Lime)", shortcut: "/fact" },
  { type: "connects", glyph: "↗", label: "Connects to (Cyan)", shortcut: "/connects" },
  { type: "code", glyph: "<>", label: "Python Code", shortcut: "/code" },
  { type: "toggle", glyph: "▸", label: "Toggle section", shortcut: "/toggle" },
  { type: "todo", glyph: "☑", label: "To-do items", shortcut: "/todo" },
  { type: "quote", glyph: '"', label: "Quote", shortcut: "/quote" },
  { type: "mark", glyph: "⏱", label: "Timestamp mark", shortcut: "/mark" },
];

export const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  onChange,
  accentColor = "#7B5CF0",
}) => {
  const [newInput, setNewInput] = useState("");
  const [showSlash, setShowSlash] = useState(false);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [insertAfterIdx, setInsertAfterIdx] = useState<number | undefined>(undefined);

  const handleUpdateBlock = (index: number, updated: Block) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  };

  const handleDeleteBlock = (index: number) => {
    playSound.pop();
    const next = blocks.filter((_, idx) => idx !== index);
    onChange(next);
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
    onChange(next);
  };

  const handleInsertBlock = (type: string, afterIndex?: number) => {
    playSound.click();

    if (type === "image") {
      setInsertAfterIdx(afterIndex);
      fileInputRef.current?.click();
      setShowSlash(false);
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

    onChange(next);
    setNewInput("");
    setShowSlash(false);
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
        onChange(next);
        playSound.fileIt();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowSlash(false);
    } else if (e.key === "Enter" && !showSlash && newInput.trim()) {
      handleInsertBlock("paragraph");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewInput(val);
    setShowSlash(/^\/\w*$/.test(val.trim()));
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
                onChange([...blocks, imageBlock]);
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
      onChange([...blocks, imageBlock]);
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
        onChange([...blocks, linkBlock]);
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
            onChange([...blocks, imageBlock]);
            playSound.fileIt();
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "2px" }}
      onPaste={handlePaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Hidden Image File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
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
                padding: "4px 0 4px 34px",
                margin: "2px 0",
              }}
            >
              {/* Hover Handle Controls */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  opacity: isHovered ? 1 : 0,
                  transition: "opacity 0.12s ease",
                }}
              >
                <button
                  type="button"
                  title="Insert block below"
                  onClick={() => handleInsertBlock("paragraph", idx)}
                  style={{
                    width: "16px",
                    height: "22px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "inherit",
                    opacity: 0.4,
                    fontSize: "14px",
                    padding: 0,
                  }}
                >
                  ＋
                </button>
                <button
                  type="button"
                  title="Delete block"
                  onClick={() => handleDeleteBlock(idx)}
                  style={{
                    width: "16px",
                    height: "22px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#DC2626",
                    opacity: 0.4,
                    fontSize: "12px",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Rendered Block */}
              <BlockRenderer
                block={block}
                onUpdateBlock={(updated) => handleUpdateBlock(idx, updated)}
                onDeleteBlock={() => handleDeleteBlock(idx)}
                accentColor={accentColor}
              />
            </div>
          );
        })}
      </div>

      {/* New Line Input with Slash Command Popover */}
      <div style={{ position: "relative", padding: "8px 0 8px 34px", marginTop: "10px" }}>
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
            padding: "5px 0",
            color: "inherit",
          }}
        />

        {/* Slash Menu Popover */}
        {showSlash && (
          <div
            style={{
              position: "absolute",
              left: "34px",
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
              }}
            >
              BLOCKS
            </div>
            {SLASH_MENU_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleInsertBlock(item.type)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: "11px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "2px solid rgba(10,10,10,0.14)",
                  padding: "9px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "#0A0A0A",
                  transition: "background 0.1s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    border: "2px solid #0A0A0A",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {item.glyph}
                </span>
                <b style={{ fontSize: "14px", fontWeight: 700 }}>{item.label}</b>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
