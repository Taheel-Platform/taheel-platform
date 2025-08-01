console.log("========== FIREBASE ADMIN LOG ==========");
console.log("GOOGLE_SERVICE_ACCOUNT_KEY exists:", !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  console.log(
    "First 100 chars of GOOGLE_SERVICE_ACCOUNT_KEY:",
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY.substring(0, 100)
  );
}
console.log("FIREBASE_ADMIN_DATABASE_URL:", process.env.FIREBASE_ADMIN_DATABASE_URL);
console.log("FIREBASE_ADMIN_STORAGE_BUCKET:", process.env.FIREBASE_ADMIN_STORAGE_BUCKET);

import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getDatabase as getAdminDatabase } from "firebase-admin/database";
import { getStorage as getAdminStorage } from "firebase-admin/storage";

// اقرأ بيانات الخدمة من متغير البيئة
const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  : null;

console.log("serviceAccount موجود:", !!serviceAccount);
if (serviceAccount && serviceAccount.private_key) {
  console.log("private_key exists on serviceAccount:", !!serviceAccount.private_key);
}

// معالجة private_key
if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

const adminConfig = {
  credential: serviceAccount ? cert(serviceAccount) : undefined,
  databaseURL: process.env.FIREBASE_ADMIN_DATABASE_URL || "https://taheel-platform-v2-default-rtdb.firebaseio.com",
  storageBucket: process.env.FIREBASE_ADMIN_STORAGE_BUCKET || "taheel-platform-v2.appspot.com",
};

let adminApp;
if (!getAdminApps().length && serviceAccount) {
  adminApp = initializeAdminApp(adminConfig);
  console.log("Firebase adminApp تم تهيئته من جديد.");
} else if (getAdminApps().length) {
  adminApp = getAdminApps()[0];
  console.log("Firebase adminApp موجود مسبقًا وتم استخدامه.");
} else {
  adminApp = null;
  console.log("فشل في تهيئة adminApp: serviceAccount غير موجود.");
}

const adminAuth = adminApp ? getAdminAuth(adminApp) : null;
const adminFirestore = adminApp ? getAdminFirestore(adminApp) : null;
const adminRtdb = adminApp ? getAdminDatabase(adminApp) : null;
const adminStorage = adminApp ? getAdminStorage(adminApp) : null;

console.log("adminAuth موجود:", !!adminAuth);
console.log("adminFirestore موجود:", !!adminFirestore);
console.log("adminRtdb موجود:", !!adminRtdb);
console.log("adminStorage موجود:", !!adminStorage);

export { adminApp, adminAuth, adminFirestore, adminRtdb, adminStorage };