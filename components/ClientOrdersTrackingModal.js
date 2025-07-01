import { useState } from "react";
import { motion } from "framer-motion";
import { FaUpload, FaTimes } from "react-icons/fa";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";

/**
 * @param {Object} props
 * @param {boolean} props.show
 * @param {Function} props.onClose
 * @param {Function} [props.onUpload] // called with ({file, downloadURL, meta}) after success
 * @param {string} [props.note]
 * @param {boolean} [props.isArabic]
 * @param {string} [props.orderId] // يجب تمرير orderId حتى نربط المستند بالطلب في Firestore
 */
export default function ClientOrdersTrackingModal({ show, onClose, onUpload, note, isArabic, orderId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);

    try {
      // 1. رفع الملف على Firebase Storage
      const storage = getStorage();
      const fileExt = file.name.split(".").pop();
      const filePath = `orderDocs/${orderId || "noOrder"}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. إضافة بيانات المستند للرابط في Firestore تحت الطلب
      if (orderId) {
        await updateDoc(doc(firestore, "orders", orderId), {
          docs: arrayUnion({
            url: downloadURL,
            name: file.name,
            uploadedAt: serverTimestamp(),
            storagePath: filePath,
            size: file.size,
            type: file.type,
          }),
          lastUpdated: serverTimestamp(),
        });
      }
      setUploading(false);
      setSuccess(true);
      onUpload && onUpload({ file, downloadURL, meta: { filePath, orderId } });
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setUploading(false);
      alert(isArabic ? "حدث خطأ أثناء رفع الملف" : "Upload error");
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 30 }}
        transition={{ duration: 0.28 }}
        className="bg-white rounded-2xl shadow-2xl px-6 py-7 min-w-[320px] max-w-[95vw] flex flex-col items-center relative"
      >
        <button
          className="absolute top-2 left-2 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center"
          onClick={onClose}
          title={isArabic ? "إغلاق" : "Close"}
          tabIndex={-1}
        >
          <FaTimes />
        </button>
        <div className="text-emerald-700 font-extrabold text-lg mb-1 flex items-center gap-2">
          <FaUpload /> {isArabic ? "رفع المستند المطلوب" : "Upload Required Document"}
        </div>
        <div className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-1 mb-4 text-xs font-semibold">
          {isArabic ? "ملاحظة الموظف:" : "Staff Note:"} {note || (isArabic ? "يرجى رفع المستند المطلوب" : "Please upload the required document")}
        </div>
        <form onSubmit={handleUpload} className="flex flex-col gap-3 items-center w-full">
          <input
            type="file"
            className="w-full text-xs text-gray-800 bg-gray-50 border border-emerald-100 rounded px-2 py-1"
            disabled={uploading || success}
            required
            onChange={e => setFile(e.target.files[0])}
          />
          <button
            disabled={!file || uploading || success}
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full font-bold text-xs shadow transition flex items-center gap-2"
          >
            <FaUpload />
            {uploading
              ? (isArabic ? "جاري الرفع..." : "Uploading...")
              : (isArabic ? "رفع المستند" : "Upload Document")}
          </button>
          {success && (
            <div className="text-emerald-600 font-bold text-xs mt-1">
              {isArabic ? "تم رفع المستند بنجاح!" : "Document uploaded successfully!"}
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}