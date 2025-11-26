// ===================================================
// TurnFlow™ Firestore Project Management
// ===================================================

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Collection reference
const projectsCollection = collection(db, 'projects');

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
 * Delete a project
 * @param {string} projectId - The project ID
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId) {
  try {
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
