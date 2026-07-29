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
| BR1 | Provide homeowners and owner clients with a guided system to intake, organize, prioritize, and track maintenance requests. | 🟡 | v1.1 reshaped intake to a single-issue-per-request form (`new-request.html`) with real category/urgency/location fields, replacing the turnover-job/estimate builder — but there's still no guidance or prioritization signal. Target: [ROADMAP.md](./ROADMAP.md) v1.2 Package 1. |
| BR2 | Reduce uncertainty by translating maintenance issues into next steps, recommended evidence, vendor-ready scope, and approval records. | ⬜ | No category→checklist logic, no recommended-evidence prompts. The "vendor-ready scope package" piece is now real (v1.1 — a vendor's scoped view shows title/category/location/access instructions/contact method), but the checklist/approval-record parts are still v1.2 Package 1 & 3. |
| BR3 | Create a trusted property maintenance history that survives texts, emails, calls, and lost receipts. | 🟡 | Firestore is a durable system of record, now organized as property → requests (v1.1) rather than a flat project list; what's still missing is the *history* framing — a per-property timeline/export. v1.2 Package 6/7. |
| BR4 | Support homeowner decision-making around quotes, budgets, recurring maintenance, and repair proof. | ⬜ | No quote comparison, no budget view, no recurring maintenance concept exists yet. v1.2 Packages 4 & 8. |
| BR5 | Enable lightweight collaboration with household members, invited vendors, and optional advisors without exposing unrelated property data. | 🟡 | v1.1 gives real per-request scoping for both `vendor` and `collaborator` roles, enforced in `firestore.rules`/`storage.rules` — not just per-project like before. Still missing: an actual invite flow (today it's assignment from an existing user list), and an advisor role. v1.2 Packages 3 & 10. |
| BR6 | Package completed maintenance into proof records that can support resale, insurance, warranty, or owner documentation. | 🟡 | PDF export exists (`request.html`, jsPDF) but produces a request summary, not a completed-work proof packet with an evidence/decision trail. v1.2 Package 7. |

## 2. Business Rules (BRL)

| ID | Rule | Status | Notes |
|---|---|---|---|
| BRL1 | Every request must belong to one property and one account owner. | ✅ | v1.1: `properties/{propertyId}` is now a first-class entity (`ownerUid`, `address`, `nickname`); every `requests/{requestId}` carries both `propertyId` and `ownerUid`, enforced by `firestore.rules` (a request can't be created without both). |
| BRL2 | A maintenance request cannot be marked complete until required proof fields are satisfied or intentionally waived. | ⬜ | No completion gating exists; any status transition is currently unrestricted. v1.2 Package 5. |
| BRL3 | Costs remain estimates until a vendor quote, invoice, or homeowner-entered final cost is attached. | 🟡 | v1.1: `estimatedCost`/`quotedCost`/`finalCost` are now three independent fields (not one overwritten "cost"), and `costForRequest()`/`costLabelForRequest()` in `utils.js` resolve + label which stage is authoritative (final > quoted > estimated) so the UI never shows an estimate as if it were actual. Still missing: nothing *gates* which field can be set when (an owner could type a `finalCost` on day one), and there's no quote/invoice attachment file — that's v1.2 Package 4's real quote workspace. |
| BRL4 | Emergency labels must show clear guidance that the product is not an emergency dispatch service. | 🟡 | v1.1: `new-request.html` shows a "not an emergency dispatch service" disclaimer whenever Urgency is set to Emergency. Still v1.2 Package 1 scope: this should also surface wherever urgency is *displayed* (dashboard, vendor view), not just at intake. |
| BRL5 | Household collaborators can only access properties, requests, and files explicitly shared with them. | 🟡 | v1.1: a `collaborator` now reads only the specific request whose `collaboratorUid` matches them, enforced server-side (`firestore.rules`) — a real improvement over the pre-pivot per-project `clientId` pattern in that it's request-level, not just differently scoped. Still missing: multi-person sharing (one field = one collaborator per request today) and a dedicated sharing UI. v1.2 Package 10. |
| BRL6 | Vendors only see the scoped request package they were invited to view. | ✅ | v1.1 closes the actual security gap: a `vendor` can now only read the request whose `assignedVendorUid` matches them — enforced in both `firestore.rules` and `storage.rules` (photos included), not just hidden in the UI. What's still not real: "invited" — today it's assignment from a dropdown of existing vendor-role users, not an email invite that can onboard someone new. That UX gap is v1.2 Package 3; the access-control gap this rule is really about is closed. |
| BRL7 | Completed records must preserve date, status, photos, cost, vendor, notes, and attachments. | 🟡 | The fields all exist directly on the request now (not scattered per-task), and photos have real, stable document IDs (v1.1) so nothing orphans them — but there's still no immutable "completed record" snapshot; editing a request after completion can still mutate its history. v1.2 Package 5 (decision log). |

## 3. Constraints (CON)

| ID | Constraint | Status | Notes |
|---|---|---|---|
| CON1 | The product must not present itself as a licensed contractor, inspector, legal advisor, or emergency response provider. | 🟡 | v1.1: the emergency disclaimer (BRL4) covers the emergency-dispatch case at intake. Still missing: an equivalent disclaimer for the contractor/inspector/legal-advisor framing more generally (e.g. in a footer or about page). |
| CON2 | Consumer trust requires simple language, clear privacy controls, and low-friction onboarding. | 🟡 | v1.1's role/copy rename (owner/vendor/collaborator, "request" not "project") is a real step toward consumer-facing language, but there's no dedicated privacy-controls UI yet and onboarding still assumes console-created accounts. Full pass across v1.2. |
| CON3 | The first version should avoid complex enterprise dispatch, technician payroll, or route optimization. | ✅ | Already true — none of that exists in this codebase, and nothing in the v1.2 plan adds it. |
| CON4 | Vendor marketplace and payments should be optional later-stage capabilities, not required for MVP usefulness. | ✅ (by design) | Explicitly deferred to v2.0 in [ROADMAP.md](./ROADMAP.md). |
| CON5 | Mobile usability is mandatory because users will capture photos and receipts from the property. | 🟡 | Tailwind CDN styling is responsive by default and photo upload works from both `request.html` (owner) and `vendor.html`, but no phone-width verification pass has been done. v1.2 Package 11. |
| CON6 | Data export must exist so homeowners are not locked into the tool. | 🟡 | v1.1: `backup.html` now exports properties + requests together (not just a flat project dump) as JSON, with restore correctly remapping property references — real, but still not a homeowner-legible export (no PDF/CSV rollup). v1.2 Package 7. |

## 4. External Interface Requirements (EXT)

| ID | Interface | Status | Notes |
|---|---|---|---|
| EXT1 | Email notifications for request updates, reminders, shared reports, and vendor invitations. | ⬜ | No notification service of any kind exists today (this is genuinely new infrastructure — needs a Cloud Function + email provider). v1.2 Package 9. |
| EXT2 | SMS or push notifications for time-sensitive reminders and vendor responses, if enabled by the user. | ⬜ | Deferred past MVP — v1.3+. Opt-in, additive on top of the EXT1 notification service. |
| EXT3 | Calendar export for recurring maintenance reminders and scheduled vendor visits. | ⬜ | No recurring-maintenance concept exists to export from yet. v1.2 Package 8 (ICS export, no third-party dependency needed). |
| EXT4 | File storage interface for photos, PDFs, receipts, warranties, invoices, and inspection reports. | 🟡 | v1.1 simplified the path to `turnflow/{requestId}/{type}/{uid}/...` (no more task-index segment) and added an `other` photo type, but it's still request-scoped photo evidence, not a property-level document vault for warranties/manuals/inspection reports independent of any single request. v1.2 Package 6. |
| EXT5 | PDF export for maintenance summaries, quote packages, and completed proof packets. | 🟡 | jsPDF is wired up (`request.html`) and now reflects the new request schema (category/urgency/status/cost), but it's still a plain-text summary, not a formatted quote package or proof packet. v1.2 Package 7. |
| EXT6 | Optional maps/address validation for property setup and vendor appointment context. | ⬜ | Not started — genuinely optional per CON5-adjacent framing; v1.3+. |
| EXT7 | Future payment or invoice interface for quote deposits and final invoice tracking. | ⬜ | Explicitly deferred to v2.0 per CON4. |

## 5. Features (FEAT)

| ID | Feature | Status | Notes |
|---|---|---|---|
| FEAT1 | Guided maintenance request intake with issue category, urgency, location, photos, notes, and access instructions. | 🟡 | v1.1: `new-request.html` now captures category, urgency (with an emergency disclaimer), location, contact method, access instructions, and notes in one single-issue form — a real replacement for the old itemized turnover-job builder. Photos are attached on the request-detail page after creation, not inline at intake, and there's still no guided next-step checklist. v1.2 Package 1 finishes the "guided" part. |
| FEAT2 | Homeowner dashboard showing open, scheduled, waiting, approved, and completed maintenance. | 🟡 | v1.1: the dashboard's status set now matches the full 8-state target lifecycle (`REQUEST_STATUSES` in `utils.js`), replacing the old 4-state one. Still one flat list with a status badge/dropdown per card, not filtered/grouped views by status. v1.2 Package 2 polish. |
| FEAT3 | Quote collection workspace with side-by-side vendor options, attachments, and decision notes. | ⬜ | Not started — v1.1 added the three cost fields (BRL3) but not a multi-quote comparison workspace. v1.2 Package 4. |
| FEAT4 | Maintenance calendar for recurring HVAC, plumbing, appliance, roof, landscaping, and safety checks. | ⬜ | Not started. v1.2 Package 8. |
| FEAT5 | Property record vault for photos, receipts, warranties, manuals, invoices, and closeout packets. | 🟡 | v1.1 generalized photo storage from task-scoped to request-scoped with an `other` type, but it's still not a property-level vault for documents independent of a single request. v1.2 Package 6. |
| FEAT6 | Approval and decision log that preserves who approved what, when, and based on which evidence. | ⬜ | Not started — no audit trail beyond Firestore's own `createdAt`/`updatedAt` timestamps. v1.2 Package 5. |
| FEAT7 | Exportable maintenance history report for owners, buyers, insurers, or advisors. | 🟡 | v1.1: `backup.html` now exports properties + requests as structured JSON (not a flat project dump); still not a legible report format. v1.2 Package 7. |

## 6. Functional Requirements (FR)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR1 | The system shall allow a homeowner to create and manage one or more properties. | ✅ | v1.1: `properties.html` + `firestore-properties.js` — an owner creates/lists/deletes properties (`ownerUid`-scoped), each with an address, optional unit, and nickname. |
| FR2 | The system shall allow users to create maintenance requests with photos, notes, room/location, urgency, and preferred contact method. | 🟡 | v1.1: `new-request.html` captures notes, room/location, urgency, and preferred contact method directly. Photos are attached afterward on `request.html`, not inline in the creation form — full single-step guided capture is v1.2 Package 1. |
| FR3 | The system shall classify requests by category and recommend a next-step checklist. | 🟡 | v1.1: every request now has a `category` field (Plumbing/Electrical/HVAC/etc., see `REQUEST_CATEGORIES` in `utils.js`) — the classification half. The "recommend a next-step checklist" half is not started. v1.2 Package 1. |
| FR4 | The system shall allow users to invite a vendor to view a scoped request package. | 🟡 | v1.1 closes the scoping half for real (see BRL6 — a vendor's read access is enforced server-side to only their assigned request). The "invite" half is still assignment from an existing vendor-role user list, not an email invite that can onboard someone new. v1.2 Package 3. |
| FR5 | The system shall allow users to record quotes, estimated costs, final costs, invoices, receipts, and selected vendor. | 🟡 | v1.1: `estimatedCost`/`quotedCost`/`finalCost` are now distinct fields (BRL3), and "selected vendor" exists via `assignedVendorUid`. Still missing: multiple competing quotes per request, invoice/receipt file attachments distinct from photo evidence. v1.2 Package 4. |
| FR6 | The system shall support status transitions including Draft, Needs Quote, Waiting, Scheduled, In Progress, Needs Review, Complete, and Archived. | ✅ | v1.1: `REQUEST_STATUSES` in `utils.js` is exactly this 8-state list, used by the dashboard's status dropdown, the vendor view's status dropdown, and the collaborator portal's badge. Free transitions between any two states (not a strict state machine), matching the pre-pivot correction-friendly pattern. |
| FR7 | The system shall generate exportable proof packets for selected requests or an entire property. | 🟡 | PDF export exists per-request (`request.html`) with the new schema's fields; nothing yet rolls up a whole property or includes an evidence/decision trail. v1.2 Package 7. |
| FR8 | The system shall notify users about upcoming recurring tasks, overdue requests, and vendor updates. | ⬜ | No notification service exists. v1.2 Packages 8 & 9. |

## 7. Nonfunctional Requirements (NFR)

| ID | Category | Requirement | Status | Notes |
|---|---|---|---|---|
| NFR1 | Performance | Pages used during photo capture and request creation should load in under 2 seconds on normal broadband. | 🟡 | Not measured; likely fine today (small static pages) but the Tailwind Play CDN (unminified, unpurged, compiled client-side) is a real risk as pages grow — see the Vite-migration trigger in the roadmap. |
| NFR2 | Usability | The app should remain usable on mobile browsers at common phone widths. | 🟡 | Tailwind's responsive utilities are in use across the now-rebuilt v1.1 flows (intake, dashboard, vendor/collaborator views), but no phone-width verification pass has been done yet. v1.2 Package 11. |
| NFR3 | Security | User data must be encrypted in transit and protected at rest by the hosting/storage provider. | ✅ | Firebase enforces TLS in transit and encrypts Firestore/Storage at rest by default — inherited for free from the platform choice. |
| NFR4 | Portability | Exports should remain available in common formats such as PDF, CSV, and JSON. | 🟡 | JSON export exists (`backup.html`); PDF export exists but is minimal; CSV export doesn't exist. v1.2 Package 7. |
| NFR5 | Reliability | The product should support account recovery and data backup procedures. | 🟡 | Firebase Auth's built-in password reset covers account recovery; `backup.html`'s JSON export is a real backup path but isn't documented as a recovery *procedure* (when/how to restore). Roadmap v1.3+ for a documented restore runbook. |
| NFR6 | Observability | Notification delivery should be observable so failed reminders can be detected. | ⬜ | No notifications exist yet to observe. Ships alongside EXT1/FR8 in v1.2 Package 9 — a delivery log from day one, not bolted on later. |

## 8. Quality Attributes (QA)

| ID | Attribute | Requirement | Status | Notes |
|---|---|---|---|---|
| QA1 | Usability | Non-technical homeowners should understand what to do next without training. | 🟡 | v1.1's copy/domain rename (owner/vendor/collaborator, "request" not "project") moved off PM/technician operational language, but there's still no onboarding guidance or next-step prompting. Full pass v1.2 Package 12. |
| QA2 | Trust | Private property data, photos, and access instructions must feel protected and controllable. | 🟡 | v1.1: server-side security rules now genuinely scope vendor/collaborator access per-request (not just per-role), and the dashboard's assignment dropdowns make that control visible — but there's still no dedicated privacy/sharing screen. v1.2 Package 10. |
| QA3 | Transparency | Estimates, approvals, proof, and final costs should be easy to audit later. | ⬜ | No decision log exists. v1.2 Package 5. |
| QA4 | Recoverability | Users must be able to export records and recover from accidental archive/delete actions. | 🟡 | Export exists (partially, see NFR4); recovery from accidental delete does not — `deleteRequest()`/`deleteProperty()` are immediate hard cascade deletes today (with a `confirm()` prompt as the only safety net). Worth a soft-delete/undo pass in v1.2 Package 5 or v1.3. |
| QA5 | Accessibility | Core request and review flows should work with keyboard navigation and readable contrast. | ⬜ | Not audited. v1.3+. |
| QA6 | Portability | Maintenance history should be useful outside the app. | 🟡 | Same gap as NFR4/CON6 — JSON export isn't "useful outside the app" for a homeowner; PDF/CSV closes this. v1.2 Package 7. |

## 9. System Requirements (SYS)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| SYS1 | Responsive web or PWA frontend optimized for mobile capture and desktop review. | 🟡 | Responsive web exists; no PWA manifest/service worker/installability. v1.3+. |
| SYS2 | Authentication with account owner, collaborator, and invited vendor access modes. | ✅ | v1.1: the role model is now `owner`/`vendor`/`collaborator` directly (pm/admin collapsed into `owner`), with `roleHome()` routing each to their own page and `requireRole()` guards enforcing it. |
| SYS3 | Database model for users, properties, requests, quotes, vendors, files, reminders, and audit events. | 🟡 | v1.1 added `properties` and reshaped `requests` (replacing `projects`). Still missing: `quotes` as distinct multi-record entities (today it's 3 flat cost fields per request), `reminders`, and `audit events`. v1.2 Packages 4/5/8. |
| SYS4 | Object storage for photos, PDFs, receipts, and warranty documents. | 🟡 | v1.1 simplified the Storage path and added an `other` photo type, but it's still request-scoped, not a property-level document vault. v1.2 Package 6. |
| SYS5 | Notification service for email and optional SMS/push. | ⬜ | Not started. v1.2 Package 9 (email), v1.3+ (SMS/push). |
| SYS6 | Export service for PDF packets and structured data backups. | 🟡 | v1.1: JSON backup now exports properties + requests together with reference remapping on restore; PDF export is still a separate, minimal code path — not a unified export service. v1.2 Package 7. |
| SYS7 | Role and sharing rules that restrict collaborators and vendors to scoped data. | ✅ | v1.1: `firestore.rules`/`storage.rules` now scope both `vendor` (via `assignedVendorUid`) and `collaborator` (via `collaboratorUid`) reads to exactly their assigned/shared request — closing the pre-pivot gap where a `tech` could read any project. Multi-person household sharing and an advisor role are still v1.2 Package 10 / v2.0. |

## 10. User Requirements (UR)

| ID | Story | Status | Notes |
|---|---|---|---|
| UR1 | As a homeowner, I want to document an issue quickly so I do not forget important details. | 🟡 | v1.1's guided-ish intake form (`new-request.html`) is a real single-issue capture flow now, but still lacks the "guided" checklist polish. FEAT1/FR2, v1.2 Package 1. |
| UR2 | As a homeowner, I want to know what proof or photos to collect before calling a vendor. | ⬜ | Blocked on FR3's still-missing next-step checklist half (category classification itself now exists). v1.2 Package 1. |
| UR3 | As an owner client, I want to approve or decline quotes with context and cost visibility. | ⬜ | Blocked on FEAT3/FR5 (quote workspace) and FEAT6 (decision log). |
| UR4 | As a household collaborator, I want to add updates without seeing unrelated private records. | 🟡 | v1.1 closes the "without seeing unrelated private records" half for real (BRL5/SYS7). The "add updates" half doesn't exist yet — `collaborator.html` is read-only. v1.2 Package 10. |
| UR5 | As an invited vendor, I want the scope, photos, access notes, and contact rules in one place. | 🟡 | v1.1: `vendor.html` now shows exactly this — title/category/location/access instructions/contact method plus photo upload, scoped to only their assigned request. Still "assigned," not genuinely "invited" (no email onboarding flow). v1.2 Package 3. |
| UR6 | As a homeowner, I want a complete maintenance history I can export when selling, refinancing, insuring, or planning repairs. | 🟡 | v1.1's structured JSON export (properties + requests) is more complete than the old flat project dump, but still not in a form a buyer or insurer would find usable. Blocked on FEAT7/FR7 (proof packet export), v1.2 Package 7. |

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
