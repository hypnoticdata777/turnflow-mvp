// /js/firebase-config.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

const firebaseAppConfig = {
  apiKey: "AIzaSyBiruaGA7s7ggSKZpdglU-5zDnpcofpQoM",
  authDomain: "turnflow-app.firebaseapp.com",
  projectId: "turnflow-app",
  storageBucket: "turnflow-app.firebasestorage.app",
  messagingSenderId: "183972548936",
  appId: "1:183972548936:web:23257f5d6273a7c1bbe37d"
};

// ✅ Prevent duplicate initialization
export const app = !getApps().length ? initializeApp(firebaseAppConfig) : getApp();
