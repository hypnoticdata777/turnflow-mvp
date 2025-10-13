// public/js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

// Export the services you need in other files
export const auth = getAuth(app);
export const db = getFirestore(app);