// ===================================================
// TurnFlow™ Firestore Users Lookup
// ===================================================
// Read-only helpers over the `users` collection. Only PM/Admin can call
// getUsersByRole in practice — enforced by firestore.rules, not here.

import { db } from './firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/**
 * Get all users with a given role (e.g. 'tech').
 * @param {string} role
 * @returns {Promise<Array<{uid: string, role: string, email?: string, name?: string}>>}
 */
export async function getUsersByRole(role) {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}
