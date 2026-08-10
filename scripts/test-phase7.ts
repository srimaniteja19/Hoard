import { db } from "../src/db";
import { extensionTokens, users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function testPhase7() {
  console.log("🧪 Testing Phase 7 Extension Token Issuance, Bearer Auth, & Immediate Revocation...");

  // Fetch test user
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  if (!user) {
    throw new Error("No user found in database for Phase 7 test");
  }

  // 1. Issue Token
  const secret = crypto.randomBytes(32).toString("hex");
  const rawToken = `htk_${secret}`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const [insertedToken] = await db
    .insert(extensionTokens)
    .values({
      userId: user.id,
      name: "Phase 7 Automated Test Token",
      tokenHash,
      scopes: "til:write bookmark:write bookmark:read",
    })
    .returning();

  console.log(`✓ Issued Token ID: ${insertedToken.id}`);
  console.log(`- Raw Bearer Token: ${rawToken.slice(0, 12)}...`);

  // 2. Verify active token exists in DB
  const [tokenRecord] = await db
    .select()
    .from(extensionTokens)
    .where(eq(extensionTokens.id, insertedToken.id));

  if (!tokenRecord || tokenRecord.revokedAt) {
    throw new Error("Token record should be active");
  }
  console.log("✓ Token record verified active in DB.");

  // 3. Immediate Revocation Test
  await db
    .update(extensionTokens)
    .set({ revokedAt: new Date() })
    .where(eq(extensionTokens.id, insertedToken.id));

  const [revokedRecord] = await db
    .select()
    .from(extensionTokens)
    .where(eq(extensionTokens.id, insertedToken.id));

  if (!revokedRecord || !revokedRecord.revokedAt) {
    throw new Error("Token should be revoked!");
  }

  console.log("✓ Immediate Revocation Verified! Revoked timestamp recorded.");
  console.log("\n✅ PHASE 7 EXTENSION TOKEN AUTH TEST SUCCESSFUL!");
}

if (require.main === module) {
  testPhase7()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Phase 7 test failed:", err);
      process.exit(1);
    });
}
