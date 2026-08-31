import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const DIGEST_MODEL = "google/gemini-3.5-flash";

const RelayStepSchema = z.object({
  actor: z.string().describe("Person or organization who made the contribution"),
  year: z.string().nullish().describe("Year or approximate era"),
  action: z.string().describe("What they formulated, discovered, or proved"),
  baton: z.string().describe("The core idea or artifact handed forward to the next actor"),
});

const ContrastItemSchema = z.object({
  attribute: z.string().describe("The dimension of comparison (e.g. 'Execution model', 'Gradient flow')"),
  optionA: z.object({
    title: z.string(),
    detail: z.string(),
  }),
  optionB: z.object({
    title: z.string(),
    detail: z.string(),
  }),
});

const AnatomyPartSchema = z.object({
  number: z.number(),
  name: z.string().describe("Name of the subsystem, module, or layer"),
  role: z.string().describe("Exact operational function"),
  orderedDependency: z.string().nullish().describe("Prerequisite layer or output recipient"),
});

const FlowStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  isLoopOrBranch: z.boolean().default(false),
  branchTo: z.string().nullish(),
});

const ScaleQuantitySchema = z.object({
  label: z.string(),
  value: z.number().describe("Numeric value for bar comparison"),
  unit: z.string().describe("Unit (e.g. 'nm', '$M', 'parts', 'tokens')"),
  formatted: z.string().describe("Human-readable formatted string (e.g. '13.5 nm', '$380M')"),
});

const InputsDataSchema = z.object({
  included: z.array(z.string()).describe("What the process takes in as essential input"),
  excluded: z.array(z.string()).describe("What the process explicitly ignores, discards, or proves unnecessary"),
  transformation: z.string().describe("The mathematical or mechanical transform applied"),
});

const FigureSchema = z.object({
  id: z.string(),
  kind: z.enum(["relay", "contrast", "anatomy", "flow", "scale", "inputs"]),
  title: z.string(),
  caption: z.string().describe("One line in annotation voice that adds something the figure doesn't already say"),
  scaleNote: z.string().nullish().describe("For scale: whether drawn linear or log and why. If ratio >50:1, state that linear makes small bar invisible"),
  relayData: z.array(RelayStepSchema).nullish(),
  contrastData: z
    .object({
      labelA: z.string(),
      labelB: z.string(),
      items: z.array(ContrastItemSchema),
    })
    .nullish(),
  anatomyData: z
    .object({
      systemName: z.string(),
      parts: z.array(AnatomyPartSchema),
    })
    .nullish(),
  flowData: z
    .object({
      steps: z.array(FlowStepSchema),
      loopDescription: z.string().nullish(),
    })
    .nullish(),
  scaleData: z
    .object({
      axisType: z.enum(["linear", "log"]),
      ratio: z.string().describe("Exemplary ratio e.g. '14:1' or '750:1'"),
      items: z.array(ScaleQuantitySchema),
    })
    .nullish(),
  inputsData: InputsDataSchema.nullish(),
});

const SectionSchema = z.object({
  n: z.number(),
  heading: z.string().describe("Real heading. NEVER 'Introduction', 'Background', or 'Conclusion'"),
  paragraphs: z
    .array(z.string())
    .describe("1-3 paragraphs, 40-90 words each. Wrap the single load-bearing phrase of each paragraph in <strong> (max one per paragraph)"),
  figureId: z.string().nullish().describe("Optional ID of matching figure referenced in this section"),
});

const DigestResultSchema = z.object({
  title: z.string().describe("3-7 words naming what the thing IS, not what the source is titled"),
  thesis: z.string().describe("One sentence, under 20 words, stating the actual insight — not the topic"),
  readMinutes: z.number().min(2).max(6).default(4),
  sections: z.array(SectionSchema).min(2).max(6),
  figures: z.array(FigureSchema).default([]),
  cast: z
    .array(
      z.object({
        name: z.string(),
        contribution: z.string().describe("What they contributed, not who they were"),
      })
    )
    .default([]),
  terms: z
    .array(
      z.object({
        term: z.string(),
        definition: z.string().describe("Defined as used HERE, in 1-2 sentences"),
      })
    )
    .default([]),
  takeaway: z.string().describe("One or two sentences, under 30 words. The thing worth remembering in six months"),
  skipped: z.array(z.string()).default([]),
  claims: z
    .array(
      z.object({
        text: z.string().describe("Every number, statistic, or contested assertion from the text"),
        verified: z.boolean().default(false),
        sourceContext: z.string().nullish(),
      })
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const { text, planOverrides } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json({ error: "Source text must be at least 50 characters." }, { status: 400 });
    }

    const clean = text.trim();
    const strategy = planOverrides?.strategy;

    const systemPrompt = `You turn a source into a digest someone reads in 3–5 minutes instead of reading the original. Return one JSON object, nothing else.

═══ AUTONOMOUS DOMAIN POSTURE ═══
Domain Archetype: ${strategy?.label || "ANALYTICAL SYNTHESIS"}
Persona & Voice: ${strategy?.expertPersona || "Master Subject Synthesizer"}
Load-Bearing Priority: ${strategy?.loadBearingFocus || "Isolate core breakthrough"}
Pruning Directive: ${strategy?.pruningRule || "Drop secondary filler"}

${strategy?.tailoredDirectives || ""}

═══ THE ONE RULE ═══
Write about the SUBJECT, not about the source. Never "the author explains", "this article covers", "the piece goes on to". Say the thing.
A digest someone reads instead of the original, or it isn't worth generating.

═══ LENGTH ═══
Target 700–900 words of body prose — 3 to 5 minutes.
A 2,000-word source loses two thirds. A 6,000-word source loses nine tenths.
Compression is not summarising every paragraph shorter; it is dropping whole paragraphs and keeping the load-bearing ones intact.

═══ THESIS ═══
One sentence, under 20 words, stating the actual insight — not the topic.
  Bad:  "An overview of how the Black-Scholes formula was developed."
  Good: "The breakthrough wasn't predicting where a stock goes. It was proving you never needed to know."
If there is no insight — a tutorial, a listicle, a product page — say plainly what it teaches. A flat thesis beats a manufactured one.

═══ SECTIONS ═══
3–6. Real headings, never "Introduction" / "Background" / "Conclusion".
1–3 paragraphs each, 40–90 words per paragraph.
Follow the ARGUMENT'S logic, which is often not the source's running order.
Wrap the load-bearing phrase of a paragraph in <strong> — one per paragraph max, for the phrase that carries the idea, not for emphasis.

═══ FIGURES — ONLY WHEN THE STRUCTURE IS REALLY THERE ═══
Zero figures is a valid and common answer. Never fill a quota.
Pick from these, and only when the source genuinely contains the shape:
  relay      — a chain of people or events handing something forward over time
  contrast   — two approaches described in enough detail to draw both
  anatomy    — a thing decomposed into named, ordered parts
  flow       — a sequence with a loop, branch, or feedback step
  scale      — quantities whose RATIO is the point
  inputs     — what a process takes in, and what it notably does not
data must be literal and drawable, pulled from the source. If you cannot populate it from the text, drop the figure. Never invent boxes and arrows to decorate a paragraph.
caption: one line in annotation voice that adds something the figure doesn't say.

For "scale": say whether it is drawn linear or log and why. If the ratio exceeds ~50:1, state that a linear axis makes the small bar invisible. Never compress a scale to look balanced — the disproportion IS the information.

═══ CAST ═══
Only when 4+ named people or organisations each did something distinct.
One line each: what they contributed, not who they were.

═══ TERMS ═══
0–8 pieces of jargon a competent outsider would trip on. Define as used HERE, in one or two sentences. Skip anything the sections already define in passing.

═══ CLAIMS ═══
Every number, statistic, or contested assertion goes in claims[] as { text, verified: false } unless the source itself cites a primary reference. The UI marks these. Laundering a source's claim into a fact is the worst thing this feature can do, so default to unverified.

═══ TAKEAWAY ═══
One or two sentences, under 30 words. The thing worth remembering in six months. A claim, not a recap. If nothing clears that bar, use the single most useful concrete fact instead.

═══ SKIPPED ═══
What you deliberately left out — sponsor reads, self-promotion, tangents, repeated framing. One short line each. This tells the reader what the digest is NOT covering so they can decide whether to read the original anyway.
Only list content occupying more than roughly 5% of the source. Do not invent tangents to look thorough.

═══ NEVER ═══
- Meta-narration of any kind
- "Introduction" / "Overview" / "Key takeaways" as a heading
- A figure where the content has no structure
- A source's claim presented as established fact
- Padding to reach a section, figure, term or word count
- Rewriting the author's opinion into a hedged version of your own
- Numbers, names or quotes not in the source

═══ WHEN THE SOURCE IS THIN ═══
Fewer sections, no figures, a short takeaway, and a line in skipped saying the content was mostly X. A short honest digest is a correct output. Padding is not.`;

    const userPrompt = `AUTONOMOUS DIRECTIVE APPLIED: ${strategy?.label || "GENERAL SYNTHESIS"}
EXPERT PERSONA: ${strategy?.expertPersona || "Master Synthesizer"}

USER PLAN PREFERENCES:
- Include Cast Dossier: ${planOverrides?.includeCast ? "YES" : "NO"}
- Include Figures: ${planOverrides?.includeFigures ? "YES" : "NO"}
- Include Terms Glossary: ${planOverrides?.includeTerms ? "YES" : "NO"}
- Include Claims Audit: ${planOverrides?.includeClaimsAudit ? "YES" : "NO"}
- Include Skipped Disclosure: ${planOverrides?.includeSkippedFooter ? "YES" : "NO"}
- Depth Preference: ${planOverrides?.depth || "standard"}
${planOverrides?.thesisHypothesis ? `- Approved Thesis Direction: ${planOverrides.thesisHypothesis}` : ""}
${planOverrides?.proposedHeadings ? `- Approved Headings: ${planOverrides.proposedHeadings.join(" | ")}` : ""}

SOURCE TEXT:
${clean.slice(0, 18000)}`;

    const { object: digest } = await generateObject({
      model: languageModel(DIGEST_MODEL),
      schema: DigestResultSchema,
      system: systemPrompt,
      prompt: userPrompt,
      ...gatewayProviderOptions(DIGEST_MODEL, ["feature:summarizer-digest"]),
    });

    // Enforce user plan overrides on final payload
    if (planOverrides && planOverrides.includeCast === false) {
      digest.cast = [];
    }
    if (planOverrides && planOverrides.includeFigures === false) {
      digest.figures = [];
    }
    if (planOverrides && planOverrides.includeTerms === false) {
      digest.terms = [];
    }
    if (planOverrides && planOverrides.includeClaimsAudit === false) {
      digest.claims = [];
    }
    if (planOverrides && planOverrides.includeSkippedFooter === false) {
      digest.skipped = [];
    }

    return NextResponse.json({ digest });
  } catch (err) {
    console.error("Summarizer generation failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to synthesize digest." },
      { status: 500 }
    );
  }
}
