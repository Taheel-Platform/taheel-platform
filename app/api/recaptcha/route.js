export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Handler for POST (التحقق من reCAPTCHA)
export async function POST(req) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json(
        { success: false, message: "لم يتم إرسال التوكن" },
        { status: 400 }
      );
    }

    const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
    if (!SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: "مفتاح reCAPTCHA السري غير متوفر في الخادم" },
        { status: 500 }
      );
    }

    // Verify reCAPTCHA with Google
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${SECRET_KEY}&response=${token}`,
    });

    const data = await res.json();

    // If v3: Check score threshold (0.3 as example)
    if (!data.success || (typeof data.score === "number" && data.score < 0.3)) {
      return NextResponse.json(
        { success: false, message: "فشل التحقق من reCAPTCHA", data },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم التحقق بنجاح",
      data,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: "خطأ داخلي في الخادم" },
      { status: 500 }
    );
  }
}

// Handler for OPTIONS (حل مشاكل preflight/CORS)
export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
