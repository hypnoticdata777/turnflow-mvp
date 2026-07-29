# TurnFlow — Project Workbook

This is the front door to TurnFlow's documentation. TurnFlow is
**TurnFlow Home** — a guided maintenance self-management product for
homeowners and owner clients, described in full in `REQUIREMENTS.md`. The
codebase started as a role-based property-turnover management POC (PM
creates and estimates jobs, technicians execute and photograph them,
clients watch approval status); the v1.1 foundation pivot (2026-07-29)
rewrote the domain model and roles to match the TurnFlow Home product.

This workbook exists so the project has a stable foundation as it grows
past "a few HTML files and a Firebase project" into something that can be
demoed, handed to another developer, or scaled toward a pilot. Read it in
this order the first time; after that, jump to whichever doc you need.

| Doc | Purpose |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | **Start here.** The canonical TurnFlow Home requirements (10 pillars: Business Requirements, Business Rules, Constraints, External Interfaces, Features, Functional, Nonfunctional, Quality Attributes, System, User Requirements) with gap status against the current code. Legacy pre-pivot requirements are kept as an appendix for traceability. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Current implementation: roles, data model, security rules, file map, tech stack |
| [`SETUP.md`](./SETUP.md) | How to run it, test it, seed it, and deploy it |
| [`ROADMAP.md`](./ROADMAP.md) | v1.1 (✅ shipped — foundation pivot) → v1.2 (MVP, in progress) → v1.3+/v2.0 (future), each package mapped to `REQUIREMENTS.md` IDs |
| [`DEVLOG.md`](./DEVLOG.md) | Dated running log of what changed and why |

## Project snapshot (as of 2026-07-29)

- **Stage:** v1.1 shipped. The codebase now runs on TurnFlow Home's domain
  model and roles (`owner`/`vendor`/`collaborator`,
  `properties`/`requests`) instead of the pre-pivot property-turnover
  model (`pm`/`admin`/`tech`/`client`, `projects`). Homeowner-facing
  feature work (guided checklists, quote workspace, real vendor invites,
  decision log, property vault, reminders, notifications, proof-packet
  export) is v1.2, next — see `ROADMAP.md`.
- **What v1.1 changed:** `properties` is now a first-class collection;
  `projects` was replaced by a single-issue-per-request `requests`
  collection (no more embedded task array); photos moved to a top-level
  subcollection with real document IDs (resolving the old task-identity
  quirk); roles collapsed from four (`pm`/`admin`/`tech`/`client`) to
  three (`owner`/`vendor`/`collaborator`); `firestore.rules`/
  `storage.rules` now scope vendor and collaborator reads to their
  specific assigned/shared request, closing the old over-read gap.
- **Reused, not rebuilt:** Firebase Auth + Firestore + Storage wiring,
  the security-rules pattern, CSP hardening, cursor-based pagination,
  cascading delete, login lockout + App Check wiring, CI + unit tests —
  all carried forward and re-pointed at the new domain model.
- **Not yet started:** the TurnFlow Home-specific product surface —
  guided next-step checklists, a multi-quote comparison workspace, real
  email-based vendor invites, an approval/decision log, a property
  document vault, recurring maintenance reminders, email/SMS
  notifications, formatted proof-packet export. All tracked as v1.2
  packages in `ROADMAP.md`.
- **Test coverage:** Pure logic (request cost resolution, HTML escaping,
  login lockout, assignment-label helpers) covered by Vitest — 36 tests,
  updated for the v1.1 schema/role rename.
- **CI:** GitHub Actions runs `npm test` on push/PR to `main`.

## How to use this workbook going forward

- `REQUIREMENTS.md` is the product spec — it doesn't change just because
  the code hasn't caught up yet. When you ship something that closes a
  requirement, flip its status there and add an entry to `DEVLOG.md`.
- When you discover a new requirement, add it to `REQUIREMENTS.md` first
  (so it's tracked as a pillar, not just a memory), then slot it into the
  right `ROADMAP.md` version/package.
- Don't let this workbook drift from the code — treat doc updates as part
  of the definition of "done" for any change that touches roles, data
  model, or deployment.
