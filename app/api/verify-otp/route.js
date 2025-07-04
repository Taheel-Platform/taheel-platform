"use client";
export const dynamic = "force-dynamic";
import { Response } from "next/server";
import { getOtp, deleteOtp } from "@/lib/otpDb";

export async function POST(req) {
  const { email, code } = await req.json();
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanEmail || !code) {
    return Response.json({ success: false, message: "البريد الإلكتروني والرمز مطلوبان" }, { status: 400 });
  }

  const otpObj = await getOtp(cleanEmail);
  if (!otpObj) {
    return Response.json({ success: false, message: "لم يتم إرسال رمز لهذا البريد" }, { status: 400 });
  }

  if (Date.now() > otpObj.expires) {
    await deleteOtp(cleanEmail);
    return Response.json({ success: false, message: "انتهت صلاحية الرمز" }, { status: 400 });
  }

  if (otpObj.code !== code) {
    return Response.json({ success: false, message: "الرمز غير صحيح" }, { status: 400 });
  }

  await deleteOtp(cleanEmail);
  return Response.json({ success: true, message: "تم التحقق بنجاح" });
}