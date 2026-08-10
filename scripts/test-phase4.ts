import { fetchLinkPreview } from "../src/lib/til/previewRegistry";

async function testPhase4() {
  console.log("🧪 Testing Phase 4 Link Preview Resolution & SSRF Guard...");

  const testUrls = [
    "https://github.com/drizzle-team/drizzle-orm",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://arxiv.org/abs/2103.00020",
    "https://example.com",
    "http://127.0.0.1:8080/forbidden", // SSRF private IP attempt
  ];

  for (const url of testUrls) {
    console.log(`\nResolving preview for: ${url}`);
    const preview = await fetchLinkPreview(url);
    console.log(`- Provider: ${preview.provider}`);
    console.log(`- Kind: ${preview.kind}`);
    console.log(`- Title: ${preview.title}`);
    console.log(`- Failed: ${preview.failed || false}`);
  }

  console.log("\n✅ PHASE 4 LINK PREVIEW TEST COMPLETE!");
}

if (require.main === module) {
  testPhase4()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Phase 4 test failed:", err);
      process.exit(1);
    });
}
