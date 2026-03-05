import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./config";

async function upsertUserDoc(
  uid: string,
  data: { name: string; email: string; provider: string }
) {
  await setDoc(
    doc(db, "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  if (!credential.user.emailVerified) {
    await signOut(auth);
    const err = new Error("Email not verified") as Error & { code: string };
    err.code = "auth/email-not-verified";
    throw err;
  }
  return credential;
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await upsertUserDoc(credential.user.uid, { name, email, provider: "email" });
  await sendEmailVerification(credential.user);
  await signOut(auth);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  await upsertUserDoc(credential.user.uid, {
    name: credential.user.displayName ?? "",
    email: credential.user.email ?? "",
    provider: "google",
  });
  return credential;
}

export async function signOutUser(): Promise<void> {
  return signOut(auth);
}
