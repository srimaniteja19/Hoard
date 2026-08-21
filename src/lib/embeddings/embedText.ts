import { embed, embedMany } from "ai";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function embedText(text: string): Promise<number[] | null> {
  if (!text.trim()) return null;
  try {
    const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text });
    return embedding;
  } catch (e) {
    console.error("[embedText]", e);
    return null;
  }
}

export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  try {
    const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: texts });
    return embeddings;
  } catch (e) {
    console.error("[embedTexts]", e);
    return texts.map(() => null);
  }
}
