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
import { translateText } from "@/lib/translateText";

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
  tax,
  clientPrice,
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
  const requiredDocs = requiredDocuments || [];
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.resident;

  const [wallet, setWallet] = useState(userWallet);
  const [coinsBalance, setCoinsBalance] = useState(userCoins);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCoinDiscountModal, setShowCoinDiscountModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [translatedName, setTranslatedName] = useState("");
  const [translatedDescription, setTranslatedDescription] = useState("");
  const [translatedLongDescription, setTranslatedLongDescription] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [paperCount, setPaperCount] = useState(1);
  const [showDetailTable, setShowDetailTable] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function doTranslation() {
      if (lang === "en") {
        if (!name_en && name) {
          const tname = await translateText(name, "en");
          if (!ignore) setTranslatedName(tname);
        }
        if (!description_en && description) {
          const tdesc = await translateText(description, "en");
          if (!ignore) setTranslatedDescription(tdesc);
        }
        if (!longDescription_en && longDescription) {
          const tlong = await translateText(longDescription, "en");
          if (!ignore) setTranslatedLongDescription(tlong);
        }
      }
    }
    doTranslation();
    return () => { ignore = true; };
  }, [lang, name, name_en, description, description_en, longDescription, longDescription_en]);

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

  const baseServiceCount = repeatable ? quantity : 1;
  const basePaperCount = allowPaperCount ? paperCount : 1;
  const servicePriceTotal = (Number(price) || 0) * baseServiceCount;
  const printingTotal = (Number(printingFee) || 0) * basePaperCount;
  const taxTotal = typeof tax !== "undefined"
    ? Number(tax) * basePaperCount
    : +(Number(printingFee) * 0.05 * basePaperCount).toFixed(2);
  const totalServicePrice =
    typeof clientPrice !== "undefined"
      ? Number(clientPrice) * baseServiceCount
      : servicePriceTotal + printingTotal + taxTotal;

  const allDocsUploaded =
    !requireUpload || requiredDocs.every((doc) => uploadedDocs[doc]);
  const isPaperCountReady = !allowPaperCount || (paperCount && paperCount > 0);
  const canPay = allDocsUploaded && isPaperCountReady;

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
        const maxDiscountDirham = printingTotal * 0.10;
        const maxDiscountCoins = Math.floor(maxDiscountDirham * 100);
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
        await updateDoc(doc(firestore, "users", userId), { coins: currentCoins - coinsToUse });
        setCoinsBalance(currentCoins - coinsToUse);
        currentCoins = currentCoins - coinsToUse;
      } else {
        const newCoins = currentCoins + coins * baseServiceCount;
        await updateDoc(doc(firestore, "users", userId), { coins: newCoins });
        setCoinsBalance(newCoins);
        currentCoins = newCoins;
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
        await updateDoc(doc(firestore, "users", userId), { walletBalance: currentWallet - amountToPay });
        setWallet(currentWallet - amountToPay);
      }

      const orderNumber = generateOrderNumber();
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

  const displayName = lang === "en"
    ? (name_en || translatedName || name || "")
    : (name || name_en || "");
  const displayDescription = lang === "en"
    ? (description_en || translatedDescription || description || "")
    : (description || description_en || "");
  const displayLongDescription = lang === "en"
    ? (longDescription_en || translatedLongDescription || longDescription || "")
    : (longDescription || longDescription_en || "");

  // جدول التفاصيل في Popover/Tooltip خارج الكارت
  function renderDetailsTable() {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
        style={{ direction: lang === "ar" ? "rtl" : "ltr" }}
        tabIndex={0}
        onClick={() => setShowDetailTable(false)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl border border-emerald-200 max-w-md w-full p-4 relative overflow-y-auto"
          style={{ minWidth: 250, maxWidth: 380, maxHeight: '70vh' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setShowDetailTable(false)}
            className="absolute top-2 left-2 text-gray-400 hover:text-red-700 text-2xl px-2"
            title={lang === "ar" ? "إغلاق" : "Close"}
            style={{ cursor: "pointer" }}
          >×</button>
          <div className="text-lg font-bold text-emerald-700 mb-2 text-center">{displayName}</div>
          <div className="text-gray-700 text-xs whitespace-pre-line mb-1">{displayLongDescription || displayDescription}</div>
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
        minHeight: 340,
        maxHeight: 340,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
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
      {/* محتوى الكارت: اسم الخدمة بشكل واضح وجذاب */}
      <div className="flex flex-col items-center px-3 pt-1 pb-3 flex-1 w-full min-h-0 justify-center">
        <h3 className="text-2xl font-black text-emerald-800 text-center mb-1 drop-shadow-sm tracking-tight max-w-full truncate">
          {displayName}
        </h3>
      </div>
      {/* أزرار الدفع وغيرها تظهر دائماً في الكارت */}
      <div className="w-full flex flex-col gap-2 px-3 pb-3">
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
      {/* جدول التفاصيل في Popover/Tooltip خارج الكارت */}
      {showDetailTable && renderDetailsTable()}
      <div className="absolute -bottom-6 right-0 left-0 w-full h-8 bg-gradient-to-t from-emerald-100/60 via-white/20 to-transparent blur-2xl opacity-80 z-0 pointer-events-none"></div>
    </div>
  );
}