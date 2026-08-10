import { Bookmark, Collection, ContextType, KindMeta, KindType } from "@/types";

export const TYPES: Record<KindType, KindMeta> = {
  ART: { name: "Articles", c: "#00F0FF", fg: "#000", verb: "READ", icon: "📰" },
  VID: { name: "Videos", c: "#FF007A", fg: "#fff", verb: "WATCH", icon: "🎬" },
  PLY: { name: "Playlists", c: "#7C4DFF", fg: "#fff", verb: "LISTEN", icon: "🎧" },
  GIT: { name: "Repos", c: "#B6FF3C", fg: "#000", verb: "SKIM", icon: "📦" },
  APP: { name: "Apps", c: "#FFE600", fg: "#000", verb: "TRY", icon: "⚡" },
  PPR: { name: "Papers", c: "#FF6B00", fg: "#000", verb: "READ", icon: "📑" },
  DOC: { name: "Docs", c: "#00E58A", fg: "#000", verb: "REF", icon: "📚" },
};

export const CTX: Record<ContextType, KindType[]> = {
  all: ["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"],
  desk: ["GIT", "DOC", "APP", "PPR", "ART"],
  commute: ["VID", "PLY", "ART"],
  wind: ["VID", "PLY", "ART"],
};

export const COLLS: Collection[] = [];

export const INITIAL_BOOKMARKS: Omit<Bookmark, "id">[] = [];
