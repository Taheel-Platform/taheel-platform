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

const styles = {
  formSection: {
    maxWidth: 720,
    margin: '40px auto',
    background: '#fff',
    borderRadius: '1.6rem',
    boxShadow: '0 6px 32px 0 rgba(16,185,129,0.10), 0 1.5px 4px 0 rgba(0,0,0,0.08)',
    padding: '2.8rem 2.5rem 2.2rem 2.5rem',
    fontFamily: "Cairo, Inter, Arial, Helvetica, sans-serif"
  },
  formTitle: {
    textAlign: 'center',
    fontSize: '2.1rem',
    fontWeight: 900,
    color: '#10b981',
    marginBottom: '1.7rem',
    letterSpacing: '0.03em'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.2rem',
    marginBottom: '0.8rem'
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '0.65rem'
  },
  inputLabel: {
    fontWeight: 600,
    color: '#333',
    marginBottom: '0.18rem',
    fontSize: '1rem',
    letterSpacing: '0.01em'
  },
  inputField: {
    borderRadius: '0.9rem',
    border: '1.5px solid #e2e8f0',
    background: '#f7fafc',
    padding: '0.78rem 1rem',
    fontSize: '1.08rem',
    fontWeight: 500,
    color: '#222',
    outline: 'none',
    transition: 'border 0.2s',
    width: '100%'
  },
  inputFieldFocus: {
    borderColor: '#10b981'
  },
  inputError: {
    fontSize: '0.89rem',
    color: '#d32f2f',
    marginTop: '0.17rem',
    whiteSpace: 'pre-line',
    textAlign: 'right',
    fontWeight: 600
  },
  otpSection: {
    display: 'flex',
    gap: '0.7rem',
    alignItems: 'center',
    marginTop: '0.3rem',
    flexWrap: 'wrap'
  },
  verifiedMsg: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: '1.04rem',
    marginTop: '0.4rem',
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
    margin: '1.1rem 0 0.3rem 0'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.97rem',
    color: '#333'
  },
  btn: {
    background: 'linear-gradient(90deg,#10b981 40%,#059669 100%)',
    color: '#fff',
    border: 'none',
    padding: '0.52rem 1.1rem',
    borderRadius: '0.7rem',
    fontWeight: 'bold',
    fontSize: '1.04rem',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(16,185,129,0.07)',
    transition: 'background 0.18s, opacity 0.18s, box-shadow 0.18s',
    minWidth: 120,
    marginTop: '0.3rem'
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  btnSecondary: {
    background: 'none',
    color: '#10b981',
    boxShadow: 'none',
    fontSize: '0.97rem',
    padding: 0,
    minWidth: 'unset'
  }
};

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

  const handleSendOtp = async () => {
    setOtpError("");
    setOtpSentMsg("");
    setEmailOtpVerifying(true);

    if (!validateEmail(form.email)) {
      setOtpError(lang === "ar" ? "يرجى إدخال بريد إلكتروني صحيح" : "Enter a valid email");
      setEmailOtpVerifying(false);
      return;
    }
    setTimeout(() => {
      setEmailOtpSent(true);
      setOtpSentMsg(lang === "ar" ? "تم إرسال الكود على بريدك الإلكتروني" : "Verification code sent to your email");
      setEmailOtpVerifying(false);
    }, 900);
  };

  const handleVerifyCode = async () => {
    setOtpError("");
    setEmailOtpVerifying(true);
    setTimeout(() => {
      if (emailOtpCode === "123456") {
        setEmailVerified(true);
        setOtpSentMsg("");
      } else {
        setOtpError(lang === "ar" ? "الكود غير صحيح أو منتهي الصلاحية" : "Code is incorrect or expired");
      }
      setEmailOtpVerifying(false);
    }, 900);
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