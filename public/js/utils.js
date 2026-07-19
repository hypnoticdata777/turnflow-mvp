// ===================================================
// TurnFlow™ Shared Utilities
// ===================================================

/**
 * Escapes HTML special characters to prevent XSS when inserting
 * user-controlled values into innerHTML templates.
 * @param {*} str - Value to escape
 * @returns {string} HTML-safe string
 */
export function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Task status + cost helpers.
 * Kept dependency-free (no DOM, no Firebase) so they're unit-testable in Node.
 */

export function tf_isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

export function tf_parseDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  const d = new Date(value);
  return tf_isValidDate(d) ? d : undefined;
}

// Returns one of: 'completed' | 'overdue' | 'blocked' | 'inprogress' | 'open'
export function tf_getTaskStatus(task, now = new Date()) {
  if (task?.completed) return "completed";
  if (task?.blocked) return "blocked";
  const due = tf_parseDate(task?.dueDate);
  if (due && due < now) return "overdue";
  const start = tf_parseDate(task?.startTime);
  if (start && !task?.endTime) return "inprogress";
  return "open";
}

export function tf_statusLabel(key) {
  const labels = {
    completed: "Completed",
    overdue: "Overdue",
    blocked: "Blocked",
    inprogress: "In Progress",
    open: "Pending"
  };
  return labels[key] || "Pending";
}

/**
 * Sums (hours * rate) + material across a list of task-like objects.
 * Non-numeric fields are treated as 0, matching the live-estimate UI behavior.
 */
export function calculateEstimateTotal(tasks = []) {
  return tasks.reduce((total, t) => {
    const hours = parseFloat(t?.hours) || 0;
    const rate = parseFloat(t?.rate) || 0;
    const material = parseFloat(t?.material) || 0;
    return total + (hours * rate) + material;
  }, 0);
}

/**
 * Best-effort human-readable label for a users/{uid} doc.
 * Falls back through name -> email -> uid since neither field is guaranteed
 * (user docs are hand-created today; see docs/SETUP.md).
 */
export function formatUserLabel(user) {
  if (!user) return '';
  return user.name || user.email || user.uid || '';
}

/**
 * Resolves a uid against a list of user docs to a display label, or a
 * fallback if unassigned/not found. Shared by the tech-assignment and
 * client-assignment dropdowns on the PM dashboard.
 */
function resolveAssignedLabel(uid, users = []) {
  if (!uid) return 'Unassigned';
  const match = users.find(u => u.uid === uid);
  return match ? formatUserLabel(match) : `Unknown (${uid})`;
}

/** Display label for a project's assignedTechId within a list of tech users. */
export function assignedTechLabel(project, techUsers = []) {
  return resolveAssignedLabel(project?.assignedTechId, techUsers);
}

/** Display label for a project's clientId within a list of client users. */
export function assignedClientLabel(project, clientUsers = []) {
  return resolveAssignedLabel(project?.clientId, clientUsers);
}

/**
 * A project's lifecycle, in order. Not enforced as a strict state machine —
 * a PM can set any project to any status (e.g. to correct a mistake) — but
 * this is the intended forward path and the canonical list of valid values.
 */
export const PROJECT_STATUSES = ['Pending Approval', 'Approved', 'Sent', 'Completed'];

/** Tailwind classes for a project-status badge. Shared by dashboard.html (PM) and pending-approval.html (client). */
export function projectStatusBadgeClasses(status) {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-800';
    case 'Sent': return 'bg-blue-100 text-blue-800';
    case 'Completed': return 'bg-gray-200 text-gray-800';
    default: return 'bg-yellow-100 text-yellow-800'; // Pending Approval / anything else
  }
}

/**
 * Client-side login lockout (NFR3, partial — see docs/ARCHITECTURE.md).
 * Pure functions over an `attempts` map so they're unit-testable; auth.js
 * wires them to actual localStorage. This deters casual repeated retries
 * from the same browser — it does NOT stop a script hitting Firebase
 * Auth's REST API directly. That's what App Check (also added alongside
 * this) is for.
 *
 * attempts shape: { [emailKey]: { count: number, lockUntil: number } }
 */
export const LOGIN_LOCKOUT_THRESHOLD = 5;
export const LOGIN_LOCKOUT_MS = 30_000;

export function normalizeEmailKey(email) {
  return String(email || '').trim().toLowerCase();
}

/** Milliseconds remaining in the lockout for this email, or 0 if not locked out. */
export function getLockoutRemainingMs(attempts, email, now = Date.now()) {
  const entry = attempts?.[normalizeEmailKey(email)];
  if (!entry || entry.lockUntil <= now) return 0;
  return entry.lockUntil - now;
}

/** Returns a new attempts map with one more failure recorded for this email. */
export function recordFailedLogin(attempts, email, now = Date.now()) {
  const key = normalizeEmailKey(email);
  const prevCount = attempts?.[key]?.count || 0;
  const count = prevCount + 1;
  const lockUntil = count >= LOGIN_LOCKOUT_THRESHOLD
    ? now + LOGIN_LOCKOUT_MS
    : (attempts?.[key]?.lockUntil || 0);
  return { ...attempts, [key]: { count, lockUntil } };
}

/** Returns a new attempts map with this email's failure history cleared (call on successful login). */
export function clearLoginAttempts(attempts, email) {
  const key = normalizeEmailKey(email);
  if (!attempts || !(key in attempts)) return attempts || {};
  const copy = { ...attempts };
  delete copy[key];
  return copy;
}
