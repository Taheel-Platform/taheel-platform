"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  FaFileAlt,
  FaBuilding,
  FaUserTie,
  FaUser,
  FaTag,
  FaCoins,
  FaCheck,
  FaInfoCircle,
} from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, updateDoc, collection, addDoc } from "firebase/firestore";
import ServiceUploadModal from "./ServiceUploadModal";

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
  name_en,
  description,
  description_en,
  price,
  printingFee = 0,
  tax, // الضريبة (يمكن أن تأتي من الداتا مباشرة)
  clientPrice, // السعر النهائي للعميل (يمكن أن تأتي من الداتا مباشرة)
  duration,
  requiredDocuments = [],
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
  userEmail,
  longDescription,
  longDescription_en,
}) {
  // LOG 1: كل البراميترات القادمة
  console.log("[CARD PROPS]", {
    category, name, price, printingFee, tax, clientPrice, requiredDocuments,
    coins, userId, userWallet, userCoins, lang, repeatable, requireUpload, serviceId,
    allowPaperCount, pricePerPage, userEmail, longDescription, longDescription_en
  });

  // المستندات المطلوبة
  const requiredDocs = requiredDocuments || [];

  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.resident;
  const [wallet, setWallet] = useState(userWallet);
  const [coinsBalance, setCoinsBalance] = useState(userCoins);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCoinDiscountModal, setShowCoinDiscountModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [quantity, setQuantity] = useState(1);

  // رفع المستندات
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [showDocsModal, setShowDocsModal] = useState(false);

  // عدد الأوراق
  const [paperCount, setPaperCount] = useState(1);

  // جدول التفاصيل يظهر عند الوقوف فترة طويلة
  const [showDetailTable, setShowDetailTable] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  // Popover للوصف المطول
  const [showDescPopover, setShowDescPopover] = useState(false);

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
      } catch (err) {}
    };
    fetchUser();
  }, [userId]);

  // الحسابات المالية
  const baseServiceCount = repeatable ? quantity : 1;
  const basePaperCount = allowPaperCount ? paperCount : 1;
  // السعر الأصلي للخدمة مضروب في الكمية
  const servicePriceTotal = (Number(price) || 0) * baseServiceCount;
  // رسوم الطباعة مضروبة في عدد الأوراق
  const printingTotal = (Number(printingFee) || 0) * basePaperCount;
  // الضريبة: من الحقل tax إن وجد، أو احتسابها من رسوم الطباعة
  const taxTotal = typeof tax !== "undefined"
    ? Number(tax) * basePaperCount
    : +(Number(printingFee) * 0.05 * basePaperCount).toFixed(2);
  // السعر النهائي للعميل: من الحقل clientPrice إن وجد، أو الحساب اليدوي
  const totalServicePrice =
    typeof clientPrice !== "undefined"
      ? Number(clientPrice) * baseServiceCount
      : servicePriceTotal + printingTotal + taxTotal;

  // LOG 2: القيم المالية المحسوبة
  console.log("[CARD CALC]", {
    servicePriceTotal, printingTotal, taxTotal, totalServicePrice,
    baseServiceCount, basePaperCount
  });

  // التحقق من رفع كل المستندات المطلوبة
  const allDocsUploaded =
    !requireUpload || requiredDocs.every((doc) => uploadedDocs[doc]);

  // التحقق من تحديد عدد الأوراق
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

  // إرسال إشعار
  async function sendNotification({ userId, orderNumber, orderName }) {
    try {
      await addDoc(collection(firestore, "notifications"), {
        body:
          lang === "ar"
            ? `تم تقديم طلبك بنجاح. رقم الطلب: ${orderNumber}`
            : `Your order was submitted successfully. Order Number: ${orderNumber}`,
        isRead: false,
        notificationId: `notif-${Date.now()}`,
        relatedRequest: orderNumber,
        targetId: userId,
        timestamp: new Date().toISOString(),
        title: lang === "ar" ? "تحديث حالة الطلب" : "Order Status Update",
        type: "status",
        orderName: orderName,
      });
    } catch (err) {}
  }

  // إرسال إيميل
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
    } catch (err) {}
  }

async function handlePayment(method, withCoinDiscount = false) {
  setIsPaying(true);
  setPayMsg("");
  try {
    let currentCoins = Number(coinsBalance) || 0;
    let currentWallet = Number(wallet) || 0;
    let amountToPay = totalServicePrice;
    let discount = 0;

    if (withCoinDiscount) {
      // 1. احسب الحد الأقصى للخصم المسموح (10% من رسوم الطباعة فقط)
      const maxDiscountDirham = printingTotal * 0.10;
      const maxDiscountCoins = Math.floor(maxDiscountDirham * 100); // عدد الكوينات اللي يقدر يستخدمها

      // 2. الكوينات اللي يقدر العميل يستخدمها (لا تتجاوز رصيده ولا الحد الأعلى)
      const coinsToUse = Math.min(currentCoins, maxDiscountCoins);

      if (coinsToUse < 1) {
        setPayMsg(
          <span className="text-red-600 font-bold">
            {lang === "ar" ? "رصيد الكوينات غير كافي للخصم" : "Not enough coins for discount"}
          </span>
        );
        setIsPaying(false);
        return;
      }

      discount = (coinsToUse * 0.01);
      amountToPay = amountToPay - discount;

      // خصم الكوينات من رصيد العميل
      await updateDoc(userRef, { coins: currentCoins - coinsToUse });
      setCoinsBalance(currentCoins - coinsToUse);
      if (typeof setCoinsBalance === "function") {
        setCoinsBalance(currentCoins - coinsToUse);
      }
      currentCoins = currentCoins - coinsToUse;
    } else {
      // إضافة كوينات الخدمة لرصيد العميل
      const newCoins = currentCoins + coins * baseServiceCount;
      await updateDoc(userRef, { coins: newCoins });
      setCoinsBalance(newCoins);
      if (typeof setCoinsBalance === "function") {
        setCoinsBalance(newCoins);
      }
      currentCoins = newCoins;
    }

// الدفع من المحفظة
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
      const orderNumber = generateOrderNumber();

      // إضافة الطلب في Collection "requests"
      await addDoc(collection(firestore, "requests"), {
        trackingNumber: orderNumber,
        orderNumber: orderNumber,
        clientId: userId,
        orderName: lang === "ar"
          ? (name || "")
          : (name_en || name || ""),
        serviceId: serviceId,
        quantity: baseServiceCount,
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

      await sendNotification({
        userId,
        orderNumber,
        orderName: lang === "ar"
          ? (name || "")
          : (name_en || name || ""),
      });

      if (userEmail) {
        await sendOrderEmail({
          to: userEmail,
          orderNumber,
          serviceName: lang === "ar"
            ? (name || "")
            : (name_en || name || ""),
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
        onPaid(method, baseServiceCount, uploadedDocs, paperCount);
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

  // ترجمة عناوين تفاصيل السعر
  const labels = {
    total: lang === "ar" ? "الإجمالي" : "Total",
    service: lang === "ar" ? "سعر الخدمة" : "Service Price",
    printing: lang === "ar" ? "رسوم الطباعة" : "Printing Fee",
    tax: lang === "ar" ? "ضريبة القيمة المضافة 5%" : "VAT 5% on Printing",
    perPaper: lang === "ar" ? "لكل ورقة" : "per page",
    quantity: lang === "ar" ? "عدد مرات الخدمة" : "Quantity",
    papers: lang === "ar" ? "عدد الأوراق" : "Pages",
    documents: lang === "ar" ? "المستندات المطلوبة" : "Required Documents",
    cashback: cashbackText,
    showDetails: lang === "ar" ? "تفاصيل الخدمة" : "Service Details",
    hideDetails: lang === "ar" ? "إغلاق التفاصيل" : "Hide Details",
    more: lang === "ar" ? "تفاصيل أكثر" : "More Details",
  };

  // اسم الخدمة والوصف حسب اللغة
  const displayName = lang === "ar"
    ? (name || "")
    : (name_en || name || "");
  const displayDescription = lang === "ar"
    ? (description || "")
    : (description_en || description || "");
  const displayLongDescription = lang === "ar"
    ? (longDescription || "")
    : (longDescription_en || longDescription || "");

  // تفاصيل السعر في جدول (جدول التفاصيل عند الوقوف الطويل أو الضغط على زر التفاصيل)
function renderDetailsTable() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
      style={{ direction: lang === "ar" ? "rtl" : "ltr" }}
      tabIndex={0}
      onClick={() => setShowDetailTable(false)}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-emerald-200 max-w-md w-full p-4 relative"
        style={{ minWidth: 250, maxWidth: 380 }}
        onClick={e => e.stopPropagation()} // يمنع إغلاق النافذة عند الضغط داخلها
      >
        <button
          onClick={() => setShowDetailTable(false)}
          className="absolute top-2 left-2 text-gray-400 hover:text-red-700 text-2xl px-2"
          title={lang === "ar" ? "إغلاق" : "Close"}
          style={{ cursor: "pointer" }}
        >×</button>
        <table className="w-full text-xs md:text-sm text-emerald-900 font-bold mb-2">
          <tbody>
            <tr>
              <td>{labels.service}</td>
              <td>
                {Number(price) || 0} {lang === "ar" ? "د.إ" : "AED"}
                {repeatable ? ` × ${quantity}` : ""}
              </td>
            </tr>
            <tr>
              <td>
                {labels.printing}
                {allowPaperCount ? ` (${labels.perPaper})` : ""}
              </td>
              <td>
                {Number(printingFee) || 0} {lang === "ar" ? "د.إ" : "AED"}
                {allowPaperCount ? ` × ${paperCount}` : ""}
              </td>
            </tr>
            <tr>
              <td>{labels.tax}</td>
              <td>
                {taxTotal.toFixed(2)} {lang === "ar" ? "د.إ" : "AED"}
              </td>
            </tr>
            <tr>
              <td className="font-extrabold text-emerald-900">{labels.total}</td>
              <td className="font-extrabold text-emerald-900">
                {totalServicePrice} {lang === "ar" ? "د.إ" : "AED"}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="text-gray-700 text-xs whitespace-pre-line mb-1">
          {displayLongDescription || displayDescription}
        </div>
        {requiredDocs.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1 font-bold text-emerald-700 text-xs mb-0.5">
              <FaFileAlt /> {labels.documents}
            </div>
            <ul className="list-inside list-disc text-gray-700 text-[12px] pl-2 space-y-0.5 max-w-full mb-2">
              {requiredDocs.map((doc, i) => (
                <li key={i}>{doc}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => setShowDetailTable(false)}
          className="w-full py-1.5 mt-2 rounded-full font-bold shadow text-base transition
                bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400 text-white
                hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-200/90
                hover:scale-105 duration-150
                focus:outline-none focus:ring-2 focus:ring-emerald-400
                cursor-pointer"
        >
          {labels.hideDetails}
        </button>
      </div>
    </div>
  );
}

  // ظهور جدول التفاصيل بعد الوقوف 1.5 ثانية
  function handleMouseEnter() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoverTimeout(
      setTimeout(() => {
        setShowDetailTable(true);
      }, 1500)
    );
  }
  function handleMouseLeave() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setShowDetailTable(false);
  }

  // الوصف المطول Popover
  const descText = displayLongDescription || displayDescription || "";

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
        width: "100%",
        maxWidth: 370,
        minWidth: 220,
      }}
      tabIndex={0}
      role="button"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => setShowDetailTable(true)}
      onTouchEnd={() => setShowDetailTable(false)}
    >
      {/* الكوينات */}
      <div className="absolute top-4 left-4 flex items-center group/coins z-10">
        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full shadow border border-yellow-100 min-w-[36px] cursor-help">
          <FaCoins className="text-yellow-500" size={13} />
          <span className="text-yellow-700 font-bold text-xs">{coins}</span>
        </div>
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-7 whitespace-nowrap bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded shadow-lg opacity-0 group-hover/coins:opacity-100 transition pointer-events-none">
          {labels.cashback}
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
          {displayName}
        </h3>
        {/* وصف الخدمة */}
        <div className="relative w-full" style={{ minHeight: 38 }}>
          <p
            className={`text-gray-600 text-center text-sm mb-2 font-medium flex-0 max-w-full transition-all duration-200`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              zIndex: 1,
              fontSize: "15px",
              minHeight: 36,
              maxWidth: "100%",
              width: "100%",
            }}
          >
            {descText || <span>&nbsp;</span>}
          </p>
          {descText.length > 60 && (
            <button
              className="absolute top-0 right-0 z-10 flex items-center gap-1 text-xs font-bold text-emerald-700 bg-white/80 rounded-full px-2 py-0.5 shadow border border-emerald-100"
              onClick={e => { e.stopPropagation(); setShowDescPopover(true); }}
              style={{ direction: lang === "ar" ? "rtl" : "ltr" }}
              tabIndex={0}
              type="button"
            >
              <FaInfoCircle /> {labels.more}
            </button>
          )}
          {/* Popover للوصف المطول */}
          {showDescPopover && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
              onClick={() => setShowDescPopover(false)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl border border-emerald-200 max-w-md p-6 text-center relative"
                style={{ minWidth: 220, maxWidth: 380 }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowDescPopover(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-700 text-2xl px-2"
                  title={lang === "ar" ? "إغلاق" : "Close"}
                  style={{ cursor: "pointer" }}
                >×</button>
                <div className="text-lg font-bold text-emerald-700 mb-2">{displayName}</div>
                <div className="text-gray-700 whitespace-pre-line text-sm">{descText}</div>
              </div>
            </div>
          )}
        </div>
        {/* تفاصيل السعر النهائى */}
        <div className="w-full mt-2 mb-2">
          <div className="w-full flex flex-col items-center bg-white/80 rounded-xl border border-emerald-100 shadow p-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-extrabold text-emerald-700 text-2xl drop-shadow text-center">
                {totalServicePrice}
              </span>
              <span className="text-base text-gray-500 font-bold">
                {lang === "ar" ? "درهم" : "AED"}
              </span>
              <Image
                src="/aed-logo.png"
                alt={lang === "ar" ? "درهم إماراتي" : "AED"}
                width={34}
                height={34}
                className="rounded-full bg-white ring-1 ring-emerald-200 shadow"
              />
            </div>
            {/* جدول مبسط للسعر */}
            {console.log("[CARD TABLE]", {
              servicePriceTotal, printingTotal, taxTotal, totalServicePrice
            })}
            <table className="w-full text-xs text-gray-700 mb-1">
              <tbody>
                <tr>
                  <td>{labels.service}</td>
                  <td className="text-right">
                    {servicePriceTotal} {lang === "ar" ? "د.إ" : "AED"}
                  </td>
                </tr>
                <tr>
                  <td>{labels.printing}</td>
                  <td className="text-right">
                    {printingTotal} {lang === "ar" ? "د.إ" : "AED"}
                  </td>
                </tr>
                <tr>
                  <td>{labels.tax}</td>
                  <td className="text-right">
                    {taxTotal.toFixed(2)} {lang === "ar" ? "د.إ" : "AED"}
                  </td>
                </tr>
                <tr>
                  <td className="font-extrabold text-emerald-900">{labels.total}</td>
                  <td className="font-extrabold text-emerald-900 text-right">
                    {totalServicePrice} {lang === "ar" ? "د.إ" : "AED"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* عدد مرات الخدمة */}
        {repeatable && (
          <div className="flex flex-col items-center mb-2 w-full">
            <label className="text-xs font-bold text-gray-600 mb-1">
              {labels.quantity}
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
              {labels.papers}
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
              <FaFileAlt /> {labels.documents}
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
          service={{ serviceId, name: displayName }}
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
    title={
      lang === "ar"
        ? "يمكنك خصم حتى 10% من رسوم الطباعة باستخدام الكوينات المتاحة لديك"
        : "You can use your available coins to get up to 10% off the printing fee"
    }
  >
    {lang === "ar"
      ? "استخدم الكوينات للخصم (حتى 10% من رسوم الطباعة)"
      : "Use coins for discount (up to 10% of printing fee)"}
  </button>
)}
        </div>
      </div>
      {/* جدول التفاصيل إذا ضغط أو وقف فترة طويلة */}
      {showDetailTable && renderDetailsTable()}
      <div className="absolute -bottom-6 right-0 left-0 w-full h-8 bg-gradient-to-t from-emerald-100/60 via-white/20 to-transparent blur-2xl opacity-80 z-0 pointer-events-none"></div>
    </div>
  );
}