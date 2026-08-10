/**
 * Cross-reference parsing utilities for TIL entry shortHashes (#a3f9).
 */

/**
 * Regex matching `#a3f9` style 4-character hex shortHashes on word boundaries.
 */
export const HASH_REF_REGEX = /(#[0-9a-fA-F]{4})\b/g;

/**
 * Extracts all 4-hex shortHashes from text (without `#` prefix), returned lowercase.
 */
export function extractShortHashes(text: string): string[] {
  if (!text) return [];
  const matches = text.match(HASH_REF_REGEX);
  if (!matches) return [];
  const set = new Set<string>();
  for (const m of matches) {
    set.add(m.slice(1).toLowerCase());
  }
  return Array.from(set);
}

/**
 * Checks if a string is a 4-hex character shortHash.
 */
export function is4HexHash(hash: string): boolean {
  return /^[0-9a-fA-F]{4}$/.test(hash);
}
