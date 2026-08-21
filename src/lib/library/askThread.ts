import { z } from "zod";

export type AskStoredMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  parts: unknown[];
};

export type AskThreadListItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
};

export const askStoredMessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(z.unknown()).max(64),
});

export const upsertAskThreadSchema = z.object({
  title: z.string().max(200).optional(),
  model: z.string().trim().min(1).max(120),
  web: z.boolean().optional().default(false),
  messages: z.array(askStoredMessageSchema).min(1).max(80),
});

export function titleFromMessages(messages: AskStoredMessage[]): string {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = textFromParts(message.parts).replace(/\s+/g, " ").trim();
    if (!text) continue;
    return text.length <= 52 ? text : `${text.slice(0, 49).trimEnd()}…`;
  }
  return "Untitled folio";
}

export function previewFromMessages(messages: AskStoredMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = textFromParts(messages[i]?.parts).replace(/\s+/g, " ").trim();
    if (text) return text.length <= 72 ? text : `${text.slice(0, 69).trimEnd()}…`;
  }
  return "";
}

export function asStoredMessages(
  messages: Array<{ id: string; role: AskStoredMessage["role"]; parts: unknown[] }>
): AskStoredMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts,
  }));
}

export function formatFolioWhen(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = now - date.getTime();
  if (diff < 45_000) return "NOW";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}M`;
  if (diff < 18 * 3_600_000) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(" ", "");
  }
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const yday = new Date(day);
  yday.setDate(yday.getDate() - 1);
  if (date >= yday && date < day) return "YDAY";
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function textFromParts(parts: unknown[] | undefined): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part): part is { type: "text"; text: string } => {
      return Boolean(part && typeof part === "object" && (part as { type?: string }).type === "text");
    })
    .map((part) => part.text)
    .join("")
    .trim();
}
