export function pageLabelFromPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "HOME";
  if (path === "/ask" || path.startsWith("/ask/") || path === "/library/ask") return "ASK";
  if (path === "/library" || path.startsWith("/library/")) return "LIBRARY";
  if (path === "/notebooks" || path.startsWith("/notebooks/")) return "NOTEBOOKS";
  if (path === "/marginalia" || path.startsWith("/marginalia/")) return "MARGINALIA";
  if (path === "/scratch" || path.startsWith("/scratch/")) return "SCRATCH";
  if (path === "/todos/history" || path.startsWith("/todos/history/")) return "HISTORY";
  if (path === "/todos" || path.startsWith("/todos/")) return "TODOS";
  if (path === "/atlas" || path.startsWith("/atlas/")) return "ATLAS";
  if (path === "/summarizer" || path.startsWith("/summarizer/") || path === "/digest" || path.startsWith("/digest/")) return "DIGEST";
  if (path === "/til" || path.startsWith("/til/")) return "TIL";
  if (path === "/ledger" || path.startsWith("/ledger/")) return "LEDGER";
  if (path === "/stats" || path.startsWith("/stats/")) return "STATS";
  if (path === "/settings" || path.startsWith("/settings/")) return "SETTINGS";
  return "HOARD";
}
