import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { requireUserId, AuthError } from "@/lib/session";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const RESTYLE_SYSTEM = `
You are an expert web designer and CSS craftsman specializing in modern, tactile, and aesthetic UI styling.
The user will provide an HTML document or snippet and a requested visual art-direction style (e.g. "Hoard Neubrutalist", "Cyberpunk Terminal", "Minimalist Modern", "Swiss Editorial", or custom instructions).

Your task:
1. Preserve all DOM structure, interactive JavaScript logic, and textual content exactly as intended.
2. Update or rewrite the <style> block (or inline styles) to implement the requested visual aesthetic.
3. Use modern CSS (CSS custom properties in :root, flexbox, CSS grid, smooth transitions, high-contrast typography, box-shadows).
4. Return ONLY the complete, executable HTML document or snippet. Do not include markdown code fences (no \`\`\`html) or conversational commentary.
`;

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const { html, stylePrompt } = await req.json();

    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Missing or invalid HTML content." }, { status: 400 });
    }

    const userPrompt = `Requested Style: ${stylePrompt || "Hoard Neubrutalist with bold borders and offset shadows"}

HTML Document to restyle:
${html.slice(0, 12000)}`;

    const { text } = await generateText({
      model: languageModel(NOTEBOOK_MODEL),
      system: RESTYLE_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-restyle"]),
    });

    // Clean any accidental markdown code fences
    let cleaned = text.trim();
    if (cleaned.startsWith("```html")) {
      cleaned = cleaned.replace(/^```html\s*/i, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    return NextResponse.json({
      success: true,
      html: cleaned,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Restyle HTML] Error:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to restyle HTML." },
      { status: 500 }
    );
  }
}
