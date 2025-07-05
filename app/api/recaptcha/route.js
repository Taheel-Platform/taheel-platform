export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ success: false, message: "لم يتم إرسال التوكن" }, { status: 400 });
    }

    const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
    if (!SECRET_KEY) {
      return NextResponse.json({ success: false, message: "مفتاح reCAPTCHA السري غير متوفر في الخادم" }, { status: 500 });
    }

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${SECRET_KEY}&response=${token}`,
    });

    const data = await res.json();

    // score: لقيم v3، عادة 0.5 متوسط جيد (غيره حسب حاجتك)
    if (!data.success || (typeof data.score === "number" && data.score < 0.1)) {
      return NextResponse.json({ success: false, message: "فشل التحقق من reCAPTCHA", data }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "تم التحقق بنجاح", data });
  } catch (e) {
    return NextResponse.json({ success: false, message: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}
