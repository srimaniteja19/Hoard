import { cleanTitle, isGenericTitle, extractTitleFromUrl, sanitizeTitleText } from "../src/lib/cleanTitle";

function assertEqual(actual: string, expected: string, testName: string) {
  if (actual === expected) {
    console.log(`✓ PASS: ${testName} -> "${actual}"`);
  } else {
    console.error(`✕ FAIL: ${testName}\n  Expected: "${expected}"\n  Got:      "${actual}"`);
    process.exitCode = 1;
  }
}

console.log("=== Running cleanTitle Unit Tests ===");

// Test 1: Query parameters in title
assertEqual(
  cleanTitle("How the heck do solar panels work?utm source=substack&utm medium=email", "https://perthirtythree.com/how-the-heck-do-solar-panels-work"),
  "How the heck do solar panels work",
  "Strip UTM query params attached to title"
);

// Test 2: Generic "New Bookmark" title with valid URL slug
assertEqual(
  cleanTitle("New Bookmark", "https://perthirtythree.com/p/how-the-heck-do-solar-panels-work?utm_source=substack&utm_medium=email"),
  "How The Heck Do Solar Panels Work",
  "Replace 'New Bookmark' with extracted slug title"
);

// Test 3: Generic "Untitled" title with GitHub URL
assertEqual(
  cleanTitle("Untitled", "https://github.com/nitinbollam/Cosmos"),
  "nitinbollam/Cosmos",
  "Format GitHub URL as owner/repo"
);

// Test 4: HTML entities in title
assertEqual(
  cleanTitle("DevOps &amp; Linux &quot;Labs&quot; &#39;2024&#39;", "https://escbash.com"),
  "DevOps & Linux \"Labs\" '2024'",
  "Decode HTML entities"
);

// Test 5: Trailing site branding suffix
assertEqual(
  cleanTitle("How Solar Energy Operates | Substack", "https://substack.com"),
  "How Solar Energy Operates",
  "Strip trailing site suffix branding"
);

// Test 6: arXiv URL fallback
assertEqual(
  cleanTitle("404 Not Found", "https://arxiv.org/abs/2005.11401"),
  "arXiv:2005.11401",
  "Extract arXiv paper ID from URL"
);

// Test 7: YouTube Video URL fallback
assertEqual(
  cleanTitle("Home Page", "https://www.youtube.com/watch?v=kCc8FmEb1nY"),
  "YouTube Video (kCc8FmEb1nY)",
  "Extract YouTube video ID fallback"
);

console.log("\nAll cleanTitle tests finished successfully.");
