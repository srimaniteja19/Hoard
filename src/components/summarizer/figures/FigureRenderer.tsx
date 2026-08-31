"use client";

import React from "react";
import { DigestFigure, RelayStep, ContrastItem, AnatomyPart, FlowStep, ScaleQuantity, InputsData } from "@/lib/summarizer/types";
import { ArrowRight, RefreshCw, GitCommit, Layers, Scale, Split, Check, X, ShieldAlert, Sparkles } from "lucide-react";

interface FigureRendererProps {
  figure: DigestFigure;
}

export const FigureRenderer: React.FC<FigureRendererProps> = ({ figure }) => {
  return (
    <figure
      style={{
        margin: "24px 0",
        padding: "0",
        background: "#080808",
        border: "2px solid #222222",
        borderRadius: "4px",
        overflow: "hidden",
        boxShadow: "4px 4px 0 #000000",
      }}
    >
      {/* Figure Header Bar */}
      <div
        style={{
          padding: "10px 16px",
          background: "#121212",
          borderBottom: "1.5px solid #222222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 900,
              textTransform: "uppercase",
              padding: "2px 6px",
              borderRadius: "2px",
              background: "#FFE600",
              color: "#0A0A0A",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {figure.kind === "relay" && <GitCommit size={11} />}
            {figure.kind === "contrast" && <Split size={11} />}
            {figure.kind === "anatomy" && <Layers size={11} />}
            {figure.kind === "flow" && <RefreshCw size={11} />}
            {figure.kind === "scale" && <Scale size={11} />}
            {figure.kind === "inputs" && <Sparkles size={11} />}
            FIGURE · {figure.kind}
          </span>
          <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "14px", fontWeight: 800, color: "#FFFFFF" }}>
            {figure.title}
          </span>
        </div>

        {figure.scaleNote && (
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#FBBF24" }}>
            ⚖ {figure.scaleNote}
          </span>
        )}
      </div>

      {/* Figure Visual Body */}
      <div style={{ padding: "18px 20px", background: "#0A0A0A" }}>
        {figure.kind === "relay" && <RelayView data={figure.relayData || []} />}
        {figure.kind === "contrast" && <ContrastView data={figure.contrastData} />}
        {figure.kind === "anatomy" && <AnatomyView data={figure.anatomyData} />}
        {figure.kind === "flow" && <FlowView data={figure.flowData} />}
        {figure.kind === "scale" && <ScaleView data={figure.scaleData} />}
        {figure.kind === "inputs" && <InputsView data={figure.inputsData} />}
      </div>

      {/* Figure Caption (Annotation Voice) */}
      <figcaption
        style={{
          padding: "10px 16px",
          background: "#111111",
          borderTop: "1px solid #222222",
          fontFamily: "var(--mono, monospace)",
          fontSize: "11px",
          color: "#A3A3A3",
          fontStyle: "italic",
          display: "flex",
          alignItems: "baseline",
          gap: "6px",
        }}
      >
        <span style={{ color: "#FFE600", fontStyle: "normal", fontWeight: 900 }}>↳</span>
        <span>{figure.caption}</span>
      </figcaption>
    </figure>
  );
};

/* ── 1. RELAY VIEW ── */
const RelayView: React.FC<{ data: RelayStep[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
      {data.map((step, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr",
            gap: "14px",
            background: "#141414",
            border: "1.5px solid #262626",
            borderRadius: "3px",
            padding: "12px 14px",
            position: "relative",
          }}
        >
          {/* Year & Actor */}
          <div>
            {step.year && (
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 900,
                  color: "#FFE600",
                  display: "block",
                }}
              >
                {step.year}
              </span>
            )}
            <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "14px", color: "#FFFFFF" }}>
              {step.actor}
            </b>
          </div>

          {/* Action & Baton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#E5E5E5" }}>
              {step.action}
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 800,
                color: "#4ADE80",
                background: "rgba(74, 222, 128, 0.1)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                padding: "2px 8px",
                borderRadius: "2px",
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>BATON ↳</span>
              <span>{step.baton}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── 2. CONTRAST VIEW ── */
const ContrastView: React.FC<{
  data?: { labelA: string; labelB: string; items: ContrastItem[] };
}> = ({ data }) => {
  if (!data || !data.items || data.items.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Header columns */}
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr", gap: "10px", paddingBottom: "6px", borderBottom: "1.5px solid #2A2A2A" }}>
        <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888" }}>DIMENSION</span>
        <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "13px", fontWeight: 900, color: "#F87171" }}>
          ✕ {data.labelA}
        </span>
        <span style={{ fontFamily: "var(--display, sans-serif)", fontSize: "13px", fontWeight: 900, color: "#4ADE80" }}>
          ✓ {data.labelB}
        </span>
      </div>

      {data.items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "130px 1fr 1fr",
            gap: "10px",
            padding: "10px",
            background: "#141414",
            border: "1px solid #222222",
            borderRadius: "3px",
          }}
        >
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 800, color: "#FFE600" }}>
            {item.attribute}
          </span>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#A3A3A3" }}>
            <b style={{ color: "#E5E5E5", display: "block" }}>{item.optionA.title}</b>
            {item.optionA.detail}
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#D1D5DB" }}>
            <b style={{ color: "#4ADE80", display: "block" }}>{item.optionB.title}</b>
            {item.optionB.detail}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── 3. ANATOMY VIEW ── */
const AnatomyView: React.FC<{
  data?: { systemName: string; parts: AnatomyPart[] };
}> = ({ data }) => {
  if (!data || !data.parts || data.parts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {data.systemName && (
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 900, color: "#00F0FF", marginBottom: "4px" }}>
          SYSTEM: {data.systemName.toUpperCase()}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
        {data.parts.map((part, idx) => (
          <div
            key={idx}
            style={{
              background: "#141414",
              border: "1.5px solid #282828",
              padding: "12px 14px",
              borderRadius: "3px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "2px",
                  background: "#00F0FF",
                  color: "#0A0A0A",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 900,
                }}
              >
                {part.number || idx + 1}
              </span>
              <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "14px", color: "#FFFFFF" }}>
                {part.name}
              </b>
            </div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#CCCCCC", flex: 1 }}>
              {part.role}
            </div>
            {part.orderedDependency && (
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", color: "#888888", borderTop: "1px solid #222222", paddingTop: "5px" }}>
                Relies on: <span style={{ color: "#FFE600" }}>{part.orderedDependency}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── 4. FLOW VIEW ── */
const FlowView: React.FC<{
  data?: { steps: FlowStep[]; loopDescription?: string };
}> = ({ data }) => {
  if (!data || !data.steps || data.steps.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {data.steps.map((step, idx) => (
          <React.Fragment key={step.id || idx}>
            <div
              style={{
                background: "#141414",
                border: `1.5px solid ${step.isLoopOrBranch ? "#F59E0B" : "#282828"}`,
                padding: "10px 14px",
                borderRadius: "3px",
                minWidth: "160px",
                flex: 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9.5px", fontWeight: 900, color: "#888888" }}>
                  STEP {idx + 1}
                </span>
                {step.isLoopOrBranch && (
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", color: "#F59E0B", fontWeight: 900 }}>
                    ⟲ FEEDBACK
                  </span>
                )}
              </div>
              <b style={{ fontFamily: "var(--display, sans-serif)", fontSize: "13.5px", color: "#FFFFFF", display: "block" }}>
                {step.label}
              </b>
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#A3A3A3", marginTop: "3px" }}>
                {step.detail}
              </div>
            </div>
            {idx < data.steps.length - 1 && (
              <span style={{ color: "#FFE600", fontSize: "18px", fontWeight: 900 }}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {data.loopDescription && (
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
            color: "#F59E0B",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            padding: "6px 12px",
            borderRadius: "3px",
            marginTop: "6px",
          }}
        >
          <b>⟲ FEEDBACK LOOP:</b> {data.loopDescription}
        </div>
      )}
    </div>
  );
};

/* ── 5. SCALE VIEW ── */
const ScaleView: React.FC<{
  data?: { axisType: "linear" | "log"; ratio: string; items: ScaleQuantity[] };
}> = ({ data }) => {
  if (!data || !data.items || data.items.length === 0) return null;

  const maxValue = Math.max(...data.items.map((i) => i.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 900, color: "#888888" }}>
          AXIS MODE: <b style={{ color: "#FFE600" }}>{data.axisType.toUpperCase()}</b>
        </span>
        <span
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "11px",
            fontWeight: 900,
            color: "#0A0A0A",
            background: "#FFE600",
            padding: "2px 8px",
            borderRadius: "2px",
          }}
        >
          RATIO: {data.ratio}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {data.items.map((item, idx) => {
          // Log or linear proportional calculation
          let pct = 0;
          if (data.axisType === "log") {
            const minLog = Math.log10(Math.max(1, Math.min(...data.items.map((i) => i.value))));
            const maxLog = Math.log10(Math.max(1, maxValue));
            const currentLog = Math.log10(Math.max(1, item.value));
            pct = maxLog > minLog ? Math.max(8, ((currentLog - minLog) / (maxLog - minLog)) * 100) : 100;
          } else {
            pct = maxValue > 0 ? Math.max(3, (item.value / maxValue) * 100) : 0;
          }

          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
                <span style={{ color: "#E5E5E5", fontWeight: 700 }}>{item.label}</span>
                <b style={{ color: "#FFE600" }}>{item.formatted || `${item.value} ${item.unit}`}</b>
              </div>
              <div style={{ height: "14px", background: "#1C1C1C", borderRadius: "2px", overflow: "hidden", border: "1px solid #333333" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: idx === 0 ? "#4ADE80" : idx === 1 ? "#00F0FF" : "#F43F5E",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── 6. INPUTS VIEW ── */
const InputsView: React.FC<{ data?: InputsData }> = ({ data }) => {
  if (!data) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
      {/* Required Inputs */}
      <div style={{ background: "#141414", border: "1.5px solid #166534", padding: "12px 14px", borderRadius: "3px" }}>
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 900, color: "#4ADE80", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
          <Check size={13} /> ESSENTIAL INTAKE (INCLUDED)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {(data.included || []).map((item, idx) => (
            <div key={idx} style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#E5E5E5", display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ color: "#4ADE80" }}>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Discarded / Proved Unnecessary */}
      <div style={{ background: "#141414", border: "1.5px solid #991B1B", padding: "12px 14px", borderRadius: "3px" }}>
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 900, color: "#F87171", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
          <X size={13} /> PROVED UNNECESSARY (DISCARDED)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {(data.excluded || []).map((item, idx) => (
            <div key={idx} style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#A3A3A3", display: "flex", alignItems: "baseline", gap: "6px", textDecoration: "line-through" }}>
              <span style={{ color: "#F87171" }}>✕</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {data.transformation && (
        <div style={{ gridColumn: "1 / -1", fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#FFE600", background: "#181818", border: "1px dashed #333333", padding: "8px 12px", borderRadius: "3px" }}>
          <b>⚡ TRANSFORM MECHANISM:</b> {data.transformation}
        </div>
      )}
    </div>
  );
};
