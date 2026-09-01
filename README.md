Clone of rgosuksa.com (work-in-progress)

This repository contains a skeleton to replicate the public surface of rgosuksa.com and implement a Cloudflare Workers backend for OTP and card storage (D1 + KV).

Quick start (local dev)

1. Install Wrangler (https://developers.cloudflare.com/workers/cli-wrangler/install):
   npm install -g wrangler

2. Create Cloudflare resources (one-time):
   - Create a KV namespace for OTPs ("OTP_KV")
   - Create a KV namespace for rate limiting ("RATE_KV")
   - Create a D1 database and run d1/schema.sql to create the cards table

   Example wrangler commands (alternatively use the Cloudflare dashboard):
   - wrangler kv:namespace create "OTP_KV" --preview
   - wrangler kv:namespace create "RATE_KV" --preview
   - wrangler d1 create "MY_D1_DB"  # creates a D1 database
   - To run the schema: wrangler d1 execute MY_D1_DB --file d1/schema.sql

   Note: exact CLI flags may change; use the Cloudflare docs if any command fails.

3. Configure wrangler.toml: replace placeholder ids with real binding ids. Do NOT commit secrets.

4. Set secret:
   wrangler secret put HMAC_SECRET

5. Run locally:
   - Serve static site: npx serve site -p 8080
   - Run worker in dev (recommended with DEV_SHOW_OTP=1 for tests): DEV_SHOW_OTP=1 wrangler dev --local workers/worker.js

Run integration tests (requires wrangler dev running with DEV_SHOW_OTP=1):
  node tests/run-integration-tests.js

Note: DEV_SHOW_OTP=1 returns the OTP in the /api/request-otp response for development/testing only. Never enable in production.

Endpoints (examples):

Request OTP
curl -X POST http://localhost:8787/api/request-otp -H 'Content-Type: application/json' -d '{"phone":"+9665xxxx"}'

Verify OTP
curl -X POST http://localhost:8787/api/verify-otp -H 'Content-Type: application/json' -d '{"phone":"+9665xxxx","otp":"123456"}'

Create card (after OTP consumed)
curl -X POST http://localhost:8787/api/cards -H 'Content-Type: application/json' -d '{"card_id":"card1","name":"Ali","phone":"+9665xxxx"}'

Get card
curl http://localhost:8787/api/cards/card1

Security notes
- Phone numbers are HMACed before storing (phone_hash). Use an environment secret (HMAC_SECRET). Do NOT commit secrets.
- For stronger privacy, encrypt phone numbers with a key stored in a KMS and store ciphertext separately.
- D1 queries use parameter binding to avoid injection.

Next steps
- Crawl rgosuksa.com and replicate full HTML/CSS/assets into /site preserving routes and filenames. NOTE: This repo includes a "scripts/crawl-skeleton.js" that fetches structural skeleton pages but intentionally strips original textual content and images to avoid copying copyrighted content. To fetch and save raw pages (ensure you have rights), adapt that script accordingly.
- Expand client JS to match exact client behavior and interactive features.
- Wire a real SMS provider: add an adapter in workers/worker.js and document env vars (SMS_API_KEY, SMS_SENDER). Example env variables required:
  - SMS_API_KEY: API key for provider
  - SMS_SENDER: Sender ID or phone

- Add tests and CI (GitHub Actions) to run unit tests and wrangler publish on tag.
