import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { extensionTokens } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

/** Returns the full better-auth session or null. */
export async function getSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

/** Returns the authenticated user ID (via Bearer token or web session) or throws AuthError. */
export async function requireUserId(req?: Request): Promise<string> {
  // 1. Check Bearer token in Authorization header
  if (req) {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const rawToken = authHeader.slice(7).trim();
      if (rawToken) {
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const rows = await db
          .select({
            id: extensionTokens.id,
            userId: extensionTokens.userId,
          })
          .from(extensionTokens)
          .where(and(eq(extensionTokens.tokenHash, tokenHash), isNull(extensionTokens.revokedAt)))
          .limit(1);

        if (rows.length > 0) {
          // Asynchronously update lastUsedAt
          db.update(extensionTokens)
            .set({ lastUsedAt: new Date() })
            .where(eq(extensionTokens.id, rows[0].id))
            .catch(() => {});

          return rows[0].userId;
        } else {
          throw new AuthError("Invalid or revoked extension token");
        }
      }
    }
  }

  // 2. Check Better-Auth web session
  const session = await getSession();
  if (session?.user?.id) {
    return session.user.id;
  }

  throw new AuthError("Unauthorized");
}

export class AuthError extends Error {
  status = 401;
  constructor(msg = "Unauthorized") {
    super(msg);
    this.name = "AuthError";
  }
}
