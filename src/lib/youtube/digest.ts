import { z } from "zod";
import { generateText, streamText, Output, smoothStream } from "ai";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { fetchYouTubeTranscript, YouTubeTranscriptResult } from "./transcript";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";

export const DIGEST_SYSTEM = `You turn a transcript into a structured digest. You return one JSON object and nothing else — no markdown, no code fences, no preamble.

OUTPUT SHAPE
{
  title, thesis, readMinutes,
  figures: [{ id, kind, caption, data }],
  stats: [{ value, label, claimed }],
  sections: [{ n, heading, timestamp, paragraphs: [], figureId?, handNote? }],
  chapters: [{ timestamp, title }],
  terms: [{ term, definition }],
  corrections: [{ heard, actual, count, confidence }],
  takeaway,
  skipped: []
}

═══ THE ONE RULE ═══
The digest replaces watching, or it isn't worth generating. Someone who reads it should be able to explain the subject to a colleague. Someone who reads a description of the video cannot.
Write about the SUBJECT, not about the video. Never "the speaker explains that…", "this video covers…", "he goes on to discuss…". Say the thing.

═══ TITLE AND THESIS ═══
title: 3-7 words naming what the thing IS, not what the video is called. Never reuse the video's title — that's already on screen above your output.
thesis: one sentence, under 20 words, stating the actual insight. Not a topic sentence, not a summary of scope.
  Bad:  "An overview of SQLite's architecture and history."
  Good: "Delete the server and the database stops being infrastructure. It becomes a file."
If the content has no insight — it's a tutorial, a listicle, a product demo — say what it teaches in plain terms instead of manufacturing profundity. A flat thesis beats a fake one.

═══ SECTIONS ═══
3-7 sections. Each has a real heading (not "Introduction", "Background", "Conclusion") and the timestamp where it begins.
1-3 paragraphs each, 40-90 words per paragraph.
Sections follow the argument's logic, which is often not the video's running order. Reorder freely; the timestamp stays attached to where the material actually appears.
Wrap the load-bearing phrase of a paragraph in <strong>. One per paragraph, at most. It's for the phrase that carries the idea, not for emphasis.
handNote (optional, one per section max): a short line in the voice of someone annotating a page — an aside, a reframe, a reaction. Under 15 words, lowercase, no full stop. Omit rather than force one.

═══ FIGURES — THE HARD PART ═══
Generate a figure ONLY when the content contains structure a picture shows better than a sentence. Zero figures is a valid and common answer. Never hit a quota.

Allowed kinds, and what each requires the source to contain:
  contrast   — two systems/approaches described in enough detail to draw both
  anatomy    — a thing decomposed into named, ordered parts
  tree       — an actual hierarchy with named levels
  flow       — a sequence with a loop, branch, or feedback step
  scale      — two or more quantities whose RATIO is the point
  timeline   — dated events with causal links between them

If the material doesn't contain one of these, return figures: []. Do not invent boxes and arrows to decorate a paragraph.

data must be literal, drawable content pulled from the source — node labels, part names, quantities with units, step names. Not a description of what the figure would show. If you can't populate data from the transcript, drop the figure.

caption: one line in annotation voice that adds something the figure doesn't already say.
  Bad:  "Diagram of the two architectures"
  Good: "the server didn't get faster — it got deleted"

For kind "scale": include a scaleNote saying whether it is drawn linear or log and why. If the ratio exceeds ~50:1, say plainly that a linear axis would make the small bar invisible. Never compress a scale to make it look balanced — the disproportion is the information.

═══ STATS ═══
0-5 numbers, only ones that carry meaning. Skip round numbers with no comparison attached.
claimed: true when the figure is asserted by the source and not independently established — which is most of them. The UI marks these. Getting this wrong launders a claim into a fact, so default to true.
Never state a number to more precision than the source gives.

═══ CORRECTIONS ═══
Machine captions mangle exactly the words that matter most: names, acronyms, product names, technical terms.
Scan for them. Correct only where context makes the intent unambiguous.
  heard: the transcript's version. actual: the correction. count: occurrences. confidence: "certain" | "likely".
Never silently fix — every correction is surfaced to the reader.
Never correct a claim, a number, or an opinion. Only names and terms. If the speaker says something factually wrong, that stays; it is what they said.
If uncertain, leave it and add nothing.

═══ CHAPTERS AND TERMS ═══
chapters: 4-9, from the source's actual structure, each with a real timestamp. Titles name content, not position.
terms: 0-8 jargon items a competent outsider would stumble on. Define them as used HERE, in one or two sentences. Skip anything the sections already define in passing.

═══ TAKEAWAY ═══
One or two sentences, under 30 words. The thing worth remembering in six months, not a recap.
It must be a claim, not a summary. If nothing survives that bar, use the most useful concrete fact instead.

═══ SKIPPED ═══
List what you deliberately left out — sponsor reads, self-promotion, tangents, repeated material. One short line each. This is not a failure log; it tells the reader what the digest is NOT covering so they know whether to watch anyway.

═══ NEVER ═══
- Meta-narration of any kind ("in this section", "as mentioned earlier", "the video argues")
- "Introduction" / "Conclusion" / "Overview" / "Key takeaways" as a heading
- Inventing a figure where the content has no structure
- Presenting a source's claim as established fact
- Padding to reach a section, figure, term, or stat count
- Rewriting the speaker's opinion into your own hedged version
- Numbers, names, or quotes that do not appear in the transcript

═══ WHEN THE SOURCE IS THIN ═══
Some transcripts contain very little. Say so: fewer sections, no figures, a short takeaway, and a line in skipped noting the content was mostly X. A short honest digest is a correct output. Padding one is not.

BEFORE RETURNING
Check: does every figure's data come from the transcript? Is every claimed number marked? Does any sentence describe the video rather than the subject? Would someone who read only this be able to explain it?`;

export interface DigestFigure {
  id: string;
  kind: "contrast" | "anatomy" | "tree" | "flow" | "scale" | "timeline";
  caption: string;
  data: any;
  scaleNote?: string;
}

export interface DigestStat {
  value: string;
  label: string;
  claimed?: boolean;
}

export interface DigestSection {
  n: number;
  heading: string;
  timestamp: string;
  paragraphs: string[];
  figureId?: string;
  handNote?: string;
}

export interface DigestChapter {
  timestamp: string;
  title: string;
}

export interface DigestTerm {
  term: string;
  definition: string;
}

export interface DigestCorrection {
  heard: string;
  actual: string;
  count?: number;
  confidence?: "certain" | "likely";
}

export interface DigestJson {
  title: string;
  thesis: string;
  readMinutes: number;
  figures?: DigestFigure[];
  stats?: DigestStat[];
  sections: DigestSection[];
  chapters?: DigestChapter[];
  terms?: DigestTerm[];
  corrections?: DigestCorrection[];
  takeaway: string;
  skipped?: string[];
}

export const DIGEST_MODEL = "google/gemini-3.5-flash";

/**
 * Format structured JSON digest to clean markdown for export / copying.
 */
export function formatDigestJsonToMarkdown(d: DigestJson): string {
  const parts: string[] = [];

  parts.push(`# ${d.title}\n`);
  parts.push(`> **THE THESIS:** ${d.thesis}\n`);

  if (d.stats && d.stats.length > 0) {
    parts.push(`---\n\n### ✦ KEY METRICS & NUMBERS`);
    for (const stat of d.stats) {
      parts.push(`- **${stat.value}** — ${stat.label}${stat.claimed ? " *(claimed)*" : ""}`);
    }
    parts.push("");
  }

  if (d.sections && d.sections.length > 0) {
    parts.push(`---\n\n### ✦ CORE BREAKDOWN & CHAPTERS\n`);
    for (const sec of d.sections) {
      const numStr = String(sec.n).padStart(2, "0");
      parts.push(`#### ${numStr}. ${sec.heading} \`[${sec.timestamp}]\``);
      for (const p of sec.paragraphs) {
        // Strip <strong> for markdown or keep **
        const mdP = p.replace(/<\/?strong>/gi, "**");
        parts.push(`${mdP}\n`);
      }
      if (sec.handNote) {
        parts.push(`*handnote: ${sec.handNote}*\n`);
      }
    }
  }

  if (d.terms && d.terms.length > 0) {
    parts.push(`---\n\n### ✦ GLOSSARY OF CORE CONCEPTS`);
    for (const t of d.terms) {
      parts.push(`- **${t.term}**: ${t.definition}`);
    }
    parts.push("");
  }

  if (d.takeaway) {
    parts.push(`---\n\n:::hand\n**WHAT TO ACTUALLY REMEMBER:**\n${d.takeaway}\n:::`);
  }

  if (d.skipped && d.skipped.length > 0) {
    parts.push(`\n---\n\n### ✦ DELIBERATELY OMITTED`);
    for (const s of d.skipped) {
      parts.push(`- ${s}`);
    }
  }

  return parts.join("\n");
}

/**
 * Stream a structured JSON digest for a YouTube video using Vercel AI SDK.
 */
export async function streamYouTubeDigest(
  urlOrId: string,
  options?: { lang?: string }
) {
  const videoId =
    urlOrId.length === 11 && !urlOrId.includes("/")
      ? urlOrId
      : extractYouTubeVideoId(urlOrId);

  if (!videoId) {
    throw new Error("Invalid YouTube URL or Video ID");
  }

  const transcriptResult: YouTubeTranscriptResult | null = await fetchYouTubeTranscript(
    videoId,
    { lang: options?.lang || "en" }
  );

  const videoTitle = transcriptResult?.title || "YouTube Video";
  const videoAuthor = transcriptResult?.author || "YouTube Channel";
  const durationSec = transcriptResult?.durationSec || 300;
  const durationMin = Math.max(1, Math.ceil(durationSec / 60));
  const hasCues = Boolean(transcriptResult?.cues && transcriptResult.cues.length > 0);

  const transcriptExcerpt = hasCues
    ? transcriptResult!.markdownWithTimestamps.slice(0, 45000)
    : "";

  const userPrompt = hasCues
    ? `VIDEO TITLE: ${videoTitle}
AUTHOR / CHANNEL: ${videoAuthor}
DURATION: ~${durationMin} minutes (${durationSec}s)
WORD COUNT: ${transcriptResult?.wordCount || 0} words
SOURCE: ${transcriptResult?.isAutoGenerated ? "Auto-Generated Captions" : "Human Subtitles"}

TRANSCRIPT CONTENT:
${transcriptExcerpt}`
    : `VIDEO TITLE: ${videoTitle}
AUTHOR / CHANNEL: ${videoAuthor}
YOUTUBE URL: https://www.youtube.com/watch?v=${videoId}
DURATION: ~${durationMin} minutes (${durationSec}s)
DESCRIPTION & SUMMARY:
${transcriptResult?.description || "Technical video on YouTube"}

Analyze this video in depth and output the complete structured JSON digest according to the instructions.`;

  const stream = streamText({
    model: languageModel(DIGEST_MODEL),
    system: DIGEST_SYSTEM,
    prompt: userPrompt,
    experimental_transform: smoothStream({ chunking: "word", delayInMs: 5 }),
    maxRetries: 0,
    providerOptions: gatewayProviderOptions(DIGEST_MODEL, ["feature:youtube-digest"]),
  });

  return {
    stream,
    meta: {
      videoId,
      title: videoTitle,
      author: videoAuthor,
      durationSec,
      hasCues,
      cuesCount: transcriptResult?.cues.length || 0,
      wordCount: transcriptResult?.wordCount || 0,
      rawTranscript: transcriptResult?.markdownWithTimestamps || "",
    },
  };
}

/**
 * Generate structured JSON digest directly.
 */
export async function generateYouTubeDigest(
  urlOrId: string,
  options?: { lang?: string }
): Promise<DigestJson> {
  const videoId =
    urlOrId.length === 11 && !urlOrId.includes("/")
      ? urlOrId
      : extractYouTubeVideoId(urlOrId);

  if (!videoId) {
    throw new Error("Invalid YouTube URL or Video ID");
  }

  const transcriptResult: YouTubeTranscriptResult | null = await fetchYouTubeTranscript(
    videoId,
    { lang: options?.lang || "en" }
  );

  const videoTitle = transcriptResult?.title || "YouTube Video";
  const videoAuthor = transcriptResult?.author || "YouTube Channel";
  const durationSec = transcriptResult?.durationSec || 300;
  const durationMin = Math.max(1, Math.ceil(durationSec / 60));
  const hasCues = Boolean(transcriptResult?.cues && transcriptResult.cues.length > 0);

  const transcriptExcerpt = hasCues
    ? transcriptResult!.markdownWithTimestamps.slice(0, 45000)
    : "";

  const userPrompt = hasCues
    ? `VIDEO TITLE: ${videoTitle}
AUTHOR / CHANNEL: ${videoAuthor}
DURATION: ~${durationMin} minutes (${durationSec}s)
WORD COUNT: ${transcriptResult?.wordCount || 0} words
SOURCE: ${transcriptResult?.isAutoGenerated ? "Auto-Generated Captions" : "Human Subtitles"}

TRANSCRIPT CONTENT:
${transcriptExcerpt}`
    : `VIDEO TITLE: ${videoTitle}
AUTHOR / CHANNEL: ${videoAuthor}
YOUTUBE URL: https://www.youtube.com/watch?v=${videoId}
DURATION: ~${durationMin} minutes (${durationSec}s)
DESCRIPTION & SUMMARY:
${transcriptResult?.description || "Technical video on YouTube"}

Analyze this video in depth and output the complete structured JSON digest.`;

  try {
    const result = await generateText({
      model: languageModel(DIGEST_MODEL),
      system: DIGEST_SYSTEM,
      prompt: userPrompt,
      maxRetries: 0,
      providerOptions: gatewayProviderOptions(DIGEST_MODEL, ["feature:youtube-digest"]),
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON response from AI");
    }

    return JSON.parse(jsonMatch[0]) as DigestJson;
  } catch (error) {
    console.error("[generateYouTubeDigest error]", error);
    throw new Error(gatewayErrorMessage(error));
  }
}
