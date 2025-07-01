import { useState, useRef } from "react";
import { FaCloudUploadAlt, FaCheckCircle, FaExclamationCircle, FaSpinner, FaEdit } from "react-icons/fa";
import axios from "axios";
import { firestore } from "@/lib/firebase.client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * DocumentUploadField supports Arabic/English by passing `lang` prop ("ar" or "en").
 * All UI strings and messages will auto-switch language.
 */
export default function DocumentUploadField({
  docType,
  sessionId,
  onVerified,
  onFailed,
  label,
  lang = "ar", // Default Arabic, pass "en" for English
}) {
  const [status, setStatus] = useState(""); // '', verifying, uploading, success, error
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // All translations
  const t = {
    ar: {
      uploadLabel: label || `ارفع مستند ${docType}`,
      dropHere: "اسحب الملف هنا أو اضغط لاختيار",
      dropNow: "أسقط الملف هنا",
      fileTypeErr: "نوع الملف غير مدعوم! الرجاء رفع صورة أو PDF فقط.",
      fileSizeErr: "الملف أكبر من 5 ميجا! الرجاء ضغطه أو اختيار نسخة أصغر.",
      verifying: "جاري التحقق من المستند بالذكاء الاصطناعي...",
      verifyFail: "فشل فحص المستند: ",
      uploadReady: "تم التحقق. جاري رفع المستند...",
      uploadSuccess: "✔️ المستند مقبول",
      uploadError: "حدث خطأ أثناء التحقق أو الرفع.",
      edit: "تعديل المستند",
      mb: "ميجا",
    },
    en: {
      uploadLabel: label || `Upload ${docType} document`,
      dropHere: "Drag & drop or click to select",
      dropNow: "Drop the file here",
      fileTypeErr: "Unsupported file type! Please upload an image or PDF only.",
      fileSizeErr: "File is larger than 5MB! Please compress or choose a smaller version.",
      verifying: "Verifying document with AI...",
      verifyFail: "Document check failed: ",
      uploadReady: "Verified. Uploading your document...",
      uploadSuccess: "✔️ Document accepted",
      uploadError: "An error occurred during verification or upload.",
      edit: "Edit Document",
      mb: "MB",
    },
  }[lang];

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/bmp",
    "image/gif",
    "image/tiff",
    "application/pdf",
  ];
  const maxFileSize = 5 * 1024 * 1024;

  const reset = () => {
    setStatus("");
    setMessage("");
    setUploadProgress(0);
    setSelectedFile(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleSelectedFile(file);
  };

  const handleSelectedFile = async (file) => {
    reset();

    if (!file) return;

    const isAllowedType =
      allowedTypes.includes(file.type) ||
      /\.(pdf|jpg|jpeg|png|bmp|gif|tiff|heic|webp)$/i.test(file.name || "");

    if (!isAllowedType) {
      setStatus("error");
      setMessage(t.fileTypeErr);
      onFailed && onFailed(docType);
      return;
    }

    if (file.size > maxFileSize) {
      setStatus("error");
      setMessage(t.fileSizeErr);
      onFailed && onFailed(docType);
      return;
    }

    setSelectedFile(file);

    setStatus("verifying");
    setMessage(t.verifying);

    try {
      // OCR Verification
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);

      const ocrRes = await axios.post("/api/ocr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!ocrRes.data.success) {
        setStatus("error");
        setMessage(t.verifyFail + (ocrRes.data.message || ""));
        onFailed && onFailed(docType);
        return;
      }

      setStatus("uploading");
      setMessage(t.uploadReady);

      // Upload to Google Cloud Storage
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("sessionId", sessionId);
      uploadForm.append("docType", docType);

      const uploadRes = await axios.post("/api/upload-to-gcs", uploadForm, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(
              Math.round((progressEvent.loaded / progressEvent.total) * 100)
            );
          }
        },
      });

      // Save metadata in Firestore
      const docRef = await addDoc(collection(firestore, "documents"), {
        url: uploadRes.data.url,
        docType,
        sessionId,
        uploadedAt: new Date().toISOString(),
        ocr: ocrRes.data,
        createdAt: serverTimestamp(),
        originalName: file.name,
        size: file.size,
        type: file.type,
      });

      setStatus("success");
      setMessage(t.uploadSuccess);

      onVerified &&
        onVerified({
          url: uploadRes.data.url,
          docType,
          ocr: ocrRes.data,
          uploadedAt: new Date().toISOString(),
          firestoreId: docRef.id,
        });

    } catch (err) {
      setStatus("error");
      setMessage(t.uploadError);
      onFailed && onFailed(docType);
      setTimeout(reset, 3000);
    }
  };

  const handleChange = (e) => handleSelectedFile(e.target.files[0]);
  const triggerFile = () => inputRef.current?.click();

  // Dynamic icon per status
  const renderIcon = () => {
    if (status === "success")
      return <FaCheckCircle className="text-green-500 text-xl mb-1" />;
    if (status === "error")
      return <FaExclamationCircle className="text-red-500 text-xl mb-1" />;
    if (status === "verifying" || status === "uploading")
      return <FaSpinner className="text-blue-500 text-xl mb-1 animate-spin" />;
    return <FaCloudUploadAlt className="text-blue-400 text-2xl mb-1" />;
  };

  // Direction (rtl for Arabic, ltr for English)
  const dir = lang === "ar" ? "rtl" : "ltr";
  const textAlign = lang === "ar" ? "text-right" : "text-left";

  return (
    <div className={`w-full max-w-xs flex flex-col items-center mx-auto`} dir={dir}>
      <label className={`block text-gray-900 font-semibold mb-2 text-base tracking-tight ${textAlign}`}>
        {t.uploadLabel}
      </label>

      {/* Main dropzone */}
      <div
        className={`
          w-full flex flex-col items-center justify-center rounded-xl
          border-2 border-dashed cursor-pointer transition-all
          bg-gradient-to-br from-white via-blue-50 to-blue-100
          shadow-sm py-6 px-4 min-h-[180px]
          ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-200"}
          ${status === "error" ? "border-red-400" : ""}
          hover:border-blue-400
        `}
        onClick={status === "success" ? undefined : triggerFile}
        onDrop={status === "success" ? undefined : handleDrop}
        onDragOver={status === "success" ? undefined : (e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={status === "success" ? undefined : () => setDragActive(false)}
        style={{ pointerEvents: status === "success" ? "auto" : "auto" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.bmp,.gif,.tiff,.pdf"
          onChange={handleChange}
          className="hidden"
        />

        {/* Status icon */}
        {renderIcon()}

        {/* Filename or prompt */}
        <div className={`text-xs text-center mt-1 mb-2 ${textAlign}`}>
          {selectedFile ? (
            <span className="text-gray-700 font-medium">
              {selectedFile.name}{" "}
              <span className="text-gray-400">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} {t.mb})
              </span>
            </span>
          ) : (
            <span className="text-gray-500 select-none">
              {dragActive ? t.dropNow : t.dropHere}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {(status === "uploading" || status === "verifying") && (
          <div className="w-full my-2">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden shadow-sm">
              <div
                className={`transition-all h-1 ${
                  status === "uploading"
                    ? "bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400"
                    : "bg-blue-300 animate-pulse"
                }`}
                style={{
                  width:
                    status === "uploading"
                      ? `${uploadProgress}%`
                      : status === "verifying"
                      ? "80%"
                      : "0%",
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Status message */}
        {message && (
          <div
            className={`mt-2 text-xs font-semibold ${
              status === "success"
                ? "text-green-700"
                : status === "error"
                ? "text-red-700"
                : "text-blue-800"
            } ${textAlign}`}
          >
            {message}
          </div>
        )}

        {/* Edit button only on success */}
        {status === "success" && (
          <button
            className="mt-3 flex items-center gap-1 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs transition"
            onClick={reset}
            type="button"
          >
            <FaEdit className="text-gray-500 text-sm" />
            {t.edit}
          </button>
        )}
      </div>
    </div>
  );
}