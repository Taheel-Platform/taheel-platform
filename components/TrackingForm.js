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

// شريط تتبع احترافي - الشريط في المنتصف، الأيقونات فوق الشريط بمسافة، الكلام تحت الشريط
function TrackingTimeline({ timeline, isArabic }) {
  const activeIdx = timeline.findIndex(s => s.active);
  const stepsCount = timeline.length;
  // الشريط يبدأ من أول دائرة (تم تقديم الطلب) وينتهي عند الحالة الحالية فقط
  const progressPercent = stepsCount > 1 ? (activeIdx / (stepsCount - 1)) * 100 : 0;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center select-none pb-4">
      {/* الخط الخلفي */}
      <div className="relative w-full h-[60px] flex items-center justify-center">
        {/* الخط الرمادي */}
        <div
          className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-[4px] rounded-full bg-gray-300 z-0"
          style={{ boxShadow: "0 2px 8px #0001" }}
        />
        {/* الخط المتحرك من أول دائرة حتى الحالية */}
        <motion.div
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-[4px] rounded-full z-10"
          style={{
            background: "linear-gradient(90deg,#22c55e,#0ea5e9,#facc15,#10b981)",
            width: "100%",
          }}
          initial={{ width: 0 }}
          animate={{
            width: `${progressPercent}%`
          }}
          transition={{ duration: 1, type: "spring" }}
        />
        {/* الأيقونات فوق الخط بمسافة واضحة وصغيرة */}
        <div className="flex w-full justify-between items-center z-20 relative">
          {timeline.map((step, idx) => {
            const Icon = step.icon;
            let iconBg = "#fff";
            let iconBorder = "#e5e7eb";
            let iconColor = "#bdbdbd";
            let iconShadow = "0 1px 4px #0001";
            if (step.done) {
              iconBg = "#f0fdf4";
              iconBorder = step.color;
              iconColor = step.color;
            }
            if (step.active) {
              iconBg = step.color;
              iconBorder = step.color;
              iconColor = "#fff";
              iconShadow = `0 0 0 5px ${step.color}22`;
            }
            return (
              <motion.div
                key={step.key}
                initial={{ scale: 1 }}
                animate={step.active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={step.active
                  ? { repeat: Infinity, duration: 1, ease: "easeInOut" }
                  : { duration: 0.2 }}
                className="flex flex-col items-center"
                style={{ zIndex: 20 }}
              >
                <div
                  className="flex items-center justify-center rounded-full border-2"
                  style={{
                    width: 32,
                    height: 32,
                    marginBottom: 21, // تباعد واضح عن الخط
                    background: iconBg,
                    borderColor: iconBorder,
                    color: iconColor,
                    boxShadow: iconShadow,
                  }}
                >
                  <Icon size={15} color={iconColor} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      {/* التسميات تحت الخط بالكامل */}
      <div className="w-full flex flex-row items-start justify-between mt-1 px-1">
        {timeline.map((step, idx) => (
          <div
            key={step.key}
            className="flex flex-col items-center min-w-[50px] max-w-[90px]"
          >
            <span
              className="font-medium text-center"
              style={{
                color: step.active
                  ? step.color
                  : step.done
                  ? step.color
                  : "#bdbdbd",
                fontWeight: step.active ? 700 : 500,
                fontSize: 13,
                opacity: step.show ? 1 : 0.6,
                lineHeight: "1.2",
                marginTop: 0,
              }}
            >
              {isArabic ? step.labelAr : step.labelEn}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeTrackingNum(str) {
  return String(str || "").replace(/[\s\-]/g, "").toUpperCase();
}

// جلب الطلبات من Firestore وليس RTDB
async function getRequestByTrackingNumber(trackingNumber) {
  const normalizedInput = normalizeTrackingNum(trackingNumber);

  // اسم المستند هو رقم التراك نفسه
  const docRef = doc(firestore, "requests", normalizedInput);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;
  return snap.data();
}

// إذا لم يكن لديك normalizedTrackingNumber في كل مستند، يمكن استخدم جلب جميع الطلبات ثم البحث، لكن يفضل حفظ normalizedTrackingNumber عند الانشاء أو التعديل.

function TrackingForm({ LANG, lang = "ar", isArabic = true }) {
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (trackingInput.trim() === '') {
      setTrackingError(LANG[lang].enterTrackNum);
      return;
    }
    setTrackingError('');
    setIsLoading(true);

    // البحث باستخدام normalizedTrackingNumber
    const found = await getRequestByTrackingNumber(trackingInput.trim());
    setIsLoading(false);
    if (!found) {
      setTrackingError(isArabic ? "لم يتم العثور على هذا الطلب." : "Request not found.");
      setTrackingResult(null);
      return;
    }
    setTrackingResult({
      number: found.trackingNumber,
      statusHistory: found.statusHistory || [],
      lastUpdate: found.lastUpdated || "",
      staffNote: found.statusHistory?.at(-1)?.note || "",
    });
  };

  const t = (ar, en) => (isArabic ? ar : en);

  return (
    <section className="w-full flex flex-col items-center justify-center">
      <div className="bg-white dark:bg-[#181f2d] rounded-2xl shadow max-w-3xl mx-auto flex flex-col items-center justify-center border border-gray-100 dark:border-[#22304a] px-0 py-0">
        {/* form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-row items-center justify-center gap-2 my-6 w-full"
          autoComplete="off"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <motion.button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full font-semibold shadow-sm transition text-xs"
            style={{ minWidth: 58, letterSpacing: "0.03em", cursor: "pointer" }}
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
          <input
            type="text"
            value={trackingInput}
            onChange={e => {
              setTrackingInput(e.target.value);
              setTrackingError('');
            }}
            placeholder={LANG[lang].placeholder}
            className="w-36 sm:w-52 py-1.5 px-3 text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow text-sm transition hover:border-emerald-600 hover:ring-emerald-600"
            style={{ fontWeight: 500, cursor: "pointer" }}
            inputMode="text"
            autoComplete="off"
            lang={isArabic ? "ar" : "en"}
            onMouseOver={e => e.currentTarget.style.borderColor = "#059669"}
            onMouseOut={e => e.currentTarget.style.borderColor = "#d1d5db"}
          />
        </form>
        {trackingError && (
          <div className="mb-2">
            <p className="text-red-500 text-xs font-medium">{trackingError}</p>
          </div>
        )}

        <AnimatePresence>
          {trackingResult && (
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