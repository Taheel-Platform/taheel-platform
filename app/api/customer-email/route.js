import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase.admin";

export async function POST(req) {
  try {
    const { customerId } = await req.json();

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // تطبيع رقم العميل
    const normalizedCustomerId = customerId.trim();

    // جلب الإيميل من Firestore (جدول users)
    const snapshot = await adminFirestore
      .collection("users")
      .where("customerId", "==", normalizedCustomerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = snapshot.docs[0].data();
    const email = (user.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ email });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}