/**
 * firebase.ts
 * Firebase app initialization — Auth + Firestore + Analytics
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCtPJiAVj5ex4JbwzZsnxetzuLsPjY1PF4",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fitlab-21da6.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fitlab-21da6",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fitlab-21da6.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "38439530806",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:38439530806:web:8f69c2ba7473d1925c4397",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-SYSC5ESWKN",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

/** Convenience wrapper — call this anywhere to track a custom event */
export function trackEvent(name: string, params?: Record<string, unknown>) {
    try {
        logEvent(analytics, name, params);
    } catch {
        // silently ignore if analytics not supported (e.g. during SSR / test)
    }
}

export default app;
