# Dev Log

Reverse-chronological log of what changed and why. Historical entries
before 2026-07-12 are reconstructed from `git log`; add new entries at the
top going forward. When an entry closes an FR/NFR from `REQUIREMENTS.md`,
reference the ID so status stays traceable.

---

### 2026-07-12 — Phase 2: login security, both layers (NFR3)

- **Added — client-side lockout (always on):** `auth.js`'s login form now
  locks out an email for 30s after 5 failed attempts, tracked per-email
  in `localStorage`. The counting/lockout logic itself
  (`recordFailedLogin`, `getLockoutRemainingMs`, `clearLoginAttempts`,
  `normalizeEmailKey`) is pure and lives in `utils.js` — `auth.js` only
  wires it to real `localStorage` reads/writes. 8 new tests, 42 total
  passing. **Honest framing, not oversold:** this deters someone
  manually retrying the login form; it does nothing against a script
  calling Firebase Auth's REST API directly.
- **Added — Firebase App Check (the real defense, currently inert):**
  wired up `initializeAppCheck()` with a `ReCaptchaV3Provider` in
  `firebase-config.js`, gated behind a placeholder site-key check so it
  no-ops with a `console.warn` instead of throwing until someone
  actually configures it. Three steps remain and are Firebase-console
  work only the project owner can do — registering a reCAPTCHA v3 key,
  pasting it in, and flipping enforcement on per-product (Auth,
  Firestore, Storage all separately). Documented as a numbered
  walkthrough in `SETUP.md`, including the local-dev debug-token step
  (a commented-out `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;` line is
  already in the file, ready to uncomment).
- **Caught a real integration bug before it could bite:** reCAPTCHA v3
  needs to load a script and open an iframe from `www.google.com`
  (`www.recaptcha.net` as a fallback), and make verification requests to
  the same domain. None of that was allowlisted in the CSP added earlier
  today (NFR2) — worse, `frame-src` was never set at all, which falls
  back to `default-src 'self'` and would have silently blocked
  reCAPTCHA's iframe. Had this shipped as-is, the moment someone
  completed the three console steps above, App Check would have started
  failing with no obvious link back to "the CSP from this morning" as
  the cause. Added `https://www.google.com`/`https://www.recaptcha.net`
  to `script-src`, `connect-src`, and a newly-added `frame-src` directive.
- Verified: `node --check` on every touched file, full `npm test`
  (42/42), `firebase.json` JSON validity.

---

### 2026-07-12 — Phase 2: cascading delete for task photos (FR13/NFR8)

- **Added:** `deleteProject()` in `firestore-projects.js` now walks every
  task index on the project (`0..tasks.length-1`), deletes every photo's
  Storage object (by its stored `storagePath`) and Firestore doc under
  `tasks/{index}/photos`, then deletes the project doc itself. A
  missing/already-deleted Storage object is logged and skipped rather
  than aborting the whole delete.
- **Chose client-side over Cloud Functions:** the roadmap's other option
  (a Cloud Function on document delete) needs the Blaze billing plan and
  a functions deploy pipeline, neither of which exist in this repo —
  would have meant introducing new infrastructure to close a data-
  integrity gap. Client-side batched delete gets the same practical
  result without that dependency.
- **Rule change required:** `firestore.rules`'s photos-subcollection
  delete and `storage.rules`'s delete were both `admin`-only. A plain
  `pm` deleting their own project (which they're fully allowed to do)
  would have had the project doc deleted but then hit permission-denied
  on every photo cleanup call — a real inconsistency, not a hardening
  choice, since `pm` already has full delete rights at the project
  level. Loosened both to `pm`/`admin`.
- **Added a confirmation prompt that didn't exist before:** the
  dashboard's delete button had no `confirm()` at all. Now that delete
  also permanently destroys uploaded photos, not just a project record,
  the blast radius of a misclick grew — added a `confirm()` naming the
  photo deletion explicitly.
- **Found, documented, not fixed:** the cascade only knows about task
  indices the *current* `tasks` array has. If a task was ever removed via
  editing after photos were uploaded to it, those photos live under an
  index beyond today's array length — a real subcollection Firestore
  still has that nothing queries for, since the client SDK can't
  enumerate "every subcollection path that ever existed" the way an
  Admin SDK/Cloud Function could. The roadmap had already flagged
  resolving the task-identity quirk (embedded array vs. subcollection
  keyed by array index) as something to do *before* this cascading
  delete — it wasn't, because that's a larger structural migration
  (real task subcollection with stable IDs) than fit inside this pass.
  Documented in `ARCHITECTURE.md`, `REQUIREMENTS.md` (FR13 marked 🟡, not
  ✅), and `ROADMAP.md` rather than silently left for someone to discover.
- No test changes — this logic is Firestore/Storage I/O with no pure
  function to extract, consistent with the rest of `firestore-projects.js`
  (none of which is unit tested; see the Phase 0 stretch goal for a rules/
  emulator test layer that would cover this properly). 34/34 existing
  tests still passing.

---

### 2026-07-12 — Phase 2: close out CSP for real (NFR2) — inline script extraction

Follow-up to the CSP pass earlier today. Asked whether to leave
`script-src 'unsafe-inline'` as a known gap or close it now; decided the
risk was manageable (every inline block is already `type="module"`,
which executes identically whether inline or external — the only real
failure modes are a wrong path or a missed block, both catchable without
a browser) and closed it same-day.

**What changed:**
- Extracted all ~25 inline `<script type="module">` blocks across all 12
  HTML pages into external files:
  - `public/js/guard-pm-admin.js` — the `requireAnyRole(['pm','admin'])`
    guard, previously copy-pasted identically into 6 files (`dashboard`,
    `backup`, `contacts`, `pending-send`, `stats`, `estimate`). Confirmed
    byte-identical across all 6 before consolidating.
  - `public/js/wire-logout.js` — the `#logoutBtn` click-to-`logout()`
    wiring, previously copy-pasted identically into 5 files. Same
    byte-identical confirmation.
  - `public/js/pages/*.js` — page-specific logic that only appeared
    once: `dashboard.js`, `backup.js`, `contacts.js`, `pending-send.js`,
    `estimate.js`, `seed.js`, `technician-projects.js`, plus
    `pending-approval.guard.js`/`.header.js`/`.js` and
    `technician.guard.js`/`.header.js` for the two single-role pages.
- Also fixed `estimate.html`'s one inline `onclick="downloadPDF()"`
  attribute — inline event-handler attributes are governed by
  `script-src` too, so leaving it would have forced `'unsafe-inline'`
  back on regardless of the rest of the extraction. Converted to
  `getElementById + addEventListener`, dropped the `window.downloadPDF`
  global it depended on.
- `firebase.json`'s CSP: removed `'unsafe-inline'` from `script-src`.
  `style-src` keeps it — architectural, not deferred (Tailwind Play CDN
  injects runtime CSS; see `ARCHITECTURE.md`).

**Bug found and fixed along the way, not just moved:** `new-project.html`
had its own hand-rolled guard using `currentUser()` (a synchronous read
of `auth.currentUser`) instead of the shared `requireAnyRole()` — this is
*exactly* the auth race condition that `requireRole`/`requireAnyRole`
were built to fix, per the 2026-03-01 devlog entry below. It never got
that fix because it never called the shared helper. It does now
(`public/js/guard-pm-admin.js`), so a PM refreshing that page can no
longer get bounced to `index.html` by a slow-resolving session.

**How this was verified without a live browser** (the constraint that
made this a judgment call in the first place):
1. `node --check` on every one of the 14 new files — confirmed valid JS
   syntax (Node's ES module parser handles `https://` import specifiers
   fine for a syntax-only check, since it doesn't try to resolve them).
2. Byte-for-byte diff (`diff -B -w`, ignoring blank lines/whitespace) of
   every extracted file against the exact original inline content pulled
   from `git show HEAD:<file>` — confirmed the *only* differences were
   the intended ones: relative import paths updated (`./public/js/x.js`
   → `../x.js`, since the file's own location changed) and the two
   deliberate fixes above. No accidental content loss or retyping
   errors anywhere.
3. `grep` sweep confirming zero remaining inline `<script type="module">`
   blocks and zero remaining inline `on*=` attributes anywhere in the repo.
4. Full `npm test` — 34/34 still passing (this refactor didn't touch
   `utils.js` or its tests).

**Not changed:** page behavior, DOM structure, event wiring, and
execution order are all identical to before — `type="module"` scripts
already execute deferred (after parse, in document order) whether inline
or external, so extraction is a pure relocation, not a timing change.

---

### 2026-07-12 — Phase 2: CSP + security headers (NFR2)

- **Added:** `Content-Security-Policy` (plus `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`) to `firebase.json`'s
  `hosting.headers`, applied to every response.
- **Investigated first, then asked before implementing:** checked how
  many inline `<script type="module">` blocks exist across the app
  (~25, across 12 of 12 HTML pages) before writing the CSP, because a
  real `script-src` lockdown (no `'unsafe-inline'`) would break every one
  of them today. Rather than silently pick between "ship a weak/
  theatrical CSP" and "refactor every page's inline scripts into
  external files without being able to browser-test the result here,"
  surfaced the tradeoff and asked — chose the pragmatic option: allowlist
  the 4 real external script hosts (`cdn.tailwindcss.com`,
  `www.gstatic.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`), lock
  down `frame-ancestors`/`object-src`/`base-uri`/`form-action` fully (no
  exceptions needed there), but keep `'unsafe-inline'` on `script-src`/
  `style-src` since the current architecture requires it.
- **What this actually buys:** blocks arbitrary third-party script/
  resource loading from any host not on the allowlist, and closes
  clickjacking/embedding/base-tag-injection vectors completely. **What it
  does not do:** stop an XSS payload injected as an inline `<script>` tag
  from executing — that specific protection requires the inline-script
  extraction refactor, tracked as a named follow-up in `ROADMAP.md`/
  `REQUIREMENTS.md`, not silently dropped.
- No code/test changes — headers + docs only. 34/34 tests still passing.

---

### 2026-07-12 — Phase 2: Storage rules (NFR1) — first Phase 2 item

- **Added:** `storage.rules` — the biggest unreviewed security gap called
  out repeatedly since Phase 0 finally has a version-controlled fix.
  Photo uploads previously relied on whatever was (or wasn't) configured
  directly in the Firebase console, invisible to this repo. Mirrors the
  Firestore photos-subcollection rule's intent: read requires auth, write
  requires `tech` role *and* a matching uid on the `turnflow/{projectId}/
  {taskId}/{type}/{uid}/{fileName}` path, delete is `admin`-only, and
  everything outside that path is denied by default.
- **Technique worth noting:** the write rule checks role via
  `firestore.get(/databases/(default)/documents/users/$(request.auth.uid))
  .data.role`, a cross-service lookup from Storage rules into the same
  `users/{uid}` doc Firestore rules already use — so Storage and Firestore
  enforce the same role model from one source of truth instead of two
  rule files that could quietly drift apart.
- **Wired in:** `firebase.json` gained a `"storage"` block; `storage.rules`
  added to the hosting `ignore` list (shouldn't be served as a static
  file, same treatment as `firestore.rules`).
- **Did not fix (documented, not silently dropped):** the read side isn't
  `clientId`-scoped, in either `storage.rules` or the parallel Firestore
  photos-subcollection rule. Tightening one without the other would make
  the two rule files disagree about who can see a photo, so this is
  flagged as one combined follow-up rather than two half-fixes.
- No test/code changes — this is a rules-only, docs-only change. Test
  suite still at 34/34 passing.

---

### 2026-07-12 — Phase 1: project status lifecycle UI (FR7) — Phase 1 complete

- **Added:** PM dashboard now has a per-project **Status** dropdown
  (Pending Approval / Approved / Sent / Completed) that writes `status`
  via `updateProject()` — reused the exact same `.assignSelect` /
  `data-field` change handler already built for FR5/FR6's assignment
  dropdowns, so no new event-handling logic was needed, just a new
  `<select>` in the template. (FR7 ✅)
- **Added:** `pending-send.html` — whose entire purpose is surfacing
  projects ready for the Approved → Sent step — got a one-click **Mark as
  Sent** button instead of only a "View" link. On success it re-runs the
  page's query (the project no longer matches `status == "Approved"`, so
  it drops off the list immediately).
- **Added to `utils.js` (shared, tested):** `PROJECT_STATUSES` (the
  canonical 4-value lifecycle array) and `projectStatusBadgeClasses()`
  (color classes per status). Deliberately **not** a strict state
  machine — the dashboard dropdown allows any status → any status, since
  a PM correcting a mis-click shouldn't need a Firestore console edit.
  3 new tests, 34 total passing.
- **Deduplicated:** `pending-approval.html` had its own inline
  `statusBadgeClasses()` copy from the FR6 pass a few hours earlier — that
  local copy is gone, both pages now import the same function from
  `utils.js`. This is the kind of drift the workbook's "don't duplicate
  status-badge logic across pages" concern in `ARCHITECTURE.md` exists to
  catch; catching and fixing it same-day is the system working as
  intended, not a mistake being covered up.
- **Phase 1 is now fully closed** (FR5 tech assignment, FR6 client portal,
  FR7 status lifecycle). See `ROADMAP.md` — Phase 2 hardening
  (Storage rules, CSP, cascading delete, pagination) is next.

---

### 2026-07-12 — Phase 1: real client portal (FR6)

- **Rebuilt** `pending-approval.html` from a PM-facing, unscoped "all
  Pending Approval projects" list into the actual `client` role's portal:
  guarded by `requireRole('client')`, custom minimal header (no PM
  sidebar), read-only project cards (status badge, task list, estimate
  total) scoped to the logged-in client only. (FR6 ✅)
- **Added:** `clientId` field on `projects`, set by a PM from a new
  "Client Portal Access" dropdown on `dashboard.html` — same UX pattern
  as FR5's technician-assignment dropdown, and reuses the same
  `getUsersByRole()`/`formatUserLabel()` building blocks (added
  `getProjectsForClient()` to `firestore-projects.js` and
  `assignedClientLabel()` to `utils.js`, refactored alongside
  `assignedTechLabel()` to share one `resolveAssignedLabel()` instead of
  duplicating the lookup logic). 4 new unit tests, 31 total passing.
- **Changed rule:** `firestore.rules` — added `isClient()` helper;
  `projects/{projectId}` read is now `isAuthed() && (!isClient() ||
  resource.data.clientId == request.auth.uid)`. PM/Admin/Tech reads are
  unchanged; a `client` can now only read a project explicitly shared
  with them, enforced server-side, not just hidden in the UI.
- **Cleanup:** removed the "⏳ Pending Approval" link from the shared PM
  sidebar (`public/components/sidebar.html`) — that destination is now
  client-only, so a PM clicking it would just bounce back to their own
  dashboard.
- **Found, documented, not yet fixed:** the `tasks/{taskId}/photos/{photoId}`
  subcollection rule still allows any authenticated user to read
  regardless of `clientId` — no current UI exposes this to a client, but
  it's not enforced at the rule layer if someone queries it directly.
  Tracked as a residual NFR1 gap for Phase 2 alongside the still-missing
  Storage rules.
- **Design call documented (not built):** `contacts` (name/email/phone)
  and `clientId` (Firebase Auth login) are deliberately kept as separate,
  unlinked concepts for now — see `ARCHITECTURE.md`. Building an
  invite/self-serve flow that merges them is real scope on its own, not
  something to fold silently into FR6.

---

### 2026-07-12 — Phase 1: technician assignment UI, plus a page-guard gap found along the way

- **Added:** PM dashboard can now assign a technician to a project from a
  dropdown (`dashboard.html`) instead of hand-editing `assignedTechId` in
  the Firestore console. (FR5 ✅)
- **Added:** `public/js/firestore-users.js` — `getUsersByRole(role)`, the
  first read query against the `users` collection from app code (previously
  only single-doc `getUserRole()` lookups existed).
- **Changed rule:** `firestore.rules` — `users/{userId}` read now allows
  `pm`/`admin` to read *any* user doc, not just their own. Required so the
  assignment dropdown can list technicians; write access is unchanged
  (`admin`-only).
- **Added (pure, tested):** `formatUserLabel()` and `assignedTechLabel()`
  in `utils.js` — 6 new unit tests, 27 total passing.
- **Found and fixed while implementing the above:** `dashboard.html`,
  `backup.html`, `contacts.html`, and `pending-send.html` had **no
  page-level role guard** — unlike `technician.html`/`estimate.html`/
  `stats.html`, they never called `requireRole`/`requireAnyRole`. A
  logged-in `tech` or `client` user who navigated to these URLs directly
  would see PM-only UI (writes would still fail server-side via Firestore
  rules, so this wasn't a data-access hole, but it's inconsistent with the
  stated role model and produces confusing failed-write errors instead of
  a clean redirect). All four now call
  `await requireAnyRole(['pm', 'admin'])`. `pending-approval.html` is
  deliberately left unguarded — it's also the `client` role's landing
  page and is being rebuilt as part of FR6 next, not patched in place.
  (NFR1)
- **Setup note added:** technician `users/{uid}` docs should now include
  an `email` or `name` field so the new assignment dropdown shows
  something more useful than a raw uid — there's no way to sync this
  automatically from Firebase Auth via the client SDK. Documented in
  `docs/SETUP.md`.

---

### 2026-07-12 — Phase 0 stabilization: fix seed tool, add tests + CI, workbook created

- **Fixed:** `seed.html` imported `auth` and `db` from `public/js/auth.js`,
  which never re-exported them (only re-exports helper *functions*) —
  the import would throw at module load, so the dev seed tool was
  completely broken. Now imports `auth`/`db` from `firebase-config.js`
  directly and `currentUser` from `auth.js`. (NFR4)
- **Refactored:** extracted `tf_isValidDate`, `tf_parseDate`,
  `tf_getTaskStatus`, `tf_statusLabel` (previously private to `script.js`)
  and a new `calculateEstimateTotal()` into `public/js/utils.js` so the
  app's core business logic has zero DOM/Firebase dependencies and can be
  unit tested in Node. `script.js` now imports these instead of
  duplicating them. (NFR7)
- **Added:** `package.json` + Vitest; 21 unit tests in
  `public/js/__tests__/utils.test.js` covering task status derivation,
  cost calculation, date parsing, and HTML escaping. All passing.
- **Added:** `.github/workflows/ci.yml` — runs `npm test` on every push/PR
  to `main`. (NFR4)
- **Added:** this documentation workbook (`docs/WORKBOOK.md`,
  `REQUIREMENTS.md`, `ARCHITECTURE.md`, `SETUP.md`, `ROADMAP.md`,
  `DEVLOG.md`) to give the project stable, trackable pillars going into
  Phase 1.
- **Assessed and documented (not yet fixed):** no `storage.rules` file
  exists — Storage access control is currently unreviewed/not
  version-controlled (NFR1); no cascading delete for task photo
  subcollections (FR13/NFR8); client role is a stub (FR6); technician
  assignment is manual via Firestore console (FR5). All tracked in
  `REQUIREMENTS.md` and scheduled in `ROADMAP.md` Phases 1–2.

---

### 2026-03-02 / 2026-03-03 — Hosting fix, auth guards, technician UX

- Fixed Firebase Hosting `public/` mismatch — hosting root changed to `.`
  so all HTML pages deploy correctly.
- Added auth guards on `stats.html` and `estimate.html` (PM/admin only)
  via new `requireAnyRole` helper.
- Technician photo upload UX: Project/Task free-text inputs replaced with
  auto-populated dropdowns (`technician.html`).
- README updated to reflect current system and next build priorities.

### 2026-03-01 / 2026-03-02 — Auth race condition fix

- `requireRole` now waits for Firebase to resolve the auth session
  (`onAuthStateChanged`) before redirecting, instead of trusting
  `auth.currentUser` synchronously — fixes a false-redirect bug on page
  refresh for logged-in users.
- Resolved other critical/high severity issues found in a prior review
  pass.

### 2025-11-25 / 2025-11-26 — Firestore migration

- Migrated project/contact data from `localStorage` to Firestore.
- Added auth protection across pages.
- Critical bug fixes across multiple pages (PR #1, PR #2).

### 2025-10-11 – 2025-10-13 — Firebase Auth + structural refactor

- Integrated Firebase Authentication.
- Technician dashboard introduced; upload flow refactored.
- Entire project structure refactored and logic centralized (precursor to
  today's `public/js/*.js` module layout).

### 2025-09-29 — Responsive layout

- Flexbox + media query layout for sidebar/content; container wrapper for
  centered responsive layout; confirmed mobile viewport behavior.

### 2025-09-03 — Task status badges

- Added status helper functions and color-coded status badges to the
  dashboard (the precursor to `tf_getTaskStatus`/`tf_statusLabel`, later
  extracted into `utils.js` on 2026-07-12).
- Firebase Hosting configured to serve repo root.

### 2025-07-24 – 2025-07-31 — Initial build

- Initial commit: TurnFlow MVP.
- v1.0 stable baseline: stats fix, working dashboard.
- v2.0: Contacts, Pending Approval tab, multiple tasks per project.
- Stats chart bug fix; Technician Dashboard added.
