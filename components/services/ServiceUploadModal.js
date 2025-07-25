"use client";
import { useRef, useState } from "react";
import { FaFilePdf, FaUpload, FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";

export default function ServiceUploadModal({
  open,
  onClose,
  service,
  userId,
  lang = "ar",
  setUploadedDocs, // مهم لاستقبال التغيير من الأب (ServiceProfileCard)
  uploadedDocs,    // استقبال بيانات الملفات المرفوعة من الأعلى
}) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  function handleFileChange(e) {
    setError("");
    setMsg("");
    setUploadSuccess(false); // إعادة التفعيل عند تغيير الملفات
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      setSelectedFiles([]);
      return;
    }
    // فقط PDF ويسمح بحد أقصى 2 ملف
    if (files.length > 2) {
      setError(lang === "ar" ? "يمكنك رفع ملف واحد أو ملفين فقط." : "You can upload only one or two files.");
      fileRef.current.value = null;
      setSelectedFiles([]);
      return;
    }
    const pdfs = files.filter(file => file.type === "application/pdf");
    if (pdfs.length !== files.length) {
      setError(lang === "ar" ? "يرجى رفع ملفات PDF فقط" : "Please upload PDF files only.");
      fileRef.current.value = null;
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(pdfs);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (selectedFiles.length === 0) {
      setError(lang === "ar" ? "يجب اختيار ملف PDF واحد على الأقل" : "Please select at least one PDF file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append("file", file));
      formData.append("userId", userId);
      formData.append("serviceId", service.serviceId);
      formData.append("serviceName", service.name);

      const res = await fetch("/api/upload-to-gcs", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(
          lang === "ar"
            ? `تم رفع ${data.files.length} ملف بنجاح!`
            : `${data.files.length} file(s) uploaded successfully!`
        );
        setSelectedFiles([]);
        fileRef.current.value = null;
        setUploadSuccess(true);

        // تحديث بيانات الملفات المرفوعة للأب (تحديث uploadedDocs)
        if (setUploadedDocs) {
          // نضيف كل ملف مرفوع إلى uploadedDocs["main"] أو قائمة الملفات حسب متطلباتك
          // هنا سنسجل أول ملف باسم "main" ولو أكثر من ملف يمكنك تخصيصها أكثر
          const filesObj = {};
          data.files.forEach((file, idx) => {
            filesObj[`main${idx ? idx+1 : ""}`] = {
              name: file.originalname || selectedFiles[idx]?.name || `file${idx+1}.pdf`,
              url: file.url,
              type: "application/pdf",
            };
          });
          setUploadedDocs({ ...(uploadedDocs || {}), ...filesObj });
        }
      } else {
        setError(data.error || (lang === "ar" ? "حدث خطأ أثناء رفع الملفات." : "An error occurred during upload."));
      }
    } catch (err) {
      setError(lang === "ar" ? "حدث خطأ أثناء رفع الملفات." : "An error occurred during upload.");
    }
    setUploading(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/40 backdrop-blur-[2px]">
      <div className="
        relative bg-gradient-to-br from-cyan-50 via-white to-cyan-100 rounded-3xl shadow-2xl
        px-6 py-8 w-[96vw] max-w-sm border border-cyan-200 animate-fadeIn flex flex-col items-center
        "
        style={{ boxShadow: "0 6px 32px 0 rgba(31,174,209,0.08), 0 1.5px 6px 0 rgba(20,96,129,0.07)" }}
      >
        {/* زر إغلاق صغير أعلى الركن */}
        <button
          className="absolute top-2 right-2 bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white rounded-full w-7 h-7 flex items-center justify-center text-base shadow transition"
          onClick={onClose}
          title={lang === "ar" ? "إغلاق" : "Close"}
        >
          <FaTimes />
        </button>

        {/* أيقونة PDF وسطية */}
        <div className="flex flex-col items-center mb-2">
          <div className="bg-cyan-200 rounded-full p-3 mb-2 shadow-sm">
            <FaFilePdf className="text-3xl text-cyan-700 drop-shadow" />
          </div>
          <div className="font-extrabold text-cyan-800 text-md text-center">
            {lang === "ar" ? "رفع مستند PDF" : "Upload PDF Document"}
          </div>
          <div className="text-xs text-gray-500 text-center mt-0.5 mb-0.5 max-w-xs truncate">
            {service?.name}
          </div>
        </div>

        <div className="text-xs text-gray-600 text-center mb-2 px-1 max-w-[90%]">
          {lang === "ar"
            ? "يمكنك رفع ملف واحد أو ملفين PDF فقط."
            : "You can upload only one or two PDF files."}
        </div>

        <form onSubmit={handleUpload} className="flex flex-col items-center w-full gap-2 mt-1">
          {/* زر رفع PDF أنيق */}
          <label
            htmlFor="pdf-upload"
            className={`
              flex flex-col items-center justify-center w-full py-3 rounded-2xl border-2 border-dashed border-cyan-300
              bg-cyan-50 hover:bg-cyan-100 cursor-pointer transition
              ${selectedFiles.length > 0 ? "border-emerald-400 bg-emerald-50" : ""}
            `}
            tabIndex={0}
            style={{ minHeight: 84 }}
          >
            <FaUpload className={`text-xl mb-1 ${selectedFiles.length > 0 ? "text-emerald-700" : "text-cyan-400"}`} />
            <span className={`font-bold text-sm ${selectedFiles.length > 0 ? "text-emerald-800" : "text-cyan-700"}`}>
              {lang === "ar" ? "اختر ملف PDF" : "Choose PDF File(s)"}
            </span>
            <input
              id="pdf-upload"
              type="file"
              ref={fileRef}
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading || uploadSuccess}
            />
            {selectedFiles.length > 0 && (
              <div className="mt-1 text-xs text-emerald-700 font-bold truncate max-w-[90%] flex flex-col gap-1">
                {selectedFiles.map((f, i) => (
                  <span key={i}>{f.name}</span>
                ))}
              </div>
            )}
          </label>

          {/* زر الرفع */}
          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0 || uploadSuccess}
            className={`w-full py-2 rounded-full font-black shadow transition text-base mt-1
              ${uploading || selectedFiles.length === 0 || uploadSuccess
                ? "bg-cyan-200 text-white cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-700 text-white cursor-pointer"}
            `}
            style={{ fontSize: "1rem" }}
          >
            {uploading
              ? (lang === "ar" ? "جاري الرفع..." : "Uploading...")
              : (lang === "ar" ? "رفع الملف" : "Upload File(s)")}
          </button>

          {/* رسائل التنبيه */}
          {error && (
            <div className="text-center text-red-600 font-bold flex items-center gap-1 mt-1 text-xs">
              <FaExclamationCircle /> {error}
            </div>
          )}
          {msg && (
            <div className="text-center text-green-700 font-bold flex items-center gap-1 mt-1 text-xs">
              <FaCheckCircle /> {msg}
            </div>
          )}
        </form>
      </div>
      {/* خلفية زخرفية هادئة */}
      <div className="absolute -top-24 -left-16 w-40 h-40 bg-cyan-300 opacity-15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-900 to-cyan-400 opacity-10 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}