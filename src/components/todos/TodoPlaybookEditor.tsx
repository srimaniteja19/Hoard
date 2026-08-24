"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PlaybookRow, PlaybookStep } from "@/db/schema";
import { extractAllVariables } from "@/lib/todos/playbooks";
import { playSound } from "@/lib/sound";

interface TodoPlaybookEditorProps {
  playbook: PlaybookRow | null;
  onSave: (data: {
    id?: string;
    name: string;
    color: string;
    mode: "SEQUENCE" | "SET";
    steps: PlaybookStep[];
    defaultVars: Record<string, string>;
  }) => Promise<void> | void;
  onDuplicate?: (id: string) => Promise<void> | void;
  onArchive?: (id: string) => Promise<void> | void;
  onCancel?: () => void;
}

export const TodoPlaybookEditor: React.FC<TodoPlaybookEditorProps> = ({
  playbook,
  onSave,
  onDuplicate,
  onArchive,
  onCancel,
}) => {
  const [name, setName] = useState(playbook?.name || "New Playbook");
  const [mode, setMode] = useState<"SEQUENCE" | "SET">((playbook?.mode as any) || "SEQUENCE");
  const [color, setColor] = useState(playbook?.color || "violet");
  const [steps, setSteps] = useState<PlaybookStep[]>(
    (playbook?.steps as PlaybookStep[]) || [
      { title: "Step 1", energy: "shallow", optional: false },
      { title: "Step 2", energy: "deep", optional: false },
    ]
  );
  const [defaultVars, setDefaultVars] = useState<Record<string, string>>(
    (playbook?.defaultVars as Record<string, string>) || {}
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (playbook) {
      setName(playbook.name);
      setMode((playbook.mode as any) || "SEQUENCE");
      setColor(playbook.color || "violet");
      setSteps((playbook.steps as PlaybookStep[]) || []);
      setDefaultVars((playbook.defaultVars as Record<string, string>) || {});
    }
  }, [playbook]);

  // Extract variables from current steps
  const detectedKeys = useMemo(() => {
    return extractAllVariables(steps);
  }, [steps]);

  const handleStepTitleChange = (index: number, val: string) => {
    const next = [...steps];
    next[index] = { ...next[index], title: val };
    setSteps(next);
  };

  const handleStepEnergyChange = (index: number, energy: "deep" | "shallow" | "errand") => {
    playSound.click();
    const next = [...steps];
    next[index] = { ...next[index], energy };
    setSteps(next);
  };

  const handleStepOptToggle = (index: number) => {
    playSound.click();
    const next = [...steps];
    next[index] = { ...next[index], optional: !next[index].optional };
    setSteps(next);
  };

  const handleDeleteStep = (index: number) => {
    playSound.bury();
    const next = steps.filter((_, i) => i !== index);
    setSteps(next);
  };

  const handleAddStep = () => {
    playSound.pop();
    setSteps([...steps, { title: "New step", energy: "shallow", optional: false }]);
  };

  const handleDefaultVarChange = (key: string, val: string) => {
    setDefaultVars((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    playSound.promote();
    setSaving(true);
    try {
      await onSave({
        id: playbook?.id,
        name: name.trim(),
        color,
        mode,
        steps,
        defaultVars,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* ── BANNER ── */}
      <div className="ban ban--play">
        <b>Editing · {name}</b>
        <span>BLANKS ARE DETECTED FROM {"{{ }}"} — FILL THEM WHEN YOU ISSUE.</span>
      </div>

      {/* ── EDITOR CARD ── */}
      <div className="editor">
        {/* Editor Header */}
        <div className="editor__h">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playbook Name"
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "2px solid rgba(255,255,255,0.4)",
              color: "#fff",
              fontFamily: "var(--display, inherit)",
              fontWeight: 800,
              fontSize: "clamp(18px, 2.4vw, 24px)",
              outline: "none",
              padding: "2px 0",
              minWidth: "220px",
            }}
          />
          <div className="modes">
            <button
              type="button"
              data-m="SEQUENCE"
              aria-pressed={mode === "SEQUENCE"}
              onClick={() => {
                playSound.click();
                setMode("SEQUENCE");
              }}
            >
              SEQUENCE
            </button>
            <button
              type="button"
              data-m="SET"
              aria-pressed={mode === "SET"}
              onClick={() => {
                playSound.click();
                setMode("SET");
              }}
            >
              SET
            </button>
          </div>
        </div>

        {/* Blanks Detection Bar */}
        <div className="blanks">
          <b>BLANKS DETECTED</b>
          {detectedKeys.length > 0 ? (
            detectedKeys.map((k) => (
              <span key={k} className="bl">
                <em>{"{{" + k + "}}"}</em>
                <input
                  type="text"
                  value={defaultVars[k] || ""}
                  onChange={(e) => handleDefaultVarChange(k, e.target.value)}
                  placeholder="default"
                />
              </span>
            ))
          ) : (
            <span style={{ opacity: 0.45 }}>NONE — THIS PLAY RUNS AS WRITTEN</span>
          )}
        </div>

        {/* Step Rows */}
        <div id="steps">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`srow${step.optional ? " opt" : ""}`}
              data-i={idx}
            >
              <span className="drag">⠿</span>
              <span className="no">{String(idx + 1).padStart(2, "0")}</span>
              <input
                className="t"
                type="text"
                value={step.title}
                onChange={(e) => handleStepTitleChange(idx, e.target.value)}
              />
              <span className="lanes">
                {(["deep", "shallow", "errand"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    data-l={l}
                    aria-pressed={step.energy === l}
                    onClick={() => handleStepEnergyChange(idx, l)}
                  >
                    {l.slice(0, 2).toUpperCase()}
                  </button>
                ))}
              </span>
              <button
                className="optbtn"
                type="button"
                aria-pressed={step.optional}
                onClick={() => handleStepOptToggle(idx)}
                title="Toggle optional step"
              >
                OPT
              </button>
              <button
                className="del"
                type="button"
                onClick={() => handleDeleteStep(idx)}
                title="Delete step"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Editor Footer Actions */}
        <div className="editor__f">
          <button className="add" type="button" onClick={handleAddStep}>
            ＋ ADD A STEP
          </button>
          {playbook && onDuplicate && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onDuplicate(playbook.id);
              }}
            >
              DUPLICATE
            </button>
          )}
          {playbook && onArchive && (
            <button
              type="button"
              onClick={() => {
                playSound.bury();
                onArchive(playbook.id);
              }}
            >
              ARCHIVE
            </button>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel}>
              CANCEL
            </button>
          )}
          <button className="save" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "SAVING..." : "SAVE ✓"}
          </button>
        </div>
      </div>
    </div>
  );
};
