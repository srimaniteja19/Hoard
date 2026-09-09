import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readerIssues, readerSenders, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { parseNewsletter } from "@/lib/reader/parser";
import { categoriseIssue } from "@/lib/reader/ai";
import { ReaderCategoryKey } from "@/types/reader";

export async function POST(req: NextRequest) {
  try {
    const ingestSecret = process.env.INGEST_SECRET;
    const providedSecret =
      req.headers.get("x-hoard-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!ingestSecret || providedSecret !== ingestSecret) {
      return new Response("no", { status: 401 });
    }

    const body = await req.json();

    // Support both PascalCase and camelCase keys
    const messageId = body.MessageID || body.messageId;
    const from = body.From || body.from;
    const fromName = body.FromName || body.fromName;
    const subject = body.Subject || body.subject || "Untitled Issue";
    const htmlBody = body.HtmlBody || body.html || body.htmlBody;
    const textBody = body.TextBody || body.text || body.textBody;
    const dateStr = body.Date || body.date || body.arrivedAt;

    if (!messageId || !from) {
      return NextResponse.json(
        { error: "MessageID and From are required fields" },
        { status: 400 }
      );
    }

    // Idempotency check: if already ingested, return dedup: true
    const [existing] = await db
      .select({ id: readerIssues.id })
      .from(readerIssues)
      .where(eq(readerIssues.messageId, messageId))
      .limit(1);

    if (existing) {
      return NextResponse.json({ ok: true, dedup: true, id: existing.id });
    }

    // Resolve user ID
    let targetUserId = req.headers.get("x-hoard-user-id") || body.userId;
    if (!targetUserId) {
      const recipient = body.To || body.to;
      if (recipient) {
        const [matchedUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, String(recipient).toLowerCase().trim()))
          .limit(1);
        if (matchedUser) {
          targetUserId = matchedUser.id;
        }
      }
    }

    if (!targetUserId) {
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      targetUserId = firstUser ? firstUser.id : "local-user-1";
    }

    // Sender upsert
    const senderEmail = String(from).toLowerCase().trim();
    const senderName = String(fromName || from.split("@")[0]).trim();

    let sender = await db
      .select()
      .from(readerSenders)
      .where(
        and(
          eq(readerSenders.userId, targetUserId),
          eq(readerSenders.email, senderEmail)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!sender) {
      const [created] = await db
        .insert(readerSenders)
        .values({
          id: crypto.randomUUID(),
          userId: targetUserId,
          name: senderName,
          email: senderEmail,
          issueCount: 1,
        })
        .returning();
      sender = created;
    } else {
      await db
        .update(readerSenders)
        .set({
          issueCount: sql`${readerSenders.issueCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(readerSenders.id, sender.id));
    }

    // Parse newsletter into Block[]
    const { blocks, links, wordCount, dek } = parseNewsletter(htmlBody ?? textBody ?? "");

    // Categorization
    let categoryKey: ReaderCategoryKey = "unsorted";
    let categoryConfidence = 0.5; // < 0.6 renders dashed with a "?"

    try {
      const aiResult = await categoriseIssue(
        subject,
        dek || "",
        senderName
      );
      categoryKey = aiResult.category;
      categoryConfidence = aiResult.confidence;
    } catch {
      // Default to unsorted with 0.5 confidence
    }

    const arrivedAt = dateStr ? new Date(dateStr) : new Date();
    const finalArrived = isNaN(arrivedAt.getTime()) ? new Date() : arrivedAt;
    const readMinutes = Math.max(1, Math.round(wordCount / 220));

    const issueId = crypto.randomUUID();
    const [createdIssue] = await db
      .insert(readerIssues)
      .values({
        id: issueId,
        userId: targetUserId,
        messageId,
        senderId: sender.id,
        sender: sender.name,
        subject,
        dek: dek || "",
        category: categoryKey,
        categoryConfidence,
        arrivedAt: finalArrived,
        wordCount,
        readMinutes,
        bodyBlocks: blocks, // null when parsing fails -> preview-only state
        links: links || [],
        status: "unread",
        keptCount: 0,
      })
      .returning();

    return NextResponse.json({
      ok: true,
      id: createdIssue.id,
      dedup: false,
      wordCount,
      readMinutes,
      blocksParsed: Boolean(blocks && blocks.length > 0),
    });
  } catch (err) {
    console.error("POST /api/ingest error:", err);
    return NextResponse.json(
      { error: "Failed to ingest newsletter" },
      { status: 500 }
    );
  }
}
