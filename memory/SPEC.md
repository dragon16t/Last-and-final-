# Celesta Glow — Skincare E-Commerce Storefront

Cloned from https://github.com/dragon16t/Last-update.git and brought up in this pod
so the preview matches https://ecom-preview-16.preview.emergentagent.com/.

## Stack

- **Backend**: FastAPI + motor/MongoDB, entry `backend/server.py`. Routes in
  `backend/routes/*.py` (note: `routes/`, not `routers/`), services in
  `backend/services/`. All API routes under `/api`. Static legacy assets are
  mounted at `/api/uploads` from `backend/uploads/`.
- **Frontend**: Create React App + craco (JavaScript, not Vite/TS). Entry
  `frontend/src/index.js` → `frontend/src/AppRouter.js`. Tailwind v3 + Radix UI.

## Pod wiring

1. `frontend/package.json`: `"dev": "craco start"` (supervisor runs `yarn dev`)
   and `"proxy": "http://localhost:8001"`.
2. `frontend/.env`: `REACT_APP_BACKEND_URL=` (empty) → relative `/api/...` paths.
3. `frontend/craco.config.js`: forced `devServer.allowedHosts = 'all'` (CRA turns
   its host-check firewall on whenever `proxy` is set, which rejects the preview
   ingress's foreign Host header).
4. Installed the 9 repo-pinned Python packages missing from the pod venv:
   Werkzeug, beautifulsoup4, cloudinary, lxml, python-http-client, razorpay,
   sendgrid, python-barcode, reportlab.

## Integrations configured (`backend/.env`)

| Key | Purpose |
|---|---|
| `CLOUDINARY_CLOUD_NAME/_API_KEY/_API_SECRET` | `dcvuqcqjn` — permanent image storage (ACTIVE) |
| `GEMINI_API_KEY` | Google AI key for skin analysis / vision |
| `EMERGENT_LLM_KEY` | Emergent universal key (text + vision via emergentintegrations) |
| `ALLOW_LOCAL_UPLOADS=false` | Blocks writing images to the pod's disposable disk |

## IMAGE PIPELINE — read before touching any image code

### 1. Only two bottles may ever appear
`backend/services/brand_bottles.py` is the single source of product bottle
artwork. The owner supplied exactly two photographs and **no other bottle is
accepted**:

| kind | bottle | used for |
|---|---|---|
| `serum` | ADVANCED FACE SERUM pump | serums, toners, essences, cleansers |
| `cream` | ADVANCED RETINOID NIGHT CREAM pump | cream, moisturiser, night, balm, mask, lotion, gel, sunscreen/SPF, eye |

- `kind_for(product)` picks by category/name keywords (`_CREAM_WORDS`).
- Masters live on Cloudinary at `celesta-glow/brand/brand-bottle-{serum,cream}.jpg`
  and are disk-cached in `backend/uploads/brand/`.
- `resolve()` returns the master **pixel-exact** (`relabelled=False` by default).
  A `relabel()` helper exists but is off — reprinting over the photo degraded it.
- **Text-to-image bottle invention has been deleted.** The old
  `_ai_generate_product_image` in `routes/gift_cards_and_ai.py` prompted
  Gemini/Pollinations to invent a bottle; every run produced a different,
  non-brand bottle. It now composites the approved photograph instead.

### 2. No white box over the ingredient text
Bottles are returned as **RGBA** — `_alpha_cutout()` removes only the
*background-connected* near-white (one padded flood fill), so the bottle's own
white body survives. `gallery_composer._paste()` composites through that alpha
and honours a `keep_clear_x` left boundary per layout, so the product can never
cover copy. A soft contact shadow is drawn so the cut-out still sits naturally.

### 3. First image quality
`brand_bottles.hero_bytes()` renders image 1 from the full-resolution master
with LANCZOS at 1400px, saved **quality 97, subsampling 0 (4:4:4), progressive**.
Gallery cards save at quality 95. Cloudinary delivers with `q_auto:best,f_auto`.

### 4. Images NEVER expire — Cloudinary is the only source of truth
`backend/services/durable_images.py` owns persistence. Every generated asset is
uploaded under a **deterministic public_id**
(`celesta-glow/generated/<slug>-<tag>`) with `overwrite=True, invalidate=True`,
so regenerating refreshes in place instead of growing the library.

- Local disk under `backend/uploads/` is a **render cache only**, never a served URL.
- With `ALLOW_LOCAL_UPLOADS=false`, a failed Cloudinary upload **raises** rather
  than returning a URL that would 404 after redeploy.
- `gallery_composer.generate_and_persist(db, product)` is the async entry point
  for routes — it verifies Cloudinary first, then runs the Pillow + upload work in
  a worker thread. Routes must use it, not the sync `generate_gallery_and_certificate`.
- Journey selfies (`routes/journey.py::_save_photo`) and tracker scan photos go
  to Cloudinary too.

**`backend/migrate_images_to_cloudinary.py`** sweeps MongoDB for any remaining
`/api/uploads/*` URL, uploads the backing file and rewrites the field. Idempotent.
Current state: **0 ephemeral URLs in the database.**

> ⚠️ `scripts/seed_preview_catalog.py` still writes `/api/uploads/...` paths.
> After ANY re-seed, run `python migrate_images_to_cloudinary.py`.

## 30-Day Routine Plan flow (reworked)

The plan used to force an anonymous selfie + goals on the Routine page and on the
Progress Tracker's pre-login screen. Now:

1. **`/routine`** — the CTA reads **"Start Your 30 Days Complete Routine Plan"**
   and is a pure redirect to `/tracker?start=plan`. No selfie, no goals, no
   details. (The separate "Generate My Routine" free skin analysis on that page
   is unchanged and still takes a selfie.)
2. **`/tracker`** pre-login — login gate ONLY. `JourneyStart` was deleted.
3. **`/tracker` → Scan & Routine tab** (post-OTP-login) — the one place plan
   details are collected: photo, goal (1–2), gender, age, skin type →
   **"Start & Generate My Routine"**.
4. `POST /api/tracker/scan` runs the AI scan, then `_ensure_routine_plan()`
   creates/returns the user's active plan in **`db.routine_plans`** (one active
   plan per email, idempotent) and returns it as `plan`.
5. The UI switches to the **Progress** tab, which renders `PlanCard`
   ("Day N of 30 · Routine active & saved") plus the saved AM/PM routine.
6. `GET /api/tracker/plan` resumes the saved plan on reload/next login.

Indexes on `routine_plans`: `email+status`, unique `plan_id`.

## Skin-analysis visual

The owner-supplied before/after close-up renders **inside the Skin Analysis card,
directly below the score bars** (`SkinAnalysisVisual` in `TrackerPage.js`).
Served from Cloudinary as **WebP** via
`f_webp,q_auto:good,w_900/celesta-glow/brand/skin-analysis-before-after`
— 40 KB vs the 1.8 MB source PNG, lazy-loaded.

## Known limitations

- **Razorpay / SendGrid / WhatsApp / Delhivery keys absent** — live payment and
  notification calls won't complete until keys are added to `backend/.env`.
- **SMTP not configured** — login OTPs are not emailed; they are written to
  `/var/log/supervisor/backend.err.log` and stored in `db.customer_otps`.
- A delivery-location modal auto-opens on load and overlays the page until
  dismissed (pre-existing behaviour; it intercepts synthetic test clicks).
- Benign console warnings from the repo's own code (`fetchpriority` casing,
  `UNSAFE_componentWillMount` via react-helmet).
