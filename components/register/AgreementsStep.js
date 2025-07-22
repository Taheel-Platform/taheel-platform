'use client';

import React from "react";

export default function AgreementStep({ form, onChange, lang, t, onNext, onBack }) {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <h3 className="font-extrabold text-emerald-700 text-lg mb-4">
        {lang === "ar" ? "الموافقات والشروط" : "Agreements & Terms"}
      </h3>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={form.agreeTerms}
            onChange={e => onChange({ agreeTerms: e.target.checked })}
            className="scale-125 accent-emerald-600"
          />
          {t.agreeTerms}
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            name="agreePrivacy"
            checked={form.agreePrivacy}
            onChange={e => onChange({ agreePrivacy: e.target.checked })}
            className="scale-125 accent-emerald-600"
          />
          {t.agreePrivacy}
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            name="agreeEAuth"
            checked={form.agreeEAuth}
            onChange={e => onChange({ agreeEAuth: e.target.checked })}
            className="scale-125 accent-emerald-600"
          />
          {t.agreeEAuth}
        </label>
      </div>
      <div className="flex gap-4 mt-6">
        <button
          type="button"
          className="bg-gray-300 text-gray-800 px-5 py-2 rounded-xl font-bold shadow hover:bg-gray-400 transition"
          onClick={onBack}
        >
          {lang === "ar" ? "رجوع" : "Back"}
        </button>
        <button
          type="button"
          className={`bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow hover:bg-emerald-700 transition ${
            !(form.agreeTerms && form.agreePrivacy && form.agreeEAuth) ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={onNext}
          disabled={!(form.agreeTerms && form.agreePrivacy && form.agreeEAuth)}
        >
          {lang === "ar" ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}