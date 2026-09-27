import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, TRIAGE_MODEL } from "@/lib/ai/models";
import {
  TriageTime,
  TriageEnergy,
  TriageContext,
  getCuratedTriage,
  TriagePick,
} from "@/lib/channel100/triage";

export const runtime = "nodejs";

const PickSchema = z.object({
  id: z.string().describe("Unique identifier e.g. triage_parasite"),
  title: z.string().describe("Exact official title of show or movie"),
  year: z.number().describe("Year released e.g. 2019"),
  kind: z.enum(["series", "film", "anime", "mini-series", "documentary"]),
  lang: z.string().describe("Original language e.g. Korean, Japanese, French, English, Telugu"),
  langFlag: z.string().describe("Emoji country flag e.g. 🇰🇷, 🇯🇵, 🇫🇷, 🇺🇸, 🇮🇳, 🇩🇪"),
  runtime: z.string().describe("Concise runtime or episode format e.g. '24m per ep', '132 mins', '52m ep'"),
  genre: z.string().describe("Primary and secondary genre e.g. 'Crime / Noir Mystery'"),
  where: z.string().describe("Primary streaming service where it is widely available e.g. 'Netflix', 'Max', 'Apple TV+', 'Prime Video', 'Criterion Channel', 'Crunchyroll'"),
  ratingScore: z.string().describe("Concise rating score e.g. '8.9/10 IMDb · 98% RT'"),
  tagline: z.string().describe("Evocative, punchy tagline"),
  hook: z.string().describe("Crisp, compelling 1-2 sentence premise without spoilers"),
  whyThisFits: z.string().describe("Direct personal explanation of why this is the perfect cure for their specific time, energy, and social context"),
  color: z.string().describe("Hex color accent matching the vibe e.g. #F5C518, #3CC4DE, #E4509E, #3DBE6A, #EF4A3A"),
  matchedFromWatchlist: z.boolean().optional(),
});

const TriageResponseSchema = z.object({
  prescription: PickSchema.describe("The definitive #1 optimal recommendation from anywhere in world cinema/television"),
  alternatives: z.array(PickSchema).length(2).describe("Two distinct backup recommendations from world cinema/TV matching the same criteria"),
});

export async function POST(req: NextRequest) {
  let time: TriageTime = "2h";
  let energy: TriageEnergy = "adrenaline";
  let context: TriageContext = "solo";
  let watchlistTitles: string[] = [];

  try {
    const body = await req.json();
    if (body.time) time = body.time;
    if (body.energy) energy = body.energy;
    if (body.context) context = body.context;
    if (Array.isArray(body.watchlistTitles)) {
      watchlistTitles = body.watchlistTitles.map(String).slice(0, 30);
    }
  } catch {
    // Proceed with defaults
  }

  // Attempt AI Generation via Gemini / Gateway
  try {
    const prompt = `You are the Chief Broadcast Curator for Channel 100, the world's most discerning, polyglot cinema and television triage system.
The user suffers from severe decision paralysis and needs the SINGLE BEST PRESCRIPTION for what to watch right now based on their diagnostic answers:

1. Time Available: ${time} (${time === "20m" ? "around 20-25 mins (anime, sitcom, short episode)" : time === "45m" ? "around 45-60 mins (prestige TV chapter, drama hour)" : time === "2h" ? "around 90-130 mins (complete feature film)" : "3+ hours (binge marathon / mini-series)"})
2. Energy Level: ${energy} (${energy === "brain-off" ? "exhausted, zero cognitive load, wholesome laughs or pure comfort" : energy === "rollercoaster" ? "cathartic emotional rollercoaster, poignant human depth, tearjerker" : energy === "intellectual" ? "intellectual intrigue, puzzle-box, psychological noir, existential concepts" : "pure adrenaline, edge-of-your-seat thriller, non-stop momentum"})
3. Viewing Context: ${context} (${context === "solo" ? "solo deep dive, headphones, subtitles welcomed, total immersion" : context === "duo" ? "date night / watching with partner, engrossing conversation starter" : "friends / crowd pleaser, high energy, communal thrills or laughs"})

${watchlistTitles.length > 0 ? `The user currently has these titles on their backlog or personal tracker: ${watchlistTitles.join(", ")}. If any of these matches their criteria exceptionally well, prioritize it and set matchedFromWatchlist: true.` : ""}

RULES:
- Select from the wide, rich universe of WORLD CINEMA and GLOBAL TELEVISION (English, Korean, Japanese, French, Indian, Nordic, Spanish, German, Italian, etc.).
- Never recommend generic, filler content. Recommend certified masterworks, cult masterpieces, or peerless crowd-pleasers.
- Provide 1 definitive "prescription" and 2 diverse "alternatives" (from different countries, tones, or formats).
- "whyThisFits" must directly speak to the user, answering why this exact title solves their time constraint, energy level, and social situation tonight.`;

    const { object } = await generateObject({
      model: languageModel(TRIAGE_MODEL),
      schema: TriageResponseSchema,
      prompt,
      providerOptions: gatewayProviderOptions(TRIAGE_MODEL, ["channel100", "triage"]),
    });

    if (object && object.prescription) {
      return NextResponse.json({
        prescription: object.prescription,
        alternatives: object.alternatives || [],
        source: "ai",
      });
    }
  } catch (error) {
    console.warn("[POST /api/channel100/triage] AI Gateway error, falling back to curated engine:", error);
  }

  // Graceful Curated Worldwide Fallback
  const fallback = getCuratedTriage(time, energy, context);
  
  // Check if any backlog title matches
  if (watchlistTitles.length > 0) {
    const lowerTitles = watchlistTitles.map((t) => t.toLowerCase());
    if (lowerTitles.some((t) => fallback.prescription.title.toLowerCase().includes(t))) {
      fallback.prescription.matchedFromWatchlist = true;
    }
  }

  return NextResponse.json({
    prescription: fallback.prescription,
    alternatives: fallback.alternatives,
    source: "curated",
  });
}
