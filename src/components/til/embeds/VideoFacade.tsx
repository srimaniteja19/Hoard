"use client";

import React, { useState } from "react";
import { Play, Clock, Film } from "lucide-react";

interface VideoFacadeProps {
  embedUrl: string; // iframe URL to mount on click
  title: string;
  author?: string;
  durationSec?: number;
  providerName: "YOUTUBE" | "VIMEO" | "GENERIC";
}

export const VideoFacade: React.FC<VideoFacadeProps> = ({
  embedUrl,
  title,
  author,
  durationSec,
  providerName,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  const formatDuration = (sec?: number) => {
    if (!sec) return undefined;
    const mins = Math.floor(sec / 60);
    const remainderSec = sec % 60;
    return `${mins}:${String(remainderSec).padStart(2, "0")}`;
  };

  const formattedDuration = formatDuration(durationSec);

  if (isMounted) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "56.25%", // 16:9 ratio
          background: "#000",
          border: "var(--bd)",
          boxShadow: "var(--sh)",
        }}
      >
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>
    );
  }

  const stageColor = providerName === "YOUTUBE" ? "#FF007A" : "#00F0FF";

  return (
    <div
      onClick={() => setIsMounted(true)}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: "56.25%", // 16:9 ratio
        background: `linear-gradient(135deg, ${stageColor} 0%, #111 100%)`,
        border: "var(--bd)",
        boxShadow: "var(--sh)",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      {/* Facade Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#FFF",
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* Top Header Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 900,
              background: stageColor,
              color: "#000",
              border: "1px solid #000",
              padding: "2px 6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Film size={12} /> {providerName} VIDEO
          </span>

          {formattedDuration && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 900,
                background: "#000",
                color: "#FFE600",
                border: "1px solid #FFE600",
                padding: "2px 6px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Clock size={11} /> {formattedDuration}
            </span>
          )}
        </div>

        {/* Center Big Play Button */}
        <div
          style={{
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#FFE600",
            color: "#000",
            border: "3px solid #000",
            padding: "10px 20px",
            boxShadow: "4px 4px 0 #000",
            fontFamily: "var(--mono)",
            fontWeight: 900,
            fontSize: "13px",
            transition: "transform 0.1s ease",
          }}
        >
          <Play size={20} fill="#000" /> PLAY VIDEO
        </div>

        {/* Bottom Title Bar */}
        <div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "13px",
              fontWeight: 900,
              color: "#FFF",
              textShadow: "1px 1px 2px #000",
              lineHeight: "1.3",
            }}
          >
            {title}
          </div>
          {author && (
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>
              By {author}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
