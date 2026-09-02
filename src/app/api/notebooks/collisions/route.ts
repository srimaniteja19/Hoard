import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { requireUserId, AuthError } from "@/lib/session";
import { getNotebookCollisions, saveNotebookCollisions } from "@/lib/dal/notebooks";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const CollisionSchema = z.object({
  collisions: z
    .array(
      z.object({
        title: z.string(), // "Tool calling is just a function signature"
        description: z.string(), // one or two sentences
        relation: z.enum(["same-idea", "same-words", "contradiction", "open-in-both"]),
        sourceA: z.object({ course: z.string(), lesson: z.string() }),
        sourceB: z.object({ course: z.string(), lesson: z.string() }),
      })
    )
    .max(6),
});

const COLLISION_SYSTEM = `
You are given passages from different pages of someone's course notes across different courses.
Name what the conceptual relationship actually is.

relation:
  same-idea      — two courses teaching one concept from different ends (e.g. tool schema in agents vs type hints in Python)
  same-words     — they wrote nearly the same thing twice across courses; worth merging into one TIL claim
  contradiction  — the two pages disagree or recommend conflicting patterns. Say so plainly; this is the most valuable case.
  open-in-both   — an unresolved question appears on both pages

Rules:
- Drop any pair whose only connection is shared vocabulary. Two passages both containing "the model" are NOT a collision.
- If none of the pairs are real collisions, return an empty array.
- Never invent a connection to fill the list.
`;

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const collisions = await getNotebookCollisions(userId);
    return NextResponse.json({ collisions });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/notebooks/collisions] Error:", err);
    return NextResponse.json({ error: "Failed to fetch collisions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { courses } = await req.json();

    if (!Array.isArray(courses) || courses.length < 2) {
      return NextResponse.json({
        collisions: [],
      });
    }

    const coursesDump = courses.map((c: any) => ({
      courseTitle: c.title,
      modules: c.modules?.map((m: any) => ({
        moduleTitle: m.title,
        lessons: m.lessons?.map((l: any) => ({
          lessonTitle: l.title,
          blocks: l.blocks,
        })),
      })),
    }));

    const userPrompt = `ANALYZE ALL COURSES AND FIND REAL INTELLECTUAL COLLISIONS:
${JSON.stringify(coursesDump, null, 2).slice(0, 16000)}`;

    const { object } = await generateObject({
      model: languageModel(NOTEBOOK_MODEL),
      schema: CollisionSchema,
      system: COLLISION_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-collisions"]),
    });

    const formattedCollisions = object.collisions.map((c, idx) => ({
      id: `collision-${Date.now().toString(36)}-${idx}`,
      ...c,
    }));

    await saveNotebookCollisions(userId, formattedCollisions);

    return NextResponse.json({
      collisions: formattedCollisions,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Notebook collisions failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to find cross-course collisions." },
      { status: 500 }
    );
  }
}

