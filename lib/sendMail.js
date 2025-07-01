import nodemailer from "nodemailer";

console.log('ENV:', process.env.EMAIL_USER, process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: "mail.taheel.ae", // غيّرها حسب مزود الخدمة الفعلي
  port: 465,              // أو 587 حسب مزود الخدمة
  secure: true,           // true إذا 465، false إذا 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOtpMail(to, code) {
  const mailOptions = {
    from: `"Taheel" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Verification Code - Taheel",
    text: `Your verification code is: ${code}`,
    html: `<div>
      <h2>Your Verification Code</h2>
      <p style="font-size:20px; font-weight:bold;">${code}</p>
      <p>This code will expire in 10 minutes.</p>
    </div>`,
  };
  await transporter.sendMail(mailOptions);
}