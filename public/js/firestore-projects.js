// ===================================================
// TurnFlow™ Firestore Project Management
// ===================================================

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getStorage,
  ref,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Collection reference
const projectsCollection = collection(db, 'projects');
const storage = getStorage(app);

// ===================================================
// CRUD Operations for Projects
// ===================================================

/**
 * Create a new project in Firestore
 * @param {Object} projectData - The project data
 * @returns {Promise<string>} The new project ID
 */
export async function createProject(projectData) {
  try {
    const docRef = await addDoc(projectsCollection, {
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}

/**
 * Get all projects from Firestore
 * @returns {Promise<Array>} Array of projects with IDs
 */
export async function getAllProjects() {
  try {
    const querySnapshot = await getDocs(projectsCollection);
    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return projects;
  } catch (error) {
    console.error("Error getting projects:", error);
    throw error;
  }
}

/**
 * Get a single project by ID
 * @param {string} projectId - The project ID
 * @returns {Promise<Object>} The project data
 */
export async function getProject(projectId) {
  try {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error("Project not found");
    }
  } catch (error) {
    console.error("Error getting project:", error);
    throw error;
  }
}

/**
 * Update a project
 * @param {string} projectId - The project ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<void>}
 */
export async function updateProject(projectId, updates) {
  try {
    const docRef = doc(db, 'projects', projectId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
}

/**
 * Deletes every photo (Firestore doc + Storage object) under
 * projects/{projectId}/tasks/{taskIndex}/photos, for every task index on
 * the project. Task photos are keyed by array index (see
 * docs/ARCHITECTURE.md's task-identity note), not a separate task doc ID,
 * so there's no single subcollection to query — each index is checked.
 * A missing/already-deleted Storage object is logged and skipped rather
 * than aborting the whole cascade.
 */
async function deletePhotosForProject(projectId, taskCount) {
  const taskIndexes = Array.from({ length: taskCount }, (_, i) => i);

  await Promise.all(taskIndexes.map(async (taskIndex) => {
    const photosCol = collection(db, `projects/${projectId}/tasks/${taskIndex}/photos`);
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
  }));
}

/**
 * Delete a project, cascading to delete its task photos (Firestore docs
 * and Storage objects) so deleting a project doesn't leave orphaned data
 * behind indefinitely.
 * @param {string} projectId - The project ID
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId) {
  try {
    const project = await getProject(projectId);
    await deletePhotosForProject(projectId, (project.tasks || []).length);

    const docRef = doc(db, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

/**
 * Get projects by status
 * @param {string} status - The status to filter by
 * @returns {Promise<Array>} Array of projects
 */
export async function getProjectsByStatus(status) {
  try {
    const q = query(projectsCollection, where('status', '==', status));
    const querySnapshot = await getDocs(q);
    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return projects;
  } catch (error) {
    console.error("Error getting projects by status:", error);
    throw error;
  }
}

/**
 * Get projects shared with a given client (matches the clientId field set
 * by a PM/Admin from the dashboard's client-assignment dropdown).
 * @param {string} clientId - The client's Firebase Auth uid
 * @returns {Promise<Array>} Array of projects
 */
export async function getProjectsForClient(clientId) {
  try {
    const q = query(projectsCollection, where('clientId', '==', clientId));
    const querySnapshot = await getDocs(q);
    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return projects;
  } catch (error) {
    console.error("Error getting projects for client:", error);
    throw error;
  }
}

/**
 * Mark a task as complete within a project
 * @param {string} projectId - The project ID
 * @param {number} taskIndex - The index of the task to mark complete
 * @returns {Promise<void>}
 */
export async function markTaskComplete(projectId, taskIndex) {
  try {
    const project = await getProject(projectId);
    if (project.tasks && project.tasks[taskIndex]) {
      project.tasks[taskIndex].completed = true;
      await updateProject(projectId, { tasks: project.tasks });
    }
  } catch (error) {
    console.error("Error marking task complete:", error);
    throw error;
  }
}
