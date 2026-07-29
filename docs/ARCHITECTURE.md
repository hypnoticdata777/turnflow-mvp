# Architecture

> This document describes the **current implementation**, as of the v1.1
> foundation pivot (domain model + role rewrite — see `ROADMAP.md`). The
> canonical product requirements are in `REQUIREMENTS.md`; this is how
> the code implements them today. The homeowner-facing feature surface on
> top of this foundation (guided intake polish, quote workspace, real
> vendor invites, decision log, property vault, reminders, proof-packet
> export) is v1.2, still to be built — noted inline below wherever this
> doc's current model is a deliberately minimal v1.1 stand-in for a
> richer v1.2 feature.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5 | No bundler, no framework. Pages import modules directly via `<script type="module">`. |
| Styling | Tailwind CSS via CDN (`cdn.tailwindcss.com`) | Not compiled/purged — fine for a POC, not for production bundle size. |
| Auth | Firebase Authentication (email/password) | `public/js/auth.js` |
| Database | Firebase Firestore | `public/js/firestore-properties.js`, `public/js/firestore-requests.js`, `public/js/firestore-contacts.js` |
| File storage | Firebase Storage | Request photo uploads, `public/js/request-photos.js` |
| Charts | Chart.js (CDN) | `stats.html` |
| PDF export | jsPDF (CDN) | `request.html` |
| Tests | Vitest | `public/js/__tests__/`, pure-logic only (no DOM/Firebase deps) |
| CI | GitHub Actions | `.github/workflows/ci.yml` — installs deps, runs `npm test` |
| Hosting | Firebase Hosting | `firebase.json`, public root = `.` (repo root) |

There is intentionally no build step. All third-party libraries load from
CDNs at runtime via versioned URLs (e.g.
`https://www.gstatic.com/firebasejs/10.12.4/...`). This keeps the POC
frictionless to run (`npx serve .` and go) but means there's no dependency
lockfile for the frontend runtime libs, no tree-shaking, and no offline dev
story. See `ROADMAP.md` for when this stops being the right tradeoff.

## Roles (current, pre-pivot — see "Target domain model" above for `owner`/`vendor`/`collaborator`)

| Role | Home page | Can do |
|---|---|---|
| `owner` | `dashboard.html` | Create/manage properties; create, edit, delete requests; assign a vendor and/or share with a collaborator per request; manage contacts; backup data |
| `vendor` | `vendor.html` | View only requests assigned to them (`assignedVendorUid`); upload before/after/receipt/other photos; update request status |
| `collaborator` | `collaborator.html` | Read-only view of requests explicitly shared with them (`collaboratorUid`) |

Role is stored at `users/{uid}.role` in Firestore and set manually via the
Firebase console today (see `SETUP.md`) — there is no self-serve signup
yet. `roleHome(role)` in `auth.js` is the single source of truth for
"where does this role land after login."

**Page-level role guards.** Every owner-only page calls
`await requireRole('owner')` near the top of `<body>` (`guard-owner.js`);
`vendor.html` and `collaborator.html` call `requireRole('vendor')` /
`requireRole('collaborator')` respectively via their own `.guard.js`
files. This is defense-in-depth on top of `firestore.rules`, not a
substitute for it: Firestore rules are what actually stop a `vendor`/
`collaborator` from writing owner-only data even if a guard is missing,
but a missing guard still lets the wrong role load owner-only UI and hit
confusing "permission denied" errors on write instead of a clean
redirect.

**Vendor and collaborator assignment is a schema-only mechanism in v1.1**
— an owner picks an existing `vendor`/`collaborator`-role user from a
dropdown on the dashboard, the same pattern the pre-pivot tool used for
technician assignment. There is no email-based invite flow yet (create an
account for someone who doesn't have one, notify them, etc.) — that's
`ROADMAP.md` v1.2 Package 3 (vendor invites) and Package 10 (collaborator
sharing UI). What v1.1 *does* close is the read-scoping gap the pre-pivot
model had: a vendor can now only read the specific request they're
assigned to, and a collaborator only the specific request shared with
them — enforced in `firestore.rules`/`storage.rules`, not just hidden in
the UI (see BRL6 in `REQUIREMENTS.md`).

## Data model (Firestore) — current, pre-pivot

```
users/{uid}
  role: "owner" | "vendor" | "collaborator"
  email?, name?          // hand-entered; see SETUP.md — no client-SDK sync from Firebase Auth

properties/{propertyId}
  ownerUid, address, unit?, nickname?, createdAt, updatedAt

requests/{requestId}
  ownerUid, propertyId, title, category, urgency, location,
  contactMethod, accessInstructions, notes,
  status: "Draft" | "Needs Quote" | "Waiting" | "Scheduled" |
          "In Progress" | "Needs Review" | "Complete" | "Archived"
  assignedVendorUid?, collaboratorUid?
  estimatedCost?, quotedCost?, finalCost?   // see costForRequest()/BRL3 below
  createdAt, updatedAt   // serverTimestamp()

  requests/{requestId}/photos/{photoId}   // real Firestore-assigned IDs
    type: "before" | "after" | "receipt" | "other"
    url, storagePath, uploadedByUid, createdAt

contacts/{contactId}
  (name/email/phone/property fields — general-purpose directory, not yet linked to vendor invites)
```

**A request is a single maintenance issue**, not a multi-task turnover
job — this is the core reshape v1.1 did to the pre-pivot `projects`
collection (which had an embedded `tasks` array with per-task labor/
materials line items). One consequence worth naming: this also resolves
the pre-pivot codebase's task-identity quirk (photos were keyed by task
array index, which could silently orphan photos if a task was removed).
Photos now live directly under a request with real document IDs — there's
no "index beyond the current array length" concept left to worry about.

**Cost fields (`BRL3`).** `estimatedCost`, `quotedCost`, and `finalCost`
are three independent optional fields, not one "cost" field that gets
overwritten. `costForRequest()`/`costLabelForRequest()` in `utils.js`
resolve which one is authoritative (`finalCost` wins over `quotedCost`
wins over `estimatedCost`) and label which stage it reflects, so the UI
never presents an estimate as if it were an actual cost. This is a v1.1
minimal implementation of the business rule — a full quote *workspace*
with multiple competing vendor quotes per request (`FEAT3`) is v1.2
Package 4; right now there's exactly one value per cost stage.

**`clientId` vs. `contacts` (carried forward from the pre-pivot design,
still unresolved).** `contacts` (name/email/phone/property) and
`collaboratorUid`/`assignedVendorUid` (a Firebase Auth uid granting
scoped access) are two separate, currently-unlinked concepts. A contact
record does not imply that person has — or should have — a login.
Revisit merging the two once there's a real need (e.g. the v1.2 vendor
invite flow inviting directly from a contact record).

## Storage layout (Firebase Storage)

```
turnflow/{requestId}/{type}/{uid}/{timestamp}_{filename}
```

Simplified from the pre-pivot `turnflow/{projectId}/{taskId}/{type}/...`
now that a request has no internal task subdivisions.

## Security rules

`firestore.rules` enforces role and assignment checks server-side (not
just in the UI):

- `users/{userId}`: read your own doc, or any user doc if you're `owner` (needed to list vendors/collaborators for the assignment dropdowns); no client writes at all — role assignment is console-only.
- `properties/{propertyId}`: read/write only by the owner who owns it (`ownerUid == request.auth.uid`). No cross-owner sharing at the property level in v1.1.
- `requests/{requestId}`: read scoped three ways — the owning `owner`, the `vendor` matching `assignedVendorUid`, or the `collaborator` matching `collaboratorUid`. Create/delete: owner only. Update: owner, or the assigned vendor (so a vendor can move status to `In Progress`/`Needs Review` without owner involvement).
  - `requests/{requestId}/photos/{photoId}`: read scoped the same three ways via a `get()` lookup on the parent request; create requires the uploader's own uid AND being the owner or assigned vendor; update is disabled entirely (photos are immutable evidence once uploaded); delete is owner-only.
- `contacts/{contactId}`: read if authenticated; write only `owner`.

`storage.rules` mirrors the photos-subcollection rule via cross-service
`firestore.get()` lookups, so Storage and Firestore never disagree about
who can see or write a file — this closes the pre-pivot's residual gap
where any authenticated user could read any photo regardless of role.

## Cascading delete

`deleteRequest()` in `firestore-requests.js` walks the request's
`photos` subcollection (a real, fully-enumerable subcollection — no
task-index quirk, see the data model note above), deletes each photo's
Storage object and Firestore doc, then deletes the request itself. A
missing/already-gone Storage object is logged and skipped rather than
treated as fatal.

`deleteProperty()` in `firestore-properties.js` goes one level further:
it queries every request belonging to the property and calls
`deleteRequest()` on each before deleting the property doc, so deleting a
property can't leave orphaned requests referencing a nonexistent
`propertyId`.

Both are **client-side batched deletes**, not Cloud Functions — staying
serverless deliberately (no Blaze plan / functions pipeline in this repo
yet; see "when to introduce a backend" in `ROADMAP.md`'s scaling
triggers, which notes Package 9's email notifications as the point this
actually becomes necessary).

## Content Security Policy

`firebase.json`'s `hosting.headers` sets a CSP on every response (plus
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

`script-src` has **no `'unsafe-inline'`** — real script injection
protection, not just a header for show. Every page's auth guard and DOM
wiring logic lives in external files under `public/js/` (shared) and
`public/js/pages/` (page-specific) rather than inline `<script>` blocks
or `onclick="..."` attributes, both of which `script-src` governs.

- Allowlists exactly the external hosts the app loads scripts from
  (`cdn.tailwindcss.com`, `www.gstatic.com`, `cdnjs.cloudflare.com` for
  jsPDF, `cdn.jsdelivr.net` for Chart.js).
- `style-src` still needs `'unsafe-inline'` — architectural, not an
  oversight: the Tailwind Play CDN script injects its generated CSS via a
  runtime `<style>` tag, and there's no way to avoid that short of
  dropping the CDN approach entirely (see the Vite migration trigger in
  `ROADMAP.md`'s scaling section).
- `connect-src`/`img-src` allow `https://*.googleapis.com` (Firestore,
  Auth, Storage all resolve under this) plus `data:` for `img-src`.
- `script-src`/`connect-src`/`frame-src` also allow `https://www.google.com`
  and `https://www.recaptcha.net` for App Check's reCAPTCHA v3 iframe and
  verification requests (see Login security below).
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'` are all fully enforced with no exceptions.

**Shared/page-specific script layout:**

```
public/js/guard-owner.js      Shared owner-only page guard
public/js/wire-logout.js      Shared #logoutBtn wiring
public/js/load-sidebar.js     Shared sidebar-injection for owner pages
public/js/request-photos.js   Shared photo upload/gallery logic (owner + vendor views)
public/js/pages/{page}.js           Page-specific main logic
public/js/pages/{page}.guard.js     Page-specific guard (vendor/collaborator pages)
public/js/pages/{page}.header.js    Page-specific custom header builder (vendor/collaborator pages)
```

## Login security

Two independent layers — neither is a substitute for the other:

**1. Client-side login lockout** (`auth.js` + pure helpers in `utils.js`,
always active, no configuration needed). After `LOGIN_LOCKOUT_THRESHOLD`
(5) failed attempts for the same email, the login form refuses further
attempts for `LOGIN_LOCKOUT_MS` (30s), tracked per-email in
`localStorage` under `tf_login_attempts`. **This is a UX deterrent, not
real security** — it's trivially bypassed by clearing `localStorage`,
using a different browser, or calling Firebase Auth's REST API directly.

**2. Firebase App Check** (`firebase-config.js`, the real defense,
**inert until configured**). Attaches a reCAPTCHA v3 token to every
Auth/Firestore/Storage request; Firebase can reject requests that don't
carry a valid one. The code checks whether `RECAPTCHA_V3_SITE_KEY` is
still the placeholder string and no-ops with a `console.warn` if so.
Three manual steps remain, requiring Firebase console access:
1. Register a reCAPTCHA v3 provider for this web app to get a site key.
2. Paste that key over the placeholder in `firebase-config.js`.
3. Turn on enforcement per-product (Auth, Firestore, Storage) — a site
   key alone does nothing until enforcement is flipped on separately for
   each product.

Full walkthrough, including the local-dev debug-token step, is in
`SETUP.md`.

## Pagination

`getRequestsPage({ ownerUid, pageSize, cursor })` in
`firestore-requests.js` is the owner dashboard's list query — cursor-based
(`where('ownerUid', ...)` + `orderBy('createdAt', 'desc')` + `limit` +
`startAfter`), 20 requests per page behind a "Load More" button. `cursor`
is the previous page's last `QueryDocumentSnapshot`.

`getAllRequestsForOwner()` (unpaginated, but scoped to one owner — not a
full-collection scan across every owner) is kept for two callers where a
full fetch is the right tool: `backup.html` (exporting everything is the
point) and `stats.html` (aggregating status counts and cost totals across
one owner's requests — small enough per-owner that a client-side scan is
fine; revisit with Firestore aggregation queries only if a single owner's
request count grows large enough to matter).

## File map

```
index.html              Login page
dashboard.html           Owner: request list, status/vendor/collaborator assignment, delete
new-request.html         Owner: create/edit a maintenance request
request.html             Owner: request detail — cost fields, photos, PDF export
properties.html           Owner: property list + create
contacts.html             Owner: contacts CRUD
vendor.html               Vendor: assigned requests, status update, photo upload, gallery
collaborator.html         Collaborator: read-only shared-request status view
stats.html                Owner: charts (Chart.js) — requests by status, cost by property
backup.html               Owner: export/import JSON (properties + requests)
seed.html                 Dev tool: seed one sample property + request as current owner
404.html                  Not found page

public/js/
  firebase-config.js       Firebase SDK init (auth, db) — one hardcoded project
  auth.js                  Login, logout, role routing, requireRole/requireAnyRole guards
  firestore-properties.js  Property CRUD (+ cascading delete of its requests)
  firestore-requests.js    Request CRUD, paginated/vendor/collaborator/property queries, cascading photo delete
  firestore-contacts.js    Contact CRUD
  firestore-users.js       Read-only user lookups (e.g. getUsersByRole('vendor'|'collaborator'))
  request-photos.js        Shared photo upload + gallery logic (used by owner and vendor views)
  utils.js                 Pure helpers: escHtml, REQUEST_STATUSES/requestStatusBadgeClasses,
                            costForRequest/costLabelForRequest (BRL3), assignment labels,
                            login-lockout logic
  guard-owner.js            Shared owner-only page guard
  wire-logout.js            Shared #logoutBtn wiring
  load-sidebar.js            Shared sidebar-injection for owner pages
  pages/                    Page-specific logic (dashboard.js, new-request.js, request.js,
                            properties.js, contacts.js, backup.js, stats.js, seed.js,
                            vendor.js, collaborator.js, plus {page}.guard.js/
                            {page}.header.js for vendor/collaborator)
  __tests__/utils.test.js   Vitest unit tests for utils.js

firestore.rules           Firestore security rules
storage.rules              Firebase Storage security rules (photo uploads)
firebase.json              Hosting + firestore/storage rules deploy config, CSP headers
.github/workflows/ci.yml   CI: npm test on push/PR to main
```
