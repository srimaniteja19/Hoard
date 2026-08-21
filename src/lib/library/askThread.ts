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

export function messagePlainText(message: AskStoredMessage): string {
  return textFromParts(message.parts).replace(/\s+/g, " ").trim();
}

export function firstRoleText(messages: AskStoredMessage[], role: AskStoredMessage["role"]): string {
  for (const message of messages) {
    if (message.role !== role) continue;
    const text = messagePlainText(message);
    if (text) return text;
  }
  return "";
}

export function clipFolioText(text: string, max = 400): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export function cleanFolioTitle(raw: string, fallback = "Untitled folio"): string {
  const line = raw
    .split("\n")[0]
    .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "")
    .replace(/^\s*title\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
  if (!line) return fallback;
  return line.length <= 52 ? line : `${line.slice(0, 49).trimEnd()}…`;
}

export function titleFromMessages(messages: AskStoredMessage[]): string {
  const text = firstRoleText(messages, "user");
  if (!text) return "Untitled folio";
  return text.length <= 52 ? text : `${text.slice(0, 49).trimEnd()}…`;
}

export function needsFolioName(existingTitle: string | null | undefined, messages: AskStoredMessage[]): boolean {
  const answer = firstRoleText(messages, "assistant");
  if (answer.length < 60 && !/^##\s*summary\b/i.test(answer)) return false;
  const snippet = titleFromMessages(messages);
  const title = (existingTitle ?? "").replace(/\s+/g, " ").trim();
  if (!title || title === "Untitled folio") return true;
  if (title === snippet) return true;
  if (snippet.endsWith("…")) {
    const stem = snippet.slice(0, -1).trimEnd();
    if (stem && title === stem) return true;
  }
  return false;
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
