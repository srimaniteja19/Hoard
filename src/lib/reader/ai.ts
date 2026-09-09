import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, TRIAGE_MODEL } from "@/lib/ai/models";
import { ReaderBlock, ReaderCategoryKey } from "@/types/reader";

const CategorisationSchema = z.object({
  category: z
    .enum(["ai", "eng", "craft", "prod", "mkt", "essay", "unsorted"])
    .describe(
      "The derived category for the newsletter issue. 'unsorted' is a valid and expected option when uncertain."
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Honest confidence level from 0.0 to 1.0. A score below 0.6 will be presented as a guess/uncertain to the reader."
    ),
  reasoning: z
    .string()
    .describe("Brief 1-sentence explanation of the categorisation decision."),
});

/**
 * AI Categorisation for an issue based on sender, subject, and dek.
 * Returns honest confidence (below 0.6 is rendered as uncertain with a ?).
 */
export async function categoriseIssue(
  sender: string,
  subject: string,
  dek: string
): Promise<{ category: ReaderCategoryKey; confidence: number; reasoning: string }> {
  try {
    const prompt = `You are an editorial librarian categorising arriving newsletter issues for an executive reader.
Available categories:
- 'ai': AI & Models, LLMs, neural networks, machine learning architectures.
- 'eng': Software engineering, systems architecture, backend, performance, infrastructure.
- 'craft': Career & Craft, engineering leadership, seniority, tradecraft, professional workflows.
- 'prod': Product & Design, UI/UX, product strategy, digital tools.
- 'mkt': Markets, finance, stocks, economy, business models.
- 'essay': Essays & Culture, longform commentary, sociology, internet commons, humanities.
- 'unsorted': Miscellaneous or when the material does not clearly align with any primary category.

IMPORTANT RULES:
- Return confidence HONESTLY. If ambiguous or unclear, provide a lower confidence score (e.g. 0.25 - 0.55).
- NEVER force an arbitrary guess just to avoid 'unsorted'. 'unsorted' is completely valid and encouraged when unsure.

Newsletter details:
Sender: ${sender}
Subject: ${subject}
Dek (Summary): ${dek}`;

    const { object } = await generateObject({
      model: languageModel(TRIAGE_MODEL),
      schema: CategorisationSchema,
      prompt,
    });

    return object;
  } catch (error) {
    console.warn("AI categorisation fallback due to error:", error);
    // Rule-based honest fallback
    const text = `${sender} ${subject} ${dek}`.toLowerCase();
    if (/\b(llm|transformer|gpt|ai|model|inference|neural)\b/.test(text)) {
      return { category: "ai", confidence: 0.85, reasoning: "Matched AI/model terms" };
    }
    if (/\b(routing|cache|rate limiter|pipeline|system|database|postgres)\b/.test(text)) {
      return { category: "eng", confidence: 0.8, reasoning: "Matched engineering terms" };
    }
    if (/\b(senior|career|job|engineer|tradeoff)\b/.test(text)) {
      return { category: "craft", confidence: 0.75, reasoning: "Matched career terms" };
    }
    if (/\b(product|design|ux|hyperpersonalization|software)\b/.test(text)) {
      return { category: "prod", confidence: 0.7, reasoning: "Matched product terms" };
    }
    if (/\b(stocks|market|invest|funds|ipo|economy)\b/.test(text)) {
      return { category: "mkt", confidence: 0.8, reasoning: "Matched market terms" };
    }
    if (/\b(culture|commons|liberalism|essay|attention)\b/.test(text)) {
      return { category: "essay", confidence: 0.75, reasoning: "Matched essay terms" };
    }

    // Default honest unsorted
    return {
      category: "unsorted",
      confidence: 0.35,
      reasoning: "Ambiguous subject without clear category markers",
    };
  }
}

const ClaimsSuggestionSchema = z.object({
  claims: z.array(
    z.object({
      quote: z.string().describe("Exact or near-exact salient sentence from the body."),
      potentialReason: z
        .string()
        .describe("A suggested hook or observation (never auto-saved; user must write reason)."),
    })
  ),
});

/**
 * Suggests 1-3 candidate claims from an article's body blocks.
 * They are suggestions only and land in a review strip.
 */
export async function suggestClaims(
  blocks: ReaderBlock[]
): Promise<Array<{ quote: string; potentialReason: string }>> {
  try {
    const textPassages = blocks
      .map((b) => {
        if (b.type === "p") return `${b.lede} ${b.rest}`;
        if (b.type === "h") return `Heading: ${b.text}`;
        return "";
      })
      .filter(Boolean)
      .slice(0, 15)
      .join("\n\n");

    if (!textPassages) return [];

    const prompt = `Identify 1 to 3 provocative, insightful, or foundational claims from the following newsletter text.
Each should be a sharp observation or counter-intuitive truth.

Text:
${textPassages}`;

    const { object } = await generateObject({
      model: languageModel(TRIAGE_MODEL),
      schema: ClaimsSuggestionSchema,
      prompt,
    });

    return object.claims.slice(0, 3);
  } catch (err) {
    console.warn("AI suggestClaims failed, returning empty suggestions:", err);
    return [];
  }
}
