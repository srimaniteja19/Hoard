import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { requireUserId, AuthError } from "@/lib/session";
import { extractHtmlTitle } from "@/lib/notebooks/blocks";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const GENERATE_SYSTEM = `
You are a senior frontend engineer and creative UI designer.
Your task is to generate complete, single-file, interactive HTML + CSS widgets for Hoard Notebooks based on the user's prompt.

Guidelines:
1. Include modern, beautiful CSS in a <style> block using :root variables, tactile typography, smooth hover states, and responsive layout.
2. Include interactive JavaScript directly in a <script> block where relevant (e.g. state toggles, sliders, calculations, filter buttons, console.log debugging messages).
3. Ensure the widget is completely self-contained with no external dependencies (or use Google Fonts / unpkg if necessary).
4. Return ONLY the raw HTML document (including <!DOCTYPE html>, <head>, <style>, <body>, <script>). Do NOT wrap in markdown code blocks (\`\`\`html). Do NOT include conversational text.
`;

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const { prompt, topic, context } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Missing widget prompt." }, { status: 400 });
    }

    const userPrompt = `Widget Topic: ${topic || "Interactive Notebook Widget"}
Prompt / Specifications: ${prompt.trim()}
Surrounding Context: ${context ? context.slice(0, 1500) : "General notebook note"}`;

    const { text } = await generateText({
      model: languageModel(NOTEBOOK_MODEL),
      system: GENERATE_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-generate-html"]),
    });

    let cleaned = text.trim();
    if (cleaned.startsWith("```html")) {
      cleaned = cleaned.replace(/^```html\s*/i, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const title = extractHtmlTitle(cleaned) || "Interactive HTML Widget";

    return NextResponse.json({
      success: true,
      html: cleaned,
      title,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Generate HTML] Error:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to generate HTML widget." },
      { status: 500 }
    );
  }
}
