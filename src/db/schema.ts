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

