import type { KindType, SearchFilter } from "@/types";

const KIND_ALIASES: Record<string, KindType> = {
  video: "VID",
  videos: "VID",
  article: "ART",
  articles: "ART",
  repo: "GIT",
  repos: "GIT",
  playlist: "PLY",
  app: "APP",
  paper: "PPR",
  docs: "DOC",
  doc: "DOC",
};

export function parseQ(q: string): SearchFilter {
  const f: SearchFilter = { text: [], ty: null, under: null, tag: null, lang: null, unread: false };
  q.toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((tok) => {
      let m: RegExpMatchArray | null;
      if (tok === "is:unread") {
        f.unread = true;
      } else if ((m = tok.match(/^is:(\w+)$/))) {
        f.ty = KIND_ALIASES[m[1]] || null;
      } else if ((m = tok.match(/^under:(\d+)m?$/))) {
        f.under = +m[1];
      } else if ((m = tok.match(/^lang:(\w+)$/))) {
        f.lang = m[1];
      } else if (tok.startsWith("#")) {
        f.tag = tok.slice(1);
      } else {
        f.text.push(tok);
      }
    });
  return f;
}

export type FindHit = {
  id: number;
  title: string;
  url: string;
  ty: KindType;
  src: string;
  tag: string;
  note?: string;
  unread?: boolean;
};

export function hasFindConstraint(filter: SearchFilter): boolean {
  return (
    filter.text.length > 0 ||
    filter.ty != null ||
    Boolean(filter.tag) ||
    filter.unread ||
    filter.under != null ||
    Boolean(filter.lang)
  );
}

/** Same matching the library FIND bar uses: substring text, #tag prefix, is:kind. */
export function matchFindQuery(item: FindHit, query: string): boolean {
  const filter = parseQ(query);
  if (!hasFindConstraint(filter)) return false;
  if (filter.ty && item.ty !== filter.ty) return false;
  if (filter.tag && !item.tag.toLowerCase().startsWith(filter.tag)) return false;
  if (filter.unread && !item.unread) return false;
  if (filter.text.length) {
    const hay = `${item.title} ${item.src} ${item.tag} ${item.note ?? ""}`.toLowerCase();
    if (!filter.text.every((token) => hay.includes(token))) return false;
  }
  return true;
}

export function filterFindHits(items: FindHit[], query: string, limit = 20): FindHit[] {
  const q = query.trim();
  if (!q) return [];
  return items.filter((item) => matchFindQuery(item, q)).slice(0, limit);
}
