// ===================================================
// TurnFlow Home — Firestore Maintenance Request Management
// ===================================================
// Replaces the pre-pivot firestore-projects.js. A "request" is a single
// maintenance issue (category, urgency, location, notes, cost fields) tied
// to one property — see docs/ARCHITECTURE.md's target domain model.

import { app, db } from './firebase-config.js';
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
  limit,
  startAfter,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getStorage,
  ref,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const requestsCollection = collection(db, 'requests');
const storage = getStorage(app);

// ===================================================
// CRUD
// ===================================================

/**
 * Create a new maintenance request.
 * @param {Object} requestData - Must include ownerUid, propertyId.
 * @returns {Promise<string>} The new request ID
 */
export async function createRequest(requestData) {
  try {
    const docRef = await addDoc(requestsCollection, {
      ...requestData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating request:", error);
    throw error;
  }
}

export const DEFAULT_REQUESTS_PAGE_SIZE = 20;

/**
 * One page of an owner's requests, newest first, for cursor-based
 * pagination (see legacy NFR5 in docs/REQUIREMENTS.md).
 * @param {Object} options
 * @param {string} options.ownerUid
 * @param {number} [options.pageSize]
 * @param {*} [options.cursor] - previous page's lastDoc (QueryDocumentSnapshot, not just an id)
 * @returns {Promise<{requests: Array, lastDoc: *, hasMore: boolean}>}
 */
export async function getRequestsPage({ ownerUid, pageSize = DEFAULT_REQUESTS_PAGE_SIZE, cursor = null }) {
  try {
    const constraints = [
      where('ownerUid', '==', ownerUid),
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1)
    ];
    if (cursor) constraints.push(startAfter(cursor));

    const q = query(requestsCollection, ...constraints);
    const querySnapshot = await getDocs(q);

    const docs = querySnapshot.docs.slice(0, pageSize);
    const requests = docs.map((d) => ({ id: d.id, ...d.data() }));
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    const hasMore = querySnapshot.docs.length > pageSize;

    return { requests, lastDoc, hasMore };
  } catch (error) {
    console.error("Error getting requests page:", error);
    throw error;
  }
}

/**
 * All of an owner's requests, unpaginated. For backup export and the
 * stats page only — not for routine list rendering (use getRequestsPage).
 * @param {string} ownerUid
 * @returns {Promise<Array>}
 */
export async function getAllRequestsForOwner(ownerUid) {
  try {
    const q = query(requestsCollection, where('ownerUid', '==', ownerUid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting all requests for owner:", error);
    throw error;
  }
}

/**
 * Requests assigned to a given vendor.
 * @param {string} vendorUid
 * @returns {Promise<Array>}
 */
export async function getRequestsForVendor(vendorUid) {
  try {
    const q = query(requestsCollection, where('assignedVendorUid', '==', vendorUid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting requests for vendor:", error);
    throw error;
  }
}

/**
 * Requests shared with a given household collaborator.
 * @param {string} collaboratorUid
 * @returns {Promise<Array>}
 */
export async function getRequestsForCollaborator(collaboratorUid) {
  try {
    const q = query(requestsCollection, where('collaboratorUid', '==', collaboratorUid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting requests for collaborator:", error);
    throw error;
  }
}

/**
 * Requests belonging to a given property.
 * @param {string} propertyId
 * @returns {Promise<Array>}
 */
export async function getRequestsForProperty(propertyId) {
  try {
    const q = query(requestsCollection, where('propertyId', '==', propertyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting requests for property:", error);
    throw error;
  }
}

/**
 * Get a single request by ID.
 * @param {string} requestId
 * @returns {Promise<Object>}
 */
export async function getRequest(requestId) {
  try {
    const docRef = doc(db, 'requests', requestId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    throw new Error("Request not found");
  } catch (error) {
    console.error("Error getting request:", error);
    throw error;
  }
}

/**
 * Update a request.
 * @param {string} requestId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateRequest(requestId, updates) {
  try {
    const docRef = doc(db, 'requests', requestId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating request:", error);
    throw error;
  }
}

/**
 * Deletes every photo (Firestore doc + Storage object) under
 * requests/{requestId}/photos. Unlike the pre-pivot task-index-keyed
 * photos subcollection, photos here use real Firestore document IDs, so
 * this is a straightforward full-subcollection query — no "index beyond
 * the current array length" gap (see docs/ARCHITECTURE.md's target
 * domain model note on why this resolves the legacy FR13/NFR8 quirk).
 * A missing/already-deleted Storage object is logged and skipped rather
 * than aborting the whole cascade.
 */
async function deletePhotosForRequest(requestId) {
  const photosCol = collection(db, `requests/${requestId}/photos`);
  const snap = await getDocs(photosCol);

  await Promise.all(snap.docs.map(async (photoDoc) => {
    const { storagePath } = photoDoc.data();
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (error) {
        console.warn(`Could not delete storage object ${storagePath}:`, error);
      }
    }
    await deleteDoc(photoDoc.ref);
  }));
}

/**
 * Delete a request, cascading to delete its photos (Firestore docs and
 * Storage objects) so deleting a request doesn't leave orphaned data
 * behind indefinitely.
 * @param {string} requestId
 * @returns {Promise<void>}
 */
export async function deleteRequest(requestId) {
  try {
    await deletePhotosForRequest(requestId);
    await deleteDoc(doc(db, 'requests', requestId));
  } catch (error) {
    console.error("Error deleting request:", error);
    throw error;
  }
}
