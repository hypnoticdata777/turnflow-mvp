# Roadmap — path to TurnFlow Home

This roadmap closes the gaps tracked in the canonical
[`REQUIREMENTS.md`](./REQUIREMENTS.md) (the 10-pillar TurnFlow Home
requirement set), in the order that gets to a genuinely useful MVP fastest
without building the wrong thing twice.

Every package below references the requirement IDs it closes
(`BR`/`BRL`/`CON`/`EXT`/`FEAT`/`FR`/`NFR`/`QA`/`SYS`/`UR`) so
`REQUIREMENTS.md` stays the single source of truth for status — flip the
status column there when a package ships, don't track status here.

**Version framing:**

| Version | What it is |
|---|---|
| v1.0 | Pre-pivot baseline — a role-based **property-turnover** tool (PM/technician/client). Superseded. |
| v1.1 | ✅ **Shipped 2026-07-29. Foundation pivot.** Domain model and roles now speak "homeowner maintenance" (owner/vendor/collaborator, properties/requests). |
| **v1.2** | **The MVP, in progress.** First version that credibly embodies all 10 requirement pillars at minimum useful depth. This is the release the "10 requirements" brief describes. |
| v1.3–v1.5 | Near-term hardening and expansion once real users are on v1.2 — SMS/push, maps, PWA packaging, accessibility audit, environment separation. |
| v2.0 | Vendor marketplace + payments + advisor roles + portfolio scale — explicitly deferred by `CON4`, built only once v1.2's core loop is validated. |

---

## v1.1 — Foundation pivot ✅ (shipped 2026-07-29)

Goal: make the *domain model and language* match the product before adding
homeowner-facing features on top of the wrong nouns.

- [x] **`Property` becomes a first-class entity.** New `properties/{propertyId}`
      collection (address, unit, nickname, ownerUid, createdAt) —
      `firestore-properties.js`, `properties.html`. A request always
      references a property (`propertyId`); a property can have many
      requests. Closes `FR1`, and is the prerequisite for `BRL1` (✅).
- [x] **`projects` → `requests`, reshaped.** `firestore-projects.js` is gone,
      replaced by `firestore-requests.js`. Dropped the itemized-labor-estimate
      shape (`tasks: [{hours, rate, material}]`) in favor of a
      single-issue-per-request shape: category, urgency, room/location,
      notes, access instructions, preferred contact method, status
      (`new-request.html`). Photos moved to a top-level
      `requests/{requestId}/photos/{photoId}` subcollection with real
      document IDs — this also resolves the pre-pivot task-identity/
      cascading-delete quirk for free (no more "index beyond array length"
      concept). This is the schema `FR2`/`FEAT1` continue to build on in v1.2.
- [x] **Role remap.** `pm`/`admin` → single `owner` role; `tech` → `vendor`;
      `client` → `collaborator`. Closes `SYS2` (✅). Every page guard
      (`guard-owner.js`, `vendor.guard.js`, `collaborator.guard.js`) and
      `firestore.rules`/`storage.rules` updated to the new role names —
      confirmed via a repo-wide grep for the old role strings/collection
      names after the rewrite (see `DEVLOG.md`).
- [x] **Closed the vendor read-scoping gap.** `BRL6` (✅): `firestore.rules`
      and `storage.rules` now scope a `vendor`'s reads to
      `assignedVendorUid == request.auth.uid` (and a `collaborator`'s to
      `collaboratorUid`), not "any authenticated user of that role" like
      the pre-pivot model. Still assignment-from-a-dropdown, not a real
      email invite — that UX gap is v1.2 Package 3, but the actual access
      boundary this rule is about is closed.
- [x] **Copy pass.** Owner/vendor/collaborator, properties/requests
      language throughout every page, sidebar, and header. `CON2`/`QA1`
      moved from ⬜ to 🟡 — full homeowner-audience copy pass is still
      v1.2 Package 12.
- [x] **Data migration decision: fresh start.** No production data existed
      yet, so the schema/role rewrite shipped clean with no migration
      script — confirmed with the project owner before starting.
- [x] **Kept, not rebuilt:** the security-rules pattern, CSP header
      (`script-src` still has no `'unsafe-inline'`), login lockout + App
      Check wiring, cursor-based pagination (now `getRequestsPage`), and
      CI/unit tests (36 tests, updated for the new schema) all carried
      forward and re-pointed at the new model rather than redone.

**Exit criteria met:** every collection, role, and page in the app uses
TurnFlow Home's nouns; `npm test` passes (36/36); every HTML/JS
cross-reference was grepped for staleness post-rewrite. No homeowner-facing
feature work beyond the schema/role foundation shipped in this version —
that's v1.2, next.

---

## v1.2 — MVP (target: ~6–8 weeks across the packages below)

Goal: a homeowner can go end-to-end — document an issue, get guided
next steps, invite a vendor, collect and compare quotes, approve one,
track it to done, and export proof of it — with every requirement pillar
touched at least at a minimum viable depth. Packages are ordered so each
one is either a prerequisite for the next or delivers standalone value if
priorities shift mid-build; they don't have to ship as one release.

### Package 1 — Guided intake (`FEAT1`, `FR2`, `FR3`, `BRL4`, `CON1`, `UR1`, `UR2`)
**Partly done in v1.1:** `new-request.html` is already a single-issue form
with category/urgency/room-location/notes/contact-method/access-instructions,
and shows the emergency disclaimer when urgency is set to Emergency
(`BRL4`). **Still open:** photos aren't captured inline at creation (they're
added afterward on `request.html`); there's no category → next-step
checklist or recommended-evidence prompts yet (`FR3`'s harder half, `UR2`).

### Package 2 — Status lifecycle & dashboard (`FR6`, `FEAT2`)
**Partly done in v1.1:** the 8-state lifecycle (Draft, Needs Quote,
Waiting, Scheduled, In Progress, Needs Review, Complete, Archived) is
already the shared source of truth (`REQUEST_STATUSES` in `utils.js`),
used by the dashboard, vendor view, and collaborator portal. Pagination
was re-pointed at `requests` (`getRequestsPage()`). **Still open:**
filtered/grouped views by status (today it's one flat list with a status
badge per card).

### Package 3 — Vendor invite & scoped package (`BRL6`, `FR4`, `SYS7`, `UR5`)
**Partly done in v1.1:** the access-control half of `BRL6`/`SYS7` is
already closed — `firestore.rules`/`storage.rules` scope a vendor's reads
to exactly their `assignedVendorUid` request. **Still open:** a real
invite flow (owner enters a vendor email, system creates a scoped invite —
magic link or invite code + account creation — instead of picking from a
dropdown of vendor-role users who already have accounts).

### Package 4 — Quote workspace (`FEAT3`, `FR5`, `BRL3`, `BR4`, `UR3`)
**Partly done in v1.1:** separate `estimatedCost` / `quotedCost` /
`finalCost` fields already exist per request, with `costForRequest()`/
`costLabelForRequest()` resolving which is authoritative, so "estimate"
vs. "actual" is never ambiguous (`BRL3`). **Still open:** per-request
quote *records* (plural — vendor, amount, attachment, notes, status) and
a side-by-side comparison view when a request has 2+ competing quotes.
Approving a quote records who approved it and when (feeds Package 5).

### Package 5 — Approval & decision log (`FEAT6`, `QA3`, `BRL2`, `BRL7`, `QA4`)
An append-only log entry generated automatically on every status
transition, quote approval, and completion — actor, timestamp, what
changed, what evidence backed it. This is also where completion gating
lives: a request can't move to `Complete` unless required proof fields
(final cost, at least one after-photo, vendor on record) are present, or
the owner explicitly checks a "waive proof requirement" box with a reason
recorded in the log (`BRL2`). Consider soft-delete/archive instead of hard
delete here too, since the log makes "what got deleted and when" worth
preserving (`QA4`).

### Package 6 — Property record vault (`FEAT5`, `EXT4`, `SYS4`)
Generalize Storage beyond per-task photos: a property-level document
store for receipts, warranties, manuals, invoices, and inspection
reports, independent of any single request. Tag documents by property and
optionally by request. Reuses the existing Storage security-rule pattern
(role + uid path checks), extended to the new path shape.

### Package 7 — Proof packet & history export (`FEAT7`, `FR7`, `EXT5`, `NFR4`, `QA6`, `CON6`, `UR6`)
**Partly done in v1.1:** JSON backup now exports properties + requests
together (not a flat project dump), with restore correctly remapping
property references. PDF export reflects the new request schema.
**Still open:** real PDF export via `jsPDF-autotable` (closes the
plain-text gap): a formatted proof packet for one request (photos,
quotes, approval log, final cost) or a full property history rollup. Add
CSV export alongside JSON so `NFR4`/`CON6` are fully met.

### Package 8 — Maintenance calendar & recurring reminders (`FEAT4`, `FR8`, `EXT3`)
Recurring maintenance definitions (HVAC filter, gutter cleaning, water
heater flush, etc.) per property with a configurable interval, generating
upcoming/overdue reminder entries. ICS export for the calendar (`EXT3`) —
a static `.ics` file generation is enough for MVP, no third-party calendar
API integration needed.

### Package 9 — Email notifications (`EXT1`, `FR8`, `SYS5`, `NFR6`)
New infrastructure: a Cloud Function (or equivalent) triggered on request
updates, upcoming/overdue reminders (Package 8), and vendor invitations
(Package 3), sending via an email provider (e.g. a transactional email
API). Log every send attempt with delivery status from day one (`NFR6`) —
retrofitting observability onto a notification system later is far more
painful than building the log table alongside the first sender.

### Package 10 — Household collaborator sharing (`BRL5`, `SYS7`, `UR4`, `QA2`)
Explicit sharing UI: an owner shares a property (or specific request)
with a household collaborator by email, scoped server-side the same way
Package 3 scopes vendors. Makes the existing rule *pattern* (per-entity
scoping) visible and controllable to the end user, not just enforced
silently (`QA2`).

### Package 11 — Mobile pass & baseline accessibility (`CON5`, `NFR2`, `QA5`)
Phone-width verification pass on every flow that touches photo capture or
form entry (intake, quote upload, vault upload). Keyboard-navigation and
contrast check on the core request/review/approve flows. Doesn't need to
be a full WCAG audit yet (that's v1.3+) — just no broken flows at common
phone widths and no keyboard traps.

### Package 12 — Consumer copy & onboarding pass (`CON2`, `QA1`)
Full pass over every label, empty state, and error message with a
homeowner (not operations-team) audience in mind. Low-friction
onboarding: fewer required fields to create a first property + first
request than the legacy flow required to create a turnover project.

**v1.2 exit criteria:** all six `UR` user stories in `REQUIREMENTS.md` are
walkable end-to-end by a real homeowner account, and every `BR`/`FEAT`/`FR`
row is at least 🟡 with a documented path to ✅, not ⬜.

---

## v1.3–v1.5 — Post-MVP hardening & expansion

Not sequenced into strict phases — pull from this list based on what
actual v1.2 users hit first.

- **SMS / push notifications** (`EXT2`) — opt-in, additive on top of
  Package 9's notification service and delivery log.
- **Maps / address validation** (`EXT6`) for property setup.
- **PWA packaging** (`SYS1`) — manifest + service worker, installable,
  basic offline shell for viewing (not creating) requests.
- **Accessibility audit to WCAG AA** (`QA5`) on core flows, beyond
  Package 11's baseline pass.
- **Documented backup/restore runbook** (`NFR5`) — not just that export
  exists, but a written "how to actually restore from it" procedure.
- **Environment separation** (dev/staging/prod Firebase projects) — this
  was already tracked pre-pivot (legacy `NFR6`) and is still the right
  next step once the team isn't the only user.
- **Vite migration / drop the Tailwind Play CDN** — unlocks a fully closed
  CSP (`style-src` still needs `'unsafe-inline'` today, see
  `ARCHITECTURE.md`) and real dependency pinning for Firebase/Chart.js/
  jsPDF instead of CDN `<script>` tags.
- **Firestore rules unit tests** (`@firebase/rules-unit-testing` +
  emulator) and a Playwright smoke-test layer per role — both were
  identified as valuable pre-pivot and remain valuable now that there are
  more roles and more rule surface area to regress.

---

## v2.0 — Vendor marketplace, payments, and scale (future)

Explicitly deferred by `CON4` — do not pull items from this list into
v1.2 even if they look tempting mid-build. Build only once the v1.2 core
loop has real usage data behind it.

- **Vendor marketplace** — browse/request quotes from a directory of
  vendors, instead of only inviting a vendor the homeowner already knows.
- **Payments** (`EXT7`) — quote deposits, final invoice tracking,
  potentially in-app payment collection.
- **Advisor role** — a third collaborator tier beyond household members
  (realtor, inspector, financial advisor) with its own scoping rules,
  hinted at in `BR5`'s "optional advisors."
- **Portfolio view / light multi-tenancy** — if TurnFlow Home ever needs
  to serve a power user with many properties, or a small property-manager
  business rather than a single household, this is where an `orgId`-style
  tenant boundary gets introduced (same trigger logic as the pre-pivot
  scaling notes below).
- **Insurance/warranty integrations and resale-packet templates** — richer
  proof-packet formats tailored to specific downstream consumers (an
  insurer's claim format, a specific MLS resale-disclosure format).

---

## Scaling triggers (carried forward from pre-pivot, still apply)

These aren't versioned phases — they're conditions to watch for,
regardless of which version is current. Don't build any of these
preemptively.

- **Frontend framework/build step.** Trigger: once v1.2's quote workspace
  and decision log add real cross-page state that `sessionStorage` +
  global functions start to strain under. Path: Vite + either continued
  vanilla JS or a light reactive layer (Preact/Alpine), not a heavy SPA
  framework — see the v1.3+ Vite item above.
- **Backend / Cloud Functions.** Trigger: Package 9's email notifications
  are the first hard requirement for this (client-side code can't send
  email or hold provider API keys safely) — this trigger fires *during*
  v1.2, not after it.
- **Firestore scaling limits.** Trigger: once a household is tracking
  dozens of requests per property with attached quotes/logs/documents.
  Path: keep every subcollection keyed by real document IDs from the v1.1
  rewrite onward (this is a "do it right in v1.1" item, not a future
  migration, given the pre-pivot codebase's task-identity quirk was
  exactly this problem).
- **Multi-tenant.** Trigger: TurnFlow Home ever needs to serve more than
  one unrelated household/owner-client account sharing infrastructure
  beyond simple per-user `ownerUid` scoping — see v2.0's portfolio/
  multi-tenancy item.
- **Observability.** Trigger: the moment usage extends beyond the
  founding team's own devices. Package 9 already builds a notification
  delivery log; extend the same instinct to general error reporting
  (Crashlytics/Performance Monitoring, or a Cloud Function that forwards
  `console.error`-worthy failures somewhere visible).

---

## Suggested order if you want one linear path

v1.1 (foundation pivot) → v1.2 Packages 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
→ 10 → 11 → 12 → re-evaluate v1.3+ and v2.0 based on actual homeowner
usage, not in advance.

---

## Appendix — pre-pivot phase history (v1.0, complete)

The phases below describe real, completed work on the pre-pivot
property-turnover tool. They're preserved for history; the infrastructure
they built (security rules patterns, CSP, pagination, cascading delete,
CI) is being carried forward and re-pointed at the new domain model in
v1.1/v1.2 above, not redone from scratch.

**Phase 0 — Stabilize** (done 2026-07-12): fixed `seed.html`'s broken
import; extracted pure logic into `utils.js` with Vitest coverage; added
CI.

**Phase 1 — Close the persona gap** (done 2026-07-12): technician
assignment UI, real client portal (`clientId`-scoped), status lifecycle
UI for the legacy 4-state model.

**Phase 2 — Harden** (done 2026-07-12): Storage security rules, CSP
headers with `script-src` fully locked down, login rate limiting +
App Check wiring, cascading delete for task photos, dashboard pagination.

**Phase 3 — Polish for external eyes** (not done, superseded): PDF
quality, error/loading UX, environment separation. These items are
carried forward as v1.2 Package 7 (PDF), v1.2 Package 12 (UX/copy), and
v1.3+ (environment separation) above rather than completed as originally
scoped, since the product they'd have polished is being replaced.

**Phase 4 — POC → pilot readiness** (not done, superseded): deploy
pipeline, usage analytics. Carried forward as v1.3+ items above.

Full detail on what shipped in Phases 0–2 is in `DEVLOG.md`.
