import crypto from "crypto";

const ARCHIVED_TEXT_LIMIT = 8000;

export function buildEmbeddingText(input: {
  title: string;
  note?: string | null;
  archivedText?: string | null;
}): string {
  const body = (input.archivedText ?? "").slice(0, ARCHIVED_TEXT_LIMIT);
  return [input.title, input.note ?? "", body].join("\n");
}

export function hashEmbeddingText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
