import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

const formatUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "hoard_default_secret_key_9837429837",
  baseURL:
    formatUrl(process.env.BETTER_AUTH_URL) ||
    formatUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    formatUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    formatUrl(process.env.VERCEL_URL) ||
    "http://localhost:3000",
  trustedOrigins: async (request?: Request) => {
    const origins = new Set<string>([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.7.168:3000",
      "https://*.vercel.app",
      "https://*.now.sh",
    ]);

    const envAppUrl = formatUrl(process.env.NEXT_PUBLIC_APP_URL);
    const envAuthUrl = formatUrl(process.env.BETTER_AUTH_URL);
    const envVercelProd = formatUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    const envVercelUrl = formatUrl(process.env.VERCEL_URL);

    if (envAppUrl) origins.add(envAppUrl);
    if (envAuthUrl) origins.add(envAuthUrl);
    if (envVercelProd) origins.add(envVercelProd);
    if (envVercelUrl) origins.add(envVercelUrl);

    if (process.env.TRUSTED_ORIGINS) {
      process.env.TRUSTED_ORIGINS.split(",").forEach((o) => {
        const formatted = formatUrl(o.trim());
        if (formatted) origins.add(formatted);
      });
    }

    if (request) {
      const originHeader = request.headers.get("origin");
      if (originHeader) {
        origins.add(originHeader);
      }

      const refererHeader = request.headers.get("referer");
      if (refererHeader) {
        try {
          origins.add(new URL(refererHeader).origin);
        } catch {}
      }

      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") || "https";
      if (host) {
        origins.add(`${proto}://${host}`);
        if (proto !== "http") {
          origins.add(`http://${host}`);
        }
      }
    }

    return Array.from(origins).filter(Boolean);
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export const DEFAULT_SINGLE_TENANT_USER_ID = "usr_owner_default";

export async function getAuthenticatedUserId(): Promise<string> {
  return process.env.SINGLE_TENANT_USER_ID || DEFAULT_SINGLE_TENANT_USER_ID;
}
