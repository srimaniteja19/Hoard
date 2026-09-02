"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Block, generateBlockId } from "@/lib/notebooks/blocks";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { InlineEditorHandle } from "./blocks/InlineTextEditor";
import { FloatingSelectionToolbar } from "./FloatingSelectionToolbar";
import { playSound } from "@/lib/sound";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
  GripVertical,
  Copy,
  RefreshCw,
  X,
} from "lucide-react";

import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { detectEmbedType, getEmbedInfo } from "@/lib/notebooks/embeds";

// Matches the markdown/HTML formatting delimiters BlockRenderer strips when
// rendering (see renderFormattedInline's tokenRegex) — used to map a plain,
// rendered selection string back to its position in the raw markdown text.
const FORMAT_DELIMITER_REGEX =
  /<\/?span[^>]*>|<\/?mark[^>]*>|<\/?(?:strong|b|em|code)>|\*\*|==|~~|`|\*/g;

/**
 * A DOM selection's plain text has all formatting delimiters (**, ==, <span>,
 * etc.) already stripped by the browser. To find where that plain text lives
 * in the raw markdown block text — even when the selection crosses an
 * existing formatting boundary (e.g. spans across a **bold** run inside a
 * ==highlighted== paragraph) — build a plain-text version of the raw text
 * alongside a map from each plain-text index back to its raw-text index.
 */
function buildPlainTextMap(raw: string): { plain: string; rawIndexAt: number[] } {
  let plain = "";
  const rawIndexAt: number[] = [];
  let rawIdx = 0;

  while (rawIdx < raw.length) {
    FORMAT_DELIMITER_REGEX.lastIndex = rawIdx;
    const match = FORMAT_DELIMITER_REGEX.exec(raw);
    if (match && match.index === rawIdx) {
      rawIdx += match[0].length;
      continue;
    }
    plain += raw[rawIdx];
    rawIndexAt.push(rawIdx);
    rawIdx++;
  }

  return { plain, rawIndexAt };
}

// Mirrors BlockRenderer's renderFormattedInline tokenRegex — matches a single
// complete formatting unit (tag pair or markdown delimiter pair) so nested
// units can be found by recursing into each match's inner content.
const ATOMIC_UNIT_REGEX =
  /<mark[\s\S]*?<\/mark>|<span[\s\S]*?<\/span>|<strong>[\s\S]*?<\/strong>|<b>[\s\S]*?<\/b>|\*\*[^*\n]+?\*\*|==(?:(?!==)[^\n])+?==|~~[^~\n]+?~~|<code>[\s\S]*?<\/code>|`[^`\n]+`|<em>[\s\S]*?<\/em>|(?<=\s|^)\*(?!\s)[^*\n]+?\*(?=\s|$|<|[.,:;!?])/g;

// Strips a matched unit's opening/closing delimiter, returning its inner
// content and how far that content starts into the matched text (so a
// recursive scan can compute absolute raw offsets for nested units).
function stripUnitDelimiters(token: string): { content: string; contentStart: number } | null {
  const taggedPatterns: [RegExp, RegExp][] = [
    [/^<mark[^>]*>/i, /<\/mark>$/i],
    [/^<span[^>]*>/i, /<\/span>$/i],
    [/^<strong>/, /<\/strong>$/],
    [/^<b>/, /<\/b>$/],
    [/^<em>/, /<\/em>$/],
    [/^<code>/, /<\/code>$/],
  ];
  for (const [openRe, closeRe] of taggedPatterns) {
    const openMatch = token.match(openRe);
    if (openMatch) {
      const open = openMatch[0];
      const closeMatch = token.match(closeRe);
      const close = closeMatch ? closeMatch[0] : "";
      return { content: token.slice(open.length, token.length - close.length), contentStart: open.length };
    }
  }
  if (token.startsWith("**") && token.endsWith("**")) return { content: token.slice(2, -2), contentStart: 2 };
  if (token.startsWith("==") && token.endsWith("==")) return { content: token.slice(2, -2), contentStart: 2 };
  if (token.startsWith("~~") && token.endsWith("~~")) return { content: token.slice(2, -2), contentStart: 2 };
  if (token.startsWith("`") && token.endsWith("`")) return { content: token.slice(1, -1), contentStart: 1 };
  if (token.startsWith("*") && token.endsWith("*")) return { content: token.slice(1, -1), contentStart: 1 };
  return null;
}

// Recursively collects [start, end) raw-index bounds for every formatting
// unit in the text, at every nesting depth. Uses matchAll (which snapshots
// its own iteration state) rather than a shared exec()/lastIndex loop, since
// the recursive call below re-enters this function with the SAME module-level
// regex — reusing exec()/lastIndex here would let the recursive call's scan
// clobber the outer call's position and spin forever.
function collectUnitBoundaries(raw: string, offset: number, results: Array<[number, number]>) {
  for (const match of raw.matchAll(ATOMIC_UNIT_REGEX)) {
    const uStart = offset + (match.index ?? 0);
    const uEnd = uStart + match[0].length;
    results.push([uStart, uEnd]);
    const stripped = stripUnitDelimiters(match[0]);
    if (stripped) {
      collectUnitBoundaries(stripped.content, uStart + stripped.contentStart, results);
    }
  }
}

/**
 * Adjusts [start, end) so it never bisects an existing formatting unit (e.g.
 * lands between a **bold**'s two asterisk pairs). A unit fully inside the
 * range, or fully containing it, is left alone — only a unit that partially
 * overlaps one edge forces that edge outward to the unit's boundary.
 */
function snapToUnitBoundaries(raw: string, start: number, end: number): [number, number] {
  const boundaries: Array<[number, number]> = [];
  collectUnitBoundaries(raw, 0, boundaries);

  let snappedStart = start;
  let snappedEnd = end;
  let changed = true;
  let safety = boundaries.length + 1;
  while (changed && safety-- > 0) {
    changed = false;
    for (const [uStart, uEnd] of boundaries) {
      if (uStart <= snappedStart && snappedEnd <= uEnd) continue; // range inside unit
      if (snappedStart <= uStart && uEnd <= snappedEnd) continue; // unit inside range
      if (uEnd <= snappedStart || uStart >= snappedEnd) continue; // no overlap
      if (uStart < snappedStart && snappedStart < uEnd) {
        snappedStart = uStart;
        changed = true;
      }
      if (uStart < snappedEnd && snappedEnd < uEnd) {
        snappedEnd = uEnd;
        changed = true;
      }
    }
  }

  return [snappedStart, snappedEnd];
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (updatedBlocks: Block[]) => void;
  onExplain?: (text: string) => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

const SLASH_MENU_ITEMS: { type: string; glyph: string; label: string; shortcut: string }[] = [
  { type: "paragraph", glyph: "¶", label: "Text Paragraph", shortcut: "/text" },
  { type: "bullet", glyph: "•", label: "Bulleted List (- or *)", shortcut: "/bullet" },
  { type: "numbered", glyph: "1.", label: "Numbered List (1.)", shortcut: "/num" },
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
  { type: "embed", glyph: "▶", label: "Interactive Embed (Video/Audio/Web)", shortcut: "/embed" },
  { type: "youtube", glyph: "▶", label: "YouTube Video", shortcut: "/youtube" },
  { type: "link", glyph: "🔗", label: "Web Bookmark Card", shortcut: "/link" },
  { type: "pdf", glyph: "📄", label: "PDF Document Viewer", shortcut: "/pdf" },
  { type: "audio", glyph: "🎵", label: "Audio / Spotify Player", shortcut: "/audio" },
  { type: "diagram", glyph: "📐", label: "Architecture / Mermaid Diagram", shortcut: "/diagram" },
];

export const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  onChange,
  onExplain,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;
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
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [blockActionMenu, setBlockActionMenu] = useState<{
    blockIndex: number;
    top: number;
    left: number;
  } | null>(null);

  const blockActionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (blockActionMenuRef.current && !blockActionMenuRef.current.contains(e.target as Node)) {
        setBlockActionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleDuplicateBlock = (index: number) => {
    playSound.pop();
    const current = blocks[index];
    if (!current) return;
    const duplicated: Block = {
      ...JSON.parse(JSON.stringify(current)),
      id: generateBlockId(),
    };
    const next = [...blocks];
    next.splice(index + 1, 0, duplicated);
    commitBlocks(next);
    setBlockActionMenu(null);
  };

  const handleFormatSelection = (
    prefix: string,
    suffix: string,
    explicitText?: string,
    explicitBlockIdx?: number | null
  ) => {
    let selectedStr = explicitText || "";
    let blockIdx: number | null = (explicitBlockIdx !== undefined && explicitBlockIdx !== null) ? explicitBlockIdx : null;

    if (!selectedStr || blockIdx === null) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed && sel.toString()) {
        selectedStr = sel.toString();
        const node = sel.anchorNode;
        const blockEl = node instanceof Element ? node.closest("[data-block-index]") : node?.parentElement?.closest("[data-block-index]");
        if (blockEl) {
          const idxStr = blockEl.getAttribute("data-block-index");
          if (idxStr !== null) blockIdx = parseInt(idxStr, 10);
        }
      }
    }

    // Fallback: check active textarea or input
    if (!selectedStr || blockIdx === null) {
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (start !== null && end !== null && start !== end) {
          selectedStr = active.value.substring(start, end);
          const blockEl = active.closest("[data-block-index]");
          if (blockEl) {
            const idxStr = blockEl.getAttribute("data-block-index");
            if (idxStr !== null) blockIdx = parseInt(idxStr, 10);
          }
        }
      }
    }

    if (!selectedStr || blockIdx === null) return;
    const targetBlock = blocks[blockIdx];
    if (!targetBlock) return;

    let targetText = "";
    if ("text" in targetBlock && typeof targetBlock.text === "string") {
      targetText = targetBlock.text;
    } else if ("body" in targetBlock && typeof (targetBlock as any).body === "string") {
      targetText = (targetBlock as any).body;
    } else {
      return;
    }

    // If selectedStr has leading/trailing spaces from double-click or drag, trim if needed
    if (!targetText.includes(selectedStr) && targetText.includes(selectedStr.trim())) {
      selectedStr = selectedStr.trim();
    }

    if (targetText && targetText.includes(selectedStr)) {
      let nextText: string;

      // Clear formatting if prefix and suffix are empty
      if (!prefix && !suffix) {
        const escaped = selectedStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const spanRegex = new RegExp(`<span[^>]*>(${escaped})<\\/span>`, "g");
        const markRegex = new RegExp(`<mark[^>]*>(${escaped})<\\/mark>`, "g");
        const boldRegex = new RegExp(`\\*\\*(${escaped})\\*\\*`, "g");
        const italicRegex = new RegExp(`\\*(${escaped})\\*`, "g");
        const codeRegex = new RegExp(`\`(${escaped})\``, "g");
        const strikeRegex = new RegExp(`~~(${escaped})~~`, "g");
        const highlightRegex = new RegExp(`==(${escaped})==`, "g");

        nextText = targetText
          .replace(spanRegex, "$1")
          .replace(markRegex, "$1")
          .replace(boldRegex, "$1")
          .replace(italicRegex, "$1")
          .replace(codeRegex, "$1")
          .replace(strikeRegex, "$1")
          .replace(highlightRegex, "$1");
      } else {
        const wrapped = `${prefix}${selectedStr}${suffix}`;
        if (targetText.includes(wrapped)) {
          nextText = targetText.replace(wrapped, selectedStr);
        } else {
          // If replacing an existing span or mark with a new one
          const escaped = selectedStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const existingSpanRegex = new RegExp(`<span[^>]*>${escaped}<\\/span>`);
          const existingMarkRegex = new RegExp(`<mark[^>]*>${escaped}<\\/mark>`);
          if (prefix.startsWith("<span") && existingSpanRegex.test(targetText)) {
            nextText = targetText.replace(existingSpanRegex, wrapped);
          } else if (prefix.startsWith("<mark") && existingMarkRegex.test(targetText)) {
            nextText = targetText.replace(existingMarkRegex, wrapped);
          } else {
            nextText = targetText.replace(selectedStr, wrapped);
          }
        }
      }

      if ("text" in targetBlock) {
        handleUpdateBlock(blockIdx, { ...targetBlock, text: nextText });
      } else if ("body" in targetBlock) {
        handleUpdateBlock(blockIdx, { ...targetBlock, body: nextText } as any);
      }
    } else if (targetText) {
      // The selection crosses an existing formatting boundary (e.g. it spans
      // across a **bold** run inside a ==highlighted== paragraph), so the
      // raw markdown no longer contains selectedStr as a literal substring.
      // Map the rendered plain-text selection back to its raw position and
      // operate on that raw span instead — applies to both wrapping in new
      // formatting AND clearing existing formatting from a mixed selection.
      const { plain, rawIndexAt } = buildPlainTextMap(targetText);
      const startInPlain = plain.indexOf(selectedStr);
      if (startInPlain !== -1 && selectedStr.length > 0) {
        const endInPlain = startInPlain + selectedStr.length - 1;
        const initialRawStart = rawIndexAt[startInPlain];
        const initialRawEnd = rawIndexAt[endInPlain] + 1;
        // Snap outward to whole-unit boundaries so we never insert/strip in
        // the middle of an existing delimiter pair (e.g. splitting **bold**).
        const [rawStart, rawEnd] = snapToUnitBoundaries(targetText, initialRawStart, initialRawEnd);

        let nextText: string;
        if (!prefix && !suffix) {
          // Clear formatting: strip every delimiter found within the span.
          const stripped = targetText.slice(rawStart, rawEnd).replace(FORMAT_DELIMITER_REGEX, "");
          nextText = targetText.slice(0, rawStart) + stripped + targetText.slice(rawEnd);
        } else {
          nextText =
            targetText.slice(0, rawStart) + prefix + targetText.slice(rawStart, rawEnd) + suffix + targetText.slice(rawEnd);
        }

        if ("text" in targetBlock) {
          handleUpdateBlock(blockIdx, { ...targetBlock, text: nextText });
        } else if ("body" in targetBlock) {
          handleUpdateBlock(blockIdx, { ...targetBlock, body: nextText } as any);
        }
      }
    }
  };

  // Maps block id -> its InlineTextEditor's focus handle, so we can move
  // focus between blocks (arrow keys, backspace-merge, split-on-enter) the
  // way Notion does — including forcing a not-currently-edited (preview-mode)
  // block into edit mode before focusing it.
  const editorHandles = useRef<Map<string, InlineEditorHandle>>(new Map());
  const pendingFocusRef = useRef<{ blockId: string; position: "start" | "end" } | null>(null);

  const registerEditorHandleFor = useCallback((blockId: string, handle: InlineEditorHandle | null) => {
    if (handle) {
      editorHandles.current.set(blockId, handle);
    } else {
      editorHandles.current.delete(blockId);
    }
  }, []);

  const focusBlockById = useCallback((blockId: string | undefined, position: "start" | "end") => {
    if (!blockId) return;
    editorHandles.current.get(blockId)?.focus(position);
  }, []);

  // After a commit that adds/removes a block, the target block's textarea may
  // not exist in the DOM yet — resolve the focus request once it mounts.
  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const { blockId, position } = pendingFocusRef.current;
    pendingFocusRef.current = null;
    focusBlockById(blockId, position);
  }, [blocks, focusBlockById]);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<Block[][]>([blocks]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Tracks the last `blocks` value WE produced (via commit/undo/redo) so the
  // effect below can tell "blocks changed because of our own edit echoing
  // back through the parent" apart from "blocks changed for an external
  // reason" (e.g. a slower DB fetch overwriting an initial stale localStorage
  // snapshot, or a cross-tab/device realtime sync). Without this, `history[0]`
  // stays pinned to whatever `blocks` happened to be at mount — if that was a
  // stale/incomplete snapshot, Cmd+Z can walk back into it and silently
  // discard real content, even though the editor has since rendered (and the
  // user has since edited) the correct, fully-loaded notes.
  const lastOwnBlocksRef = useRef<Block[]>(blocks);

  useEffect(() => {
    if (blocks !== lastOwnBlocksRef.current) {
      setHistory([blocks]);
      setHistoryIndex(0);
      lastOwnBlocksRef.current = blocks;
    }
  }, [blocks]);

  const commitBlocks = useCallback(
    (nextBlocks: Block[]) => {
      lastOwnBlocksRef.current = nextBlocks;
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
      lastOwnBlocksRef.current = prevBlocks;
      setHistoryIndex((idx) => idx - 1);
      onChange(prevBlocks);
    }
  }, [history, historyIndex, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      playSound.click();
      const nextBlocks = history[historyIndex + 1];
      lastOwnBlocksRef.current = nextBlocks;
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

  // Enter pressed mid-text: keep text before the cursor in the current block,
  // move text after the cursor into a brand-new block, and focus it.
  const handleSplitBlock = (index: number, beforeText: string, afterText: string) => {
    const current = blocks[index];
    if (!current || !("text" in current)) return;
    playSound.click();

    // If Enter is pressed on an empty bullet/numbered line, convert it to a paragraph
    if ((current.type === "bullet" || current.type === "numbered") && !beforeText.trim() && !afterText.trim()) {
      const next = [...blocks];
      next[index] = { id: current.id, type: "paragraph", text: "" };
      commitBlocks(next);
      pendingFocusRef.current = { blockId: current.id, position: "start" };
      return;
    }

    const updatedCurrent = { ...current, text: beforeText } as Block;
    let newBlock: Block;
    if (current.type === "bullet") {
      newBlock = { id: generateBlockId(), type: "bullet", text: afterText };
    } else if (current.type === "numbered") {
      const prevNum = (current as any).number || 1;
      newBlock = { id: generateBlockId(), type: "numbered", number: prevNum + 1, text: afterText };
    } else {
      newBlock = { id: generateBlockId(), type: "paragraph", text: afterText };
    }

    const next = [...blocks];
    next[index] = updatedCurrent;
    next.splice(index + 1, 0, newBlock);
    pendingFocusRef.current = { blockId: newBlock.id, position: "start" };
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

  // Transform existing block (e.g. from typing '# ', '- ', or from slash menu)
  const handleTransformBlock = (index: number, props: any) => {
    playSound.pop();
    const current = blocks[index] || { id: generateBlockId(), type: "paragraph", text: "" };
    let transformed: Block;

    const baseId = current.id || generateBlockId();

    switch (props.type) {
      case "bullet":
        transformed = { id: baseId, type: "bullet", text: props.text || "" };
        break;
      case "numbered":
        transformed = { id: baseId, type: "numbered", number: props.number || 1, text: props.text || "" };
        break;
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
      case "embed":
      case "youtube":
      case "pdf":
      case "audio": {
        const defaultUrl = props.url || (props.type === "youtube" ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "https://example.com");
        transformed = {
          id: baseId,
          type: "embed",
          url: defaultUrl,
          embedType: props.type === "youtube" ? "youtube" : props.type === "pdf" ? "pdf" : props.type === "audio" ? "spotify" : "generic",
          title: props.title || (props.type === "youtube" ? "YouTube Video" : "Embedded Content"),
        };
        break;
      }
      case "link":
      case "bookmark": {
        transformed = {
          id: baseId,
          type: "link",
          url: props.url || "https://example.com",
          title: props.title || "Web Link",
          site: "WEBSITE",
          displayMode: "card",
        };
        break;
      }
      case "diagram":
      case "mermaid": {
        transformed = {
          id: baseId,
          type: "diagram",
          diagramType: "mermaid",
          code: props.code || "graph TD\n  A[Client Request] --> B[Load Balancer]\n  B --> C[Service Node A]\n  B --> D[Service Node B]\n  C --> E[(Database)]\n  D --> E",
          title: props.title || "System Architecture Diagram",
        };
        break;
      }
      case "paragraph":
      default:
        transformed = { id: baseId, type: "paragraph", text: props.text || "" };
        break;
    }

    const next = [...blocks];
    next[index] = transformed;
    pendingFocusRef.current = { blockId: baseId, position: "end" };
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
      case "bullet":
        newBlock = { id: generateBlockId(), type: "bullet", text: "" };
        break;
      case "numbered": {
        let nextNum = 1;
        if (typeof afterIndex === "number" && blocks[afterIndex]?.type === "numbered") {
          nextNum = ((blocks[afterIndex] as any).number || 1) + 1;
        }
        newBlock = { id: generateBlockId(), type: "numbered", number: nextNum, text: "" };
        break;
      }
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
      case "embed":
      case "youtube":
      case "pdf":
      case "audio": {
        const defaultUrl = type === "youtube" ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "https://example.com";
        newBlock = {
          id: generateBlockId(),
          type: "embed",
          url: defaultUrl,
          embedType: type === "youtube" ? "youtube" : type === "pdf" ? "pdf" : type === "audio" ? "spotify" : "generic",
          title: type === "youtube" ? "YouTube Video" : "Embedded Content",
        };
        break;
      }
      case "link":
      case "bookmark":
        newBlock = {
          id: generateBlockId(),
          type: "link",
          url: "https://example.com",
          title: "Web Link",
          site: "WEBSITE",
          displayMode: "card",
        };
        break;
      case "diagram":
      case "mermaid":
        newBlock = {
          id: generateBlockId(),
          type: "diagram",
          diagramType: "mermaid",
          code: "graph TD\n  A[Client Request] --> B[Load Balancer]\n  B --> C[Service Node A]\n  B --> D[Service Node B]\n  C --> E[(Database)]\n  D --> E",
          title: "System Architecture Diagram",
        };
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

  // Helper to insert a block at the current cursor / focused / target location
  const insertBlockAtTarget = useCallback(
    (newBlock: Block, targetIndex: number) => {
      if (targetIndex >= 0 && targetIndex < blocks.length) {
        const targetBlock = blocks[targetIndex];
        const isEmptyParagraph =
          targetBlock.type === "paragraph" &&
          (!("text" in targetBlock) || !targetBlock.text || !targetBlock.text.trim());

        const next = [...blocks];
        if (isEmptyParagraph) {
          // Replace empty line placeholder with the new block
          next[targetIndex] = newBlock;
        } else {
          // Insert right after the active block
          next.splice(targetIndex + 1, 0, newBlock);
        }
        commitBlocks(next);
      } else {
        commitBlocks([...blocks, newBlock]);
      }
    },
    [blocks, commitBlocks]
  );

  const getTargetBlockIndex = useCallback(
    (target?: EventTarget | null): number => {
      // 1. Check the event target element
      if (target && target instanceof HTMLElement) {
        const blockEl = target.closest<HTMLElement>("[data-block-id]");
        if (blockEl) {
          const id = blockEl.getAttribute("data-block-id");
          const idx = blocks.findIndex((b) => b.id === id);
          if (idx !== -1) return idx;
        }
      }

      // 2. Check document.activeElement
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        const blockEl = document.activeElement.closest<HTMLElement>("[data-block-id]");
        if (blockEl) {
          const id = blockEl.getAttribute("data-block-id");
          const idx = blocks.findIndex((b) => b.id === id);
          if (idx !== -1) return idx;
        }
      }

      // 3. Check activeBlockId state
      if (activeBlockId) {
        const idx = blocks.findIndex((b) => b.id === activeBlockId);
        if (idx !== -1) return idx;
      }

      // 4. Check hoveredBlockId state
      if (hoveredBlockId) {
        const idx = blocks.findIndex((b) => b.id === hoveredBlockId);
        if (idx !== -1) return idx;
      }

      return -1;
    },
    [blocks, activeBlockId, hoveredBlockId]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetIdx = typeof insertImageAfterIdx === "number" ? insertImageAfterIdx : getTargetBlockIndex();
    setInsertImageAfterIdx(undefined);

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
        insertBlockAtTarget(imageBlock, targetIdx);
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

  // Handle clipboard paste (images & links) at current cursor / active block
  const handlePaste = (e: React.ClipboardEvent) => {
    const targetIdx = getTargetBlockIndex(e.target);

    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            e.stopPropagation();
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
                insertBlockAtTarget(imageBlock, targetIdx);
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
      e.stopPropagation();
      const imageBlock: Block = {
        id: generateBlockId(),
        type: "image",
        url: text.trim(),
        caption: "PASTED IMAGE",
      };
      insertBlockAtTarget(imageBlock, targetIdx);
      playSound.fileIt();
      return;
    }

    if (text && /^https?:\/\//i.test(text.trim())) {
      e.preventDefault();
      e.stopPropagation();
      try {
        const url = text.trim();
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toUpperCase();
        const embedType = detectEmbedType(url);

        // If it's a rich media provider (YouTube, Vimeo, Loom, Spotify, CodePen, Figma, PDF),
        // insert as an interactive EmbedBlock!
        if (embedType !== "generic") {
          const embedInfo = getEmbedInfo(url);
          const embedBlock: Block = {
            id: generateBlockId(),
            type: "embed",
            url,
            embedType,
            title: embedInfo.title,
          };
          insertBlockAtTarget(embedBlock, targetIdx);
          playSound.fileIt();
          return;
        }

        // Otherwise insert as a rich Bookmark LinkCardBlock!
        const linkBlock: Block = {
          id: generateBlockId(),
          type: "link",
          url,
          title: url.slice(0, 60),
          site: `${hostname} · PASTED LINK`,
          displayMode: "card",
        };
        insertBlockAtTarget(linkBlock, targetIdx);
        playSound.fileIt();
      } catch {
        // regular paste
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        e.stopPropagation();
        const targetIdx = getTargetBlockIndex(e.target);
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
            insertBlockAtTarget(imageBlock, targetIdx);
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
      data-block-editor="true"
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
      onDrop={handleDrop}
    >
      {/* Floating Selection Tooltip */}
      <FloatingSelectionToolbar theme={theme} onFormat={handleFormatSelection} onAiExplain={onExplain} />

      {/* Hidden Image File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/*
        Note Blocks List — deliberately NOT a flex column. Flex items never
        margin-collapse (with siblings or through to a child), so each
        block's own top/bottom margin would fully add up instead of
        collapsing, making the whole page look far gappier than the
        per-block-type margins below were designed for. A plain block
        container lets normal CSS margin collapsing do its job.
      */}
      <div>
        {blocks.map((block, idx) => {
          const isHovered = hoveredBlockId === block.id;

          return (
            <div
              key={block.id}
              id={block.id}
              data-block-id={block.id}
              data-block-index={idx}
              onFocus={() => setActiveBlockId(block.id)}
              onClick={() => setActiveBlockId(block.id)}
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
                  opacity: isHovered || blockActionMenu?.blockIndex === idx ? 1 : 0,
                  transition: "opacity 0.12s ease",
                  userSelect: "none",
                }}
              >
                {/* + Quick Insert Below */}
                <button
                  type="button"
                  title="Insert block below"
                  onClick={() => {
                    playSound.click();
                    handleInsertBlock("paragraph", idx);
                  }}
                  style={{
                    width: "18px",
                    height: "20px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: tokens.textPrimary,
                    opacity: 0.5,
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                    borderRadius: "3px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.background = tokens.popoverHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.5";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>

                {/* ⋮⋮ Block Handle / Action Popover Trigger */}
                <button
                  type="button"
                  title="Block actions & transform (Click for menu)"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound.click();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setBlockActionMenu(
                      blockActionMenu?.blockIndex === idx
                        ? null
                        : { blockIndex: idx, top: rect.bottom + 4, left: rect.left }
                    );
                  }}
                  style={{
                    width: "18px",
                    height: "20px",
                    border: "none",
                    background: blockActionMenu?.blockIndex === idx ? tokens.popoverHoverBg : "transparent",
                    cursor: "pointer",
                    color: tokens.textPrimary,
                    opacity: blockActionMenu?.blockIndex === idx ? 1 : 0.5,
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                    borderRadius: "3px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.background = tokens.popoverHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (blockActionMenu?.blockIndex !== idx) {
                      e.currentTarget.style.opacity = "0.5";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <GripVertical size={13} strokeWidth={2.2} />
                </button>
              </div>

              {/* Block Content */}
              <BlockRenderer
                block={block}
                onUpdateBlock={(updated) => handleUpdateBlock(idx, updated)}
                onDeleteBlock={() => handleDeleteBlock(idx)}
                onInsertBelow={() => handleInsertBlock("paragraph", idx)}
                onSplitBlock={(before, after) => handleSplitBlock(idx, before, after)}
                onFocusPrevious={() => focusBlockById(blocks[idx - 1]?.id, "end")}
                onFocusNext={() => focusBlockById(blocks[idx + 1]?.id, "start")}
                registerEditorHandle={(handle) => registerEditorHandleFor(block.id, handle)}
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
                theme={theme}
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
                    border: isInk ? "2px solid rgba(255,255,255,0.25)" : "3px solid #0A0A0A",
                    background: isInk ? "#1A1D26" : "#FFFFFF",
                    boxShadow: isInk ? "5px 5px 0 rgba(0,0,0,0.6)" : "7px 7px 0 #0A0A0A",
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
                      background: isInk ? "#252A36" : "#EBE7DC",
                      borderBottom: isInk ? "2px solid rgba(255,255,255,0.15)" : "2px solid #0A0A0A",
                      color: isInk ? "#F0EDE4" : "#0A0A0A",
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
                            background: isActive ? (isInk ? "#2A303F" : "#FCE94F") : "transparent",
                            border: "none",
                            borderBottom: isInk ? "1px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(10,10,10,0.1)",
                            padding: "8px 12px",
                            cursor: "pointer",
                            textAlign: "left",
                            color: isInk ? (isActive ? "#FFFFFF" : "#F0EDE4") : "#0A0A0A",
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
                              border: isInk ? "1.5px solid rgba(255,255,255,0.25)" : "2px solid #0A0A0A",
                              display: "grid",
                              placeItems: "center",
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "10px",
                              fontWeight: 700,
                              flex: "none",
                              background: isInk ? "#252A36" : "#FFFFFF",
                              color: isInk ? "#F0EDE4" : "#0A0A0A",
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

      {/* Block Action Popover Menu */}
      {blockActionMenu && (
        <div
          ref={blockActionMenuRef}
          style={{
            position: "fixed",
            top: `${blockActionMenu.top}px`,
            left: `${blockActionMenu.left}px`,
            zIndex: 99999,
            background: tokens.popoverBg,
            border: `2px solid ${tokens.borderPrimary}`,
            boxShadow: tokens.popoverShadow,
            minWidth: "220px",
            padding: "6px 0",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            animation: "fadeIn 0.08s ease",
          }}
        >
          {/* Turn Into Header */}
          <div style={{ padding: "4px 12px 6px", fontSize: "8.5px", letterSpacing: "0.12em", color: tokens.textMuted }}>
            TURN INTO
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "2px", padding: "0 6px 6px" }}>
            {[
              { type: "paragraph", label: "Paragraph", glyph: "¶" },
              { type: "bullet", label: "Bullet", glyph: "•" },
              { type: "numbered", label: "Numbered", glyph: "1." },
              { type: "h2", label: "Heading 1", glyph: "H1" },
              { type: "h3", label: "Heading 2", glyph: "H2" },
              { type: "code", label: "Code", glyph: "<>" },
              { type: "quote", label: "Quote", glyph: '"' },
              { type: "gotcha", label: "Gotcha", glyph: "!" },
              { type: "todo", label: "To-Do", glyph: "☑" },
              { type: "toggle", label: "Toggle", glyph: "▸" },
              { type: "embed", label: "Embed", glyph: "▶" },
              { type: "link", label: "Bookmark", glyph: "🔗" },
              { type: "diagram", label: "Diagram", glyph: "📐" },
            ].map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  playSound.pop();
                  handleTransformBlock(blockActionMenu.blockIndex, { type: t.type as any });
                  setBlockActionMenu(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: tokens.textPrimary,
                  padding: "5px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "9.5px",
                  borderRadius: "2px",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ opacity: 0.6 }}>{t.glyph}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div style={{ height: "1px", background: tokens.borderSubtle, margin: "4px 0" }} />

          {/* Duplicate Block */}
          <button
            type="button"
            onClick={() => handleDuplicateBlock(blockActionMenu.blockIndex)}
            style={{
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: tokens.textPrimary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Copy size={11} />
            <span>Duplicate Block</span>
          </button>

          {/* Move Up */}
          <button
            type="button"
            disabled={blockActionMenu.blockIndex === 0}
            onClick={() => {
              handleMoveBlock(blockActionMenu.blockIndex, "up");
              setBlockActionMenu(null);
            }}
            style={{
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: tokens.textPrimary,
              opacity: blockActionMenu.blockIndex === 0 ? 0.4 : 1,
              cursor: blockActionMenu.blockIndex === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (blockActionMenu.blockIndex > 0) e.currentTarget.style.background = tokens.popoverHoverBg;
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowUp size={11} />
            <span>Move Up</span>
          </button>

          {/* Move Down */}
          <button
            type="button"
            disabled={blockActionMenu.blockIndex === blocks.length - 1}
            onClick={() => {
              handleMoveBlock(blockActionMenu.blockIndex, "down");
              setBlockActionMenu(null);
            }}
            style={{
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: tokens.textPrimary,
              opacity: blockActionMenu.blockIndex === blocks.length - 1 ? 0.4 : 1,
              cursor: blockActionMenu.blockIndex === blocks.length - 1 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (blockActionMenu.blockIndex < blocks.length - 1) e.currentTarget.style.background = tokens.popoverHoverBg;
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowDown size={11} />
            <span>Move Down</span>
          </button>

          <div style={{ height: "1px", background: tokens.borderSubtle, margin: "4px 0" }} />

          {/* Delete Block */}
          <button
            type="button"
            onClick={() => {
              handleDeleteBlock(blockActionMenu.blockIndex);
              setBlockActionMenu(null);
            }}
            style={{
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: "#EF4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Trash2 size={11} />
            <span>Delete Block</span>
          </button>
        </div>
      )}
    </div>
  );
};
