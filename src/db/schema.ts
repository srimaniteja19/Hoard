import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
  varchar,
  date,
  primaryKey,
  real,
  customType,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { KindType } from "@/types";
import type { AskSaveCitation } from "@/lib/library/askSave";
import type { AskStoredMessage } from "@/lib/library/askThread";

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector(1536)",
  toDriver: (value: number[]) => `[${value.join(",")}]`,
  fromDriver: (value: unknown) => {
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === "string") {
      return value.replace(/^\[|\]$/g, "").split(",").map(Number);
    }
    return [];
  },
});

export type LinkPreview = {
  provider: "YOUTUBE" | "VIMEO" | "SPOTIFY" | "GITHUB" | "ARXIV" | "X" | "GENERIC";
  kind: "video" | "audio" | "repo" | "paper" | "post" | "article";
  url: string;
  canonicalUrl?: string;
  title: string;
  description?: string;
  host: string;
  thumbnailKey?: string;
  durationSec?: number;
  author?: string;
  meta: Record<string, string | number>;
  fetchedAt: string;
  failed?: boolean;
};

export const tilTypeValues = [
  "FACT",
  "GOTCHA",
  "SNIPPET",
  "PATTERN",
  "QUOTE",
  "OPINION",
  "LINK",
] as const;

export type TilType = typeof tilTypeValues[number];

export const tilType = pgEnum("til_type", tilTypeValues);

export const todoEnergyValues = ["DEEP", "SHALLOW", "ERRAND"] as const;
export type TodoEnergy = typeof todoEnergyValues[number];
export const todoEnergy = pgEnum("todo_energy", todoEnergyValues);

export const todoStateValues = ["OPEN", "DONE", "DROPPED", "GRAVEYARD"] as const;
export type TodoState = typeof todoStateValues[number];
export const todoState = pgEnum("todo_state", todoStateValues);

export const itemTypeValues = ["REFERENCE", "QUEUED"] as const;
export type ItemType = typeof itemTypeValues[number];
export const itemType = pgEnum("bookmark_item_type", itemTypeValues);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  timezone: text("timezone").notNull().default("UTC"),
  // Default off, one toggle — TODOS.md §6. Pads new estimates by the user's
  // calibration multiplier for that energy class once 30+ samples exist.
  todoCalibrationPaddingEnabled: boolean("todo_calibration_padding_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📁"),
  color: text("color").notNull().default("#00F0FF"),
  parentId: text("parent_id"),
  query: text("query"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type").$type<KindType>().notNull(),
    source: text("source").notNull(),
    url: text("url").notNull(),
    mins: integer("mins").notNull().default(5),
    tag: text("tag").notNull(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id),
    unread: boolean("unread").notNull().default(true),
    itemType: itemType("item_type").notNull().default("REFERENCE"),
    itemTypeGuessed: boolean("item_type_guessed").notNull().default(false),
    useCount: integer("use_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    note: text("note").notNull().default(""),
    extra: jsonb("extra").$type<Record<string, unknown>>().notNull().default({}),
    parentId: integer("parent_id"),
    startTimeSec: integer("start_time_sec"),
    chapterIndex: integer("chapter_index"),
    archivedText: text("archived_text"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`bookmark_search_vector_immutable(title, archived_text)`
    ),
    lastFetchedAt: timestamp("last_fetched_at"),
    driftStatus: text("drift_status"),
    driftPercent: integer("drift_percent"),
    clusterId: text("cluster_id"),
    clusterTitle: text("cluster_title"),
    coverSource: varchar("cover_source", { length: 12 }),
    ogImageKey: text("og_image_key"),
    ogImageWidth: integer("og_image_width"),
    ogImageHeight: integer("og_image_height"),
    ogDominantColor: varchar("og_dominant_color", { length: 9 }),
    ogLqip: text("og_lqip"),
    ogStatus: varchar("og_status", { length: 12 }).notNull().default("PENDING"),
    ogRejectReason: varchar("og_reject_reason", { length: 40 }),
    faviconKey: text("favicon_key"),
    excerptSource: varchar("excerpt_source", { length: 16 }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_url_idx").on(table.userId, table.url),
    index("user_created_idx").on(table.userId, table.createdAt, table.id),
    index("user_unread_idx").on(table.userId, table.unread),
    index("user_use_count_idx").on(table.userId, table.useCount),
    index("user_last_used_idx").on(table.userId, table.lastUsedAt),
    index("bookmark_search_vector_idx").using("gin", table.searchVector),
    index("bookmark_parent_idx").on(table.parentId),
    index("bookmark_cluster_idx").on(table.clusterId),
  ]
);

// One row per recorded reach. Home's "most reached for" ranks the last 60
// days of these events so lifetime favorites cannot pin the list forever.
export const bookmarkUses = pgTable(
  "bookmark_uses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookmarkId: integer("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bookmark_uses_user_used_idx").on(table.userId, table.usedAt),
    index("bookmark_uses_bookmark_used_idx").on(table.bookmarkId, table.usedAt),
  ]
);

export const embeddings = pgTable(
  "embeddings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    embedding: vector1536("embedding").notNull(),
    model: text("model").notNull(),
    contentHash: text("content_hash").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("embeddings_owner_idx").on(table.ownerType, table.ownerId),
    index("embeddings_user_type_idx").on(table.userId, table.ownerType),
  ]
);

export const favicons = pgTable("favicons", {
  host: text("host").primaryKey(),
  faviconKey: text("favicon_key"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#00F0FF"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_tag_idx").on(table.userId, table.name)]
);

export const tilEntries = pgTable(
  "til_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shortHash: varchar("short_hash", { length: 4 }).notNull(),
    type: tilType("type").notNull().default("FACT"),

    body: text("body"),
    code: text("code"),
    codeLang: varchar("code_lang", { length: 24 }),

    linkUrl: text("link_url"),
    linkPreview: jsonb("link_preview").$type<LinkPreview>(),
    linkDensity: varchar("link_density", { length: 8 }).default("card"),

    dischargesBookmarkId: integer("discharges_bookmark_id").references(
      () => bookmarks.id,
      { onDelete: "set null" }
    ),

    // Supersession — a newer entry marks an older one obsolete
    supersededById: text("superseded_by_id").references(
      (): AnyPgColumn => tilEntries.id,
      { onDelete: "set null" }
    ),

    // Spaced repetition state (SM-2 lite)
    stability: real("stability").notNull().default(1),
    ease: real("ease").notNull().default(2.5),
    reviewCount: integer("review_count").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at"),
    nextReviewAt: timestamp("next_review_at"),

    loggedFor: date("logged_for").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("til_user_logged_for_idx").on(table.userId, table.loggedFor.desc()),
    uniqueIndex("til_user_short_hash_idx").on(table.userId, table.shortHash),
    index("til_user_review_idx").on(table.userId, table.nextReviewAt),
    index("til_superseded_idx").on(table.supersededById),
  ]
);

export const tilEntryTags = pgTable(
  "til_entry_tags",
  {
    tilId: text("til_id")
      .notNull()
      .references(() => tilEntries.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.tilId, table.tagId] })]
);

export const constellationLayouts = pgTable(
  "constellation_layouts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cacheKey: text("cache_key").notNull(),
    positions: jsonb("positions").$type<Record<string, { x: number; y: number }>>().notNull(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("constellation_layouts_user_idx").on(table.userId)]
);

export const extensionTokens = pgTable(
  "extension_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    name: text("name").notNull().default("Chrome Extension"),
    scopes: text("scopes").notNull().default("til:write bookmark:write bookmark:read"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    index("ext_token_user_idx").on(table.userId),
    uniqueIndex("ext_token_hash_idx").on(table.tokenHash),
  ]
);

export const todos = pgTable(
  "todos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    note: text("note"),

    energy: todoEnergy("energy").notNull().default("SHALLOW"),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    actualMinutes: integer("actual_minutes"), // null until completed and answered

    dueDate: date("due_date"), // null = someday
    originalDueDate: date("original_due_date"),
    rolloverCount: integer("rollover_count").notNull().default(0),

    remindAt: timestamp("remind_at", { withTimezone: true }),
    remindSentAt: timestamp("remind_sent_at", { withTimezone: true }),

    recurrenceRule: varchar("recurrence_rule", { length: 64 }),
    recurrenceParentId: text("recurrence_parent_id").references(
      (): AnyPgColumn => todos.id,
      { onDelete: "set null" }
    ),
    seriesPosition: integer("series_position"),

    state: todoState("state").notNull().default("OPEN"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedOn: date("completed_on"), // user-local day, computed server-side — see getLoggedForDate

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("todo_user_due_idx").on(table.userId, table.dueDate),
    index("todo_user_done_idx").on(table.userId, table.completedOn),
    index("todo_reminder_idx")
      .on(table.remindAt)
      .where(sql`${table.remindSentAt} IS NULL AND ${table.state} = 'OPEN'`),
    index("todo_recurrence_parent_idx").on(table.recurrenceParentId),
  ]
);

export const todoSubtasks = pgTable(
  "todo_subtasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    todoId: text("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull(),
  },
  (table) => [index("todo_subtask_todo_idx").on(table.todoId)]
);

export const todoTags = pgTable(
  "todo_tags",
  {
    todoId: text("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.todoId, table.tagId] })]
);

// v1 of the day plan's busy blocks — a recurring weekly template the user
// fills in manually, not a calendar sync (TODOS.md §7: "do not build
// calendar integration in this pass"). dayOfWeek is 0=Sun..6=Sat, matching
// JS Date#getDay().
export const busyBlocks = pgTable(
  "busy_blocks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(), // "HH:mm"
    endTime: varchar("end_time", { length: 5 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("busy_block_user_day_idx").on(table.userId, table.dayOfWeek)]
);

// One optional line per day, prompted at day close — TODOS.md §8: "six
// months later this is the most valuable thing on the page."
export const dayNotes = pgTable(
  "day_notes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(), // user-local day, "YYYY-MM-DD"
    note: text("note").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })]
);

// Records each explicit → push (never a cron — TODOS.md §4) with the day it
// happened, so the history calendar can honestly answer "did anything roll
// on day X" after the fact. rolloverCount on the todo itself is the running
// total; this is the per-day trail that total can't reconstruct on its own.
export const rolloverEvents = pgTable(
  "rollover_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    todoId: text("todo_id")
      .notNull()
      .references(() => todos.id, { onDelete: "cascade" }),
    occurredOn: date("occurred_on").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("rollover_event_user_day_idx").on(table.userId, table.occurredOn)]
);

// Caches the expensive, non-candidate sections of the home edition (HOME.md
// §3) for a user's local day, keyed by a content fingerprint rather than
// explicit invalidation — same pattern as constellation_layouts above: the
// cache is stale (and recomputed) the moment the fingerprint no longer
// matches, instead of hooking into every bookmark/todo/TIL write path.
export const homeEditionCache = pgTable("home_edition_cache", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  cacheKey: text("cache_key").notNull(),
  cachedDate: date("cached_date").notNull(), // user-local day this was computed for
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const askSaves = pgTable(
  "ask_saves",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    summary: text("summary").notNull().default(""),
    citations: jsonb("citations").$type<AskSaveCitation[]>().notNull().default(sql`'[]'::jsonb`),
    model: text("model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("ask_saves_user_created_idx").on(table.userId, table.createdAt.desc())]
);

export const askThreads = pgTable(
  "ask_threads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    model: text("model").notNull().default(""),
    web: boolean("web").notNull().default(false),
    messages: jsonb("messages").$type<AskStoredMessage[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("ask_threads_user_updated_idx").on(table.userId, table.updatedAt.desc())]
);

export const atlasStatusValues = ["draft", "walking", "archived"] as const;
export type AtlasRowStatus = (typeof atlasStatusValues)[number];

export const atlases = pgTable(
  "atlases",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    serial: varchar("serial", { length: 16 }).notNull(),
    title: text("title").notNull(),
    brief: text("brief").notNull().default(""),
    prompt: text("prompt").notNull(),
    depth: text("depth").notNull(),
    cadence: text("cadence").notNull(),
    minutesPerSession: integer("minutes_per_session").notNull(),
    weeksPlanned: integer("weeks_planned").notNull(),
    antiScope: jsonb("anti_scope").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("draft"),
    currentWeekId: text("current_week_id"),
    syllabus: jsonb("syllabus").$type<import("@/lib/atlas/types").AtlasSyllabus>().notNull(),
    model: text("model").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("atlases_user_status_updated_idx").on(table.userId, table.status, table.updatedAt.desc())]
);

export const scrapKindValues = [
  "FRAGMENT",
  "QUESTION",
  "QUOTE",
  "ACTION",
  "RANT",
  "IDEA",
  "LOG",
  "INK",
] as const;
export type ScrapKind = (typeof scrapKindValues)[number];

export const scrapStatusValues = ["raw", "done", "pages", "compost"] as const;
export type ScrapStatus = (typeof scrapStatusValues)[number];

export interface ScrapEntities {
  verb?: string;
  label?: string; // "Film" | "Movement" | "Person" | "Book" | "Food" | "Place" | "Made" | "Game" | "Audio"
  glyph?: string; // "▶" | "◈" | "◉" | "▤" | "◍" | "◆" | "⚒" | "🎮" | "♫" | "·"
  color?: string; // "violet" | "lime" | "pink" | "cyan" | "orange" | "yellow"
  title?: string;
  measure?: string; // "10"
  unit?: string; // "MILES"
  person?: string; // "Sam"
  place?: string; // "Half Moon Bay"
  rating?: string; // "9/10"
  note?: string;
  tally?: string;
  isFirst?: boolean;
  firstLabel?: string; // "FIRST VISIT" | "FIRST TIME IN 6 WEEKS"
  shiftNote?: string; // e.g. "LOGGED SUN · HAPPENED SAT"
  isPlain?: boolean;
  inkSvg?: string;
  inkStrokes?: any[];
  transcription?: string;
  isPinned?: boolean;
  pinnedAt?: string;
  boardX?: number;
  boardY?: number;
}

export const scraps = pgTable(
  "scraps",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    kind: varchar("kind", { length: 32 }).notNull().default("FRAGMENT"),
    color: varchar("color", { length: 32 }).notNull().default("cyan"),
    tilt: varchar("tilt", { length: 16 }).notNull().default("0deg"),
    notes: text("notes").notNull().default(""),
    status: varchar("status", { length: 32 }).notNull().default("raw"),
    statusLabel: varchar("status_label", { length: 64 }).notNull().default("RAW"),
    promotedTo: varchar("promoted_to", { length: 32 }),
    promotedId: text("promoted_id"),
    threadN: integer("thread_n").notNull().default(0),
    threadSummary: text("thread_summary"),
    weldedToId: text("welded_to_id").references(
      (): AnyPgColumn => scraps.id,
      { onDelete: "set null" }
    ),
    loggedFor: date("logged_for").notNull(),
    occurredOn: date("occurred_on"),
    entities: jsonb("entities").$type<ScrapEntities>(),
    tags: jsonb("tags").$type<string[]>().default([]),
    isBuried: boolean("is_buried").notNull().default(false),
    buriedAt: timestamp("buried_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("scraps_user_logged_for_idx").on(table.userId, table.isBuried, table.loggedFor.desc()),
    index("scraps_user_occurred_on_idx").on(table.userId, table.isBuried, table.occurredOn.desc()),
    index("scraps_user_created_idx").on(table.userId, table.isBuried, table.createdAt.desc()),
    index("scraps_user_kind_idx").on(table.userId, table.kind),
  ]
);

export type ScrapRow = typeof scraps.$inferSelect;
export type NewScrapRow = typeof scraps.$inferInsert;

export const scrapAssets = pgTable(
  "scrap_assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scrapId: text("scrap_id").references(
      (): AnyPgColumn => scraps.id,
      { onDelete: "set null" }
    ),
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    data: text("data").notNull(), // Base64 data string
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("scrap_assets_user_created_idx").on(table.userId, table.createdAt.desc()),
    index("scrap_assets_scrap_id_idx").on(table.scrapId),
  ]
);

export type ScrapAssetRow = typeof scrapAssets.$inferSelect;
export type NewScrapAssetRow = typeof scrapAssets.$inferInsert;

export interface PlaybookStep {
  title: string;
  energy: "deep" | "shallow" | "errand";
  optional: boolean;
}

export interface PlaybookRunStep {
  title: string;
  energy: "deep" | "shallow" | "errand";
  optional: boolean;
  done: boolean;
  completedAt?: string;
}

export const playbooks = pgTable(
  "playbooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: varchar("color", { length: 32 }).notNull().default("violet"),
    mode: varchar("mode", { length: 16 }).notNull().default("SEQUENCE"), // "SEQUENCE" | "SET"
    steps: jsonb("steps").$type<PlaybookStep[]>().notNull().default([]),
    defaultVars: jsonb("default_vars").$type<Record<string, string>>().notNull().default({}),
    runsCount: integer("runs_count").notNull().default(0),
    medianDuration: varchar("median_duration", { length: 32 }).notNull().default("30m"),
    keptPercent: integer("kept_percent").notNull().default(80),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("playbooks_user_idx").on(table.userId, table.isArchived),
  ]
);

export type PlaybookRow = typeof playbooks.$inferSelect;
export type NewPlaybookRow = typeof playbooks.$inferInsert;

export const playbookRuns = pgTable(
  "playbook_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playbookId: text("playbook_id").references(
      (): AnyPgColumn => playbooks.id,
      { onDelete: "set null" }
    ),
    runNumber: varchar("run_number", { length: 8 }).notNull(), // e.g. "7F2A"
    title: text("title").notNull(),
    mode: varchar("mode", { length: 16 }).notNull().default("SEQUENCE"),
    color: varchar("color", { length: 32 }).notNull().default("violet"),
    vars: jsonb("vars").$type<Record<string, string>>().notNull().default({}),
    steps: jsonb("steps").$type<PlaybookRunStep[]>().notNull().default([]),
    state: varchar("state", { length: 16 }).notNull().default("LIVE"), // "LIVE" | "KEPT" | "ABANDONED"
    duration: varchar("duration", { length: 32 }),
    dueDate: date("due_date"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("playbook_runs_user_state_idx").on(table.userId, table.state),
    index("playbook_runs_user_due_idx").on(table.userId, table.dueDate),
  ]
);

export type PlaybookRunRow = typeof playbookRuns.$inferSelect;
export type NewPlaybookRunRow = typeof playbookRuns.$inferInsert;

export const savedDigests = pgTable(
  "saved_digests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_video_digest_idx").on(table.userId, table.videoId),
    index("user_digest_url_idx").on(table.userId, table.url),
  ]
);

export type SavedDigestRow = typeof savedDigests.$inferSelect;
export type NewSavedDigestRow = typeof savedDigests.$inferInsert;

export const scratchPostcards = pgTable(
  "scratch_postcards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    weekEnd: date("week_end").notNull(),
    kindTallies: jsonb("kind_tallies").$type<Record<string, number>>().notNull(),
    totalCount: integer("total_count").notNull(),
    daysLogged: integer("days_logged").notNull(),
    previousWeekTotal: integer("previous_week_total").notNull(),
    currentStreak: integer("current_streak").notNull(),
    highlightScrapId: text("highlight_scrap_id").references(
      (): AnyPgColumn => scraps.id,
      { onDelete: "set null" }
    ),
    highlightContent: text("highlight_content"),
    highlightKind: varchar("highlight_kind", { length: 32 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scratch_postcards_user_week_idx").on(table.userId, table.weekStart),
  ]
);

export type ScratchPostcardRow = typeof scratchPostcards.$inferSelect;
export type NewScratchPostcardRow = typeof scratchPostcards.$inferInsert;

export const bookFormatValues = ["AUDIO", "PHYSICAL", "EBOOK", "PRINT"] as const;
export type BookFormat = (typeof bookFormatValues)[number];

export const bookStatusValues = ["READING", "FINISHED", "UNSTARTED", "PAUSED", "WANT_TO_READ"] as const;
export type BookStatus = (typeof bookStatusValues)[number];

export const bookMotifValues = ["arcs", "grid", "strata", "rules", "blocks", "diag"] as const;
export type BookMotif = (typeof bookMotifValues)[number];

export const marginaliaKindValues = ["VERBATIM", "PARAPHRASE", "THOUGHT"] as const;
export type MarginaliaKind = (typeof marginaliaKindValues)[number];

export const books = pgTable(
  "books",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author").notNull(),
    isbn: varchar("isbn", { length: 32 }),
    format: varchar("format", { length: 16 }).notNull().default("AUDIO"),
    accentColor: varchar("accent_color", { length: 16 }).notNull().default("#7B5CF0"),
    fgColor: varchar("fg_color", { length: 16 }).notNull().default("#FFFFFF"),
    motif: varchar("motif", { length: 16 }).notNull().default("arcs"),
    initial: varchar("initial", { length: 8 }).notNull().default("B"),
    totalChapters: integer("total_chapters").notNull().default(1),
    currentChapter: integer("current_chapter").notNull().default(1),
    totalPages: integer("total_pages"),
    currentPage: integer("current_page"),
    audioDuration: varchar("audio_duration", { length: 32 }),
    audioCurrentTime: varchar("audio_current_time", { length: 32 }),
    startedDate: varchar("started_date", { length: 64 }),
    completedDate: varchar("completed_date", { length: 64 }),
    status: varchar("status", { length: 16 }).notNull().default("READING"),
    coverUrl: text("cover_url"),
    coverSource: varchar("cover_source", { length: 32 }).default("HOUSE"),
    customCoverUrl: text("custom_cover_url"),
    notesCount: integer("notes_count").default(0),
    promotedCount: integer("promoted_count").default(0),
    chapters: jsonb("chapters").$type<Array<{ number: number; title: string; page?: number; duration?: string }>>(),
    summary: jsonb("summary").$type<import("@/lib/marginalia/types").BookSummaryData>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("books_user_idx").on(table.userId, table.updatedAt.desc()),
  ]
);

export type BookRow = typeof books.$inferSelect;
export type NewBookRow = typeof books.$inferInsert;

export const marginalia = pgTable(
  "marginalia",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().default("VERBATIM"),
    quote: text("quote"),
    note: text("note"),
    chapter: integer("chapter").notNull().default(1),
    page: integer("page"),
    timestamp: varchar("timestamp", { length: 32 }),
    promotedTo: varchar("promoted_to", { length: 16 }),
    promotedId: text("promoted_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("marginalia_book_user_idx").on(table.bookId, table.userId, table.chapter, table.createdAt.desc()),
    index("marginalia_user_created_idx").on(table.userId, table.createdAt.desc()),
  ]
);

export type MarginaliaRow = typeof marginalia.$inferSelect;
export type NewMarginaliaRow = typeof marginalia.$inferInsert;

export const marginaliaPendingMarks = pgTable(
  "marginalia_pending_marks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    timestamp: varchar("timestamp", { length: 32 }).notNull(),
    chapter: integer("chapter"),
    note: text("note"),
    status: varchar("status", { length: 16 }).notNull().default("PENDING"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("marginalia_pending_book_idx").on(table.bookId, table.userId, table.status, table.createdAt.asc()),
  ]
);

export type MarginaliaPendingMarkRow = typeof marginaliaPendingMarks.$inferSelect;
export type NewMarginaliaPendingMarkRow = typeof marginaliaPendingMarks.$inferInsert;

export const subscriptionCadenceValues = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type SubscriptionCadence = (typeof subscriptionCadenceValues)[number];

export const subscriptionCategoryValues = [
  "SAAS",
  "MEDIA",
  "INFRA",
  "HEALTH",
  "UTILITIES",
  "MEMBERSHIP",
  "OTHER",
] as const;
export type SubscriptionCategory = (typeof subscriptionCategoryValues)[number];

export const subscriptionStatusValues = ["ACTIVE", "PAUSED", "TRIAL", "CANCELLED"] as const;
export type SubscriptionStatus = (typeof subscriptionStatusValues)[number];

export const debtTypeValues = [
  "CREDIT_CARD",
  "STUDENT_LOAN",
  "AUTO_LOAN",
  "MORTGAGE",
  "PERSONAL",
  "MEDICAL",
  "OTHER",
] as const;
export type DebtType = (typeof debtTypeValues)[number];

export const assetCategoryValues = [
  "CASH_CHECKING",
  "HYSA",
  "INVESTMENT",
  "RETIREMENT",
  "REAL_ESTATE",
  "CRYPTO",
  "OTHER",
] as const;
export type AssetCategory = (typeof assetCategoryValues)[number];

export const incomeCadenceValues = ["MONTHLY", "BIWEEKLY", "SEMI_MONTHLY", "WEEKLY", "ANNUAL"] as const;
export type IncomeCadence = (typeof incomeCadenceValues)[number];

export const financialSubscriptions = pgTable(
  "financial_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: real("amount").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    cadence: varchar("cadence", { length: 16 }).notNull().default("MONTHLY"),
    category: varchar("category", { length: 32 }).notNull().default("SAAS"),
    billingDay: integer("billing_day").default(1),
    nextRenewalDate: varchar("next_renewal_date", { length: 64 }),
    status: varchar("status", { length: 16 }).notNull().default("ACTIVE"),
    trialEndsDate: varchar("trial_ends_date", { length: 64 }),
    url: text("url"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("financial_sub_user_status_idx").on(table.userId, table.status, table.updatedAt.desc()),
  ]
);

export type FinancialSubscriptionRow = typeof financialSubscriptions.$inferSelect;
export type NewFinancialSubscriptionRow = typeof financialSubscriptions.$inferInsert;

export const financialDebts = pgTable(
  "financial_debts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    debtType: varchar("debt_type", { length: 32 }).notNull().default("CREDIT_CARD"),
    balance: real("balance").notNull(),
    originalPrincipal: real("original_principal"),
    interestRate: real("interest_rate").notNull(), // APR percentage e.g. 19.99
    minPayment: real("min_payment").notNull(), // Minimum monthly payment
    targetPayment: real("target_payment"),
    dueDay: integer("due_day").default(1),
    lender: text("lender"),
    isPaidOff: boolean("is_paid_off").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("financial_debt_user_idx").on(table.userId, table.isPaidOff, table.interestRate.desc()),
  ]
);

export type FinancialDebtRow = typeof financialDebts.$inferSelect;
export type NewFinancialDebtRow = typeof financialDebts.$inferInsert;

export const financialAssets = pgTable(
  "financial_assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: varchar("category", { length: 32 }).notNull().default("CASH_CHECKING"),
    value: real("value").notNull(),
    institution: text("institution"),
    expectedYield: real("expected_yield"), // APY percentage e.g. 4.5
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("financial_asset_user_idx").on(table.userId, table.category, table.value.desc()),
  ]
);

export type FinancialAssetRow = typeof financialAssets.$inferSelect;
export type NewFinancialAssetRow = typeof financialAssets.$inferInsert;

export const financialIncomes = pgTable(
  "financial_incomes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: real("amount").notNull(),
    cadence: varchar("cadence", { length: 16 }).notNull().default("MONTHLY"),
    category: varchar("category", { length: 32 }).notNull().default("SALARY"),
    isActive: boolean("is_active").notNull().default(true),
    isPreTax: boolean("is_pre_tax").notNull().default(false),
    country: varchar("country", { length: 8 }).default("US"),
    region: varchar("region", { length: 16 }),
    customTaxRate: real("custom_tax_rate"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("financial_income_user_idx").on(table.userId, table.isActive, table.updatedAt.desc()),
  ]
);

export type FinancialIncomeRow = typeof financialIncomes.$inferSelect;
export type NewFinancialIncomeRow = typeof financialIncomes.$inferInsert;

export const financialAudits = pgTable(
  "financial_audits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    analysis: jsonb("analysis").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("financial_audit_user_idx").on(table.userId, table.createdAt.desc()),
  ]
);

export type FinancialAuditRow = typeof financialAudits.$inferSelect;
export type NewFinancialAuditRow = typeof financialAudits.$inferInsert;



