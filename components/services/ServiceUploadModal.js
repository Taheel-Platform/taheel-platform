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
        key="modal-backdrop"
        className="fixed inset-0 z-50 flex justify-center items-center bg-gradient-to-br from-black/50 via-cyan-900/60 to-black/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key="modal-content"
          className="relative bg-gradient-to-br from-white via-cyan-50 to-cyan-100 rounded-3xl shadow-2xl px-6 py-8 w-[96vw] max-w-lg border border-cyan-300 flex flex-col items-center"
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ overflow: "visible", maxHeight: "90vh" }}
        >
          {/* زر إغلاق */}
          <button
            className="absolute top-3 right-3 bg-white/80 hover:bg-red-500 text-gray-400 hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xl shadow-lg transition-all duration-200"
            onClick={onClose}
            title={lang === "ar" ? "إغلاق" : "Close"}
          >
            <FaTimes />
          </button>

          <div className="font-extrabold text-cyan-900 text-xl text-center mb-2 tracking-tight">
            {lang === "ar" ? "رفع المستندات المطلوبة" : "Upload Required Documents"}
          </div>
          <div className="text-sm text-gray-600 text-center mb-4 px-2 max-w-[90%]">
            {lang === "ar"
              ? "يرجى رفع ملف PDF فقط لكل مستند مطلوب."
              : "Please upload only a PDF file for each required document."}
          </div>

          {/* قائمة المستندات */}
          <form className="flex flex-col items-center w-full gap-4">
            {requiredDocs.map((docName, idx) => (
              <div key={idx} className="w-full flex flex-col items-center p-3 rounded-xl border border-cyan-200 bg-white/70 shadow-md mb-1">
                <div className="font-bold text-cyan-800 mb-2 text-base">{docName}</div>
                <label
                  htmlFor={`pdf-upload-${idx}`}
                  className={`
                    flex flex-col items-center justify-center w-full py-3 rounded-2xl border-2 border-dashed border-cyan-300
                    bg-cyan-50 hover:bg-cyan-100 cursor-pointer transition-all duration-150
                    ${selectedFiles[docName] ? "border-emerald-400 bg-emerald-50" : ""}
                  `}
                  tabIndex={0}
                  style={{ minHeight: 70 }}
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
                      : "bg-emerald-500 hover:bg-emerald-700 text-white cursor-pointer"}
                  `}
                  style={{ fontSize: "1.08rem" }}
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
                    >
                      {uploadedDocs[docName].name}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </form>
          {/* زر إغلاق احتياطي */}
          <button
            className="mt-6 px-8 py-3 bg-gradient-to-br from-emerald-500 to-cyan-500 text-white rounded-lg font-bold shadow-xl text-base hover:bg-emerald-700 transition-all duration-150"
            onClick={onClose}
          >
            {lang === "ar" ? "إغلاق" : "Close"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}