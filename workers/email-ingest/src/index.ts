import PostalMime from "postal-mime";

export interface Env {
  INGEST_URL: string; // e.g. "https://hoard.yourdomain.com/api/ingest" or tunneling URL
  INGEST_SECRET: string; // e.g. "hoard_sec_..."
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      console.log(`[HOARD INGEST] Incoming email from: ${message.from} to: ${message.to}`);

      // Read raw email stream
      const rawEmail = await new Response(message.raw).arrayBuffer();
      const parser = new PostalMime();
      const parsed = await parser.parse(rawEmail);

      const messageId =
        message.headers.get("message-id") ||
        parsed.messageId ||
        `<hoard-${Date.now()}-${crypto.randomUUID()}@local>`;

      const subject =
        message.headers.get("subject") ||
        parsed.subject ||
        "Untitled Newsletter";

      const fromEmail = message.from || parsed.from?.address || "unknown@newsletter.com";
      const fromName = parsed.from?.name || fromEmail.split("@")[0];

      // Detect Gmail Forwarding Confirmation email
      if (
        subject.includes("Gmail Forwarding Confirmation") ||
        (parsed.text && parsed.text.includes("Confirmation code:"))
      ) {
        console.warn(`[HOARD INGEST] GMAIL CONFIRMATION EMAIL RECEIVED:`);
        console.warn(`Subject: ${subject}`);
        console.warn(`Body:\n${parsed.text || parsed.html}`);
      }

      const payload = {
        MessageID: messageId,
        From: fromEmail,
        FromName: fromName,
        To: message.to,
        Subject: subject,
        HtmlBody: parsed.html || null,
        TextBody: parsed.text || null,
        Date: parsed.date || new Date().toISOString(),
      };

      console.log(`[HOARD INGEST] Forwarding to ${env.INGEST_URL} (MessageID: ${messageId})`);

      const res = await fetch(env.INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hoard-secret": env.INGEST_SECRET,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();

      if (!res.ok) {
        console.error(`[HOARD INGEST] Ingest endpoint returned status ${res.status}: ${responseText}`);
      } else {
        console.log(`[HOARD INGEST] Successfully ingested: ${responseText}`);
      }
    } catch (err) {
      console.error("[HOARD INGEST] Failed to process incoming email:", err);
      // Do not reject the email to prevent bounce back storms
    }
  },
};
