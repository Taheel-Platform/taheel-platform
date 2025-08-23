import Stripe from 'stripe';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin (تهيئة مرة واحدة عند أول تشغيل)
if (!global._firestore) {
  initializeApp({ credential: applicationDefault() });
  global._firestore = getFirestore();
}
const firestore = global._firestore;

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
      metadata: { requestId, customerId, serviceId, serviceName },
      receipt_email: userEmail,
      description: `دفع خدمة ${serviceName}`,
    });

    // 3. حفظ الطلب في فايرستور كـ "pending"
    await firestore.collection("requests").doc(requestId).set({
      requestId,
      paymentIntentId: paymentIntent.id,
      customerId,
      serviceId,
      serviceName,
      paidAmount: amount,
      coinsUsed,
      coinsGiven,
      createdAt: new Date().toISOString(),
      status: "pending",
      userEmail,
      attachments,
      providers,
    });

    // 4. أرجع clientSecret ورقم الطلب للواجهة
    res.status(200).json({ clientSecret: paymentIntent.client_secret, orderNumber: requestId });
  } catch (e) {
    console.error("Stripe error:", e);
    res.status(500).json({ error: e.message });
  }
}