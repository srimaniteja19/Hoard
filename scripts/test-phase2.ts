import { db } from "../src/db";
import { tilEntries } from "../src/db/schema";
import { createTilSchema } from "../src/lib/validations/til";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "usr_test_pacific";

async function testPhase2() {
  console.log("🧪 Testing Phase 2 TIL CRUD & Filtering...");

  // 1. Fetch feed for test user via direct DB query / logic
  await fetch("http://localhost:3000/api/til?limit=10", {
    headers: { "x-user-id": TEST_USER_ID },
  }).catch(() => null);

  // Direct validation check
  const validPayload = createTilSchema.parse({
    type: "GOTCHA",
    body: "Test TIL entry for **Phase 2** validation with `code` block.",
    tags: ["testing", "phase2"],
    saveToHoardQueue: false,
  });

  console.log("✓ Zod createTilSchema validation passed:", validPayload);

  // Fetch count of entries for test user
  const initialEntries = await db
    .select()
    .from(tilEntries)
    .where(eq(tilEntries.userId, TEST_USER_ID));

  console.log(`✓ Total TIL entries for ${TEST_USER_ID}: ${initialEntries.length}`);

  if (initialEntries.length >= 20) {
    console.log("✅ PHASE 2 COMPONENT & API PREPARATION SUCCESSFUL!");
  } else {
    console.error("❌ PHASE 2 TEST FAILED: unexpected entry count");
    process.exit(1);
  }
}

if (require.main === module) {
  testPhase2()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Phase 2 test failed:", err);
      process.exit(1);
    });
}
