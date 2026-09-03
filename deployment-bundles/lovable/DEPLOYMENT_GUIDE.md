# Deployment Guide: Dashboard on Lovable

## What's Included
This folder contains a complete admin dashboard for managing card submissions and OTP logs:
- `index.html` — Main dashboard (view submissions, filter, update status)
- `login.html` — Admin login page
- `styles.css` — Responsive styling (mobile, tablet, desktop)
- `js/admin.js` — Dashboard logic (fetch submissions, update status, real-time refresh)
- `assets/` — Icons and images

## How to Deploy on Lovable

### Step 1: Create Lovable Project
- Visit https://lovable.dev
- Click "New project"
- Choose "Import from folder" or "Start from scratch"

### Step 2: Upload Files
If starting from scratch:
1. Click "Add page"
2. Paste the HTML from `index.html` into Lovable's editor
3. In the CSS panel, paste contents of `styles.css`
4. In the JavaScript panel, paste contents of `js/admin.js`

Or import all files at once if Lovable supports folder imports.

### Step 3: Configure API Endpoint
In Lovable's environment settings, add:
```
VITE_API_URL=https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev
```

Update `js/admin.js` to use:
```javascript
const API_URL = import.meta.env.VITE_API_URL || "https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev";
```

### Step 4: Deploy
- Click "Deploy" in Lovable dashboard
- Your dashboard will be live at a Lovable-provided URL (e.g., `https://your-project.lovable.dev`)

---

## Features

### Admin Dashboard
- **View Submissions:** Lists all card submissions with status (pending/accepted/rejected)
- **Filter by Status:** Search submissions by status or card ID
- **Real-Time Updates:** Auto-refresh every 5 seconds
- **Update Status:** Accept or reject submissions directly from the dashboard
- **Pending Count:** Shows unreviewed submissions at a glance
- **Responsive Design:** Mobile, tablet, desktop friendly

### Login Page
- Basic authentication check
- Can be extended with proper auth backend (OAuth, JWT, etc.)

---

## API Endpoints Used

### Fetch Submissions
```bash
GET https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/submissions
# Returns: [{ id, phone, card_id, name, ip, submitted_at, status }, ...]
```

### Update Submission Status
```bash
PATCH https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev/api/submissions/{id}
Content-Type: application/json

{ "status": "accepted" }
# or { "status": "rejected" }
```

---

## Testing

### Test Dashboard Locally (Before Lovable)
```bash
# Start Cloudflare Worker
DEV_SHOW_OTP=1 wrangler dev

# In another terminal, open dashboard
python3 -m http.server 8080 -d /path/to/lovable-dashboard/

# Visit http://localhost:8080
# Try requesting OTP and creating a card
# Check admin dashboard for new submissions
```

### Test on Live Lovable
1. Deploy dashboard to Lovable
2. Visit your Lovable URL (e.g., `https://your-project.lovable.dev/admin/`)
3. View live submissions from the Cloudflare Worker
4. Update statuses in real-time

---

## Customization Tips

### Change Colors
Edit `styles.css` variables:
```css
:root {
  --accent: #0066cc;      /* Change primary color */
  --text: #333;           /* Change text color */
  --bg-light: #f5f5f5;    /* Change background */
}
```

### Add More Columns
Edit `index.html` table header and `js/admin.js` to render more submission fields.

### Add Authentication
Replace the `login.html` basic check with proper JWT/OAuth integration.

---

## Live Worker URL
**Admin API endpoints:** https://makavelithedonn-clone-rgosuksa.devopsjacob.workers.dev

All dashboard data is fetched from the live Cloudflare Worker. No separate backend needed.
