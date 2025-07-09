export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { saveOtp, getOtp } from "@/lib/otpDb";
import { sendMail } from "@/lib/sendMail";

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

    const existingOtp = await getOtp(cleanEmail);
    if (existingOtp && Date.now() - existingOtp.created_at < 60 * 1000) {
      return NextResponse.json(
        { success: false, message: "يرجى الانتظار دقيقة لإعادة الإرسال" },
        { status: 429 }
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(cleanEmail, otpCode, Date.now() + 10 * 60 * 1000);

    // إرسال الإيميل عبر Resend فقط
    const mailResult = await sendMail(cleanEmail, "otp", { code: otpCode });
    if (!mailResult.success) {
      console.error("SEND OTP MAIL ERROR:", mailResult.error);
      return NextResponse.json(
        { success: false, message: "تعذر إرسال البريد الإلكتروني. الرجاء المحاولة لاحقاً." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "تم إرسال رمز التحقق" });
  } catch (error) {
    console.error("OTP SEND ERROR:", error, error?.stack);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء معالجة الطلب. حاول لاحقاً." },
      { status: 500 }
    );
  }
}