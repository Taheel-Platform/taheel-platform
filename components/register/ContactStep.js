'use client';

import { useState } from "react";
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import PhoneCodeSelect from "@/components/PhoneCodeSelect";

// Email validation
function validateEmail(email) {
  if (typeof email !== "string") return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// Password validation
function validatePassword(password) {
  if (typeof password !== "string") return false;
  return (
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) &&
    password.length >= 8
  );
}

export default function ContactStep({
  form,
  onChange,
  lang = "ar",
  t,
  emailVerified,
  emailOtpSent,
  emailOtpCode,
  emailOtpVerifying,
  otpError,
  otpSentMsg,
  emailsMatch,
  handleSendOtp,
  handleVerifyCode,
  setEmailOtpCode,
  showPass,
  showPassC,
  setShowPass,
  setShowPassC,
}) {
  const [localPhone, setLocalPhone] = useState(form.phone || "");

  // UI constants
  const textAlign = lang === "ar" ? "text-right" : "text-left";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-5 flex flex-col gap-8" dir={dir}>
      <h3 className="font-extrabold text-gray-700 mb-3 text-lg flex items-center gap-2">
        <span>{t.commSafe}</span>
        <span className="flex-1 border-b border-gray-200 opacity-30"></span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1">
          <label className={`font-semibold text-gray-800 ${textAlign}`}>{t.email}</label>
          <input
            type="email"
            name="email"
            value={form.email || ""}
            onChange={onChange}
            className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all placeholder:text-gray-400 shadow-sm"
            placeholder={t.email}
            dir={dir}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={`font-semibold text-gray-800 ${textAlign}`}>{t.emailConfirm}</label>
          <input
            type="email"
            name="emailConfirm"
            value={form.emailConfirm || ""}
            onChange={onChange}
            className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all placeholder:text-gray-400 shadow-sm"
            placeholder={t.emailConfirm}
            dir={dir}
            autoComplete="email"
          />
        </div>
      </div>
      {/* Email Verification */}
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
      {emailOtpSent && !emailVerified && (
        <div className="flex flex-row items-center gap-2 mt-2">
          <input
            type="text"
            value={emailOtpCode || ""}
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
          <FaCheckCircle className="text-green-500 text-base" />
          <span>{t.verified}</span>
        </div>
      )}
      {/* Password fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1">
          <label className={`font-semibold text-gray-800 ${textAlign}`}>{t.password}</label>
          <input
            type={showPass ? "text" : "password"}
            name="password"
            value={form.password || ""}
            onChange={onChange}
            className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all placeholder:text-gray-400 shadow-sm"
            placeholder={t.password}
            dir={dir}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="text-xs text-emerald-600 underline mt-1 self-end"
            onClick={() => setShowPass(s => !s)}
          >
            {showPass ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "إظهار" : "Show")}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`font-semibold text-gray-800 ${textAlign}`}>{t.passwordConfirm}</label>
          <input
            type={showPassC ? "text" : "password"}
            name="passwordConfirm"
            value={form.passwordConfirm || ""}
            onChange={onChange}
            className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all placeholder:text-gray-400 shadow-sm"
            placeholder={t.passwordConfirm}
            dir={dir}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="text-xs text-emerald-600 underline mt-1 self-end"
            onClick={() => setShowPassC(s => !s)}
          >
            {showPassC ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "إظهار" : "Show")}
          </button>
        </div>
      </div>
      {/* Phone fields */}
      <div className="grid grid-cols-3 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-gray-800">{t.phoneCode}</label>
          <PhoneCodeSelect
            value={form.phoneCode}
            onChange={opt => onChange({ target: { name: "phoneCode", value: opt?.value } })}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className={`font-semibold text-gray-800 ${textAlign}`}>{t.phone}</label>
          <input
            name="phone"
            type="tel"
            value={localPhone}
            onChange={e => {
              setLocalPhone(e.target.value.replace(/[^\d]/g, ""));
              onChange({ target: { name: "phone", value: e.target.value.replace(/[^\d]/g, "") } });
            }}
            className="rounded-xl bg-gray-50 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-300 text-gray-900 font-medium px-3 py-2 outline-none transition-all shadow-sm"
            placeholder={t.phone}
            dir={dir}
            autoComplete="tel"
            maxLength={15}
          />
        </div>
      </div>
      {/* Agreements */}
      <div className="flex flex-col gap-2 mt-2">
        <label className="flex gap-2 items-center text-sm text-gray-900 font-semibold">
          <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={onChange}
            className="scale-125 accent-emerald-500" />
          {t.agreeTerms}
        </label>
        <label className="flex gap-2 items-center text-sm text-gray-900 font-semibold">
          <input type="checkbox" name="agreePrivacy" checked={form.agreePrivacy} onChange={onChange}
            className="scale-125 accent-emerald-500" />
          {t.agreePrivacy}
        </label>
        <label className="flex gap-2 items-center text-sm text-gray-900 font-semibold">
          <input type="checkbox" name="agreeEAuth" checked={form.agreeEAuth} onChange={onChange}
            className="scale-125 accent-emerald-500" />
          {t.agreeEAuth}
        </label>
      </div>
    </section>
  );
}