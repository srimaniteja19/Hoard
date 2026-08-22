"use client";

import React from "react";
import { LinkPreview } from "@/db/schema";
import { Globe, ExternalLink, Clock } from "lucide-react";

interface GenericEmbedProps {
  preview: LinkPreview;
  density: "inline" | "card" | "quote" | "full";
}

export const GenericEmbed: React.FC<GenericEmbedProps> = ({ preview, density }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const readMins = (preview.meta?.readMins as number) || (preview.durationSec ? Math.ceil(preview.durationSec / 60) : undefined);

  if (density === "inline") {
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: "var(--mono)",
          fontSize: "11px",
          fontWeight: 800,
          background: "var(--paper)",
          color: "var(--ink)",
          border: "1px solid var(--ink)",
          padding: "2px 6px",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          textDecoration: "none",
          boxShadow: "1px 1px 0 var(--ink)",
        }}
      >
        <Globe size={12} /> {preview.title}
      </a>
    );
  }

  const showThumb = !!preview.thumbnailKey && !imgFailed;

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--yel) 6%, var(--paper))",
        border: "1.5px solid var(--ink)",
        boxShadow: "2px 2px 0 var(--ink)",
        padding: "12px 14px",
        marginTop: "10px",
        marginBottom: "10px",
        borderLeft: "6px solid var(--yel)",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: "var(--yel)",
              color: "#000",
              border: "1px solid var(--ink)",
              padding: "1.5px 6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "1px 1px 0 var(--ink)",
              textTransform: "lowercase",
            }}
          >
            <Globe size={11} /> {preview.host}
          </span>

          {readMins && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9.5px",
                fontWeight: 800,
                background: "var(--ink)",
                color: "var(--cream)",
                padding: "1.5px 5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Clock size={10} /> {readMins} MIN READ
            </span>
          )}
        </div>

        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "10px",
            fontWeight: 900,
            color: "var(--ink)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            padding: "2px 6px",
            border: "1px solid var(--ink)",
            background: "var(--paper)",
            boxShadow: "1px 1px 0 var(--ink)",
          }}
        >
          VISIT LINK <ExternalLink size={10} />
        </a>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 900, color: "var(--ink)", marginBottom: "4px", lineHeight: "1.4" }}>
            {preview.title}
          </div>

          {preview.description && (
            <div style={{ fontSize: "12px", opacity: 0.85, color: "var(--ink)", lineHeight: "1.45" }}>
              {preview.description}
            </div>
          )}
        </div>

        {showThumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.thumbnailKey}
            alt=""
            onError={() => setImgFailed(true)}
            style={{
              width: "95px",
              height: "68px",
              objectFit: "cover",
              border: "1.5px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
};
