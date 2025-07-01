import { useState } from "react";
import { FaCamera, FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Image from "next/image";

// ----------------------------- نصوص
const translations = {
  ar: {
    modalTitle: "تحديث أو ترقية بطاقة غير مقيم",
    selectType: "اختر العملية:",
    renewPassport: "رفع جواز سفر جديد (تجديد)",
    upgradeResident: "ترقية إلى مقيم",
    selectUpgrade: "اختر نوع الترقية:",
    visa: "رفع تأشيرة العمل",
    eid: "رفع الهوية الإماراتية",
    eidFront: "صورة الهوية (أمامية)",
    eidBack: "صورة الهوية (خلفية)",
    passport: "صورة جواز السفر",
    visaFile: "صورة تأشيرة العمل",
    emirate: "الإمارة",
    phone: "رقم الهاتف الإماراتي",
    eidExpiry: "تاريخ انتهاء الإقامة",
    uploaded: "تم الرفع والفحص",
    notUploaded: "لم يتم الرفع بعد",
    uploading: "جاري رفع وفحص الملف...",
    extractedText: "النص المستخرج",
    save: "تأكيد",
    cancel: "إلغاء",
    success: "تم رفع وفحص الملف بنجاح!",
    error: "فشل فحص المستند.",
    mustUploadAll: "يرجى رفع وفحص جميع المستندات المطلوبة وإدخال كل البيانات.",
    close: "إغلاق",
    pickFile: "اختر ملف...",
    change: "تغيير",
    logoAlt: "لوجو تأهيل",
    required: "مطلوب",
  },
  en: {
    modalTitle: "Update or Upgrade Non-Resident Card",
    selectType: "Choose operation:",
    renewPassport: "Upload New Passport (Renew)",
    upgradeResident: "Upgrade to Resident",
    selectUpgrade: "Choose upgrade type:",
    visa: "Upload Work Visa",
    eid: "Upload Emirates ID",
    eidFront: "EID Front Image",
    eidBack: "EID Back Image",
    passport: "Passport Image",
    visaFile: "Work Visa Image",
    emirate: "Emirate",
    phone: "UAE Phone Number",
    eidExpiry: "Residency Expiry Date",
    uploaded: "Uploaded & Scanned",
    notUploaded: "Not Uploaded",
    uploading: "Uploading & scanning file...",
    extractedText: "Extracted Text",
    save: "Confirm",
    cancel: "Cancel",
    success: "File uploaded and scanned successfully!",
    error: "Document scan failed.",
    mustUploadAll: "Please upload and scan all required documents and fill all data.",
    close: "Close",
    pickFile: "Pick a file...",
    change: "Change",
    logoAlt: "Taheel Logo",
    required: "Required",
  },
};
// -----------------------------

const DOCS_PASSPORT = [
  { key: "passport", labelKey: "passport", color: "violet", accept: "image/*,.pdf" },
];
const DOCS_VISA = [
  { key: "workVisa", labelKey: "visaFile", color: "purple", accept: "image/*,.pdf" },
];
const DOCS_EID = [
  { key: "eidFront", labelKey: "eidFront", color: "emerald", accept: "image/*,.pdf" },
  { key: "eidBack", labelKey: "eidBack", color: "cyan", accept: "image/*,.pdf" },
  { key: "passport", labelKey: "passport", color: "violet", accept: "image/*,.pdf" },
];

export default function UpgradeModal({
  onSave,
  onClose,
  locale = "ar",
  logo = "/logo-transparent-large.png"
}) {
  const t = translations[locale === "en" ? "en" : "ar"];

  const [step, setStep] = useState(1); // 1: اختيار العملية، 2: تفاصيل العملية
  const [mainType, setMainType] = useState(""); // "renew" | "upgrade"
  const [upgradeType, setUpgradeType] = useState(""); // "visa" | "eid"

  // OCR states
  const [docs, setDocs] = useState({
    eidFront: { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
    eidBack:  { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
    passport: { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
    workVisa: { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
  });

  // حقول إضافية للهوية
  const [eidExpiry, setEidExpiry] = useState("");
  const [emirate, setEmirate] = useState("");
  const [phone, setPhone] = useState("");

  // رفع وفحص ملف لكل مستند
  const handleFileChange = async (e, docKey) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setDocs(prev => ({
      ...prev,
      [docKey]: { ...prev[docKey], ocrLoading: true, ocrError: "", ocrSuccess: false, ocrText: "", extracted: null, file }
    }));
    try {
      // هنا تضع منطق رفع الملف على السيرفر/الـ OCR (حاليًا وهمي)
      await new Promise(r => setTimeout(r, 1000));
      setDocs(prev => ({
        ...prev,
        [docKey]: {
          ...prev[docKey],
          ocrLoading: false,
          ocrSuccess: true,
          ocrError: "",
          ocrText: "",
          extracted: null,
          file,
        }
      }));
    } catch (err) {
      setDocs(prev => ({
        ...prev,
        [docKey]: { ...prev[docKey], ocrLoading: false, ocrSuccess: false, ocrError: t.error }
      }));
    }
  };

  // تحقق من اكتمال كل شيء
  let allDone = false;
  if (mainType === "renew") {
    allDone = docs.passport.file && docs.passport.ocrSuccess && !docs.passport.ocrError;
  } else if (mainType === "upgrade" && upgradeType === "visa") {
    allDone = docs.workVisa.file && docs.workVisa.ocrSuccess && !docs.workVisa.ocrError;
  } else if (mainType === "upgrade" && upgradeType === "eid") {
    allDone =
      DOCS_EID.every(d => docs[d.key].file && docs[d.key].ocrSuccess && !docs[d.key].ocrError) &&
      eidExpiry && emirate && phone;
  }
  const isAnyLoading = Object.values(docs).some(d => d.ocrLoading);

  // عند الحفظ
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!allDone) return;
    if (mainType === "renew") {
      onSave && onSave({
        type: "passport",
        passport: docs.passport,
      });
    } else if (mainType === "upgrade" && upgradeType === "visa") {
      onSave && onSave({
        type: "resident",
        via: "visa",
        workVisa: docs.workVisa,
      });
    } else if (mainType === "upgrade" && upgradeType === "eid") {
      onSave && onSave({
        type: "resident",
        via: "eid",
        eidFront: docs.eidFront,
        eidBack: docs.eidBack,
        passport: docs.passport,
        emirate,
        phone,
        eidExpiry,
      });
    }
    onClose();
  };

  // STEP 1: اختيار العملية
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
        <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-[370px] border border-purple-200 relative animate-fade-in">
          <button
            onClick={onClose}
            className="absolute top-3 left-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center shadow"
            title={t.close}
            tabIndex={0}
            style={{ fontSize: 18, zIndex: 10 }}
            aria-label={t.close}
          >×</button>
          <div className="flex flex-col items-center mb-3">
            <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-lg bg-purple-50 border border-purple-100 mb-1">
              <Image src={logo} width={34} height={34} alt={t.logoAlt} style={{objectFit:"contain"}} />
            </div>
            <h2 className="text-xl font-extrabold text-purple-800 text-center mb-1">{t.modalTitle}</h2>
            <span className="text-gray-400 text-sm font-bold">{t.selectType}</span>
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <button onClick={() => { setMainType("renew"); setStep(2); }} className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold p-3 rounded-xl shadow">
              {t.renewPassport}
            </button>
            <button onClick={() => { setMainType("upgrade"); setStep(2); }} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold p-3 rounded-xl shadow">
              {t.upgradeResident}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: تفاصيل العملية
  // لو ترقية فقط: اختار نوع الترقية (تأشيرة أو هوية)
  if (step === 2 && mainType === "upgrade" && !upgradeType) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
        <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-[370px] border border-emerald-200 relative animate-fade-in">
          <button
            onClick={onClose}
            className="absolute top-3 left-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center shadow"
            title={t.close}
            tabIndex={0}
            style={{ fontSize: 18, zIndex: 10 }}
            aria-label={t.close}
          >×</button>
          <div className="flex flex-col items-center mb-3">
            <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-lg bg-emerald-50 border border-emerald-100 mb-1">
              <Image src={logo} width={34} height={34} alt={t.logoAlt} style={{objectFit:"contain"}} />
            </div>
            <h2 className="text-xl font-extrabold text-emerald-800 text-center mb-1">{t.upgradeResident}</h2>
            <span className="text-gray-400 text-sm font-bold">{t.selectUpgrade}</span>
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <button onClick={() => setUpgradeType("visa")} className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold p-3 rounded-xl shadow">
              {t.visa}
            </button>
            <button onClick={() => setUpgradeType("eid")} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold p-3 rounded-xl shadow">
              {t.eid}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // واجهة رفع الملفات حسب العملية
  let DOCS = [];
  if (mainType === "renew") DOCS = DOCS_PASSPORT;
  else if (mainType === "upgrade" && upgradeType === "visa") DOCS = DOCS_VISA;
  else if (mainType === "upgrade" && upgradeType === "eid") DOCS = DOCS_EID;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-4 sm:p-7 w-full max-w-[95vw] sm:max-w-[410px] border border-emerald-200 relative animate-fade-in max-h-[95vh] overflow-y-auto"
        style={{ boxShadow: "0 4px 32px 0 rgba(0,0,0,0.10)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full w-10 h-10 flex items-center justify-center shadow text-2xl sm:text-xl z-10"
          title={t.close}
          tabIndex={0}
          aria-label={t.close}
        >×</button>

        <div className="flex flex-col items-center mb-2 mt-4 sm:mt-0">
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-lg bg-emerald-50 border border-emerald-100 mb-1">
            <Image src={logo} width={38} height={38} alt={t.logoAlt} style={{objectFit:"contain"}} />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-emerald-800 text-center mb-1">
            {mainType === "renew"
              ? t.renewPassport
              : upgradeType === "visa"
              ? t.visa
              : t.eid}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 mt-2">
          {/* حقول رفع الملفات */}
          {DOCS.map((doc, idx) => {
            const d = docs[doc.key];
            return (
              <div key={doc.key} className="flex flex-col gap-2">
                <label className="font-semibold text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                  <span className={`inline-block w-5 h-5 rounded-full bg-${doc.color}-100 flex items-center justify-center`}>
                    {<FaCamera />}
                  </span>
                  {t[doc.labelKey]}
                  {d.ocrSuccess && !d.ocrError && (
                    <FaCheckCircle className="ml-2 text-green-600" title={t.uploaded} />
                  )}
                  {d.ocrError && (
                    <FaTimesCircle className="ml-2 text-red-600" title={t.error} />
                  )}
                </label>
                <div className="flex gap-2 items-center">
                  <label className={`flex-1 flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-bold border border-emerald-200 transition shadow-sm ${d.ocrLoading ? "opacity-60 pointer-events-none" : ""} text-xs sm:text-sm`}>
                    {d.ocrLoading ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaCamera />
                    )}
                    <span className="truncate">{d.file ? d.file.name : t.pickFile}</span>
                    <input
                      type="file"
                      accept={doc.accept}
                      style={{ display: "none" }}
                      onChange={e => handleFileChange(e, doc.key)}
                      disabled={d.ocrLoading}
                    />
                  </label>
                  {d.file && !d.ocrLoading && (
                    <button
                      type="button"
                      className="text-xs text-gray-500 underline hover:text-emerald-700"
                      onClick={e => {
                        setDocs(prev => ({
                          ...prev,
                          [doc.key]: { ...prev[doc.key], file: null, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null }
                        }));
                      }}
                    >
                      {t.change}
                    </button>
                  )}
                </div>
                {d.ocrLoading && (
                  <div className="text-xs text-emerald-600 flex items-center gap-2 mt-1">
                    <FaSpinner className="animate-spin" />
                    {t.uploading}
                  </div>
                )}
                {d.ocrSuccess && !d.ocrError && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded mt-1">
                    {t.uploaded}
                  </div>
                )}
                {d.ocrError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded mt-1">
                    {d.ocrError}
                  </div>
                )}
                {d.ocrText && !d.ocrError && (
                  <details className="bg-gray-50 border border-gray-200 text-xs rounded p-2 mt-1" style={{ maxHeight: 120, overflow: "auto" }}>
                    <summary className="cursor-pointer text-gray-500 font-bold">{t.extractedText}</summary>
                    <div style={{ direction: "ltr", whiteSpace: "pre-wrap", maxHeight: 70, overflowY: "auto" }}>
                      {d.ocrText}
                    </div>
                    {d.extracted && (
                      <div className="mt-2 text-emerald-700 font-bold">
                        <pre className="text-xs text-gray-800 bg-gray-50 p-2 rounded border" style={{ maxHeight: 60, overflowY: "auto" }}>
                          {JSON.stringify(d.extracted, null, 2)}
                        </pre>
                      </div>
                    )}
                  </details>
                )}
              </div>
            );
          })}

          {/* الحقول الإضافية للهوية */}
          {mainType === "upgrade" && upgradeType === "eid" && (
            <>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                  {t.eidExpiry} <span className="text-red-500">*</span>
                </label>
                <input type="date" className="border rounded px-2 py-2 text-sm" value={eidExpiry} onChange={e => setEidExpiry(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                  {t.emirate} <span className="text-red-500">*</span>
                </label>
                <input type="text" className="border rounded px-2 py-2 text-sm" value={emirate} onChange={e => setEmirate(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                  {t.phone} <span className="text-red-500">*</span>
                </label>
                <input type="text" className="border rounded px-2 py-2 text-sm" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
            </>
          )}

          {/* تحذير إن لم تكتمل المستندات/الحقول */}
          {!allDone && (
            <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded text-center font-bold">
              {t.mustUploadAll}
            </div>
          )}

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className={`
                flex-1 px-4 py-3 rounded-xl font-bold shadow transition
                ${allDone && !isAnyLoading
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"}
                text-base sm:text-lg
              `}
              disabled={!allDone || isAnyLoading}
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold shadow text-base sm:text-lg"
              disabled={isAnyLoading}
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}