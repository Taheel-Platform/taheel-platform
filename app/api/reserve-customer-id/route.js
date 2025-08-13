import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase.admin";

// نفس دالة التوليد التي تستخدمها في الفرونت (يفضل نقلها لمكان مشترك)
function generateCustomerId(accountType, docId) {
  let prefix = "";
  let startArr = [];
  if (accountType === "resident") {
    prefix = "RES";
    startArr = ["100", "200", "300"];
  } else if (accountType === "company") {
    prefix = "COM";
    startArr = ["400", "500", "600"];
  } else if (accountType === "nonresident") {
    prefix = "NON";
    startArr = ["700", "800", "900"];
  } else {
    prefix = "RES";
    startArr = ["100"];
  }
  const first3 = startArr[Math.floor(Math.random() * startArr.length)];
  let last4 = docId.replace(/\D/g, '').slice(-4);
  if (last4.length < 4) {
    last4 = (last4 + Date.now().toString().slice(-4)).slice(0, 4);
  }
  return `${prefix}-${first3}-${last4}`;
}

export async function POST(req) {
  try {
    const { accountType } = await req.json();
    if (!accountType || typeof accountType !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // حاول توليد رقم عميل غير مستخدم
    let customerId;
    let attempts = 0;
    let exists = true;

    while (attempts < 5 && exists) {
      attempts++;
      customerId = generateCustomerId(accountType, Date.now().toString() + Math.floor(Math.random() * 10000));
      // تحقق من وجوده في customerIds collection
      const docRef = adminFirestore.collection("customerIds").doc(customerId);
      const docSnap = await docRef.get();
      exists = docSnap.exists;
    }
    if (exists) {
      // لم يتم توليد رقم فريد بعد عدة محاولات
      return NextResponse.json({ error: "Could not reserve unique customerId" }, { status: 409 });
    }

    // احجز الرقم الآن (اكتب doc فارغ بالرقم)
    await adminFirestore.collection("customerIds").doc(customerId).set({
      reservedAt: Date.now()
    });

    // أرجع الرقم للفرونت
    return NextResponse.json({ customerId });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}