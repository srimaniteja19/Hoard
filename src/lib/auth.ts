import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

const formatUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
};

const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  process.env.AUTH_SECRET;

export const auth = betterAuth({
  secret: authSecret,
  baseURL:
    formatUrl(process.env.BETTER_AUTH_URL) ||
    formatUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    formatUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    formatUrl(process.env.VERCEL_URL) ||
    "http://localhost:3000",
  trustedOrigins: async () => {
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
