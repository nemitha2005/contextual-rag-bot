import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./config";

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function signOutUser(): Promise<void> {
  return signOut(auth);
}
