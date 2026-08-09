"use client";

// Client & Server helper actions for SSRF-safe link metadata fetching

import { fetchWithSsrfGuard, validateUrlForSsrf } from "@/lib/security/ssrfGuard";
import { detectUrlMeta } from "@/components/CaptureModal";

export async function fetchLinkMetadataSafely(url: string) {
  const ssrfCheck = await validateUrlForSsrf(url);
  if (!ssrfCheck.allowed) {
    return {
      success: false,
      error: ssrfCheck.reason || "Security restriction: URL target is not permitted.",
    };
  }

  try {
    const res = await fetchWithSsrfGuard(url);
    const detection = detectUrlMeta(url);

    return {
      success: true,
      status: res.status,
      finalUrl: res.finalUrl,
      detection,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    return {
      success: false,
      error: `Enrichment failed: ${msg}`,
    };
  }
}
