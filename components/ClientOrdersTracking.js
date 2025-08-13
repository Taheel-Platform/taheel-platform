"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaEnvelopeOpenText,
  FaSearch,
  FaClipboardCheck,
  FaCog,
  FaCheckCircle,
  FaUpload,
  FaTimesCircle,
} from "react-icons/fa";
import ClientOrdersTrackingModal from "./ClientOrdersTrackingModal";
import { app } from "@/lib/firebase.client";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { GlobalLoader } from '@/components/GlobalLoader';

// الحالات الأساسية فقط (بدون pending_requirements ولا rejected)
const statusStepsList = [
  { key: "submitted", labelEn: "Submitted", labelAr: "تقديم الطلب", color: "#22c55e", icon: FaEnvelopeOpenText },
  { key: "under_review", labelEn: "Under Review", labelAr: "مراجعة", color: "#0ea5e9", icon: FaSearch },
  { key: "government_processing", labelEn: "Under Government Processing", labelAr: "قيد الإجراء الحكومي", color: "#a3a3a3", icon: FaCog },
  { key: "completed", labelEn: "Completed", labelAr: "تم الإجراء بنجاح", color: "#10b981", icon: FaCheckCircle }
];

// الحالات المخفية
const hiddenSteps = {
  pending_requirements: { key: "pending_requirements", labelEn: "Pending Requirements", labelAr: "بانتظار الاستكمال", color: "#facc15", icon: FaClipboardCheck },
  rejected: { key: "rejected", labelEn: "Rejected", labelAr: "تم رفض الطلب", color: "#ef4444", icon: FaTimesCircle }
};

function buildTimeline(statusHistory = []) {
  const filteredHistory = statusHistory.filter(
    h => h.status !== "pending_requirements" && h.status !== "rejected"
  );
  const currStatus = filteredHistory.length
    ? filteredHistory[filteredHistory.length - 1].status
    : "submitted";
  const currIdx = statusStepsList.findIndex((s) => s.key === currStatus);
  return statusStepsList.map((step, idx) => {
    const inHistory = filteredHistory.find((h) => h.status === step.key);
    return {
      ...step,
      active: idx === currIdx,
      done: idx < currIdx,
      show: idx <= currIdx,
      note: inHistory?.note || ""
    };
  });
}

function ClientOrderTrackingCard({ trackingNumber, statusHistory, lastUpdate, isArabic, orderId, orderName }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const lastStatusObj = statusHistory?.length ? statusHistory[statusHistory.length - 1] : { status: "submitted" };
  const lastStatus = lastStatusObj.status;
  const lastNote = lastStatusObj.note || "";

  const isPendingReq = lastStatus === "pending_requirements";
  const isRejected = lastStatus === "rejected";
  const hiddenStep = hiddenSteps[lastStatus];

  const timeline = buildTimeline(statusHistory || []);
  const lastStep = timeline.find(s => s.active);

  const t = (ar, en) => (isArabic ? ar : en);

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
        className="relative rounded-2xl shadow-lg border-2 px-4 py-6 flex flex-col items-center min-w-[270px] max-w-[340px] w-full overflow-hidden group min-h-[415px] max-h-[415px]"
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

        {/* رقم الطلب */}
        <div className="flex flex-col items-center w-full mb-1 mt-2 z-10">
          <span className="text-emerald-700 font-bold text-xs">{t("رقم الطلب", "Order No.")}</span>
          <span className="font-mono text-emerald-900 text-xs break-all">{trackingNumber}</span>
        </div>

        {/* اسم الطلب */}
        <div className="flex items-center justify-center w-full mb-3 z-10">
          <span className="font-extrabold text-base text-emerald-900 bg-white/90 rounded-full px-3 py-1 border border-emerald-100 shadow text-center w-full truncate" style={{maxWidth: 200}}>
            {orderName}
          </span>
        </div>

        {/* شريط التتبع الرأسي */}
        {!(isPendingReq || isRejected) && (
          <div className="relative flex flex-row w-full min-h-[140px] mb-2 z-10">
            <div className="relative flex flex-col items-center min-w-[40px] pt-2 pb-2">
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: 16,
                  width: 5,
                  height: 32 * (timeline.length - 1) + 18 * (timeline.length - 1),
                  background: "#e2e8f0",
                  zIndex: 1,
                  borderRadius: 9,
                }}
              />
              <motion.div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: 16,
                  width: 5,
                  height: 0,
                  background: `linear-gradient(to bottom, #22c55e 40%, ${lastStep?.color || "#22c55e"} 100%)`,
                  zIndex: 2,
                  borderRadius: 10,
                }}
                animate={{ height: (timeline.findIndex(s=>s.active) <= 0 ? 0 : (32 + 18) * timeline.findIndex(s=>s.active)) }}
                transition={{ duration: 1, ease: "easeInOut" }}
              />
              {timeline.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div className="flex flex-col items-center relative z-10" key={step.key}>
                    <motion.div
                      initial={{ scale: 1 }}
                      animate={step.active ? { scale: [1, 1.13, 1] } : { scale: 1 }}
                      transition={
                        step.active
                          ? { repeat: Infinity, duration: 1.1, ease: "easeInOut" }
                          : { duration: 0.2 }
                      }
                      className="flex items-center justify-center rounded-full border-2 shadow-md"
                      style={{
                        width: 32,
                        height: 32,
                        marginBottom: idx === timeline.length - 1 ? 0 : 18,
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
                        boxShadow: step.active ? `0 0 0 7px ${step.color}33` : "0 1px 3px #05966910",
                        fontWeight: step.active ? 700 : 500,
                        zIndex: 5,
                        fontSize: 18,
                        transition: "all 0.18s"
                      }}
                    >
                      <Icon size={16} />
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col justify-between pl-4 py-2 w-full">
              {timeline.map((step, idx) => (
                <div key={step.key} className="flex items-center min-h-[40px] mb-2">
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: step.active
                        ? step.color
                        : step.done
                        ? step.color
                        : "#bdbdbd",
                      fontWeight: step.active ? 800 : 500,
                      background: step.active ? "#fff" : "transparent",
                      borderRadius: step.active ? 6 : 0,
                      padding: step.active ? "0.13em 0.7em" : "0.05em 0.5em",
                      transition: "all 0.2s",
                      minWidth: 120,
                      boxShadow: step.active ? "0 2px 8px #05966922" : undefined,
                    }}
                  >
                    {isArabic ? step.labelAr : step.labelEn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-1 z-10">
          <span className="text-gray-700 text-xs font-semibold">
            {t("آخر حالة:","Status:")}
            <span
              style={{
                color: lastStep?.color || hiddenStep?.color,
                fontWeight: "bold",
                margin: "0 4px",
              }}
            >
              {(isPendingReq || isRejected)
                ? (isArabic ? hiddenStep?.labelAr : hiddenStep?.labelEn)
                : (isArabic ? lastStep?.labelAr : lastStep?.labelEn)}
            </span>
          </span>
          <span className="text-gray-400 text-[11px]">
            {t("آخر تحديث:","Last update:")}{" "}
            {lastUpdate ? new Date(lastUpdate).toLocaleString(isArabic ? "ar-EG" : "en-US") : "-"}
          </span>
        </div>

        {(isPendingReq || isRejected) && (
          <div className="mt-2 flex flex-col gap-2 w-full">
            <div
              className={`rounded px-2 py-1 text-xs font-semibold border text-center ${
                isPendingReq
                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                {hiddenStep.icon && <hiddenStep.icon className="inline mr-1" />}
                {isArabic ? hiddenStep.labelAr : hiddenStep.labelEn}
              </span>
              {lastNote && (
                <div
                  className={`mt-1 text-xs rounded px-2 py-1 border ${
                    isPendingReq
                      ? "bg-yellow-100 text-yellow-900 border-yellow-200"
                      : "bg-red-100 text-red-800 border-red-200"
                  }`}
                >
                  {t("ملاحظة الموظف:","Staff Note:")} {lastNote}
                </div>
              )}
              {isPendingReq && (
                <button
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow transition"
                  onClick={() => setShowUploadModal(true)}
                >
                  {t("رفع المستند المطلوب","Upload Required Document")}
                </button>
              )}
              {showUploadModal && (
                <ClientOrdersTrackingModal
                  show={showUploadModal}
                  onClose={() => setShowUploadModal(false)}
                  note={lastNote}
                  isArabic={isArabic}
                  orderId={trackingNumber}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// الكومبوننت الرئيسي: يجلب الطلبات من فايرستور ويعرضها
export default function ClientOrdersTrackingFirestore({ clientId, lang = "ar" }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const db = getFirestore(app);
        console.log("Firebase DB instance:", db);
        console.log("clientId used for query:", clientId);

        // جلب الطلبات من مجموعة requests باسم معرف العميل الصحيح
        const q = query(collection(db, "requests"), where("userId", "==", clientId));
        console.log("Firestore query:", q);

        const snapshot = await getDocs(q);
        console.log("Snapshot size (orders found):", snapshot.size);

        setOrders(
          snapshot.docs.map(doc => {
            const data = doc.data();
            console.log("Order doc data:", data);
            return {
              trackingNumber: data.trackingNumber || doc.id,
              statusHistory: data.statusHistory || [],
              lastUpdate: data.lastUpdated || data.createdAt,
              orderId: doc.id,
              orderName: data.serviceName || data.orderName || data.serviceType || "",
            };
          })
        );
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      }
      setLoading(false);
    }
    if (clientId) fetchOrders();
    else {
      console.warn("No clientId provided to ClientOrdersTrackingFirestore!");
      setLoading(false);
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="w-full flex justify-center py-8">
        <GlobalLoader text={lang === "ar" ? "جار التحميل..." : "Loading..."} />
      </div>
    );
  }

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
              key={order.trackingNumber || order.orderId || idx}
              trackingNumber={order.trackingNumber}
              statusHistory={order.statusHistory}
              lastUpdate={order.lastUpdate}
              isArabic={lang === "ar"}
              orderId={order.trackingNumber}
              orderName={order.orderName}
            />
          ))
        )}
      </div>
    </div>
  );
}