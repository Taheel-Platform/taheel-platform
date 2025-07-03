"use client";

import { useState } from "react";
import { FaCamera, FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Image from "next/image";

// ------ نصوص ثنائية اللغة ------
const translations = {
  ar: {
    modalTitle: "تحديث بيانات الشركة",
    modalSubtitle: "يرجى رفع صور الإقامة (أمامية/خلفية) وجواز السفر والرخصة التجارية",
    uploadFront: "صورة الإقامة (أمامية)",
    uploadBack: "صورة الإقامة (خلفية)",
    uploadPassport: "صورة جواز السفر",
    uploadLicense: "صورة الرخصة التجارية",
    uploaded: "تم الرفع والفحص",
    notUploaded: "لم يتم الرفع بعد",
    uploading: "جاري رفع وفحص الملف...",
    extractedText: "النص المستخرج",
    save: "حفظ التحديثات",
    cancel: "إلغاء",
    success: "تم رفع وفحص الملف بنجاح!",
    error: "فشل فحص المستند.",
    mustUploadAll: "يرجى رفع جميع المستندات وفحصها بنجاح.",
    close: "إغلاق",
    pickFile: "اختر ملف...",
    change: "تغيير",
    logoAlt: "لوجو تأهيل",
  },
  en: {
    modalTitle: "Update Company Data",
    modalSubtitle: "Please upload Residence ID (Front/Back), Passport and Commercial License images",
    uploadFront: "Residence ID (Front)",
    uploadBack: "Residence ID (Back)",
    uploadPassport: "Passport Image",
    uploadLicense: "Commercial License",
    uploaded: "Uploaded & Scanned",
    notUploaded: "Not Uploaded",
    uploading: "Uploading & scanning file...",
    extractedText: "Extracted Text",
    save: "Save Updates",
    cancel: "Cancel",
    success: "File uploaded and scanned successfully!",
    error: "Document scan failed.",
    mustUploadAll: "Please upload and scan all documents successfully.",
    close: "Close",
    pickFile: "Pick a file...",
    change: "Change",
    logoAlt: "Taheel Logo",
  },
};
// --------------------------------

const DOCS = [
  { key: "eidFront", icon: <FaCamera />, color: "emerald", accept: "image/*,.pdf" },
  { key: "eidBack", icon: <FaCamera />, color: "cyan", accept: "image/*,.pdf" },
  { key: "passport", icon: <FaCamera />, color: "violet", accept: "image/*,.pdf" },
  { key: "license", icon: <FaCamera />, color: "yellow", accept: "image/*,.pdf" }, // الرخصة التجارية
];

export default function CompanyCardModal({
  onSave,
  onClose,
  locale = "ar",
  logo = "/logo-transparent-large.png"
}) {
  const t = translations[locale === "en" ? "en" : "ar"];
  const [docs, setDocs] = useState({
    eidFront: { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
    eidBack:  { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
    passport: { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
    license:  { file: null, ocrLoading: false, ocrSuccess: false, ocrError: "", ocrText: "", extracted: null },
  });

  // رفع وفحص ملف (لكل مستند)
  const handleFileChange = async (e, docKey) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setDocs(prev => ({
      ...prev,
      [docKey]: { ...prev[docKey], ocrLoading: true, ocrError: "", ocrSuccess: false, ocrText: "", extracted: null, file }
    }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docKey);

      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setDocs(prev => ({
        ...prev,
        [docKey]: {
          ...prev[docKey],
          ocrLoading: false,
          ocrSuccess: !!data.success,
          ocrError: data.success ? "" : (data.message || t.error),
          ocrText: data.text || "",
          extracted: data.extracted || null,
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

  // عند الحفظ
  const handleSubmit = (e) => {
    e.preventDefault();
    // لازم كل المستندات تكون مرفوعة وفحصها ناجح
    const allOK = DOCS.every(d => docs[d.key].file && docs[d.key].ocrSuccess && !docs[d.key].ocrError);
    if (allOK) {
      const submitData = {};
      DOCS.forEach(d => {
        submitData[d.key] = {
          file: docs[d.key].file,
          ocrText: docs[d.key].ocrText,
          extracted: docs[d.key].extracted,
        };
      });
      onSave && onSave(submitData);
      onClose();
    }
  };

  const allDone = DOCS.every(d => docs[d.key].file && docs[d.key].ocrSuccess && !docs[d.key].ocrError);
  const isAnyLoading = DOCS.some(d => docs[d.key].ocrLoading);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <div
        className="
          bg-white rounded-2xl shadow-2xl
          p-4 sm:p-7
          w-full max-w-[95vw] sm:max-w-[410px]
          border border-yellow-200 relative animate-fade-in
          max-h-[95vh] overflow-y-auto
        "
        style={{ boxShadow: "0 4px 32px 0 rgba(0,0,0,0.10)" }}
      >
        <button
          onClick={onClose}
          className="
            absolute top-2 left-2 sm:top-3 sm:left-3
            bg-gray-100 hover:bg-gray-200 text-gray-500
            rounded-full w-10 h-10 flex items-center justify-center shadow
            text-2xl sm:text-xl
            z-10
          "
          title={t.close}
          tabIndex={0}
          aria-label={t.close}
        >×</button>

        <div className="flex flex-col items-center mb-2 mt-4 sm:mt-0">
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-lg bg-yellow-50 border border-yellow-100 mb-1">
            <Image src={logo} width={38} height={38} alt={t.logoAlt} style={{objectFit:"contain"}} />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-yellow-800 text-center mb-1">{t.modalTitle}</h2>
          <span className="text-gray-400 text-xs sm:text-sm font-bold text-center">{t.modalSubtitle}</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 mt-2">
          {/* حقول رفع الملفات */}
          {DOCS.map((doc, idx) => {
            const d = docs[doc.key];
            return (
              <div key={doc.key} className="flex flex-col gap-2">
                <label className="font-semibold text-gray-700 flex items-center gap-2 text-sm sm:text-base">
                  <span className={`inline-block w-5 h-5 rounded-full bg-${doc.color}-100 flex items-center justify-center`}>
                    {doc.icon}
                  </span>
                  {t[
                    doc.key === "eidFront"
                      ? "uploadFront"
                      : doc.key === "eidBack"
                        ? "uploadBack"
                        : doc.key === "passport"
                          ? "uploadPassport"
                          : "uploadLicense"
                  ]}
                  {d.ocrSuccess && !d.ocrError && (
                    <FaCheckCircle className="ml-2 text-green-600" title={t.uploaded} />
                  )}
                  {d.ocrError && (
                    <FaTimesCircle className="ml-2 text-red-600" title={t.error} />
                  )}
                </label>
                <div className="flex gap-2 items-center">
                  <label className={`flex-1 flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-yellow-50 text-yellow-700 px-3 py-2 rounded-xl font-bold border border-yellow-200 transition shadow-sm ${d.ocrLoading ? "opacity-60 pointer-events-none" : ""} text-xs sm:text-sm`}>
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
                      className="text-xs text-gray-500 underline hover:text-yellow-700"
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
                  <div className="text-xs text-yellow-700 flex items-center gap-2 mt-1">
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
                      <div className="mt-2 text-yellow-700 font-bold">
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

          {/* تحذير إن لم تكتمل المستندات */}
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
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
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