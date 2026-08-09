import dns from "dns/promises";
import net from "net";

export interface SsrfCheckResult {
  allowed: boolean;
  reason?: string;
  ip?: string;
}

export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4) return true;

    // 127.0.0.0/8 - Loopback
    if (parts[0] === 127) return true;

    // 10.0.0.0/8 - Private
    if (parts[0] === 10) return true;

    // 172.16.0.0/12 - Private
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 - Private
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 - Link Local & Cloud Metadata (169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 0.0.0.0/8 - Current network
    if (parts[0] === 0) return true;

    // 100.64.0.0/10 - Carrier grade NAT
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // ::1 Loopback
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // fc00::/7 Unique local address
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // fe80::/10 Link local
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;

    return false;
  }

  return true;
}

export async function validateUrlForSsrf(urlString: string): Promise<SsrfCheckResult> {
  try {
    const parsed = new URL(urlString);

    // 1. Protocol allowlist check
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { allowed: false, reason: "Disallowed protocol scheme. Only http and https are permitted." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Direct string check for common loopbacks
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "169.254.169.254") {
      return { allowed: false, reason: "Forbidden destination address." };
    }

    // 3. Check if hostname is an IP string
    if (net.isIP(hostname)) {
      if (isPrivateIp(hostname)) {
        return { allowed: false, reason: "Access to private or local IP ranges is blocked.", ip: hostname };
      }
      return { allowed: true, ip: hostname };
    }

    // 4. Resolve DNS before connection
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { allowed: false, reason: "Could not resolve hostname DNS." };
    }

    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        return { allowed: false, reason: `Resolved IP (${addr.address}) belongs to a restricted private network range.`, ip: addr.address };
      }
    }

    return { allowed: true, ip: addresses[0].address };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid URL";
    return { allowed: false, reason: `URL validation failed: ${msg}` };
  }
}

export async function fetchWithSsrfGuard(
  targetUrl: string,
  maxRedirects = 5
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string }> {
  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    while (redirectsRemaining >= 0) {
      const check = await validateUrlForSsrf(currentUrl);
      if (!check.allowed) {
        throw new Error(check.reason || "SSRF check failed.");
      }

      const res = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Hoard-Archiver/1.0 (+https://hoard.app)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      // Handle Redirect Hops Manually
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          throw new Error("Redirect header missing.");
        }
        currentUrl = new URL(location, currentUrl).toString();
        redirectsRemaining--;
        continue;
      }

      // Check content-length header
      const contentLength = res.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        throw new Error("Target response exceeds 5MB size limit.");
      }

      // Read response body with 5MB stream cutoff limit
      const reader = res.body?.getReader();
      let totalBytes = 0;
      const chunks: Uint8Array[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (totalBytes > 5 * 1024 * 1024) {
              reader.cancel();
              throw new Error("Response payload stream exceeded maximum allowed size (5MB).");
            }
            chunks.push(value);
          }
        }
      }

      const bodyBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      const text = bodyBuffer.toString("utf-8");

      return {
        ok: res.ok,
        status: res.status,
        text,
        finalUrl: currentUrl,
      };
    }

    throw new Error("Exceeded maximum redirect limit.");
  } finally {
    clearTimeout(timeoutId);
  }
}
