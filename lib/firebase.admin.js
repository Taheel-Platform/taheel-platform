import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";

const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  : null;

if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

const adminConfig = {
  credential: serviceAccount ? cert(serviceAccount) : undefined,
  databaseURL: process.env.FIREBASE_ADMIN_DATABASE_URL,
  storageBucket: process.env.FIREBASE_ADMIN_STORAGE_BUCKET,
};

const adminApp = getApps().length === 0 && serviceAccount
  ? initializeApp(adminConfig)
  : getApps()[0];

const adminAuth = getAuth(adminApp);
const adminFirestore = getFirestore(adminApp);
const adminRtdb = getDatabase(adminApp);
const adminStorage = getStorage(adminApp);

export { adminApp, adminAuth, adminFirestore, adminRtdb, adminStorage };