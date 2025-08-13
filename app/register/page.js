'use client';

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import {
  setDoc,
  doc as firestoreDoc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "firebase/auth";
import { firestore as db, auth } from "@/lib/firebase.client";

import ClientTypeStep from "@/components/register/ClientTypeStep";
import PersonalInfoStep from "@/components/register/PersonalInfoStep";
import AddressStep from "@/components/register/AddressStep";
import DocumentsStep from "@/components/register/DocumentsStep";
import ContactStep from "@/components/register/ContactStep";

// اللغات
const LANGUAGES = {
  ar: {
    accountType: "نوع الحساب",
    resident: "مقيم",
    nonresident: "غير مقيم",
    company: "شركة",
    choose: "-- اختر --",
    createAccount: "إنشاء حساب",
    logoAlt: "شعار تأهيل",
    platform: "تأهيل",
    platformDesc: "منصة معتمدة لمتابعة المعلومات والمعاملات الحكومية",
    platformMore: "منصة ذكية تعتمد على الذكاء الاصطناعي والتقنيات الحديثة في متابعة وإنجاز المعاملات الحكومية.",
    rights: `© ${new Date().getFullYear()} تأهيل. جميع الحقوق محفوظة - دبي`,
    back: "الرجوع للموقع"
  },
  en: {
    accountType: "Account Type",
    resident: "Resident",
    nonresident: "Non Resident",
    company: "Company",
    choose: "-- Choose --",
    createAccount: "Create Account",
    logoAlt: "TAHEEL LOGO",
    platform: "TAHEEL",
    platformDesc: "Certified platform for government information & transactions",
    platformMore: "A smart platform powered by AI and modern technologies to follow up and complete government transactions.",
    rights: `© ${new Date().getFullYear()} TAHEEL. All rights reserved - Dubai`,
    back: "Back to site"
  }
};

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang") === "en" ? "en" : "ar";
  const [lang, setLang] = useState(langParam);
  const t = LANGUAGES[lang];
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const ACCOUNT_TYPES = [
    { value: "resident", label: t.resident },
    { value: "nonresident", label: t.nonresident },
    { value: "company", label: t.company },
  ];

  const [form, setForm] = useState({
    accountType: "",
    firstName: "",
    middleName: "",
    lastName: "",
    nameEn: "",
    birthDate: "",
    gender: "",
    nationality: "",
    eidNumber: "",
    companyNameAr: "",
    companyNameEn: "",
    companyLicenseNumber: "",
    companyRegistrationDate: "",
    ownerFirstName: "",
    ownerMiddleName: "",
    ownerLastName: "",
    ownerBirthDate: "",
    ownerGender: "",
    ownerNationality: "",
    emirate: "",
    district: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    country: "",
    city: "",
    state: "",
    documents: {},
    email: "",
    emailConfirm: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    phoneCode: "+971",
    agreeTerms: false,
    agreePrivacy: false,
    agreeEAuth: false,
    createdAt: "",
  });

  const [step, setStep] = useState(0);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleChange = useCallback((data) => {
    setForm(prev => ({ ...prev, ...data }));
  }, []);

  function handleLang(lng) {
    setLang(lng);
    const params = new URLSearchParams();
    params.set("lang", lng);
    router.replace(`?${params.toString()}`);
  }

  // التسجيل الآمن والمتكامل
  const handleRegister = async () => {
    setRegError(""); setRegLoading(true);

    try {
      const email = form.email.trim().toLowerCase();

      // 1. حجز رقم العميل من السيرفر
      const reserveRes = await fetch("/api/reserve-customer-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: form.accountType })
      });
      const reserveJson = await reserveRes.json();
      if (!reserveRes.ok || !reserveJson.customerId) {
        throw new Error("customerId_failed");
      }
      const customerId = reserveJson.customerId;

      // 2. تحقق reCAPTCHA سيرفر سايد
      const recaptchaToken = await executeRecaptcha?.("register");
      const recaptchaRes = await fetch("/api/recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: recaptchaToken })
      });
      if (!recaptchaRes.ok) throw new Error("recaptcha_failed");

      // 3. أنشئ المستخدم في Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email, form.password);
      const user = cred.user;

      // 4. إرسال تفعيل البريد لو تستخدم Firebase Auth
      await sendEmailVerification(user);

      // 5. حذف الحقول المؤقتة قبل الحفظ
      const { password, passwordConfirm, emailConfirm, ...safeForm } = form;
      await setDoc(
        firestoreDoc(db, "users", user.uid),
        {
          ...safeForm,
          email,
          customerId,
          role: "client",
          accountType: form.accountType?.toLowerCase(),
          type: form.accountType?.toLowerCase(),
          emailVerified: false, // true لو بتفعل بالـ OTP على السيرفر
          phoneVerified: false,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setRegSuccess(true);
      setTimeout(() => router.push(`/verify-email?lang=${lang}`), 1000);

    } catch (err) {
      const m = (code => {
        switch (code) {
          case "auth/email-already-in-use": return lang==="ar"?"هذا البريد مستخدم بالفعل.":"Email already in use.";
          case "auth/weak-password": return lang==="ar"?"كلمة المرور ضعيفة.":"Weak password.";
          case "auth/invalid-email": return lang==="ar"?"بريد غير صالح.":"Invalid email.";
          case "recaptcha_failed": return lang==="ar"?"فشل التحقق من reCAPTCHA.":"reCAPTCHA failed.";
          case "customerId_failed": return lang==="ar"?"خطأ في حجز رقم العميل، حاول مرة أخرى.":"Customer ID reservation failed.";
          default: return lang==="ar"?"حدث خطأ أثناء تسجيل الحساب، حاول مرة أخرى.":"An error occurred during registration.";
        }
      })(err?.code || err?.message);
      setRegError(m);
    }

    setRegLoading(false);
  };

  const steps = [
    <ClientTypeStep
      key="step-0"
      value={form.accountType}
      onChange={type => handleChange({ accountType: type })}
      options={ACCOUNT_TYPES}
      lang={lang}
      t={t}
      onNext={() => setStep(1)}
    />,
    <PersonalInfoStep
      key="step-1"
      form={form}
      onChange={handleChange}
      lang={lang}
      t={t}
      onNext={() => setStep(2)}
      onBack={() => {
        setForm(prev => ({ ...prev, accountType: "" }));
        setStep(0);
      }}
    />,
    <AddressStep
      key="step-2"
      form={form}
      onChange={handleChange}
      lang={lang}
      t={t}
      onNext={() => setStep(3)}
      onBack={() => setStep(1)}
    />,
    <DocumentsStep
      key="step-3"
      form={form}
      onChange={handleChange}
      lang={lang}
      t={t}
      onNext={() => setStep(4)}
      onBack={() => setStep(2)}
    />,
    <ContactStep
      key="step-4"
      form={form}
      onChange={handleChange}
      lang={lang}
      t={t}
      onRegister={handleRegister}
      onBack={() => setStep(3)}
    />
  ];

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
        <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl px-4 sm:px-10 py-8 flex flex-col gap-10 border border-emerald-200 animate-fade-in"
          style={{ minWidth: 320 }}
        >
          <div className="flex flex-col items-center gap-1 mb-2">
            <Image src="/logo-transparent-large.png" width={60} height={60} alt={t.logoAlt} className="rounded-full shadow ring-2 ring-emerald-400 bg-white" />
            <h2 className="font-extrabold text-2xl sm:text-3xl text-emerald-800 mt-2 text-center tracking-tight drop-shadow">
              {t.createAccount}
            </h2>
          </div>
          {steps[step]}
          {regError && (
            <div className="text-red-600 font-bold text-center mt-2">{regError}</div>
          )}
          {regLoading && (
            <div className="text-emerald-600 font-bold text-center mt-2">{lang === "ar" ? "جاري التسجيل..." : "Registering..."}</div>
          )}
          {regSuccess && (
            <div className="text-green-600 font-bold text-center mt-2">{lang === "ar" ? "تم التسجيل بنجاح!" : "Registration successful!"}</div>
          )}
        </div>
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