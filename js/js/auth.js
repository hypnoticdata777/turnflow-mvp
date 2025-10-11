// /js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { firebaseAppConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseAppConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// read role from Firestore: users/{uid}.role
export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data().role || "tech") : null;
}

// Protect pages, and optionally redirect by role after login
export function watchAuth(redirectByRole = false) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      const protectedRoutes = ["/technician.html", "/dashboard.html"];
      if (protectedRoutes.some(p => location.pathname.endsWith(p))) {
        location.replace("./index.html"); // or ./login.html if you prefer
      }
      return;
    }
    if (redirectByRole) {
      const role = await getUserRole(user.uid);
      if (role === "tech") location.replace("./technician.html");
      else location.replace("./dashboard.html");
    }
  });
}

export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logout() {
  await signOut(auth);
  location.replace("./index.html"); // or ./login.html
}
