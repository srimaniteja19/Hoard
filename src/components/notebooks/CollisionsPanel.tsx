"use client";

import React from "react";
import { CourseCollision } from "@/lib/notebooks/seedData";

interface CollisionsPanelProps {
  collisions: CourseCollision[];
}

export const CollisionsPanel: React.FC<CollisionsPanelProps> = ({ collisions }) => {
  return (
    <div
      style={{
        border: "3px solid #0A0A0A",
        background: "#0A0A0A",
        color: "#F0EDE4",
        boxShadow: "8px 8px 0 #7FE9F7",
        margin: "40px 0 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          fontFamily: "var(--mono, monospace)",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.19em",
          padding: "11px 16px",
          borderBottom: "2px solid rgba(240,237,228,0.28)",
          color: "#7FE9F7",
        }}
      >
        <span>WHERE THE COURSES TOUCH</span>
        <span>{collisions.length} COLLISIONS FOUND</span>
      </div>

      {collisions.map((col, idx) => (
        <div
          key={col.id || idx}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "16px",
            alignItems: "center",
            padding: "13px 16px",
            borderBottom: idx < collisions.length - 1 ? "2px solid rgba(240,237,228,0.13)" : "none",
          }}
        >
          <div>
            <b
              style={{
                display: "block",
                fontFamily: "var(--display, sans-serif)",
                fontWeight: 800,
                fontSize: "18px",
                letterSpacing: "-0.028em",
                lineHeight: 1.15,
                color: "#FFFFFF",
              }}
            >
              {col.title}
            </b>
            <p style={{ margin: "5px 0 0", fontSize: "14.5px", lineHeight: 1.5, opacity: 0.65 }}>
              {col.description}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "7px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              flex: "none",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "8.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "2px solid #7B5CF0",
                background: "#7B5CF0",
                color: "#FFFFFF",
                padding: "3px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {col.sourceA.course} · {col.sourceA.lesson}
            </span>
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "8.5px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                border: "2px solid #FF9E2C",
                background: "#FF9E2C",
                color: "#0A0A0A",
                padding: "3px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {col.sourceB.course} · {col.sourceB.lesson}
            </span>
          </div>
        </div>
      ))}

      <div
        style={{
          padding: "10px 16px",
          borderTop: "2px solid rgba(240,237,228,0.28)",
          fontFamily: "var(--mono, monospace)",
          fontSize: "9.5px",
          lineHeight: 1.8,
          opacity: 0.55,
        }}
      >
        FOUND BY MATCHING YOUR OWN WORDS ACROSS NOTEBOOKS — NOT THE SYLLABI. THIS IS THE REASON TWO COURSES LIVE IN ONE SYSTEM RATHER THAN TWO APPS.
      </div>
    </div>
  );
};
