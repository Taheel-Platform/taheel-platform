export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { saveOtp, getOtp } from "@/lib/otpDb";
import { sendOtpMail } from "@/lib/sendMail";

export async function POST(req) {
  try {
    const { email } = await req.json();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "بريد إلكتروني غير صالح" },
        { status: 400 }
      );
    }

    const existing = await getOtp(cleanEmail);
    if (existing && Date.now() - existing.created_at < 60 * 1000) {
      return NextResponse.json(
        { success: false, message: "يرجى الانتظار دقيقة لإعادة الإرسال" },
        { status: 429 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(cleanEmail, code, Date.now() + 10 * 60 * 1000);

    // محاولة إرسال الإيميل ومعالجة الخطأ لو حدث
    const mailResult = await sendOtpMail(cleanEmail, code);
    if (!mailResult.success) {
      // يمكنك هنا إظهار تفاصيل الخطأ في حالة التطوير فقط
      console.error("SEND OTP MAIL ERROR:", mailResult.error);
      return NextResponse.json(
        { success: false, message: "تعذر إرسال البريد الإلكتروني. الرجاء المحاولة لاحقاً." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "تم إرسال رمز التحقق" });
  } catch (error) {
    // إظهار الخطأ في اللوغ فقط
    console.error("OTP SEND ERROR:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء معالجة الطلب. حاول لاحقاً." },
      { status: 500 }
    );
  }
}