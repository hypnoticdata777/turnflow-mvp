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

  tasks/{taskId}/photos/{photoId}      // taskId here IS the array index into
    type: "before" | "after" | "receipt"  // projects.tasks[], as a string — see the
    url, storagePath, techId, createdAt   // modeling quirk note just below

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
*subcollection* keyed by `taskId` — which is the task's array index,
selected from the technician upload form's dropdown. These are two
different notions of "task identity" living side by side. It works today
because the technician UI populates the task dropdown from the same array
index it writes into the photos path, but it's fragile: reordering or
deleting a task from `projectData.tasks` silently orphans or mismatches
existing photos.

This directly limits FR13's cascading delete (2026-07-12): `deleteProject()`
cleans up `tasks/{index}/photos` for every index `0..tasks.length-1` at
delete time, which is correct for a project whose task list never shrank.
But if a task was ever removed via editing after photos were uploaded to
it, those photos now live under an index *beyond* the current array
length — a real subcollection Firestore still has, that nothing queries
for, because the client SDK has no way to enumerate "every subcollection
path that ever existed" the way an Admin SDK/Cloud Function could. This
was flagged as a "resolve before Phase 2's cascading delete" item and
wasn't — the full fix (migrating `tasks` to a real subcollection with
stable document IDs) is a larger structural change than fit in the
cascading-delete pass itself; see the Firestore-scaling trigger in
`ROADMAP.md`'s scaling section, where this promotion was already
anticipated for a different reason (write-cost at scale).

## Storage layout (Firebase Storage)

```
turnflow/{projectId}/{taskId}/{type}/{uid}/{timestamp}_{filename}
```

## Security rules

`firestore.rules` enforces role checks server-side (not just in the UI):

- `users/{userId}`: read your own doc, or any user doc if you're `pm`/`admin` (needed so PMs can list technicians/clients for assignment — see `firestore-users.js`); write only if `admin`.
- `projects/{projectId}`: read if authenticated **and** (not a `client`, or `resource.data.clientId == request.auth.uid`) — `pm`/`admin`/`tech` read any project, `client` only reads projects explicitly shared with them; write (`create`/`update`/`delete`) only if `pm`/`admin`.
- `projects/{projectId}/tasks/{taskId}/photos/{photoId}`: read if authenticated (not currently `clientId`-scoped — see NFR1 residual gap in `REQUIREMENTS.md`); create only by the `tech` whose `uid` matches `techId` on the doc; update `admin` only; delete `pm`/`admin` (loosened from `admin`-only on 2026-07-12 — a plain `pm` deleting their own project needs to also delete its photos, since `deleteProject()` now cascades; see FR13).
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
- Delete: `pm`/`admin` (loosened from `admin`-only alongside the matching
  Firestore rule above, same reason: FR13's cascading delete).
- Everything outside the known `turnflow/...` path is denied by default
  (`match /{allPaths=**} { allow read, write: if false; }`).

This closes the biggest half of NFR1's Storage gap. What's still open:
the read-side `clientId` scoping (tracked above) and rate limiting/App
Check (NFR3, still Phase 2 todo).

## Cascading delete (FR13 / NFR8)

`deleteProject()` in `firestore-projects.js` no longer just deletes the
project document. Before doing that, it walks every task index
`0..tasks.length-1`, queries that index's `photos` subcollection, and for
each photo doc: deletes the Storage object at its `storagePath` (a
missing/already-gone object is logged and skipped, not treated as fatal),
then deletes the photo doc itself. Only after all of that succeeds does
it delete the project doc.

This is a **client-side batched delete**, not a Cloud Function — a
deliberate choice to stay serverless (Cloud Functions need the Blaze
billing plan and a functions deploy pipeline neither of which exist in
this repo yet; see the "when to introduce a backend" trigger in
`ROADMAP.md`'s scaling section). The tradeoff: it only knows about task
indices the *current* `tasks` array has. See the task-identity quirk note
above for the resulting gap (photos under indices from a task that was
since removed via editing aren't caught).

Because this cascade is more destructive than the old "just delete the
project doc" behavior, `script.js`'s `deleteProject()` (the dashboard's
click handler, not to be confused with the same-named Firestore function)
now shows a `confirm()` prompt naming the photo deletion explicitly —
there wasn't one before, and the increased blast radius earned it.

## Content Security Policy (NFR2)

`firebase.json`'s `hosting.headers` sets a CSP on every response (plus
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

`script-src` has **no `'unsafe-inline'`** — real script injection
protection, not just a header for show:

- Allowlists exactly the four external hosts the app loads scripts from
  (`cdn.tailwindcss.com`, `www.gstatic.com`, `cdnjs.cloudflare.com` for
  jsPDF, `cdn.jsdelivr.net` for Chart.js).
- No inline scripts of any kind are allowed to execute — not
  `<script>...</script>` blocks, not `onclick="..."` attributes. This
  required a refactor (2026-07-12): every page previously had 1–3 inline
  `<script type="module">` blocks doing real work (auth guards, DOM
  wiring). All ~25 of them, across all 12 HTML pages, were extracted
  into external files under `public/js/` (shared logic like the
  `pm`/`admin` guard and logout-button wiring) and `public/js/pages/`
  (page-specific logic). `estimate.html`'s one inline `onclick="downloadPDF()"`
  attribute was also converted to `addEventListener`, since inline event
  handlers are governed by `script-src` too and would have forced
  `'unsafe-inline'` back on regardless of the rest of the cleanup.
  See `DEVLOG.md` for the file-by-file breakdown and the verification
  method (byte-for-byte diff of every extracted file against the
  original inline content, plus `node --check` on every new file — no
  live browser available in this environment, so correctness was
  established by diffing and syntax-checking rather than clicking
  through each page).
- Two real bugs surfaced and were fixed during the extraction, not just
  moved: `new-project.html` had its own hand-rolled auth guard using
  `currentUser()` (a synchronous read of `auth.currentUser`) instead of
  the shared `requireAnyRole()` — exactly the auth race condition that
  was supposedly fixed project-wide back in Phase 0. It never adopted
  that fix because it never used the shared helper. Now it does
  (`public/js/guard-pm-admin.js`). And the `onclick` fix above, which
  wasn't just a CSP nicety — it removed a `window.downloadPDF` global.
- `style-src` still needs `'unsafe-inline'` — this is a separate,
  architectural constraint, not an oversight: the Tailwind Play CDN
  script injects its generated CSS via a runtime `<style>` tag, and
  there's no way to avoid that short of dropping the CDN approach
  entirely (see the Vite migration trigger in `ROADMAP.md`'s scaling
  section). Extracting inline scripts doesn't touch this.
- `connect-src`/`img-src` allow `https://*.googleapis.com` (Firestore,
  Auth, Storage all resolve under this) plus `data:` for `img-src`.
- `script-src`/`connect-src`/`frame-src` also allow `https://www.google.com`
  and `https://www.recaptcha.net` — added alongside the App Check work
  below (2026-07-12) so that enabling reCAPTCHA v3 doesn't silently break
  against this CSP the moment someone configures it. Without this, the
  invisible reCAPTCHA iframe (governed by `frame-src`, which falls back to
  `default-src 'self'` if unset — it was unset before this) and its
  verification requests would have been blocked, and App Check would have
  failed with no obvious connection to the CSP as the cause.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'` are all fully enforced with no exceptions.

**Shared/page-specific script layout**, introduced by this refactor:

```
public/js/guard-pm-admin.js   Shared pm/admin page guard (6 pages)
public/js/wire-logout.js      Shared #logoutBtn wiring (5 pages)
public/js/pages/{page}.js           Page-specific main logic
public/js/pages/{page}.guard.js     Page-specific guard (single-role pages)
public/js/pages/{page}.header.js    Page-specific custom header builder
```

## Login security (NFR3)

Two independent layers, added 2026-07-12 — neither is a substitute for
the other:

**1. Client-side login lockout** (`auth.js` + pure helpers in `utils.js`,
always active, no configuration needed). After `LOGIN_LOCKOUT_THRESHOLD`
(5) failed attempts for the same email, the login form refuses further
attempts for `LOGIN_LOCKOUT_MS` (30s), tracked per-email in
`localStorage` under `tf_login_attempts`. The lockout/attempt-counting
logic itself is pure (`recordFailedLogin`, `getLockoutRemainingMs`,
`clearLoginAttempts`) and unit tested; `auth.js` only wires it to actual
`localStorage` reads/writes. **This is a UX deterrent, not real
security** — it's trivially bypassed by clearing `localStorage`, using a
different browser, or (the case that actually matters) not using the
login form at all and calling Firebase Auth's REST API directly. Be
honest with anyone reading this about what it does and doesn't stop.

**2. Firebase App Check** (`firebase-config.js`, the real defense,
**inert until configured**). Attaches a reCAPTCHA v3 token to every
Auth/Firestore/Storage request; Firebase can reject requests that don't
carry a valid one, which stops exactly the REST-API-abuse case the
lockout above can't touch. The code checks whether
`RECAPTCHA_V3_SITE_KEY` is still the placeholder string and no-ops with a
`console.warn` if so — shipping this inert by default was deliberate,
since a placeholder key passed to `initializeAppCheck()` would throw, not
gracefully degrade. Three manual steps remain, and can only be done by
whoever holds Firebase console access to this project (not something
achievable from a coding session alone):
1. Register a reCAPTCHA v3 provider for this web app in the console to
   get a site key.
2. Paste that key over the placeholder in `firebase-config.js`.
3. Turn on enforcement per-product (Auth, Firestore, Storage) in the
   console — a site key alone does nothing until enforcement is flipped
   on separately for each product.

Full walkthrough, including the local-dev debug-token step (`localhost`
isn't a registered domain, so App Check rejects it by default once
enforcement is on), is in `SETUP.md`.

## Pagination (NFR5)

`getProjectsPage({ pageSize, cursor })` in `firestore-projects.js` replaces
`dashboard.html`'s use of `getAllProjects()`. It queries
`orderBy('createdAt', 'desc')` + `limit(pageSize + 1)` (the `+1` is a
standard trick: fetch one extra to know whether there's a next page
without a separate count query, then trim it off), plus `startAfter(cursor)`
on subsequent pages. `cursor` is the previous page's last
`QueryDocumentSnapshot` — Firestore's `startAfter()` needs the actual
snapshot to resume ordering correctly, not just the document's `id`.
`dashboard.js` keeps `cursor`/`totalLoaded` in module-level state and
appends each page's cards via `insertAdjacentHTML` rather than replacing
`innerHTML`, so the click/change listeners — delegated on the `#projectList`
container, not attached per-card — keep working on newly-appended cards
with no extra wiring. No composite Firestore index is needed: a single
`orderBy` with no additional `where()` clause is auto-indexed.

This assumes every project has `createdAt` set — true for every project
created through the app (`createProject()` always sets it via
`serverTimestamp()`), but a project inserted directly via the Firebase
console without that field would silently never appear in the paginated
list (Firestore's `orderBy` excludes documents missing the ordered
field). Not a new risk introduced by pagination — a hand-created
document missing expected fields already breaks other assumptions in
this codebase (e.g. `project.tasks.reduce(...)` assumes `tasks` exists)
— just worth naming so it isn't a surprise later.

**`getAllProjects()` (full-collection fetch) is kept, deliberately, for
two remaining callers where it's still the right tool:**
- `backup.html` — exporting *everything* is the entire point of a backup.
- `stats.html` — investigated switching this to Firestore's
  `count()`/`sum()` aggregation queries, which run server-side and would
  meaningfully cut reads/bandwidth. **They don't actually fit this data
  model**: aggregation queries count matching *documents* or sum a stored
  numeric *field* on each — they can't reach into `tasks` (an embedded
  array on each project doc, not a subcollection — see the task-identity
  note above) and sum a per-task computed expression like
  `hours * rate + material`, or count array elements matching
  `completed == true`. A real fix would mean denormalizing summary
  fields (`totalCost`, `completedTaskCount`, etc.) onto each project doc
  and keeping them in sync on every write that touches `tasks` (create,
  update, `markTaskComplete`) — real scope and real drift risk, for a
  stats page that isn't in the main PM/tech/client workflow. Left as a
  full scan for now; revisit alongside the task-identity subcollection
  migration already tracked for FR13, since promoting `tasks` to real
  documents would make both this and per-task aggregation straightforward
  at the same time.

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
  script.js               Sidebar loading, new-project form + stats-chart DOM wiring,
                          window.* exports (viewProject/editProject/deleteProject/
                          markTaskComplete/tf_getTaskStatus/tf_statusLabel) consumed by
                          public/js/pages/dashboard.js
  technician.js            Photo upload + gallery logic
  utils.js                Pure helpers: escHtml, task status derivation, cost calc,
                          assignment labels, PROJECT_STATUSES/projectStatusBadgeClasses()
                          (FR7's shared source of truth, used by both dashboard.html's
                          editable status dropdown and pending-approval.html's read-only badge),
                          login-lockout logic (NFR3, wired to localStorage by auth.js)
  guard-pm-admin.js       Shared pm/admin page guard (CSP extraction, 2026-07-12)
  wire-logout.js          Shared #logoutBtn wiring (CSP extraction, 2026-07-12)
  pages/                  Page-specific logic extracted from inline <script> blocks
                          (dashboard.js, backup.js, contacts.js, pending-send.js,
                          estimate.js, seed.js, technician-projects.js, plus
                          {page}.guard.js/{page}.header.js for the single-role pages)
  __tests__/utils.test.js Vitest unit tests for utils.js

firestore.rules           Firestore security rules
storage.rules             Firebase Storage security rules (photo uploads)
firebase.json             Hosting + firestore/storage rules deploy config, CSP headers
.github/workflows/ci.yml  CI: npm test on push/PR to main
```
