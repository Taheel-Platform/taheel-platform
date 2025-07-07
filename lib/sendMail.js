import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// قراءة قالب الإيميل HTML مرة واحدة عند بدء التشغيل
const emailTemplatePath = path.join(process.cwd(), "lib", "email-template-taheel.html");
const htmlTemplate = fs.readFileSync(emailTemplatePath, "utf-8");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // مثال: mail.taheel.ae
  port: Number(process.env.EMAIL_PORT), // مثال: 465
  secure: process.env.EMAIL_SECURE === "true", // true إذا 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOtpMail(to, code) {
  // استبدال {{CODE}} بالكود الفعلي
  const html = htmlTemplate.replace("{{CODE}}", code);

  const mailOptions = {
    from: `"Taheel Platform | منصة تأهيل" <${process.env.EMAIL_USER}>`,
    to,
    subject: "رمز التحقق من منصة تأهيل | Your Verification Code - Taheel",
    html,
    text: `رمز التحقق الخاص بك هو: ${code}\nYour verification code is: ${code}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error("SEND OTP MAIL ERROR:", error);
    return { success: false, error: error.message };
  }
}