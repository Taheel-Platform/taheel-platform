import { useRef, useState, useEffect } from "react";
import { FaFilePdf, FaUpload, FaCheckCircle, FaExclamationCircle, FaTimes, FaSpinner } from "react-icons/fa";

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

  // دالة تغيير الملف لكل مستند
  function handleFileChange(e, docName) {
    setError((prev) => ({ ...prev, [docName]: "" }));
    setMsg((prev) => ({ ...prev, [docName]: "" }));
    const file = e.target.files[0];
    if (!file) {
      setSelectedFiles((prev) => ({ ...prev, [docName]: null }));
      return;
    }
    if (file.type !== "application/pdf") {
      setError((prev) => ({
        ...prev,
        [docName]: lang === "ar" ? "يرجى رفع ملف PDF فقط" : "Please upload a PDF file only.",
      }));
      fileRefs.current[docName].value = null;
      setSelectedFiles((prev) => ({ ...prev, [docName]: null }));
      return;
    }
    setSelectedFiles((prev) => ({ ...prev, [docName]: file }));
  }

  // رفع ملف لمستند معين وحفظه فقط في uploadedDocs (وليس في Firestore)
  async function handleUpload(e, docName) {
    e.preventDefault();
    setError((prev) => ({ ...prev, [docName]: "" }));
    setMsg((prev) => ({ ...prev, [docName]: "" }));
    if (!selectedFiles[docName]) {
      setError((prev) => ({
        ...prev,
        [docName]: lang === "ar" ? "يجب اختيار ملف PDF" : "Please select a PDF file.",
      }));
      return;
    }
    setUploading((prev) => ({ ...prev, [docName]: true }));
    let fileObj = null;
    try {
      const formData = new FormData();
      formData.append("file", selectedFiles[docName]);
      formData.append("userId", userId);
      formData.append("serviceId", service?.serviceId || "");
      formData.append("serviceName", service?.name || "");
      formData.append("docName", docName);

      const res = await fetch("/api/upload-to-gcs", {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        setError((prev) => ({
          ...prev,
          [docName]: lang === "ar" ? "استجابة غير صحيحة من السيرفر." : "Invalid server response.",
        }));
        setUploading((prev) => ({ ...prev, [docName]: false }));
        return;
      }

      if (res.ok && data.url) {
        fileObj = {
          name: selectedFiles[docName].name,
          url: data.url,
          type: "application/pdf",
          uploadedAt: new Date().toISOString(),
          userId,
          serviceId: service?.serviceId || "",
          serviceName: service?.name || "",
        };

        setMsg((prev) => ({
          ...prev,
          [docName]: lang === "ar" ? "تم رفع الملف بنجاح!" : "File uploaded successfully!",
        }));

        setSelectedFiles((prev) => ({ ...prev, [docName]: null }));
        fileRefs.current[docName].value = null;

        // حفظ بيانات الملف في uploadedDocs (state)
        if (setUploadedDocs) {
          setUploadedDocs((prev) => ({
            ...(prev || uploadedDocs || {}),
            [docName]: fileObj,
          }));
        }
      } else {
        setError((prev) => ({
          ...prev,
          [docName]: data?.error || (lang === "ar" ? "حدث خطأ أثناء رفع الملف." : "An error occurred during upload."),
        }));
      }
    } catch (err) {
      setError((prev) => ({
        ...prev,
        [docName]: lang === "ar" ? "حدث خطأ أثناء رفع الملف." : "An error occurred during upload.",
      }));
    }
    setUploading((prev) => ({ ...prev, [docName]: false }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-gradient-to-br from-cyan-50 via-white to-cyan-100 rounded-3xl shadow-2xl px-6 py-8 w-[96vw] max-w-md border border-cyan-200 flex flex-col items-center animate-zoomIn" style={{ minHeight: "480px" }}>
        {/* زر إغلاق */}
        <button
          className="absolute top-3 right-3 bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xl shadow transition duration-200"
          onClick={onClose}
          title={lang === "ar" ? "إغلاق" : "Close"}
        >
          <FaTimes />
        </button>

        {/* اللوجو */}
        <img
          src="/logo3.png"
          alt="Logo"
          className="w-20 h-20 mb-2 mx-auto drop-shadow-lg animate-fadeInUp"
          style={{ objectFit: "contain" }}
        />

        <div className="font-extrabold text-cyan-900 text-lg text-center mb-2 animate-fadeInUp">
          {lang === "ar" ? "رفع المستندات المطلوبة" : "Upload Required Documents"}
        </div>
        <div className="text-sm text-gray-500 text-center mb-4 px-2 max-w-[90%] animate-fadeInUp">
          {lang === "ar"
            ? "يرجى رفع ملف PDF فقط لكل مستند مطلوب."
            : "Please upload only a PDF file for each required document."}
        </div>

        {/* قائمة المستندات */}
        <form className="flex flex-col items-center w-full gap-3 mt-1 animate-fadeInUp">
          {requiredDocs.map((docName, idx) => (
            <div key={idx} className="w-full flex flex-col items-center p-3 rounded-xl border border-cyan-100 bg-cyan-50 shadow mb-2 transition-all duration-200 hover:shadow-lg">
              <div className="font-bold text-cyan-700 mb-1">{docName}</div>
              <label
                htmlFor={`pdf-upload-${idx}`}
                className={`
                  flex flex-col items-center justify-center w-full py-2 rounded-2xl border-2 border-dashed border-cyan-300
                  bg-cyan-50 hover:bg-cyan-100 cursor-pointer transition
                  ${selectedFiles[docName] ? "border-emerald-400 bg-emerald-50" : ""}
                `}
                tabIndex={0}
                style={{ minHeight: 60 }}
              >
                <FaUpload className={`text-2xl mb-1 ${selectedFiles[docName] ? "text-emerald-700" : "text-cyan-400"} animate-bounce`} />
                <span className={`font-bold text-sm ${selectedFiles[docName] ? "text-emerald-800" : "text-cyan-700"}`}>
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
                  <div className="mt-1 text-xs text-emerald-700 font-bold truncate max-w-[90%] flex flex-col gap-1">
                    <span>{selectedFiles[docName].name}</span>
                  </div>
                )}
              </label>
              <button
                type="button"
                disabled={uploading[docName] || !selectedFiles[docName]}
                className={`w-full py-2 rounded-full font-black shadow transition text-base mt-2 duration-200
                  ${uploading[docName] || !selectedFiles[docName]
                    ? "bg-cyan-200 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-600 hover:to-cyan-500 text-white cursor-pointer"}
                  animate-fadeInUp
                `}
                style={{ fontSize: "1.05rem", letterSpacing: "1px" }}
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
                <div className="text-center text-red-600 font-bold flex items-center gap-1 mt-1 text-xs animate-fadeInUp">
                  <FaExclamationCircle /> {error[docName]}
                </div>
              )}
              {msg[docName] && (
                <div className="text-center text-green-700 font-bold flex items-center gap-1 mt-1 text-xs animate-fadeInUp">
                  <FaCheckCircle /> {msg[docName]}
                </div>
              )}
              {uploadedDocs[docName] && (
                <div className="text-xs text-emerald-700 font-bold mt-1 text-center animate-fadeInUp">
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
          className="mt-4 px-7 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow transition duration-200 animate-fadeInUp"
          onClick={onClose}
        >
          {lang === "ar" ? "إغلاق" : "Close"}
        </button>
        {/* بيانات مشفرة وآمنة */}
        <div className="mt-4 text-xs text-center text-gray-500 font-bold animate-fadeInUp">
          <span>
            {lang === "ar"
              ? "جميع البيانات والمستندات مشفرة وآمنة ويتم حفظها بشكل سري."
              : "All data and documents are encrypted and securely stored."}
          </span>
        </div>
      </div>
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.7s cubic-bezier(.37,.75,.46,1) both;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.7s cubic-bezier(.37,.75,.46,1) both;
        }
        .animate-zoomIn {
          animation: zoomIn 0.6s cubic-bezier(.4,.8,.24,1) both;
        }
        @keyframes fadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px);}
          to   { opacity: 1; transform: translateY(0);}
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.86);}
          to   { opacity: 1; transform: scale(1);}
        }
      `}</style>
    </div>
  );
}