"use client";
import Image from "next/image";
import { useState, useEffect, useMemo, useRef } from "react";
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
import { firestore } from "@/lib/firebase.client";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const CATEGORY_STYLES = {
  company: {
    labelAr: "شركات",
    labelEn: "Company",
    gradient: "from-blue-100/80 via-blue-50/60 to-white/90",
    ring: "ring-blue-200/80",
    text: "text-blue-800",
    badge: "bg-gradient-to-r from-blue-300 via-blue-100 to-blue-50 shadow-blue-200/40",
    icon: () => <FaBuilding className="text-blue-500" size={15} />,
  },
  resident: {
    labelAr: "مقيمين",
    labelEn: "Resident",
    gradient: "from-green-100/80 via-green-50/60 to-white/90",
    ring: "ring-green-200/80",
    text: "text-green-800",
    badge: "bg-gradient-to-r from-green-300 via-green-100 to-green-50 shadow-green-200/40",
    icon: () => <FaUser className="text-green-500" size={15} />,
  },
  nonresident: {
    labelAr: "غير مقيمين",
    labelEn: "Non-Resident",
    gradient: "from-yellow-100/80 via-yellow-50/60 to-white/90",
    ring: "ring-yellow-200/80",
    text: "text-yellow-800",
    badge: "bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-50 shadow-yellow-200/40",
    icon: () => <FaUserTie className="text-yellow-500" size={15} />,
  },
  other: {
    labelAr: "أخرى",
    labelEn: "Other",
    gradient: "from-gray-100/80 via-gray-50/60 to-white/90",
    ring: "ring-gray-200/80",
    text: "text-gray-800",
    badge: "bg-gradient-to-r from-gray-300 via-gray-100 to-gray-50 shadow-gray-200/40",
    icon: () => <FaTag className="text-gray-500" size={15} />,
  },
};

// helpers
function firstString(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}
function deep(obj, path) {
  try {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  } catch {
    return undefined;
  }
}

// مفتاح ثابت لكل مستند (للاستخدام المنطقي فقط)
function pickDocKey(doc, fallback) {
  if (typeof doc === "string") return doc;
  if (!doc || typeof doc !== "object") return fallback;
  return firstString(
    doc.key,
    doc.id,
    doc.slug,
    doc.code,
    doc.name,
    doc.ar,
    doc.label,
    doc.title,
    doc.text,
    fallback
  );
}

// نص للعرض (بدون ترجمة هنا)
function pickDocLabelRaw(doc, lang = "ar") {
  if (typeof doc === "string") return doc;
  if (!doc || typeof doc !== "object") return "";
  if (lang === "en") {
    return firstString(
      doc.en,
      doc.name_en,
      doc.title_en,
      doc.label_en,
      doc.text_en,
      deep(doc, "label.en"),
      deep(doc, "name.en"),
      deep(doc, "title.en"),
      deep(doc, "text.en"),
      // fallback عربي لو مفيش إنجليزي
      doc.name,
      doc.title,
      doc.label,
      doc.text,
      doc.ar
    );
  }
  // عربي
  return firstString(
    doc.ar,
    doc.name,
    doc.title,
    doc.label,
    doc.text,
    deep(doc, "label.ar"),
    deep(doc, "name.ar"),
    deep(doc, "title.ar"),
    deep(doc, "text.ar"),
    // fallback إنجليزي لو مفيش عربي
    doc.en,
    doc.name_en,
    doc.title_en,
    doc.label_en,
    doc.text_en
  );
}

export default function ServiceProfileCard({
  category = "resident",
  name,
  name_en,
  customerId,
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
  provider,
}) {
  // تنبيهات ناقص customerId
  useEffect(() => {
    if (!customerId) {
      console.error("❌ customerId is missing in ServiceProfileCard! يجب تمريره من الكمبوننت الأب.");
    }
  }, [customerId]);

  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.resident;

  const [wallet, setWallet] = useState(userWallet);
  const [coinsBalance, setCoinsBalance] = useState(userCoins);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [paperCount, setPaperCount] = useState(1);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [showDocsModal, setShowDocsModal] = useState(false);

  const [translatedName, setTranslatedName] = useState("");
  const [translatedDescription, setTranslatedDescription] = useState("");
  const [translatedLongDescription, setTranslatedLongDescription] = useState("");

  // المستندات للعرض فقط
  const [docsForUI, setDocsForUI] = useState([]);

  // تزامن رصيد/كوينز
  useEffect(() => setWallet(userWallet), [userWallet]);
  useEffect(() => setCoinsBalance(userCoins), [userCoins]);
  useEffect(() => setIsPaid(false), [serviceId, userId]);

  // 1) طبع requiredDocuments إلى مصفوفة مهما كان الشكل
  const docsArray = useMemo(() => {
    if (Array.isArray(requiredDocuments)) return requiredDocuments;
    if (requiredDocuments && typeof requiredDocuments === "object") {
      return Object.values(requiredDocuments);
    }
    return [];
  }, [requiredDocuments]);

  // 2) مفاتيح ثابتة للمستندات (لا تتغير بتغير اللغة)
  const docKeys = useMemo(() => {
    return docsArray.map((doc, i) => {
      const fallback = pickDocLabelRaw(doc, "ar") || pickDocLabelRaw(doc, "en") || `doc-${serviceId || name}-${i}`;
      return pickDocKey(doc, fallback);
    });
  }, [docsArray, serviceId, name]);

  // 3) نصوص العرض للمستندات (EN تُترجم عند الحاجة)
  useEffect(() => {
    let cancel = false;
    async function buildDocsForUI() {
      // جِب نص خام للغة الحالية
      const raw = docsArray.map((d) => pickDocLabelRaw(d, lang));
      if (lang === "en") {
        const out = await Promise.all(
          raw.map((txt, i) =>
            translateText({
              text: String(txt || ""),
              target: "en",
              source: "ar",
              fieldKey: `service:${serviceId || name}:doc:${i}:en`,
            })
          )
        );
        if (!cancel) setDocsForUI(out.map((s) => String(s || "")));
      } else {
        if (!cancel) setDocsForUI(raw.map((s) => String(s || "")));
      }
    }
    buildDocsForUI();
    return () => {
      cancel = true;
    };
  }, [docsArray, lang, serviceId, name]);

  // ترجمة اسم/وصف الخدمة عند EN
  useEffect(() => {
    let ignore = false;
    async function run() {
      if (lang === "en") {
        if (!name_en && name) {
          const t = await translateText({ text: name, target: "en", fieldKey: `service:${serviceId || name}:name:en` });
          if (!ignore) setTranslatedName(t);
        } else {
          if (!ignore) setTranslatedName("");
        }
        if (!description_en && description) {
          const t = await translateText({ text: description, target: "en", fieldKey: `service:${serviceId || name}:desc:en` });
          if (!ignore) setTranslatedDescription(t);
        } else {
          if (!ignore) setTranslatedDescription("");
        }
        if (!longDescription_en && longDescription) {
          const t = await translateText({ text: longDescription, target: "en", fieldKey: `service:${serviceId || name}:long:en` });
          if (!ignore) setTranslatedLongDescription(t);
        } else {
          if (!ignore) setTranslatedLongDescription("");
        }
      } else {
        if (!ignore) {
          setTranslatedName("");
          setTranslatedDescription("");
          setTranslatedLongDescription("");
        }
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [lang, name, name_en, description, description_en, longDescription, longDescription_en, serviceId]);

  // الأسعار
  const baseServiceCount = repeatable ? quantity : 1;
  const basePaperCount = allowPaperCount ? paperCount : 1;
  const servicePriceTotal = (Number(price) || 0) * baseServiceCount;
  const printingTotal = (Number(printingFee) || 0) * basePaperCount;
  const taxTotal =
    typeof tax !== "undefined"
      ? Number(tax) * basePaperCount
      : +(Number(printingFee) * 0.05 * basePaperCount).toFixed(2);
  const totalServicePrice =
    typeof clientPrice !== "undefined"
      ? Number(clientPrice) * baseServiceCount
      : servicePriceTotal + printingTotal + taxTotal;

  // التحقق: يعتمد على المفاتيح الثابتة فقط
  const allDocsUploaded = !requireUpload || docKeys.every((k) => uploadedDocs[k]);
  const isPaperCountReady = !allowPaperCount || (paperCount && paperCount > 0);
  const canPay = allDocsUploaded && isPaperCountReady;

  // حفظ الطلب
  async function saveServiceOrder() {
    try {
      const orderData = {
        userId,
        clientId: customerId,
        serviceId,
        serviceName: name,
        quantity,
        paperCount,
        uploadedDocs,
        total: totalServicePrice,
        coins,
        createdAt: Timestamp.now(),
        clientEmail: userEmail,
        lang,
      };
      await addDoc(collection(firestore, "requests"), orderData);
    } catch (err) {
      console.error("Error saving order:", err);
    }
  }
  function handlePaid() {
    setIsPaid(true);
    saveServiceOrder();
    if (typeof onPaid === "function") onPaid();
    setShowPayModal(false);
  }
  function handleAllDocsUploaded() {
    setShowDocsModal(false);
    setShowPayModal(true);
  }

  // Tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef();
  function handleNameMouseEnter() { setShowTooltip(true); }
  function handleNameMouseLeave() { setShowTooltip(false); }
  function getServiceNameFontSize() {
    const nameStr = lang === "en" ? (name_en || translatedName || name || "") : (name || name_en || "");
    if (nameStr.length > 38) return "text-[16px]";
    if (nameStr.length > 28) return "text-[18px]";
    if (nameStr.length > 18) return "text-[20px]";
    return "text-[22px]";
  }

  function renderTooltip() {
    return (
      <div
        className="fixed z-[200] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
        style={{ minWidth: 280, maxWidth: 380, boxShadow: "0 2px 24px 0 rgba(16,185,129,0.18)" }}
      >
        <div className="bg-white rounded-xl border border-emerald-400 shadow-lg p-4 w-full text-sm" style={{ pointerEvents: "none" }}>
          <h3 className="text-base font-extrabold text-emerald-700 mb-1 text-center">
            {lang === "en" ? (name_en || translatedName || name || "") : (name || name_en || "")}
          </h3>
          <div className="text-gray-800 text-xs mb-2 text-center">
            {lang === "en"
              ? (longDescription_en || translatedLongDescription || description_en || translatedDescription || description || "")
              : (longDescription || longDescription_en || description || description_en || "")}
          </div>
          {docsForUI.length > 0 && (
            <>
              <div className="font-bold text-emerald-600 mb-1 text-xs text-center">
                <FaFileAlt className="inline mr-1" />
                {lang === "ar" ? "المستندات المطلوبة" : "Required Documents"}
              </div>
              <ul className="list-inside list-disc text-xs text-gray-700 mb-2 text-right">
                {docsForUI.map((doc, i) => (<li key={i}>{doc}</li>))}
              </ul>
            </>
          )}
          <table className="w-full text-xs text-emerald-900 font-bold border border-emerald-200 rounded-xl shadow mb-2 bg-emerald-50 overflow-hidden">
            <tbody>
              <tr>
                <td>{lang === "ar" ? "سعر الخدمة" : "Service Price"}</td>
                <td className="text-right">{price} {lang === "ar" ? "د.إ" : "AED"}</td>
              </tr>
              <tr>
                <td>{lang === "ar" ? "رسوم الطباعة" : "Printing Fee"}</td>
                <td className="text-right">{printingFee} {lang === "ar" ? "د.إ" : "AED"}</td>
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
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Coins */}
      <div className="absolute top-3 left-3 flex items-center group/coins z-10">
        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full shadow border border-yellow-100 min-w-[30px] cursor-help">
          <FaCoins className="text-yellow-500" size={12} />
          <span className="text-yellow-700 font-bold text-xs">{coins}</span>
        </div>
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-7 whitespace-nowrap bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded shadow-lg opacity-0 group-hover/coins:opacity-100 transition pointer-events-none">
          {lang === "ar" ? `عدد الكوينات: ${coins}${repeatable ? ` × ${quantity}` : ""}` : `Coins cashback: ${coins}${repeatable ? ` × ${quantity}` : ""}`}
        </div>
      </div>

      {/* Category */}
      <div className={`flex items-center justify-center gap-2 px-2 py-1 text-[10px] font-extrabold rounded-full shadow ${style.badge} ${style.text} bg-opacity-90 backdrop-blur-sm border border-white/40 w-fit mx-auto mt-3 mb-2 select-none`}>
        {style.icon()}
        <span>{lang === "ar" ? style.labelAr : style.labelEn}</span>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center px-2 pt-1 pb-1 flex-1 w-full min-h-0">
        <h3
          className={`font-black text-emerald-800 text-center mb-1 drop-shadow-sm tracking-tight max-w-full truncate ${getServiceNameFontSize()}`}
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", minHeight: "30px", lineHeight: "1.15", display: "block", cursor: "pointer" }}
          title={lang === "en" ? (name_en || translatedName || name || "") : (name || name_en || "")}
          onMouseEnter={handleNameMouseEnter}
          onMouseLeave={handleNameMouseLeave}
        >
          {lang === "en" ? (name_en || translatedName || name || "") : (name || name_en || "")}
        </h3>
        {showTooltip && renderTooltip()}

        {/* price box */}
        <div className="w-full flex flex-col items-center bg-white/80 rounded-xl border border-emerald-100 shadow p-2 mt-1 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-emerald-700 text-2xl drop-shadow text-center">{totalServicePrice}</span>
            <span className="text-base text-gray-500 font-bold">{lang === "ar" ? "درهم" : "AED"}</span>
            <Image src="/aed-logo.png" alt={lang === "ar" ? "درهم إماراتي" : "AED"} width={34} height={34} className="rounded-full bg-white ring-1 ring-emerald-200 shadow" />
          </div>
          <table className="w-full text-sm text-gray-700 mb-1">
            <tbody>
              <tr>
                <td>{lang === "ar" ? "سعر الخدمة" : "Service Price"}</td>
                <td className="text-right">{(Number(price) || 0) * (repeatable ? quantity : 1)} {lang === "ar" ? "د.إ" : "AED"}</td>
              </tr>
              <tr>
                <td>{lang === "ar" ? "رسوم الطباعة" : "Printing Fee"}</td>
                <td className="text-right">{(Number(printingFee) || 0) * (allowPaperCount ? paperCount : 1)} {lang === "ar" ? "د.إ" : "AED"}</td>
              </tr>
              <tr>
                <td>{lang === "ar" ? "ضريبة القيمة المضافة 5%" : "VAT 5% on Printing"}</td>
                <td className="text-right">
                  {(typeof tax !== "undefined" ? Number(tax) * (allowPaperCount ? paperCount : 1) : +(Number(printingFee) * 0.05 * (allowPaperCount ? paperCount : 1)).toFixed(2))} {lang === "ar" ? "د.إ" : "AED"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* counters */}
        {repeatable && (
          <div className="flex flex-row items-center justify-center mt-1 gap-1">
            <label className="text-[10px] font-bold text-gray-600 mb-0">{lang === "ar" ? "عدد مرات" : "Qty"}</label>
            <input type="number" min={1} max={99} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value))))} className="w-[36px] p-0.5 rounded border border-emerald-200 text-emerald-900 text-center font-bold text-xs" style={{ direction: "ltr", height: "22px" }} />
          </div>
        )}
        {allowPaperCount && (
          <div className="flex flex-row items-center justify-center mt-1 gap-1">
            <label className="text-[10px] font-bold text-gray-600 mb-0">{lang === "ar" ? "عدد الأوراق" : "Pages"}</label>
            <input type="number" min={1} max={99} value={paperCount} onChange={(e) => setPaperCount(Math.max(1, Math.min(99, Number(e.target.value))))} className="w-[36px] p-0.5 rounded border border-emerald-200 text-emerald-900 text-center font-bold text-xs" style={{ direction: "ltr", height: "22px" }} />
          </div>
        )}

        {/* رفع المستندات */}
        {requireUpload && (
          <div className="w-full flex flex-col max-w-full mt-1 mb-1">
            <button
              className="w-full py-1 rounded-full font-black shadow text-xs transition bg-gradient-to-r from-cyan-400 via-cyan-600 to-cyan-400 text-white hover:from-cyan-600 hover:to-cyan-500 hover:shadow-cyan-200/90 hover:scale-105 duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowDocsModal(true);
              }}
            >
              {lang === "ar" ? "رفع المستندات المطلوبة" : "Upload required documents"}
            </button>
          </div>
        )}

// ... نفس الاستيرادات والhelpers التي عندك
// داخل createPortal الخاص بـ ServiceUploadModal استبدل الكتلة الحالية بهذا الاستدعاء:
{typeof window !== "undefined" && showDocsModal &&
  createPortal(
    <ServiceUploadModal
      open={showDocsModal}
      onClose={() => setShowDocsModal(false)}
      requiredDocs={docKeys}             // مفاتيح منطقية ثابتة
      displayDocs={docsForUI.map((d) => String(d ?? ""))}  // نصوص العرض
      uploadedDocs={uploadedDocs}
      setUploadedDocs={(newDocs) => setUploadedDocs(newDocs)}
      userId={userId}
      lang={lang}
      service={{ serviceId, name }}
      onAllDocsUploaded={handleAllDocsUploaded}
    />,
    document.body
  )
}

        {/* زرار التقديم */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPayModal(true);
          }}
          className={`
            w-full py-1 rounded-full font-black shadow text-xs transition
            bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400 text-white
            hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-200/90
            hover:scale-105 duration-150
            focus:outline-none focus:ring-2 focus:ring-emerald-400
            cursor-pointer
            ${(!(!requireUpload || docKeys.every((k) => uploadedDocs[k])) || !(!allowPaperCount || (paperCount && paperCount > 0)) || isPaid) ? "opacity-40 pointer-events-none" : ""}
            mt-1
          `}
          style={{ cursor: "pointer" }}
          disabled={!(!requireUpload || docKeys.every((k) => uploadedDocs[k])) || !(!allowPaperCount || (paperCount && paperCount > 0)) || isPaid}
        >
          {isPaid ? (lang === "ar" ? "تم الدفع" : "Paid") : (lang === "ar" ? "تقدم الآن" : "Apply Now")}
        </button>
      </div>

      {/* المودال */}
      <ServicePayModal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        serviceName={name}
        totalPrice={totalServicePrice}
        printingFee={printingFee}
        coinsBalance={coinsBalance}
        cashbackCoins={coins}
        userWallet={wallet}
        lang={lang}
        customerId={customerId}
        userId={userId}
        userEmail={userEmail}
        uploadedDocs={uploadedDocs}
        onPaid={handlePaid}
        provider={Array.isArray(provider) ? provider : provider ? [provider] : []}
      />
      <div className="absolute -bottom-6 right-0 left-0 w-full h-8 bg-gradient-to-t from-emerald-100/60 via-white/20 to-transparent blur-2xl opacity-80 z-0 pointer-events-none"></div>
    </div>
  );
}