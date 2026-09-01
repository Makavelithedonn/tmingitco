# Deployment Checklist: Frontend on Netlify/Bolt + Dashboard on Lovable

## Pre-Deployment Verification

- [x] Worker API live and tested
  - URL: https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev
  - Tested endpoints: /api/request-otp, /api/verify-otp, /api/cards, /api/submissions
  
- [x] Frontend code prepared
  - Location: `deployment-bundles/netlify/`
  - Contains: HTML, CSS, JS, assets, netlify.toml
  - Tests: 5/5 passing locally
  
- [x] Dashboard code prepared
  - Location: `deployment-bundles/lovable/`
  - Contains: login, dashboard, styles, admin JS
  - Features: Submissions view, status updates, real-time refresh

- [x] Documentation complete
  - DEPLOYMENT_INSTRUCTIONS.md (6400+ words)
  - QUICK_START.txt (quick reference)
  - Bundle-specific DEPLOYMENT_GUIDE.md in each folder

---

## Deploy Frontend on Netlify

### Step 1: Create Netlify Account
- [ ] Visit https://app.netlify.com
- [ ] Sign up with GitHub / email
- [ ] Verify email

### Step 2: Connect Repository
- [ ] Click "New site from Git"
- [ ] Authorize GitHub
- [ ] Select `Makavelithedonn/tmingitco` repository
- [ ] Select branch: `makavelithedonn-clone-rgosuksa-cloudflare-workers`

### Step 3: Configure Build
- [ ] Set Base directory: `site/`
- [ ] Set Publish directory: `.` (entire site folder)
- [ ] Leave Build command empty (static site)
- [ ] Click "Deploy site"

### Step 4: Add Environment Variables
- [ ] In Netlify dashboard: Settings → Build & deploy → Environment
- [ ] Add new variable:
  - Name: `REACT_APP_API_URL`
  - Value: `https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev`
- [ ] Redeploy site

### Step 5: Verify Deployment
- [ ] Visit your Netlify URL (e.g., `https://your-site.netlify.app`)
- [ ] Verify site loads
- [ ] Open browser DevTools console
- [ ] Navigate to "Request OTP" section
- [ ] Enter phone: `+966512345678`
- [ ] Click "Request OTP"
- [ ] Check console for OTP value
- [ ] Verify success message appears

### Step 6: Test API Proxy
- [ ] Netlify should automatically proxy `/api/*` to Cloudflare Worker
- [ ] OTP form should work end-to-end
- [ ] No CORS errors should appear
- [ ] If errors: Check CORS headers in worker or verify API_URL env var

---

## Deploy Dashboard on Lovable

### Step 1: Create Lovable Account
- [ ] Visit https://lovable.dev
- [ ] Sign up with email / GitHub
- [ ] Verify email

### Step 2: Create New Project
- [ ] Click "New project"
- [ ] Choose "Create from scratch"
- [ ] Name: "rgosuksa-admin" (or your choice)

### Step 3: Upload Dashboard Files
**Option A: Direct File Upload (if supported)**
- [ ] In Lovable editor, look for "Import" or "Upload" button
- [ ] Select all files from `deployment-bundles/lovable/`
- [ ] Upload

**Option B: Manual Paste (if upload not available)**
- [ ] Open `deployment-bundles/lovable/index.html` in text editor
- [ ] Copy contents
- [ ] Paste into Lovable's HTML editor
- [ ] Open `deployment-bundles/lovable/styles.css`
- [ ] Copy and paste into Lovable's CSS panel
- [ ] Open `deployment-bundles/lovable/js/admin.js`
- [ ] Copy and paste into Lovable's JavaScript panel

### Step 4: Set Environment Variables
- [ ] In Lovable: Settings → Environment or Config
- [ ] Add new variable:
  - Name: `VITE_API_URL`
  - Value: `https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev`

### Step 5: Update Admin JS (if using Option B paste)
- [ ] In JavaScript panel, find this line:
  ```javascript
  const API_URL = import.meta.env.VITE_API_URL || "https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev";
  ```
- [ ] Verify it's there (or add if missing)

### Step 6: Deploy Dashboard
- [ ] Click "Deploy" button
- [ ] Lovable will generate a live URL (e.g., `https://your-project.lovable.dev`)
- [ ] Note this URL

### Step 7: Verify Dashboard
- [ ] Visit your Lovable dashboard URL
- [ ] Should see login page
- [ ] Click through to main dashboard (may skip auth for now)
- [ ] Should show empty submissions table (or existing data if you created cards)
- [ ] Open browser console
- [ ] Verify no CORS/auth errors

---

## End-to-End Testing

### Test Flow: Frontend → Worker → Dashboard

1. **Frontend Test**
   - [ ] Visit Netlify frontend
   - [ ] Fill "Request OTP" form with phone: `+966512345678`
   - [ ] Check console for OTP code (or check logs if DEV_SHOW_OTP=1)
   - [ ] Copy OTP code
   - [ ] Fill "Verify OTP & Create Card" form:
     - Phone: `+966512345678`
     - OTP: paste code
     - Card ID: `test-card-001`
     - Name: `Test User`
   - [ ] Click "Verify & Create Card"
   - [ ] Should see success message
   - [ ] Card data should appear in "Lookup Card" section

2. **Dashboard Test**
   - [ ] Visit Lovable dashboard
   - [ ] Should show the card submission from step 1
   - [ ] Verify columns show: ID, Phone (hashed), Card ID, Name, IP, Submitted, Status
   - [ ] Click "Accept" button on submission
   - [ ] Status should change to "accepted" in real-time
   - [ ] Table should auto-refresh every 5 seconds

3. **API Direct Test**
   ```bash
   # Test OTP request
   curl -X POST https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/request-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"+966512345678"}'
   
   # Should return: { "ok": true, "message": "..." }
   
   # Get admin submissions
   curl https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/submissions
   
   # Should return: [{ id, phone, card_id, name, ip, submitted_at, status }, ...]
   ```

---

## Troubleshooting

### Frontend Issues

**Problem: "Failed to fetch" or CORS error on API calls**
- Solution: 
  1. Verify `REACT_APP_API_URL` env var is set in Netlify
  2. Check that Worker URL is correct (copy from README)
  3. Verify Netlify redirects are working (check netlify.toml is in root)
  4. Try curl to Worker directly to verify it's responding

**Problem: OTP not appearing in console**
- Solution:
  1. Make sure Worker is running with DEV_SHOW_OTP=1 locally
  2. In production, check Worker logs in Cloudflare dashboard
  3. OTP should be returned in API response (check Network tab)

**Problem: Site loads but forms don't work**
- Solution:
  1. Check browser console for JavaScript errors
  2. Verify all .js files loaded (Network tab)
  3. Check that API_URL in main.js matches Worker URL

### Dashboard Issues

**Problem: Dashboard blank or not loading**
- Solution:
  1. Check browser console for errors
  2. Verify HTML, CSS, JS were pasted correctly
  3. Check that login page appears (if you have login.html)
  4. Try Lovable's preview/refresh

**Problem: "Failed to fetch submissions"**
- Solution:
  1. Verify VITE_API_URL env var is set
  2. Check that Worker /api/submissions endpoint is responding:
     ```bash
     curl https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/submissions
     ```
  3. If Worker returns data but dashboard shows error, check browser console for more details

**Problem: Status updates not working**
- Solution:
  1. Check browser console for errors when clicking Accept/Reject
  2. Verify PATCH endpoint exists in Worker:
     ```bash
     curl -X PATCH https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/submissions/ID \
       -H "Content-Type: application/json" \
       -d '{"status":"accepted"}'
     ```
  3. If Worker returns success but UI doesn't update, check JS in admin.js

---

## Post-Deployment

### Security Checklist
- [ ] No API keys or secrets in deployed code
- [ ] All secrets in Cloudflare Worker (wrangler secret put)
- [ ] SMS_API_KEY not committed to repo
- [ ] HMAC_SECRET not committed to repo
- [ ] Netlify env vars don't contain secrets (only API_URL)
- [ ] Lovable env vars don't contain secrets (only API_URL)

### Performance Check
- [ ] Frontend loads in < 2 seconds
- [ ] Dashboard submissions load in < 1 second
- [ ] OTP verification completes in < 500ms
- [ ] Status updates are real-time (< 1 second)

### Monitoring
- [ ] Set up Cloudflare Analytics to monitor Worker traffic
- [ ] Enable Netlify analytics to monitor frontend usage
- [ ] Check Lovable dashboard for deployment status
- [ ] Monitor D1 database usage in Cloudflare dashboard

### Next Steps
- [ ] Buy custom domain if desired (optional)
- [ ] Wire real SMS provider (Twilio/Vonage) in GitHub Actions secrets
- [ ] Add proper authentication/authorization (OAuth, JWT, etc.)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Create admin UI for managing SMS provider config
- [ ] Add monitoring alerts for API errors

---

## Rollback Plan

If something goes wrong:

### Rollback Netlify
1. In Netlify dashboard, click "Deploy" menu
2. Select previous successful deployment
3. Click "Publish deploy"
4. Site reverts immediately

### Rollback Lovable
1. In Lovable, check "Deployments" or "History"
2. Revert to previous version
3. Redeploy

### Rollback Worker
1. In Cloudflare dashboard, select your Worker
2. Go to "Deployments" tab
3. Click rollback button next to previous version
4. Worker reverts immediately

---

## Success Criteria ✅

You're done when:
- [ ] Frontend loads at `https://your-site.netlify.app`
- [ ] Dashboard loads at `https://your-project.lovable.dev`
- [ ] OTP request → verify → create card works end-to-end
- [ ] Admin dashboard shows submissions with correct data
- [ ] Status updates work without page refresh
- [ ] All three systems (frontend, dashboard, worker) communicate successfully
- [ ] No errors in browser console or Cloudflare logs

---

## Support Links

- Netlify Docs: https://docs.netlify.com
- Lovable Docs: https://docs.lovable.dev (check their site)
- Cloudflare Workers: https://developers.cloudflare.com/workers
- Cloudflare D1: https://developers.cloudflare.com/d1
- Cloudflare KV: https://developers.cloudflare.com/kv

For questions about the code, check:
- DEPLOYMENT_INSTRUCTIONS.md
- deployment-bundles/netlify/DEPLOYMENT_GUIDE.md
- deployment-bundles/lovable/DEPLOYMENT_GUIDE.md
- README.md in the root
