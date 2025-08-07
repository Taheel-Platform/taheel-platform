"use client";
export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaEnvelopeOpenText,
  FaSearch,
  FaClipboardCheck,
  FaCog,
  FaCheckCircle,
} from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc } from "firebase/firestore";
import { GlobalLoader } from '@/components/GlobalLoader'

const statusStepsList = [
  { key: "submitted", labelEn: "Submitted", labelAr: "تقديم الطلب", color: "#22c55e", icon: FaEnvelopeOpenText },
  { key: "under_review", labelEn: "Under Review", labelAr: "مراجعة", color: "#0ea5e9", icon: FaSearch },
  { key: "pending_requirements", labelEn: "Pending Requirements", labelAr: "بانتظار الاستكمال", color: "#facc15", icon: FaClipboardCheck },
  { key: "government_processing", labelEn: "Government Processing", labelAr: "إجراء حكومي", color: "#a3a3a3", icon: FaCog },
  { key: "completed", labelEn: "Completed", labelAr: "الإنجاز", color: "#10b981", icon: FaCheckCircle }
];

function buildTimeline(statusHistory = []) {
  const currStatus = statusHistory.length
    ? statusHistory[statusHistory.length - 1].status
    : "submitted";
  const currIdx = statusStepsList.findIndex((s) => s.key === currStatus);
  return statusStepsList.map((step, idx) => {
    const inHistory = statusHistory.find((h) => h.status === step.key);
    return {
      ...step,
      active: idx === currIdx,
      done: idx < currIdx,
      show: idx <= currIdx,
      note: inHistory?.note || ""
    };
  });
}

function normalizeTrackingNum(str) {
  return String(str || "").replace(/[\s\-]/g, "").toUpperCase();
}

async function getRequestByTrackingNumber(trackingNumber) {
  const normalizedInput = normalizeTrackingNum(trackingNumber);
  const docRef = doc(firestore, "requests", normalizedInput);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;
  return snap.data();
}

// ====== Input component with fixed format REQ-000-0000 ======
function TrackingNumInput({ value, onChange, lang }) {
  // value: only digits (max 7)
  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw.length > 7) raw = raw.slice(0, 7);
    onChange(raw);
  };

  // Automatically add dash after 3 digits
  let display = value;
  if (display.length > 3) {
    display = display.slice(0, 3) + '-' + display.slice(3, 7);
  }
  // Show as REQ-XXX-XXXX, fill underscores if not enough digits
  let fullDisplay = "REQ-___-____";
  if (display.length > 0) {
    // Fill entered numbers in place of underscores
    const numbers = value.padEnd(7, "_");
    fullDisplay = `REQ-${numbers.slice(0, 3)}-${numbers.slice(3, 7)}`;
  }

  return (
    <div className="flex items-center gap-2 w-full justify-center">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        maxLength={7}
        className="w-32 text-center font-mono border border-gray-300 rounded bg-gray-50 shadow focus:border-emerald-500 transition text-lg tracking-widest"
        placeholder={lang === "ar" ? "أدخل رقم الطلب" : "Enter request number"}
        aria-label={lang === "ar" ? "أدخل 7 أرقام الطلب" : "Enter 7 digits"}
        style={{ letterSpacing: "0.14em" }}
      />
      <span className="text-xs text-gray-400 ml-2 select-none">{fullDisplay}</span>
    </div>
  );
}

function TrackingForm({ LANG, lang = "ar", isArabic = true }) {
  const [trackingDigits, setTrackingDigits] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const t = (ar, en) => (isArabic ? ar : en);

  // رقم الطلب النهائي
  const formattedTrackingNum = `REQ-${trackingDigits.slice(0,3)}-${trackingDigits.slice(3,7)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (trackingDigits.length !== 7) {
      setTrackingError(
        isArabic
          ? "يرجى إدخال رقم طلب صحيح (3 أرقام + 4 أرقام)"
          : "Please enter a valid request number (3 digits + 4 digits)"
      );
      setTrackingResult(null);
      return;
    }
    setTrackingError('');
    setIsLoading(true);
    setTrackingResult(null);
    try {
      const found = await getRequestByTrackingNumber(formattedTrackingNum);
      setIsLoading(false);
      if (!found) {
        setTrackingError(isArabic ? "لم يتم العثور على هذا الطلب." : "Request not found.");
        setTrackingResult(null);
        return;
      }
      setTrackingResult({
        number: formattedTrackingNum,
        statusHistory: found.statusHistory || [],
        lastUpdate: found.lastUpdated || "",
        staffNote: found.statusHistory?.at(-1)?.note || "",
      });
    } catch (err) {
      setTrackingError(isArabic ? "حدث خطأ أثناء البحث." : "Error during search.");
      setTrackingResult(null);
      setIsLoading(false);
    }
  };

  return (
    <section className="w-full flex flex-col items-center justify-center">
      <div className="bg-white dark:bg-[#181f2d] rounded-2xl shadow max-w-3xl mx-auto flex flex-col items-center justify-center border border-gray-100 dark:border-[#22304a] px-0 py-0">
        {/* form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-center gap-4 my-6 w-full"
          autoComplete="off"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <TrackingNumInput value={trackingDigits} onChange={setTrackingDigits} lang={lang} />
          <motion.button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-semibold shadow-sm transition text-base"
            style={{ minWidth: 90, cursor: isLoading ? "wait" : "pointer" }}
            whileHover={{
              scale: 1.09,
              boxShadow: "0px 4px 18px 0px #05966944",
              backgroundColor: "#059669"
            }}
            whileTap={{ scale: 0.97 }}
            animate={{
              scale: [1, 1.08, 1],
              boxShadow: [
                "0px 2px 8px 0px #05966922",
                "0px 4px 18px 0px #05966944",
                "0px 2px 8px 0px #05966922"
              ]
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut"
            }}
          >
            {LANG[lang].trackNow}
          </motion.button>
        </form>
        {trackingError && (
          <div className="mb-2">
            <p className="text-red-500 text-xs font-medium">{trackingError}</p>
          </div>
        )}

        {isLoading && (
          <div className="w-full flex justify-center items-center py-8">
            <GlobalLoader />
          </div>
        )}

        <AnimatePresence>
          {!isLoading && trackingResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35 }}
              className="w-full flex flex-col gap-2 items-center justify-center"
            >
              <TrackingTimeline
                timeline={buildTimeline(trackingResult.statusHistory)}
                isArabic={isArabic}
              />
              {/* بيانات التتبع */}
              <div className="flex flex-col items-center w-full">
                <div className="text-emerald-600 font-semibold text-base mb-2 tracking-tight">{t("تتبع طلبك", "Track Your Request")}</div>
                <div className="flex gap-2 items-center mb-1">
                  <motion.button
                    className="bg-emerald-50 border border-emerald-200 rounded-lg px-1.5 py-1 text-xs text-emerald-700 font-semibold hover:bg-emerald-600 hover:text-white hover:scale-105 transition"
                    style={{ fontSize: "10px", cursor: "pointer" }}
                    whileHover={{
                      scale: 1.09,
                      backgroundColor: "#059669",
                      color: "#fff",
                      borderColor: "#059669"
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(trackingResult.number);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1000);
                    }}
                  >
                    {t("نسخ", "Copy")}
                  </motion.button>
                  <span className="bg-gray-50 px-1.5 py-1 rounded text-emerald-700 font-mono text-xs border border-emerald-100">{trackingResult.number}</span>
                  {copied && (
                    <span className="text-yellow-600 font-semibold text-xs ml-2">{t("تم النسخ", "Copied")}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-semibold text-sm mb-1"
                  style={{ color: buildTimeline(trackingResult.statusHistory).find(s => s.active)?.color || "#eab308" }}
                >
                  {isArabic
                    ? buildTimeline(trackingResult.statusHistory).find(s => s.active)?.labelAr
                    : buildTimeline(trackingResult.statusHistory).find(s => s.active)?.labelEn}
                  <span>
                    {(() => {
                      const Icon = buildTimeline(trackingResult.statusHistory).find(s => s.active)?.icon;
                      return Icon ? <Icon size={12} style={{ display: "inline" }} /> : null;
                    })()}
                  </span>
                </div>
                <div className="text-gray-400 text-xs mb-2">
                  {t("آخر تحديث:", "Last update:")}{" "}
                  {trackingResult.lastUpdate
                    ? new Date(trackingResult.lastUpdate).toLocaleString(isArabic ? "ar-EG" : "en-US")
                    : ""}
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1 text-yellow-800 font-medium text-xs w-fit mx-auto shadow-sm flex items-center gap-1">
                  <b className="text-yellow-700">{t("ملاحظات الموظف:", "Staff Notes:")}</b>
                  <span>{trackingResult.staffNote || t("لا توجد ملاحظات إضافية", "No additional notes")}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

import { AttendanceSectionInner } from "@/components/employee/AttendanceSection";

function AttendanceSection(props) {
  return (
    <Suspense fallback={null}>
      <AttendanceSectionInner {...props} />
    </Suspense>
  );
}

export default TrackingForm;
export { AttendanceSection };