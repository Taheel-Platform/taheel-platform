import { Resend } from "resend";
import fs from "fs";
import path from "path";

// تحميل القوالب مرة واحدة عند بدء السيرفر
const templates = {
  otp: fs.readFileSync(
    path.join(process.cwd(), "lib", "email-templates", "email-template-taheel.html"),
    "utf-8"
  ),
  order_confirmation: fs.readFileSync(
    path.join(process.cwd(), "lib", "email-templates", "order-confirmation-bilingual.html"),
    "utf-8"
  ),
  // أضف قوالب أخرى هنا حسب الحاجة
};

const subjects = {
  otp: "رمز التحقق من منصة تأهيل | Your Verification Code - Taheel",
  order_confirmation: "تأكيد الطلب - منصة تأهيل | Order Confirmation - Taheel",
};

const senders = {
  otp: `"Taheel Verification" <verification@taheel.ae>`,
  order_confirmation: `"Taheel Platform" <info@taheel.ae>`,
};

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * دالة عامة لإرسال أي إيميل حسب القالب والنوع
 */
export async function sendMail(to, type, data) {
  if (!templates[type]) {
    return { success: false, error: `Email template for type "${type}" not found.` };
  }
  if (!subjects[type]) {
    return { success: false, error: `Email subject for type "${type}" not found.` };
  }
  if (!to) {
    return { success: false, error: "Recipient email (to) is required." };
  }

  let html = templates[type];
  let subject = subjects[type];
  let text = "";
  let from = senders[type] || `"Taheel Platform" <info@taheel.ae>`;

  // استبدال المتغيرات في القالب بالقيم الحقيقية
  if (type === "otp") {
    html = html.replace(/{{CODE}}/g, data.code);
    text = `رمز التحقق الخاص بك هو: ${data.code}\nYour verification code is: ${data.code}`;
  } else if (type === "order_confirmation") {
    html = html
      .replace(/{{ORDER_NUMBER}}/g, data.orderNumber)
      .replace(/{{SERVICE_NAME}}/g, data.serviceName)
      .replace(/{{PRICE}}/g, data.price);
    text = `رقم الطلب: ${data.orderNumber}\nاسم الخدمة: ${data.serviceName}\nالمبلغ: ${data.price} درهم\nOrder No.: ${data.orderNumber}\nService: ${data.serviceName}\nPaid: ${data.price} AED`;
  }

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text,
  };

  try {
    console.log('mailOptions', mailOptions);
    const info = await resend.emails.send(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error("SEND MAIL ERROR:", error);
    return { success: false, error: error.message || error.toString() };
  }
}

/**
 * دالة مختصرة لإرسال OTP
 */
export async function sendOtpMail(to, code) {
  return await sendMail(to, "otp", { code });
}

/**
 * دالة مختصرة لإرسال تأكيد الطلب
 */
export async function sendOrderConfirmationMail(to, orderNumber, serviceName, price) {
  return await sendMail(to, "order_confirmation", { orderNumber, serviceName, price });
}