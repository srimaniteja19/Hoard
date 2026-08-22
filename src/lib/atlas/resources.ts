import type { AtlasResource, AtlasResourceKind, AtlasSyllabus } from "./types";

export function classifyResourceKind(href: string): AtlasResourceKind {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "video";
  } catch {
    // fall through
  }
  return "article";
}

export function pickStationResources(hits: Array<{ title: string; href: string }>): AtlasResource[] {
  const seen = new Set<string>();
  const valid: AtlasResource[] = [];
  for (const hit of hits) {
    const href = hit.href.trim();
    const title = hit.title.trim();
    if (!title || !href.startsWith("https://") || seen.has(href)) continue;
    seen.add(href);
    valid.push({ title, href, kind: classifyResourceKind(href) });
  }

  const videos = valid.filter((item) => item.kind === "video");
  const articles = valid.filter((item) => item.kind === "article");
  if (videos.length > 0 && articles.length > 0) {
    return [videos[0]!, ...articles.slice(0, 2)].slice(0, 3);
  }
  return valid.slice(0, 3);
}

export function stationsNeedingResources<T extends { resources?: AtlasResource[] }>(stations: T[]): T[] {
  return stations.filter((station) => !station.resources?.length);
}

export function resourceSearchQuery(coverTitle: string, station: { title: string; why: string }): string {
  return `${coverTitle}: ${station.title} — ${station.why}`;
}

export function applyStationResources(
  syllabus: AtlasSyllabus,
  stationId: string,
  resources: AtlasResource[],
): AtlasSyllabus | null {
  const index = syllabus.stations.findIndex((station) => station.id === stationId);
  if (index === -1) return null;
  const stations = syllabus.stations.slice();
  stations[index] = { ...stations[index]!, resources };
  return { ...syllabus, stations };
}
