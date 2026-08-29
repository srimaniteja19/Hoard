import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { sanitizeSvgMarkup, toSvgDataUri } from "@/lib/marginalia/dreamMotifs";

const ALCHEMIST_MODEL = "google/gemini-3.5-flash";

const CoverSchema = z.object({
  motifName: z.string().describe("A 1-3 word title for the artwork motif (e.g. 'Cosmic Synapse', 'Stoic Horizon')"),
  accentColor: z.string().describe("Vibrant hex accent color (e.g. '#FBBF24', '#38BDF8', '#F43F5E')"),
  fgColor: z.string().describe("Contrasting foreground text color (usually '#FFFFFF' or '#0F172A')"),
  bgGradient: z.string().describe("Multi-stop CSS linear-gradient (e.g. 'linear-gradient(180deg, #1E1B4B 0%, #311347 50%, #0F172A 100%)')"),
  epigraph: z.string().describe("A powerful, poetic 1-line philosophical thesis or hook synthesizing the book's core premise"),
  svgMarkup: z.string().describe("Full responsive XML SVG markup matching `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 300\" preserveAspectRatio=\"none\" style=\"width:100%;height:100%;display:block\">...</svg>` with background defs, layered vector shapes, and themed artistic scene"),
});

const ALCHEMIST_SYSTEM = `You are a master editorial book cover designer and vector artist in the style of high-end illustrated non-fiction (like Blinkist, Penguin Classics, and Headway).

Your mission: Deeply analyze the book's title, author, synopsis/description, themes, and key concepts, and transform them into a **bespoke, metaphor-rich vector artwork SVG** and cohesive color palette that visually communicates the core premise of this specific book.

## Design Philosophy:
- **Conceptual Depth**: Draw specific metaphors directly linked to the book's exact subject matter (e.g. for a book on AI: glowing silicon neural lattices or Turing mirrors; for behavioral psychology/relationships: dual silhouettes, behavioral forks, interconnected hearts; for urban planning: pedestrian greenways, bicycles, glowing transit grids; for evolutionary biology: genetic ribbons, Darwinian trees, ancient hominid horizons; for business/systems: flywheel gears, compounding curves).
- **Bespoke Character**: Every artwork must be unique, highly customized, and evocative of the book's exact thesis, avoiding generic repetitive geometry.

## Strict SVG Technical Rules:
1. MUST start with \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">\`
2. Include rich \`<defs>\` with multi-stop \`<linearGradient>\` and \`<radialGradient>\` IDs.
3. Layer geometric and organic vector elements with depth and contrast:
   - Dramatic perspective planes, atmospheric sky gradients, celestial horizons, silhouette figures, stylized organic flora, architectural arches, neural matrices, flowing waves, or thematic artifacts.
   - Use clean, curated modern palette colors (Cobalt, Crimson, Canary Amber, Emerald, Terracotta, Coral, Royal Violet, Obsidian).
4. Ensure valid XML markup: all tags closed (e.g. \`<rect />\`, \`<circle />\`, \`<path />\`, \`<polygon />\`), all attributes quoted, and no raw unencoded ampersands.
5. Provide pure valid SVG markup without markdown code fences.`;

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const body = await req.json();
    const { title, author, description, coreThemes, chapters, styleChoice, userPrompt } = body as {
      title?: string;
      author?: string;
      description?: string;
      coreThemes?: string[];
      chapters?: string[];
      styleChoice?: string;
      userPrompt?: string;
    };

    if (!title) {
      return NextResponse.json({ error: "Book title is required" }, { status: 400 });
    }

    const prompt = [
      `Book Title: "${title}"`,
      author ? `Author: "${author}"` : null,
      description ? `Book Synopsis / Core Thesis: "${description}"` : null,
      coreThemes && coreThemes.length > 0 ? `Core Themes: ${coreThemes.join(", ")}` : null,
      chapters && chapters.length > 0 ? `Key Chapters: ${chapters.slice(0, 6).join(", ")}` : null,
      styleChoice ? `Desired Style: ${styleChoice}` : null,
      userPrompt ? `User Thematic Request: "${userPrompt}"` : null,
      "Synthesize this book's conceptual essence into an extraordinary vector cover illustration and color scheme directly inspired by the book's specific narrative and ideas.",
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

    const rawSvg = result.object.svgMarkup;
    const cleanSvg = sanitizeSvgMarkup(rawSvg);
    const dataUri = toSvgDataUri(cleanSvg);

    return NextResponse.json({
      cover: {
        ...result.object,
        svgMarkup: cleanSvg,
        dataUri,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
