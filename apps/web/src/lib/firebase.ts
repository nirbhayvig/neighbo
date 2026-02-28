import { Capacitor } from "@capacitor/core"
import { initializeApp } from "firebase/app"
import { getAuth, indexedDBLocalPersistence, initializeAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Values come from .env; missing values will produce a clear Firebase runtime error.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseApp = initializeApp(firebaseConfig)

// On native Capacitor (iOS/Android), browserLocalPersistence can be cleared by
// the OS. indexedDBLocalPersistence survives app restarts reliably.
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(firebaseApp, { persistence: indexedDBLocalPersistence })
  : getAuth(firebaseApp)

export const db = getFirestore(firebaseApp)
