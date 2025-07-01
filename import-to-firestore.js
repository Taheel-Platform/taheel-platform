const admin = require("firebase-admin");
const fs = require("fs");

// مسار ملف الخدمة
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// قراءة ملف الداتا
const data = JSON.parse(fs.readFileSync("database.json", "utf8"));

// دالة نقل Collection عادية
async function importCollection(collectionKey) {
  const collectionData = data[collectionKey];
  if (!collectionData) {
    console.log(`لا يوجد بيانات ${collectionKey}`);
    return;
  }
  for (const [docId, docData] of Object.entries(collectionData)) {
    await db.collection(collectionKey).doc(docId).set(docData);
    console.log(`تم رفع ${collectionKey}/${docId}`);
  }
}

async function main() {
  // collections الرئيسية
  await importCollection("users");
  await importCollection("requests");
  await importCollection("documents");
  await importCollection("notifications");
  await importCollection("chats");

  // نقل الخدمات حسب نوع العميل (كل نوع عميل هو مستند وكل خدمة داخله كـ field)
  const services = data.servicesByClientType;
  if (services) {
    for (const [clientType, servicesObject] of Object.entries(services)) {
      await db
        .collection("servicesByClientType")
        .doc(clientType)
        .set(servicesObject, { merge: true }); // ← كل الخدمات كـ fields جوه المستند
      console.log(`تم رفع جميع خدمات ${clientType} في servicesByClientType/${clientType}`);
    }
  }
}

main().then(() => {
  console.log("تم نقل جميع البيانات!");
  process.exit();
});