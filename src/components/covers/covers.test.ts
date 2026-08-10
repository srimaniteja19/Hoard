import { parseCoverData } from "@/lib/cover-data";

export function runCoverRenderTests() {
  const results: { test: string; passed: boolean; details?: string }[] = [];

  // Test 1: REPO CoverData narrowing & fallback
  const repoRaw = {
    kind: "REPO",
    commits52: Array(52).fill(50),
    languages: [["TypeScript", 90], ["CSS", 10]] as [string, number][],
    pushedDaysAgo: 5,
  };
  const parsedRepo = parseCoverData(repoRaw);
  results.push({
    test: "RepoCover data parses and narrows correctly",
    passed: parsedRepo !== null && parsedRepo.kind === "REPO",
  });

  // Test 2: Stale/Archived REPO cover (pushedDaysAgo > 365)
  const repoStaleRaw = {
    kind: "REPO",
    commits52: Array(52).fill(0),
    languages: [["C++", 100]] as [string, number][],
    pushedDaysAgo: 400,
  };
  const parsedStale = parseCoverData(repoStaleRaw);
  const isStale = parsedStale?.kind === "REPO" && parsedStale.pushedDaysAgo > 365;
  results.push({
    test: "Stale REPO cover detects archived state (>365d)",
    passed: isStale,
  });

  // Test 3: ARTICLE CoverData narrowing
  const articleRaw = {
    kind: "ARTICLE",
    paragraphWidths: [100, 90, 80, 70, 60, 50, 40],
    scrollFraction: 0.5,
  };
  const parsedArticle = parseCoverData(articleRaw);
  results.push({
    test: "ArticleCover data parses and narrows correctly",
    passed: parsedArticle !== null && parsedArticle.kind === "ARTICLE",
  });

  // Test 4: Missing/Corrupted data cleanly degrades (returns null -> Hatch fallback)
  const corruptedData = { kind: "REPO", commits52: "corrupted_string" };
  const degraded = parseCoverData(corruptedData);
  results.push({
    test: "Corrupted cover data degrades cleanly to null",
    passed: degraded === null,
  });

  // Test 5: VIDEO CoverData
  const videoRaw = { kind: "VIDEO", chapterOffsets: [0, 0.3, 0.7], watchedFraction: 0.4 };
  const parsedVideo = parseCoverData(videoRaw);
  results.push({ test: "VideoCover data parses correctly", passed: parsedVideo?.kind === "VIDEO" });

  // Test 6: PAPER CoverData
  const paperRaw = { kind: "PAPER", pages: 20, pagesRead: 5 };
  const parsedPaper = parseCoverData(paperRaw);
  results.push({ test: "PaperCover data parses correctly", passed: parsedPaper?.kind === "PAPER" });

  // Test 7: PLAYLIST CoverData
  const playlistRaw = { kind: "PLAYLIST", trackCount: 15, trackLengths: [30, 80, 50] };
  const parsedPlaylist = parseCoverData(playlistRaw);
  results.push({ test: "PlaylistCover data parses correctly", passed: parsedPlaylist?.kind === "PLAYLIST" });

  // Test 8: DOC CoverData
  const docRaw = { kind: "DOC", siblings: ["Intro", "API"], activeIndex: 1 };
  const parsedDoc = parseCoverData(docRaw);
  results.push({ test: "DocCover data parses correctly", passed: parsedDoc?.kind === "DOC" });

  // Test 9: APP CoverData
  const appRaw = { kind: "APP", platforms: ["macOS", "iOS"], pricing: "Free", installed: true };
  const parsedApp = parseCoverData(appRaw);
  results.push({ test: "AppCover data parses correctly", passed: parsedApp?.kind === "APP" });

  console.log("--- Cover Component Unit Tests ---");
  results.forEach((r) => console.log(`${r.passed ? "✓ PASS" : "✕ FAIL"} - ${r.test} ${r.details || ""}`));
  return results.every((r) => r.passed);
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  try {
    runCoverRenderTests();
  } catch (err) {
    console.error("Cover render test failed:", err);
  }
}
