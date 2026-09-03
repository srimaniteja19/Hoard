"use client";

import React, { useState, useRef } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import {
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  Table as TableIcon,
  Sparkles,
  ChevronDown,
} from "lucide-react";

interface TableBlockProps {
  block: Extract<Block, { type: "table" }>;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const TableBlock: React.FC<TableBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [activeColMenu, setActiveColMenu] = useState<number | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Safe defaults
  const columns = block.columns && block.columns.length > 0
    ? block.columns
    : [
        { id: "c1", title: "Column 1", align: "left" as const },
        { id: "c2", title: "Column 2", align: "left" as const },
        { id: "c3", title: "Column 3", align: "left" as const },
      ];

  const rows = block.rows && block.rows.length > 0
    ? block.rows
    : [
        ["", "", ""],
        ["", "", ""],
      ];

  const title = block.title || "";
  const striped = block.striped ?? false;

  const updateTable = (partial: Partial<Extract<Block, { type: "table" }>>) => {
    if (!onUpdateBlock) return;
    onUpdateBlock({
      ...block,
      columns,
      rows,
      ...partial,
    });
  };

  // Cell Editing
  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const nextRows = rows.map((r, i) => (i === rIdx ? [...r] : r));
    // Ensure row has enough columns
    while (nextRows[rIdx].length < columns.length) {
      nextRows[rIdx].push("");
    }
    nextRows[rIdx][cIdx] = val;
    updateTable({ rows: nextRows });
  };

  // Column Header Title
  const handleColumnTitleChange = (cIdx: number, newTitle: string) => {
    const nextCols = columns.map((c, i) => (i === cIdx ? { ...c, title: newTitle } : c));
    updateTable({ columns: nextCols });
  };

  // Add Column
  const handleAddColumn = () => {
    playSound.click();
    const newColId = "col_" + Math.random().toString(36).slice(2, 7);
    const nextCols = [...columns, { id: newColId, title: `Column ${columns.length + 1}`, align: "left" as const }];
    const nextRows = rows.map((r) => [...r, ""]);
    updateTable({ columns: nextCols, rows: nextRows });
  };

  // Delete Column
  const handleDeleteColumn = (cIdx: number) => {
    if (columns.length <= 1) return;
    playSound.click();
    const nextCols = columns.filter((_, i) => i !== cIdx);
    const nextRows = rows.map((r) => r.filter((_, i) => i !== cIdx));
    setActiveColMenu(null);
    updateTable({ columns: nextCols, rows: nextRows });
  };

  // Column Alignment
  const handleSetAlignment = (cIdx: number, align: "left" | "center" | "right") => {
    playSound.click();
    const nextCols = columns.map((c, i) => (i === cIdx ? { ...c, align } : c));
    setActiveColMenu(null);
    updateTable({ columns: nextCols });
  };

  // Column Sort
  const handleSortColumn = (cIdx: number, order: "asc" | "desc") => {
    playSound.click();
    const nextRows = [...rows].sort((a, b) => {
      const valA = (a[cIdx] || "").trim();
      const valB = (b[cIdx] || "").trim();
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return order === "asc" ? numA - numB : numB - numA;
      }
      return order === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
    setActiveColMenu(null);
    updateTable({ rows: nextRows });
  };

  // Add Row
  const handleAddRow = () => {
    playSound.click();
    const nextRows = [...rows, new Array(columns.length).fill("")];
    updateTable({ rows: nextRows });
  };

  // Delete Row
  const handleDeleteRow = (rIdx: number) => {
    if (rows.length <= 1) return;
    playSound.click();
    const nextRows = rows.filter((_, i) => i !== rIdx);
    updateTable({ rows: nextRows });
  };

  // Keyboard navigation across cells
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => {
    if (e.key === "Tab") {
      if (!e.shiftKey && cIdx === columns.length - 1 && rIdx === rows.length - 1) {
        e.preventDefault();
        handleAddRow();
      }
    } else if (e.key === "Enter") {
      if (rIdx === rows.length - 1 && cIdx === columns.length - 1) {
        e.preventDefault();
        handleAddRow();
      }
    }
  };

  // Copy Markdown Table
  const handleCopyMarkdown = () => {
    playSound.click();
    const header = `| ${columns.map((c) => c.title || " ").join(" | ")} |`;
    const separator = `| ${columns
      .map((c) => (c.align === "center" ? ":---:" : c.align === "right" ? "---:" : ":---"))
      .join(" | ")} |`;
    const body = rows.map((r) => `| ${columns.map((_, i) => r[i] ?? "").join(" | ")} |`).join("\n");
    const md = `${title ? `### ${title}\n\n` : ""}${header}\n${separator}\n${body}`;

    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 1800);
  };

  // Copy / Export CSV
  const handleCopyCsv = () => {
    playSound.click();
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const header = columns.map((c) => escapeCsv(c.title || "")).join(",");
    const body = rows.map((r) => columns.map((_, i) => escapeCsv(r[i] ?? "")).join(",")).join("\n");
    const csv = `${header}\n${body}`;

    navigator.clipboard.writeText(csv);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 1800);
  };

  // Apply Presets
  const applyPreset = (presetName: string) => {
    playSound.pop();
    setShowPresets(false);

    if (presetName === "comparison") {
      updateTable({
        title: "Feature Comparison Matrix",
        columns: [
          { id: "c1", title: "Feature / Capability", align: "left" },
          { id: "c2", title: "Our Solution", align: "center" },
          { id: "c3", title: "Competitor A", align: "center" },
          { id: "c4", title: "Competitor B", align: "center" },
        ],
        rows: [
          ["Real-time Sync", "✓ Yes (Instant)", "✗ No", "✓ Partial"],
          ["Local-first Cache", "✓ 100% Offline", "✗ Cloud Only", "✗ Cloud Only"],
          ["Neo-Brutalist Design", "✓ Pure Custom", "✗ Standard", "✗ Standard"],
          ["Export Formats", "Markdown, CSV, PDF", "PDF Only", "None"],
        ],
      });
    } else if (presetName === "sprint") {
      updateTable({
        title: "Sprint Tracker",
        columns: [
          { id: "c1", title: "Task Description", align: "left" },
          { id: "c2", title: "Owner", align: "left" },
          { id: "c3", title: "Priority", align: "center" },
          { id: "c4", title: "Status", align: "center" },
        ],
        rows: [
          ["Build Data Table Block", "Frontend", "P0 HIGH", "IN PROGRESS"],
          ["Implement KaTeX Formula Block", "AI Core", "P1 MEDIUM", "READY"],
          ["Add Column Sorting & CSV Export", "Fullstack", "P1 MEDIUM", "DONE"],
        ],
      });
    } else if (presetName === "proscons") {
      updateTable({
        title: "Decision: Pros vs Cons",
        columns: [
          { id: "c1", title: "Dimension / Factor", align: "left" },
          { id: "c2", title: "Pros / Strengths", align: "left" },
          { id: "c3", title: "Cons / Risks", align: "left" },
          { id: "c4", title: "Verdict", align: "center" },
        ],
        rows: [
          ["Architecture", "Clean, recursive component model", "Slightly more logic", "Strong Buy"],
          ["Performance", "Zero bloat, instant rendering", "None observed", "Approved"],
        ],
      });
    } else if (presetName === "ledger") {
      updateTable({
        title: "Financial Ledger Summary",
        columns: [
          { id: "c1", title: "Category", align: "left" },
          { id: "c2", title: "Budget ($)", align: "right" },
          { id: "c3", title: "Actual ($)", align: "right" },
          { id: "c4", title: "Variance ($)", align: "right" },
        ],
        rows: [
          ["Engineering & Cloud", "12500", "11200", "-1300"],
          ["Design & Branding", "4500", "4500", "0"],
          ["Operations & Tools", "3000", "3400", "+400"],
        ],
      });
    }
  };

  // Compute column calculations (Count, Sum, Average for numerical columns)
  const columnCalculations = columns.map((_, colIdx) => {
    const vals = rows.map((r) => (r[colIdx] || "").trim());
    const numVals = vals.map((v) => parseFloat(v)).filter((n) => !isNaN(n));

    if (numVals.length >= 2 && numVals.length === vals.filter(Boolean).length) {
      const sum = numVals.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / numVals.length;
      return {
        isNumeric: true,
        sum: Number.isInteger(sum) ? sum : sum.toFixed(2),
        avg: avg.toFixed(1),
      };
    }
    return { isNumeric: false };
  });

  return (
    <div
      className="notion-table-block group"
      style={{
        margin: "18px 0",
        border: `2px solid ${tokens.borderPrimary}`,
        boxShadow: tokens.boxShadow,
        borderRadius: "2px",
        background: tokens.cardBg,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Table Toolbar Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: isInk ? "rgba(255,255,255,0.04)" : "rgba(10,10,10,0.03)",
          borderBottom: `2px solid ${tokens.borderPrimary}`,
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {/* Table Title Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
          <TableIcon size={14} color={accentColor} />
          <input
            type="text"
            value={title}
            placeholder="Untitled Table..."
            onChange={(e) => updateTable({ title: e.target.value })}
            style={{
              fontFamily: "var(--sans, system-ui, sans-serif)",
              fontWeight: 700,
              fontSize: "13.5px",
              background: "transparent",
              border: "none",
              outline: "none",
              color: tokens.textPrimary,
              width: "100%",
              padding: "2px 0",
            }}
          />
        </div>

        {/* Toolbar Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {/* Preset Templates Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowPresets((prev) => !prev)}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                background: tokens.cardBg,
                color: tokens.textPrimary,
                border: `1.5px solid ${tokens.borderSubtle}`,
                padding: "3px 7px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                borderRadius: "2px",
              }}
            >
              <Sparkles size={11} color={accentColor} />
              <span>TEMPLATES</span>
              <ChevronDown size={10} />
            </button>

            {showPresets && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  zIndex: 999,
                  background: tokens.popoverBg,
                  border: `2px solid ${tokens.borderPrimary}`,
                  boxShadow: tokens.popoverShadow,
                  padding: "4px",
                  minWidth: "180px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {[
                  { id: "comparison", label: "Feature Comparison" },
                  { id: "sprint", label: "Sprint Task Tracker" },
                  { id: "proscons", label: "Pros & Cons" },
                  { id: "ledger", label: "Financial Ledger" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      background: "transparent",
                      border: "none",
                      color: tokens.textPrimary,
                      padding: "6px 8px",
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: "2px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Striped Rows Toggle */}
          <button
            type="button"
            onClick={() => updateTable({ striped: !striped })}
            title="Toggle striped row highlights"
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: striped ? accentColor : "transparent",
              color: striped ? "#FFFFFF" : tokens.textSecondary,
              border: `1.5px solid ${tokens.borderSubtle}`,
              padding: "3px 6px",
              cursor: "pointer",
              borderRadius: "2px",
            }}
          >
            STRIPED
          </button>

          {/* Copy Markdown */}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            title="Copy as Markdown table"
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: tokens.cardBg,
              color: copiedMd ? "#10B981" : tokens.textSecondary,
              border: `1.5px solid ${tokens.borderSubtle}`,
              padding: "3px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              borderRadius: "2px",
            }}
          >
            {copiedMd ? <Check size={10} /> : <Copy size={10} />}
            <span>{copiedMd ? "COPIED" : "MD"}</span>
          </button>

          {/* Copy CSV */}
          <button
            type="button"
            onClick={handleCopyCsv}
            title="Copy as CSV data"
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: tokens.cardBg,
              color: copiedCsv ? "#10B981" : tokens.textSecondary,
              border: `1.5px solid ${tokens.borderSubtle}`,
              padding: "3px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              borderRadius: "2px",
            }}
          >
            {copiedCsv ? <Check size={10} /> : <Download size={10} />}
            <span>{copiedCsv ? "COPIED" : "CSV"}</span>
          </button>

          {/* Delete Table */}
          {onDeleteBlock && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onDeleteBlock();
              }}
              title="Delete table block"
              style={{
                background: "transparent",
                border: "none",
                color: "#EF4444",
                cursor: "pointer",
                padding: "3px",
                display: "grid",
                placeItems: "center",
                opacity: 0.7,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--sans, system-ui, sans-serif)",
            fontSize: "13px",
          }}
        >
          {/* Header Row */}
          <thead>
            <tr
              style={{
                background: isInk ? "rgba(255,255,255,0.06)" : "rgba(10,10,10,0.04)",
                borderBottom: `2px solid ${tokens.borderPrimary}`,
              }}
            >
              {/* Row Index Column */}
              <th
                style={{
                  width: "36px",
                  padding: "6px 8px",
                  textAlign: "center",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  color: tokens.textSecondary,
                  borderRight: `1.5px solid ${tokens.borderSubtle}`,
                  userSelect: "none",
                }}
              >
                #
              </th>

              {/* Data Columns */}
              {columns.map((col, cIdx) => (
                <th
                  key={col.id || cIdx}
                  style={{
                    padding: "6px 10px",
                    textAlign: col.align || "left",
                    borderRight: `1.5px solid ${tokens.borderSubtle}`,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start" }}>
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => handleColumnTitleChange(cIdx, e.target.value)}
                      placeholder="Column title..."
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontWeight: 800,
                        fontSize: "11px",
                        letterSpacing: "0.06em",
                        color: tokens.textPrimary,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        width: "100%",
                        textAlign: col.align || "left",
                      }}
                    />

                    {/* Column Options Button */}
                    <button
                      type="button"
                      onClick={() => setActiveColMenu(activeColMenu === cIdx ? null : cIdx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: tokens.textSecondary,
                        cursor: "pointer",
                        padding: "2px",
                        opacity: 0.6,
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>

                  {/* Column Options Popover */}
                  {activeColMenu === cIdx && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: col.align === "right" ? "auto" : "8px",
                        right: col.align === "right" ? "8px" : "auto",
                        marginTop: "4px",
                        zIndex: 999,
                        background: tokens.popoverBg,
                        border: `2px solid ${tokens.borderPrimary}`,
                        boxShadow: tokens.popoverShadow,
                        padding: "6px",
                        minWidth: "150px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        textAlign: "left",
                      }}
                    >
                      {/* Alignment Options */}
                      <div style={{ display: "flex", gap: "4px", padding: "2px 4px" }}>
                        <button
                          type="button"
                          onClick={() => handleSetAlignment(cIdx, "left")}
                          style={{
                            flex: 1,
                            padding: "4px",
                            border: `1px solid ${tokens.borderSubtle}`,
                            background: col.align === "left" ? accentColor : "transparent",
                            color: col.align === "left" ? "#FFFFFF" : tokens.textPrimary,
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <AlignLeft size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAlignment(cIdx, "center")}
                          style={{
                            flex: 1,
                            padding: "4px",
                            border: `1px solid ${tokens.borderSubtle}`,
                            background: col.align === "center" ? accentColor : "transparent",
                            color: col.align === "center" ? "#FFFFFF" : tokens.textPrimary,
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <AlignCenter size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAlignment(cIdx, "right")}
                          style={{
                            flex: 1,
                            padding: "4px",
                            border: `1px solid ${tokens.borderSubtle}`,
                            background: col.align === "right" ? accentColor : "transparent",
                            color: col.align === "right" ? "#FFFFFF" : tokens.textPrimary,
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <AlignRight size={12} />
                        </button>
                      </div>

                      {/* Sorting */}
                      <button
                        type="button"
                        onClick={() => handleSortColumn(cIdx, "asc")}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "4px 6px",
                          color: tokens.textPrimary,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        Sort A → Z (Ascending)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSortColumn(cIdx, "desc")}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "4px 6px",
                          color: tokens.textPrimary,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        Sort Z → A (Descending)
                      </button>

                      {/* Delete Column */}
                      {columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(cIdx)}
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: "4px 6px",
                            color: "#EF4444",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Trash2 size={10} />
                          <span>Delete Column</span>
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))}

              {/* Add Column Button Header */}
              <th style={{ width: "32px", padding: "4px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={handleAddColumn}
                  title="Add new column to the right"
                  style={{
                    background: "transparent",
                    border: `1.5px dashed ${tokens.borderSubtle}`,
                    color: tokens.textSecondary,
                    cursor: "pointer",
                    padding: "3px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "2px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accentColor;
                    e.currentTarget.style.color = accentColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = tokens.borderSubtle;
                    e.currentTarget.style.color = tokens.textSecondary;
                  }}
                >
                  <Plus size={11} />
                </button>
              </th>
            </tr>
          </thead>

          {/* Table Body Rows */}
          <tbody>
            {rows.map((row, rIdx) => {
              const isRowStriped = striped && rIdx % 2 === 1;

              return (
                <tr
                  key={rIdx}
                  style={{
                    background: isRowStriped
                      ? (isInk ? "rgba(255,255,255,0.02)" : "rgba(10,10,10,0.02)")
                      : "transparent",
                    borderBottom: `1px solid ${tokens.borderSubtle}`,
                  }}
                >
                  {/* Row Gutter (# and delete action on hover) */}
                  <td
                    className="group/row"
                    style={{
                      padding: "6px 8px",
                      textAlign: "center",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      color: tokens.textSecondary,
                      borderRight: `1.5px solid ${tokens.borderSubtle}`,
                      position: "relative",
                      userSelect: "none",
                    }}
                  >
                    <span>{rIdx + 1}</span>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(rIdx)}
                        title="Delete this row"
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: tokens.cardBg,
                          border: "none",
                          color: "#EF4444",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          opacity: 0,
                          transition: "opacity 0.1s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </td>

                  {/* Cell Inputs */}
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: "4px 8px",
                        borderRight: `1px solid ${tokens.borderSubtle}`,
                        textAlign: col.align || "left",
                      }}
                    >
                      <input
                        type="text"
                        value={row[cIdx] ?? ""}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: tokens.textPrimary,
                          fontFamily: "var(--sans, system-ui, sans-serif)",
                          fontSize: "13px",
                          textAlign: col.align || "left",
                          padding: "4px 2px",
                        }}
                      />
                    </td>
                  ))}

                  <td style={{ width: "32px" }} />
                </tr>
              );
            })}
          </tbody>

          {/* Optional Calculations Footer Bar */}
          <tfoot>
            <tr
              style={{
                background: isInk ? "rgba(255,255,255,0.05)" : "rgba(10,10,10,0.03)",
                borderTop: `2px solid ${tokens.borderPrimary}`,
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                color: tokens.textSecondary,
              }}
            >
              <td style={{ padding: "6px", textAlign: "center", borderRight: `1.5px solid ${tokens.borderSubtle}` }}>
                Σ
              </td>

              {columns.map((col, cIdx) => {
                const calc = columnCalculations[cIdx];
                return (
                  <td
                    key={cIdx}
                    style={{
                      padding: "6px 8px",
                      borderRight: `1px solid ${tokens.borderSubtle}`,
                      textAlign: col.align || "left",
                    }}
                  >
                    {calc.isNumeric ? (
                      <span>
                        Sum: <strong style={{ color: tokens.textPrimary }}>{calc.sum}</strong> · Avg: {calc.avg}
                      </span>
                    ) : (
                      cIdx === 0 ? <span>{rows.length} rows</span> : null
                    )}
                  </td>
                );
              })}

              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add Row Button at Table Bottom */}
      <button
        type="button"
        onClick={handleAddRow}
        style={{
          width: "100%",
          padding: "7px",
          background: isInk ? "rgba(255,255,255,0.02)" : "rgba(10,10,10,0.02)",
          border: "none",
          borderTop: `1.5px dashed ${tokens.borderSubtle}`,
          color: tokens.textSecondary,
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          fontWeight: 800,
          letterSpacing: "0.1em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
          transition: "all 0.1s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = tokens.popoverHoverBg;
          e.currentTarget.style.color = accentColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isInk ? "rgba(255,255,255,0.02)" : "rgba(10,10,10,0.02)";
          e.currentTarget.style.color = tokens.textSecondary;
        }}
      >
        <Plus size={11} />
        <span>ADD ROW</span>
      </button>
    </div>
  );
};
