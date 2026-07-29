// ===================================================
// TurnFlow Home — Firestore Property Management
// ===================================================
// A property is the parent record a request always belongs to (FR1/BRL1
// in docs/REQUIREMENTS.md). New in v1.1 — the pre-pivot model only had an
// `address` field directly on a project, with no distinct Property entity.

import { db } from './firebase-config.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getRequestsForProperty, deleteRequest } from './firestore-requests.js';

const propertiesCollection = collection(db, 'properties');

/**
 * Create a new property.
 * @param {{ownerUid: string, address: string, nickname?: string, unit?: string}} data
 * @returns {Promise<string>} The new property ID
 */
export async function createProperty(data) {
  try {
    const docRef = await addDoc(propertiesCollection, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating property:", error);
    throw error;
  }
}

/**
 * All properties belonging to a given owner, newest first.
 * @param {string} ownerUid
 * @returns {Promise<Array>}
 */
export async function getPropertiesForOwner(ownerUid) {
  try {
    const q = query(propertiesCollection, where('ownerUid', '==', ownerUid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting properties for owner:", error);
    throw error;
  }
}

/**
 * Get a single property by ID.
 * @param {string} propertyId
 * @returns {Promise<Object>}
 */
export async function getProperty(propertyId) {
  try {
    const docRef = doc(db, 'properties', propertyId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    throw new Error("Property not found");
  } catch (error) {
    console.error("Error getting property:", error);
    throw error;
  }
}

/**
 * Update a property.
 * @param {string} propertyId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateProperty(propertyId, updates) {
  try {
    const docRef = doc(db, 'properties', propertyId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating property:", error);
    throw error;
  }
}

/**
 * Delete a property, cascading to delete every request that belongs to
 * it (and each request's own photo cascade — see deleteRequest() in
 * firestore-requests.js). Prevents orphaned requests referencing a
 * deleted propertyId.
 * @param {string} propertyId
 * @returns {Promise<void>}
 */
export async function deleteProperty(propertyId) {
  try {
    const requests = await getRequestsForProperty(propertyId);
    await Promise.all(requests.map((r) => deleteRequest(r.id)));
    await deleteDoc(doc(db, 'properties', propertyId));
  } catch (error) {
    console.error("Error deleting property:", error);
    throw error;
  }
}
