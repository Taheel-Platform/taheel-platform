import { useRef, useState } from "react";
import { FaFilePdf, FaUpload, FaCheckCircle, FaExclamationCircle, FaTimes, FaSpinner } from "react-icons/fa";

export default function ServiceUploadModal({
  open,
  onClose,
  service,
  userId,
  lang = "ar",
  setUploadedDocs,
  uploadedDocs,
}) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  function handleFileChange(e) {
    setError("");
    setMsg("");
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setError(lang === "ar" ? "يرجى رفع ملف PDF فقط" : "Please upload a PDF file only.");
      fileRef.current.value = null;
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!selectedFile) {
      setError(lang === "ar" ? "يجب اختيار ملف PDF" : "Please select a PDF file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", userId);
      formData.append("serviceId", service.serviceId);
      formData.append("serviceName", service.name);

      const res = await fetch("/api/upload-to-gcs", {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        setError(lang === "ar" ? "استجابة غير صحيحة من السيرفر." : "Invalid server response.");
        setUploading(false);
        return;
      }

      if (res.ok && data.url) {
        setMsg(
          lang === "ar"
            ? "تم رفع الملف بنجاح!"
            : "File uploaded successfully!"
        );
        setSelectedFile(null);
        fileRef.current.value = null;

        // حفظ بيانات الملف مؤقتاً للأب
        if (setUploadedDocs) {
          const fileObj = {
            name: selectedFile.name,
            url: data.url,
            type: "application/pdf",
          };
          setUploadedDocs({ ...(uploadedDocs || {}), main: fileObj });
        }

        setTimeout(() => {
          onClose && onClose();
        }, 700); // يغلق المدوال تلقائيًا بعد النجاح (يمكنك التعديل حسب رغبتك)
      } else {
        setError(
          data?.error ||
          (lang === "ar"
            ? "حدث خطأ أثناء رفع الملف."
            : "An error occurred during upload.")
        );
      }
    } catch (err) {
      setError(lang === "ar" ? "حدث خطأ أثناء رفع الملف." : "An error occurred during upload.");
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
        {/* زر إغلاق */}
        <button
          className="absolute top-2 right-2 bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white rounded-full w-7 h-7 flex items-center justify-center text-base shadow transition"
          onClick={onClose}
          title={lang === "ar" ? "إغلاق" : "Close"}
        >
          <FaTimes />
        </button>

        {/* أيقونة PDF وسطية */}
        <div className="flex flex-col items-center mb-2">
          <div className={`bg-cyan-200 rounded-full p-3 mb-2 shadow-sm flex items-center justify-center ${uploading ? "animate-spin" : ""}`}>
            {uploading ? <FaSpinner className="text-3xl text-cyan-700 drop-shadow animate-spin" /> : <FaFilePdf className="text-3xl text-cyan-700 drop-shadow" />}
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
            ? "يمكنك رفع ملف PDF واحد فقط."
            : "You can upload only one PDF file."}
        </div>

        <form onSubmit={handleUpload} className="flex flex-col items-center w-full gap-2 mt-1">
          <label
            htmlFor="pdf-upload"
            className={`
              flex flex-col items-center justify-center w-full py-3 rounded-2xl border-2 border-dashed border-cyan-300
              bg-cyan-50 hover:bg-cyan-100 cursor-pointer transition
              ${selectedFile ? "border-emerald-400 bg-emerald-50" : ""}
            `}
            tabIndex={0}
            style={{ minHeight: 84 }}
          >
            <FaUpload className={`text-xl mb-1 ${selectedFile ? "text-emerald-700" : "text-cyan-400"}`} />
            <span className={`font-bold text-sm ${selectedFile ? "text-emerald-800" : "text-cyan-700"}`}>
              {lang === "ar" ? "اختر ملف PDF" : "Choose PDF File"}
            </span>
            <input
              id="pdf-upload"
              type="file"
              ref={fileRef}
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {selectedFile && (
              <div className="mt-1 text-xs text-emerald-700 font-bold truncate max-w-[90%] flex flex-col gap-1">
                <span>{selectedFile.name}</span>
              </div>
            )}
          </label>
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className={`w-full py-2 rounded-full font-black shadow transition text-base mt-1
              ${uploading || !selectedFile
                ? "bg-cyan-200 text-white cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-700 text-white cursor-pointer"}
            `}
            style={{ fontSize: "1rem" }}
          >
            {uploading
              ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  {lang === "ar" ? "جاري الرفع..." : "Uploading..."}
                </>
              )
              : (lang === "ar" ? "رفع الملف" : "Upload File")}
          </button>
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
    </div>
  );
}