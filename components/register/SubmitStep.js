'use client';

import React from "react";

export default function SubmitStep({ onRegister, regError, regLoading, regSuccess, lang, t, onBack }) {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <h3 className="font-extrabold text-emerald-700 text-lg mb-4">
        {lang === "ar" ? "تأكيد التسجيل" : "Submit Registration"}
      </h3>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={`w-full py-3 rounded-2xl text-lg font-bold bg-gradient-to-r from-emerald-700 via-emerald-500 to-green-700 text-white hover:brightness-110 hover:scale-[1.01] shadow-lg transition ${
            regLoading ? "opacity-60 cursor-not-allowed" : ""
          }`}
          onClick={onRegister}
          disabled={regLoading}
        >
          {regLoading ? (t.registering || "جاري التسجيل...") : (t.register || "تسجيل")}
        </button>
        {regError && (
          <div className="text-red-600 font-bold mt-2">{regError}</div>
        )}
        {regSuccess && (
          <div className="text-green-700 font-bold mt-2">{t.registered || "تم التسجيل بنجاح!"}</div>
        )}
        <button
          type="button"
          className="mt-4 bg-gray-300 text-gray-800 px-5 py-2 rounded-xl font-bold shadow hover:bg-gray-400 transition"
          onClick={onBack}
        >
          {lang === "ar" ? "رجوع" : "Back"}
        </button>
      </div>
    </div>
  );
}