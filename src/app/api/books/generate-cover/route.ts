import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const ALCHEMIST_MODEL = "google/gemini-3.5-flash";

const CoverSchema = z.object({
  motifName: z.string().describe("A 1-3 word title for the artwork motif (e.g. 'Cosmic Synapse', 'Stoic Horizon')"),
  accentColor: z.string().describe("Vibrant hex accent color (e.g. '#FBBF24', '#38BDF8', '#F43F5E')"),
  fgColor: z.string().describe("Contrasting foreground text color (usually '#FFFFFF' or '#0F172A')"),
  bgGradient: z.string().describe("Multi-stop CSS linear-gradient (e.g. 'linear-gradient(180deg, #1E1B4B 0%, #311347 50%, #0F172A 100%)')"),
  epigraph: z.string().describe("A powerful, poetic 1-line philosophical thesis or hook synthesizing the book's core premise"),
  svgMarkup: z.string().describe("Full responsive SVG markup matching `<svg viewBox=\"0 0 200 300\" preserveAspectRatio=\"none\" style=\"width:100%;height:100%;display:block\">...</svg>` with background defs, layered vector shapes, and themed artistic scene"),
});

const ALCHEMIST_SYSTEM = `You are a master editorial book cover designer and vector artist in the style of high-end illustrated non-fiction (like Blinkist, Penguin Classics, and Headway).

Your mission: Transform a book title, author, and optional theme prompt into a **stunning, bespoke full-bleed vector artwork SVG** and harmonious color palette.

## SVG Design Rules:
1. Use \`<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">\`
2. Include rich \`<defs>\` with \`<linearGradient>\` stops.
3. Layer geometric and organic vector elements:
   - Dramatic perspective planes, celestial spheres, sunburst rays, silhouette figures, stylized trees, architectural arches, climbing ropes, labyrinth steps, flowing wave crests, or data networks.
   - Use clean modern palette colors (Cobalt, Crimson, Canary Amber, Emerald, Terracotta, Coral, Royal Violet, Night Sky).
4. Add 1-2 subtle CSS animation classes if appropriate (e.g. \`class="anim-target-pulse"\` or \`class="anim-glow-path"\`).
5. Ensure the top 35% of the canvas has clean contrast so book title text overlaid at the top will be crystal clear.
6. The SVG should be valid, self-contained SVG markup without markdown fences.`;

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const body = await req.json();
    const { title, author, styleChoice, userPrompt } = body as {
      title?: string;
      author?: string;
      styleChoice?: string;
      userPrompt?: string;
    };

    if (!title) {
      return NextResponse.json({ error: "Book title is required" }, { status: 400 });
    }

    const prompt = [
      `Book Title: "${title}"`,
      author ? `Author: "${author}"` : null,
      styleChoice ? `Desired Style: ${styleChoice}` : null,
      userPrompt ? `User's Thematic Request: "${userPrompt}"` : null,
      "Synthesize this book's conceptual essence into an extraordinary vector cover illustration and color scheme.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await generateObject({
      model: languageModel(ALCHEMIST_MODEL),
      system: ALCHEMIST_SYSTEM,
      prompt,
      schema: CoverSchema,
      providerOptions: {
        ...gatewayProviderOptions(ALCHEMIST_MODEL, ["feature:marginalia-cover-alchemist"]),
      },
    });

    return NextResponse.json({ cover: result.object });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
