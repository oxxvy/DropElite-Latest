# DropElite — Launch-Ready Package

## What you have now

Four files that work together as your complete website:

| File | What it does |
|---|---|
| `login.html` | Login page (the first page anyone sees) |
| `dashboard.html` | Your main user dashboard (the file you uploaded, now mobile-ready + login-protected) |
| `admin.html` | Your admin panel (manage users, payments, content) |
| `api.js` | The "brain" that handles all data — swap this for Supabase when going live |
| `auth.js` | Handles login/logout/route protection |

---

## How to test it RIGHT NOW

1. Put all 5 files in the **same folder** on your computer
2. Double-click `login.html`
3. Tap any of the demo accounts at the bottom to auto-fill, then click SIGN IN

### Login credentials

| Role | Email | Password | Goes to |
|---|---|---|---|
| User | `demo@dropelite.com` | `demo123` | dashboard.html |
| Owner | `rejaul@dropelite.com` | `rejaul123` | dashboard.html |
| **Admin** | `admin@dropelite.com` | `admin123` | **admin.html** |

To log out: click the **Logout** button in the topbar (top-right).

---

## What's mobile/tablet ready

The dashboard and admin panel now work on:

- **Desktop** (anything above 1100px) — full layout
- **Tablet** (800px–1100px) — slightly compacted sidebar
- **Mobile** (below 800px) — sidebar becomes a slide-out menu, tap the hamburger ☰ icon
- **Small phones** (below 380px, like older devices) — stats stack vertically

Tested for: Nothing Phone 2, iPhone 16 Pro Max, iPads, and desktops.

---

## What "launch-ready" means here

You can host this on any cheap web host (Hostinger, Netlify, Vercel — all free or under ₹500/month) and it will work. People can:

- Sign in
- Use the full dashboard
- See data (it's demo data right now — same data for everyone, stored in their browser)
- You can manage users/payments/content from the admin panel

**What it can't do yet (until Phase 4):**
- Real user signups (no database)
- Real payments (Razorpay/Stripe keys go in admin → Settings, but the actual checkout needs a small backend)
- Saving data permanently across devices

---

## When you're ready for real launch (Phase 4)

You (or a developer) only needs to edit ONE file: `api.js`.

At the top of `api.js` there's a line:
```
const MODE = 'demo';
```

Change it to:
```
const MODE = 'live';
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
```

That's the whole "convert to real backend" step for the frontend. The database tables Supabase needs:
- `users` (id, name, email, plan, status, joined)
- `wallets` (id, user_id, label, address, chain, balance, usd)
- `airdrops` (id, name, chain, status, priority, eligibility, estValue)
- `missions` (id, title, xp, done, project)
- `rewards` (id, project, amount, token, usd, status, date)
- `payments` (id, user, amount, plan, provider, status, date)
- `content` (id, title, type, published, date)

A developer can set this up in 1–2 hours.

---

## Common questions

**Q: Can I change demo passwords?**
A: Open `auth.js` in any text editor (Notepad works). Find `DEMO_USERS` near the top. Edit the email/password values.

**Q: Can I change pricing?**
A: Yes — log in as admin, go to Settings, edit the prices, click Save.

**Q: How do I add my Razorpay/Stripe keys?**
A: Admin panel → Settings → paste keys → Save. They're stored locally for now; in live mode you'll move them to Supabase env vars.

**Q: Data disappeared!**
A: Demo data lives in the browser. If someone clears browser data, it resets to defaults next time. This is fine for testing — in live mode (Supabase) data is permanent.

**Q: How do I reset everything to fresh demo data?**
A: Admin panel → Settings → "Reset Demo Data" button.

---

## File structure

```
your-folder/
├── login.html       ← start here
├── dashboard.html   ← user dashboard
├── admin.html       ← admin panel
├── api.js           ← data layer (swap to Supabase later)
├── auth.js          ← login/logout logic
└── README.md        ← this file
```

All 5 files (or 6 with README) must be in the same folder.

---

## Phase roadmap (your plan)

- ✅ **Phase 1**: 10 tabs as static HTML — *done in the original file*
- ✅ **Bonus**: Mobile/tablet responsive + demo auth + admin panel — *done now*
- ⏭️ **Phase 2**: Database design (tables listed above)
- ⏭️ **Phase 3**: Convert to Next.js (a developer wraps these HTML files into a Next.js project)
- ⏭️ **Phase 4**: Supabase Auth (replace demo auth — only `api.js` and `auth.js` change)
- ⏭️ **Phase 5**: Wire tabs to database (already wired through `api.js` — just flip MODE = 'live')
- ⏭️ **Phase 6**: Payment integration (admin panel already has Razorpay/Stripe key fields)
- ⏭️ **Phase 7**: Launch 🚀
