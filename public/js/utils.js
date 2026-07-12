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
