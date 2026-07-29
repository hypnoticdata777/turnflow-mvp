# TurnFlow — Project Workbook

This is the front door to TurnFlow's documentation. TurnFlow is pivoting
from a role-based **property-turnover management** POC (PM creates and
estimates jobs, technicians execute and photograph them, clients watch
approval status) into **TurnFlow Home** — a guided maintenance
self-management product for homeowners and owner clients, described in
full in `REQUIREMENTS.md`.

This workbook exists so the project has a stable foundation as it grows
past "a few HTML files and a Firebase project" into something that can be
demoed, handed to another developer, or scaled toward a pilot. Read it in
this order the first time; after that, jump to whichever doc you need.

| Doc | Purpose |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | **Start here.** The canonical TurnFlow Home requirements (10 pillars: Business Requirements, Business Rules, Constraints, External Interfaces, Features, Functional, Nonfunctional, Quality Attributes, System, User Requirements) with gap status against the current code. Legacy pre-pivot requirements are kept as an appendix for traceability. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Target domain model (where the data/roles are headed) plus the current, pre-pivot implementation: roles, data model, security rules, file map, tech stack |
| [`SETUP.md`](./SETUP.md) | How to run it, test it, seed it, and deploy it (describes the current pre-pivot app) |
| [`ROADMAP.md`](./ROADMAP.md) | v1.1 (foundation pivot) → v1.2 (MVP, all 10 requirement pillars at minimum depth) → v1.3+/v2.0 (future), each package mapped to `REQUIREMENTS.md` IDs |
| [`DEVLOG.md`](./DEVLOG.md) | Dated running log of what changed and why |

## Project snapshot (as of 2026-07-29)

- **Stage:** Mid-pivot. The codebase is the pre-pivot property-turnover POC
  (roles: `pm`/`admin`/`tech`/`client`); the product direction has been
  redefined as TurnFlow Home (roles: owner/vendor/household collaborator)
  and the requirements/roadmap docs now reflect that target. No v1.1 code
  changes (domain model / role rename) have shipped yet — see `ROADMAP.md`.
- **Reusable substrate from the pre-pivot build:** Firebase Auth +
  Firestore + Storage wiring, role-scoped security rules pattern, CSP
  hardening, cursor-based pagination, cascading delete, CI + unit tests.
  None of this is being thrown away — v1.1/v1.2 re-point it at the new
  domain model rather than rebuilding it from scratch.
- **Not yet started:** the TurnFlow Home-specific product surface —
  guided intake, quote workspace, vendor invites, decision log, property
  vault, recurring maintenance calendar, notifications, proof-packet
  export. All tracked as v1.2 packages in `ROADMAP.md`.
- **Test coverage:** Pure logic (task status, cost calc, HTML escaping,
  assignment/status helpers) covered by Vitest — 34 tests, all against the
  pre-pivot model; will need re-targeting as the v1.1 schema rename lands.
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
