# HOARD — Email Ingestion Architecture & Setup Guide

## The Architecture Decision

**One-way, forwarded, Gmail archives on arrival, HOARD owns all state.**
No Gmail API, no OAuth, no writeback, no sync.

```
Incoming Newsletter
       │
       ▼
   Gmail Inbox
       │
       ▼ (Gmail Filter: Skip Inbox, Label "hoard", Mark as read, Forward)
       │
   read@hoard.yourdomain.com (Cloudflare Email Routing)
       │
       ▼
   Cloudflare Worker (workers/email-ingest)
       │
       ▼ (POST /api/ingest with x-hoard-secret)
       │
   Next.js API Route (`src/app/api/ingest/route.ts`)
       │
       ├── Deduplication on messageId (idempotent, retries free)
       ├── Sender upsert (email, name, issueCount)
       ├── parseNewsletter (via @mozilla/readability + linkedom)
       │     ├── Strips table scaffolding
       │     ├── Extracts Block[] JSON (p with lede/rest, h, ul, fig)
       │     ├── Extracts clean links
       │     └── Sets blocks: null on parse failure (preview-only state)
       └── Writes Issue into Postgres
```

---

## 30-Minute Setup Instructions

### 1. Cloudflare Email Routing & Domain

1. In your Cloudflare Dashboard, select your domain (e.g. `yourdomain.com`).
2. Navigate to **Email Routing** → **Routing Rules**.
3. Create a custom address:
   - Custom address: `read@hoard.yourdomain.com` (or `read@yourdomain.com`)
   - Action: **Send to a Worker**
   - Destination Worker: `hoard-email-ingest`

---

### 2. Deploy the Worker (`workers/email-ingest`)

1. Open a terminal in `workers/email-ingest`:
   ```bash
   cd workers/email-ingest
   npm install
   ```

2. Set the environment secrets:
   ```bash
   npx wrangler secret put INGEST_SECRET
   # Enter the same secret as in your HOARD .env.local:
   # e.g.: hoard_sec_993f81e3a1d946cb8e8c187a270dbef4
   ```

3. Configure your `INGEST_URL` in `workers/email-ingest/wrangler.toml`:
   ```toml
   [vars]
   INGEST_URL = "https://your-hoard-deployment.com/api/ingest"
   ```

4. Deploy:
   ```bash
   npx wrangler deploy
   ```

---

### 3. Gmail Forwarding & Filter Setup

This is the piece that removes the drift problem:

1. **Add Forwarding Address in Gmail**:
   - In Gmail, open **Settings** (gear icon) → **See all settings** → **Forwarding and POP/IMAP**.
   - Click **Add a forwarding address**.
   - Enter `read@hoard.yourdomain.com`.
   - Gmail will send a confirmation code to that address.

2. **Catch the Confirmation Code**:
   - Check the Worker logs in Cloudflare:
     ```bash
     npx wrangler tail
     ```
     Or check `POST /api/ingest` in your database.
   - Click the confirmation link or enter the verification code in Gmail.

3. **Create the Gmail Filter**:
   - In Gmail search box, enter:
     ```
     list:* OR from:(substack.com OR beehiiv.com OR ghost.io OR mail.beehiiv.com)
     ```
   - Click **Create filter**.
   - Check the following actions:
     - [x] **Skip the Inbox (Archive it)**
     - [x] **Mark as read**
     - [x] **Apply the label:** `hoard`
     - [x] **Forward it to:** `read@hoard.yourdomain.com`
   - Click **Create filter**.

---

### 4. Proving the Pipe

Send a test newsletter or trigger the endpoint directly:

```bash
curl -X POST https://your-hoard-deployment.com/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-hoard-secret: YOUR_INGEST_SECRET" \
  -d '{
    "MessageID": "<test-msg-01@substack.com>",
    "From": "author@substack.com",
    "FromName": "Test Publication",
    "Subject": "How Model Routing Cuts LLM Costs",
    "Date": "2026-09-09T18:00:00Z",
    "HtmlBody": "<h1>Title</h1><p>First sentence is the lede. Second sentence is the rest.</p>"
  }'
```

Response:
```json
{
  "ok": true,
  "id": "c1f7...",
  "dedup": false,
  "wordCount": 78,
  "readMinutes": 1,
  "blocksParsed": true
}
```

If sent again with the same `MessageID`, it automatically dedupes:
```json
{
  "ok": true,
  "dedup": true,
  "id": "c1f7..."
}
```
