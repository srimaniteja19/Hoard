"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { getPinnedScraps } from "@/lib/scratch/filters";
import { getBoardPosition, getWeldConnections } from "@/lib/scratch/corkboard";
import { ScratchCorkboardCard } from "./ScratchCorkboardCard";
import { ScratchNoteModal } from "./ScratchNoteModal";
import { playSound } from "@/lib/sound";

interface ScratchCorkboardProps {
  scraps: ScrapRow[];
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onTogglePin: (id: string) => Promise<void> | void;
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void> | void;
}

const POSITION_SAVE_DEBOUNCE_MS = 400;
const DRAG_THRESHOLD_PX = 5;

export const ScratchCorkboard: React.FC<ScratchCorkboardProps> = ({
  scraps,
  onUpdateNotes,
  onPromoteTil,
  onTogglePin,
  onUpdatePosition,
}) => {
  const pinnedScraps = useMemo(() => getPinnedScraps(scraps), [scraps]);
  const connections = useMemo(() => getWeldConnections(pinnedScraps), [pinnedScraps]);

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [modalScrap, setModalScrap] = useState<ScrapRow | null>(null);

  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  const resolvePosition = useCallback(
    (scrap: ScrapRow, index: number) => positions[scrap.id] || getBoardPosition(scrap, index),
    [positions]
  );

  const handlePointerDownDrag = useCallback(
    (id: string, e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const scrap = pinnedScraps.find((s) => s.id === id);
      const index = pinnedScraps.findIndex((s) => s.id === id);
      if (!scrap) return;
      const current = resolvePosition(scrap, index);

      didDragRef.current = false;
      dragRef.current = {
        id,
        offsetX: e.clientX - canvasRect.left - current.x,
        offsetY: e.clientY - canvasRect.top - current.y,
        startX: e.clientX,
        startY: e.clientY,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pinnedScraps, resolvePosition]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;

    if (!didDragRef.current) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
        didDragRef.current = true;
      }
    }

    const canvasRect = canvas.getBoundingClientRect();
    const x = Math.max(0, e.clientX - canvasRect.left - drag.offsetX);
    const y = Math.max(0, e.clientY - canvasRect.top - drag.offsetY);
    setPositions((prev) => ({ ...prev, [drag.id]: { x, y } }));
  }, []);

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    const finalPos = positions[drag.id];
    if (!finalPos) return;

    if (saveTimersRef.current[drag.id]) {
      clearTimeout(saveTimersRef.current[drag.id]);
    }
    saveTimersRef.current[drag.id] = setTimeout(() => {
      void onUpdatePosition(drag.id, finalPos.x, finalPos.y);
    }, POSITION_SAVE_DEBOUNCE_MS);
  }, [positions, onUpdatePosition]);

  if (pinnedScraps.length === 0) {
    return (
      <div className="scratch-empty-state">
        <div className="scratch-empty-icon">📌</div>
        <div className="scratch-empty-title">NOTHING PINNED TO THE BOARD YET</div>
        <div className="scratch-empty-desc">
          Click the paperclip 📎 icon on any card in The Shelf to pin it here.
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="corkboard-canvas"
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg className="corkboard-strings" aria-hidden="true">
          {connections.map((conn) => {
            const fromScrap = pinnedScraps.find((s) => s.id === conn.from);
            const toScrap = pinnedScraps.find((s) => s.id === conn.to);
            if (!fromScrap || !toScrap) return null;
            const fromIdx = pinnedScraps.indexOf(fromScrap);
            const toIdx = pinnedScraps.indexOf(toScrap);
            const fromPos = resolvePosition(fromScrap, fromIdx);
            const toPos = resolvePosition(toScrap, toIdx);
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={fromPos.x + 90}
                y1={fromPos.y + 40}
                x2={toPos.x + 90}
                y2={toPos.y + 40}
              />
            );
          })}
        </svg>

        {pinnedScraps.map((scrap, index) => {
          const pos = resolvePosition(scrap, index);
          return (
            <ScratchCorkboardCard
              key={scrap.id}
              scrap={scrap}
              x={pos.x}
              y={pos.y}
              onPointerDownDrag={handlePointerDownDrag}
              onOpen={(s) => {
                if (didDragRef.current) {
                  didDragRef.current = false;
                  return;
                }
                playSound.click();
                setModalScrap(s);
              }}
            />
          );
        })}
      </div>

      {modalScrap && (
        <ScratchNoteModal
          isOpen={Boolean(modalScrap)}
          scrap={modalScrap}
          notes={modalScrap.notes || ""}
          isPinned={true}
          onTogglePin={onTogglePin}
          onUpdateNotes={onUpdateNotes}
          onClose={() => setModalScrap(null)}
          onPromoteTil={onPromoteTil}
        />
      )}
    </>
  );
};
