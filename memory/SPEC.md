# Celesta Glow — Skincare E-Commerce Storefront

Cloned from https://github.com/dragon16t/Last-update.git and brought up in this pod
so the preview matches https://ecom-preview-16.preview.emergentagent.com/.

## Stack (differs from the farm-ts template — this is the cloned app's own stack)

- **Backend**: FastAPI + motor/MongoDB, entry `backend/server.py`. Routes live in
  `backend/routes/*.py` (note: `routes/`, not `routers/`), services in
  `backend/services/`, models in `backend/models/`. All API routes are under `/api`.
  Static product/asset images are mounted at `/api/uploads` from `backend/uploads/`.
- **Frontend**: Create React App + craco (JavaScript, not Vite/TS). Entry
  `frontend/src/index.js` → `frontend/src/AppRouter.js`. Tailwind v3 + Radix UI.
  Pages in `frontend/src/pages/`, components in `frontend/src/components/`.

## Pod wiring applied to make the clone run here

1. `frontend/package.json`: added `"dev": "craco start"` (supervisor runs `yarn dev`)
   and `"proxy": "http://localhost:8001"` so relative `/api` calls reach the backend.
2. `frontend/.env`: `REACT_APP_BACKEND_URL=` (empty) — the code builds URLs as
   `${REACT_APP_BACKEND_URL}/api/...`, so an empty value yields relative `/api/...`
   paths that the CRA proxy (dev) and the ingress (preview) both resolve correctly.
3. `frontend/craco.config.js`: forced `devServer.allowedHosts = 'all'`. CRA enables
   its host-check firewall whenever `proxy` is set, which would otherwise reject
   every request arriving through the preview ingress with a foreign Host header.
4. Backend `.env` kept the pod's own `MONGO_URL` / `DB_NAME` / `CORS_ORIGINS`.
5. Installed the 9 Python packages the repo pins that were absent from the pod venv:
   Werkzeug, beautifulsoup4, cloudinary, lxml, python-http-client, razorpay,
   sendgrid, python-barcode, reportlab.

## Catalog seeding — IMPORTANT

The app's built-in startup seeder is **intentionally disabled** in the repo
("empty catalog by configuration" in `routes/products.py`). The live preview's
catalog comes from the seed scripts, which were run in this order:

```bash
cd /app/backend
python scripts/seed_celestaglow_flagship.py   # 5 flagship SKUs
python scripts/set_flagship_images.py         # real product photography
python scripts/seed_preview_catalog.py        # 4 base SKUs + 96 variation SKUs
python scripts/seed_combos.py                 # Complete Anti-Aging Kit
python scripts/seed_before_after.py           # 5 transformation images
```

Resulting seed state: **105 product docs (9 listed base SKUs)**, 1 combo,
5 before/after images, 14 concerns, 34 categories, 4 coupons
(OCT26, OCTGLOW, NOVEARLY, WELCOME50).

## Key flows

- **Storefront**: Home → Categories (shop by concern / category) → product detail
  → add to cart → cart (coupons, gift cards, combo upsell, volume discounts) → checkout.
- **Skin Analysis** (`/skin-analysis`, `/routine`) and **30-day AI Tracker**
  (`/tracker`): Gemini-backed. These degrade to fallback data without AI credits.
- **Doctor Consultation** (`/doctor-consultation`, ₹999), **Track Order**,
  **Beauty Tips** blog, About, Contact.
- **Admin** at `/admin` — password-gated (see `memory/test_credentials.md`).

## Known limitations (inherited from the clone, not pod issues)

- **Cloudinary is not configured** — image *uploads* from admin will fail. Existing
  product imagery is served from `backend/uploads/` and the brand's public Cloudinary CDN.
- **AI features (Gemini) have no key configured here** — skin analysis, face
  verification and task generation fall back to canned data. The repo's own test
  history records the same condition (credits depleted upstream).
- **Razorpay / SendGrid / WhatsApp / Delhivery keys absent** — live payment and
  notification calls will not complete until keys are added to `backend/.env`.
- Benign console warnings persist from the repo's own code (`fetchpriority`
  attribute casing, `UNSAFE_componentWillMount` via react-helmet).
