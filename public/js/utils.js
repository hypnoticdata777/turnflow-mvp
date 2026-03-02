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
