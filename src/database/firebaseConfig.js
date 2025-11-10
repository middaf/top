// ...existing code...
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC8vKTKmR4upbwGyykH9N5sDeS08ZtZ7PE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mint9517-67eca.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mint9517-67eca",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mint9517-67eca.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1018345673525",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1018345673525:web:96ff96a7943bf0b808327c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-EX8BM1LMES"
};

// Initialize Firebase only if it hasn't been initialized yet
let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Re-throw the error to be handled by the caller
  throw error;
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
// ...existing code...