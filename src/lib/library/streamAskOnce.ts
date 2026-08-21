import type { AskShelfItem } from "@/lib/library/askLibrary";
import type { AskModelId } from "@/lib/ai/askModels";

export async function streamAskOnce(options: {
  question: string;
  model: AskModelId;
  onText?: (text: string) => void;
  onShelf?: (shelf: AskShelfItem[]) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; shelf: AskShelfItem[] }> {
  const res = await fetch("/api/library/ask", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      messages: [
        {
          id: "carbon-q",
          role: "user",
          parts: [{ type: "text", text: options.question }],
        },
      ],
    }),
    signal: options.signal,
  });
  if (!res.ok || !res.body) throw new Error("carbon failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let shelf: AskShelfItem[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let json: { type?: string; delta?: string; data?: unknown };
      try {
        json = JSON.parse(payload) as { type?: string; delta?: string; data?: unknown };
      } catch {
        continue;
      }
      if (json.type === "text-delta" && typeof json.delta === "string") {
        text += json.delta;
        options.onText?.(text);
      }
      if (json.type === "data-shelf" && Array.isArray(json.data)) {
        shelf = json.data as AskShelfItem[];
        options.onShelf?.(shelf);
      }
    }
  }

  return { text, shelf };
}
