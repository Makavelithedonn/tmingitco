# Deployment Instructions: Frontend & Dashboard

## Architecture Overview

```
┌─────────────────────────────────────────┐
│   Frontend (Netlify/Bolt)               │
│   - HTML, CSS, JS                       │
│   - OTP tester, card management UI      │
│   └─→ Calls /api/* endpoints            │
└──────────────────┬──────────────────────┘
                   │
                   ▼ (API calls)
┌──────────────────────────────────────────┐
│   Cloudflare Worker API (Deployed ✅)    │
│   - OTP generation & verification        │
│   - D1 card storage                      │
│   - Admin submissions endpoint            │
│   Live: https://makavelithedonn-clone... │
└──────────────────────────────────────────┘
                   ▲
                   │
┌──────────────────┴──────────────────────┐
│   Dashboard/Admin (Lovable)              │
│   - View submissions                     │
│   - Update card status                   │
│   - Real-time analytics                  │
└──────────────────────────────────────────┘
```

**Key Point:** Worker stays on Cloudflare. Frontends can be anywhere.

---

## Quick Start: Deploy Frontend on Netlify

### Option A: Netlify (Recommended for simplicity)

1. **Connect Git Repository**
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Select GitHub, authorize, choose `Makavelithedonn/tmingitco`

2. **Configure Build**
   ```
   Base directory: site/
   Publish directory: .
   Build command: (leave empty)
   ```

3. **Add Environment Variable**
   - In Netlify dashboard: Settings → Build & deploy → Environment
   - Add: `REACT_APP_API_URL=https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev`

4. **Deploy**
   - Netlify auto-deploys on every push to `main`
   - Your site will be live at: `https://your-site.netlify.app`

5. **API Proxying** (Automatic)
   - Netlify reads `netlify.toml` in the frontend folder
   - All `/api/*` calls automatically proxy to Cloudflare Worker
   - No CORS issues ✅

### Option B: Bolt

1. Upload the `/site` folder contents to Bolt
2. Configure base URL:
   ```javascript
   const API_URL = "https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev";
   ```
3. Deploy via Bolt dashboard

---

## Quick Start: Deploy Dashboard on Lovable

### Step 1: Prepare Code
- Use contents from `/tmp/lovable-dashboard/` (or extract from repo)
- Contains: `index.html`, `login.html`, `styles.css`, `js/admin.js`, `assets/`

### Step 2: Create Lovable Project
- Go to https://lovable.dev
- Click "New project"
- Choose "Create from scratch" or "Import files"

### Step 3: Add Code to Lovable
**Method 1: File Upload** (if supported)
- Upload all files from `/tmp/lovable-dashboard/`

**Method 2: Manual Paste**
1. Paste `index.html` into Lovable's main editor
2. Add CSS from `styles.css` to CSS panel
3. Add JS from `js/admin.js` to JavaScript panel

### Step 4: Set Environment
In Lovable environment settings:
```
VITE_API_URL=https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev
```

Update `js/admin.js` to use environment variable:
```javascript
const API_URL = import.meta.env.VITE_API_URL || "https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev";
```

### Step 5: Deploy
- Click "Deploy" in Lovable
- Your dashboard will be at: `https://your-project.lovable.dev`

---

## Testing After Deployment

### Test Frontend (Netlify/Bolt)
1. Visit `https://your-site.netlify.app`
2. Fill out OTP request form with a test phone number
3. Check browser console for OTP (if DEV_SHOW_OTP=1 was set)
4. Enter OTP and card details
5. Verify card was created

### Test Dashboard (Lovable)
1. Visit `https://your-project.lovable.dev`
2. Check "Live" tab for pending submissions
3. Click "Accept" or "Reject" on a submission
4. Verify status updates in real-time

### Test API Directly (curl)
```bash
# Request OTP
curl -X POST https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966512345678"}'

# Verify OTP
curl -X POST https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966512345678","otp":"123456"}'

# Get submissions (admin)
curl https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/submissions
```

---

## Files Reference

### Frontend (Netlify/Bolt deployment)
- `site/index.html` — Home page with OTP tester
- `site/about.html` — About page
- `site/contact.html` — Contact form
- `site/styles.css` — Responsive styling
- `site/js/main.js` — OTP form logic
- `site/assets/` — Logo and images
- `netlify.toml` — Netlify config (auto API proxying)

### Dashboard (Lovable deployment)
- `lovable-dashboard/index.html` — Admin dashboard
- `lovable-dashboard/login.html` — Admin login
- `lovable-dashboard/styles.css` — Dashboard styling
- `lovable-dashboard/js/admin.js` — Dashboard logic (fetch submissions, update status)

### Worker (Already live on Cloudflare)
- `workers/worker.js` — Main router
- `workers/handlers.js` — OTP/card/admin endpoints
- `workers/sms.js` — SMS provider adapters

---

## Environment Variables

### Netlify
```
REACT_APP_API_URL=https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev
```

### Lovable
```
VITE_API_URL=https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev
```

### Cloudflare Worker (secrets, NOT in repo)
```bash
wrangler secret put HMAC_SECRET
wrangler secret put SMS_API_KEY (optional)
```

---

## Status Checklist

- [x] Frontend code ready for Netlify/Bolt (`/tmp/netlify-frontend/`)
- [x] Dashboard code ready for Lovable (`/tmp/lovable-dashboard/`)
- [x] Cloudflare Worker live and tested
- [x] API documentation included
- [x] Deployment guides created
- [ ] Deploy frontend to Netlify (you'll do this)
- [ ] Deploy dashboard to Lovable (you'll do this)

---

## Support

### If API calls fail:
1. Check CORS headers in worker (should allow all origins for public API)
2. Verify Worker URL is correct: `https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev`
3. Check browser console for error messages
4. Test with curl directly to isolate frontend vs backend issue

### If Lovable won't load:
1. Verify all HTML, CSS, JS syntax is correct
2. Check browser console for JS errors
3. Try running dashboard locally first (Python: `python3 -m http.server 8080`)

### Questions?
- Worker code: Check `/workers/` folder
- Frontend code: Check `/site/` folder
- Tests: Run `node --test` locally
