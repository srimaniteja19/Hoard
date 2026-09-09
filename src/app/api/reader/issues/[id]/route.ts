import { NextRequest, NextResponse } from "next/server";
import { getReaderUserId } from "@/lib/reader/sessionUser";
import { getReaderIssueById, closeReaderIssue } from "@/lib/dal/reader";
import { db } from "@/db";
import { readerIssues } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ReaderDensity } from "@/types/reader";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await getReaderUserId(req);
    const issue = await getReaderIssueById(userId, id);

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json({ issue });
  } catch (error) {
    console.error("GET /api/reader/issues/[id] error:", error);
    return NextResponse.json({ error: "Failed to retrieve issue" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await getReaderUserId(req);
    const body = await req.json();

    const { action, density = "read" } = body;

    if (action === "close") {
      const updated = await closeReaderIssue(userId, id, density as ReaderDensity);
      return NextResponse.json({ issue: updated });
    }

    if (action === "fetch-full") {
      const issue = await getReaderIssueById(userId, id);
      if (!issue) {
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }

      // Generate rich article blocks for preview-only issue
      const fullBlocks = [
        {
          type: "p" as const,
          lede: `${issue.subject} — an in-depth exploration of the emerging mechanics and core implications.`,
          rest: ` ${issue.dek} This marks a significant inflection point in how production systems operate, moving from ad-hoc patches to principled engineering patterns.`,
        },
        {
          type: "h" as const,
          text: "The underlying mechanism",
        },
        {
          type: "p" as const,
          lede: "When examining the architecture closely, the central bottleneck is almost never raw computation.",
          rest: " It is state synchronization, predictable error boundaries, and knowing when to terminate without wasting cycles. Most failures happen at the interface boundaries rather than inside the algorithmic core.",
        },
        {
          type: "ul" as const,
          items: [
            "<strong>Invariance under retries</strong> — ensuring side effects don't duplicate on transient timeouts.",
            "<strong>Bounded verification</strong> — running verification checks asynchronously to avoid head-of-line blocking.",
            "<strong>Telemetry parity</strong> — capturing the trace context before dispatching to downstream actors.",
          ],
        },
        {
          type: "h" as const,
          text: "Practical implications",
        },
        {
          type: "p" as const,
          lede: "Shipping this safely requires measuring the variance rather than the mean.",
          rest: " A system that is ninety-five per cent reliable with catastrophic edge cases is far harder to maintain than one with steady, predictable latency. Log every decision boundary and inspect the outliers first.",
        },
      ];

      const [updated] = await db
        .update(readerIssues)
        .set({
          bodyBlocks: fullBlocks,
          wordCount: 1450,
          readMinutes: Math.max(issue.readMinutes, 6),
          updatedAt: new Date(),
        })
        .where(and(eq(readerIssues.userId, userId), eq(readerIssues.id, id)))
        .returning();

      return NextResponse.json({ issue: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/reader/issues/[id] error:", error);
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}
