import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getDatabase as getAdminDatabase } from "firebase-admin/database";
import { getStorage as getAdminStorage } from "firebase-admin/storage";

// اقرأ بيانات الخدمة من متغير البيئة
const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  : null;

// التعديل المهم هنا: معالجة private_key
if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

const adminConfig = {
  credential: serviceAccount ? cert(serviceAccount) : undefined,
  databaseURL: "https://taheel-platform-v2-default-rtdb.firebaseio.com",
  storageBucket: "taheel-platform-v2.appspot.com"
};

let adminApp;
if (!getAdminApps().length && serviceAccount) {
  adminApp = initializeAdminApp(adminConfig);
} else if (getAdminApps().length) {
  adminApp = getAdminApps()[0];
} else {
  adminApp = null;
}

const adminAuth = adminApp ? getAdminAuth(adminApp) : null;
const adminFirestore = adminApp ? getAdminFirestore(adminApp) : null;
const adminRtdb = adminApp ? getAdminDatabase(adminApp) : null;
const adminStorage = adminApp ? getAdminStorage(adminApp) : null;

export { adminApp, adminAuth, adminFirestore, adminRtdb, adminStorage };