// /js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { firebaseAppConfig } from "./firebase-config.js";

/* ===== Firebase core ===== */
export const app  = initializeApp(firebaseAppConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

/* ===== Roles ===== */
export const ROLES = { admin: "admin", tech: "tech", pm: "pm", client: "client" };

/* ===== Path helpers (robust for root or subfolder hosting) ===== */
const BASE = document.querySelector("base")?.getAttribute("href")
  ?? location.pathname.replace(/[^/]+$/, "");   // current folder path, e.g. /turnflow-mvp/

function go(page) { location.replace(BASE + page); }

/* ===== Role lookup (Firestore: users/{uid}.role) ===== */
export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const role = snap.data()?.role;
  return typeof role === "string" ? role : null; // be strict; avoid silent fallbacks
}

/* ===== Auth state watcher =====
   - Redirects logged-out users away from protected pages
   - Optionally (redirectByRole=true) sends logged-in users to their role home
*/
export function watchAuth(redirectByRole = false) {
  onAuthStateChanged(auth, async (user) => {
    // Build absolute paths for protected pages using the document base
    const protectedPaths = new Set([
      new URL("technician.html", document.baseURI).pathname,
      new URL("dashboard.html",  document.baseURI).pathname
    ]);
    const here = location.pathname;

    if (!user) {
      if (protectedPaths.has(here)) go("index.html");
      return;
    }

    if (redirectByRole) {
      const role = await getUserRole(user.uid);
      location.replace(roleHome(role));
    }
  });
}

/* ===== Session helpers ===== */
export function currentUser() { return auth.currentUser; }

/* Map a role to a landing page (returns absolute path using BASE) */
export function roleHome(role) {
  switch (role) {
    case ROLES.tech:   return BASE + "technician.html";
    case ROLES.pm:     return BASE + "dashboard.html";   // update when pm.html exists
    case ROLES.client: return BASE + "dashboard.html";   // update when client.html exists
    case ROLES.admin:  return BASE + "dashboard.html";   // update when admin.html exists
    default:           return BASE + "index.html";
  }
}

/* Require a role on a page; bounce if missing/wrong */
export async function requireRole(expectedRole) {
  const user = auth.currentUser;
  if (!user) { go("index.html"); return; }

  const role = await getUserRole(user.uid);
  if (!role) { go("index.html"); return; }

  if (expectedRole && role !== expectedRole) {
    location.replace(roleHome(role));
  }
}

/* Sign in / out wrappers */
export async function signIn(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
  go("index.html");
}
