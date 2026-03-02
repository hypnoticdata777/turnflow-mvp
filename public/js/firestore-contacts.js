// ===================================================
// TurnFlow™ Firestore Contacts Management
// ===================================================

import { db } from './firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const contactsCol = collection(db, 'contacts');

/**
 * Get all contacts ordered by creation date (newest first)
 * @returns {Promise<Array>} Array of contacts with Firestore IDs
 */
export async function getContacts() {
  const q = query(contactsCol, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Create a new contact
 * @param {{ name: string, email: string, phone: string, property: string }} data
 * @returns {Promise<string>} New contact document ID
 */
export async function createContact(data) {
  const docRef = await addDoc(contactsCol, {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Delete a contact by Firestore document ID
 * @param {string} contactId
 * @returns {Promise<void>}
 */
export async function deleteContact(contactId) {
  await deleteDoc(doc(db, 'contacts', contactId));
}
