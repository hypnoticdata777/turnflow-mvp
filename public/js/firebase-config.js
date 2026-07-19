// public/js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-check.js";

// Your web app's Firebase configuration
const firebaseConfig = {

apiKey: "AIzaSyBiruaGA7s7ggSKZpdglU-5zDnpcofpQoM",

authDomain: "turnflow-app.firebaseapp.com",

projectId: "turnflow-app",

storageBucket: "turnflow-app.firebasestorage.app",

messagingSenderId: "183972548936",

appId: "1:183972548936:web:23257f5d6273a7c1bbe37d"

};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// --- App Check (NFR3) ---
// Attaches a reCAPTCHA v3 token to every Auth/Firestore/Storage request so
// Firebase can reject traffic that isn't coming from this real app —
// the actual defense against scripted abuse, unlike the client-side
// login lockout in auth.js which only slows down manual retries.
//
// Inert until a real site key replaces the placeholder below. To enable:
//   1. Firebase console -> App Check -> Apps -> register this web app,
//      choosing reCAPTCHA v3 as the provider. This gives you a site key.
//   2. Paste that site key in place of RECAPTCHA_V3_SITE_KEY below.
//   3. Firebase console -> App Check -> APIs -> enforce for Authentication,
//      Cloud Firestore, and Cloud Storage. Enforcement is OFF by default
//      even with a key configured, so this step is required too.
// See docs/SETUP.md for the full walkthrough, including local dev (a
// debug token is needed since localhost isn't a registered domain).
const RECAPTCHA_V3_SITE_KEY = 'REPLACE_WITH_RECAPTCHA_V3_SITE_KEY';

// Uncomment for local development only (e.g. `npx serve .` on localhost,
// which isn't a domain App Check recognizes). Logs a debug token to the
// browser console — register it under App Check > Manage debug tokens
// in the Firebase console. Never uncomment this in a deployed environment.
// self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

if (!RECAPTCHA_V3_SITE_KEY.startsWith('REPLACE_')) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
} else {
  console.warn('App Check is not configured (RECAPTCHA_V3_SITE_KEY is a placeholder) — see docs/SETUP.md.');
}

// Export the services you need in other files
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);