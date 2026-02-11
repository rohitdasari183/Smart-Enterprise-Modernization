import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

export async function emailSignIn(email: string, password: string) {
  try {
    // Try to sign in existing user
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  } catch (err: any) {
    // If user doesn't exist, register automatically
    if (err.code === "auth/user-not-found") {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      return res.user;
    } else if (err.code === "auth/wrong-password") {
      throw new Error("Incorrect password. Please try again.");
    } else {
      throw err;
    }
  }
}

export async function googleSignIn() {
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export function signOutUser() {
  return auth.signOut();
}
