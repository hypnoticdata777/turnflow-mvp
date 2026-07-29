# TurnFlow Home

TurnFlow Home is a **guided maintenance self-management product for
homeowners and owner clients** — structure, proof, records, and reminders
for property maintenance, without hiring a full property management
operation.

> **Status: v1.1 (foundation pivot) shipped.** The domain model and roles
> now match TurnFlow Home (owner/vendor/collaborator, properties/requests)
> instead of the pre-pivot property-turnover tool (PM/technician/client,
> projects/tasks). The homeowner-facing feature set — guided intake,
> quote workspace, vendor invites, recurring reminders, proof packets —
> is still being built; see [`docs/ROADMAP.md`](./docs/ROADMAP.md) v1.2
> for what's next. The canonical requirements live in
> [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) — that document and
> the roadmap are the source of truth for what TurnFlow is being built to
> do; this README describes what's actually running today.

---

### Target roles (see `docs/ROADMAP.md` v1.1 for the rename in progress)

| Role | What they do |
|------|-----------|
| **Owner** (account owner / homeowner) | Create and manage properties; create and track maintenance requests; invite vendors and collaborators; approve quotes; export proof packets |
| **Household collaborator** | Add updates on properties/requests explicitly shared with them; no visibility into unrelated records |
| **Invited vendor** | See the scoped request package (photos, notes, access instructions, contact rules) for exactly the request they were invited to |

### Current implementation roles (pre-pivot, still live in code today)

| Role | Home page | Can do |
|------|-----------|--------|
| **Owner** (account owner / homeowner) | Dashboard | Create/manage properties; create, edit, delete maintenance requests; assign vendors and share with collaborators; manage contacts; backup data |
| **Vendor** (invited tradesperson) | Vendor view | View only the requests assigned to them; upload before/after/receipt photos; update request status |
| **Household collaborator** | Collaborator portal | View (read-only) only the requests explicitly shared with them |

Role scoping is enforced server-side in `firestore.rules`/`storage.rules`,
not just hidden in the UI — a vendor or collaborator can't read a request
that hasn't been explicitly assigned/shared with them, even by guessing a
request ID directly against the SDK.

---

### Features (current implementation)

- **Properties** — An owner manages one or more properties; every request belongs to exactly one property
- **Maintenance requests** — Single-issue intake (category, urgency, room/location, preferred contact method, access instructions, notes); 8-state lifecycle: Draft → Needs Quote → Waiting → Scheduled → In Progress → Needs Review → Complete → Archived
- **Cost tracking** — Separate estimated / quoted / final cost fields per request, so "estimate" is never confused with "actual" (see `BRL3` in `docs/REQUIREMENTS.md`)
- **Photo evidence** — Owner or assigned vendor can upload before/after/receipt/other photos per request, stored in Firebase Storage with a live gallery view
- **Vendor assignment & collaborator sharing** — Owner assigns a vendor and/or shares a request with a household collaborator from the dashboard; both are scoped server-side to exactly that request
- **Contacts** — Store and manage a general contacts directory in Firestore
- **Stats** — Pie and bar charts (Chart.js) showing requests by status and cost by property
- **Backup / Restore** — Export an owner's properties + requests to a dated JSON file; re-import into a fresh environment
- **Firestore & Storage Security Rules** — Role- and assignment-scoped read/write access for every collection

This is the v1.1 foundation. The homeowner-specific product surface on
top of it — guided next-step checklists, a quote comparison workspace,
real vendor email invites, an approval/decision log, a property document
vault, recurring maintenance reminders, and proof-packet export — is
tracked as v1.2 in `docs/ROADMAP.md`.

This feature set is the raw material the roadmap builds the TurnFlow Home
MVP (v1.2) on top of — see `docs/ROADMAP.md` for exactly which pieces get
reused, renamed, or replaced, and `docs/REQUIREMENTS.md` for what's
genuinely new (guided intake, quote workspace, vendor invites, recurring
reminders, proof packets, and more).

---

### Tech Stack

- **Frontend:** Vanilla JS (ES Modules), HTML5
- **Styling:** Tailwind CSS (CDN)
- **Auth & Database:** Firebase Authentication + Firestore
- **Storage:** Firebase Storage (request photos)
- **PDF export:** jsPDF
- **Charts:** Chart.js

---

### Getting Started

1. Clone the repo
2. Add your Firebase credentials to `public/js/firebase-config.js`
3. Deploy Firestore + Storage security rules: `firebase deploy --only firestore:rules,storage`
4. Open `index.html` in a browser (or serve with `npx serve .`)
5. Create user accounts in the Firebase console and set each user's role in Firestore under `users/{uid}.role` (`owner`, `vendor`, or `collaborator`) — see `docs/SETUP.md`
6. As an owner, add a property via `properties.html` before creating your first request

---

### Documentation

Full project workbook lives in [`docs/`](./docs/WORKBOOK.md):

| Doc | Purpose |
|---|---|
| [`docs/WORKBOOK.md`](./docs/WORKBOOK.md) | Start here — index + project snapshot |
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | **Canonical TurnFlow Home requirements** (the 10-pillar spec) with gap status against the current code, plus the legacy pre-pivot requirements as an appendix |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Roles, data model, security rules, file map |
| [`docs/SETUP.md`](./docs/SETUP.md) | Run, test, seed, deploy |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | v1.1 (shipped) → v1.2 MVP → v1.3+/v2.0 future versions, mapped to `REQUIREMENTS.md` IDs |
| [`docs/DEVLOG.md`](./docs/DEVLOG.md) | Dated log of what changed and why |

### Testing

```bash
npm install
npm test
```

Unit tests cover the pure business logic in `public/js/utils.js` (request
cost resolution, HTML escaping, login lockout). CI runs this on every
push/PR to `main` (`.github/workflows/ci.yml`).
