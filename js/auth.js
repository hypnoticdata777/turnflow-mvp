// /js/auth.js

// Firebase module imports from the official CDN
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } 
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { app } from "./firebase-config.js"; // Import the initialized app

// Initialize Auth and Firestore services using the shared 'app' instance
export const auth = getAuth(app);
export const db = getFirestore(app);


/* ===== Roles ===== */
export const ROLES = {
  admin: "admin",
  tech: "tech",
  pm: "pm",
  client: "client",
};


/* ===== Path & Navigation Helpers ===== */
// Robustly determines the base path for navigation, works on root or in subfolders.
const BASE = document.querySelector("base")?.getAttribute("href") ?? location.pathname.replace(/[^/]+$/, "");

/**
 * Navigates to a new page, replacing the current entry in browser history.
 * @param {string} page The page to navigate to (e.g., "index.html").
 */
function go(page) {
  location.replace(BASE + page);
}

/**
 * Maps a user role to its designated homepage URL.
 * @param {string} role The user's role.
 * @returns {string} The absolute path to the role's homepage.
 */
export function roleHome(role) {
  switch (role) {
    case ROLES.tech:
      return BASE + "technician.html";
    case ROLES.pm:
    case ROLES.client:
    case ROLES.admin:
      return BASE + "dashboard.html"; // All others go to the main dashboard
    default:
      console.warn(`No homepage defined for role: "${role}". Defaulting to login page.`);
      return BASE + "index.html";
  }
}


/* ===== Core Auth Logic ===== */

/**
 * Retrieves a user's role from the 'users/{uid}' document in Firestore.
 * @param {string} uid The user's ID.
 * @returns {Promise<string|null>} The user's role string or null if not found or on error.
 */
async function getUserRole(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data()?.role ?? null;
    } else {
      console.error(`CRITICAL: No user document found for authenticated UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error getting user role from Firestore:", error);
    return null;
  }
}

/**
 * This is the main authentication listener for the entire application.
 * It should be called once on every single page.
 * It automatically handles all redirection logic for login, logout, and page protection.
 */
export function initializeAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    const here = location.pathname;
    const isLoginPage = here.endsWith('/') || here.endsWith('index.html');

    if (user) {
      // --- USER IS LOGGED IN ---
      // If the user is on the login page, they need to be redirected to their role's home.
      // This listener runs only *after* the auth state is confirmed, solving the race condition.
      if (isLoginPage) {
        const role = await getUserRole(user.uid);
        if (role) {
          go(roleHome(role));
        } else {
          // A user is authenticated but has no role. This is an invalid state.
          // For security, we sign them out immediately.
          console.error("User has no role in Firestore. Forcing logout.");
          await signOut(auth);
        }
      }
    } else {
      // --- USER IS LOGGED OUT ---
      // If they try to access a protected page while logged out, redirect to login.
      const protectedPaths = new Set([
        new URL("technician.html", document.baseURI).pathname,
        new URL("dashboard.html", document.baseURI).pathname,
      ]);
      if (protectedPaths.has(here)) {
        go("index.html");
      }
    }
  });
}


/* ===== Authentication Actions ===== */

/**
 * Attempts to sign a user in. Redirection is handled by the `initializeAuthListener`.
 * @param {string} email User's email.
 * @param {string} password User's password.
 * @returns {Promise} The promise from signInWithEmailAndPassword.
 */
export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Signs the current user out and redirects to the login page.
 */
export async function logout() {
  await signOut(auth);
  // We explicitly call go() for a faster redirect, though the listener would catch it too.
  go("index.html");
}

/**
 * Returns the currently signed-in user object, or null if there is none.
 * @returns {User|null}
 */
export function currentUser() {
  return auth.currentUser;
}
