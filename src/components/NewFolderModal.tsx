"use client";

import React, { useState } from "react";
import { Collection } from "@/types";

interface NewFolderModalProps {
  isOpen: boolean;
  collections: Collection[];
  onClose: () => void;
  onAddCollection: (folder: {
    name: string;
    ic: string;
    c: string;
    parentId?: string;
  }) => void;
}

const ICON_PRESETS = ["📁", "⚙", "★", "🚀", "📚", "💡", "🎨", "⚡", "🔖", "◈", "♪", "?"];
const COLOR_PRESETS = [
  "#00F0FF", // Cyan
  "#FF007A", // Pink
  "#B6FF3C", // Lime
  "#FFE600", // Yellow
  "#FF6B00", // Orange
  "#7C4DFF", // Violet
  "#00E58A", // Mint
];

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  collections,
  onClose,
  onAddCollection,
}) => {
  const [name, setName] = useState("");
  const [ic, setIc] = useState("📁");
  const [c, setC] = useState("#00F0FF");
  const [parentId, setParentId] = useState("root");

  if (!isOpen) return null;

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!name.trim()) return;

    onAddCollection({
      name: name.trim(),
      ic,
      c,
      parentId: parentId === "root" ? undefined : parentId,
    });

    setName("");
    setIc("📁");
    setC("#00F0FF");
    setParentId("root");
    onClose();
  };

  const flattenCollections = (list: Collection[], depth = 0): { id: string; name: string }[] => {
    let res: { id: string; name: string }[] = [];
    list.forEach((item) => {
      const prefix = "— ".repeat(depth);
      res.push({ id: item.id, name: `${prefix}${item.name}` });
      if (item.kids) {
        res = res.concat(flattenCollections(item.kids, depth + 1));
      }
    });
    return res;
  };

  const availableParents = flattenCollections(collections);

  return (
    <div
      className="veil on"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("veil")) onClose();
      }}
    >
      <div className="sheet">
        <header>
          <b>CREATE NEW FOLDER</b>
          <button onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit} style={{ padding: "16px" }}>
          <div className="fld">
            <span className="flbl">FOLDER NAME</span>
            <input
              className="urlin"
              style={{ border: "2px solid #000", marginTop: "4px" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Systems, Web3, Ideas..."
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="fld" style={{ marginTop: "14px" }}>
            <span className="flbl">ICON SYMBOL</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
              {ICON_PRESETS.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => setIc(icon)}
                  style={{
                    border: "2px solid #000",
                    background: ic === icon ? "#FFE600" : "#FFFDF8",
                    boxShadow: ic === icon ? "3px 3px 0 #000" : "none",
                    padding: "6px 10px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="fld" style={{ marginTop: "14px" }}>
            <span className="flbl">ACCENT COLOR</span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
              {COLOR_PRESETS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setC(color)}
                  style={{
                    border: "2px solid #000",
                    background: color,
                    width: "28px",
                    height: "28px",
                    boxShadow: c === color ? "3px 3px 0 #000" : "none",
                    transform: c === color ? "scale(1.1)" : "none",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="fld" style={{ marginTop: "14px" }}>
            <span className="flbl">LOCATION / PARENT FOLDER</span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              style={{
                width: "100%",
                border: "2px solid #000",
                background: "#F4F0EA",
                padding: "8px 10px",
                fontFamily: "var(--mono)",
                fontSize: "12.5px",
                fontWeight: "700",
                marginTop: "4px",
                outline: "none",
              }}
            >
              <option value="root">[ Top-Level Folder ]</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sfoot" style={{ padding: "16px 0 0", borderTop: "2px solid #000", marginTop: "16px" }}>
            <button type="button" onClick={onClose}>
              CANCEL
            </button>
            <button type="submit" className="prime">
              CREATE FOLDER
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
