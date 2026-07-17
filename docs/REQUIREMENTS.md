# Requirements — Functional & Non-Functional (the pillars)

Status legend: ✅ Done · 🟡 Partial · ⬜ Not started

## Functional Requirements (FR)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR1 | PM/Admin can create, edit, delete, and view projects with itemized tasks (labor hours, rate, materials). | ✅ | `dashboard.html`, `new-project.html`, `firestore-projects.js` |
| FR2 | System computes and displays a live cost estimate per project (labor + materials). | ✅ | `calculateEstimateTotal()` in `utils.js`, unit tested |
| FR3 | Technicians can view only projects assigned to them and mark individual tasks complete. | ✅ | `technician.html` queries `where('assignedTechId', '==', uid)` |
| FR4 | Technicians can upload before/after/receipt photos per task, viewable in a gallery scoped to that task. | ✅ | `technician.js`, Firebase Storage |
| FR5 | PM/Admin can assign a technician to a project via UI. | ✅ | Dashboard dropdown (`dashboard.html`) writes `assignedTechId` via `updateProject()`; techs listed via new `firestore-users.js:getUsersByRole('tech')` |
| FR6 | Clients have a real read-only portal showing project status and approval state for their properties only. | ✅ | `pending-approval.html` rebuilt as the `client` role's home page: queries `getProjectsForClient(uid)` (matches `projects.clientId`), read-only cards with status badge, tasks, and estimate total. PM assigns portal access per-project from a new dropdown on `dashboard.html`, mirroring FR5's tech-assignment dropdown |
| FR7 | Project status lifecycle: Pending Approval → Approved → Sent → Completed. | 🟡 | Status field exists and is set on create; no UI to transition Approved/Sent/Completed |
| FR8 | PM/Admin can manage a contacts list (owners/clients) linked to projects. | ✅ | `contacts.html`, `firestore-contacts.js` |
| FR9 | System generates a client-presentable PDF estimate/invoice per project. | 🟡 | jsPDF wired up but plain text, no table formatting — Roadmap Phase 3 |
| FR10 | PM/Admin can export/import all project data as JSON for backup/restore. | ✅ | `backup.html` |
| FR11 | Task status granularity (open/in-progress/blocked/overdue/completed) surfaced consistently across PM and technician views. | 🟡 | Logic exists (`tf_getTaskStatus`, now unit tested in `utils.js`); dashboard shows it, technician view only shows completed/pending |
| FR12 | Stats view shows completed-vs-pending task ratios and cost breakdown per property. | ✅ | `stats.html`, Chart.js pie/bar |
| FR13 | Deleting a project cascades to delete its task photo subcollections and Storage files. | ⬜ | No cleanup path yet — orphaned data today — Roadmap Phase 2 |

## Non-Functional Requirements (NFR)

| ID | Category | Requirement | Status | Notes |
|---|---|---|---|---|
| NFR1 | Security | All Firestore/Storage access enforced server-side via security rules; client-side role checks are UX only. | 🟡 | Firestore rules exist and are reasonably scoped (`firestore.rules`), and `users/{uid}` read now correctly allows PM/Admin to list all users; page-level guards were missing on `dashboard.html`/`backup.html`/`contacts.html`/`pending-send.html` and have been added (defense-in-depth, not the real boundary). `projects/{projectId}` read is now scoped for `client` role via `clientId` (2026-07-12). **Residual gap:** the `tasks/{taskId}/photos/{photoId}` subcollection rule still allows any authenticated user to read, regardless of `clientId` — not reachable from any current client-facing UI, but not enforced at the rule layer either if someone hits the SDK directly with a known project/task ID. **Storage rules still do not exist** — photo uploads rely only on client-side path conventions |
| NFR2 | Security | CSP headers configured in `firebase.json`. | ⬜ | Roadmap Phase 2 |
| NFR3 | Security | Login rate limiting or Firebase App Check enabled. | ⬜ | Roadmap Phase 2 |
| NFR4 | Reliability | No dead code paths; CI catches broken imports before merge. | ✅ | CI added (`.github/workflows/ci.yml`); caught/fixed the `seed.html` broken import as the first real case |
| NFR5 | Performance | List views use paginated/cursor-based queries once project count exceeds ~100. | ⬜ | `getAllProjects()` and `stats.html` still do full-collection scans — Roadmap Phase 2 |
| NFR6 | Maintainability | Single source of truth for Firebase config per environment (dev/staging/prod). | ⬜ | One hardcoded prod config in `firebase-config.js` — Roadmap Phase 3 |
| NFR7 | Testability | Core business logic covered by unit tests runnable without a browser. | ✅ | `public/js/__tests__/utils.test.js` — 21 tests over status derivation, cost calc, escaping |
| NFR8 | Data integrity | Cascading deletes prevent orphaned subcollections/Storage objects. | ⬜ | Same as FR13 — Roadmap Phase 2 |
| NFR9 | Usability | Destructive actions require confirmation; async actions show loading/error state instead of bare `alert()`. | 🟡 | Errors are caught and surfaced, but via `alert()`/console — Roadmap Phase 3 |
| NFR10 | Deployability | One-command deploy with rules deployed atomically alongside hosting. | 🟡 | `firebase deploy` covers both hosting and rules today; no staging slot or pre-deploy check — Roadmap Phase 3/4 |

## How to add a new requirement

1. Add a row here first, in whichever table it belongs, with status ⬜.
2. Reference its ID (e.g. `FR14`, `NFR11`) in the roadmap phase where it will be worked.
3. Reference the ID again in the `DEVLOG.md` entry when it ships, and flip the status here.
