# Deployment Guide: Frontend on Netlify/Bolt

## Option 1: Netlify

### 1. Connect to Git
```bash
# Push this folder to GitHub
git push origin main
```

### 2. Deploy on Netlify
- Visit https://app.netlify.com
- Click "New site from Git"
- Select your repository
- Build settings:
  - **Base directory:** `site` (or wherever you push the frontend)
  - **Publish directory:** `.` (entire folder)
  - **Build command:** (leave empty — it's a static site)

### 3. Configure Environment
- In Netlify dashboard → Site settings → Build & deploy → Environment
- Add: `REACT_APP_API_URL=https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev`

### 4. Redirect API Calls
- Netlify automatically uses `netlify.toml` redirects
- All `/api/*` requests proxy to your live Cloudflare Worker

---

## Option 2: Bolt

### 1. Upload Files
- Visit https://www.boltapp.com (or your Bolt setup)
- Upload the contents of this folder

### 2. Configure Base URL
- Update `main.js` to point API calls to:
  ```javascript
  const API_URL = "https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev";
  ```

### 3. Deploy
- Follow Bolt's deployment workflow

---

## Testing

### Test OTP Flow
```bash
# Request OTP
curl -X POST https://your-netlify-site.netlify.app/api/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966512345678"}'

# Verify OTP (use the OTP from dev console or DEV_SHOW_OTP=1 log)
curl -X POST https://your-netlify-site.netlify.app/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966512345678","otp":"123456"}'
```

### Test Card Creation
```bash
curl -X POST https://your-netlify-site.netlify.app/api/cards \
  -H "Content-Type: application/json" \
  -d '{"card_id":"card-001","name":"Test","phone":"+966512345678"}'
```

---

## Live Worker URL
**All API requests are proxied to:**
```
https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev
```

Worker code remains on Cloudflare. Frontend can live anywhere (Netlify, Bolt, etc.).
