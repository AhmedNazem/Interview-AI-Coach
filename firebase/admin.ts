import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const adminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const initFirebaseAdmin = () => {
  if (getApps().length <= 0) {
    return initializeApp({
      credential: cert(adminConfig),
    });
  }
  return getApp();
};

const admin = initFirebaseAdmin();

export const adminDb = getFirestore(admin);
export const adminAuth = getAuth(admin);
export { admin };
