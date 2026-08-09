"use client";

import React, { useState, useRef } from "react";
import { KindType } from "@/types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedItem {
  title: string;
  url: string;
  folder?: string;
  type: KindType;
}

function parseHTMLBookmarks(html: string): ParsedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const links = doc.querySelectorAll("a");
  const items: ParsedItem[] = [];

  links.forEach((a) => {
    const href = a.getAttribute("href");
    const title = a.textContent?.trim() || href || "Imported Bookmark";
    if (href && href.startsWith("http")) {
      // Try to determine folder from parent DL header if available
      let folder = "Imported";
      const parentDL = a.closest("dl");
      if (parentDL) {
        const prevH3 = parentDL.previousElementSibling;
        if (prevH3 && prevH3.tagName.toLowerCase() === "h3") {
          folder = prevH3.textContent?.trim() || "Imported";
        }
      }

      items.push({
        title,
        url: href,
        folder,
        type: detectKind(href),
      });
    }
  });

  return items;
}

function parseJSONBookmarks(jsonStr: string): ParsedItem[] {
  try {
    const data = JSON.parse(jsonStr);
    const arr = Array.isArray(data) ? data : data.bookmarks || data.items || [];
    return arr
      .filter((x: Record<string, unknown>) => x.url || x.href || x.link)
      .map((x: Record<string, unknown>) => {
        const url = String(x.url || x.href || x.link);
        return {
          title: String(x.title || x.t || x.name || url),
          url,
          folder: String(x.folder || x.coll || x.collection || "Imported"),
          type: (x.ty || x.type || detectKind(url)) as KindType,
        };
      });
  } catch {
    return [];
  }
}

function parseTextUrls(text: string): ParsedItem[] {
  const lines = text.split("\n");
  const items: ParsedItem[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/https?:\/\/[^\s]+/i);
    if (match) {
      const url = match[0];
      items.push({
        title: url.split("/").pop() || url,
        url,
        folder: "Imported",
        type: detectKind(url),
      });
    }
  });

  return items;
}

function detectKind(u: string): KindType {
  const urlLower = u.toLowerCase();
  if (/youtube\.com\/playlist/.test(urlLower)) return "PLY";
  if (/youtube\.com|youtu\.be/.test(urlLower)) return "VID";
  if (/github\.com/.test(urlLower)) return "GIT";
  if (/arxiv|acm\.org|ieee/.test(urlLower)) return "PPR";
  if (/raycast|warp\.dev|apps\.apple/.test(urlLower)) return "APP";
  if (/docs\.|developer\.|\/docs\//.test(urlLower)) return "DOC";
  return "ART";
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      let items: ParsedItem[] = [];
      if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        items = parseHTMLBookmarks(content);
      } else if (file.name.endsWith(".json")) {
        items = parseJSONBookmarks(content);
      } else {
        items = parseTextUrls(content);
      }

      setParsedItems(items);
      if (items.length === 0) {
        setStatusMsg("⚠️ Could not find valid URLs in this file.");
      }
    };
    reader.readAsText(file);
  };

  const handleRunImport = async () => {
    if (parsedItems.length === 0) return;
    setIsImporting(true);
    setStatusMsg("Importing bookmarks into your Hoard DB...");

    try {
      const res = await fetch("/api/bookmarks/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedItems),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }

      const json = await res.json();
      setStatusMsg(`✓ Success! ${json.importedCount} bookmarks imported.`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1200);
    } catch (e: unknown) {
      setStatusMsg(`❌ Error: ${e instanceof Error ? e.message : "Import failed"}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="veil on"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("veil")) onClose();
      }}
    >
      <div className="sheet" style={{ maxWidth: "560px" }}>
        <header>
          <b>ONE-CLICK IMPORT</b>
          <button onClick={onClose}>✕</button>
        </header>

        <div style={{ padding: "16px 0", fontFamily: "var(--mono)" }}>
          <p style={{ fontSize: "12px", marginBottom: "12px", opacity: 0.9 }}>
            Upload your bookmarks from <b>Chrome, Firefox, Edge, Pocket, Raindrop, or plain URL lists</b> (.html, .json, .txt).
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,.json,.txt,.csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "3px dashed #000",
              background: "#FFFDF8",
              padding: "24px",
              textAlign: "center",
              cursor: "pointer",
              boxShadow: "3px 3px 0 #000",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📁</div>
            <div style={{ fontWeight: "800", fontSize: "13px" }}>
              {fileName ? fileName : "CLICK TO CHOOSE FILE TO IMPORT"}
            </div>
            <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
              Supports .html (Netscape format), .json, or plain text URLs
            </div>
          </div>

          {parsedItems.length > 0 && (
            <div
              style={{
                border: "2px solid #000",
                background: "#B6FF3C",
                padding: "10px",
                fontWeight: "800",
                fontSize: "12px",
                marginBottom: "16px",
                boxShadow: "2px 2px 0 #000",
              }}
            >
              PARSED {parsedItems.length} BOOKMARKS READY TO IMPORT
            </div>
          )}

          {statusMsg && (
            <div
              style={{
                border: "2px solid #000",
                background: statusMsg.startsWith("✓") ? "#B6FF3C" : statusMsg.startsWith("❌") ? "#FF007A" : "#FFE600",
                color: statusMsg.startsWith("❌") ? "#fff" : "#000",
                padding: "8px 12px",
                fontWeight: 800,
                fontSize: "11px",
                marginBottom: "16px",
              }}
            >
              {statusMsg}
            </div>
          )}
        </div>

        <div className="sfoot">
          <button onClick={onClose}>CANCEL</button>
          <button
            className="prime"
            onClick={handleRunImport}
            disabled={isImporting || parsedItems.length === 0}
            style={{
              opacity: parsedItems.length === 0 ? 0.5 : 1,
              cursor: parsedItems.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {isImporting ? "IMPORTING..." : `IMPORT ${parsedItems.length} BOOKMARKS`}
          </button>
        </div>
      </div>
    </div>
  );
};
