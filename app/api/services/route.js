export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase.admin";

// لوج لمعرفة حالة فايرستور
console.log("adminFirestore موجود:", !!adminFirestore);

export async function GET() {
  try {
    // لوج بداية تنفيذ الميثود
    console.log("GET /api/services called");

    // لوج قبل محاولة الوصول للداتا
    if (!adminFirestore) {
      console.error("adminFirestore غير معرف! هناك مشكلة في تهيئة فايربيز admin.");
      return NextResponse.json({ error: "adminFirestore is not defined!" }, { status: 500 });
    }

    // جرب جلب البيانات
    const snapshot = await adminFirestore.collection("services").get();

    // لوج بعد نجاح الجلب
    console.log("تم جلب snapshot بنجاح:", snapshot.size, "documents");

    let services = [];
    snapshot.forEach(doc => {
      services.push({ id: doc.id, ...doc.data() });
    });

    // لوج بعد تجهيز البيانات
    console.log("عدد الخدمات المجهزة للإرجاع:", services.length);

    return NextResponse.json({ services });
  } catch (e) {
    // لوج عند حدوث خطأ
    console.error("خطأ أثناء تنفيذ GET /api/services:", e.message);
    if (e.stack) console.error(e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}