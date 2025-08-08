import { useRef, useState, useEffect } from "react";
import { FaFilePdf, FaUpload, FaCheckCircle, FaExclamationCircle, FaTimes, FaSpinner } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// لا تتعامل مع Firestore هنا إطلاقاً، فقط احفظ المستندات في uploadedDocs

export default function ServiceUploadModal({
  open,
  onClose,
  service,
  userId,
  lang = "ar",
  setUploadedDocs,
  uploadedDocs = {},
  requiredDocs = [],
}) {
  const fileRefs = useRef({});
  const [uploading, setUploading] = useState({});
  const [msg, setMsg] = useState({});
  const [error, setError] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});

  // يغلق المدوال تلقائياً إذا كل المستندات تم رفعها
  useEffect(() => {
    if (!open) return;
    const allUploaded = requiredDocs.length > 0 && requiredDocs.every(
      (docName) => uploadedDocs[docName]
    );
    if (allUploaded) {
      setTimeout(() => {
        onClose && onClose();
      }, 800);
    }
  }, [uploadedDocs, requiredDocs, open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex justify-center items-center bg-gradient-to-br from-black/70 via-cyan-900/60 to-black/70 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative bg-gradient-to-br from-white via-cyan-50 to-cyan-100 rounded-3xl shadow-2xl px-8 py-10 w-[96vw] max-w-lg border border-cyan-200 flex flex-col items-center"
          initial={{ scale: 0.95, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 40 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          style={{ overflow: "visible", maxHeight: "92vh" }}
        >
          {/* اللوجو أعلى المدوال */}
          <img
            src="/logo3.png"
            alt="Logo"
            className="mb-3 w-20 h-20 object-contain rounded-full shadow-lg border-2 border-cyan-100"
            draggable={false}
            loading="eager"
          />

          {/* زر إغلاق احترافي */}
          <button
            className="absolute top-4 right-4 bg-white/80 hover:bg-red-500 text-gray-500 hover:text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl shadow-lg transition-all duration-200 cursor-pointer"
            onClick={onClose}
            title={lang === "ar" ? "إغلاق" : "Close"}
            style={{ cursor: "pointer" }}
          >
            <FaTimes />
          </button>

          <div className="font-extrabold text-cyan-900 text-2xl text-center mb-3 tracking-tight drop-shadow">
            {lang === "ar" ? "رفع المستندات المطلوبة" : "Upload Required Documents"}
          </div>
          <div className="text-base text-gray-700 text-center mb-4 px-2 max-w-[95%] font-medium">
            {lang === "ar"
              ? "يرجى رفع ملف PDF فقط لكل مستند مطلوب."
              : "Please upload only a PDF file for each required document."}
          </div>

          {/* قائمة المستندات */}
          <form className="flex flex-col items-center w-full gap-4 mt-1">
            {requiredDocs.map((docName, idx) => (
              <div key={idx} className="w-full flex flex-col items-center p-4 rounded-xl border border-cyan-200 bg-white/90 shadow mb-2">
                <div className="font-bold text-cyan-800 mb-2 text-base text-center">{docName}</div>
                <label
                  htmlFor={`pdf-upload-${idx}`}
                  className={`
                    flex flex-col items-center justify-center w-full py-3 rounded-2xl border-2 border-dashed border-cyan-300
                    bg-cyan-50 hover:bg-cyan-100 cursor-pointer transition-all duration-150
                    ${selectedFiles[docName] ? "border-emerald-400 bg-emerald-50" : ""}
                  `}
                  tabIndex={0}
                  style={{ minHeight: 70, cursor: "pointer" }}
                >
                  <FaUpload className={`text-2xl mb-1 ${selectedFiles[docName] ? "text-emerald-700" : "text-cyan-400"}`} />
                  <span className={`font-bold text-base ${selectedFiles[docName] ? "text-emerald-800" : "text-cyan-700"}`}>
                    {lang === "ar" ? "اختر ملف PDF" : "Choose PDF File"}
                  </span>
                  <input
                    id={`pdf-upload-${idx}`}
                    type="file"
                    ref={(el) => fileRefs.current[docName] = el}
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, docName)}
                    disabled={uploading[docName]}
                  />
                  {selectedFiles[docName] && (
                    <div className="mt-2 text-xs text-emerald-700 font-bold truncate max-w-[90%] flex flex-col gap-1">
                      <span>{selectedFiles[docName].name}</span>
                    </div>
                  )}
                </label>
                <button
                  type="button"
                  disabled={uploading[docName] || !selectedFiles[docName]}
                  className={`w-full py-2 rounded-full font-black shadow-lg transition-all text-base mt-2
                    ${uploading[docName] || !selectedFiles[docName]
                      ? "bg-cyan-200 text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white cursor-pointer"}
                  `}
                  style={{ fontSize: "1rem", cursor: "pointer" }}
                  onClick={(e) => handleUpload(e, docName)}
                >
                  {uploading[docName]
                    ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        {lang === "ar" ? "جاري الرفع..." : "Uploading..."}
                      </>
                    )
                    : (lang === "ar" ? "رفع الملف" : "Upload File")}
                </button>
                {error[docName] && (
                  <div className="text-center text-red-600 font-bold flex items-center gap-2 mt-2 text-sm">
                    <FaExclamationCircle /> {error[docName]}
                  </div>
                )}
                {msg[docName] && (
                  <div className="text-center text-green-700 font-bold flex items-center gap-2 mt-2 text-sm">
                    <FaCheckCircle /> {msg[docName]}
                  </div>
                )}
                {uploadedDocs[docName] && (
                  <div className="text-xs text-emerald-700 font-bold mt-2 text-center">
                    {lang === "ar" ? "تم رفع المستند: " : "Uploaded: "}
                    <a
                      href={uploadedDocs[docName].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-emerald-800 font-bold"
                      style={{ cursor: "pointer" }}
                    >
                      {uploadedDocs[docName].name}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </form>

          {/* رسالة أمان البيانات */}
          <div className="w-full text-center mt-7 mb-2 flex flex-col items-center gap-2">
            <div className="text-sm text-cyan-800 font-semibold flex items-center justify-center">
              <FaCheckCircle className="inline mr-2 text-emerald-500" />
              {lang === "ar"
                ? "جميع بياناتك مشفرة وآمنة ويتم حفظها بسرية تامة."
                : "All your data is encrypted and securely stored."}
            </div>
          </div>

          {/* زر إغلاق احتياطي احترافي */}
          <button
            className="mt-4 px-10 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-bold shadow-xl text-lg hover:from-emerald-700 hover:to-cyan-700 transition-all duration-150"
            onClick={onClose}
            style={{ cursor: "pointer" }}
          >
            {lang === "ar" ? "إغلاق" : "Close"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}