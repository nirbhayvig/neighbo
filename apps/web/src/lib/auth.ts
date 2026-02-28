import { Capacitor } from "@capacitor/core"
import { FirebaseAuthentication } from "@capacitor-firebase/authentication"
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  type User,
} from "firebase/auth"
import { auth } from "./firebase"

/**
 * Sign in with Google.
 * - On native (iOS/Android): uses the Capacitor Firebase plugin which shows the
 *   native Google UI, then syncs the credential to the Firebase JS SDK layer.
 * - On web: uses the standard signInWithPopup flow.
 *
 * Note: signInWithPopup does NOT work inside native Capacitor webviews.
 */
export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // 1. Create credentials on the native layer
    const result = await FirebaseAuthentication.signInWithGoogle()
    // 2. Sign in on the web/JS SDK layer using the id token
    const credential = GoogleAuthProvider.credential(result.credential?.idToken)
    return signInWithCredential(auth, credential)
  }

  return signInWithPopup(auth, new GoogleAuthProvider())
}

/**
 * Sign out from both native and web layers.
 */
export async function signOut() {
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut()
  }
  return auth.signOut()
}

/**
 * Get the current user's ID token for authenticating against the Hono API.
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
