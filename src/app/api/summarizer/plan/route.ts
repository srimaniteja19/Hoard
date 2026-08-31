import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { analyzeIntake } from "@/lib/summarizer/intakeAnalyzer";

const PLAN_MODEL = "google/gemini-3.5-flash";

const PlanSchema = z.object({
  thesisHypothesis: z
    .string()
    .describe("One sentence, under 20 words, stating the core breakthrough/insight rather than describing the topic"),
  targetSectionCount: z.number().min(2).max(6).default(4),
  proposedHeadings: z
    .array(z.string())
    .describe("3-6 real headings for the argument's logic. NEVER 'Introduction', 'Background', or 'Conclusion'"),
  candidateFigures: z
    .array(
      z.object({
        kind: z.enum(["relay", "contrast", "anatomy", "flow", "scale", "inputs"]),
        confidence: z.number().min(0).max(1).default(0.85),
        evidence: z.string().describe("Why this visual structure is genuinely present in the text"),
      })
    )
    .default([]),
  candidateCast: z
    .array(z.string())
    .describe("Named people or orgs that each did something distinct. Only populate if 4+ distinct actors exist; otherwise empty array"),
  candidateTerms: z
    .array(z.string())
    .describe("0-8 pieces of jargon a competent outsider would trip on"),
  claimsToFlagCount: z.number().default(4).describe("Count of numbers, statistics, or contested claims to audit"),
  skippedPredictions: z
    .array(z.string())
    .describe("Tangents, sponsor reads, repetitive framing, or self-promotion occupying >5% to be left out"),
  castReasoningIfEmpty: z
    .string()
    .nullish()
    .describe("If cast is empty, short explanation (e.g. 'Fewer than 4 named actors — not worth a cast dossier')"),
  figuresReasoningIfEmpty: z
    .string()
    .nullish()
    .describe("If figures is empty, short explanation (e.g. 'No literal drawable structures — shipping without figures')"),
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json({ error: "Source text must be at least 50 characters." }, { status: 400 });
    }

    const clean = text.trim();
    const intake = analyzeIntake(clean);

    const strategy = intake.strategy;

    const systemPrompt = `You are a master digest planner operating under an AUTONOMOUS DOMAIN DIRECTIVE.
You analyze source text and construct a lean, precise PRE-GENERATION PLAN for a 3-5 minute digest.

═══ AUTONOMOUS DOMAIN ADAPTATION ═══
Archetype: ${strategy?.label || "GENERAL ANALYSIS"}
Expert Persona: ${strategy?.expertPersona || "Master Synthesizer"}
Load-Bearing Focus: ${strategy?.loadBearingFocus || "Isolate core insight"}
Pruning Strategy: ${strategy?.pruningRule || "Drop secondary fluff"}

${strategy?.tailoredDirectives || ""}

═══ CORE RULES FOR THE PLAN ═══
1. Thesis: Exactly ONE sentence, under 20 words, stating the actual insight — NOT the topic.
   Bad: "An overview of how the Black-Scholes formula was developed."
   Good: "The breakthrough wasn't predicting where a stock goes. It was proving you never needed to know."
2. Sections: 3-6 real headings. Follow the ARGUMENT'S logic. NEVER use "Introduction", "Background", "Overview", or "Conclusion".
3. Figures: Zero figures is valid and common. ONLY propose if the source genuinely contains one of:
   - relay: chain of people/events handing something forward over time
   - contrast: two approaches described in enough detail to draw both
   - anatomy: a thing decomposed into named, ordered parts
   - flow: sequence with loop, branch, or feedback
   - scale: quantities whose ratio is the point
   - inputs: what a process takes in, and what it notably does not
4. Cast: ONLY propose if 4+ named people/orgs each did something distinct. Otherwise return [] and state why.
5. Terms: 0-8 pieces of domain jargon.
6. Skipped: Tangents, sponsor reads, repeated intros (>5% of source).`;

    const userPrompt = `AUTONOMOUS ARCHETYPE: ${strategy?.label || "GENERAL"}
SOURCE FORMAT: ${intake.sourceFormat}
WORD COUNT: ${intake.wordCount}
EXTRACTED ENTITIES: ${intake.namedEntities.join(", ") || "None"}
YEARS DETECTED: ${intake.datesFound.join(", ") || "None"} (Span: ${intake.dateSpanYears ? `${intake.dateSpanYears} years` : "N/A"})
NUMBERS FOUND: ${intake.numberCount}

SOURCE TEXT:
${clean.slice(0, 14000)}`;

    const { object: plan } = await generateObject({
      model: languageModel(PLAN_MODEL),
      schema: PlanSchema,
      system: systemPrompt,
      prompt: userPrompt,
      ...gatewayProviderOptions(PLAN_MODEL, ["feature:summarizer-plan"]),
    });

    return NextResponse.json({
      intake,
      plan: {
        ...plan,
        strategy,
        includeCast: plan.candidateCast.length >= 4,
        includeFigures: plan.candidateFigures.length > 0,
        includeTerms: plan.candidateTerms.length > 0,
        includeClaimsAudit: plan.claimsToFlagCount > 0,
        includeSkippedFooter: plan.skippedPredictions.length > 0,
        depth: "standard",
      },
    });
  } catch (err) {
    console.error("Summarizer plan failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to generate plan." },
      { status: 500 }
    );
  }
}
