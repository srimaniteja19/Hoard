import { Bookmark, Collection, ContextType, KindMeta, KindType } from "@/types";

export const TYPES: Record<KindType, KindMeta> = {
  ART: { name: "Articles", c: "#00F0FF", fg: "#000", verb: "READ" },
  VID: { name: "Videos", c: "#FF007A", fg: "#fff", verb: "WATCH" },
  PLY: { name: "Playlists", c: "#7C4DFF", fg: "#fff", verb: "LISTEN" },
  GIT: { name: "Repos", c: "#B6FF3C", fg: "#000", verb: "SKIM" },
  APP: { name: "Apps", c: "#FFE600", fg: "#000", verb: "TRY" },
  PPR: { name: "Papers", c: "#FF6B00", fg: "#000", verb: "READ" },
  DOC: { name: "Docs", c: "#00E58A", fg: "#000", verb: "REF" },
};

export const CTX: Record<ContextType, KindType[]> = {
  all: ["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"],
  desk: ["GIT", "DOC", "APP", "PPR", "ART"],
  commute: ["VID", "PLY", "ART"],
  wind: ["VID", "PLY", "ART"],
};

export const COLLS: Collection[] = [
  { id: "all", name: "All bookmarks", ic: "◈", c: "#00F0FF" },
  { id: "unsorted", name: "Unsorted", ic: "?", c: "#FFE600" },
  {
    id: "eng",
    name: "Engineering",
    ic: "E",
    c: "#B6FF3C",
    kids: [
      { id: "eng-dist", name: "Distributed systems", ic: "D", c: "#B6FF3C" },
      { id: "eng-data", name: "Data & storage", ic: "S", c: "#B6FF3C" },
      { id: "eng-infra", name: "Infra & ops", ic: "I", c: "#B6FF3C" },
    ],
  },
  { id: "ai", name: "AI & retrieval", ic: "A", c: "#FF007A" },
  { id: "build", name: "Build hoard", ic: "B", c: "#FF6B00" },
  { id: "listen", name: "Listening", ic: "♪", c: "#7C4DFF" },
];

export const INITIAL_BOOKMARKS: Omit<Bookmark, "id">[] = [
  { t: "How Figma's multiplayer engine works", ty: "ART", src: "figma.com", url: "https://figma.com/blog/how-figmas-multiplayer-technology-works/", mins: 18, tag: "systems", coll: "eng-dist", when: "Aug 1", unread: false, ex: { Words: "4,200", Author: "Evan Wallace" }, note: "Clearest explanation of CRDT trade-offs I've read." },
  { t: "The Grug Brained Developer", ty: "ART", src: "grugbrain.dev", url: "https://grugbrain.dev", mins: 12, tag: "craft", coll: "unsorted", when: "Jul 27", unread: false, ex: { Words: "2,800" }, note: "Send to anyone proposing a fourth abstraction layer." },
  { t: "Exactly-once semantics in Kafka", ty: "ART", src: "confluent.io", url: "https://confluent.io/blog/exactly-once-semantics/", mins: 14, tag: "systems", coll: "eng-dist", when: "Jul 27", unread: true, ex: { Words: "3,100" }, note: "" },
  { t: "Staff engineer archetypes", ty: "ART", src: "staffeng.com", url: "https://staffeng.com/guides/staff-archetypes", mins: 9, tag: "career", coll: "unsorted", when: "Jul 24", unread: true, ex: { Words: "2,000" }, note: "" },
  { t: "Single-table design in DynamoDB", ty: "ART", src: "alexdebrie.com", url: "https://alexdebrie.com/posts/dynamodb-single-table/", mins: 22, tag: "data", coll: "eng-data", when: "Aug 6", unread: true, ex: { Words: "5,400", Author: "Alex DeBrie" }, note: "The access-pattern table near the end is the part worth copying." },
  { t: "Let's build GPT from scratch", ty: "VID", src: "youtube.com", url: "https://youtube.com/watch?v=kCc8FmEb1nY", mins: 116, tag: "ai", coll: "ai", when: "Aug 5", unread: true, ex: { Channel: "A. Karpathy", Runtime: "1:56:20", Chapters: "9" }, note: "Do this with the notebook open, not on the couch." },
  { t: "Building a physics engine from scratch", ty: "VID", src: "youtube.com", url: "https://youtube.com/watch?v=abc", mins: 47, tag: "graphics", coll: "unsorted", when: "Aug 2", unread: true, ex: { Runtime: "47:11" }, note: "" },
  { t: "How the Postgres query planner works", ty: "VID", src: "youtube.com", url: "https://youtube.com/watch?v=def", mins: 38, tag: "data", coll: "eng-data", when: "Jul 30", unread: false, ex: { Channel: "PGConf", Runtime: "38:04" }, note: "The EXPLAIN walkthrough at 22:00 is the payoff." },
  { t: "CSS grid in 8 minutes", ty: "VID", src: "youtube.com", url: "https://youtube.com/watch?v=ghi", mins: 8, tag: "design", coll: "build", when: "Jul 26", unread: false, ex: { Channel: "Kevin Powell", Runtime: "8:12" }, note: "" },
  { t: "Rust in 100 seconds", ty: "VID", src: "youtube.com", url: "https://youtube.com/watch?v=jkl", mins: 2, tag: "languages", coll: "unsorted", when: "Jul 22", unread: false, ex: { Channel: "Fireship", Runtime: "2:14" }, note: "" },
  { t: "What is a vector database, really", ty: "VID", src: "youtube.com", url: "https://youtube.com/watch?v=mno", mins: 16, tag: "ai", coll: "ai", when: "Aug 4", unread: true, ex: { Runtime: "16:40" }, note: "" },
  { t: "Deep focus — no vocals", ty: "PLY", src: "open.spotify.com", url: "https://open.spotify.com/playlist/37i9", mins: 312, tag: "focus", coll: "listen", when: "Jul 12", unread: false, ex: { Tracks: "84", Runtime: "5h 12m" }, note: "Default for anything requiring actual thought." },
  { t: "System design interviews", ty: "PLY", src: "youtube.com", url: "https://youtube.com/playlist?list=xyz", mins: 580, tag: "career", coll: "listen", when: "Jul 19", unread: true, ex: { Videos: "22", Runtime: "9h 40m" }, note: "One per commute rather than binging." },
  { t: "Lo-fi for debugging", ty: "PLY", src: "open.spotify.com", url: "https://open.spotify.com/playlist/2ab", mins: 138, tag: "focus", coll: "listen", when: "Jun 30", unread: false, ex: { Tracks: "40", Runtime: "2h 18m" }, note: "" },
  { t: "shadcn-ui/ui", ty: "GIT", src: "github.com", url: "https://github.com/shadcn-ui/ui", mins: 6, tag: "design", coll: "build", when: "Jul 29", unread: false, ex: { Lang: "TypeScript", Stars: "71.2k", Updated: "2d" }, note: "Copy components, don't install them. Still the right call." },
  { t: "colinhacks/zod", ty: "GIT", src: "github.com", url: "https://github.com/colinhacks/zod", mins: 5, tag: "craft", coll: "build", when: "Jul 21", unread: false, ex: { Lang: "TypeScript", Stars: "34.1k", Updated: "6d" }, note: "" },
  { t: "pgvector/pgvector", ty: "GIT", src: "github.com", url: "https://github.com/pgvector/pgvector", mins: 7, tag: "ai", coll: "ai", when: "Aug 3", unread: true, ex: { Lang: "C", Stars: "12.4k", Updated: "1d" }, note: "Check whether HNSW build time is still the bottleneck at 2M rows." },
  { t: "openai/whisper", ty: "GIT", src: "github.com", url: "https://github.com/openai/whisper", mins: 8, tag: "ai", coll: "ai", when: "Jul 15", unread: false, ex: { Lang: "Python", Stars: "70.8k", Updated: "3w" }, note: "" },
  { t: "nestjs/nest", ty: "GIT", src: "github.com", url: "https://github.com/nestjs/nest", mins: 6, tag: "backend", coll: "build", when: "Jul 11", unread: false, ex: { Lang: "TypeScript", Stars: "66.9k", Updated: "4d" }, note: "" },
  { t: "Raycast", ty: "APP", src: "raycast.com", url: "https://raycast.com", mins: 4, tag: "tools", coll: "build", when: "Aug 6", unread: true, ex: { Platform: "macOS", Price: "Free tier" }, note: "Rebuild the window-management setup on the new laptop." },
  { t: "Excalidraw", ty: "APP", src: "excalidraw.com", url: "https://excalidraw.com", mins: 3, tag: "design", coll: "build", when: "Jul 25", unread: false, ex: { Platform: "Web", Price: "Free" }, note: "" },
  { t: "Warp", ty: "APP", src: "warp.dev", url: "https://warp.dev", mins: 5, tag: "tools", coll: "build", when: "Jul 18", unread: false, ex: { Platform: "macOS", Price: "Free tier" }, note: "" },
  { t: "Accessible palette builder", ty: "APP", src: "uicolors.app", url: "https://uicolors.app", mins: 3, tag: "design", coll: "build", when: "Jul 18", unread: false, ex: { Platform: "Web", Price: "Free" }, note: "" },
  { t: "Attention is all you need", ty: "PPR", src: "arxiv.org", url: "https://arxiv.org/abs/1706.03762", mins: 45, tag: "ai", coll: "ai", when: "Aug 4", unread: false, ex: { Pages: "15", Year: "2017" }, note: "Reread §3.2 before writing the retrieval post." },
  { t: "Retrieval-augmented generation for NLP", ty: "PPR", src: "arxiv.org", url: "https://arxiv.org/abs/2005.11401", mins: 52, tag: "ai", coll: "ai", when: "Jul 31", unread: true, ex: { Pages: "19", Year: "2020" }, note: "" },
  { t: "Prompt caching", ty: "DOC", src: "docs.claude.com", url: "https://docs.claude.com/prompt-caching", mins: 11, tag: "ai", coll: "ai", when: "Jul 24", unread: false, ex: { Section: "Reference" }, note: "Cheapest win available on the summarizer." },
  { t: "Liveness vs readiness probes", ty: "DOC", src: "kubernetes.io", url: "https://kubernetes.io/docs/concepts/probes/", mins: 13, tag: "infra", coll: "eng-infra", when: "Aug 4", unread: false, ex: { Section: "Concepts" }, note: "" },
  { t: "SQS FIFO vs standard queues", ty: "DOC", src: "aws.amazon.com", url: "https://aws.amazon.com/sqs/fifo/", mins: 15, tag: "infra", coll: "eng-infra", when: "Jul 29", unread: true, ex: { Section: "Dev guide" }, note: "Dedup window is 5 min — the thing everyone forgets." },
];
