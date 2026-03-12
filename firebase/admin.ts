import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips surrounding quotes that some env managers inject,
 * then trims whitespace.
 */
const cleanValue = (value?: string): string | undefined => {
  if (!value) return undefined;
  return value.replace(/^["']|["']$/g, "").trim();
};

/**
 * Safely parses the Firebase private key from the environment.
 *
 * Handles all three common formats coming from .env.local / hosting providers:
 *  1. Literal \n in the string  →  replace \\n with real newline
 *  2. Surrounding single or double quotes added by some env parsers → strip
 *  3. Correctly formatted multiline key (Vercel / Railway injects real \n) → keep as-is
 *
 * Throws clearly if the key is missing so the server fails fast with a
 * descriptive message instead of a cryptic PEM parse error.
 */
const getPrivateKey = (): string => {
  const raw = process.env.FIREBASE_PRIVATE_KEY;

  if (!raw) {
    throw new Error(
      "[Firebase Admin] FIREBASE_PRIVATE_KEY is not set. " +
        "Add it to .env.local (development) or your hosting environment variables.",
    );
  }

  return (
    raw
      // 1. Strip optional surrounding quotes
      .replace(/^["']|["']$/g, "")
      // 2. Replace literal \n sequences with real newlines
      .replace(/\\n/g, "\n")
      .trim()
  );
};

// ─── Validation ───────────────────────────────────────────────────────────────

const validateAdminConfig = () => {
  const missing: string[] = [];

  if (!process.env.FIREBASE_PROJECT_ID) missing.push("FIREBASE_PROJECT_ID");
  if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!process.env.FIREBASE_PRIVATE_KEY) missing.push("FIREBASE_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `[Firebase Admin] Missing required environment variables: ${missing.join(", ")}`,
    );
  }
};

// ─── Initialization ───────────────────────────────────────────────────────────

const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  validateAdminConfig();

  const privateKey = getPrivateKey();

  // Sanity-check the key format before passing to Firebase
  // to give a clear error rather than a cryptic PEM message.
  if (
    !privateKey.startsWith("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "[Firebase Admin] FIREBASE_PRIVATE_KEY does not appear to be a valid PEM key. " +
        "Ensure it starts with '-----BEGIN PRIVATE KEY-----' and ends with '-----END PRIVATE KEY-----'. " +
        "Copy it fresh from the Firebase Console → Project Settings → Service Accounts.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: cleanValue(process.env.FIREBASE_PROJECT_ID)!,
      clientEmail: cleanValue(process.env.FIREBASE_CLIENT_EMAIL)!,
      privateKey,
    }),
  });
};

// Only log in development — never log key material in production
if (process.env.NODE_ENV !== "production") {
  const projectId = cleanValue(process.env.FIREBASE_PROJECT_ID);
  console.debug("[Firebase Admin] Initializing for project:", projectId);
}

const adminApp = initFirebaseAdmin();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export { adminApp as admin };
