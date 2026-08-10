import {
  coverDataSchema,
  parseCoverData,
  enrichRepoCoverData,
  enrichArticleCoverData,
  enrichCoverData,
} from "./cover-data";

export async function runCoverDataTests() {
  const results: { test: string; passed: boolean; details?: string }[] = [];

  // Test 1: Valid REPO coverData validation
  const validRepo = {
    kind: "REPO",
    commits52: Array(52).fill(25),
    languages: [["TypeScript", 85], ["Rust", 15]] as [string, number][],
    pushedDaysAgo: 2,
  };
  const parsedRepo = coverDataSchema.safeParse(validRepo);
  results.push({ test: "valid REPO coverData Schema parse", passed: parsedRepo.success });

  // Test 2: Valid ARTICLE coverData validation
  const validArticle = {
    kind: "ARTICLE",
    paragraphWidths: [90, 85, 70, 95, 60],
    scrollFraction: 0.25,
  };
  const parsedArticle = coverDataSchema.safeParse(validArticle);
  results.push({ test: "valid ARTICLE coverData Schema parse", passed: parsedArticle.success });

  // Test 3: Invalid shape fallback (safeParse)
  const invalidShape = { kind: "REPO", commits52: "not-an-array" };
  const safeResult = parseCoverData(invalidShape);
  results.push({ test: "invalid shape returns null without throwing", passed: safeResult === null });

  // Test 4: enrichRepoCoverData
  const repoData = await enrichRepoCoverData("https://github.com/facebook/react");
  const repoValid = repoData.kind === "REPO" && Array.isArray(repoData.commits52) && repoData.commits52.length <= 52;
  results.push({ test: "enrichRepoCoverData produces valid REPO object", passed: repoValid, details: `langs: ${JSON.stringify(repoData.kind === "REPO" ? repoData.languages : [])}` });

  // Test 5: enrichArticleCoverData
  const artData = await enrichArticleCoverData("https://example.com/blog", "<p>This is paragraph one with enough text to parse.</p><p>This is paragraph two with some details.</p>");
  const artValid = artData.kind === "ARTICLE" && Array.isArray(artData.paragraphWidths);
  results.push({ test: "enrichArticleCoverData produces valid ARTICLE object", passed: artValid });

  // Test 6: enrichCoverData router
  const universal = await enrichCoverData("https://github.com/vercel/next.js", "GIT");
  results.push({ test: "enrichCoverData router maps GIT to REPO", passed: universal?.kind === "REPO" });

  console.log("--- Cover Data Unit Tests ---");
  results.forEach((r) => console.log(`${r.passed ? "✓ PASS" : "✕ FAIL"} - ${r.test} ${r.details || ""}`));
  return results.every((r) => r.passed);
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  runCoverDataTests().catch((err) => console.error("Cover data test failed:", err));
}
