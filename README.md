# TurnFlow Home

TurnFlow Home is a **guided maintenance self-management product for
homeowners and owner clients** — structure, proof, records, and reminders
for property maintenance, without hiring a full property management
operation.

> **Status: mid-pivot.** This repo started as a role-based
> property-turnover management tool (PM/technician/client). It's being
> rebuilt toward the TurnFlow Home product described below. The canonical
> requirements live in [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md)
> and the phased plan to get there is in
> [`docs/ROADMAP.md`](./docs/ROADMAP.md) — **those two documents are the
> source of truth for what TurnFlow is being built to do.** Everything
> below describes the *current, pre-pivot* implementation so you can run
> and understand the code as it exists today; where the target product
> differs, the roadmap says so.

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
| **PM / Admin** | Dashboard | Create, edit, delete projects; manage contacts; backup data |
| **Technician** | Technician dashboard | View assigned projects; upload before/after/receipt photos |
| **Client** | Pending Approval | View project approval status (read-only) |

---

### Features (current implementation)

- **Project lifecycle** — Create estimates with itemised tasks (labor hours, rate, materials); track status through Pending Approval → Approved → Sent
- **Task completion** — Mark individual tasks complete from the dashboard; status badges update in real time
- **Photo uploads** — Technicians upload before, after, and receipt photos per task; stored in Firebase Storage with a live gallery view
- **Contacts** — Store and manage owner/client contacts in Firestore
- **Stats** — Pie and bar charts (Chart.js) showing completed vs pending tasks and cost per property
- **Backup / Restore** — Export all Firestore projects to a dated JSON file; re-import into a fresh environment
- **Firestore Security Rules** — Role-enforced read/write access for all collections

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
- **Storage:** Firebase Storage (technician photos)
- **PDF export:** jsPDF
- **Charts:** Chart.js

---

### Getting Started

1. Clone the repo
2. Add your Firebase credentials to `public/js/firebase-config.js`
3. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
4. Open `index.html` in a browser (or serve with `npx serve .`)
5. Create user accounts in the Firebase console and set each user's role in Firestore under `users/{uid}.role` (`pm`, `tech`, `client`, or `admin`)

---

### Documentation

Full project workbook lives in [`docs/`](./docs/WORKBOOK.md):

| Doc | Purpose |
|---|---|
| [`docs/WORKBOOK.md`](./docs/WORKBOOK.md) | Start here — index + project snapshot |
| [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) | **Canonical TurnFlow Home requirements** (the 10-pillar spec) with gap status against the current code, plus the legacy pre-pivot requirements as an appendix |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Roles, data model (current + target), security rules, file map |
| [`docs/SETUP.md`](./docs/SETUP.md) | Run, test, seed, deploy |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | v1.1 foundation pivot → v1.2 MVP → v1.3+/v2.0 future versions, mapped to `REQUIREMENTS.md` IDs |
| [`docs/DEVLOG.md`](./docs/DEVLOG.md) | Dated log of what changed and why |

### Testing

```bash
npm install
npm test
```

Unit tests cover the pure business logic in `public/js/utils.js` (task
status derivation, cost calculation, HTML escaping). CI runs this on every
push/PR to `main` (`.github/workflows/ci.yml`).
