# TurnFlow MVP

TurnFlow is a role-based property turnover management platform. Property managers create and estimate projects, technicians execute tasks and upload photo evidence, and clients track approval status — all in real time through a shared Firebase backend.

---

### Roles

| Role | Home page | Can do |
|------|-----------|--------|
| **PM / Admin** | Dashboard | Create, edit, delete projects; manage contacts; backup data |
| **Technician** | Technician dashboard | View assigned projects; upload before/after/receipt photos |
| **Client** | Pending Approval | View project approval status (read-only) |

---

### Features

- **Project lifecycle** — Create estimates with itemised tasks (labor hours, rate, materials); track status through Pending Approval → Approved → Sent
- **Task completion** — Mark individual tasks complete from the dashboard; status badges update in real time
- **Photo uploads** — Technicians upload before, after, and receipt photos per task; stored in Firebase Storage with a live gallery view
- **Contacts** — Store and manage owner/client contacts in Firestore
- **Stats** — Pie and bar charts (Chart.js) showing completed vs pending tasks and cost per property
- **Backup / Restore** — Export all Firestore projects to a dated JSON file; re-import into a fresh environment
- **Firestore Security Rules** — Role-enforced read/write access for all collections

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

### Completed

| Fix | File(s) changed |
|-----|-----------------|
| Auth race condition — `requireRole` now waits for Firebase to resolve session before redirecting | `public/js/auth.js` |
| Firebase Hosting `public/` mismatch — hosting root changed to `.` so all HTML pages deploy correctly | `firebase.json` |
| Auth guards on `stats.html` and `estimate.html` — PM/admin only via new `requireAnyRole` helper | `public/js/auth.js`, `stats.html`, `estimate.html` |
| Technician photo upload UX — Project/Task text inputs replaced with auto-populated dropdowns | `technician.html` |

---

### Future Build

- **Content Security Policy** — add `"headers"` block to `firebase.json` to lock down script/style sources
- **Login rate limiting** — lock the login form for N seconds after X consecutive failures; consider Firebase App Check
- **Firestore pagination** — replace `getAllProjects()` full-collection fetch with cursor-based pages (`startAfter`) on the dashboard
- **Client portal** — build a proper read-only view for the `client` role (currently redirects to `pending-approval.html` which is a stub)
- **Project assignment flow** — let PMs assign a technician to a project from the dashboard; currently `assignedTechId` must be set manually in Firestore
- **Task status granularity** — surface the `overdue` / `blocked` / `inprogress` statuses computed in `script.js` on the technician dashboard too
- **Subcollection cleanup** — deleting a project does not delete its `tasks/{id}/photos` subcollection; add a Cloud Function or batched delete
- **PDF improvements** — jsPDF output is plain text; switch to `autotable` plugin for a properly formatted estimate table
