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

### Next Build

- Fix Firebase Hosting structure (`public/` mismatch) so pages deploy correctly
- Add Content Security Policy headers via `firebase.json`
- Add auth guards to `stats.html` and `estimate.html`
- Fix auth race condition in `technician.html` (move project load inside `onAuthStateChanged`)
- Build a proper read-only client portal page
- Add login rate limiting after failed attempts
- Add Firestore cursor-based pagination to the dashboard
