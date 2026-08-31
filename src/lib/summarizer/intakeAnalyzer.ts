import { IntakeAnalysis, SourceFormat, CandidateFigureProposal, FigureKind } from "./types";
import { determineAutonomousStrategy } from "./autonomousPrompt";

/**
 * Fast real-time intake analyzer for source text (<5ms execution time)
 */
export function analyzeIntake(text: string): IntakeAnalysis {
  const clean = text.trim();
  if (!clean) {
    return {
      wordCount: 0,
      charCount: 0,
      readMinutesSource: 0,
      targetWordCount: 800,
      targetReadMinutes: 4,
      reductionPercentage: 0,
      sourceFormat: "PROSE",
      namedEntities: [],
      datesFound: [],
      numberCount: 0,
      candidateFigures: [],
      hasTimestamps: false,
      paragraphsCount: 0,
    };
  }

  // 1. Word & Character counts
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = clean.length;
  const readMinutesSource = Math.max(1, Math.round(wordCount / 220)); // Average reading speed: 220 wpm

  // Target digest prose is 700–900 words (~4 mins)
  const targetWordCount = wordCount < 900 ? Math.max(300, Math.round(wordCount * 0.6)) : 800;
  const targetReadMinutes = Math.max(2, Math.round(targetWordCount / 200));

  // Compression reduction percentage
  const reductionPercentage = wordCount > 0 ? Math.min(95, Math.max(0, Math.round(((wordCount - targetWordCount) / wordCount) * 100))) : 0;

  // 2. Format Detection (Transcript vs Academic Paper vs Article vs Prose)
  const timestampRegex = /(\b\d{1,2}:\d{2}(?::\d{2})?\b|\[\d{1,2}:\d{2}\]|\(\d{1,2}:\d{2}\))/g;
  const timestamps = clean.match(timestampRegex) || [];
  const hasTimestamps = timestamps.length >= 3;

  const academicKeywords = /\b(abstract|doi:|arxiv|references|methodology|et al\.|fig\.\s*\d+|theorem|corollary|lemma)\b/i;
  const isAcademic = academicKeywords.test(clean) && wordCount > 300;

  let sourceFormat: SourceFormat = "PROSE";
  if (hasTimestamps) {
    sourceFormat = "TRANSCRIPT";
  } else if (isAcademic) {
    sourceFormat = "PAPER";
  } else if (clean.includes("http") || clean.includes("By ") || clean.includes("Published:")) {
    sourceFormat = "ARTICLE";
  } else if (wordCount > 1500) {
    sourceFormat = "ESSAY";
  }

  // 3. Named Entities Extraction (Heuristic for names / institutions)
  const namePatterns = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
  const potentialNames = new Set<string>();
  let match: RegExpExecArray | null;

  // Blacklist common capitalized title words
  const titleBlacklist = new Set([
    "The", "This", "That", "These", "Those", "When", "Where", "What", "Why", "How",
    "First", "Second", "Third", "Then", "After", "Before", "While", "During", "Every",
    "Section", "Chapter", "Figure", "Table", "However", "Therefore", "Moreover", "Furthermore",
    "In", "On", "At", "By", "For", "With", "About", "Against", "Between", "Into", "Through"
  ]);

  while ((match = namePatterns.exec(clean)) !== null) {
    const candidate = match[1];
    const firstWord = candidate.split(" ")[0];
    if (!titleBlacklist.has(firstWord) && candidate.length > 5) {
      potentialNames.add(candidate);
    }
  }

  const namedEntities = Array.from(potentialNames).slice(0, 15);

  // 4. Dates & Year Clustering
  const yearRegex = /\b(1[6-9]\d{2}|20[0-2]\d)\b/g;
  const years = (clean.match(yearRegex) || []).map(Number);
  const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b);
  const datesFound = uniqueYears.map(String);
  let dateSpanYears: number | undefined;

  if (uniqueYears.length >= 2) {
    dateSpanYears = uniqueYears[uniqueYears.length - 1] - uniqueYears[0];
  }

  // 5. Number and statistic counting
  const numberRegex = /\b(?:\d+(?:,\d+)*(?:\.\d+)?%?|\$\d+(?:,\d+)*(?:\.\d+)?|\d+\s*(?:billion|million|trillion|x|nm|ghz|gb|tb|mph|kg|m|cm|mm|oz|tons))\b/gi;
  const numbersFound = clean.match(numberRegex) || [];
  const numberCount = numbersFound.length;

  // 6. Candidate Figure Scoring with Structural Evidence
  const candidateFigures: CandidateFigureProposal[] = [];

  // A. Relay: Chain across time or multiple people handing something forward
  if ((uniqueYears.length >= 3 && dateSpanYears && dateSpanYears > 5) || (namedEntities.length >= 4 && uniqueYears.length >= 2)) {
    candidateFigures.push({
      kind: "relay",
      confidence: 0.92,
      evidence: `Found ${namedEntities.length} named actors across ${uniqueYears.length} dated moments (${dateSpanYears ? `${dateSpanYears} years` : "timeline"}) handing the idea forward.`,
    });
  }

  // B. Contrast: Two distinct approaches or paradigms
  const contrastKeywords = /\b(in contrast|versus|vs\.?|unlike|on the other hand|traditional approach|old paradigm|compared to|alternative|divergence|competing)\b/gi;
  const contrastMatches = clean.match(contrastKeywords) || [];
  if (contrastMatches.length >= 2) {
    candidateFigures.push({
      kind: "contrast",
      confidence: 0.85,
      evidence: `Found explicit structural comparison keywords (${contrastMatches.slice(0, 3).join(", ")}) comparing two distinct paradigms.`,
    });
  }

  // C. Anatomy: Decomposition into named, ordered parts or layers
  const anatomyKeywords = /\b(architecture|consists of|components|layers|modules|three parts|four stages|subsystems|pipeline|structure)\b/gi;
  const anatomyMatches = clean.match(anatomyKeywords) || [];
  if (anatomyMatches.length >= 2 || clean.includes("1.") || clean.includes("Step 1")) {
    candidateFigures.push({
      kind: "anatomy",
      confidence: 0.78,
      evidence: `Found architectural decomposition markers identifying modular ordered subsystems.`,
    });
  }

  // D. Flow: Sequence with feedback loop or branching
  const flowKeywords = /\b(feedback loop|iterative|cycles back|branches|if.*then|returns to|downstream|upstream|pipeline)\b/gi;
  const flowMatches = clean.match(flowKeywords) || [];
  if (flowMatches.length >= 2) {
    candidateFigures.push({
      kind: "flow",
      confidence: 0.74,
      evidence: `Found sequence loop / branch signals indicating cyclical process flow.`,
    });
  }

  // E. Scale: Extreme ratios or orders of magnitude (>50:1 or millions/billions)
  const scaleKeywords = /\b(orders of magnitude|ratio of|\d+x|\d+:\d+|billion|trillion|nanometer|exponential|disproportion)\b/gi;
  const scaleMatches = clean.match(scaleKeywords) || [];
  if (scaleMatches.length >= 2 || numbersFound.some((n) => /billion|trillion|\d{4,}/i.test(n))) {
    candidateFigures.push({
      kind: "scale",
      confidence: 0.81,
      evidence: `Found extreme quantitative ratios and order-of-magnitude metrics suitable for linear/log comparison.`,
    });
  }

  // F. Inputs: Ingested vs Excluded criteria
  const inputsKeywords = /\b(takes as input|ignores|discards|does not require|requires only|filters out|unnecessary)\b/gi;
  const inputsMatches = clean.match(inputsKeywords) || [];
  if (inputsMatches.length >= 2) {
    candidateFigures.push({
      kind: "inputs",
      confidence: 0.70,
      evidence: `Found structural delineation between required inputs and explicitly eliminated inputs.`,
    });
  }

  // Sort candidate figures by confidence
  candidateFigures.sort((a, b) => b.confidence - a.confidence);

  // Paragraph count
  const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim().length > 20);
  const paragraphsCount = Math.max(1, paragraphs.length);

  const partialIntake = {
    wordCount,
    charCount,
    readMinutesSource,
    targetWordCount,
    targetReadMinutes,
    reductionPercentage,
    sourceFormat,
    namedEntities,
    datesFound,
    dateSpanYears,
    numberCount,
    candidateFigures,
    hasTimestamps,
    paragraphsCount,
  };

  const strategy = determineAutonomousStrategy(clean, partialIntake);

  return {
    ...partialIntake,
    strategy,
  };
}
