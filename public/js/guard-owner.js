// Shared owner-only page guard. Used by every page that should only be
// reachable by the account owner: dashboard, properties, new-request,
// request detail, backup, contacts, stats. Extracted so it's one file
// instead of copy-pasted inline <script> blocks (and so CSP's script-src
// can drop 'unsafe-inline' — see docs/ARCHITECTURE.md). Replaces the
// pre-pivot guard-pm-admin.js now that pm/admin have collapsed into the
// single `owner` role.
import { requireRole } from './auth.js';
await requireRole('owner');
