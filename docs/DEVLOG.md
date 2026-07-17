# Dev Log

Reverse-chronological log of what changed and why. Historical entries
before 2026-07-12 are reconstructed from `git log`; add new entries at the
top going forward. When an entry closes an FR/NFR from `REQUIREMENTS.md`,
reference the ID so status stays traceable.

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
