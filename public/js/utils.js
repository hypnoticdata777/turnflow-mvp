// ===================================================
// TurnFlow Home — Shared Utilities
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
 * Date helpers. Kept dependency-free (no DOM, no Firebase) so they're
 * unit-testable in Node. Generic on purpose — reused by the v1.2
 * recurring-maintenance/reminders work (see docs/ROADMAP.md Package 8),
 * not just request fields.
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
 * fallback if unassigned/not found. Shared by the vendor-assignment and
 * collaborator-sharing dropdowns on the owner dashboard.
 */
function resolveAssignedLabel(uid, users = []) {
  if (!uid) return 'Unassigned';
  const match = users.find(u => u.uid === uid);
  return match ? formatUserLabel(match) : `Unknown (${uid})`;
}

/** Display label for a request's assignedVendorUid within a list of vendor users. */
export function assignedVendorLabel(reqData, vendorUsers = []) {
  return resolveAssignedLabel(reqData?.assignedVendorUid, vendorUsers);
}

/** Display label for a request's collaboratorUid within a list of collaborator users. */
export function assignedCollaboratorLabel(reqData, collaboratorUsers = []) {
  return resolveAssignedLabel(reqData?.collaboratorUid, collaboratorUsers);
}

/**
 * A request's lifecycle (FR6 in docs/REQUIREMENTS.md), in order. Not
 * enforced as a strict state machine — an owner can set any request to
 * any status (e.g. to correct a mistake) — but this is the intended
 * forward path and the canonical list of valid values. Replaces the
 * pre-pivot 4-state PROJECT_STATUSES.
 */
export const REQUEST_STATUSES = [
  'Draft',
  'Needs Quote',
  'Waiting',
  'Scheduled',
  'In Progress',
  'Needs Review',
  'Complete',
  'Archived'
];

/** Tailwind classes for a request-status badge. Shared by the owner dashboard, request detail view, and collaborator portal. */
export function requestStatusBadgeClasses(status) {
  switch (status) {
    case 'Needs Quote': return 'bg-yellow-100 text-yellow-800';
    case 'Waiting': return 'bg-orange-100 text-orange-800';
    case 'Scheduled': return 'bg-blue-100 text-blue-800';
    case 'In Progress': return 'bg-indigo-100 text-indigo-800';
    case 'Needs Review': return 'bg-purple-100 text-purple-800';
    case 'Complete': return 'bg-green-100 text-green-800';
    case 'Archived': return 'bg-gray-200 text-gray-700';
    default: return 'bg-gray-100 text-gray-800'; // Draft / anything else
  }
}

/** Categories and urgency levels for the guided intake form (FEAT1/FR2). */
export const REQUEST_CATEGORIES = [
  'Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Roof',
  'Structural', 'Pest Control', 'Landscaping', 'Safety', 'Other'
];

export const REQUEST_URGENCIES = ['Low', 'Medium', 'High', 'Emergency'];

export const CONTACT_METHODS = ['Email', 'Phone', 'Text'];

/**
 * Resolves the single "current cost" of a request from its three cost
 * fields, and labels which one it came from — the direct implementation
 * of BRL2/BRL3 in docs/REQUIREMENTS.md ("costs remain estimates until a
 * vendor quote, invoice, or homeowner-entered final cost is attached").
 * finalCost wins over quotedCost wins over estimatedCost.
 */
export function costForRequest(reqData) {
  const value = firstDefinedCost(reqData);
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

/** 'Final' | 'Quoted' | 'Estimated' | 'No cost recorded' — pairs with costForRequest(). */
export function costLabelForRequest(reqData) {
  if (isSetCost(reqData?.finalCost)) return 'Final';
  if (isSetCost(reqData?.quotedCost)) return 'Quoted';
  if (isSetCost(reqData?.estimatedCost)) return 'Estimated';
  return 'No cost recorded';
}

function isSetCost(v) {
  return v !== undefined && v !== null && v !== '';
}

function firstDefinedCost(reqData) {
  if (isSetCost(reqData?.finalCost)) return reqData.finalCost;
  if (isSetCost(reqData?.quotedCost)) return reqData.quotedCost;
  if (isSetCost(reqData?.estimatedCost)) return reqData.estimatedCost;
  return 0;
}

/**
 * Client-side login lockout (legacy NFR3, partial — see docs/ARCHITECTURE.md).
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
