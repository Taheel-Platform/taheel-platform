"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  FaFileAlt,
  FaBuilding,
  FaUserTie,
  FaUser,
  FaTag,
  FaCoins,
} from "react-icons/fa";
import ServiceUploadModal from "./ServiceUploadModal";
import ServicePayModal from "./ServicePayModal";
import { translateText } from "@/lib/translateText";
import { createPortal } from "react-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase.client";

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
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [translatedName, setTranslatedName] = useState("");
  const [translatedDescription, setTranslatedDescription] = useState("");
  const [translatedLongDescription, setTranslatedLongDescription] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [paperCount, setPaperCount] = useState(1);
  const [currentDocName, setCurrentDocName] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  // Tooltip يظهر فقط عند الوقوف على اسم الخدمة
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef();


useEffect(() => {
  if (!userId) return;
  const userRef = doc(firestore, "users", userId);
  const unsubscribe = onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      setWallet(Number(data.walletBalance ?? 0));
      setCoinsBalance(Number(data.coins ?? 0));
    }
  });
  return () => unsubscribe();
}, [userId]);

  // أضف هنا دالة handlePaid
function handlePaid() {
  setIsPaid(true);
}



function handleAllDocsUploaded() {
  setShowDocsModal(false); // يقفل مودال رفع المستندات
  setShowPayModal(true);   // يفتح مودال الدفع مباشرة
}


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

  // الحسابات المالية
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
    setCurrentDocName(""); // حماية إضافية: تصفير اسم المستند بعد غلق المدوال
  }
  function handleDocsUploaded(newDocs) {
    setUploadedDocs(newDocs);
  }
  function openPaymentModal() {
    setShowPayModal(true);
    setPayMsg("");
  }

  // Tooltip المنبثقة فوق الكارت (تظهر خارج الكارت عند الوقوف على اسم الخدمة فقط)
function renderTooltip() {
  return (
    <div
      className="fixed z-[200] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
      style={{
        minWidth: 280,
        maxWidth: 380,
        boxShadow: "0 2px 24px 0 rgba(16,185,129,0.18)",
      }}
    >
      <div
        className="bg-white rounded-xl border border-emerald-400 shadow-lg p-4 w-full text-sm"
        style={{ pointerEvents: "none" }}
      >
          <h3 className="text-base font-extrabold text-emerald-700 mb-1 text-center">
            {lang === "en" ? (name_en || translatedName || name || "") : (name || name_en || "")}
          </h3>
          <div className="text-gray-800 text-xs mb-2 text-center">
            {lang === "en"
              ? (longDescription_en || translatedLongDescription || description_en || translatedDescription || description || "")
              : (longDescription || longDescription_en || description || description_en || "")}
          </div>
          {requiredDocs.length > 0 && (
            <>
              <div className="font-bold text-emerald-600 mb-1 text-xs text-center">
                <FaFileAlt className="inline mr-1" />
                {lang === "ar" ? "المستندات المطلوبة" : "Required Documents"}
              </div>
              <ul className="list-inside list-disc text-xs text-gray-700 mb-2 text-right">
                {requiredDocs.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </>
          )}
          {/* جدول السعر مختصر */}
          <table className="w-full text-xs text-emerald-900 font-bold border border-emerald-200 rounded-xl shadow mb-2 bg-emerald-50 overflow-hidden">
            <tbody>
              <tr>
                <td>{lang === "ar" ? "سعر الخدمة" : "Service Price"}</td>
                <td className="text-right">
                  {price} {lang === "ar" ? "د.إ" : "AED"}
                </td>
              </tr>
              <tr>
                <td>{lang === "ar" ? "رسوم الطباعة" : "Printing Fee"}</td>
                <td className="text-right">
                  {printingFee} {lang === "ar" ? "د.إ" : "AED"}
                </td>
              </tr>
              <tr>
                <td>{lang === "ar" ? "الإجمالي" : "Total"}</td>
                <td className="font-extrabold text-emerald-900 text-right">
                  {(Number(price) + Number(printingFee))} {lang === "ar" ? "د.إ" : "AED"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function handleNameMouseEnter() {
    setShowTooltip(true);
  }
  function handleNameMouseLeave() {
    setShowTooltip(false);
  }

  function getServiceNameFontSize() {
    const nameStr =
      lang === "en"
        ? (name_en || translatedName || name || "")
        : (name || name_en || "");
    if (nameStr.length > 38) return "text-[16px]";
    if (nameStr.length > 28) return "text-[18px]";
    if (nameStr.length > 18) return "text-[20px]";
    return "text-[22px]";
  }

  return (
    <div
      ref={cardRef}
      className={`
        relative w-full max-w-sm min-w-[242px] h-[340px] flex flex-col
        rounded-2xl border-0 shadow-lg shadow-emerald-100/60 hover:shadow-emerald-300/70
        transition-all duration-300 overflow-visible bg-gradient-to-br ${style.gradient} backdrop-blur-xl
        ring-1 ${style.ring} cursor-pointer
      `}
      tabIndex={0}
      role="button"
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
        justifyContent: 'space-between'
      }}
    >
      {/* الكوينات */}
      <div className="absolute top-3 left-3 flex items-center group/coins z-10">
        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full shadow border border-yellow-100 min-w-[30px] cursor-help">
          <FaCoins className="text-yellow-500" size={12} />
          <span className="text-yellow-700 font-bold text-xs">{coins}</span>
        </div>
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-7 whitespace-nowrap bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded shadow-lg opacity-0 group-hover/coins:opacity-100 transition pointer-events-none">
          {lang === "ar" ? `عدد الكوينات: ${coins} كاش باك${repeatable ? ` × ${quantity}` : ""}` : `Coins cashback: ${coins}${repeatable ? ` × ${quantity}` : ""}`}
        </div>
      </div>
      {/* التصنيف */}
      <div
        className={`flex items-center justify-center gap-2 px-2 py-1
        text-[10px] font-extrabold rounded-full shadow
        ${style.badge} ${style.text} bg-opacity-90 backdrop-blur-sm border border-white/40
        w-fit mx-auto mt-3 mb-2 select-none
      `}
      >
        {style.icon()}
        <span>{lang === "ar" ? style.labelAr : style.labelEn}</span>
      </div>
      {/* اسم الخدمة بخط مرن واجبارى الظهور مع Tooltip عند الوقوف عليه فقط */}
<div className="flex flex-col items-center px-2 pt-1 pb-1 flex-1 w-full min-h-0">
  <h3
    className={`font-black text-emerald-800 text-center mb-1 drop-shadow-sm tracking-tight max-w-full truncate ${getServiceNameFontSize()}`}
    style={{
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      width: "100%",
      minHeight: "30px",
      lineHeight: "1.15",
      display: "block",
      cursor: "pointer"
    }}
    title={
      lang === "en"
        ? (name_en || translatedName || name || "")
        : (name || name_en || "")
    }
    onMouseEnter={handleNameMouseEnter}
    onMouseLeave={handleNameMouseLeave}
  >
    {lang === "en"
      ? (name_en || translatedName || name || "")
      : (name || name_en || "")}
  </h3>
  {showTooltip && renderTooltip()}

  {/* السعر الثابت تحت اسم الخدمة مباشرة */}
  <div className="w-full flex flex-col items-center bg-white/80 rounded-xl border border-emerald-100 shadow p-2 mt-1 mb-2">
    <div className="flex items-center gap-2 mb-1">
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
    <table className="w-full text-sm text-gray-700 mb-1">
      <tbody>
        <tr>
          <td>{lang === "ar" ? "سعر الخدمة" : "Service Price"}</td>
          <td className="text-right">
            {servicePriceTotal} {lang === "ar" ? "د.إ" : "AED"}
          </td>
        </tr>
        <tr>
          <td>{lang === "ar" ? "رسوم الطباعة" : "Printing Fee"}</td>
          <td className="text-right">
            {printingTotal} {lang === "ar" ? "د.إ" : "AED"}
          </td>
        </tr>
        <tr>
          <td>{lang === "ar" ? "ضريبة القيمة المضافة 5%" : "VAT 5% on Printing"}</td>
          <td className="text-right">
            {taxTotal.toFixed(2)} {lang === "ar" ? "د.إ" : "AED"}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
        {/* عداد عدد مرات الخدمة بشكل صغير */}
        {repeatable && (
          <div className="flex flex-row items-center justify-center mt-1 gap-1">
            <label className="text-[10px] font-bold text-gray-600 mb-0">
              {lang === "ar" ? "عدد مرات" : "Qty"}
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(99, Number(e.target.value))))
              }
              className="w-[36px] p-0.5 rounded border border-emerald-200 text-emerald-900 text-center font-bold text-xs"
              style={{ direction: "ltr", height: "22px" }}
            />
          </div>
        )}
        {/* عداد عدد الأوراق بشكل صغير */}
        {allowPaperCount && (
          <div className="flex flex-row items-center justify-center mt-1 gap-1">
            <label className="text-[10px] font-bold text-gray-600 mb-0">
              {lang === "ar" ? "عدد الأوراق" : "Pages"}
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
              className="w-[36px] p-0.5 rounded border border-emerald-200 text-emerald-900 text-center font-bold text-xs"
              style={{ direction: "ltr", height: "22px" }}
            />
          </div>
        )}
        {/* رفع المستندات */}
        {requireUpload && (
          <div className="w-full flex flex-col max-w-full mt-1 mb-1">
{requireUpload && (
  <div className="w-full flex flex-col max-w-full mt-1 mb-1">
    <button
      className="w-full py-1 rounded-full font-black shadow text-xs transition
        bg-gradient-to-r from-cyan-400 via-cyan-600 to-cyan-400 text-white
        hover:from-cyan-600 hover:to-cyan-500 hover:shadow-cyan-200/90
        hover:scale-105 duration-150
        focus:outline-none focus:ring-2 focus:ring-cyan-400
        cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        openDocsModal();
      }}
    >
      {lang === "ar" ? "رفع المستندات المطلوبة" : "Upload required documents"}
    </button>
  </div>
)}
          </div>
        )}
{typeof window !== "undefined" && showDocsModal &&
  createPortal(
    <ServiceUploadModal
      open={showDocsModal}
      onClose={closeDocsModal}
      requiredDocs={requiredDocs}
      uploadedDocs={uploadedDocs}
      setUploadedDocs={handleDocsUploaded}
      userId={userId}
      lang={lang}
      service={{ serviceId, name: name }}
      onAllDocsUploaded={handleAllDocsUploaded}
    />,
    document.body
  )
}
        {/* زرار التقديم دايما ظاهر في الأسفل */}
        <button
  onClick={(e) => {
    e.stopPropagation();
    setShowPayModal(true); // يفتح مدوال الدفع
  }}
  className={`
    w-full py-1 rounded-full font-black shadow text-xs transition
    bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400 text-white
    hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-200/90
    hover:scale-105 duration-150
    focus:outline-none focus:ring-2 focus:ring-emerald-400
    cursor-pointer
    ${(!canPay || isPaid) ? "opacity-40 pointer-events-none" : ""}
    mt-1
  `}
  style={{ cursor: "pointer" }}
  disabled={!canPay || isPaid}
>
  {isPaid
    ? (lang === "ar" ? "تم الدفع" : "Paid")
    : (lang === "ar" ? "تقدم الآن" : "Apply Now")}
</button>
      </div>
      {/* مدوال الدفع */}
              <ServicePayModal
  open={showPayModal}
  onClose={() => setShowPayModal(false)}
  serviceName={name}
  totalPrice={totalServicePrice}
  printingFee={printingTotal}
  coinsBalance={coinsBalance}
  cashbackCoins={coins}
  userWallet={wallet}
  lang={lang}
  userId={userId}
  userEmail={userEmail}
  onPaid={handlePaid}
  uploadedDocs={uploadedDocs}
/>
      <div className="absolute -bottom-6 right-0 left-0 w-full h-8 bg-gradient-to-t from-emerald-100/60 via-white/20 to-transparent blur-2xl opacity-80 z-0 pointer-events-none"></div>
    </div>
  );
} 