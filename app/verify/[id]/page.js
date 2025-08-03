"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import StyledQRCode from "@/components/StyledQRCode";
import Link from "next/link";
import { FaWhatsapp, FaMapMarkerAlt } from "react-icons/fa";

const LANG = {
  en: {
    taheel: "TAHEEL",
    docVerify: "Document Verification",
    validDoc: "✅ This document is officially verified on Taheel Platform.",
    invalidDoc: "⚠️ This document is NOT verified by Taheel.",
    docName: "Document Name",
    desc: "Description",
    category: "Category",
    uploadedAt: "Uploaded At",
    download: "Download Verified File",
    platformStamp: "Official verification by the Taheel government platform.",
    backHome: "Back to Home",
    contactSupport: "Contact Support",
    print: "Print",
    whatsappTitle: "Chat with us on WhatsApp",
    slogan: "Information Tracking Service",
    docNumber: "Document Number",
    dubai: "Dubai",
    allRights: "All rights reserved",
    location: "Location",
    phone: "Phone",
    email: "Email",
    home: "Home",
    platformDesc: "Certified Government Information & Clearance Platform",
    verifyStamp: "Officially certified by Taheel Platform",
    securityNotice: "This document is officially verified. All data is encrypted and securely protected by Taheel.",
  },
  ar: {
    taheel: "تأهيل",
    docVerify: "توثيق المستند",
    validDoc: "✔️ هذا المستند موثّق رسميًا في منصة تأهيل.",
    invalidDoc: "⚠️ هذا المستند غير موثَّق من منصة تأهيل.",
    docName: "اسم المستند",
    desc: "الوصف",
    category: "القسم",
    uploadedAt: "تاريخ الرفع",
    download: "تحميل الملف الأصلي الموثق",
    platformStamp: "توثيق رسمي من منصة تأهيل الحكومية.",
    backHome: "العودة للرئيسية",
    contactSupport: "تواصل مع الدعم",
    print: "طباعة",
    whatsappTitle: "تواصل معنا على واتساب",
    slogan: "لخدمة متابعة المعلومات",
    docNumber: "رقم المستند",
    dubai: "دبي",
    allRights: "جميع الحقوق محفوظة",
    location: "الموقع",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    home: "الرئيسية",
    platformDesc: "منصة معتمدة لمتابعة المعلومات والمعاملات الحكومية",
    verifyStamp: "موثَّق رسميًا من منصة تأهيل",
    securityNotice: "هذا المستند موثَّق رسميًا. جميع بياناتك محمية ومشفرة بالكامل عبر منصة تأهيل.",
  }
};

const CATEGORY_LABELS = {
  translation: { ar: "الترجمة", en: "Translation" },
  hr: { ar: "الموارد البشرية", en: "HR" },
  report: { ar: "التقارير", en: "Reports" },
  other: { ar: "أخرى", en: "Other" },
};

function formatDate(date, lang) {
  if (!date) return "";
  try {
    const d = typeof date === "number" ? new Date(date) : new Date(date);
    return d.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return date;
  }
}

export default function VerifyFilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const lang = (searchParams?.get("lang") === "ar" || (typeof window !== "undefined" && window.location.search.includes("lang=ar"))) ? "ar" : "en";
  const t = LANG[lang];
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchFile() {
      setLoading(true);
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { firestore } = await import("@/lib/firebase.client");
        const snap = await getDoc(doc(firestore, "archiveFiles", id));
        if (!ignore) {
          setFile(snap.exists() ? { ...snap.data(), id } : null);
          setLoading(false);
        }
      } catch (err) {
        setFile(null);
        setLoading(false);
      }
    }
    if (id) fetchFile();
    return () => { ignore = true; };
  }, [id]);

  const gradientBackground = "linear-gradient(180deg, #0b131e 0%, #22304a 30%, #122024 60%, #1d4d40 100%)";

  if (loading) {
    return (
      <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center" style={{ background: gradientBackground }}>
        <div className="text-emerald-300 text-xl font-bold animate-pulse">{lang === "ar" ? "جارٍ التحقق..." : "Verifying..."}</div>
      </div>
    );
  }

  if (!file) {
    return (
      <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center justify-center font-cairo" style={{ background: gradientBackground }}>
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-red-900/80 to-red-800/60 border-4 border-rose-400 rounded-3xl p-10 mt-16 shadow-2xl max-w-lg">
          <Image src="/logo-transparent-large.png" alt="Taheel Logo" width={80} height={80} className="mb-4 rounded-full bg-white shadow-lg" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-rose-300 mb-2">{t.docVerify}</h1>
          <p className="text-red-200 font-bold mb-3 text-lg">{t.invalidDoc}</p>
          <p className="text-gray-300 text-sm mb-5">
            {lang === "ar"
              ? "لم نجد مستند بهذا الرقم أو الرابط. تأكد من صحة الكود أو تواصل مع الدعم."
              : "No document found for this code or link. Please check the code or contact support."}
          </p>
          <div className="flex gap-3">
            <Link href={`/?lang=${lang}`}>
              <button className="bg-emerald-700 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-emerald-800 transition">{t.backHome}</button>
            </Link>
            <a href="https://wa.me/+971567858017" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-green-700 transition flex items-center gap-2">
              <FaWhatsapp size={18} />
              {t.contactSupport}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen flex flex-col font-cairo" style={{ background: gradientBackground }}>
      {/* HEADER */}
      <header className="w-full flex flex-col items-center gap-2 pt-7 pb-4 bg-gradient-to-b from-[#06141B]/90 to-[#253745]/60 shadow rounded-b-3xl border-b border-emerald-800">
        <div className="flex items-center gap-3">
          <Image src="/logo-transparent-large.png" alt="Taheel Logo" width={60} height={60} className="rounded-full bg-white shadow-lg ring-2 ring-emerald-400" />
          <div>
            <h1 className="text-2xl font-extrabold text-emerald-300 leading-tight">TAHEEL - تأهيل</h1>
            <p className="text-xs font-semibold text-emerald-100">{t.slogan}</p>
            <p className="text-xs text-gray-300">{t.platformDesc}</p>
          </div>
        </div>
        <h2 className="text-lg font-bold text-emerald-100 mt-2">{t.docVerify}</h2>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-8 px-2">
        <div className="w-full max-w-xl mx-auto bg-gradient-to-br from-[#22304a]/90 to-[#122024]/90 rounded-3xl shadow-2xl border-2 border-emerald-500 p-6 sm:p-10 mt-10 mb-8 relative">
          <div className="flex flex-col items-center gap-3">
            <StyledQRCode value={`https://taheel.ae/verify/${file.id}`} size={120} />
            <div className="mt-2 text-xs font-semibold text-emerald-200">{t.validDoc}</div>
          </div>
          <div className="mt-5 mb-2 flex flex-col gap-2 items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">{t.docName}:</span>
              <span className="font-bold text-white">{file.nameAr || file.nameEn}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">{t.desc}:</span>
              <span className="text-white">{file.descAr || file.descEn || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">{t.category}:</span>
              <span className="text-white">{CATEGORY_LABELS[file.category]?.[lang] || file.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">{t.docNumber}:</span>
              <span className="text-white">{file.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400">{t.uploadedAt}:</span>
              <span className="text-white">{formatDate(file.createdAt, lang)}</span>
            </div>
          </div>
          {/* رسالة أمان */}
          <div className="mt-4 mb-2 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-center text-sm font-bold shadow">
            {t.securityNotice}
          </div>
          <div className="flex justify-center gap-4 mt-5">
            <a
              href={file.link}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-bold shadow hover:scale-105 transition"
            >
              {t.download}
            </a>
            <button onClick={() => window.print()} className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-bold shadow">
              {t.print}
            </button>
          </div>
          {/* ختم المنصة */}
          <div className="mt-8 flex flex-col items-center">
            <Image src="/logo-transparent-large.png" alt="Taheel Stamp" width={52} height={52} className="rounded-full bg-white shadow-lg border-2 border-emerald-400" />
            <div className="mt-2 text-xs text-emerald-400 font-extrabold">{t.verifyStamp}</div>
          </div>
        </div>

        <Link href={`/?lang=${lang}`} className="mt-4 text-emerald-400 hover:underline font-bold">{t.backHome}</Link>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#192233] text-gray-200 pt-8 pb-4 px-2 mt-8 rounded-t-3xl shadow-lg border-t border-emerald-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo-transparent-large.png" alt="Taheel Logo" width={38} height={38} className="rounded-full bg-white p-1 ring-2 ring-emerald-400 shadow" />
            <div>
              <h3 className="text-lg font-extrabold text-emerald-400 mb-1">{t.taheel}</h3>
              <span className="text-xs font-bold text-emerald-300">{t.platformDesc}</span>
            </div>
          </div>
          <div className="text-gray-400 text-xs text-justify max-w-xs">
            {lang === "ar"
              ? <>
                <b>تأهيل</b> منصة ذكية معتمدة لحفظ وتوثيق المعلومات والمعاملات الحكومية. جميع بياناتك محمية بأعلى معايير الأمان. مقرنا الرئيسي: دبي.
              </>
              : <>
                <b>TAHEEL</b> is a certified platform for archiving and verifying government documents and info. Data is encrypted and protected. HQ: Dubai.
              </>
            }
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs">
              <FaMapMarkerAlt className="text-emerald-400" />
              <span>Red Avenue Building, Dubai</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>📞</span>
              <a href="tel:+971-567-858-017" className="underline hover:text-emerald-400">+971 56 785 8017</a>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>✉️</span>
              <a href="mailto:info@TAHEEL.ae" className="underline hover:text-emerald-400">info@TAHEEL.ae</a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-emerald-800 pt-3 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {t.taheel}. {t.allRights} - {t.dubai}
        </div>
        <a
          href="https://wa.me/+971-567-858-017"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 z-50 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg p-4 text-xl transition"
          title={t.whatsappTitle}
        >
          <FaWhatsapp />
        </a>
      </footer>

      <style jsx global>{`
        body, .font-cairo { font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important; }
        button, select, input[type="file"], a { cursor:pointer !important; }
      `}</style>
    </div>
  );
}