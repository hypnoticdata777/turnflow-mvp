// Shared PM/Admin page guard. Used by every page that should only be
// reachable by a pm or admin: dashboard, new-project, backup, contacts,
// pending-send, stats, estimate. Extracted so it's one file instead of
// six copy-pasted inline <script> blocks (and so CSP's script-src can
// drop 'unsafe-inline' — see docs/ARCHITECTURE.md).
import { requireAnyRole } from './auth.js';
await requireAnyRole(['pm', 'admin']);
