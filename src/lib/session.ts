import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/** Returns the full better-auth session or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Returns the authenticated user ID or throws a 401-able error. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new AuthError("Unauthorized");
  return session.user.id;
}

export class AuthError extends Error {
  status = 401;
  constructor(msg = "Unauthorized") {
    super(msg);
    this.name = "AuthError";
  }
}
