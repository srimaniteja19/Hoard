"use client";

import React, { useState, useRef } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";
import { Copy, Check, Palette, Code2 } from "lucide-react";

export type CodeTheme = "neo-ink" | "tokyo-night" | "monokai" | "cream-paper";

interface CodeBlockProps {
  block: Extract<Block, { type: "code" }>;
  onUpdateBlock?: (updated: Block) => void;
  accentColor?: string;
}

interface ThemeConfig {
  name: string;
  bg: string;
  headerBg: string;
  borderColor: string;
  shadowColor: string;
  text: string;
  keyword: string;
  string: string;
  number: string;
  fn: string;
  comment: string;
  type: string;
  gutter: string;
  lineHighlight: string;
}

const THEMES: Record<CodeTheme, ThemeConfig> = {
  "neo-ink": {
    name: "Neo-Ink",
    bg: "#0A0A0A",
    headerBg: "#161920",
    borderColor: "#0A0A0A",
    shadowColor: "#B8F04A",
    text: "#F0EDE4",
    keyword: "#FF2D8A", // Vibrant Pink
    string: "#FCE94F", // Warm Yellow
    number: "#7FE9F7", // Bright Cyan
    fn: "#FF9E2C", // Orange
    type: "#B8F04A", // Lime
    comment: "#7E8594", // Muted Slate
    gutter: "rgba(240,237,228,0.25)",
    lineHighlight: "rgba(255,255,255,0.04)",
  },
  "tokyo-night": {
    name: "Tokyo Night",
    bg: "#1A1B26",
    headerBg: "#24283B",
    borderColor: "#0A0A0A",
    shadowColor: "#7AA2F7",
    text: "#C0CAF5",
    keyword: "#BB9AF7",
    string: "#9ECE6A",
    number: "#FF9E64",
    fn: "#7AA2F7",
    type: "#2AC3DE",
    comment: "#565F89",
    gutter: "#414868",
    lineHighlight: "rgba(122,162,247,0.06)",
  },
  "monokai": {
    name: "Monokai Pro",
    bg: "#272822",
    headerBg: "#1E1F1C",
    borderColor: "#0A0A0A",
    shadowColor: "#F92672",
    text: "#F8F8F2",
    keyword: "#F92672",
    string: "#E6DB74",
    number: "#AE81FF",
    fn: "#A6E22E",
    type: "#66D9EF",
    comment: "#75715E",
    gutter: "rgba(248,248,242,0.25)",
    lineHighlight: "rgba(255,255,255,0.05)",
  },
  "cream-paper": {
    name: "Cream Paper",
    bg: "#FCFAF6",
    headerBg: "#EBE7DC",
    borderColor: "#0A0A0A",
    shadowColor: "#0A0A0A",
    text: "#0A0A0A",
    keyword: "#D90429",
    string: "#15803D",
    number: "#7B5CF0",
    fn: "#D97706",
    type: "#0284C7",
    comment: "#6B7280",
    gutter: "rgba(10,10,10,0.3)",
    lineHighlight: "rgba(10,10,10,0.03)",
  },
};

const PYTHON_KEYWORDS = new Set([
  "def", "class", "return", "if", "elif", "else", "while", "for", "in",
  "try", "except", "finally", "with", "as", "import", "from", "lambda",
  "yield", "break", "continue", "pass", "raise", "assert", "global",
  "nonlocal", "async", "await", "and", "or", "not", "is"
]);

const PYTHON_TYPES = new Set([
  "True", "False", "None", "int", "float", "str", "list", "dict", "set",
  "tuple", "bool", "bytes", "bytearray", "memoryview", "range", "complex",
  "frozenset", "type", "object", "self", "cls"
]);

const PYTHON_BUILTINS = new Set([
  "print", "len", "range", "enumerate", "zip", "map", "filter", "open",
  "input", "sum", "max", "min", "abs", "round", "sorted", "reversed",
  "isinstance", "issubclass", "getattr", "setattr", "hasattr", "delattr",
  "llm", "run", "reflect", "run_tests"
]);

const JS_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for",
  "while", "do", "switch", "case", "break", "continue", "default",
  "import", "export", "from", "class", "extends", "new", "this",
  "super", "async", "await", "try", "catch", "finally", "throw",
  "typeof", "instanceof", "in", "of", "interface", "type", "enum", "as"
]);

const JS_TYPES = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity", "Promise",
  "Array", "Object", "String", "Number", "Boolean", "Function", "Symbol",
  "BigInt", "Map", "Set", "WeakMap", "WeakSet", "RegExp", "Error"
]);

const JS_BUILTINS = new Set([
  "console", "log", "warn", "error", "info", "JSON", "Math", "fetch",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "document", "window", "localStorage", "sessionStorage"
]);

export const CodeBlock: React.FC<CodeBlockProps> = ({
  block,
  onUpdateBlock,
  accentColor = "#7B5CF0",
}) => {
  const [currentTheme, setCurrentTheme] = useState<CodeTheme>("neo-ink");
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const theme = THEMES[currentTheme];
  const lang = (block.lang || "PYTHON").toUpperCase();

  const handleCopy = async () => {
    playSound.pop();
    try {
      await navigator.clipboard.writeText(block.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCycleTheme = () => {
    playSound.click();
    const themeKeys = Object.keys(THEMES) as CodeTheme[];
    const nextIdx = (themeKeys.indexOf(currentTheme) + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIdx]);
  };

  /**
   * Tokenizes a line of code into syntax-colored spans
   */
  const highlightLine = (line: string, langName: string): React.ReactNode => {
    if (!line) return "\n";

    // Match comments (# ... or // ...)
    const commentMatch = langName === "PYTHON" || langName === "BASH"
      ? line.match(/^([\s\S]*?)(#[\s\S]*)$/)
      : line.match(/^([\s\S]*?)(\/\/[\s\S]*)$/);

    if (commentMatch) {
      const beforeComment = commentMatch[1];
      const commentText = commentMatch[2];
      return (
        <>
          {highlightTokens(beforeComment, langName)}
          <span style={{ color: theme.comment, fontStyle: "italic" }}>{commentText}</span>
        </>
      );
    }

    return highlightTokens(line, langName);
  };

  const highlightTokens = (text: string, langName: string): React.ReactNode => {
    // Regex matches: Strings ("...", '...', `...`, f"...", b"...", r"..."), Numbers, Words/Identifiers, Operators
    const tokenRegex = /([fbrFBR]?["'](?:\\.|[^\\])*?["']|`[^`]*`|\b\d+(?:\.\d+)?(?:j|e[+-]?\d+)?\b|\b[a-zA-Z_]\w*\b|[=+\-*/%&|^~<>!?:,;()\[\]{}]+|\s+)/g;
    const parts = text.match(tokenRegex) || [text];

    const isPy = langName === "PYTHON";
    const isJS = langName === "JAVASCRIPT" || langName === "TYPESCRIPT" || langName === "TS" || langName === "JS";

    return parts.map((token, idx) => {
      if (!token) return null;

      // Strings
      if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith("`") && token.endsWith("`")) ||
        ((token.startsWith('f"') || token.startsWith('r"') || token.startsWith('b"') || token.startsWith("f'") || token.startsWith("r'") || token.startsWith("b'")) && (token.endsWith('"') || token.endsWith("'")))
      ) {
        return (
          <span key={idx} style={{ color: theme.string }}>
            {token}
          </span>
        );
      }

      // Numbers
      if (/^\d+(?:\.\d+)?(?:j|e[+-]?\d+)?$/i.test(token)) {
        return (
          <span key={idx} style={{ color: theme.number }}>
            {token}
          </span>
        );
      }

      // Python tokens
      if (isPy) {
        if (PYTHON_KEYWORDS.has(token)) {
          return (
            <span key={idx} style={{ color: theme.keyword, fontWeight: 700 }}>
              {token}
            </span>
          );
        }
        if (PYTHON_TYPES.has(token)) {
          return (
            <span key={idx} style={{ color: theme.type, fontWeight: 600 }}>
              {token}
            </span>
          );
        }
        if (PYTHON_BUILTINS.has(token)) {
          return (
            <span key={idx} style={{ color: theme.fn }}>
              {token}
            </span>
          );
        }
      }

      // JS/TS tokens
      if (isJS) {
        if (JS_KEYWORDS.has(token)) {
          return (
            <span key={idx} style={{ color: theme.keyword, fontWeight: 700 }}>
              {token}
            </span>
          );
        }
        if (JS_TYPES.has(token)) {
          return (
            <span key={idx} style={{ color: theme.type, fontWeight: 600 }}>
              {token}
            </span>
          );
        }
        if (JS_BUILTINS.has(token)) {
          return (
            <span key={idx} style={{ color: theme.fn }}>
              {token}
            </span>
          );
        }
      }

      // General fallback keyword coloring
      if (PYTHON_KEYWORDS.has(token) || JS_KEYWORDS.has(token)) {
        return (
          <span key={idx} style={{ color: theme.keyword, fontWeight: 700 }}>
            {token}
          </span>
        );
      }

      return token;
    });
  };

  const lines = block.code.split("\n");

  return (
    <div
      style={{
        border: `3px solid ${theme.borderColor}`,
        background: theme.bg,
        color: theme.text,
        boxShadow: `5px 5px 0 ${theme.shadowColor}`,
        margin: "18px 0 24px",
        overflow: "hidden",
        borderRadius: "0px",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {/* Code Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          padding: "7px 14px",
          background: theme.headerBg,
          borderBottom: `2px solid rgba(240,237,228,0.18)`,
          fontFamily: "var(--mono, monospace)",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          flexWrap: "wrap",
        }}
      >
        {/* Left: Language badge & note */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              background: theme.keyword,
              color: "#FFFFFF",
              padding: "2px 7px",
              borderRadius: "2px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Code2 size={11} />
            {lang}
          </span>

          <span
            contentEditable={!!onUpdateBlock}
            suppressContentEditableWarning
            onBlur={(e) => {
              if (onUpdateBlock) onUpdateBlock({ ...block, note: e.currentTarget.innerText });
            }}
            style={{
              color: theme.type,
              opacity: 0.9,
              outline: "none",
            }}
          >
            {block.note || "SNIPPET"}
          </span>
        </div>

        {/* Right: Controls (Theme, Copy, Edit) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={handleCycleTheme}
            title={`Switch theme (Current: ${theme.name})`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "transparent",
              border: "1.5px solid rgba(240,237,228,0.3)",
              color: theme.text,
              fontFamily: "var(--mono, monospace)",
              fontSize: "8.5px",
              fontWeight: 700,
              padding: "3px 7px",
              cursor: "pointer",
              borderRadius: "2px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.type;
              e.currentTarget.style.color = "#0A0A0A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = theme.text;
            }}
          >
            <Palette size={10} />
            <span>{theme.name.toUpperCase()}</span>
          </button>

          {/* Copy Code Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy code to clipboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: isCopied ? "#B8F04A" : "transparent",
              border: `1.5px solid ${isCopied ? "#B8F04A" : "rgba(240,237,228,0.3)"}`,
              color: isCopied ? "#0A0A0A" : theme.text,
              fontFamily: "var(--mono, monospace)",
              fontSize: "8.5px",
              fontWeight: 700,
              padding: "3px 8px",
              cursor: "pointer",
              borderRadius: "2px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isCopied) {
                e.currentTarget.style.background = "#FCE94F";
                e.currentTarget.style.color = "#0A0A0A";
              }
            }}
            onMouseLeave={(e) => {
              if (!isCopied) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = theme.text;
              }
            }}
          >
            {isCopied ? <Check size={10} /> : <Copy size={10} />}
            <span>{isCopied ? "COPIED" : "COPY"}</span>
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      {isEditingCode ? (
        <textarea
          ref={textareaRef}
          value={block.code}
          onChange={(e) => {
            if (onUpdateBlock) onUpdateBlock({ ...block, code: e.target.value });
          }}
          onBlur={() => setIsEditingCode(false)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const nextCode = block.code.substring(0, start) + "    " + block.code.substring(end);
              if (onUpdateBlock) onUpdateBlock({ ...block, code: nextCode });
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                }
              }, 0);
            }
          }}
          rows={Math.max(4, lines.length + 1)}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "13.5px",
            lineHeight: "1.75",
            background: theme.bg,
            color: theme.text,
            border: "none",
            outline: "none",
            resize: "vertical",
            whiteSpace: "pre",
          }}
          autoFocus
        />
      ) : (
        <div
          onClick={() => {
            if (onUpdateBlock) setIsEditingCode(true);
          }}
          title={onUpdateBlock ? "Click to edit code" : undefined}
          style={{
            display: "grid",
            gridTemplateColumns: "40px minmax(0, 1fr)",
            padding: "12px 0",
            cursor: onUpdateBlock ? "text" : "default",
          }}
        >
          {/* Line Numbers Gutter */}
          <div
            style={{
              userSelect: "none",
              textAlign: "right",
              paddingRight: "12px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "12px",
              lineHeight: "1.75",
              color: theme.gutter,
              opacity: 0.6,
            }}
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Highlighted Code Lines */}
          <pre
            style={{
              margin: 0,
              padding: "0 16px 0 0",
              overflowX: "auto",
              fontFamily: "var(--mono, monospace)",
              fontSize: "13.5px",
              lineHeight: "1.75",
              color: theme.text,
            }}
          >
            {lines.map((line, i) => (
              <div key={i} style={{ minHeight: "1.75em" }}>
                {highlightLine(line, lang)}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
};
