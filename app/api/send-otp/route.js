export const dynamic = "force-dynamic";
import { Response } from "next/server";
import { saveOtp, getOtp } from "@/lib/otpDb";
import { sendOtpMail } from "@/lib/sendMail";

export async function POST(req) {
  try {
    const { email } = await req.json();
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return Response.json(
        { success: false, message: "بريد إلكتروني غير صالح" },
        { status: 400 }
      );
    }

    const existing = await getOtp(cleanEmail);
    if (existing && Date.now() - existing.created_at < 60 * 1000) {
      return Response.json(
        { success: false, message: "يرجى الانتظار دقيقة لإعادة الإرسال" },
        { status: 429 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(cleanEmail, code, Date.now() + 10 * 60 * 1000);

    // احتمال يحصل خطأ هنا لو الإيميل مش شغال
    await sendOtpMail(cleanEmail, code);

    return Response.json({ success: true, message: "تم إرسال رمز التحقق" });
  } catch (error) {
    console.error("OTP SEND ERROR:", error);
    return Response.json(
      { success: false, message: "حدث خطأ أثناء إرسال البريد الإلكتروني. حاول لاحقاً." },
      { status: 500 }
    );
  }
}