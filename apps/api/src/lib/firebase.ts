import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize only once (safe for hot-reload in dev)
if (!getApps().length) {
  const credentialPath = process.env["GOOGLE_APPLICATION_CREDENTIALS"]
  // projectId is required by AppOptions — fall back to a placeholder to surface
  // a clear runtime error rather than a TS error at startup.
  const projectId = process.env["FIREBASE_PROJECT_ID"]

  if (credentialPath) {
    initializeApp({ credential: cert(credentialPath), projectId })
  } else {
    const { applicationDefault } = await import("firebase-admin/app")
    initializeApp({ credential: applicationDefault(), projectId })
  }
}

export const auth = getAuth()
export const db = getFirestore()
