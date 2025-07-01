import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getDatabase as getAdminDatabase } from "firebase-admin/database";
import { getStorage as getAdminStorage } from "firebase-admin/storage";

// اقرأ بيانات الخدمة من متغير البيئة
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

const adminConfig = {
  credential: cert(serviceAccount),
  databaseURL: "https://taheel-platform-v2-default-rtdb.firebaseio.com",
  storageBucket: "taheel-platform-v2.appspot.com"
};

let adminApp;
if (!getAdminApps().length) {
  adminApp = initializeAdminApp(adminConfig);
} else {
  adminApp = getAdminApps()[0];
}
const adminAuth = getAdminAuth(adminApp);
const adminFirestore = getAdminFirestore(adminApp);
const adminRtdb = getAdminDatabase(adminApp);
const adminStorage = getAdminStorage(adminApp);

export { adminApp, adminAuth, adminFirestore, adminRtdb, adminStorage };