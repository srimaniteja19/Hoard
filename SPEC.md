# HOARD — Production Architecture Specification

A high-performance, neo-brutalist bookmark manager built on **Next.js 15+ (App Router)**, **TypeScript**, **Drizzle ORM**, **Better Auth**, and **PostgreSQL (Neon)**.

---

## 1. Core Architectural Strategy

### Signin-Only Single-Tenant with Multi-Tenant Prepared Schema
- **Multi-Tenancy Foundation**: Every table (`bookmarks`, `collections`, `tags`) includes a mandatory `userId` foreign key.
- **Cheap Insurance**: Keeps zero isolation surface area in initial deployments while ensuring adding open signup later requires zero database schema migrations or data refactoring.
- **Scoped Uniqueness**: URLs are unique per user: `@@unique([userId, url])`.

---

## 2. Database Schema (Drizzle ORM + PostgreSQL)

### `users` Table
```ts
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### `collections` Table
```ts
export const collections = pgTable("collections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📁"),
  color: text("color").notNull().default("#00F0FF"),
  parentId: text("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### `bookmarks` Table
```ts
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").$type<KindType>().notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  mins: integer("mins").notNull().default(5),
  tag: text("tag").notNull(),
  collectionId: text("collection_id").notNull().references(() => collections.id),
  unread: boolean("unread").notNull().default(true),
  note: text("note").notNull().default(""),
  extra: jsonb("extra").$type<Record<string, string>>().notNull().default({}),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_url_idx").on(table.userId, table.url),
  index("user_created_idx").on(table.userId, table.createdAt, table.id),
  index("user_unread_idx").on(table.userId, table.unread),
]);
```

### `tags` Table
```ts
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#00F0FF"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_tag_idx").on(table.userId, table.name),
]);
```

---

## 3. Data-Access Layer (DAL)

All database queries pass through a centralized Data Access Layer (`src/lib/dal/`) to guarantee strict tenant isolation. No UI component or Server Action executes raw queries directly.

### Centralized Functions
- `getBookmarks(userId: string, filters: BookmarkFilters, cursor?: string, limit?: number)`
- `addBookmark(userId: string, data: NewBookmarkInput)`
- `updateBookmark(userId: string, bookmarkId: number, data: Partial<BookmarkInput>)`
- `softDeleteBookmark(userId: string, bookmarkId: number)`
- `getCollections(userId: string)`
- `addCollection(userId: string, data: NewCollectionInput)`
- `exportUserData(userId: string)`

---

## 4. Security — SSRF Guard Engine

When fetching metadata for user-supplied URLs, the enrichment service executes a 5-layer SSRF Guard (`src/lib/security/ssrfGuard.ts`):

1. **Protocol Allowlist**: Only `http:` and `https:` schemes are permitted.
2. **DNS Pre-Resolution Verification**: Resolves domain IP addresses before initiating HTTP connections.
3. **Private IP Range Blocking**: Rejects IP targets in:
   - `10.0.0.0/8`
   - `172.16.0.0/12`
   - `192.168.0.0/16`
   - `127.0.0.0/8` (Loopback)
   - `169.254.0.0/16` (AWS/Cloud Link-Local Metadata)
   - `::1`, `fc00::/7` (IPv6 Local)
4. **Manual Redirect Inspection**: Intercepts 3xx redirects and re-validates each destination hop against DNS range blocks.
5. **Payload Size & Timeout Caps**: Hard timeout of 5000ms and response body stream cutoff at 5MB (`5 * 1024 * 1024` bytes).

---

## 5. Security & Rate Limiting

- **Rate Limiting**: Per-user save rate limiting (`10 saves/min`).
- **Security Headers**: Custom CSP rules, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Server Action Validation**: Session verification on every Server Action invocation.

---

## 6. Export & Import Service

- **JSON & CSV Export**: One-click user library export (`/api/export`) generating a complete JSON package of bookmarks, collections, notes, metadata, and tags.
- **GDPR Compliance & Trust**: Instant data portability.

---

## 7. Implementation Phase Order

1. **Schema & Drizzle Setup**: Drizzle ORM config, PostgreSQL client, migrations, schema definitions with `userId`.
2. **SSRF Guard Engine**: Safe metadata fetcher with IP blocklists and redirect hops validation.
3. **Data-Access Layer (DAL)**: Isolated data query handlers (`getBookmarks`, `addBookmark`, `addCollection`).
4. **Better-Auth & Session Provider**: Better Auth setup, OAuth provider configuration, session contexts.
5. **UI & Server Actions Integration**: Wire components to Server Actions and dynamic DAL queries.
6. **Data Export & Soft Delete**: Export JSON endpoint and soft deletion purge logic.
