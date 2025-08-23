import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// تهيئة Firebase Admin مرة واحدة فقط
let firestore;
if (!getApps().length) {
  // بيانات الخدمة من متغير البيئة
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  // معالجة private_key للسطر الجديد
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  initializeApp({
    credential: cert(serviceAccount),
    // يمكنك إضافة databaseURL أو storageBucket لو أردت
  });
  firestore = getFirestore();
} else {
  firestore = getFirestore();
}

// Stripe secret key من متغيرات البيئة
console.log("Stripe Secret Key: ", process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// دالة توليد رقم طلب فريد
function generateOrderNumber() {
  const part1 = Math.floor(100 + Math.random() * 900); // 3 أرقام
  const part2 = Math.floor(1000 + Math.random() * 9000); // 4 أرقام
  return `REQ-${part1}-${part2}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    amount,
    serviceId,
    serviceName,
    customerId,
    userEmail,
    attachments = {},
    providers = [],
    coinsUsed = 0,
    coinsGiven = 0,
  } = req.body;

  if (!amount || !serviceName || !customerId || !userEmail) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // 1. أنشئ رقم طلب فريد
    const requestId = generateOrderNumber();

    // 2. أنشئ PaymentIntent في Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'aed',
      metadata: { requestId, customerId, serviceId: serviceId || "", serviceName },
      receipt_email: userEmail,
      description: `دفع خدمة ${serviceName}`,
    });

    // 3. تجهيز بيانات الطلب مع معالجة undefined
    const requestDoc = {
      requestId,
      paymentIntentId: paymentIntent.id,
      customerId,
      serviceId: serviceId || "",
      serviceName,
      paidAmount: amount,
      coinsUsed,
      coinsGiven,
      createdAt: new Date().toISOString(),
      status: "pending",
      userEmail,
      attachments,
      providers,
    };

    Object.keys(requestDoc).forEach(key => {
      if (requestDoc[key] === undefined) {
        requestDoc[key] = "";
      }
    });

    // 4. حفظ الطلب في فايرستور كـ "pending"
    await firestore.collection("requests").doc(requestId).set(requestDoc);

    // 5. أرجع clientSecret ورقم الطلب للواجهة
    res.status(200).json({ clientSecret: paymentIntent.client_secret, orderNumber: requestId });
  } catch (e) {
    console.error("Stripe/Firestore error:", e);
    res.status(500).json({ error: e.message, stack: e.stack, full: e });
  }
}