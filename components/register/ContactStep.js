import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PasswordField from "../PasswordField";
import PhoneCodeSelect from "../PhoneCodeSelect";

// دوال التحقق
function validateEmail(email) {
  if (typeof email !== "string") return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
function validatePassword(password) {
  if (typeof password !== "string") return false;
  return (
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) &&
    password.length >= 8
  );
}

// دالة إرسال الكود (OTP) للإيميل
async function sendVerificationCode(email, code) {
  if (!validateEmail(email)) return { success: false, message: "Invalid email" };
  const res = await fetch("/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });
  return await res.json();
}

// دالة تحقق الكود مع الباك اند
async function verifyCode(email, code) {
  if (!validateEmail(email) || typeof code !== "string") return { success: false };
  const res = await fetch("/api/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });
  return await res.json();
}

const styles = { /* ... نفس تعريفك ... */ };

export default function RegisterForm({ lang = "ar", t = {} }) {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    emailConfirm: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    phoneCode: "+971",
    agreeTerms: false,
    agreePrivacy: false,
    agreeEAuth: false,
  });

  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpVerifying, setEmailOtpVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSentMsg, setOtpSentMsg] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPassC, setShowPassC] = useState(false);

  // كود التفعيل الذي تم توليده (لإرساله للباك اند وحفظه مؤقتًا للمستخدم الحالي)
  const [generatedOtp, setGeneratedOtp] = useState("");

  // استجابة للموبايل
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 600);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const handleChange = (e) => {
    let name, value, type, checked;
    if (e.target) {
      ({ name, value, type, checked } = e.target);
      value = type === "checkbox" ? checked : value;
    } else if (e && typeof e === "object") {
      name = e.name;
      value = e.value;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const emailsMatch = form.email && form.email === form.emailConfirm && validateEmail(form.email);

  // إرسال كود التفعيل الحقيقي
  const handleSendOtp = async () => {
    setOtpError("");
    setOtpSentMsg("");
    setEmailOtpVerifying(true);

    if (!validateEmail(form.email)) {
      setOtpError(lang === "ar" ? "يرجى إدخال بريد إلكتروني صحيح" : "Enter a valid email");
      setEmailOtpVerifying(false);
      return;
    }
    // توليد كود عشوائي 6 أرقام
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    // إرسال للباك اند
    const res = await sendVerificationCode(form.email, otp);
    setEmailOtpVerifying(false);
    if (res.success) {
      setEmailOtpSent(true);
      setOtpSentMsg(lang === "ar" ? "تم إرسال الكود على بريدك الإلكتروني" : "Verification code sent to your email");
    } else {
      setOtpError(lang === "ar" ? "حدث خطأ أثناء الإرسال" : "Failed to send email");
    }
  };

  // تحقق الكود مع الباك اند
  const handleVerifyCode = async () => {
    setOtpError("");
    setEmailOtpVerifying(true);
    const res = await verifyCode(form.email, emailOtpCode);
    setEmailOtpVerifying(false);
    if (res.success) {
      setEmailVerified(true);
      setOtpSentMsg("");
    } else {
      setOtpError(lang === "ar" ? "الكود غير صحيح أو منتهي الصلاحية" : "Code is incorrect or expired");
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    alert(lang === "ar" ? "تم التسجيل!" : "Registered!");
    router.push("/dashboard/client/profile");
  };

  const canRegister =
    emailVerified &&
    validatePassword(form.password) &&
    form.password === form.passwordConfirm &&
    form.agreeTerms &&
    form.agreePrivacy &&
    form.agreeEAuth;

  return (
    <form
      style={{
        ...styles.formSection,
        maxWidth: isMobile ? "98vw" : styles.formSection.maxWidth,
        padding: isMobile ? "1.2rem 0.4rem" : styles.formSection.padding,
        direction: lang === "ar" ? "rtl" : "ltr"
      }}
      lang={lang}
    >
      <div style={styles.formTitle}>
        {lang === "ar" ? "معلومات الأمان" : "Security Information"}
      </div>

      <div style={{
        ...styles.formGrid,
        gridTemplateColumns: isMobile ? "1fr" : styles.formGrid.gridTemplateColumns
      }}>
        <div style={styles.inputWrapper}>
          <label style={styles.inputLabel}>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</label>
          <input
            name="email"
            type="email"
            style={styles.inputField}
            placeholder={lang === "ar" ? "البريد الإلكتروني" : "Email"}
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>
        <div style={styles.inputWrapper}>
          <label style={styles.inputLabel}>{lang === "ar" ? "تأكيد البريد الإلكتروني" : "Confirm Email"}</label>
          <input
            name="emailConfirm"
            type="email"
            style={styles.inputField}
            placeholder={lang === "ar" ? "تأكيد البريد الإلكتروني" : "Confirm Email"}
            value={form.emailConfirm}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>
      </div>

      {emailsMatch && !emailVerified && (
        <div style={styles.otpSection}>
          <button
            type="button"
            style={{
              ...styles.btn,
              ...(emailOtpVerifying ? styles.btnDisabled : {})
            }}
            onClick={handleSendOtp}
            disabled={emailOtpVerifying}
          >
            {emailOtpVerifying ? (lang === "ar" ? "جاري التحقق..." : "Verifying...") : (lang === "ar" ? "إرسال كود التفعيل" : "Send Verification Code")}
          </button>
          {otpSentMsg && <span style={{ ...styles.inputError, color: "#10b981" }}>{otpSentMsg}</span>}
          {otpError && <span style={styles.inputError}>{otpError}</span>}
        </div>
      )}

      {emailOtpSent && !emailVerified && (
        <div style={styles.otpSection}>
          <input
            type="text"
            name="otp"
            style={{
              ...styles.inputField,
              width: "120px",
              background: "#222",
              color: "#fff",
              fontWeight: "bold",
              letterSpacing: "4px"
            }}
            placeholder={lang === "ar" ? "أدخل الكود" : "Enter Code"}
            value={emailOtpCode}
            maxLength={6}
            onChange={e => setEmailOtpCode(e.target.value)}
          />
          <button
            type="button"
            style={{
              ...styles.btn,
              ...(emailOtpVerifying ? styles.btnDisabled : {})
            }}
            onClick={handleVerifyCode}
            disabled={emailOtpVerifying}
          >
            {emailOtpVerifying ? (lang === "ar" ? "جاري التحقق..." : "Verifying...") : (lang === "ar" ? "تأكيد الكود" : "Verify Code")}
          </button>
          <button
            type="button"
            style={styles.btnSecondary}
            onClick={handleSendOtp}
          >
            {lang === "ar" ? "إعادة الإرسال" : "Resend"}
          </button>
          {otpError && <span style={styles.inputError}>{otpError}</span>}
        </div>
      )}

      {emailVerified && (
        <div style={styles.verifiedMsg}>
          <span>✔</span>
          <span>{lang === "ar" ? "تم تفعيل البريد الإلكتروني" : "Email Verified"}</span>
        </div>
      )}

      <div style={{
        ...styles.formGrid,
        gridTemplateColumns: isMobile ? "1fr" : styles.formGrid.gridTemplateColumns
      }}>
        <div style={styles.inputWrapper}>
          <PasswordField
            label={lang === "ar" ? "كلمة المرور" : "Password"}
            name="password"
            value={form.password}
            show={showPass}
            onChange={handleChange}
            toggleShow={() => setShowPass(s => !s)}
            lang={lang}
          />
        </div>
        <div style={styles.inputWrapper}>
          <PasswordField
            label={lang === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}
            name="passwordConfirm"
            value={form.passwordConfirm}
            show={showPassC}
            onChange={handleChange}
            toggleShow={() => setShowPassC(s => !s)}
            lang={lang}
          />
        </div>
      </div>

      <div style={{
        ...styles.formGrid,
        gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr"
      }}>
        <div style={styles.inputWrapper}>
          <label style={styles.inputLabel}>{lang === "ar" ? "كود الدولة" : "Country Code"}</label>
          <PhoneCodeSelect
            value={form.phoneCode}
            onChange={opt => handleChange({ name: "phoneCode", value: opt?.value })}
            lang={lang}
          />
        </div>
        <div style={styles.inputWrapper}>
          <label style={styles.inputLabel}>{lang === "ar" ? "رقم الهاتف" : "Phone Number"}</label>
          <input
            name="phone"
            type="tel"
            style={styles.inputField}
            placeholder={lang === "ar" ? "رقم الهاتف" : "Phone Number"}
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
          />
        </div>
      </div>

      <div style={styles.checkboxList}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="agreeTerms"
            checked={form.agreeTerms}
            onChange={handleChange}
          />
          {lang === "ar" ? "أوافق على الشروط والأحكام" : "I accept the terms and conditions"}
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="agreePrivacy"
            checked={form.agreePrivacy}
            onChange={handleChange}
          />
          {lang === "ar" ? "أوافق على سياسة الخصوصية" : "I accept the privacy policy"}
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="agreeEAuth"
            checked={form.agreeEAuth}
            onChange={handleChange}
          />
          {lang === "ar" ? "أوافق على التفويض الإلكتروني" : "I accept E-authorization"}
        </label>
      </div>

      <button
        type="submit"
        style={{
          ...styles.btn,
          ...(canRegister ? {} : styles.btnDisabled),
          marginTop: "1.3rem"
        }}
        disabled={!canRegister}
        onClick={handleRegister}
      >
        {lang === "ar" ? "تسجيل حساب جديد" : "Register New Account"}
      </button>
    </form>
  );
}