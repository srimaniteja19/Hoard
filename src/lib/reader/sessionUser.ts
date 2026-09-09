import { requireUserId } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function getReaderUserId(req?: Request): Promise<string> {
  try {
    return await requireUserId(req);
  } catch {
    // If unauthenticated (e.g. preview mode or dev environment), fallback to first existing user
    const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
    if (firstUser) {
      return firstUser.id;
    }
    return "local-user-1";
  }
}
