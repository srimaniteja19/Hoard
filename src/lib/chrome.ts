export function pageLabelFromPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "HOME";
  if (path === "/ask" || path.startsWith("/ask/") || path === "/library/ask") return "ASK";
  if (path === "/library" || path.startsWith("/library/")) return "LIBRARY";
  if (path === "/todos/history" || path.startsWith("/todos/history/")) return "HISTORY";
  if (path === "/todos" || path.startsWith("/todos/")) return "TODOS";
  if (path === "/til" || path.startsWith("/til/")) return "TIL";
  if (path === "/stats" || path.startsWith("/stats/")) return "STATS";
  if (path === "/settings" || path.startsWith("/settings/")) return "SETTINGS";
  return "HOARD";
}
