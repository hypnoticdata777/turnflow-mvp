# Architecture

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5 | No bundler, no framework. Pages import modules directly via `<script type="module">`. |
| Styling | Tailwind CSS via CDN (`cdn.tailwindcss.com`) | Not compiled/purged — fine for a POC, not for production bundle size. |
| Auth | Firebase Authentication (email/password) | `public/js/auth.js` |
| Database | Firebase Firestore | `public/js/firestore-projects.js`, `public/js/firestore-contacts.js` |
| File storage | Firebase Storage | Technician photo uploads, `public/js/technician.js` |
| Charts | Chart.js (CDN) | `stats.html` |
| PDF export | jsPDF (CDN) | `estimate.html` / `pending-send.html` |
| Tests | Vitest | `public/js/__tests__/`, pure-logic only (no DOM/Firebase deps) |
| CI | GitHub Actions | `.github/workflows/ci.yml` — installs deps, runs `npm test` |
| Hosting | Firebase Hosting | `firebase.json`, public root = `.` (repo root) |

There is intentionally no build step. All third-party libraries load from
CDNs at runtime via versioned URLs (e.g.
`https://www.gstatic.com/firebasejs/10.12.4/...`). This keeps the POC
frictionless to run (`npx serve .` and go) but means there's no dependency
lockfile for the frontend runtime libs, no tree-shaking, and no offline dev
story. See `ROADMAP.md` for when this stops being the right tradeoff.

## Roles

| Role | Home page | Can do |
|---|---|---|
| `pm` | `dashboard.html` | Create, edit, delete projects; manage contacts; backup data |
| `admin` | `dashboard.html` | Everything `pm` can do, plus write access to `users/{uid}` docs |
| `tech` | `technician.html` | View only assigned projects; upload before/after/receipt photos |
| `client` | `pending-approval.html` (stub) | Intended: read-only view of their own project's approval status |

Role is stored at `users/{uid}.role` in Firestore and set manually via the
Firebase console today (see `SETUP.md`). `roleHome(role)` in `auth.js` is
the single source of truth for "where does this role land after login."

## Data model (Firestore)

```
users/{uid}
  role: "pm" | "admin" | "tech" | "client"

projects/{projectId}
  projectName, address, unit, owner, date, status, assignedTechId?
  tasks: [
    { name, hours, rate, material, completed, dueDate?, startTime?, endTime?, blocked? }
  ]
  createdAt, updatedAt   // serverTimestamp()

  tasks/{taskId}/photos/{photoId}      // NOTE: taskId here is a Storage-path key,
    type: "before" | "after" | "receipt"  // NOT the same as an index into projects.tasks[]
    url, storagePath, techId, createdAt

contacts/{contactId}
  (owner/client contact fields)
```

**Known modeling quirk worth flagging:** `tasks` on a project is an
*embedded array* (no task-level document IDs), but photos live in a
*subcollection* keyed by `taskId` — a string typed into the technician
upload form / selected by array index. These are two different notions of
"task identity" living side by side. It works today because the
technician UI populates the task dropdown from the same array index it
writes into the photos path, but it's fragile: reordering or deleting a
task from `projectData.tasks` silently orphans or mismatches existing
photos. Worth resolving before FR7 (status lifecycle) or FR13 (cascading
delete) get built on top of it — see Roadmap Phase 2.

## Storage layout (Firebase Storage)

```
turnflow/{projectId}/{taskId}/{type}/{uid}/{timestamp}_{filename}
```

## Security rules

`firestore.rules` enforces role checks server-side (not just in the UI):

- `users/{userId}`: read only your own doc; write only if `admin`.
- `projects/{projectId}`: read if authenticated; write (`create`/`update`/`delete`) only if `pm`/`admin`.
- `projects/{projectId}/tasks/{taskId}/photos/{photoId}`: read if authenticated; create only by the `tech` whose `uid` matches `techId` on the doc; update/delete only `admin`.
- `contacts/{contactId}`: read if authenticated; write only `pm`/`admin`.

**Gap:** there is no `storage.rules` file in this repo and `firebase.json`
does not reference one. Firestore rules protect the *metadata* documents in
`.../photos/{photoId}`, but the actual binary files in Firebase Storage are
governed by whatever rules are configured directly in the Firebase console
(if any) — this is not currently version-controlled or reviewable in this
repo. This is tracked as NFR1 in `REQUIREMENTS.md` and should be fixed
early in Roadmap Phase 2: add a `storage.rules` file, mirror the Firestore
tech/admin logic, and wire it into `firebase.json`.

## File map

```
index.html              Login page
dashboard.html           PM/Admin: project list, task completion, delete
new-project.html         PM/Admin: create/edit project + tasks
estimate.html            View a single project's estimate (PDF export)
pending-approval.html    Client stub (Roadmap Phase 1 target)
pending-send.html        PM: send-for-approval flow
contacts.html            PM/Admin: contacts CRUD
technician.html          Tech: assigned projects, photo upload, gallery
stats.html                PM/Admin: charts (Chart.js)
backup.html               PM/Admin: export/import JSON
seed.html                 Dev tool: seed one sample project as current tech user
404.html                  Not found page

public/js/
  firebase-config.js      Firebase SDK init (auth, db) — one hardcoded project
  auth.js                 Login, logout, role routing, requireRole/requireAnyRole guards
  firestore-projects.js   Project CRUD
  firestore-contacts.js   Contact CRUD
  script.js               Dashboard/new-project/stats page logic, DOM wiring
  technician.js            Photo upload + gallery logic
  utils.js                Pure helpers: escHtml, task status derivation, cost calc
  __tests__/utils.test.js Vitest unit tests for utils.js

firestore.rules           Firestore security rules
firebase.json             Hosting + rules deploy config
.github/workflows/ci.yml  CI: npm test on push/PR to main
```
