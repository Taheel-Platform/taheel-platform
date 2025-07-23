'use client';

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { doc, updateDoc } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

// تعريف أيقونات كل نوع عميل حسب القيمة
const ICONS = {
  resident: "/icons/resident.png",
  nonresident: "/icons/non-resident.png",
  company: "/icons/company.png",
  other: "/icons/other.png",
};

const DESCRIPTIONS = {
  resident: {
    ar: "مقيم داخل الإمارات، يحتاج رفع هوية الإقامة وجواز السفر.",
    en: "Resident in UAE, requires Emirates ID and Passport upload."
  },
  nonresident: {
    ar: "غير مقيم، يحتاج رفع جواز السفر فقط.",
    en: "Non-resident, only passport upload required."
  },
  company: {
    ar: "شركة مسجلة، يحتاج هوية المالك والرخصة التجارية.",
    en: "Registered Company, needs owner ID and trade license."
  },
  other: {
    ar: "خدمات أخرى يرجى التواصل مع الدعم.",
    en: "Other services, please contact support."
  }
};

// حفظ نوع العميل داخل وثيقة المستخدم
async function saveClientType(userId, clientType, lang) {
  try {
    await updateDoc(doc(db, "users", userId), {
      client_type: {
        type: clientType,
        lang: lang || "ar",
        updatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Firestore error saving client type:", err);
  }
}

export default function ClientTypeStep({ value, onChange, options, lang, t, onNext, userId }) {
  // توجيه تلقائي بعد الاختيار + حفظ الاختيار داخل المستخدم
  useEffect(() => {
    if (value && userId) {
      // الحفظ في الفايرستور داخل العميل
      saveClientType(userId, value, lang);

      // التوجيه التلقائي بعد الاختيار
      const timer = setTimeout(onNext, 550);
      return () => clearTimeout(timer);
    }
  }, [value, onNext, lang, userId]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="client-type"
        initial={{ opacity: 0, scale: 0.95, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -20 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-8 items-center w-full"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <h2 className="font-extrabold text-3xl text-emerald-800 tracking-tight text-center mt-2 drop-shadow">
          {t.accountType}
        </h2>
        <div className="flex flex-col sm:flex-row gap-8 w-full max-w-xl justify-center items-center mt-6">
          {options.map(opt => (
            <motion.button
              key={opt.value}
              whileHover={{
                scale: 1.08,
                boxShadow: "0 8px 24px 0 #34d39955",
                borderColor: "#059669",
              }}
              whileTap={{ scale: 0.97 }}
              animate={value === opt.value ? { scale: 1.12, boxShadow: "0 0 0 6px #34d39922" } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border-2 font-bold text-lg bg-white shadow transition-all duration-300 cursor-pointer
                ${value === opt.value ? "border-emerald-700 ring-4 ring-emerald-300" : "border-gray-300"}
                ${lang === "ar" ? "text-right" : "text-left"}
                hover:border-emerald-600`}
              onClick={() => onChange(opt.value)}
            >
              <Image
                src={ICONS[opt.value] || ICONS.other}
                width={66}
                height={66}
                alt={opt.label}
                className={value === opt.value ? "scale-110 drop-shadow-lg" : "opacity-80"}
                style={{ transition: "all 0.25s" }}
              />
              <span className={`mt-2 ${value === opt.value ? "text-emerald-800" : "text-emerald-600"}`}>
                {opt.label}
              </span>
              {value === opt.value && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xs text-gray-600 font-normal mt-1 text-center max-w-[180px]"
                >
                  {DESCRIPTIONS[opt.value]?.[lang]}
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
        {/* شرح سريع للعميل */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-gray-400 text-sm mt-5 text-center max-w-md"
        >
          {lang === "ar"
            ? "اختر نوع الحساب أولاً لتظهر البيانات المطلوبة تلقائياً في الخطوات التالية."
            : "Choose your account type first. The required fields will appear automatically in the next steps."}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}