import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase.admin";

// دالة توليد رقم العميل حسب نوع الحساب ومعرف فريد (docId)
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
    // استقبال نوع الحساب من الفرونت
    const { accountType } = await req.json();

    // تحقق من صحة نوع الحساب
    if (!accountType || typeof accountType !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // محاولة توليد رقم عميل فريد
    let customerId;
    let exists = true;
    let attempts = 0;

    while (attempts < 5 && exists) {
      attempts++;

      // استخدم تاريخ الآن ورقم عشوائي للحصول على docId فريد
      const docId = Date.now().toString() + Math.floor(Math.random() * 10000);
      customerId = generateCustomerId(accountType, docId);

      // تحقق من عدم وجود الرقم بالفعل في مجموعة customerIds
      const docRef = adminFirestore.collection("customerIds").doc(customerId);
      const docSnap = await docRef.get();
      exists = docSnap.exists;
    }

    // لو لم نستطع توليد رقم فريد بعد عدة محاولات
    if (exists) {
      return NextResponse.json({ error: "Could not reserve unique customerId" }, { status: 409 });
    }

    // حجز الرقم بإنشاء مستند جديد في customerIds
    await adminFirestore.collection("customerIds").doc(customerId).set({
      reservedAt: Date.now()
    });

    // إرجاع الرقم للفرونت
    return NextResponse.json({ customerId });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}