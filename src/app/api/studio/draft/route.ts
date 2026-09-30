import { NextResponse } from "next/server";
import { generateText } from "ai";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { requireUserId, AuthError } from "@/lib/session";
import type { StudioFormat, StudioPillar, StudioScene } from "@/lib/studio/types";

export const runtime = "nodejs";

const DRAFT_MODEL = "google/gemini-3.5-flash-lite";

const DRAFT_SYSTEM = `You are the lead director and writer for "OddlyInteresting", an acclaimed short-form video channel covering fascinating, counterintuitive, and mind-bending concepts in finance, tech, science, and history.

Your goal is to turn an idea into a production-ready video script.

Rules you MUST follow strictly:
1. Script Scenes: Exactly 3 to 4 scenes. Spoken narration length around 120 to 150 words total (45 to 60 seconds spoken).
2. Hook: Scene 1 must open with an irresistible, punchy curiosity gap (e.g. "What if you could buy a ticket that says...").
3. Signature Pause: In Scene 2 or 3, include: "Pause and guess: [engaging question]? (pause about 1 second) [answer or reveal]".
4. Signature Outro: The final scene MUST end with: "Please follow and share for more interesting, random content like this."
5. NO em dashes ("—") anywhere in the script or caption. Use commas or periods instead.
6. Title Cards: Include 1 to 2 visual title card lower-third cues per scene formatted as [cards: PHRASE / PHRASE].
7. Caption: Engaging post caption under 2,000 characters with an open question for comments.
8. Instagram Hashtags: Exactly 4 to 5 relevant hashtags (e.g. #finance #economics #oddlyinteresting).
9. Extra Hashtags: 8 to 12 hashtags for TikTok and YouTube Shorts.
10. Sources: 1 to 2 relevant sources or real-world reference links.

Respond ONLY with valid JSON in this exact structure:
{
  "title": "Title of the piece",
  "format": "reel",
  "pillar": "finance",
  "script": [
    { "text": "Scene 1 text...", "cards": ["TITLE CARD 1", "TITLE CARD 2"] },
    { "text": "Scene 2 text with Pause and guess: ... (pause about 1 second) ...", "cards": ["CARD"] },
    { "text": "Scene 3 conclusion. Please follow and share for more interesting, random content like this.", "cards": [] }
  ],
  "caption": "Post caption text...",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5",
  "extraHashtags": "#tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9",
  "sources": [
    { "title": "Source name", "url": "https://example.com" }
  ],
  "notes": "Director notes on B-roll or visual style"
}`;

export async function POST(req: Request) {
  try {
    await requireUserId(req);
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      hook?: string;
      pillar?: StudioPillar;
      format?: StudioFormat;
    };

    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required to draft a script." }, { status: 400 });
    }

    const pillar = body.pillar || "finance";
    const format = body.format || "reel";
    const hook = body.hook || "";

    const userPrompt = `Draft an OddlyInteresting video script for:
Title: ${title}
Topic/Pillar: ${pillar}
Format: ${format}
Initial Hook / Context: ${hook || "None provided"}`;

    try {
      const { text } = await generateText({
        model: languageModel(DRAFT_MODEL),
        system: DRAFT_SYSTEM,
        prompt: userPrompt,
        providerOptions: {
          google: {
            thinking: { budgetTokens: 0 },
          },
        },
        ...gatewayProviderOptions(DRAFT_MODEL, ["feature:studio-draft"]),
      });

      // Extract JSON block if surrounded by markdown fences
      const cleaned = text.replace(/```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      return NextResponse.json({
        draft: {
          title: parsed.title || title,
          format: parsed.format || format,
          pillar: parsed.pillar || pillar,
          script: Array.isArray(parsed.script) ? parsed.script : [{ text: title, cards: [] }],
          caption: parsed.caption || "",
          hashtags: parsed.hashtags || `#${pillar} #oddlyinteresting`,
          extraHashtags: parsed.extraHashtags || `#${pillar} #oddlyinteresting #knowledge #shorts #viral`,
          sources: Array.isArray(parsed.sources) ? parsed.sources : [],
          notes: parsed.notes || hook || "",
        },
      });
    } catch (aiError) {
      console.warn("[Studio AI Draft Gateway error, generating structured fallback]", aiError);
      
      // Fallback high quality template if AI Gateway is unavailable
      const fallbackScript: StudioScene[] = [
        {
          text: `What if everything you thought you knew about ${title.toLowerCase()} was backwards? Here is the secret history that nobody talks about.`,
          cards: ["THE HOOK", title.toUpperCase().slice(0, 24)],
        },
        {
          text: `Pause and guess: what actually caused this to explode? (pause about 1 second) The answer lies in how human incentives behave when money and status collide.`,
          cards: ["THE TURNING POINT"],
        },
        {
          text: `Today, this shapes the way entire industries operate behind the scenes. Please follow and share for more interesting, random content like this.`,
          cards: ["THE TAKEAWAY"],
        },
      ];

      return NextResponse.json({
        draft: {
          title,
          format,
          pillar,
          script: fallbackScript,
          caption: `${title}.\n\nA fascinating look into how this came to be. Which part surprised you the most?\n\nPlease follow and share for more.`,
          hashtags: `#${pillar} #oddlyinteresting #learn #secrets #history`,
          extraHashtags: `#${pillar} #oddlyinteresting #shorts #tiktok #youtube #curious #knowledge #facts`,
          sources: [{ title: `${title} Reference`, url: "https://en.wikipedia.org" }],
          notes: hook || "Drafted via Studio assistant",
        },
      });
    }
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/studio/draft]", e);
    return NextResponse.json({ error: "Failed to draft script" }, { status: 500 });
  }
}
