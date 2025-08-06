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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  // Responsive font size for card name
  const nameRef = useRef(null);
  useEffect(() => {
    const adjustFontSize = () => {
      const el = nameRef.current;
      if (el) {
        el.style.fontSize = "2rem"; // default large
        el.style.whiteSpace = "nowrap";
        el.style.lineHeight = "1.1";
        let fontSize = 32;
        while (el.scrollWidth > el.offsetWidth && fontSize > 16) {
          fontSize -= 2;
          el.style.fontSize = fontSize + "px";
        }
      }
    };
    adjustFontSize();
    window.addEventListener("resize", adjustFontSize);
    return () => window.removeEventListener("resize", adjustFontSize);
  }, [name, name_en, translatedName, lang]);

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

  // تفاصيل الخدمة تظهر في نافذة خارج الكارت
  function openDetailModal() {
    setShowDetailModal(true);
  }
  function closeDetailModal() {
    setShowDetailModal(false);
  }

  // نافذة التفاصيل (الوصف + المستندات)
  function renderDetailsModal() {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
        style={{ direction: lang === "ar" ? "rtl" : "ltr" }}
        tabIndex={0}
        onClick={closeDetailModal}
      >
        <div
          className="bg-white rounded-xl shadow-2xl border border-emerald-200 max-w-md w-full p-4 relative overflow-y-auto"
          style={{ minWidth: 250, maxWidth: 380, maxHeight: '70vh' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={closeDetailModal}
            className="absolute top-2 left-2 text-gray-400 hover:text-red-700 text-2xl px-2"
            title={lang === "ar" ? "إغلاق" : "Close"}
            style={{ cursor: "pointer" }}
          >×</button>
          <div className="text-lg font-bold text-emerald-700 mb-2 text-center">{displayName}</div>
          {/* الوصف */}
          <div className="text-gray-700 text-xs whitespace-pre-line mb-3">{displayLongDescription || displayDescription}</div>
          {/* المستندات المطلوبة */}
          {requiredDocs.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1 font-bold text-emerald-700 text-xs mb-0.5">
                <FaFileAlt /> {lang === "ar" ? "المستندات المطلوبة" : "Required Documents"}
              </div>
              <ul className="list-inside list-disc text-gray-700 text-[13px] pl-2 space-y-0.5 max-w-full mb-2">
                {requiredDocs.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // فتح نافذة التفاصيل لما يقف أو يضغط على الكارت
  function handleMouseEnter() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoverTimeout(
      setTimeout(() => {
        openDetailModal();
      }, 1200)
    );
  }
  function handleMouseLeave() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    closeDetailModal();
  }

  // باقي الكارت كما هو (السعر، المدخلات، الزراير ...)
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
      onClick={openDetailModal}
    >
      {/* الكوينات */}
      <div className="absolute top-4 left-4 flex items-center group/coins z-10">
        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full shadow border border-yellow-100 min-w-[36px] cursor-help">
          <FaCoins className="text-yellow-500" size={13} />
          <span className="text-yellow-700 font-bold text-xs">{coins}</span>
        </div>
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-7 whitespace-nowrap bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded shadow-lg opacity-0 group-hover/coins:opacity-100 transition pointer-events-none">
          {lang === "ar" ? `عدد الكوينات: ${coins} كاش باك${repeatable ? ` × ${quantity}` : ""}` : `Coins cashback: ${coins}${repeatable ? ` × ${quantity}` : ""}`}
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
      {/* اسم الخدمة بحجم متغير حسب الطول */}
      <div className="flex flex-col items-center px-3 pt-1 pb-3 flex-1 w-full min-h-0 justify-center">
        <h3
          ref={nameRef}
          className="font-black text-emerald-800 text-center mb-1 drop-shadow-sm tracking-tight max-w-full"
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            width: "100%",
            lineHeight: "1.1",
            transition: 'font-size 0.2s',
          }}
        >
          {lang === "en"
            ? (name_en || translatedName || name || "")
            : (name || name_en || "")}
        </h3>
      </div>
      {/* باقي الكارت كما هو */}
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
          <table className="w-full text-xs text-gray-700 mb-1">
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
              <tr>
                <td className="font-extrabold text-emerald-900">{lang === "ar" ? "الإجمالي" : "Total"}</td>
                <td className="font-extrabold text-emerald-900 text-right">
                  {totalServicePrice} {lang === "ar" ? "د.إ" : "AED"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* مدخلات الخدمة */}
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
      {allowPaperCount && (
        <div className="flex flex-col items-center mb-2 w-full">
          <label className="text-xs font-bold text-gray-600 mb-1">
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
            className="w-[70px] p-1 rounded border border-emerald-200 text-emerald-900 text-center font-bold"
            style={{ direction: "ltr" }}
          />
        </div>
      )}
      {/* رفع المستندات */}
      {requireUpload && (
        <div className="my-1 w-full flex flex-col max-w-full">
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
      <ServiceUploadModal
        open={showDocsModal}
        onClose={closeDocsModal}
        requiredDocs={requiredDocs}
        uploadedDocs={uploadedDocs}
        setUploadedDocs={handleDocsUploaded}
        userId={userId}
        lang={lang}
        service={{ serviceId, name: name }}
      />
      {/* أزرار الدفع كما هي */}
      <div className="mt-auto w-full flex flex-col gap-2 px-3 pb-3">
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
      {/* نافذة التفاصيل خارج الكارت */}
      {showDetailModal && renderDetailsModal()}
      <div className="absolute -bottom-6 right-0 left-0 w-full h-8 bg-gradient-to-t from-emerald-100/60 via-white/20 to-transparent blur-2xl opacity-80 z-0 pointer-events-none"></div>
    </div>
  );
}