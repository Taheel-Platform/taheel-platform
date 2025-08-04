"use client";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

const LANG = {
  ar: {
    title: "الصفحة غير موجودة",
    desc: "عذرًا، الصفحة التي تبحث عنها غير متوفرة أو تم حذفها.",
    back: "العودة للرئيسية",
    code: "خطأ 404",
  },
  en: {
    title: "Page Not Found",
    desc: "Sorry, the page you are looking for does not exist or has been removed.",
    back: "Back to Home",
    code: "Error 404",
  }
};

function getLang() {
  if (typeof window !== "undefined") {
    if (window.location.search.includes("lang=ar")) return "ar";
    if (window.location.search.includes("lang=en")) return "en";
    if (navigator.language && navigator.language.startsWith("ar")) return "ar";
  }
  return "en";
}

function NotFoundContent() {
  const lang = getLang();
  const t = LANG[lang];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0b131e] via-[#22304a] to-[#1d4d40] px-4"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="flex flex-col items-center bg-white/80 rounded-3xl shadow-xl border-2 border-emerald-400 px-8 py-10 max-w-lg w-full">
        <Image
          src="/logo-transparent-large.png"
          alt="Taheel Logo"
          width={80}
          height={80}
          className="mb-4 rounded-full bg-white shadow-lg"
        />
        <div className="text-5xl font-extrabold text-emerald-600 mb-2">{t.code}</div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-800 mb-2">{t.title}</h1>
        <p className="text-gray-700 font-semibold mb-4">{t.desc}</p>
        <Link
          href={lang === "ar" ? "/?lang=ar" : "/?lang=en"}
          className="inline-block mt-2 px-8 py-2 rounded-full bg-emerald-700 text-white font-bold shadow hover:bg-emerald-800 transition"
        >
          {t.back}
        </Link>
      </div>
      <div className="mt-10 text-xs text-gray-300 font-semibold text-center">
        Taheel Platform - تأهيل &copy; {new Date().getFullYear()}
      </div>
      <style jsx global>{`
        body { font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important; }
      `}</style>
    </div>
  );
}

export default function NotFoundPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#122024] text-white text-xl font-bold">
        Loading...
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  );
}