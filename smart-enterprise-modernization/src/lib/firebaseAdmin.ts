// src/lib/firebaseAdmin.ts
import * as admin from "firebase-admin";
import path from "path";

let app: admin.app.App | undefined;

if (!admin.apps.length) {
  try {
    // Use local file path or GOOGLE_APPLICATION_CREDENTIALS env
    const keyPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS &&
      path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (!keyPath) {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS not set in .env.local or file missing."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(keyPath),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    app = admin.app();
    console.log("✅ Firebase Admin initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin:", err);
  }
}

export const adminDb = admin.firestore(app);
