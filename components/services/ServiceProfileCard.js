"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  FaClock,
  FaFileAlt,
  FaBuilding,
  FaUserTie,
  FaUser,
  FaTag,
  FaCoins,
  FaCheck,
} from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, updateDoc, collection, addDoc } from "firebase/firestore";
import ServiceUploadModal from "./ServiceUploadModal";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";

// رقم الطلب الفريد
function generateOrderNumber() {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${part1}-${part2}`;
}

const CATEGORY_STYLES = {
  company: {
    labelAr: "شركات",
    labelEn: "Company",
    gradient: "from-blue-100/80 via-blue-50/60 to-white/90",
    ring: "ring-blue-200/80",
    text: "text-blue-800",
    badge:
      "bg-gradient-to-r from-blue-300 via-blue-100 to-blue-50 shadow-blue-200/40",
    icon: () => <FaBuilding className="text-blue-500" size={15} />,
  },
  resident: {
    labelAr: "مقيمين",
    labelEn: "Resident",
    gradient: "from-green-100/80 via-green-50/60 to-white/90",
    ring: "ring-green-200/80",
    text: "text-green-800",
    badge:
      "bg-gradient-to-r from-green-300 via-green-100 to-green-50 shadow-green-200/40",
    icon: () => <FaUser className="text-green-500" size={15} />,
  },
  nonresident: {
    labelAr: "غير مقيمين",
    labelEn: "Non-Resident",
    gradient: "from-yellow-100/80 via-yellow-50/60 to-white/90",
    ring: "ring-yellow-200/80",
    text: "text-yellow-800",
    badge:
      "bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-50 shadow-yellow-200/40",
    icon: () => <FaUserTie className="text-yellow-500" size={15} />,
  },
  other: {
    labelAr: "أخرى",
    labelEn: "Other",
    gradient: "from-gray-100/80 via-gray-50/60 to-white/90",
    ring: "ring-gray-200/80",
    text: "text-gray-800",
    badge:
      "bg-gradient-to-r from-gray-300 via-gray-100 to-gray-50 shadow-gray-200/40",
    icon: () => <FaTag className="text-gray-500" size={15} />,
  },
};

export default function ServiceProfileCard({
  category = "resident",
  name,
  description,
  price,
  duration,
  requiredDocs = [],
  coins = 0,
  userId,
  userWallet = 0,
  userCoins = 0,
  lang = "ar",
  repeatable = false,
  requireUpload = false,
  serviceId,
  onPaid,
  allowPaperCount = false,
  pricePerPage,
  userEmail, // يجب تمرير إيميل المستخدم (تحتاج تمريره من الأعلى)
}) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.resident;
  const [wallet, setWallet] = useState(userWallet);
  const [coinsBalance, setCoinsBalance] = useState(userCoins);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCoinDiscountModal, setShowCoinDiscountModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [quantity, setQuantity] = useState(1);

  // ---- رفع المستندات ----
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [showDocsModal, setShowDocsModal] = useState(false);

  // ---- عدد الأوراق ----
  const [paperCount, setPaperCount] = useState(1);

  // جلب بيانات المستخدم
  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        const userRef = doc(firestore, "users", userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setWallet(Number(data.walletBalance ?? 0));
          setCoinsBalance(Number(data.coins ?? 0));
        }
      } catch (err) {
        // log error if needed
      }
    };
    fetchUser();
  }, [userId]);

  // حساب السعر النهائي
  const totalServicePrice = pricePerPage
    ? pricePerPage * paperCount
    : price * (repeatable ? quantity : 1);

  // تحقق من رفع كل المستندات المطلوبة
  const allDocsUploaded =
    !requireUpload ||
    (uploadedDocs["main"] && uploadedDocs["main"].type === "application/pdf");

  // تحقق من تحديد عدد الأوراق
  const isPaperCountReady = !allowPaperCount || (paperCount && paperCount > 0);

  // شرط تفعيل الدفع
  const canPay = allDocsUploaded && isPaperCountReady;

  // مودال المستندات
  function openDocsModal() {
    setShowDocsModal(true);
  }
  function closeDocsModal() {
    setShowDocsModal(false);
  }
  function handleDocsUploaded(newDocs) {
    setUploadedDocs(newDocs);
    closeDocsModal();
  }

  // مودالات الدفع
  function openPaymentModal() {
    setShowPayModal(true);
    setShowCoinDiscountModal(false);
    setPayMsg("");
  }
  function openCoinDiscountModal() {
    setShowCoinDiscountModal(true);
    setShowPayModal(false);
    setPayMsg("");
  }

  // إرسال إشعار (Firestore notifications)
  async function sendNotification({ userId, orderNumber, orderName }) {
    try {
      await addDoc(collection(firestore, "notifications"), {
        body: `تم تقديم طلبك بنجاح. رقم الطلب: ${orderNumber}`,
        isRead: false,
        notificationId: `notif-${Date.now()}`,
        relatedRequest: orderNumber,
        targetId: userId,
        timestamp: new Date().toISOString(),
        title: "تحديث حالة الطلب",
        type: "status",
        orderName: orderName,
      });
    } catch (err) {
      // log notification error if needed
    }
  }

  // إرسال إيميل (استدعاء API backend أو cloud function)
  async function sendOrderEmail({ to, orderNumber, serviceName, price }) {
    try {
      await fetch("/api/sendOrderEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          orderNumber,
          serviceName,
          price,
        }),
      });
    } catch (err) {
      // log email error if needed
    }
  }

  async function handlePayment(method, withCoinDiscount = false) {
    setIsPaying(true);
    setPayMsg("");
    try {
      let currentCoins = Number(coinsBalance) || 0;
      let currentWallet = Number(wallet) || 0;
      let totalPrice = totalServicePrice;
      let amountToPay = totalPrice;
      let discount = 0;
      const userRef = doc(firestore, "users", userId);

      if (withCoinDiscount) {
        if (currentCoins < 100) {
          setPayMsg(
            <span className="text-red-600 font-bold">
              {lang === "ar" ? "رصيد الكوينات غير كافي" : "Not enough coins"}
            </span>
          );
          setIsPaying(false);
          return;
        }
        discount = Math.floor(amountToPay * 0.1);
        if (discount < 1) discount = 1;
        amountToPay = amountToPay - discount;
        await updateDoc(userRef, { coins: currentCoins - 100 });
        setCoinsBalance(currentCoins - 100);
        currentCoins = currentCoins - 100;
      } else {
        await updateDoc(userRef, {
          coins: currentCoins + coins * (repeatable ? quantity : 1),
        });
        setCoinsBalance(currentCoins + coins * (repeatable ? quantity : 1));
        currentCoins = currentCoins + coins * (repeatable ? quantity : 1);
      }

      if (method === "wallet") {
        if (isNaN(currentWallet) || currentWallet <= 0) {
          setPayMsg(
            <span className="text-red-600 font-bold">
              {lang === "ar"
                ? "المحفظة فارغة، الرجاء إضافة رصيد في المحفظة."
                : "Wallet is empty, please add balance to your wallet."}
            </span>
          );
          setIsPaying(false);
          return;
        }
        if (currentWallet < amountToPay) {
          setPayMsg(
            <span className="text-red-600 font-bold">
              {lang === "ar"
                ? "رصيدك في المحفظة غير كافي، الرجاء إضافة رصيد في المحفظة."
                : "Insufficient wallet balance, please add balance to your wallet."}
            </span>
          );
          setIsPaying(false);
          return;
        }
        await updateDoc(userRef, { walletBalance: currentWallet - amountToPay });
        setWallet(currentWallet - amountToPay);
      }

      // Gateway code here if needed

      // === إنشاء الطلب بعد الدفع الناجح ===
      // رقم الطلب هو نفسه رقم التتبع
      const orderNumber = generateOrderNumber();

      // إضافة الطلب في Collection "requests"
      await addDoc(collection(firestore, "requests"), {
        trackingNumber: orderNumber, // رقم التتبع = رقم الطلب
        orderNumber: orderNumber,
        clientId: userId,
        orderName: name,
        serviceId: serviceId,
        quantity: repeatable ? quantity : 1,
        price: totalServicePrice,
        statusHistory: [
          {
            status: "submitted",
            timestamp: new Date().toISOString(),
            note: "",
          },
        ],
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        uploadedDocs: uploadedDocs || {},
        paperCount: allowPaperCount ? paperCount : undefined,
        paymentMethod: method,
        lang: lang,
      });

      // إرسال إشعار للعميل (Firestore notifications)
      await sendNotification({
        userId,
        orderNumber,
        orderName: name,
      });

      // إرسال إيميل للعميل (تحتاج ضبط endpoint)
      if (userEmail) {
        await sendOrderEmail({
          to: userEmail,
          orderNumber,
          serviceName: name,
          price: totalServicePrice,
        });
      }

      setPayMsg(
        <span className="text-green-700 font-bold">
          {lang === "ar"
            ? `تم الدفع بنجاح! رقم الطلب/التتبع: ${orderNumber}`
            : `Payment successful! Order/Tracking Number: ${orderNumber}`}
        </span>
      );

      if (onPaid)
        onPaid(method, repeatable ? quantity : 1, uploadedDocs, paperCount);
      setIsPaying(false);

      setTimeout(() => {
        setShowPayModal(false);
        setShowCoinDiscountModal(false);
        setPayMsg("");
      }, 1800);
    } catch (err) {
      setPayMsg(
        <span className="text-red-600 font-bold">
          {lang === "ar" ? "خطأ أثناء الدفع" : "Payment error"}
        </span>
      );
      setIsPaying(false);
    }
  }

  const cashbackText =
    lang === "ar"
      ? `عدد الكوينات: ${coins} كاش باك${repeatable ? ` × ${quantity}` : ""}`
      : `Coins cashback: ${coins}${repeatable ? ` × ${quantity}` : ""}`;

  const canUseCoinDiscount = Number(coinsBalance) >= 100;

  return (
    <div
      className={`
        group relative w-full max-w-sm min-w-[242px] h-[auto] flex flex-col
        rounded-2xl border-0
        shadow-lg shadow-emerald-100/60 hover:shadow-emerald-300/70
        transition-all duration-300 overflow-hidden
        bg-gradient-to-br ${style.gradient} backdrop-blur-xl
        ring-1 ${style.ring}
        cursor-pointer
      `}
      style={{
        border: "none",
        backdropFilter: "blur(6px)",
      }}
      tabIndex={0}
      role="button"
    >
      {/* الكوينات */}
      <div className="absolute top-4 left-4 flex items-center group/coins z-10">
        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full shadow border border-yellow-100 min-w-[36px] cursor-help">
          <FaCoins className="text-yellow-500" size={13} />
          <span className="text-yellow-700 font-bold text-xs">{coins}</span>
        </div>
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-7 whitespace-nowrap bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded shadow-lg opacity-0 group-hover/coins:opacity-100 transition pointer-events-none">
          {cashbackText}
        </div>
      </div>
      {/* التصنيف */}
      <div
        className={`flex items-center justify-center gap-2 px-3 py-1
        text-[11px] font-extrabold rounded-full shadow
        ${style.badge} ${style.text} bg-opacity-90 backdrop-blur-sm border border-white/40
        w-fit mx-auto mt-4 mb-2 select-none
      `}
      >
        {style.icon()}
        <span>{lang === "ar" ? style.labelAr : style.labelEn}</span>
      </div>
      {/* محتوى الكارت */}
      <div className="flex flex-col items-center px-3 pt-1 pb-3 flex-1 w-full min-h-0">
        <h3 className="text-lg font-black text-emerald-800 text-center mb-1 drop-shadow-sm tracking-tight max-w-full truncate">
          {name}
        </h3>
        <p
          className="text-gray-600 text-center text-sm mb-2 font-medium flex-0 max-w-full"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description || <span>&nbsp;</span>}
        </p>
        {/* السعر */}
        <div className="flex items-center justify-center gap-2 my-2 w-full">
          <span className="font-extrabold text-emerald-700 text-2xl drop-shadow text-center">
            {totalServicePrice}
          </span>
          <span className="text-base text-gray-500 font-bold">
            {lang === "ar" ? "درهم" : "AED"}
          </span>
          <Image
            src="/aed-logo.png"
            alt="درهم إماراتي"
            width={34}
            height={34}
            className="rounded-full bg-white ring-1 ring-emerald-200 shadow"
          />
        </div>
        {/* عدد مرات الخدمة */}
        {repeatable && (
          <div className="flex flex-col items-center mb-2 w-full">
            <label className="text-xs font-bold text-gray-600 mb-1">
              {lang === "ar" ? "عدد مرات الخدمة" : "Quantity"}
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(99, Number(e.target.value))))
              }
              className="w-[70px] p-1 rounded border border-emerald-200 text-emerald-900 text-center font-bold"
              style={{ direction: "ltr" }}
            />
          </div>
        )}
        {/* عدد الأوراق */}
        {allowPaperCount && (
          <div className="flex flex-col items-center mb-2 w-full">
            <label className="text-xs font-bold text-gray-600 mb-1">
              {lang === "ar" ? "عدد الأوراق" : "Number of Pages"}
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={paperCount}
              onChange={(e) =>
                setPaperCount(
                  Math.max(1, Math.min(99, Number(e.target.value)))
                )
              }
              className="w-[70px] p-1 rounded border border-emerald-200 text-emerald-900 text-center font-bold"
              style={{ direction: "ltr" }}
            />
          </div>
        )}
        {/* المستندات المطلوبة */}
        {requireUpload && (
          <div className="my-1 w-full flex flex-col max-w-full">
            <div className="flex items-center gap-1 font-bold text-emerald-700 text-xs mb-0.5">
              <FaFileAlt />{" "}
              {lang === "ar" ? "المستندات المطلوبة" : "Documents"}
            </div>
            <ul className="list-inside list-disc text-gray-700 text-[12px] pl-2 space-y-0.5 max-w-full mb-2">
              {requiredDocs.map((doc, i) => (
                <li key={i} className="truncate">
                  {uploadedDocs[doc] ? (
                    <span className="text-green-700 font-bold">
                      <FaCheck className="inline mr-1" />
                      {doc}
                    </span>
                  ) : (
                    doc
                  )}
                </li>
              ))}
            </ul>
            <button
              className="w-full py-1.5 mt-1 rounded-full font-black shadow text-base transition
                bg-gradient-to-r from-cyan-400 via-cyan-600 to-cyan-400 text-white
                hover:from-cyan-600 hover:to-cyan-500 hover:shadow-cyan-200/90
                hover:scale-105 duration-150
                focus:outline-none focus:ring-2 focus:ring-cyan-400
                cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                openDocsModal();
              }}
            >
              {lang === "ar" ? "رفع المستندات" : "Upload Documents"}
            </button>
          </div>
        )}

        {/* مودال رفع المستندات */}
        <ServiceUploadModal
          open={showDocsModal}
          onClose={closeDocsModal}
          requiredDocs={requiredDocs}
          uploadedDocs={uploadedDocs}
          setUploadedDocs={handleDocsUploaded}
          userId={userId}
          lang={lang}
          service={{ serviceId, name }}
        />

        {/* أزرار الدفع */}
        <div className="mt-auto w-full flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openPaymentModal();
            }}
            className={`
              w-full py-1.5 rounded-full font-black shadow text-base transition
              bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400 text-white
              hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-200/90
              hover:scale-105 duration-150
              focus:outline-none focus:ring-2 focus:ring-emerald-400
              cursor-pointer
              ${!canPay ? "opacity-40 pointer-events-none" : ""}
            `}
            style={{ cursor: "pointer" }}
            disabled={!canPay}
          >
            {lang === "ar" ? "ادفع الآن" : "Pay Now"}
          </button>
          {canUseCoinDiscount && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openCoinDiscountModal();
              }}
              className={`
                w-full py-1.5 rounded-full font-black shadow text-base transition
                bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-white
                hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-200/90
                hover:scale-105 duration-150
                focus:outline-none focus:ring-2 focus:ring-yellow-400
                cursor-pointer
                ${!canPay ? "opacity-40 pointer-events-none" : ""}
              `}
              style={{ cursor: "pointer" }}
              disabled={!canPay}
            >
              {lang === "ar"
                ? "خصم 10% مقابل 100 كوين"
                : "10% discount for 100 coins"}
            </button>
          )}
        </div>
      </div>
      {/* نافذة الدفع العادية */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[340px] flex flex-col items-center gap-6 relative">
            <button
              onClick={() => {
                setShowPayModal(false);
                setPayMsg("");
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-700 text-2xl px-2"
              title="إغلاق"
              tabIndex={0}
              type="button"
              style={{ cursor: "pointer" }}
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-emerald-900">
              {lang === "ar"
                ? "اختر طريقة الدفع"
                : "Choose Payment Method"}
            </h2>
            {repeatable && (
              <div className="text-xs text-gray-700 font-bold mb-3">
                {lang === "ar"
                  ? `عدد مرات الخدمة: ${quantity}`
                  : `Quantity: ${quantity}`}
              </div>
            )}
            {allowPaperCount && (
              <div className="text-xs text-gray-700 font-bold mb-3">
                {lang === "ar"
                  ? `عدد الأوراق: ${paperCount}`
                  : `Number of Pages: ${paperCount}`}
              </div>
            )}
            {payMsg && (
              <div className="text-center text-base font-bold mt-2">
                {payMsg}
              </div>
            )}
            {!payMsg && (
              <>
                <button
                  className="w-full py-2 rounded-full text-white font-bold bg-emerald-500 hover:bg-emerald-700 transition mb-2"
                  onClick={() => handlePayment("wallet")}
                  disabled={isPaying}
                  style={{ cursor: "pointer" }}
                >
                  {lang === "ar"
                    ? "الدفع من المحفظة"
                    : "Pay from Wallet"}
                </button>
                <button
                  className="w-full py-2 rounded-full text-white font-bold bg-gray-600 hover:bg-gray-800 transition"
                  onClick={() => handlePayment("gateway")}
                  disabled={isPaying}
                  style={{ cursor: "pointer" }}
                >
                  {lang === "ar"
                    ? "الدفع عبر بوابة الدفع"
                    : "Pay via Payment Gateway"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* نافذة خصم الكوينات */}
      {showCoinDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[350px] flex flex-col items-center gap-6 relative">
            <button
              onClick={() => {
                setShowCoinDiscountModal(false);
                setPayMsg("");
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-700 text-2xl px-2"
              title="إغلاق"
              tabIndex={0}
              type="button"
              style={{ cursor: "pointer" }}
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-yellow-700">
              {lang === "ar"
                ? "خصم 10% مقابل 100 كوين"
                : "10% discount for 100 coins"}
            </h2>
            {repeatable && (
              <div className="text-xs text-gray-700 font-bold mb-3">
                {lang === "ar"
                  ? `عدد مرات الخدمة: ${quantity}`
                  : `Quantity: ${quantity}`}
              </div>
            )}
            {allowPaperCount && (
              <div className="text-xs text-gray-700 font-bold mb-3">
                {lang === "ar"
                  ? `عدد الأوراق: ${paperCount}`
                  : `Number of Pages: ${paperCount}`}
              </div>
            )}
            {payMsg && (
              <div className="text-center text-base font-bold mt-2">
                {payMsg}
              </div>
            )}
            {!payMsg && (
              <>
                <div className="text-center text-sm font-bold text-gray-700 mb-1">
                  {lang === "ar"
                    ? `سيتم خصم 100 كوين من رصيدك وخصم 10% (${Math.floor(
                        totalServicePrice * 0.1
                      )} درهم) من قيمة الخدمة.`
                    : `100 coins will be deducted and 10% (${Math.floor(
                        totalServicePrice * 0.1
                      )} AED) discount applied.`}
                </div>
                <div className="text-center text-sm text-gray-600 mb-2">
                  {lang === "ar"
                    ? `المبلغ المتبقي للدفع: ${
                        totalServicePrice - Math.floor(totalServicePrice * 0.1)
                      } درهم`
                    : `Rest to pay: ${
                        totalServicePrice - Math.floor(totalServicePrice * 0.1)
                      } AED`}
                </div>
                <button
                  className="w-full py-2 rounded-full text-white font-bold bg-emerald-500 hover:bg-emerald-700 transition mb-2"
                  onClick={() => handlePayment("wallet", true)}
                  disabled={isPaying}
                  style={{ cursor: "pointer" }}
                >
                  {lang === "ar"
                    ? "الدفع من المحفظة"
                    : "Pay from Wallet"}
                </button>
                <button
                  className="w-full py-2 rounded-full text-white font-bold bg-gray-600 hover:bg-gray-800 transition"
                  onClick={() => handlePayment("gateway", true)}
                  disabled={isPaying}
                  style={{ cursor: "pointer" }}
                >
                  {lang === "ar"
                    ? "الدفع عبر بوابة الدفع"
                    : "Pay via Payment Gateway"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="absolute -bottom-6 right-0 left-0 w-full h-8 bg-gradient-to-t from-emerald-100/60 via-white/20 to-transparent blur-2xl opacity-80 z-0 pointer-events-none"></div>
    </div>
  );
}