import { db } from "@/db";
import {
  readerIssues,
  readerKeeps,
  readerSenders,
  bookmarks,
  collections,
  tilEntries,
  NewReaderIssueRow,
  NewReaderKeepRow,
  NewReaderSenderRow,
} from "@/db/schema";
import { eq, and, desc, sql, inArray, isNull } from "drizzle-orm";
import {
  ReaderBlock,
  ReaderDensity,
  ReaderIssue,
  ReaderKeep,
  ReaderSender,
  ReaderCategoryKey,
} from "@/types/reader";
import { deriveIssueStatus } from "@/lib/reader/parser";
import { generateShortHash } from "@/lib/dal/til";

async function ensureCollection(userId: string, collSlug = "stacks"): Promise<string> {
  const [existing] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.id, collSlug)))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(collections)
    .values({
      id: collSlug,
      userId,
      name: "Stacks",
      icon: "📚",
      color: "#FFE94A",
    })
    .onConflictDoNothing()
    .returning({ id: collections.id });

  return created ? created.id : collSlug;
}

export async function getReaderIssues(userId: string): Promise<ReaderIssue[]> {
  await seedReaderIfEmpty(userId);

  const issueRows = await db
    .select()
    .from(readerIssues)
    .where(and(eq(readerIssues.userId, userId), isNull(readerIssues.deletedAt)))
    .orderBy(desc(readerIssues.arrivedAt));

  if (issueRows.length === 0) return [];

  const issueIds = issueRows.map((r) => r.id);
  const keepsRows = await db
    .select()
    .from(readerKeeps)
    .where(and(eq(readerKeeps.userId, userId), inArray(readerKeeps.issueId, issueIds)))
    .orderBy(desc(readerKeeps.createdAt));

  const keepsMap = new Map<string, ReaderKeep[]>();
  for (const k of keepsRows) {
    if (!k.issueId) continue;
    const arr = keepsMap.get(k.issueId) || [];
    arr.push({
      id: k.id,
      issueId: k.issueId,
      userId: k.userId,
      kind: k.kind,
      quote: k.quote,
      reason: k.reason,
      sourceName: k.sourceName || "",
      sourceUrl: k.sourceUrl,
      color: k.color,
      createdAt: k.createdAt.toISOString(),
    });
    keepsMap.set(k.issueId, arr);
  }

  return issueRows.map((row) => {
    const keeps = keepsMap.get(row.id) || [];
    const derivedStatus = deriveIssueStatus({
      closedAt: row.closedAt,
      keeps,
      keptCount: row.keptCount,
      density: row.density,
      currentStatus: row.status,
    });

    return {
      id: row.id,
      userId: row.userId,
      messageId: row.messageId,
      sender: row.sender,
      senderId: row.senderId,
      subject: row.subject,
      dek: row.dek,
      category: row.category as ReaderCategoryKey,
      categoryConfidence: row.categoryConfidence,
      arrivedAt: row.arrivedAt.toISOString(),
      closedAt: row.closedAt ? row.closedAt.toISOString() : null,
      density: (row.density as ReaderDensity) || null,
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
      wordCount: row.wordCount,
      readMinutes: row.readMinutes,
      bodyBlocks: row.bodyBlocks as ReaderBlock[] | null,
      links: row.links || [],
      status: derivedStatus,
      keptCount: row.keptCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      keeps,
    };
  });
}

export async function getReaderIssueById(
  userId: string,
  issueId: string
): Promise<ReaderIssue | null> {
  const [row] = await db
    .select()
    .from(readerIssues)
    .where(and(eq(readerIssues.userId, userId), eq(readerIssues.id, issueId)))
    .limit(1);

  if (!row) return null;

  const keepsRows = await db
    .select()
    .from(readerKeeps)
    .where(and(eq(readerKeeps.userId, userId), eq(readerKeeps.issueId, issueId)))
    .orderBy(desc(readerKeeps.createdAt));

  const keeps: ReaderKeep[] = keepsRows.map((k) => ({
    id: k.id,
    issueId: k.issueId,
    userId: k.userId,
    kind: k.kind,
    quote: k.quote,
    reason: k.reason,
    sourceName: k.sourceName || "",
    sourceUrl: k.sourceUrl,
    color: k.color,
    createdAt: k.createdAt.toISOString(),
  }));

  const derivedStatus = deriveIssueStatus({
    closedAt: row.closedAt,
    keeps,
    keptCount: row.keptCount,
    density: row.density,
    currentStatus: row.status,
  });

  return {
    id: row.id,
    userId: row.userId,
    messageId: row.messageId,
    sender: row.sender,
    senderId: row.senderId,
    subject: row.subject,
    dek: row.dek,
    category: row.category as ReaderCategoryKey,
    categoryConfidence: row.categoryConfidence,
    arrivedAt: row.arrivedAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    density: (row.density as ReaderDensity) || null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    wordCount: row.wordCount,
    readMinutes: row.readMinutes,
    bodyBlocks: row.bodyBlocks as ReaderBlock[] | null,
    links: row.links || [],
    status: derivedStatus,
    keptCount: row.keptCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    keeps,
  };
}

export async function closeReaderIssue(
  userId: string,
  issueId: string,
  density: ReaderDensity = "read"
): Promise<ReaderIssue | null> {
  const issue = await getReaderIssueById(userId, issueId);
  if (!issue) return null;

  const now = new Date();
  const newStatus = deriveIssueStatus({
    closedAt: now,
    keptCount: issue.keptCount,
    density,
    wasClosed: true,
  });

  const [updated] = await db
    .update(readerIssues)
    .set({
      closedAt: now,
      density,
      status: newStatus,
      updatedAt: now,
    })
    .where(and(eq(readerIssues.userId, userId), eq(readerIssues.id, issueId)))
    .returning();

  if (!updated) return null;
  return getReaderIssueById(userId, issueId);
}

export async function dropReaderIssue(
  userId: string,
  issueId: string
): Promise<boolean> {
  const now = new Date();
  const [updated] = await db
    .update(readerIssues)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(eq(readerIssues.userId, userId), eq(readerIssues.id, issueId)))
    .returning({ id: readerIssues.id });

  return Boolean(updated);
}

export async function createReaderKeep(
  userId: string,
  data: {
    issueId: string;
    kind: "CLAIM" | "LINK" | "FIGURE";
    quote?: string | null;
    reason: string;
    sourceName?: string;
    sourceUrl?: string | null;
    color?: string | null;
    linkUrl?: string | null;
  }
): Promise<ReaderKeep> {
  // Snapshot sender & arrival date into sourceName if not explicitly passed
  let sourceName = data.sourceName || "";
  let sourceUrl = data.sourceUrl || data.linkUrl || null;

  const [issue] = await db
    .select({ sender: readerIssues.sender, arrivedAt: readerIssues.arrivedAt })
    .from(readerIssues)
    .where(eq(readerIssues.id, data.issueId))
    .limit(1);

  if (!sourceName && issue) {
    const d = new Date(issue.arrivedAt);
    const dateFormatted = d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    sourceName = `${issue.sender} · ${dateFormatted}`;
  }

  const keepId = crypto.randomUUID();
  const [created] = await db
    .insert(readerKeeps)
    .values({
      id: keepId,
      issueId: data.issueId,
      userId,
      kind: data.kind,
      quote: data.quote || null, // SNAPSHOT string, not a pointer
      reason: data.reason,
      sourceName,
      sourceUrl,
      color: data.color || null,
    })
    .returning();

  // Increment keptCount and set status to 'kept'
  await db
    .update(readerIssues)
    .set({
      keptCount: sql`${readerIssues.keptCount} + 1`,
      status: "kept",
      updatedAt: new Date(),
    })
    .where(eq(readerIssues.id, data.issueId));

  // If kind === 'LINK', push candidate to Stacks (bookmarks table)
  if (data.kind === "LINK" && data.reason) {
    try {
      const collId = await ensureCollection(userId, "stacks");
      const linkTitle = data.quote || data.reason;
      const targetUrl = data.linkUrl || `https://saved-link.hoard/${encodeURIComponent(linkTitle)}`;
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db
        .insert(bookmarks)
        .values({
          userId,
          title: linkTitle,
          type: "ART",
          source: "READER",
          url: targetUrl,
          mins: 5,
          tag: "candidate",
          collectionId: collId,
          unread: true,
          itemType: "QUEUED",
          itemTypeGuessed: false,
          note: data.reason,
          extra: {
            candidate: true,
            expiresAt: sevenDaysFromNow.toISOString(),
            whyLine: data.reason,
            sourceIssueId: data.issueId,
          },
        })
        .onConflictDoNothing();
    } catch (e) {
      console.error("Failed to queue link in Stacks:", e);
    }
  }

  return {
    id: created.id,
    issueId: created.issueId,
    userId: created.userId,
    kind: created.kind,
    quote: created.quote,
    reason: created.reason,
    sourceName: created.sourceName,
    sourceUrl: created.sourceUrl,
    color: created.color,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deleteReaderKeep(userId: string, keepId: string): Promise<boolean> {
  const [keep] = await db
    .select({ issueId: readerKeeps.issueId })
    .from(readerKeeps)
    .where(and(eq(readerKeeps.userId, userId), eq(readerKeeps.id, keepId)))
    .limit(1);

  if (!keep) return false;

  await db
    .delete(readerKeeps)
    .where(and(eq(readerKeeps.userId, userId), eq(readerKeeps.id, keepId)));

  if (!keep.issueId) return true;

  // Recalculate keptCount
  const remainingKeeps = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(readerKeeps)
    .where(and(eq(readerKeeps.userId, userId), eq(readerKeeps.issueId, keep.issueId)));

  const count = remainingKeeps[0]?.count || 0;
  await db
    .update(readerIssues)
    .set({
      keptCount: count,
      status: count > 0 ? "kept" : "nothing",
      updatedAt: new Date(),
    })
    .where(and(eq(readerIssues.userId, userId), eq(readerIssues.id, keep.issueId)));

  return true;
}

export async function getReaderSenders(userId: string): Promise<ReaderSender[]> {
  const rows = await db
    .select({
      sender: readerIssues.sender,
      issueCount: sql<number>`count(*)::int`,
      keptCount: sql<number>`sum(case when ${readerIssues.keptCount} > 0 then 1 else 0 end)::int`,
    })
    .from(readerIssues)
    .where(eq(readerIssues.userId, userId))
    .groupBy(readerIssues.sender)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r, i) => ({
    id: `sender-${i}`,
    userId,
    name: r.sender,
    issueCount: r.issueCount,
    hasKept: (r.keptCount || 0) > 0,
  }));
}

export async function fileAllSessionKeeps(
  userId: string,
  sessionIssueIds: string[]
): Promise<{ tilCount: number; stacksCount: number }> {
  if (!sessionIssueIds.length) return { tilCount: 0, stacksCount: 0 };

  const keeps = await db
    .select({
      keep: readerKeeps,
      issue: readerIssues,
    })
    .from(readerKeeps)
    .innerJoin(readerIssues, eq(readerKeeps.issueId, readerIssues.id))
    .where(
      and(
        eq(readerKeeps.userId, userId),
        inArray(readerKeeps.issueId, sessionIssueIds)
      )
    );

  let tilCount = 0;
  let stacksCount = 0;

  const todayStr = new Date().toISOString().split("T")[0];

  for (const { keep, issue } of keeps) {
    if (keep.kind === "CLAIM") {
      try {
        const shortHash = await generateShortHash(userId);
        const tilBody = keep.quote
          ? `“${keep.quote}”\n\n${keep.reason} — via ${issue.sender}`
          : `${keep.reason} — via ${issue.sender}`;

        await db.insert(tilEntries).values({
          id: crypto.randomUUID(),
          userId,
          shortHash,
          type: "FACT",
          body: tilBody,
          loggedFor: todayStr,
        });
        tilCount++;
      } catch (e) {
        console.error("Error filing TIL claim:", e);
      }
    } else if (keep.kind === "LINK") {
      stacksCount++;
    }
  }

  return { tilCount, stacksCount };
}

/**
 * Seeds the full realistic dataset from the HTML prototype
 */
export async function seedReaderIfEmpty(userId: string): Promise<void> {
  const existing = await db
    .select({ id: readerIssues.id })
    .from(readerIssues)
    .where(eq(readerIssues.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  const now = new Date();
  const today = (hoursAgo = 0, minsAgo = 0) => {
    const d = new Date(now);
    d.setHours(d.getHours() - hoursAgo);
    d.setMinutes(d.getMinutes() - minsAgo);
    return d;
  };

  const yesterday = (hoursAgo = 24) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(d.getHours() - hoursAgo);
    return d;
  };

  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  const seedIssues: Array<{
    sender: string;
    subject: string;
    dek: string;
    category: ReaderCategoryKey;
    categoryConfidence: number;
    arrivedAt: Date;
    readMinutes: number;
    wordCount: number;
    status: "unread" | "skimmed" | "kept" | "nothing";
    keptCount: number;
    links: Array<{ title: string; source: string; url?: string }>;
    bodyBlocks: ReaderBlock[] | null;
  }> = [
    {
      sender: "ByteByteGo",
      subject: "How smart model routing can cut LLM costs by 10x",
      dek: "Cost reduction isn't a given. It depends on the shape of your traffic.",
      category: "eng",
      categoryConfidence: 0.95,
      arrivedAt: today(6, 32),
      readMinutes: 8,
      wordCount: 1840,
      status: "unread",
      keptCount: 0,
      links: [
        { title: "An evals starter harness", source: "GITHUB" },
        { title: "LLM-as-judge: scoring pairs", source: "BLOG" },
        { title: "RouteLLM paper", source: "ARXIV" },
        { title: "Prompt caching and cost", source: "DOCS" },
      ],
      bodyBlocks: [
        {
          type: "p",
          lede: "Most production LLM systems send every request to the same model, and that model is chosen for the hardest request the system will ever see.",
          rest: " Which means the other ninety per cent of traffic — classification, extraction, short rewrites — is answered by something far more capable, and far more expensive, than it needs.",
        },
        {
          type: "p",
          lede: "<strong>Routing is the idea that the model should be chosen per request, not per system.</strong>",
          rest: " A small classifier looks at the incoming request, decides how hard it is, and dispatches to the cheapest model that can handle it. When it works, the bill drops by an order of magnitude and nobody notices.",
        },
        {
          type: "h",
          text: "The router is the whole problem",
        },
        {
          type: "p",
          lede: "The difficulty isn't running two models — it's deciding which one, before you have the answer.",
          rest: " You are being asked to estimate the difficulty of a task without doing the task. That's where most routing projects quietly fail.",
        },
        {
          type: "ul",
          items: [
            "<strong>Heuristics</strong> — prompt length, presence of code, the calling endpoint. Nearly free, and wrong often enough to be annoying.",
            "<strong>A trained classifier</strong> — a small model fine-tuned on your own traffic. Cheap to run, expensive to build.",
            "<strong>Cascade</strong> — always try the small model first, score the answer, escalate on low confidence. No difficulty prediction at all.",
          ],
        },
        {
          type: "fig",
          figureId: "cascade",
          caption: "THE CASCADE PAYS TWICE ON HARD REQUESTS AND NEVER GUESSES. THE CLASSIFIER PAYS ONCE AND SOMETIMES GUESSES WRONG.",
        },
        {
          type: "h",
          text: "Where the savings actually come from",
        },
        {
          type: "p",
          lede: "<strong>The win is not the price gap between two models — it's the shape of your traffic.</strong>",
          rest: " If ninety per cent of requests are easy, routing them to a model costing a twentieth as much cuts the bill by roughly eighty-five per cent. If your traffic is evenly split, the same routing saves almost nothing and adds a component that can fail.",
        },
        {
          type: "p",
          lede: "So the first thing to measure is not model prices but difficulty distribution.",
          rest: " Sample a thousand real requests, answer each with both models, and have a judge decide whether the cheap answer was acceptable. That proportion is your ceiling. See the eval harness for a starting point.",
        },
        {
          type: "h",
          text: "The failure mode nobody plans for",
        },
        {
          type: "p",
          lede: "<strong>A router wrong five per cent of the time isn't five per cent worse — it's unpredictable, which is much harder to live with.</strong>",
          rest: " Users tolerate consistently mediocre far better than excellent four times and baffling on the fifth. The variance is the product problem, not the average.",
        },
        {
          type: "p",
          lede: "Either way, log the routing decision alongside every response.",
          rest: " Without it you cannot answer 'why was this answer bad' — and that question arrives within a week of shipping.",
        },
      ],
    },
    {
      sender: "Sebastian Raschka",
      subject: "GPT-6 Astra, looped transformers, hidden reasoning",
      dek: "A look at recurrent depth, and what looping a block actually buys you.",
      category: "ai",
      categoryConfidence: 0.98,
      arrivedAt: today(10, 24),
      readMinutes: 14,
      wordCount: 3100,
      status: "unread",
      keptCount: 0,
      links: [
        { title: "Looped transformers paper", source: "ARXIV" },
        { title: "Reference implementation", source: "GITHUB" },
        { title: "Depth vs width, revisited", source: "BLOG" },
      ],
      bodyBlocks: [
        {
          type: "p",
          lede: "The usual way to make a transformer stronger is to add layers, and the usual cost is that every added layer adds parameters.",
          rest: " Looping takes a different route: run the same block several times and let depth come from repetition rather than from new weights.",
        },
        {
          type: "p",
          lede: "<strong>Recurrent depth decouples how much computation you spend from how many parameters you store.</strong>",
          rest: " A model with twelve distinct blocks looped twice does twenty-four blocks of work with twelve blocks of weights.",
        },
        {
          type: "h",
          text: "What the loop is actually doing",
        },
        {
          type: "p",
          lede: "Each pass refines a representation rather than building a new one.",
          rest: " It is closer to iterative refinement than to a deeper feature hierarchy — which is why the gains show up on tasks with a sequential structure and barely at all on lookup-shaped ones.",
        },
        {
          type: "p",
          lede: "The interesting consequence is that you can vary the loop count at inference time.",
          rest: " Spend more passes on hard inputs, fewer on easy ones. That's routing again, in a different costume.",
        },
        {
          type: "h",
          text: "Where it breaks",
        },
        {
          type: "p",
          lede: "<strong>Training a looped model is harder than training a deep one, because gradients pass through the same weights repeatedly.</strong>",
          rest: " The failure is instability rather than poor accuracy, and it shows up late.",
        },
      ],
    },
    {
      sender: "Erik Hoel",
      subject: "Culture becomes a dark forest",
      dek: "What happens when the public commons is priced, and everyone retreats indoors.",
      category: "essay",
      categoryConfidence: 0.91,
      arrivedAt: today(9, 1),
      readMinutes: 12,
      wordCount: 2600,
      status: "unread",
      keptCount: 0,
      links: [
        { title: "The original dark forest essay", source: "BLOG" },
        { title: "On the commons", source: "ESSAY" },
      ],
      bodyBlocks: [
        {
          type: "p",
          lede: "The open web is not dying so much as emptying — the traffic is still there, but the writing has moved somewhere quieter.",
          rest: " Group chats, private servers, paid letters. The public square is loud, and increasingly nobody with anything careful to say is standing in it.",
        },
        {
          type: "p",
          lede: "<strong>When speech is cheap to broadcast and expensive to defend, people stop broadcasting the things worth defending.</strong>",
          rest: " That is not censorship. It is a straightforward response to an incentive.",
        },
        {
          type: "h",
          text: "The retreat is rational and collectively terrible",
        },
        {
          type: "p",
          lede: "Each individual retreat makes sense; the aggregate is a commons that nobody tends.",
          rest: " The people who remain in public are the ones for whom the cost of being wrong in public is lowest, which is a selection effect nobody designed and everybody suffers.",
        },
        {
          type: "p",
          lede: "The optimistic reading is that the forest is a phase, not an equilibrium.",
          rest: " Enclosures get rebuilt. The pessimistic reading is that they get rebuilt smaller each time.",
        },
      ],
    },
    {
      sender: "Daily Dose of DS",
      subject: "Your agent harness needs runtime security",
      dek: "A 100% local, open-source guide to recording what an agent actually did.",
      category: "ai",
      categoryConfidence: 0.85,
      arrivedAt: today(1, 0),
      readMinutes: 6,
      wordCount: 1200,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Superintelligence",
      subject: "OpenAI claims math's million-dollar breakthrough",
      dek: "A new model, in training since August, and what the claim rests on.",
      category: "ai",
      categoryConfidence: 0.88,
      arrivedAt: today(2, 55),
      readMinutes: 4,
      wordCount: 900,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Alex Berenson",
      subject: "Behind door #2, everyone dies",
      dek: "It is time to start taking the risks of AI much more seriously.",
      category: "essay",
      categoryConfidence: 0.8,
      arrivedAt: today(3, 23),
      readMinutes: 9,
      wordCount: 2000,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Julie Zhuo",
      subject: "I never want to use third-party software again",
      dek: "Welcome to the era of digital hyperpersonalization.",
      category: "prod",
      categoryConfidence: 0.94,
      arrivedAt: today(5, 1),
      readMinutes: 7,
      wordCount: 1500,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Machine Learning Pi",
      subject: "Issue #140 — your model says 80%. Should you believe it?",
      dek: "Calibration, and the pill of the week.",
      category: "ai",
      categoryConfidence: 0.82,
      arrivedAt: today(5, 28),
      readMinutes: 5,
      wordCount: 1100,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "The Hustling Engine",
      subject: "Software engineers: your job is about to get weird",
      dek: "What actually changes for engineers after the tooling shift.",
      category: "craft",
      categoryConfidence: 0.77,
      arrivedAt: today(7, 45),
      readMinutes: 6,
      wordCount: 1300,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Rafael from Lighthouse",
      subject: "How I use Codex without losing track of my code",
      dek: "The workflow I use to turn requirements into reviewable diffs.",
      category: "eng",
      categoryConfidence: 0.89,
      arrivedAt: today(8, 51),
      readMinutes: 5,
      wordCount: 1000,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Better Engineering",
      subject: "How Google News works under the hood",
      dek: "From RSS crawl to personalized feed — the six-phase pipeline.",
      category: "eng",
      categoryConfidence: 0.92,
      arrivedAt: today(10, 2),
      readMinutes: 9,
      wordCount: 2100,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Javier Canales",
      subject: "A certificate won't make you senior anymore",
      dek: "Reasoning about tradeoffs is what separates juniors from seniors.",
      category: "craft",
      categoryConfidence: 0.86,
      arrivedAt: today(10, 59),
      readMinutes: 6,
      wordCount: 1200,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    {
      sender: "Noahpinion",
      subject: "Liberalism needs a new philosophy of immigration",
      dek: "We need a principled stand instead of a tactical one.",
      category: "essay",
      categoryConfidence: 0.84,
      arrivedAt: today(13, 21),
      readMinutes: 11,
      wordCount: 2400,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null, // Preview-only
    },
    // Yesterday & Earlier
    {
      sender: "Paolo Perrone",
      subject: "What makes inference nondeterministic?",
      dek: "Send the same prompt to the same endpoint twice, with temperature zero.",
      category: "ai",
      categoryConfidence: 0.9,
      arrivedAt: yesterday(10),
      readMinutes: 7,
      wordCount: 1600,
      status: "kept",
      keptCount: 4,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "Delta by Zerodha Varsity",
      subject: "The art of discovering stocks",
      dek: "From everyday observations to IPOs, news and funds.",
      category: "mkt",
      categoryConfidence: 0.93,
      arrivedAt: yesterday(6),
      readMinutes: 8,
      wordCount: 1900,
      status: "nothing",
      keptCount: 0,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "Daily Dose of DS",
      subject: "Momentum in ML, explained visually",
      dek: "A popular ML interview question.",
      category: "ai",
      categoryConfidence: 0.9,
      arrivedAt: yesterday(15),
      readMinutes: 6,
      wordCount: 1200,
      status: "kept",
      keptCount: 1,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "Pirate Wires",
      subject: "The week in tech, unvarnished",
      dek: "Mike Solana on the week's noise.",
      category: "unsorted",
      categoryConfidence: 0.35, // Below 0.6 -> Guess!
      arrivedAt: yesterday(16),
      readMinutes: 9,
      wordCount: 2000,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "ByteByteGo",
      subject: "Designing a rate limiter that survives a spike",
      dek: "Token bucket, leaky bucket, and the one nobody implements correctly.",
      category: "eng",
      categoryConfidence: 0.95,
      arrivedAt: yesterday(17),
      readMinutes: 7,
      wordCount: 1500,
      status: "nothing",
      keptCount: 0,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "Erik Hoel",
      subject: "The Sunday essay — attention as a commons",
      dek: "What happens when the commons is priced.",
      category: "essay",
      categoryConfidence: 0.88,
      arrivedAt: daysAgo(3),
      readMinutes: 15,
      wordCount: 3200,
      status: "kept",
      keptCount: 2,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "Sebastian Raschka",
      subject: "Understanding multi-head attention from scratch",
      dek: "Code-first, with the shapes written out.",
      category: "ai",
      categoryConfidence: 0.97,
      arrivedAt: daysAgo(3),
      readMinutes: 18,
      wordCount: 4000,
      status: "kept",
      keptCount: 5,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "A sender you haven't named",
      subject: "Weekly roundup #82",
      dek: "Links, and more links.",
      category: "unsorted",
      categoryConfidence: 0.25, // Guess!
      arrivedAt: daysAgo(3),
      readMinutes: 4,
      wordCount: 700,
      status: "unread",
      keptCount: 0,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "Better Engineering",
      subject: "Idempotency keys, properly",
      dek: "Retries without duplicate side effects.",
      category: "eng",
      categoryConfidence: 0.91,
      arrivedAt: daysAgo(4),
      readMinutes: 6,
      wordCount: 1300,
      status: "kept",
      keptCount: 2,
      links: [],
      bodyBlocks: null,
    },
    {
      sender: "Javier Canales",
      subject: "The tradeoff nobody teaches",
      dek: "Consistency, availability, and the version your PM heard.",
      category: "craft",
      categoryConfidence: 0.85,
      arrivedAt: daysAgo(4),
      readMinutes: 5,
      wordCount: 1100,
      status: "skimmed",
      keptCount: 0,
      links: [],
      bodyBlocks: null,
    },
  ];

  for (const s of seedIssues) {
    const issueId = crypto.randomUUID();
    await db.insert(readerIssues).values({
      id: issueId,
      userId,
      sender: s.sender,
      subject: s.subject,
      dek: s.dek,
      category: s.category,
      categoryConfidence: s.categoryConfidence,
      arrivedAt: s.arrivedAt,
      wordCount: s.wordCount,
      readMinutes: s.readMinutes,
      bodyBlocks: s.bodyBlocks,
      links: s.links,
      status: s.status,
      keptCount: s.keptCount,
    });

    // Create seed keeps for issues that already have keptCount > 0
    if (s.keptCount > 0) {
      for (let i = 0; i < s.keptCount; i++) {
        await db.insert(readerKeeps).values({
          id: crypto.randomUUID(),
          issueId,
          userId,
          kind: "CLAIM",
          quote: `Key takeaway #${i + 1} from ${s.sender}`,
          reason: `Crucial foundation point for understanding ${s.subject}`,
          color: "var(--reader-pink)",
          createdAt: s.arrivedAt,
        });
      }
    }
  }
}
