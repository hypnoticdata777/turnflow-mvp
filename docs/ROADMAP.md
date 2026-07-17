# Roadmap

This roadmap closes the gaps tracked in `REQUIREMENTS.md`, in the order
that gives the best "looks/feels complete" return per unit of effort for a
POC, then lays out how to ramp up scaling once the POC needs to become a
pilot or a real product.

Each phase lists the FR/NFR IDs it targets so `REQUIREMENTS.md` stays the
single source of truth for status.

---

## Phase 0 — Stabilize ✅ (done 2026-07-12)

Goal: make the codebase trustworthy to build on top of.

- [x] Fix `seed.html`'s broken import (`auth`/`db` were imported from
      `auth.js`, which never re-exported them — dev seeding tool was dead). (NFR4)
- [x] Extract pure logic (`tf_getTaskStatus`, `tf_statusLabel`,
      `calculateEstimateTotal`, date helpers) out of `script.js` into
      `utils.js` so it's unit-testable without a browser or Firebase. (NFR7)
- [x] Add `package.json` + Vitest, 21 unit tests over the extracted logic. (NFR7)
- [x] Add GitHub Actions CI running `npm test` on push/PR to `main`. (NFR4)

**Stretch (not done, worth doing next if time allows):**
- Firestore rules unit tests via `@firebase/rules-unit-testing` + the Firebase emulator — currently `firestore.rules` has zero automated verification, only manual console testing.
- A smoke-test layer (Playwright) that logs in as each role and asserts it lands on the right home page — would have caught the `seed.html` issue faster and catches routing regressions.

---

## Phase 1 — Close the persona gap (target: 1–2 weeks)

Goal: all three roles named in the README actually work end-to-end. Right
now "client" is a stub, which is the single most visible gap in any demo.

- [x] **FR5 — Technician assignment UI.** (done 2026-07-12) Dropdown on
      the PM dashboard, populated from `users` where `role == 'tech'` via
      new `firestore-users.js`, writes `assignedTechId` via
      `updateProject()`. Removes the last "edit Firestore by hand" step
      for this flow. Required loosening the `users/{userId}` read rule to
      let PM/Admin read any user doc (previously own-doc-only), and
      surfaced that `dashboard.html`/`backup.html`/`contacts.html`/
      `pending-send.html` had no page-level role guard at all — fixed as
      part of the same change (NFR1).
- [x] **FR6 — Real client portal.** (done 2026-07-12) `pending-approval.html`
      rebuilt as the `client` role's home page: read-only cards scoped to
      `getProjectsForClient(uid)`, matching a new `clientId` field on
      `projects`. PM assigns portal access from a new dropdown on
      `dashboard.html` (reused the FR5 pattern/helpers). `firestore.rules`
      now restricts `projects` reads for the `client` role to
      `resource.data.clientId == request.auth.uid`; PM/Admin/Tech reads are
      unchanged. The stale "Pending Approval" nav link was removed from the
      shared PM sidebar since the destination is now client-only.
- [x] **FR7 — Status lifecycle UI.** (done 2026-07-12) PM dashboard got a
      status dropdown per project (free transition between all 4 statuses,
      not a strict state machine — correcting a mistake shouldn't require
      a console edit). `pending-send.html` also got a dedicated "Mark as
      Sent" button, since that page's entire purpose is the
      Approved → Sent step. Added `PROJECT_STATUSES` and
      `projectStatusBadgeClasses()` to `utils.js` as the shared,
      unit-tested source of truth for valid statuses and their badge
      styling — reused by both the dashboard and the client portal so the
      two views can't drift out of sync on what a status looks like.

**Phase 1 is now complete** (FR5, FR6, FR7 all ✅). Moving to Phase 2.

Resolve the task-identity quirk noted in `ARCHITECTURE.md` (tasks as an
embedded array vs. photos keyed by array-index-as-string) *before* or
*during* this phase — FR7's status transitions and Phase 2's cascading
delete both get harder to reason about if task identity stays ambiguous.

---

## Phase 2 — Harden (target: 1–2 weeks)

Goal: safe to point at from outside your own laptop.

- [ ] **NFR1 — Storage rules.** Add `storage.rules`, mirror the
      tech/admin logic already in `firestore.rules`, wire it into
      `firebase.json`. This is currently the biggest unreviewed security
      gap — photo files in Storage have no version-controlled access
      control today.
- [ ] **NFR2 — CSP headers** in `firebase.json`'s `hosting.headers`.
- [ ] **NFR3 — Login rate limiting / App Check.**
- [ ] **FR13 / NFR8 — Cascading delete** for `tasks/{id}/photos` and
      their Storage objects when a project is deleted. A Cloud Function
      on document delete is the cleanest fix; a client-side batched
      delete works if you want to stay serverless a while longer (see
      "When to introduce a backend" below).
- [ ] **NFR5 — Pagination.** Replace `getAllProjects()`'s full-collection
      fetch with cursor-based pages (`startAfter`) on the dashboard, and
      stop `stats.html` from pulling the entire collection client-side.
      Do this before demoing with realistic data volumes, not after.

---

## Phase 3 — Polish for external eyes (target: ~1 week)

Goal: doesn't look like a POC anymore.

- [ ] **FR9 — PDF quality.** Swap plain-text jsPDF output for the
      `autotable` plugin — matters disproportionately for a client-facing
      estimate.
- [ ] **NFR9 — Error/loading UX.** Replace `alert()`-based error handling
      with inline banners/toasts and visible loading states.
- [ ] **NFR6 — Environment separation.** Second Firebase project for
      dev/staging; `firebase-config.js` picks config by environment
      instead of one hardcoded prod project. Lets you demo/break things
      without touching real data.

---

## Phase 4 — POC → pilot readiness (ongoing)

- [ ] **NFR10 — Deploy pipeline.** CI step that deploys `firestore:rules`
      + `hosting` on merge to `main` (currently manual `firebase deploy`).
- [ ] Basic usage analytics (who's logging in, which role, how often) —
      useful pilot-readiness signal before deciding what to build next.
- [ ] Revisit the "no build step" decision (see below) once the client
      portal + assignment flow add real interaction complexity.

---

## Scaling path — how to ramp this up beyond POC

The POC's biggest strength (small surface area, zero build tooling, direct
CDN imports) is exactly what will need to change first if usage grows.
Don't do any of this preemptively — each item below has a **trigger
condition**; build it when you hit the trigger, not before.

### 1. Frontend: vanilla JS → lightweight framework
- **Trigger:** once Phase 1's client portal + technician assignment UI are
  in, you'll have real cross-page state (selected project, role-scoped
  views, live status updates) that `sessionStorage` + `window.fn = ...`
  globals will start to strain under.
- **Path:** don't jump to a heavy SPA framework. A build tool (Vite) plus
  either continued vanilla JS or a light reactive layer (Preact/Alpine) is
  enough. Vite also solves the "no lockfile for CDN-loaded libs" problem
  for Firebase SDK, Chart.js, jsPDF, Tailwind — all become real `npm`
  dependencies with pinned versions.

### 2. Backend: add Cloud Functions when client-side logic starts making trust assumptions
- **Trigger:** cascading deletes (Phase 2), PDF generation that shouldn't
  be spoofable from the client, or any "send notification" feature
  (email/SMS on status change) — these all either need privileged access
  Firestore rules can't express, or need to run somewhere the client can't
  tamper with.
- **Path:** Firebase Cloud Functions is the natural next step since you're
  already all-in on Firebase; no need to stand up a separate backend
  service for this stage.

### 3. Data: Firestore scaling limits
- **Trigger:** `getAllProjects()`-style full scans (Phase 2 fixes the
  worst of this) and the embedded-tasks-array model (`ARCHITECTURE.md`)
  both get expensive as project/task counts grow — Firestore document
  writes are limited to 1MiB and a large `tasks` array increases
  read/write cost on every update.
- **Path:** once a single project regularly has dozens of tasks, promote
  `tasks` from an embedded array to a `projects/{id}/tasks/{taskId}`
  subcollection with real document IDs. This also directly resolves the
  task-identity quirk and makes FR13's cascading delete a straightforward
  subcollection delete instead of an array-splice-then-orphan problem.

### 4. Multi-environment & multi-tenant
- **Trigger:** Phase 3's environment separation (dev/staging/prod) is the
  first step. If TurnFlow ever serves more than one property-management
  company, the next trigger is genuine multi-tenancy: every collection
  needs an `orgId`/`tenantId` field and every security rule needs to check
  it, not just role.
- **Path:** design the `orgId` field in *before* you have a second real
  customer, even if it's a POC — retrofitting a tenant boundary into
  Firestore rules and every query after the fact is much more error-prone
  than adding it as an unused-but-present field now.

### 5. Observability
- **Trigger:** the moment this is used by someone other than you day to
  day — right now failures are only visible via `console.error` in a
  browser devtools tab nobody else has open.
- **Path:** Firebase Crashlytics/Performance Monitoring, or even just a
  Cloud Function that forwards `console.error`-worthy failures somewhere
  you'll see them (Slack webhook, email). Cheap to add, disproportionately
  valuable once you're not the only user.

---

## Suggested order if you want one linear path

Phase 0 (done) → Phase 1 → Phase 2 → Phase 3 → re-evaluate Phase 4 and the
scaling triggers above based on actual usage, not in advance.
