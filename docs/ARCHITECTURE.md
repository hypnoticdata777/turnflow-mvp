# Architecture

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5 | No bundler, no framework. Pages import modules directly via `<script type="module">`. |
| Styling | Tailwind CSS via CDN (`cdn.tailwindcss.com`) | Not compiled/purged — fine for a POC, not for production bundle size. |
| Auth | Firebase Authentication (email/password) | `public/js/auth.js` |
| Database | Firebase Firestore | `public/js/firestore-projects.js`, `public/js/firestore-contacts.js` |
| File storage | Firebase Storage | Technician photo uploads, `public/js/technician.js` |
| Charts | Chart.js (CDN) | `stats.html` |
| PDF export | jsPDF (CDN) | `estimate.html` / `pending-send.html` |
| Tests | Vitest | `public/js/__tests__/`, pure-logic only (no DOM/Firebase deps) |
| CI | GitHub Actions | `.github/workflows/ci.yml` — installs deps, runs `npm test` |
| Hosting | Firebase Hosting | `firebase.json`, public root = `.` (repo root) |

There is intentionally no build step. All third-party libraries load from
CDNs at runtime via versioned URLs (e.g.
`https://www.gstatic.com/firebasejs/10.12.4/...`). This keeps the POC
frictionless to run (`npx serve .` and go) but means there's no dependency
lockfile for the frontend runtime libs, no tree-shaking, and no offline dev
story. See `ROADMAP.md` for when this stops being the right tradeoff.

## Roles

| Role | Home page | Can do |
|---|---|---|
| `pm` | `dashboard.html` | Create, edit, delete projects; manage contacts; backup data |
| `admin` | `dashboard.html` | Everything `pm` can do, plus write access to `users/{uid}` docs |
| `tech` | `technician.html` | View only assigned projects; upload before/after/receipt photos |
| `client` | `pending-approval.html` | Read-only view of projects explicitly shared with them (`clientId`) — status, tasks, estimate total |

Role is stored at `users/{uid}.role` in Firestore and set manually via the
Firebase console today (see `SETUP.md`). `roleHome(role)` in `auth.js` is
the single source of truth for "where does this role land after login."

**Page-level role guards.** Every PM/Admin-only page must call
`await requireAnyRole(['pm', 'admin'])` (or `requireRole('tech')` for the
technician page) near the top of `<body>`, *before* rendering content —
see `technician.html`/`estimate.html`/`stats.html` for the pattern. This
is defense-in-depth on top of `firestore.rules`, not a substitute for it:
Firestore rules are what actually stop a `tech`/`client` user from writing
PM-only data even if a guard is missing, but a missing guard still lets
the wrong role load PM-only UI and hit confusing "permission denied"
errors on write instead of a clean redirect. `dashboard.html`,
`backup.html`, `contacts.html`, and `pending-send.html` were found to be
missing this guard as of 2026-07-12 and have since been fixed — see
`DEVLOG.md`. `pending-approval.html` intentionally has no `pm`/`admin`
guard — it calls `requireRole('client')` instead, since it's the real
`client`-role portal (FR6), not a PM page.

## Data model (Firestore)

```
users/{uid}
  role: "pm" | "admin" | "tech" | "client"
  email?, name?          // hand-entered; see SETUP.md — no client-SDK sync from Firebase Auth

projects/{projectId}
  projectName, address, unit, owner, date, status, assignedTechId?, clientId?
  tasks: [
    { name, hours, rate, material, completed, dueDate?, startTime?, endTime?, blocked? }
  ]
  createdAt, updatedAt   // serverTimestamp()

  tasks/{taskId}/photos/{photoId}      // NOTE: taskId here is a Storage-path key,
    type: "before" | "after" | "receipt"  // NOT the same as an index into projects.tasks[]
    url, storagePath, techId, createdAt

contacts/{contactId}
  (owner/client contact fields)
```

**Design note: `clientId` vs. `contacts`.** `contacts` (name/email/phone/
property) and `clientId` (a Firebase Auth uid granting portal login access)
are two separate, currently-unlinked concepts. A contact record does not
imply that person has — or should have — a login. This was a deliberate
scope decision for FR6: merging them (e.g. "creating a contact optionally
creates a client login") is real product design work (invite flow, email
verification, matching an existing contact to an existing Auth account)
that would have expanded this from "give clients a working portal" into
"build an invite system." A PM assigns portal access explicitly per
project via the dashboard's "Client Portal Access" dropdown, the same
pattern as technician assignment (FR5). Revisit merging the two models
once there's a real need for clients to self-serve their own contact
info, or for one client login to see multiple properties without a PM
manually granting each one.

**Known modeling quirk worth flagging:** `tasks` on a project is an
*embedded array* (no task-level document IDs), but photos live in a
*subcollection* keyed by `taskId` — a string typed into the technician
upload form / selected by array index. These are two different notions of
"task identity" living side by side. It works today because the
technician UI populates the task dropdown from the same array index it
writes into the photos path, but it's fragile: reordering or deleting a
task from `projectData.tasks` silently orphans or mismatches existing
photos. Worth resolving before FR7 (status lifecycle) or FR13 (cascading
delete) get built on top of it — see Roadmap Phase 2.

## Storage layout (Firebase Storage)

```
turnflow/{projectId}/{taskId}/{type}/{uid}/{timestamp}_{filename}
```

## Security rules

`firestore.rules` enforces role checks server-side (not just in the UI):

- `users/{userId}`: read your own doc, or any user doc if you're `pm`/`admin` (needed so PMs can list technicians/clients for assignment — see `firestore-users.js`); write only if `admin`.
- `projects/{projectId}`: read if authenticated **and** (not a `client`, or `resource.data.clientId == request.auth.uid`) — `pm`/`admin`/`tech` read any project, `client` only reads projects explicitly shared with them; write (`create`/`update`/`delete`) only if `pm`/`admin`.
- `projects/{projectId}/tasks/{taskId}/photos/{photoId}`: read if authenticated (not currently `clientId`-scoped — see NFR1 residual gap in `REQUIREMENTS.md`); create only by the `tech` whose `uid` matches `techId` on the doc; update/delete only `admin`.
- `contacts/{contactId}`: read if authenticated; write only `pm`/`admin`.

`storage.rules` (added 2026-07-12, wired into `firebase.json`'s new
`"storage"` block) governs the actual binary files at the path above,
mirroring the Firestore photos-subcollection rule so the two don't drift:

- Read: any authenticated user (matches the Firestore rule's current
  breadth — see the residual `clientId`-scoping gap noted above and in
  NFR1; tightening one without the other would make Storage and Firestore
  disagree about who can see a photo).
- Write: only the `tech` whose uid matches the `{uid}` path segment —
  checked via `firestore.get()` cross-service lookup into
  `users/{uid}.role`, the same role source `firestore.rules` uses, so a
  client or PM can't write into a tech's upload path even though they're
  authenticated.
- Delete: `admin` only.
- Everything outside the known `turnflow/...` path is denied by default
  (`match /{allPaths=**} { allow read, write: if false; }`).

This closes the biggest half of NFR1's Storage gap. What's still open:
the read-side `clientId` scoping (tracked above) and rate limiting/App
Check (NFR3, still Phase 2 todo).

## Content Security Policy (NFR2)

`firebase.json`'s `hosting.headers` sets a CSP on every response (plus
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`). It's a
**pragmatic** CSP, not a maximal one, and that tradeoff was a deliberate
call rather than an accident — worth understanding before touching it:

- `script-src` allowlists exactly the four external hosts the app
  actually loads from (`cdn.tailwindcss.com`, `www.gstatic.com`,
  `cdnjs.cloudflare.com` for jsPDF, `cdn.jsdelivr.net` for Chart.js) —
  arbitrary third-party script injection from anywhere else is blocked.
- `script-src` and `style-src` both still need `'unsafe-inline'`. Every
  page has 1–3 inline `<script type="module">` blocks carrying real
  logic (auth guards, DOM wiring — see `SETUP.md`/`ROADMAP.md`), and the
  Tailwind Play CDN script injects its generated CSS via a runtime
  `<style>` tag. Dropping `'unsafe-inline'` today would break every page.
  Closing this gap for real means extracting all inline module scripts
  into external `.js` files first — a ~25-block refactor across 12 HTML
  files, deliberately deferred rather than done half-verified (no live
  browser in this environment to click through each page afterward).
  **This is the actual remaining edge of NFR2** — the header exists, but
  it isn't blocking script injection the way a CSP ideally would.
- `connect-src`/`img-src` allow `https://*.googleapis.com` (Firestore,
  Auth, Storage all resolve under this) plus `data:` for `img-src`.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'` are all fully enforced with no exceptions — these
  don't conflict with anything the app does today.

## File map

```
index.html              Login page
dashboard.html           PM/Admin: project list, task completion, delete
new-project.html         PM/Admin: create/edit project + tasks
estimate.html            View a single project's estimate (PDF export)
pending-approval.html    Client portal: read-only, clientId-scoped project status view (FR6)
pending-send.html        PM: send-for-approval flow
contacts.html            PM/Admin: contacts CRUD
technician.html          Tech: assigned projects, photo upload, gallery
stats.html                PM/Admin: charts (Chart.js)
backup.html               PM/Admin: export/import JSON
seed.html                 Dev tool: seed one sample project as current tech user
404.html                  Not found page

public/js/
  firebase-config.js      Firebase SDK init (auth, db) — one hardcoded project
  auth.js                 Login, logout, role routing, requireRole/requireAnyRole guards
  firestore-projects.js   Project CRUD + getProjectsByStatus/getProjectsForClient
  firestore-contacts.js   Contact CRUD
  firestore-users.js      Read-only user lookups (e.g. getUsersByRole('tech'|'client'))
  script.js               Dashboard/new-project/stats page logic, DOM wiring
  technician.js            Photo upload + gallery logic
  utils.js                Pure helpers: escHtml, task status derivation, cost calc,
                          assignment labels, PROJECT_STATUSES/projectStatusBadgeClasses()
                          (FR7's shared source of truth, used by both dashboard.html's
                          editable status dropdown and pending-approval.html's read-only badge)
  __tests__/utils.test.js Vitest unit tests for utils.js

firestore.rules           Firestore security rules
storage.rules             Firebase Storage security rules (photo uploads)
firebase.json             Hosting + firestore/storage rules deploy config
.github/workflows/ci.yml  CI: npm test on push/PR to main
```
