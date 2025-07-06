"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FaEnvelopeOpenText,
  FaSearch,
  FaClipboardCheck,
  FaCog,
  FaCheckCircle,
  FaUpload,
} from "react-icons/fa";
import ClientOrdersTrackingModal from "./ClientOrdersTrackingModal";

// تعريف خطوات التتبع
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

// كارت تتبع الطلب
function ClientOrderTrackingCard({ trackingNumber, statusHistory, lastUpdate, isArabic, orderId }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const timeline = buildTimeline(statusHistory || []);
  const t = (ar, en) => (isArabic ? ar : en);
  const lastStep = timeline.find(s => s.active);
  const isPendingReq = lastStep?.key === "pending_requirements";
  const note = lastStep?.note;

  return (
    <motion.div
      whileHover={{
        scale: 1.04,
        boxShadow: "0 8px 32px 0 #05966944",
        borderColor: "#059669",
      }}
      className="transition-all duration-200"
    >
      <div
        className="relative rounded-2xl shadow-lg border-2 px-4 py-4 flex flex-row gap-3 items-stretch min-w-[230px] max-w-[295px] w-full overflow-hidden group"
        style={{
          background: "linear-gradient(135deg, #ebfff7 60%, #d1fae5 100%)",
          borderColor: "#b6eedb",
        }}
      >
        {/* خلفية اللوجو */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <img
            src="/logo-transparent-large.png"
            alt="logo background"
            className="w-5/6 max-w-[170px] opacity-10 select-none"
            style={{
              filter: "blur(0.5px)",
              objectFit: "contain",
            }}
            draggable={false}
          />
        </div>
        {/* محتوى الكارت */}
        <div className="flex flex-col items-center relative pt-1 pb-1 mx-1 z-10 min-w-[120px]">
          {timeline.map((step, idx) => {
            const Icon = step.icon;
            const lineColor =
              step.done || step.active
                ? `linear-gradient(to bottom, ${step.color}, ${timeline[idx + 1]?.color || step.color})`
                : "rgba(40,54,70,0.15)";
            return (
              <div key={step.key} className="flex flex-row items-center min-h-[40px]">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={step.active ? { scale: [1, 1.13, 1] } : { scale: 1 }}
                    transition={
                      step.active
                        ? { repeat: Infinity, duration: 1.1, ease: "easeInOut" }
                        : { duration: 0.2 }
                    }
                    className="flex items-center justify-center rounded-full border-2 shadow-sm"
                    style={{
                      width: 30,
                      height: 30,
                      background: step.active
                        ? step.color
                        : step.done
                        ? "#d1fae5"
                        : "#fff",
                      borderColor: step.color,
                      color: step.active
                        ? "#fff"
                        : step.done
                        ? step.color
                        : "#bdbdbd",
                      boxShadow: step.active ? `0 0 0 6px ${step.color}33` : "0 1px 3px #05966910",
                      fontWeight: step.active ? 700 : 500,
                      zIndex: 2,
                      transition: "all 0.18s"
                    }}
                  >
                    <Icon size={15} />
                  </motion.div>
                  {idx < timeline.length - 1 && (
                    <div
                      style={{
                        width: 4,
                        height: 28,
                        background: lineColor,
                        borderRadius: 6,
                        marginTop: 0,
                        zIndex: 1,
                        boxShadow: "0 0 3px #05966922,0 12px 30px #0ea5e933",
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-xs font-bold ml-2"
                  style={{
                    color: step.active
                      ? step.color
                      : step.done
                      ? step.color
                      : "#bdbdbd",
                    minWidth: 84,
                    fontWeight: step.active ? 800 : 500,
                    letterSpacing: "0.01em",
                    filter: step.active ? "drop-shadow(0 2px 4px #05966922)" : undefined,
                    background: step.active ? "#fff" : "transparent",
                    borderRadius: step.active ? 6 : 0,
                    padding: step.active ? "0.1em 0.4em" : "0",
                    transition: "all 0.2s",
                    marginRight: isArabic ? 0 : "0.25rem",
                    marginLeft: isArabic ? "0.25rem" : 0,
                  }}
                >
                  {isArabic ? step.labelAr : step.labelEn}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex-1 flex flex-col justify-between min-w-0 z-10">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-emerald-700 font-bold text-xs">{t("رقم:", "No.")}</span>
            <span className="font-mono text-emerald-900 text-xs">{trackingNumber}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-700 text-xs font-semibold">
              {t("آخر حالة:", "Status:")}
              <span
                style={{
                  color: lastStep?.color,
                  fontWeight: "bold",
                  margin: "0 4px",
                }}
              >
                {isArabic
                  ? lastStep?.labelAr
                  : lastStep?.labelEn}
              </span>
            </span>
            <span className="text-gray-400 text-[11px]">
              {t("آخر تحديث:", "Last update:")}{" "}
              {lastUpdate ? new Date(lastUpdate).toLocaleString(isArabic ? "ar-EG" : "en-US") : "-"}
            </span>
          </div>
          {isPendingReq && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="bg-yellow-50 text-yellow-700 text-xs rounded px-2 py-1 font-semibold border border-yellow-200">
                {isArabic ? "ملاحظة الموظف:" : "Staff Note:"} {note}
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow transition flex items-center gap-2"
              >
                <FaUpload />
                {isArabic ? "رفع المستند المطلوب" : "Upload Required Document"}
              </button>
              <ClientOrdersTrackingModal
                show={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                note={note}
                isArabic={isArabic}
                orderId={trackingNumber}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// الكومبوننت الرئيسي للطلبات
function ClientOrdersTracking({ clientId, lang = "ar", orders = [] }) {
  return (
    <div className="w-full flex flex-col items-center mt-2 mb-8">
      <span className="text-emerald-900 text-lg font-bold mb-4 tracking-tight">
        {lang === "ar" ? "طلباتك الحالية" : "Current Orders"}
      </span>
      <div className="w-full flex flex-wrap gap-4 justify-center items-stretch">
        {orders.length === 0 ? (
          <div className="text-gray-400 text-sm font-semibold">
            {lang === "ar" ? "لا يوجد طلبات حالياً" : "No orders yet."}
          </div>
        ) : (
          orders.map((order, idx) => (
            <ClientOrderTrackingCard
              key={order.trackingNumber || order.requestId || idx}
              trackingNumber={order.trackingNumber || order.requestId}
              statusHistory={order.statusHistory || []}
              lastUpdate={order.lastUpdated || order.createdAt}
              isArabic={lang === "ar"}
              orderId={order.trackingNumber || order.requestId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// الكومبوننت الرئيسي للصفحة NotFound
function NotFoundPage(props) {
  return (
    <Suspense fallback={null}>
      <NotFoundContent {...props} />
    </Suspense>
  );
}

export { ClientOrdersTracking, NotFoundPage };
export default GlobalLoader;