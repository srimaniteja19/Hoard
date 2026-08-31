import { IntakeAnalysis, SourceFormat, FigureKind } from "./types";

export type DomainArchetype =
  | "SYSTEMS_ENGINEERING"
  | "QUANT_FINANCE"
  | "INTELLECTUAL_HISTORY"
  | "SPEECH_TRANSCRIPT"
  | "SCIENTIFIC_RESEARCH"
  | "STRATEGY_ESSAY"
  | "HOW_TO_MANUAL"
  | "GENERAL_INQUIRY";

export interface AutonomousStrategy {
  archetype: DomainArchetype;
  label: string;
  badgeColor: string;
  expertPersona: string;
  loadBearingFocus: string;
  pruningRule: string;
  recommendedFigures: FigureKind[];
  tailoredDirectives: string;
}

/**
 * Autonomously inspects the source text and intake analysis to determine
 * the optimal domain persona, extraction strategy, and tailored prompt directives.
 */
export function determineAutonomousStrategy(
  text: string,
  intake: IntakeAnalysis
): AutonomousStrategy {
  const clean = text.toLowerCase();

  // 1. Transcripts & Speeches
  if (intake.sourceFormat === "TRANSCRIPT" || intake.hasTimestamps || clean.includes("[00:") || clean.includes("host:") || clean.includes("speaker 1:")) {
    return {
      archetype: "SPEECH_TRANSCRIPT",
      label: "CONVERSATIONAL TRANSCRIPT & INTERVIEW",
      badgeColor: "#EC4899",
      expertPersona: "Investigative Editor & Operator",
      loadBearingFocus: "Strip conversational throat-clearing, pleasantries, sponsor reads, and repeated interviewer framing. Extract the raw, unvarnished operational insights, contrarian claims, and practical numbers.",
      pruningRule: "Aggressively drop all host banter, guest biographical intros, sponsor ad-reads, and rhetorical questions. Keep only the core empirical arguments.",
      recommendedFigures: ["contrast", "flow", "scale"],
      tailoredDirectives: `AUTONOMOUS DIRECTIVE FOR CONVERSATIONAL TRANSCRIPT:
- Eliminate all conversational fluff ("you know", "I think", "like I said", "as we discussed").
- State the guest's thesis directly as fact/claim about the world, never "the speaker stated".
- If the conversation discusses unit economics, cost cliffs, or before/after metrics, populate 'scale' or 'contrast'.
- List all sponsor reads and podcast housekeeping in skipped[].`,
    };
  }

  // 2. Quantitative Finance, Risk, & Economics
  if (
    clean.includes("option") ||
    clean.includes("derivative") ||
    clean.includes("hedg") ||
    clean.includes("volatility") ||
    clean.includes("arbitrage") ||
    clean.includes("black-scholes") ||
    clean.includes("portfolio") ||
    clean.includes("capital") ||
    clean.includes("liquidity") ||
    clean.includes("yield")
  ) {
    return {
      archetype: "QUANT_FINANCE",
      label: "QUANTITATIVE FINANCE & RISK MATHEMATICS",
      badgeColor: "#F59E0B",
      expertPersona: "Quantitative Risk Researcher",
      loadBearingFocus: "Identify the mathematical invariant, the parameter that got eliminated, or the risk-neutral mechanism. Focus on why the formula works without predictive forecasting.",
      pruningRule: "Drop human biographical trivia unless it directly explains why an economic paradigm shifted. Drop anecdotal storytelling and focus on structural mechanics.",
      recommendedFigures: ["relay", "scale", "inputs"],
      tailoredDirectives: `AUTONOMOUS DIRECTIVE FOR QUANTITATIVE FINANCE:
- Focus on the mathematical breakthrough: which volatile parameter was eliminated (e.g. expected return) and how dynamic hedging or arbitrage enforces equilibrium.
- If historical lineage of formulas exists across decades, draw a 'relay'.
- Ensure notional dollar amounts, interest rates, and mathematical formulas are flagged in claims[].`,
    };
  }

  // 3. Systems Engineering, AI Architecture & Computing
  if (
    clean.includes("architecture") ||
    clean.includes("transformer") ||
    clean.includes("attention") ||
    clean.includes("gpu") ||
    clean.includes("latency") ||
    clean.includes("tensor") ||
    clean.includes("compiler") ||
    clean.includes("kernel") ||
    clean.includes("distributed") ||
    clean.includes("pipeline") ||
    clean.includes("neural") ||
    clean.includes("llm") ||
    clean.includes("rag")
  ) {
    return {
      archetype: "SYSTEMS_ENGINEERING",
      label: "SYSTEMS ARCHITECTURE & COMPUTING",
      badgeColor: "#00F0FF",
      expertPersona: "Principal Systems Architect",
      loadBearingFocus: "Computational bottlenecks, time/space complexity (e.g. O(n) vs O(1)), parallelization constraints, memory bandwidth limits, and modular subsystem breakdown.",
      pruningRule: "Drop marketing buzzwords, hype framing, and product roadmaps. Preserve concrete algorithmic mechanics, matrix shapes, equations, and throughput figures.",
      recommendedFigures: ["anatomy", "contrast", "flow"],
      tailoredDirectives: `AUTONOMOUS DIRECTIVE FOR SYSTEMS ARCHITECTURE:
- Compare old architectural paradigm vs new mechanism using a 'contrast' or 'anatomy' figure.
- Focus on computational invariants: where serial bottlenecks get converted into parallel matrix operations.
- Define hardware terms (tensor cores, bandwidth, latency, context window) in terms[] only if essential.`,
    };
  }

  // 4. Intellectual History & Chronological Revolutions
  if (intake.dateSpanYears && intake.dateSpanYears > 10 && intake.datesFound.length >= 3) {
    return {
      archetype: "INTELLECTUAL_HISTORY",
      label: "HISTORICAL LINEAGE & IDEA RELAY",
      badgeColor: "#A855F7",
      expertPersona: "Archival Historian of Science & Ideas",
      loadBearingFocus: "The chain of custody: how an idea originated in one domain (e.g. botany), sat forgotten in archives, got rescued, had its fatal flaw repaired, and finally became an industry standard.",
      pruningRule: "Eliminate historical filler and tangential character descriptions. Keep the exact baton passed between each thinker.",
      recommendedFigures: ["relay", "inputs"],
      tailoredDirectives: `AUTONOMOUS DIRECTIVE FOR HISTORICAL LINEAGE:
- Structure the digest chronologically through the key inflection points.
- Map the baton pass explicitly in a 'relay' figure showing Actor, Year, Action, and Baton.
- Highlight the single intellectual pivot where the problem transformed from impossible to solved.`,
    };
  }

  // 5. Scientific Research & Physics / Hardware
  if (
    intake.sourceFormat === "PAPER" ||
    clean.includes("nanometer") ||
    clean.includes("laser") ||
    clean.includes("wavelength") ||
    clean.includes("plasma") ||
    clean.includes("lithography") ||
    clean.includes("optics") ||
    clean.includes("celsius") ||
    clean.includes("physics")
  ) {
    return {
      archetype: "SCIENTIFIC_RESEARCH",
      label: "APPLIED PHYSICS & ADVANCED HARDWARE",
      badgeColor: "#10B981",
      expertPersona: "Senior Applied Physicist & Semiconductor Fellow",
      loadBearingFocus: "Extreme physical constraints (diffraction limits, vacuum absorption, thermal limits), orders of magnitude, precision tolerances, and multi-stage physical reaction sequences.",
      pruningRule: "Drop corporate PR framing and high-level summaries. Keep the literal physical mechanics (droplet frequency, temperature, laser pulse sequences, atomic tolerances).",
      recommendedFigures: ["flow", "scale", "anatomy"],
      tailoredDirectives: `AUTONOMOUS DIRECTIVE FOR APPLIED PHYSICS & HARDWARE:
- If an extreme physical process is described (e.g. laser vaporization, plasma creation), build a step-by-step 'flow'.
- If disproportionate ratios or extreme orders of magnitude exist, build a 'scale' with explicit linear vs log axis explanation.
- State all physical units (nm, °C, metric tons, parts) verbatim and flag in claims[].`,
    };
  }

  // 6. Strategy & Philosophy
  if (clean.includes("strategy") || clean.includes("incentive") || clean.includes("coordination") || clean.includes("game theory") || clean.includes("moat") || clean.includes("monopoly")) {
    return {
      archetype: "STRATEGY_ESSAY",
      label: "STRATEGIC CRITIQUE & INCENTIVE DYNAMICS",
      badgeColor: "#38BDF8",
      expertPersona: "Strategic Critic & Systems Thinker",
      loadBearingFocus: "Incentive structures, principal-agent misalignments, coordination failures, competitive moats, and second-order feedback loops.",
      pruningRule: "Drop rhetorical questions, repeated analogies, and introductory hedging. Keep the structural economic game being played.",
      recommendedFigures: ["contrast", "flow"],
      tailoredDirectives: `AUTONOMOUS DIRECTIVE FOR STRATEGIC ANALYSIS:
- Focus on the core dialectic or counterintuitive thesis.
- Contrast naive assumption vs real incentive structure using 'contrast'.
- Highlight the single takeaway that survives a 6-month test.`,
    };
  }

  // 7. General Default
  return {
    archetype: "GENERAL_INQUIRY",
    label: "ANALYTICAL SYNTHESIS",
    badgeColor: "#FFE600",
    expertPersona: "Master Subject Synthesizer",
    loadBearingFocus: "Isolate the primary insight, drop secondary filler, structure by argument logic, and keep load-bearing sentences intact.",
    pruningRule: "Drop generic framing, meta-narratives, and repetitive examples.",
    recommendedFigures: ["contrast", "anatomy"],
    tailoredDirectives: `AUTONOMOUS DIRECTIVE FOR GENERAL ANALYSIS:
- Write strictly about the subject, never the author.
- Find the single load-bearing phrase of each paragraph and wrap in <strong>.
- Flag all numbers and statistics in claims[].`,
  };
}
