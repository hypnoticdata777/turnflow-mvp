// public/js/auth.js

import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { auth, db } from './firebase-config.js'; // Import our centralized auth and db

// --- Constants and Helpers ---
const ROLES = { tech: "tech", pm: "pm", client: "client", admin: "admin" };
const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

function go(page) {
    const newUrl = new URL(page, window.location.origin).href;
    if (window.location.href !== newUrl) {
        window.location.href = page;
    }
}

// --- Exported Helper Functions ---
export function currentUser() {
    return auth.currentUser;
}

export async function getUserRole(uid) {
    if (!uid) return null;
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data()?.role : null;
}

export function roleHome(role) {
    switch (role) {
        case ROLES.tech: return "technician.html";
        default: return "dashboard.html"; // Default for pm, client, admin
    }
}

// ✅ NEW: Auth guard function to protect pages
export async function requireRole(requiredRole) {
    const user = currentUser();
    if (!user) {
        go('index.html');
        return; // Stop execution
    }
    const userRole = await getUserRole(user.uid);
    if (userRole !== requiredRole) {
        go(roleHome(userRole) || 'index.html');
    }
}


// --- Core Auth Logic ---
async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    if (!user) throw new Error("Login failed unexpectedly.");

    const role = await getUserRole(user.uid);
    if (!role) {
        await signOut(auth);
        throw new Error("User role not found.");
    }
    go(roleHome(role));
}

export async function logout() {
    await signOut(auth);
    go('index.html');
}

// This function runs on every page to protect routes
function watchAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is logged in
            if (isLoginPage) {
                // ...and on the login page, so redirect them to their home.
                const role = await getUserRole(user.uid);
                if (role) go(roleHome(role));
            }
        } else {
            // User is NOT logged in
            if (!isLoginPage) {
                // ...and they are on a protected page, so kick them out to the login page.
                go('index.html');
            }
        }
    });
}


// --- Page-Specific Event Listeners ---

// If we are on the login page, attach the form submit listener.
if (isLoginPage) {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        const email = e.target.email.value;
        const password = e.target.password.value;

        try {
            await login(email, password);
        } catch (error) {
            console.error("Login failed:", error);
            errorMessage.textContent = 'Invalid email or password.';
        }
    });
}

// Start the auth state watcher on all pages
watchAuthState();