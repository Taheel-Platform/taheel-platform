import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// تحميل القوالب مرة واحدة من المسارات الجديدة
const templates = {
  otp: fs.readFileSync(path.join(process.cwd(), "lib", "email-templates", "email-template-taheel.html"), "utf-8"),
  order_confirmation: fs.readFileSync(path.join(process.cwd(), "lib", "email-templates", "order-confirmation-bilingual.html"), "utf-8"),
};

const subjects = {
  otp: "رمز التحقق من منصة تأهيل | Your Verification Code - Taheel",
  order_confirmation: "تأكيد الطلب - منصة تأهيل | Order Confirmation - Taheel"
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true" || process.env.EMAIL_SECURE === true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendMail(to, type, data) {
  let html = templates[type];
  let subject = subjects[type];
  let text = "";

  // استبدال المتغيرات في القالب بالقيم الحقيقية
  if (type === "otp") {
    html = html.replace(/{{CODE}}/g, data.code);
    text = `رمز التحقق الخاص بك هو: ${data.code}\nYour verification code is: ${data.code}`;
  }
  if (type === "order_confirmation") {
    html = html
      .replace(/{{ORDER_NUMBER}}/g, data.orderNumber)
      .replace(/{{SERVICE_NAME}}/g, data.serviceName)
      .replace(/{{PRICE}}/g, data.price);
    text = `رقم الطلب: ${data.orderNumber}\nاسم الخدمة: ${data.serviceName}\nالمبلغ: ${data.price} درهم\nOrder No.: ${data.orderNumber}\nService: ${data.serviceName}\nPaid: ${data.price} AED`;
  }

  const mailOptions = {
    from: `"Taheel Platform | منصة تأهيل" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error("SEND MAIL ERROR:", error);
    return { success: false, error: error.message || error.toString() };
  }
}