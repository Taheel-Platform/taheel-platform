'use client';

import DocumentUploadField from "@/components/DocumentUploadField";
import { useState } from "react";

// مستندات مطلوبة حسب نوع الحساب
const REQUIRED_DOCS = {
  resident: [
    { docType: "eidFront", labelAr: "صورة الإقامة (أمامية)", labelEn: "Residence Card (Front)" },
    { docType: "eidBack", labelAr: "صورة الإقامة (خلفية)", labelEn: "Residence Card (Back)" },
    { docType: "passport", labelAr: "صورة جواز السفر", labelEn: "Passport Image" }
  ],
  nonresident: [
    { docType: "passport", labelAr: "صورة جواز السفر", labelEn: "Passport Image" }
  ],
  company: [
    { docType: "ownerIdFront", labelAr: "صورة الهوية الأمامية للمالك", labelEn: "Owner ID (Front)" },
    { docType: "ownerIdBack", labelAr: "صورة الهوية الخلفية للمالك", labelEn: "Owner ID (Back)" },
    { docType: "license", labelAr: "الرخصة التجارية", labelEn: "Trade License" },
    { docType: "passport", labelAr: "صورة جواز السفر", labelEn: "Passport Image" }
  ]
};

export default function DocumentsStep({ form, onChange, onNext, onBack, lang, t }) {
  // حفظ حالة كل ملف مرفوع
  const [docs, setDocs] = useState({});
  const [docsStatus, setDocsStatus] = useState({});
  const [docsOCR, setDocsOCR] = useState({});

  const docsList = REQUIRED_DOCS[form.accountType] || [];

  // تحكم في رفع الملفات والتحقق
  const handleDocVerified = async (docType, data) => {
    setDocs(prev => ({ ...prev, [docType]: data }));
    setDocsStatus(prev => ({ ...prev, [docType]: true }));

    // 1- رفع الملف على الباكت عبر API route
    let fileUrl = null;
    if (data?.file) {
      try {
        const formData = new FormData();
        formData.append("file", data.file);
        formData.append("docType", docType);
        formData.append("sessionId", form.sessionId || "no-session");

        // API route يرفع على جوجل ويعيد لينك
        const uploadRes = await fetch("/api/upload-to-gcs", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        fileUrl = uploadJson.url;

        // 2- تحقق OCR
        const ocrForm = new FormData();
        ocrForm.append("fileUrl", fileUrl);
        ocrForm.append("docType", docType);

        const ocrRes = await fetch("/api/ocr", {
          method: "POST",
          body: ocrForm,
        });
        const ocrJson = await ocrRes.json();

        setDocsOCR(prev => ({ ...prev, [docType]: ocrJson }));

        // 3- تحديث النموذج العام في الـ state فقط
        if (ocrJson.success) {
          const newDocs = { ...docs, [docType]: { ...data, fileUrl, ocr: ocrJson } };
          onChange({ documents: newDocs });
        } else {
          setDocsStatus(prev => ({ ...prev, [docType]: false }));
          onChange({ documents: { ...docs, [docType]: null } });
        }
      } catch (err) {
        setDocsStatus(prev => ({ ...prev, [docType]: false }));
        onChange({ documents: { ...docs, [docType]: null } });
        setDocsOCR(prev => ({ ...prev, [docType]: null }));
      }
    } else {
      const newDocs = { ...docs, [docType]: data };
      onChange({ documents: newDocs });
    }
  };

  const handleDocFailed = (docType) => {
    setDocsStatus(prev => ({ ...prev, [docType]: false }));
    onChange({ documents: { ...docs, [docType]: null } });
    setDocsOCR(prev => ({ ...prev, [docType]: null }));
  };

  return (
    <div className="flex flex-col gap-8 bg-white rounded-2xl px-4 py-6 shadow-xl animate-fade-in"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <h2 className="font-extrabold text-2xl text-emerald-700 mb-3 text-center">
        {t.attachments}
      </h2>
      <div className={`grid gap-6 ${docsList.length >= 4 ? "sm:grid-cols-2 md:grid-cols-3" : "sm:grid-cols-2"}`}>
        {docsList.map(doc =>
          <div key={doc.docType} className="flex flex-col items-center w-full">
            <DocumentUploadField
              docType={doc.docType}
              label={lang === "ar" ? doc.labelAr : doc.labelEn}
              lang={lang}
              sessionId={form.sessionId || "no-session"}
              onVerified={data => handleDocVerified(doc.docType, data)}
              onFailed={() => handleDocFailed(doc.docType)}
              status={docsStatus[doc.docType]}
            />
            {/* عرض نتيجة OCR تحت كل مستند */}
            {docsOCR[doc.docType] && (
              <div className={`mt-2 text-sm ${docsOCR[doc.docType].success ? 'text-green-700' : 'text-red-600'}`}>
                {docsOCR[doc.docType].success
                  ? (lang === "ar" ? "تم التحقق من المستند بنجاح" : "Document verified successfully")
                  : docsOCR[doc.docType].message}
                {docsOCR[doc.docType]?.extracted && (
                  <pre className="bg-gray-100 p-2 rounded text-xs mt-1">
                    {JSON.stringify(docsOCR[doc.docType].extracted, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* الأزرار تحت بعض في عمود */}
      <div className="flex flex-col gap-3 mt-7 justify-center items-center">
        <button
          type="button"
          className="bg-gray-100 text-emerald-700 px-6 py-2 rounded-xl font-bold shadow hover:bg-gray-200 transition border border-emerald-300 cursor-pointer w-full max-w-xs"
          onClick={onBack}
        >
          {lang === "ar" ? "رجوع" : "Back"}
        </button>
        <button
          type="button"
          className={`bg-gradient-to-r from-emerald-700 via-emerald-500 to-green-700 text-white px-7 py-2 rounded-xl font-bold shadow-lg hover:brightness-110 hover:scale-[1.02] transition border-none cursor-pointer w-full max-w-xs`}
          onClick={onNext}
          disabled={docsList.some(doc => !docsStatus[doc.docType])}
        >
          {lang === "ar" ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}