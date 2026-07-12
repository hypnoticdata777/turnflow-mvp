# TurnFlow — Project Workbook

This is the front door to TurnFlow's documentation. TurnFlow is a role-based
property turnover management POC: PMs create and estimate projects,
technicians execute tasks and upload photo evidence, and clients track
approval status — all through a shared Firebase backend.

This workbook exists so the project has a stable foundation as it grows past
"a few HTML files and a Firebase project" into something that can be
demoed, handed to another developer, or scaled toward a pilot. Read it in
this order the first time; after that, jump to whichever doc you need.

| Doc | Purpose |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | The pillars: Functional and Non-Functional Requirements (FR/NFR), with current status |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Roles, data model, security rules, file map, tech stack |
| [`SETUP.md`](./SETUP.md) | How to run it, test it, seed it, and deploy it |
| [`ROADMAP.md`](./ROADMAP.md) | Phased plan to close every FR/NFR gap, plus the scaling path beyond POC |
| [`DEVLOG.md`](./DEVLOG.md) | Dated running log of what changed and why |

## Project snapshot (as of 2026-07-12)

- **Stage:** POC / MVP — single Firebase project, no environment separation, no build step.
- **Roles implemented:** PM/Admin (full), Technician (full), Client (stub only — see `ROADMAP.md` Phase 1).
- **Test coverage:** Pure logic (task status, cost calc, HTML escaping) covered by Vitest. No integration/rules tests yet.
- **CI:** GitHub Actions runs `npm test` on push/PR to `main`.
- **Known debt:** see `REQUIREMENTS.md` status column and `ROADMAP.md` Phase 2/3 for the hardening and polish backlog.

## How to use this workbook going forward

- When you ship something that closes an FR/NFR, update the status column in `REQUIREMENTS.md` and add an entry to `DEVLOG.md`.
- When you discover a new gap, add it to `REQUIREMENTS.md` first (so it's tracked as a pillar, not just a memory), then slot it into the right `ROADMAP.md` phase.
- Don't let this workbook drift from the code — treat doc updates as part of the definition of "done" for any change that touches roles, data model, or deployment.
