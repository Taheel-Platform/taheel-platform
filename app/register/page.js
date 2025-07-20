'use client';

import { Suspense } from "react";
import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import dynamic from "next/dynamic";
import { UAE_DISTRICTS } from "@/lib/uae-districts";
import DocumentUploadField from "@/components/DocumentUploadField";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase.client";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import countries from "@/lib/countries-ar-en";
import PHONE_CODES from "@/lib/phone-codes";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// Force dynamic rendering to prevent static export issues
export const dynamicConfig = 'force-dynamic';
import React from "react";

// ------ التعديلات المطلوبة (دوال التحقق والتنسيق) ------
function validateEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
function validatePassword(password) {
  return (
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) &&
    password.length >= 8
  );
}
function formatEID(eid) {
  let digits = eid.replace(/[^\d]/g, "");
  let out = "";
  if (digits.length > 0) out += digits.slice(0, 3);
  if (digits.length > 3) out += "-" + digits.slice(3, 7);
  if (digits.length > 7) out += "-" + digits.slice(7, 14);
  if (digits.length > 14) out += "-" + digits.slice(14, 15);
  return out;
}
function formatPhone(phone) {
  return phone.replace(/[^\d]/g, "");
}

// Field component
const Field = React.memo(function Field({ label, name, placeholder, value, onChange, lang, type = "text", ...rest }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-semibold text-gray-800 leading-5">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all placeholder:text-gray-400 shadow-sm"
        dir={lang === "ar" ? "rtl" : "ltr"}
        {...rest}
      />
    </div>
  );
});

// إرسال الكود
async function sendVerificationCode(email) {
  const res = await fetch("/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return await res.json();
}

// تحقق الكود
async function verifyCode(email, code) {
  const res = await fetch("/api/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code })
  });
  return await res.json();
}

const PhoneCodeSelect = dynamic(() => import("@/components/PhoneCodeSelect"), { ssr: false });
const CountrySelect = dynamic(() => import("@/components/CountrySelect"), { ssr: false });

const LANGUAGES = {
  // ... نفس تعريف LANGUAGES كما بالكود السابق
  // أبقيه كما هو
  ar: {
    back: "الرجوع للموقع",
    createAccount: "إنشاء حساب",
    mainInfo: "معلومات الحساب الأساسية",
    accountType: "نوع الحساب",
    firstName: "الاسم الأول",
    middleName: "الاسم الأوسط",
    lastName: "الاسم الأخير",
    nameEn: "اسم العميل بالإنجليزية (مثل الباسبور)",
    birthDate: "تاريخ الميلاد",
    nationality: "الجنسية",
    gender: "الجنس",
    male: "ذكر", female: "أنثى", other: "أخرى",
    address: "العنوان الحالي",
    country: "الدولة",
    emirate: "الإمارة",
    district: "الحي / المنطقة",
    otherDistrict: "أخرى",
    writeDistrict: "اكتب اسم المنطقة",
    street: "اسم الشارع",
    building: "رقم البناية",
    floor: "الدور",
    apartment: "رقم الشقة",
    state: "الولاية / المحافظة",
    nonUaeDistrict: "الحي / المنطقة",
    attachments: "المرفقات والوثائق (ارفع كل المرفقات المطلوبة وسيتم فحصها قبل التسجيل)",
    docsRes: [
      { docType: "eidFront", label: "صورة الإقامة (أمامية)" },
      { docType: "eidBack", label: "صورة الإقامة (خلفية)" },
      { docType: "passport", label: "صورة جواز السفر" }
    ],
    docsNonRes: [
      { docType: "passport", label: "صورة جواز السفر" }
    ],
    docsComp: [
      { docType: "ownerIdFront", label: "صورة الهوية الأمامية للمالك" },
      { docType: "ownerIdBack", label: "صورة الهوية الخلفية للمالك" },
      { docType: "license", label: "الرخصة التجارية" },
      { docType: "passport", label: "صورة جواز السفر" }
    ],
    commSafe: "التواصل والأمان",
    email: "البريد الإلكتروني",
    emailConfirm: "تأكيد البريد الإلكتروني",
    sendOtp: "أرسل كود التفعيل",
    otpSent: "تم إرسال الكود على بريدك الإلكتروني",
    verifying: "جاري التحقق...",
    enterCode: "ادخل الكود المرسل على بريدك",
    verify: "تأكيد الإيميل",
    verified: "تم تأكيد البريد الإلكتروني ✔",
    wrongOtp: "الكود غير صحيح أو منتهي الصلاحية",
    resend: "إعادة إرسال الكود",
    mustVerifyEmail: "يجب تأكيد البريد الإلكتروني أولاً",
    password: "كلمة المرور",
    passwordConfirm: "تأكيد كلمة المرور",
    phoneCode: "كود الدولة",
    phone: "رقم الهاتف",
    agreeTerms: "أوافق على الشروط والأحكام",
    agreePrivacy: "أوافق على سياسة الخصوصية",
    agreeEAuth: "أوافق على التفويض الإلكتروني",
    register: "تسجيل حساب جديد",
    registering: "جاري التسجيل...",
    registered: "تم تسجيل الحساب بنجاح!",
    logoAlt: "شعار تأهيل",
    platform: "تأهيل",
    platformDesc: "منصة معتمدة لمتابعة المعلومات والمعاملات الحكومية",
    platformMore: "منصة ذكية تعتمد على الذكاء الاصطناعي والتقنيات الحديثة في متابعة وإنجاز المعاملات الحكومية. جميع بياناتك محمية بأعلى معايير التشفير، مع دعم مباشر وواجهة سهلة لكل المستخدمين.",
    rights: `© ${new Date().getFullYear()} تأهيل. جميع الحقوق محفوظة - دبي`,
    choose: "-- اختر --",
    company: "شركة",
    resident: "مقيم",
    nonresident: "غير مقيم",
    regError: "حدث خطأ أثناء التسجيل"
  },
  // ... الإنجليزية كما في السابق
  en: {
    back: "Back to site",
    createAccount: "Create Account",
    mainInfo: "Main Account Information",
    accountType: "Account Type",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    nameEn: "Client's Name in English (as passport)",
    birthDate: "Birth Date",
    nationality: "Nationality",
    gender: "Gender",
    male: "Male", female: "Female", other: "Other",
    address: "Current Address",
    country: "Country",
    emirate: "Emirate",
    district: "District / Area",
    otherDistrict: "Other",
    writeDistrict: "Write Area Name",
    street: "Street Name",
    building: "Building Number",
    floor: "Floor",
    apartment: "Apartment Number",
    state: "State / Province",
    nonUaeDistrict: "District / Area",
    attachments: "Attachments & Documents (Upload all required, will be checked before registration)",
    docsRes: [
      { docType: "eidFront", label: "Residence Card (Front)" },
      { docType: "eidBack", label: "Residence Card (Back)" },
      { docType: "passport", label: "Passport Image" }
    ],
    docsNonRes: [
      { docType: "passport", label: "Passport Image" }
    ],
    docsComp: [
      { docType: "ownerIdFront", label: "Owner ID (Front)" },
      { docType: "ownerIdBack", label: "Owner ID (Back)" },
      { docType: "license", label: "Trade License" },
      { docType: "passport", label: "Passport Image" }
    ],
    commSafe: "Contact & Security",
    email: "Email",
    emailConfirm: "Confirm Email",
    sendOtp: "Send Verification Code",
    otpSent: "Verification code sent to your email",
    verifying: "Verifying...",
    enterCode: "Enter the code sent to your email",
    verify: "Verify Email",
    verified: "Email Verified ✔",
    wrongOtp: "Incorrect or expired code",
    resend: "Resend Code",
    mustVerifyEmail: "You must verify your email first",
    password: "Password",
    passwordConfirm: "Confirm Password",
    phoneCode: "Country Code",
    phone: "Phone Number",
    agreeTerms: "I agree to the Terms & Conditions",
    agreePrivacy: "I agree to the Privacy Policy",
    agreeEAuth: "I agree to the e-Authorization",
    register: "Register New Account",
    registering: "Registering...",
    registered: "Account registered successfully!",
    logoAlt: "TAHEEL LOGO",
    platform: "TAHEEL",
    platformDesc: "Certified platform for government information & transactions",
    platformMore: "A smart platform powered by AI and modern technologies to follow up and complete government transactions. Your data is protected with the highest encryption standards, with direct support and an easy interface for all users.",
    rights: `© ${new Date().getFullYear()} TAHEEL. All rights reserved - Dubai`,
    choose: "-- Choose --",
    company: "Company",
    resident: "Resident",
    nonresident: "Non Resident",
    regError: "Registration error occurred"
  }
};

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState(searchParams.get("lang") === "en" ? "en" : "ar");
  const t = LANGUAGES[lang];

  const { executeRecaptcha } = useGoogleReCaptcha();

  const UAE_EMIRATES = [
    { value: "dubai", label: lang === "ar" ? "دبي" : "Dubai" },
    { value: "abudhabi", label: lang === "ar" ? "أبوظبي" : "Abu Dhabi" },
    { value: "sharjah", label: lang === "ar" ? "الشارقة" : "Sharjah" },
    { value: "ajman", label: lang === "ar" ? "عجمان" : "Ajman" },
    { value: "ummalquwain", label: lang === "ar" ? "أم القيوين" : "Umm Al Quwain" },
    { value: "rasalkhaimah", label: lang === "ar" ? "رأس الخيمة" : "Ras Al Khaimah" },
    { value: "fujairah", label: lang === "ar" ? "الفجيرة" : "Fujairah" },
  ];
  const GENDERS = [
    { value: "male", label: t.male },
    { value: "female", label: t.female },
    { value: "other", label: t.other }
  ];
  const ACCOUNT_TYPES = [
    { value: "resident", label: t.resident },
    { value: "nonresident", label: t.nonresident },
    { value: "company", label: t.company },
  ];

  const REQUIRED_DOCS = {
    resident: t.docsRes,
    nonresident: t.docsNonRes,
    company: t.docsComp,
  };

  const [form, setForm] = useState({
    accountType: "",
    firstName: "",
    middleName: "",
    lastName: "",
    nameEn: "",
    birthDate: "",
    nationality: "",
    gender: "",
    country: "",
    emirate: "",
    district: "",
    districtCustom: "",
    state: "",
    nonUaeDistrict: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    companyNameAr: "",
    companyNameEn: "",
    ownerName: "",
    idExpiry: "",
    passportExpiry: "",
    licenseExpiry: "",
    ownerIdExpiry: "",
    eidNumber: "",
    passportNumber: "",
    licenseNumber: "",
    ownerIdNumber: "",
    email: "",
    emailConfirm: "",
    phone: "",
    phoneCode: "+971",
    password: "",
    passwordConfirm: "",
    agreeTerms: false,
    agreePrivacy: false,
    agreeEAuth: false,
    recaptchaToken: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showPassC, setShowPassC] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [docs, setDocs] = useState({});
  const [docsStatus, setDocsStatus] = useState({});
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // حالات تفعيل الإيميل
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpVerifying, setEmailOtpVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSentMsg, setOtpSentMsg] = useState("");

  const isUae = form.country === "ae" || form.country === "uae";
  const selectedEmirate = form.emirate;

  const districtOptions = [
    ...(UAE_DISTRICTS[selectedEmirate] || []).map(d => ({ value: d, label: d })),
    { value: "__other", label: t.otherDistrict }
  ];

  // دالة handleChange: تدعم onChange من react-select كـ ({ name, value })
  const handleChange = useCallback((e) => {
    let name, value, type, checked, files;

    if (e && e.target) {
      ({ name, value, type, checked, files } = e.target);

      // رقم التليفون: أرقام فقط
      if (name === "phone") value = formatPhone(value);

      // رقم الإقامة: فورمات تلقائي
      if (name === "eidNumber") value = formatEID(value);

      // كلمة السر: لا تفقد التركيز بعد أول حرف (لا حاجة لتغيير)
    } else if (e && e.name && e.value !== undefined) {
      name = e.name;
      value = e.value;
      type = "custom";
    } else {
      return;
    }

    const newValue = type === "checkbox" ? checked : type === "file" ? files[0] : value;

    setForm(prev => {
      const updated = { ...prev };
      updated[name] = newValue;

      // عند تغيير الإيميل أو تأكيد الإيميل يرجع حالة otp
      if (name === "email" || name === "emailConfirm") {
        setEmailOtpSent(false);
        setEmailVerified(false);
        setOtpError("");
        setOtpSentMsg("");
        setEmailOtpCode("");
      }

      if (name === "district" && value !== "__other") updated.districtCustom = "";
      if (name === "emirate") {
        updated.district = "";
        updated.districtCustom = "";
      }
      if (name === "country") {
        updated.emirate = "";
        updated.district = "";
        updated.state = "";
        updated.nonUaeDistrict = "";
        updated.districtCustom = "";
      }

      return updated;
    });
  }, []);

  const handleDocVerified = (docType, data) => {
    setDocs((prev) => ({ ...prev, [docType]: data }));
    setDocsStatus((prev) => ({ ...prev, [docType]: true }));
  };
  const handleDocFailed = (docType) => {
    setDocsStatus((prev) => ({ ...prev, [docType]: false }));
  };

  // تحقق توافق الإيميلين + تحقق صحة الإيميل
  const emailsMatch = form.email && form.email === form.emailConfirm && validateEmail(form.email);

  // إرسال كود التحقق
  const handleSendOtp = async () => {
    setOtpError("");
    setOtpSentMsg("");
    setEmailOtpVerifying(true);

    if (!validateEmail(form.email)) {
      setOtpError(lang === "ar" ? "يرجى إدخال بريد إلكتروني صحيح" : "Enter a valid email");
      setEmailOtpVerifying(false);
      return;
    }
    const res = await sendVerificationCode(form.email);
    setEmailOtpVerifying(false);
    if (res.success) {
      setEmailOtpSent(true);
      setOtpSentMsg(t.otpSent);
    } else {
      setOtpError(t.regError);
    }
  };

  // تحقق الكود
  const handleVerifyCode = async () => {
    setOtpError("");
    setEmailOtpVerifying(true);
    const res = await verifyCode(form.email, emailOtpCode);
    setEmailOtpVerifying(false);
    if (res.success) {
      setEmailVerified(true);
      setOtpSentMsg("");
    } else {
      setOtpError(t.wrongOtp);
    }
  };

  // تحقق جميع الشروط قبل التسجيل
  const canRegister = (() => {
    const req = REQUIRED_DOCS[form.accountType] || [];
    if (!form.agreeTerms || !form.agreePrivacy || !form.agreeEAuth) return false;
    if (!form.email || !emailsMatch) return false;
    if (!validatePassword(form.password) || form.password !== form.passwordConfirm) return false;
    if (!emailVerified) return false;
    if (req.length === 0) return false;
    if ((form.accountType === "resident" && form.eidNumber.replace(/-/g, "").length !== 15) ||
        (form.accountType === "resident" && !/^784-\d{4}-\d{7}-\d{1}$/.test(form.eidNumber))) return false;
    if (form.phone.length < 8) return false;
    return req.every(doc => docsStatus[doc.docType]);
  })();

  // دمج reCAPTCHA في عملية التسجيل
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    setRegSuccess(false);

    try {
      if (!executeRecaptcha) {
        setRegError("reCAPTCHA لم يتم تحميله بعد، أعد تحميل الصفحة أو حاول مرة أخرى");
        setRegLoading(false);
        return;
      }

      const recaptchaToken = await executeRecaptcha("register");

      const captchaRes = await fetch("/api/recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: recaptchaToken }),
      });
      const captchaData = await captchaRes.json();
      if (!captchaData.success) {
        setRegError("فشل التحقق من الكابتشا");
        setRegLoading(false);
        return;
      }

      // أكمل التسجيل بعد نجاح الكابتشا
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userId = cred.user.uid;
      const userObj = {
        ...form,
        userId,
        documents: Object.values(docs).map(d => ({
          documentId: d.documentId,
          type: d.docType,
          url: d.url,
          uploadedAt: d.uploadedAt,
        })),
        registeredAt: new Date().toISOString(),
        role: "client",
        type: form.accountType
      };
      // لا ترسل كلمة السر ل firestore
      delete userObj.password;
      delete userObj.passwordConfirm;

      await setDoc(doc(firestore, "users", userId), userObj, { merge: true });

      for (const d of Object.values(docs)) {
        await setDoc(doc(firestore, "documents", d.documentId), {
          ...d,
          ownerId: userId,
          uploadedBy: userId,
        }, { merge: true });
      }

      setRegSuccess(true);
    } catch (err) {
      setRegError(err?.message || t.regError);
    }
    setRegLoading(false);
  };

  function handleLang(lng) {
    setLang(lng);
    const params = new URLSearchParams(searchParams);
    params.set("lang", lng);
    router.replace(`?${params.toString()}`);
  }

  // حقل الباسورد المحسن
  const PasswordField = ({ label, name, value, show, toggle }) => (
    <div className="flex flex-col gap-1 relative">
      <label htmlFor={name} className="font-semibold text-gray-800 leading-5">{label}</label>
      <input
        id={name}
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={toggle.inputChange}
        className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all pr-10 shadow-sm"
        autoComplete="new-password"
      />
      <button
        type="button"
        className="absolute top-8 left-2 text-emerald-400"
        tabIndex={-1}
        onClick={toggle.toggleShow}
        style={{ cursor: "pointer" }}
      >
        {show ? <FaEyeSlash /> : <FaEye />}
      </button>
      {/* تحقق قوة كلمة السر */}
      {name === "password" && value && !validatePassword(value) && (
        <div className="text-xs text-red-600 font-bold mt-1">
          {lang === "ar"
            ? "يجب أن تحتوي كلمة المرور على حرف كبير، رقم، رمز وطول 8 أحرف أو أكثر"
            : "Password must contain an uppercase letter, a number, a symbol, and be at least 8 characters"}
        </div>
      )}
    </div>
  );

  const Select = ({ label, name, options, value, onChange, ...rest }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-semibold text-gray-800 leading-5">{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={e => onChange({ name, value: e.target.value })}
        className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all shadow-sm"
        dir={lang === "ar" ? "rtl" : "ltr"}
        {...rest}
      >
        <option value="">{t.choose}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderDocsFields = () => {
    const req = REQUIRED_DOCS[form.accountType] || [];
    return (
      <div className={`grid gap-5 ${form.accountType === "company" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {req.map(doc =>
          <DocumentUploadField
            key={doc.docType}
            sessionId={sessionId}
            docType={doc.docType}
            label={doc.label}
            lang={lang}
            onVerified={data => handleDocVerified(doc.docType, data)}
            onFailed={() => handleDocFailed(doc.docType)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0b131e] via-[#22304a] to-[#1d4d40] font-sans relative overflow-x-hidden"
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* زر تغيير اللغة */}
      <div className="absolute left-4 top-4 z-20 flex gap-2">
        <button
          className={`px-3 py-1 rounded-md text-xs font-bold shadow ${lang === "ar" ? "bg-emerald-500 text-white" : "bg-white text-emerald-700"} transition`}
          onClick={() => handleLang("ar")}
          tabIndex={0}
          style={{ cursor: "pointer" }}
        >
          العربية
        </button>
        <button
          className={`px-3 py-1 rounded-md text-xs font-bold shadow ${lang === "en" ? "bg-emerald-500 text-white" : "bg-white text-emerald-700"} transition`}
          onClick={() => handleLang("en")}
          tabIndex={0}
          style={{ cursor: "pointer" }}
        >
          English
        </button>
      </div>
      <main className="flex flex-col items-center justify-center flex-1 py-10 px-2">
        <form
          className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl px-4 sm:px-10 py-8 flex flex-col gap-10 border border-emerald-200 animate-fade-in"
          style={{ minWidth: 320 }}
          onSubmit={handleRegister}
        >
          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              className="text-emerald-700 font-bold underline text-sm hover:text-emerald-900 transition"
              onClick={() => router.replace(`/?lang=${lang}`)}
              style={{ cursor: "pointer" }}
            >
              {t.back}
            </button>
          </div>
          <div className="flex flex-col items-center gap-1 mb-2">
            <Image src="/logo-transparent-large.png" width={60} height={60} alt={t.logoAlt} className="rounded-full shadow ring-2 ring-emerald-400 bg-white" />
            <h2 className="font-extrabold text-2xl sm:text-3xl text-emerald-800 mt-2 text-center tracking-tight drop-shadow">
              {t.createAccount}
            </h2>
          </div>
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-5 flex flex-col gap-8">
            <h3 className="font-extrabold text-emerald-700 mb-3 text-lg flex items-center gap-2">
              <span>{t.mainInfo}</span>
              <span className="flex-1 border-b border-emerald-200 opacity-30"></span>
            </h3>
            <Select label={t.accountType} name="accountType" options={ACCOUNT_TYPES} value={form.accountType} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label={t.firstName} name="firstName" value={form.firstName} placeholder={t.firstName} onChange={handleChange} lang={lang} />
              <Field label={t.middleName} name="middleName" value={form.middleName} placeholder={t.middleName} onChange={handleChange} lang={lang} />
              <Field label={t.lastName} name="lastName" value={form.lastName} placeholder={t.lastName} onChange={handleChange} lang={lang} />
            </div>
            <Field label={t.nameEn} name="nameEn" value={form.nameEn} placeholder={t.nameEn} onChange={handleChange} lang={lang} />
            <Field label={t.birthDate} name="birthDate" type="date" value={form.birthDate} onChange={handleChange} lang={lang} />
            {/* ======= حقول رقم الإقامة/الباسبور/الرخصة حسب نوع الحساب ======= */}
            {form.accountType === "resident" && (
              <>
                <Field
                  label={lang === "ar" ? "رقم الإقامة" : "Residence ID Number"}
                  name="eidNumber"
                  value={form.eidNumber}
                  placeholder={lang === "ar" ? "784-0000-0000000-0" : "784-0000-0000000-0"}
                  onChange={handleChange}
                  lang={lang}
                  required
                  maxLength={19}
                />
                <Field
                  label={lang === "ar" ? "تاريخ انتهاء الإقامة" : "Residence Expiry Date"}
                  name="idExpiry"
                  type="date"
                  value={form.idExpiry}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "رقم الباسبور" : "Passport Number"}
                  name="passportNumber"
                  value={form.passportNumber}
                  placeholder={lang === "ar" ? "رقم الباسبور" : "Passport Number"}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "تاريخ انتهاء الباسبور" : "Passport Expiry Date"}
                  name="passportExpiry"
                  type="date"
                  value={form.passportExpiry}
                  onChange={handleChange}
                  lang={lang}
                />
              </>
            )}
            {form.accountType === "nonresident" && (
              <>
                <Field
                  label={lang === "ar" ? "رقم الباسبور" : "Passport Number"}
                  name="passportNumber"
                  value={form.passportNumber}
                  placeholder={lang === "ar" ? "رقم الباسبور" : "Passport Number"}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "تاريخ انتهاء الباسبور" : "Passport Expiry Date"}
                  name="passportExpiry"
                  type="date"
                  value={form.passportExpiry}
                  onChange={handleChange}
                  lang={lang}
                />
              </>
            )}
            {form.accountType === "company" && (
              <>
                <Field
                  label={lang === "ar" ? "رقم هوية صاحب الشركة" : "Owner ID Number"}
                  name="ownerIdNumber"
                  value={form.ownerIdNumber}
                  placeholder={lang === "ar" ? "رقم هوية صاحب الشركة" : "Owner ID Number"}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "تاريخ انتهاء هوية صاحب الشركة" : "Owner ID Expiry Date"}
                  name="ownerIdExpiry"
                  type="date"
                  value={form.ownerIdExpiry}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "رقم الرخصة" : "License Number"}
                  name="licenseNumber"
                  value={form.licenseNumber}
                  placeholder={lang === "ar" ? "رقم الرخصة" : "License Number"}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "تاريخ انتهاء الرخصة" : "License Expiry Date"}
                  name="licenseExpiry"
                  type="date"
                  value={form.licenseExpiry}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "رقم الباسبور" : "Passport Number"}
                  name="passportNumber"
                  value={form.passportNumber}
                  placeholder={lang === "ar" ? "رقم الباسبور" : "Passport Number"}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field
                  label={lang === "ar" ? "تاريخ انتهاء الباسبور" : "Passport Expiry Date"}
                  name="passportExpiry"
                  type="date"
                  value={form.passportExpiry}
                  onChange={handleChange}
                  lang={lang}
                />
              </>
            )}

            <CountrySelect
              value={form.nationality}
              onChange={opt => handleChange({ name: "nationality", value: opt?.value })}
            />
            <Select label={t.gender} name="gender" options={GENDERS} value={form.gender} onChange={handleChange} />
          </section>
          <section className="rounded-2xl border border-sky-100 bg-sky-50/30 px-4 py-5 flex flex-col gap-8">
            <h3 className="font-extrabold text-sky-700 mb-3 text-lg flex items-center gap-2">
              <span>{t.address}</span>
              <span className="flex-1 border-b border-sky-200 opacity-30"></span>
            </h3>
            {(form.accountType === "resident" || form.accountType === "company") ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Select
                  label={t.emirate}
                  name="emirate"
                  options={UAE_EMIRATES}
                  value={form.emirate}
                  onChange={handleChange}
                />
                <Field
                  label={lang === "ar" ? "الحي أو المنطقة" : "District / Area"}
                  name="district"
                  value={form.district}
                  placeholder={lang === "ar" ? "اكتب اسم الحي أو المنطقة" : "Enter district or area name"}
                  onChange={handleChange}
                  lang={lang}
                />
                <Field label={t.street} name="street" value={form.street} placeholder={t.street} onChange={handleChange} lang={lang} />
                <Field label={t.building} name="building" value={form.building} placeholder={t.building} onChange={handleChange} lang={lang} />
                <Field label={t.floor} name="floor" value={form.floor} placeholder={t.floor} onChange={handleChange} lang={lang} />
                <Field label={t.apartment} name="apartment" value={form.apartment} placeholder={t.apartment} onChange={handleChange} lang={lang} />
              </div>
            ) : (
              <>
                <CountrySelect
                  value={form.country}
                  onChange={opt => handleChange({ name: "country", value: opt?.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label={lang === "ar" ? "الحي أو المنطقة" : "District / Area"}
                    name="district"
                    value={form.district}
                    placeholder={lang === "ar" ? "اكتب اسم الحي أو المنطقة" : "Enter district or area name"}
                    onChange={handleChange}
                    lang={lang}
                  />
                  <Field label={t.state} name="state" value={form.state} placeholder={t.state} onChange={handleChange} lang={lang} />
                  <Field label={t.street} name="street" value={form.street} placeholder={t.street} onChange={handleChange} lang={lang} />
                  <Field label={t.building} name="building" value={form.building} placeholder={t.building} onChange={handleChange} lang={lang} />
                  <Field label={t.apartment} name="apartment" value={form.apartment} placeholder={t.apartment} onChange={handleChange} lang={lang} />
                </div>
              </>
            )}
          </section>
          {form.accountType && (
            <section className="rounded-2xl border border-yellow-100 bg-yellow-50/30 px-4 py-5 flex flex-col gap-8">
              <h3 className="font-extrabold text-yellow-700 mb-3 text-lg flex items-center gap-2">
                <span>{t.attachments}</span>
                <span className="flex-1 border-b border-yellow-200 opacity-30"></span>
              </h3>
              {renderDocsFields()}
            </section>
          )}
          <section className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-5 flex flex-col gap-8">
            <h3 className="font-extrabold text-gray-700 mb-3 text-lg flex items-center gap-2">
              <span>{t.commSafe}</span>
              <span className="flex-1 border-b border-gray-200 opacity-30"></span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* حقلا الإيميل وتأكيده */}
              <Field
                label={t.email}
                name="email"
                type="email"
                value={form.email}
                placeholder={t.email}
                onChange={handleChange}
                lang={lang}
              />
              <Field
                label={t.emailConfirm}
                name="emailConfirm"
                type="email"
                value={form.emailConfirm}
                placeholder={t.emailConfirm}
                onChange={handleChange}
                lang={lang}
              />
            </div>
            {/* زر إرسال كود التفعيل */}
            {emailsMatch && !emailVerified && (
              <div className="flex flex-row items-center gap-2 mt-2">
                <button
                  type="button"
                  className="rounded bg-emerald-600 text-white font-bold px-3 py-1 shadow hover:bg-emerald-700 transition text-sm"
                  onClick={handleSendOtp}
                  disabled={emailOtpVerifying}
                  style={{ cursor: emailOtpVerifying ? "wait" : "pointer", minWidth: 95 }}
                >
                  {emailOtpVerifying ? (
                    <span className="animate-pulse">{t.verifying}</span>
                  ) : (
                    <span>{t.sendOtp}</span>
                  )}
                </button>
                {otpSentMsg && <span className="text-green-600 text-xs">{otpSentMsg}</span>}
                {otpError && <span className="text-red-600 text-xs">{otpError}</span>}
              </div>
            )}

            {/* مربع إدخال الكود وزر التحقق (على سطر واحد) */}
            {emailOtpSent && !emailVerified && (
              <div className="flex flex-row items-center gap-2 mt-2">
                <input
                  type="text"
                  value={emailOtpCode}
                  onChange={e => setEmailOtpCode(e.target.value)}
                  placeholder={t.enterCode}
                  className="rounded-lg border px-3 py-1 bg-black text-white font-bold tracking-widest sm:text-base text-center w-20 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  maxLength={6}
                  style={{ letterSpacing: 4, direction: "ltr" }}
                />
                <button
                  type="button"
                  className="rounded bg-emerald-600 text-white font-bold px-3 py-1 shadow hover:bg-emerald-700 transition text-sm"
                  onClick={handleVerifyCode}
                  disabled={emailOtpVerifying}
                  style={{ cursor: emailOtpVerifying ? "wait" : "pointer", minWidth: 75 }}
                >
                  {emailOtpVerifying ? t.verifying : t.verify}
                </button>
                <button
                  type="button"
                  className="text-xs underline text-emerald-700 ml-1"
                  onClick={handleSendOtp}
                  style={{ cursor: "pointer" }}
                >
                  {t.resend}
                </button>
                {otpError && <span className="text-red-600 text-xs">{otpError}</span>}
              </div>
            )}
            {emailVerified && (
              <div className="text-green-700 font-bold flex items-center gap-2 mt-2">
                <span>{t.verified}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <PasswordField
                label={t.password}
                name="password"
                value={form.password}
                show={showPass}
                toggle={{
                  toggleShow: () => setShowPass(s => !s),
                  inputChange: (e) => handleChange(e),
                }}
              />
              <PasswordField
                label={t.passwordConfirm}
                name="passwordConfirm"
                value={form.passwordConfirm}
                show={showPassC}
                toggle={{
                  toggleShow: () => setShowPassC(s => !s),
                  inputChange: (e) => handleChange(e),
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="font-semibold text-gray-800">{t.phoneCode}</label>
                <PhoneCodeSelect
                  value={form.phoneCode}
                  onChange={opt => handleChange({ name: "phoneCode", value: opt?.value })}
                />
              </div>
              <div className="col-span-2">
                <Field label={t.phone} name="phone" type="tel" value={form.phone} placeholder={t.phone} onChange={handleChange} lang={lang} />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <label className="flex gap-2 items-center text-sm text-gray-900 font-semibold">
                <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange}
                  className="scale-125 accent-emerald-500" />
                {t.agreeTerms}
              </label>
              <label className="flex gap-2 items-center text-sm text-gray-900 font-semibold">
                <input type="checkbox" name="agreePrivacy" checked={form.agreePrivacy} onChange={handleChange}
                  className="scale-125 accent-emerald-500" />
                {t.agreePrivacy}
              </label>
              <label className="flex gap-2 items-center text-sm text-gray-900 font-semibold">
                <input type="checkbox" name="agreeEAuth" checked={form.agreeEAuth} onChange={handleChange}
                  className="scale-125 accent-emerald-500" />
                {t.agreeEAuth}
              </label>
            </div>
          </section>
          {regError && <div className="text-red-600 font-bold">{regError}</div>}
          <button
            type="submit"
            className={`w-full py-3 rounded-2xl text-lg font-bold bg-gradient-to-r from-emerald-700 via-emerald-500 to-green-700 text-white hover:brightness-110 hover:scale-[1.01] shadow-lg transition mt-2 ${!canRegister || regLoading ? "opacity-60 cursor-not-allowed" : ""}`}
            style={{ cursor: (!canRegister || regLoading) ? "not-allowed" : "pointer" }}
            disabled={!canRegister || regLoading}
          >
            {regLoading ? t.registering : t.register}
          </button>
          {regSuccess && <div className="text-green-700 font-bold mt-2">{t.registered}</div>}
        </form>
      </main>
      <footer className="bg-[#192233] text-gray-200 pt-8 pb-4 px-2 mt-10 rounded-t-3xl shadow-lg border-t border-[#22304a]">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
          <Image src="/logo-transparent-large.png" alt={t.logoAlt} width={42} height={42}
            className="rounded-full bg-white p-1 ring-2 ring-emerald-400 shadow w-10 h-10" />
          <h3 className="text-lg font-extrabold text-emerald-400 mb-1">{t.platform}</h3>
          <span className="text-xs font-bold text-emerald-300 mb-2">{t.platformDesc}</span>
          <div className="text-gray-400 text-xs leading-relaxed text-center max-w-sm">
            {t.platformMore}
          </div>
          <div className="mt-3 text-xs text-gray-400">{t.rights}</div>
        </div>
      </footer>
    </div>
  );
}
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}