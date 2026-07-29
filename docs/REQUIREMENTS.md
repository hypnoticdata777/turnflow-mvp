# Requirements — TurnFlow Home (canonical, v1.1+)

**This document is the single source of truth for what TurnFlow is being
built to do.** It supersedes the pre-pivot property-turnover requirements
that shaped the code through 2026-07-12 (kept below as an appendix for
traceability — see [Appendix A](#appendix-a--legacy-pre-pivot-requirements-superseded)).

## Positioning

TurnFlow Home is a **guided maintenance self-management product for
homeowners and owner clients** who want structure, proof, records, and
reminders without hiring a full property management operation.

Status legend: ✅ Done · 🟡 Partial (something real exists, doesn't meet the
bar yet) · ⬜ Not started

---

## 1. Business Requirements (BR)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| BR1 | Provide homeowners and owner clients with a guided system to intake, organize, prioritize, and track maintenance requests. | 🟡 | Intake/tracking substrate exists (`new-project.html`, `dashboard.html`) but is shaped for a PM entering turnover jobs, not a homeowner self-serving a maintenance issue — no guidance, no prioritization signal. Target: [ROADMAP.md](./ROADMAP.md) v1.2 Package 1. |
| BR2 | Reduce uncertainty by translating maintenance issues into next steps, recommended evidence, vendor-ready scope, and approval records. | ⬜ | No category→checklist logic, no recommended-evidence prompts, no scoped vendor package concept today. v1.2 Package 1 & 3. |
| BR3 | Create a trusted property maintenance history that survives texts, emails, calls, and lost receipts. | 🟡 | Firestore is a durable system of record already; what's missing is the *history* framing — a per-property timeline/export, not just a live project list. v1.2 Package 6/7. |
| BR4 | Support homeowner decision-making around quotes, budgets, recurring maintenance, and repair proof. | ⬜ | No quote comparison, no budget view, no recurring maintenance concept exists yet. v1.2 Packages 4 & 8. |
| BR5 | Enable lightweight collaboration with household members, invited vendors, and optional advisors without exposing unrelated property data. | 🟡 | Role-scoped access exists in principle (`client` role is `clientId`-scoped) but there's no household-member concept, no per-request vendor invite, no advisor role. v1.2 Packages 3 & 10. |
| BR6 | Package completed maintenance into proof records that can support resale, insurance, warranty, or owner documentation. | 🟡 | PDF export exists (`estimate.html`, jsPDF) but produces an estimate, not a completed-work proof packet. v1.2 Package 7. |

## 2. Business Rules (BRL)

| ID | Rule | Status | Notes |
|---|---|---|---|
| BRL1 | Every request must belong to one property and one account owner. | 🟡 | Projects belong to one implicit owner today (no shared PM account concept), but there is no `Property` entity distinct from the request itself — `address` is a field on the project, not a parent record. v1.1 (data model pivot). |
| BRL2 | A maintenance request cannot be marked complete until required proof fields are satisfied or intentionally waived. | ⬜ | No completion gating exists; any status transition is currently unrestricted. v1.2 Package 5. |
| BRL3 | Costs remain estimates until a vendor quote, invoice, or homeowner-entered final cost is attached. | 🟡 | Tasks carry a `rate`/`material` estimate; there's no separate quote vs. invoice vs. final-cost field, so nothing distinguishes "estimated" from "actual." v1.2 Package 4. |
| BRL4 | Emergency labels must show clear guidance that the product is not an emergency dispatch service. | ⬜ | No urgency/emergency labeling exists at all yet. v1.2 Package 1. |
| BRL5 | Household collaborators can only access properties, requests, and files explicitly shared with them. | 🟡 | The `client` role is scoped to `clientId`-tagged projects server-side (`firestore.rules`), which is the right *pattern* — but there's no household-member concept (today's "client" is really an external stakeholder, not a family member), and sharing is per-project, not per-property with request-level granularity. v1.2 Package 10. |
| BRL6 | Vendors only see the scoped request package they were invited to view. | 🟡 | Technicians are assigned per-project (`assignedTechId`) and can currently read *any* project's data per `firestore.rules` (not scoped to their assignment) — the read-side scoping gap called out in the legacy NFR1 note still applies and gets worse under the vendor-invite model if not closed first. v1.2 Package 3. |
| BRL7 | Completed records must preserve date, status, photos, cost, vendor, notes, and attachments. | 🟡 | The raw fields mostly exist per-task, but nothing consolidates them into an immutable "completed record" — editing a project after completion can still mutate history today. v1.2 Package 5 (decision log) & 6 (vault). |

## 3. Constraints (CON)

| ID | Constraint | Status | Notes |
|---|---|---|---|
| CON1 | The product must not present itself as a licensed contractor, inspector, legal advisor, or emergency response provider. | ⬜ | No disclaimer copy exists anywhere in the UI yet. v1.2 Package 1 (ships alongside urgency/emergency labeling, BRL4). |
| CON2 | Consumer trust requires simple language, clear privacy controls, and low-friction onboarding. | ⬜ | Current copy/flows are written for a PM/technician/client operational audience, not a homeowner. Full copy pass needed across v1.2. |
| CON3 | The first version should avoid complex enterprise dispatch, technician payroll, or route optimization. | ✅ | Already true — none of that exists in this codebase, and nothing in the v1.2 plan adds it. |
| CON4 | Vendor marketplace and payments should be optional later-stage capabilities, not required for MVP usefulness. | ✅ (by design) | Explicitly deferred to v2.0 in [ROADMAP.md](./ROADMAP.md). |
| CON5 | Mobile usability is mandatory because users will capture photos and receipts from the property. | 🟡 | Tailwind CDN styling is responsive by default and photo upload already works from `technician.html`, but no phone-width pass has been done for the redesigned homeowner flows. v1.2 Package 12. |
| CON6 | Data export must exist so homeowners are not locked into the tool. | 🟡 | `backup.html` exports a raw JSON dump of all projects — real, but not a homeowner-legible export. Needs PDF/CSV alongside JSON. v1.2 Package 7. |

## 4. External Interface Requirements (EXT)

| ID | Interface | Status | Notes |
|---|---|---|---|
| EXT1 | Email notifications for request updates, reminders, shared reports, and vendor invitations. | ⬜ | No notification service of any kind exists today (this is genuinely new infrastructure — needs a Cloud Function + email provider). v1.2 Package 9. |
| EXT2 | SMS or push notifications for time-sensitive reminders and vendor responses, if enabled by the user. | ⬜ | Deferred past MVP — v1.3+. Opt-in, additive on top of the EXT1 notification service. |
| EXT3 | Calendar export for recurring maintenance reminders and scheduled vendor visits. | ⬜ | No recurring-maintenance concept exists to export from yet. v1.2 Package 8 (ICS export, no third-party dependency needed). |
| EXT4 | File storage interface for photos, PDFs, receipts, warranties, invoices, and inspection reports. | 🟡 | Firebase Storage is wired up and working, but scoped narrowly to per-task before/after/receipt photos (`turnflow/{projectId}/{taskId}/{type}/...`). Needs generalizing to property-level documents not tied to a single task. v1.2 Package 6. |
| EXT5 | PDF export for maintenance summaries, quote packages, and completed proof packets. | 🟡 | jsPDF is wired up (`estimate.html`) but produces a plain-text estimate, not a formatted summary/quote/proof packet. v1.2 Package 7. |
| EXT6 | Optional maps/address validation for property setup and vendor appointment context. | ⬜ | Not started — genuinely optional per CON5-adjacent framing; v1.3+. |
| EXT7 | Future payment or invoice interface for quote deposits and final invoice tracking. | ⬜ | Explicitly deferred to v2.0 per CON4. |

## 5. Features (FEAT)

| ID | Feature | Status | Notes |
|---|---|---|---|
| FEAT1 | Guided maintenance request intake with issue category, urgency, location, photos, notes, and access instructions. | ⬜ | `new-project.html` today is a turnover-job/estimate builder (itemized tasks with labor hours/rate), not a guided single-issue intake form. v1.2 Package 1. |
| FEAT2 | Homeowner dashboard showing open, scheduled, waiting, approved, and completed maintenance. | 🟡 | A dashboard exists (`dashboard.html`) but its 4 statuses (Pending Approval → Approved → Sent → Completed) don't match the target lifecycle. v1.2 Package 2. |
| FEAT3 | Quote collection workspace with side-by-side vendor options, attachments, and decision notes. | ⬜ | Not started. v1.2 Package 4. |
| FEAT4 | Maintenance calendar for recurring HVAC, plumbing, appliance, roof, landscaping, and safety checks. | ⬜ | Not started. v1.2 Package 8. |
| FEAT5 | Property record vault for photos, receipts, warranties, manuals, invoices, and closeout packets. | 🟡 | Photo storage exists but is task-scoped, not a property-level vault for arbitrary document types. v1.2 Package 6. |
| FEAT6 | Approval and decision log that preserves who approved what, when, and based on which evidence. | ⬜ | Not started — no audit trail beyond Firestore's own `createdAt`/`updatedAt` timestamps. v1.2 Package 5. |
| FEAT7 | Exportable maintenance history report for owners, buyers, insurers, or advisors. | 🟡 | `backup.html` exports raw JSON only; not a legible report. v1.2 Package 7. |

## 6. Functional Requirements (FR)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR1 | The system shall allow a homeowner to create and manage one or more properties. | ⬜ | No `Property` entity exists distinct from a project's `address` field. v1.1 (data model pivot), prerequisite for everything else in this section. |
| FR2 | The system shall allow users to create maintenance requests with photos, notes, room/location, urgency, and preferred contact method. | 🟡 | Photos and notes exist at the task level; room/location, urgency, and contact method don't exist as fields anywhere. v1.2 Package 1. |
| FR3 | The system shall classify requests by category and recommend a next-step checklist. | ⬜ | Not started. v1.2 Package 1. |
| FR4 | The system shall allow users to invite a vendor to view a scoped request package. | 🟡 | PM can assign a technician from a dropdown of existing `tech`-role users (`firestore-users.js`), which is adjacent but not an *invite* flow (no email invite, no new-account bootstrapping, no per-request scoping — assignment is per-project and grants that tech visibility rules don't actually restrict, see BRL6). v1.2 Package 3. |
| FR5 | The system shall allow users to record quotes, estimated costs, final costs, invoices, receipts, and selected vendor. | 🟡 | `material`/`rate`/`hours` estimate fields exist; no quote vs. final-cost vs. invoice distinction, no "selected vendor" decision record. v1.2 Package 4. |
| FR6 | The system shall support status transitions including Draft, Needs Quote, Waiting, Scheduled, In Progress, Needs Review, Complete, and Archived. | ⬜ | Current lifecycle is Pending Approval → Approved → Sent → Completed — a different, shorter state machine built for a different workflow. v1.2 Package 2. |
| FR7 | The system shall generate exportable proof packets for selected requests or an entire property. | 🟡 | PDF export exists for a single project's estimate; nothing generates a proof packet (evidence + decision trail) for a request or rolls up a whole property. v1.2 Package 7. |
| FR8 | The system shall notify users about upcoming recurring tasks, overdue requests, and vendor updates. | ⬜ | No notification service exists. v1.2 Packages 8 & 9. |

## 7. Nonfunctional Requirements (NFR)

| ID | Category | Requirement | Status | Notes |
|---|---|---|---|---|
| NFR1 | Performance | Pages used during photo capture and request creation should load in under 2 seconds on normal broadband. | 🟡 | Not measured; likely fine today (small static pages) but the Tailwind Play CDN (unminified, unpurged, compiled client-side) is a real risk as pages grow — see the Vite-migration trigger in the roadmap. |
| NFR2 | Usability | The app should remain usable on mobile browsers at common phone widths. | 🟡 | Tailwind's responsive utilities are in use but no phone-width verification pass has been done, and the redesigned homeowner flows (v1.2) haven't been built yet to test. v1.2 Package 12. |
| NFR3 | Security | User data must be encrypted in transit and protected at rest by the hosting/storage provider. | ✅ | Firebase enforces TLS in transit and encrypts Firestore/Storage at rest by default — inherited for free from the platform choice. |
| NFR4 | Portability | Exports should remain available in common formats such as PDF, CSV, and JSON. | 🟡 | JSON export exists (`backup.html`); PDF export exists but is minimal; CSV export doesn't exist. v1.2 Package 7. |
| NFR5 | Reliability | The product should support account recovery and data backup procedures. | 🟡 | Firebase Auth's built-in password reset covers account recovery; `backup.html`'s JSON export is a real backup path but isn't documented as a recovery *procedure* (when/how to restore). Roadmap v1.3+ for a documented restore runbook. |
| NFR6 | Observability | Notification delivery should be observable so failed reminders can be detected. | ⬜ | No notifications exist yet to observe. Ships alongside EXT1/FR8 in v1.2 Package 9 — a delivery log from day one, not bolted on later. |

## 8. Quality Attributes (QA)

| ID | Attribute | Requirement | Status | Notes |
|---|---|---|---|---|
| QA1 | Usability | Non-technical homeowners should understand what to do next without training. | ⬜ | Current UI/copy targets a PM/technician operational audience. Full copy and flow redesign across v1.2. |
| QA2 | Trust | Private property data, photos, and access instructions must feel protected and controllable. | 🟡 | Server-side security rules exist and are reasonably scoped, but there's no consumer-facing privacy/sharing UI to make control *visible* to the user. v1.2 Package 10. |
| QA3 | Transparency | Estimates, approvals, proof, and final costs should be easy to audit later. | ⬜ | No decision log exists. v1.2 Package 5. |
| QA4 | Recoverability | Users must be able to export records and recover from accidental archive/delete actions. | 🟡 | Export exists (partially, see NFR4); recovery from accidental delete does not — `deleteProject()` is an immediate hard cascade delete today (with a `confirm()` prompt as the only safety net). Worth a soft-delete/undo pass in v1.2 Package 5 or v1.3. |
| QA5 | Accessibility | Core request and review flows should work with keyboard navigation and readable contrast. | ⬜ | Not audited. v1.3+. |
| QA6 | Portability | Maintenance history should be useful outside the app. | 🟡 | Same gap as NFR4/CON6 — JSON export isn't "useful outside the app" for a homeowner; PDF/CSV closes this. v1.2 Package 7. |

## 9. System Requirements (SYS)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| SYS1 | Responsive web or PWA frontend optimized for mobile capture and desktop review. | 🟡 | Responsive web exists; no PWA manifest/service worker/installability. v1.3+. |
| SYS2 | Authentication with account owner, collaborator, and invited vendor access modes. | 🟡 | Auth + a 4-role model (`pm`/`admin`/`tech`/`client`) exists and is a good *pattern* to build on, but the roles map to the wrong domain (property-manager/technician/external-client, not owner/household-collaborator/vendor). v1.1 (role remap). |
| SYS3 | Database model for users, properties, requests, quotes, vendors, files, reminders, and audit events. | 🟡 | `users`, and a projects-shaped `requests` collection exist. `properties`, `quotes` (as distinct from request cost fields), `reminders`, and `audit events` do not. v1.1 + v1.2 Packages 4/5/8. |
| SYS4 | Object storage for photos, PDFs, receipts, and warranty documents. | 🟡 | Firebase Storage exists, scoped to task photos only today. v1.2 Package 6. |
| SYS5 | Notification service for email and optional SMS/push. | ⬜ | Not started. v1.2 Package 9 (email), v1.3+ (SMS/push). |
| SYS6 | Export service for PDF packets and structured data backups. | 🟡 | JSON backup + a minimal PDF export exist as separate, unrelated code paths, not a unified export service. v1.2 Package 7. |
| SYS7 | Role and sharing rules that restrict collaborators and vendors to scoped data. | 🟡 | `firestore.rules` enforces role checks server-side, and `client`-role scoping via `clientId` is real — but vendor (`tech`) reads are currently *not* scoped to assignment (BRL6 gap), and there's no household/advisor sharing model yet. v1.1 role remap + v1.2 Packages 3 & 10. |

## 10. User Requirements (UR)

| ID | Story | Status | Notes |
|---|---|---|---|
| UR1 | As a homeowner, I want to document an issue quickly so I do not forget important details. | ⬜ | Blocked on FEAT1/FR2 (guided intake). |
| UR2 | As a homeowner, I want to know what proof or photos to collect before calling a vendor. | ⬜ | Blocked on FR3 (category → next-step checklist). |
| UR3 | As an owner client, I want to approve or decline quotes with context and cost visibility. | ⬜ | Blocked on FEAT3/FR5 (quote workspace) and FEAT6 (decision log). |
| UR4 | As a household collaborator, I want to add updates without seeing unrelated private records. | ⬜ | Blocked on BRL5/SYS7 (household sharing model — today's `client` role isn't a household concept). |
| UR5 | As an invited vendor, I want the scope, photos, access notes, and contact rules in one place. | ⬜ | Blocked on BRL6/FR4 (vendor invite + scoped package). |
| UR6 | As a homeowner, I want a complete maintenance history I can export when selling, refinancing, insuring, or planning repairs. | 🟡 | Partially achievable today via `backup.html`'s JSON export, but not in a form a homeowner, buyer, or insurer would find usable. Blocked on FEAT7/FR7 (proof packet export). |

---

## How to add a new requirement

1. Add a row here first, in whichever of the 10 sections it belongs, with status ⬜.
2. Reference its ID (e.g. `FR9`, `EXT8`) in the roadmap package/phase where it will be worked — see [ROADMAP.md](./ROADMAP.md).
3. Reference the ID again in the `DEVLOG.md` entry when it ships, and flip the status here.

---

## Appendix A — Legacy pre-pivot requirements (superseded)

The table below is the requirement set that shaped the codebase through
2026-07-12, when TurnFlow was a role-based **property-turnover management**
tool (PM creates and estimates jobs, technicians execute and photograph
them, clients watch approval status). It's kept here for traceability —
several of these items (security hardening, pagination, cascading delete,
CSP) are still directly relevant infrastructure under the new product
framing above, and the roadmap's v1.1/v1.2 packages build on top of that
work rather than redoing it. IDs here are **not** the same namespace as the
BR/BRL/CON/EXT/FEAT/FR/NFR/QA/SYS/UR IDs above — don't reuse `FR1`, `NFR1`,
etc. from this table when referencing the current requirements.

### Legacy Functional Requirements (FR)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR1 | PM/Admin can create, edit, delete, and view projects with itemized tasks (labor hours, rate, materials). | ✅ | `dashboard.html`, `new-project.html`, `firestore-projects.js` |
| FR2 | System computes and displays a live cost estimate per project (labor + materials). | ✅ | `calculateEstimateTotal()` in `utils.js`, unit tested |
| FR3 | Technicians can view only projects assigned to them and mark individual tasks complete. | ✅ | `technician.html` queries `where('assignedTechId', '==', uid)` |
| FR4 | Technicians can upload before/after/receipt photos per task, viewable in a gallery scoped to that task. | ✅ | `technician.js`, Firebase Storage |
| FR5 | PM/Admin can assign a technician to a project via UI. | ✅ | Dashboard dropdown writes `assignedTechId` via `updateProject()` |
| FR6 | Clients have a real read-only portal showing project status and approval state for their properties only. | ✅ | `pending-approval.html`, `clientId`-scoped |
| FR7 | Project status lifecycle: Pending Approval → Approved → Sent → Completed. | ✅ | `PROJECT_STATUSES` + `projectStatusBadgeClasses()` in `utils.js` |
| FR8 | PM/Admin can manage a contacts list (owners/clients) linked to projects. | ✅ | `contacts.html`, `firestore-contacts.js` |
| FR9 | System generates a client-presentable PDF estimate/invoice per project. | 🟡 | jsPDF wired up but plain text, no table formatting |
| FR10 | PM/Admin can export/import all project data as JSON for backup/restore. | ✅ | `backup.html` |
| FR11 | Task status granularity (open/in-progress/blocked/overdue/completed) surfaced consistently across PM and technician views. | 🟡 | Logic exists (`tf_getTaskStatus`), technician view only shows completed/pending |
| FR12 | Stats view shows completed-vs-pending task ratios and cost breakdown per property. | ✅ | `stats.html`, Chart.js pie/bar |
| FR13 | Deleting a project cascades to delete its task photo subcollections and Storage files. | 🟡 | Common case covered; residual gap for shrunk task lists — see `ARCHITECTURE.md` |

### Legacy Non-Functional Requirements (NFR)

| ID | Category | Requirement | Status | Notes |
|---|---|---|---|---|
| NFR1 | Security | All Firestore/Storage access enforced server-side via security rules; client-side role checks are UX only. | 🟡 | Rules exist and are reasonably scoped; photo-read scoping to `clientId` still open |
| NFR2 | Security | CSP headers configured in `firebase.json`. | ✅ | `script-src` has no `'unsafe-inline'`; `style-src` still needs it (Tailwind Play CDN) |
| NFR3 | Security | Login rate limiting or Firebase App Check enabled. | 🟡 | Client-side lockout live; App Check wired but inert pending console setup |
| NFR4 | Reliability | No dead code paths; CI catches broken imports before merge. | ✅ | `.github/workflows/ci.yml` |
| NFR5 | Performance | List views use paginated/cursor-based queries once project count exceeds ~100. | 🟡 | `dashboard.html` paginates; `stats.html` still full-scans |
| NFR6 | Maintainability | Single source of truth for Firebase config per environment (dev/staging/prod). | ⬜ | One hardcoded prod config |
| NFR7 | Testability | Core business logic covered by unit tests runnable without a browser. | ✅ | `public/js/__tests__/utils.test.js` |
| NFR8 | Data integrity | Cascading deletes prevent orphaned subcollections/Storage objects. | 🟡 | Same residual gap as FR13 |
| NFR9 | Usability | Destructive actions require confirmation; async actions show loading/error state instead of bare `alert()`. | 🟡 | Errors surfaced via `alert()`/console |
| NFR10 | Deployability | One-command deploy with rules deployed atomically alongside hosting. | 🟡 | `firebase deploy` covers both; no staging slot or pre-deploy check |

This legacy set is considered **closed to new work** — gaps that are still
relevant (e.g. the photo-read `clientId` scoping under legacy NFR1) are
carried forward into the current requirement set above (BRL6/SYS7) rather
than tracked here going forward.
