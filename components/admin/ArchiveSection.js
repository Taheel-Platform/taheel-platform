"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { firestore } from "../../lib/firebase.client";
import StyledQRCode from "../StyledQRCode";

const CATEGORY_LABELS = {
  translation: { ar: "الترجمة", en: "Translation" },
  hr: { ar: "الموارد البشرية", en: "HR" },
  report: { ar: "التقارير", en: "Reports" },
};

export default function ArchivePage({ lang = "ar" }) {
  // حالات الواجهة
  const [category, setCategory] = useState("translation");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [qrVisible, setQrVisible] = useState({});
  // رفع ملف جديد
  const [file, setFile] = useState(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");

  // جلب الملفات حسب القسم
  useEffect(() => {
    setLoading(true);
    async function fetchFiles() {
      const q = query(
        collection(firestore, "archiveFiles"),
        where("category", "==", category),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFiles(docs);
      setLoading(false);
    }
    fetchFiles();
  }, [category, uploading]);

  // رفع الملف
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setMsg("اختر ملفًا!");
    setUploading(true);
    setMsg("");
    setUploadedFileUrl("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("nameAr", nameAr);
    formData.append("nameEn", nameEn);
    formData.append("descAr", descAr);
    formData.append("descEn", descEn);
    try {
      const res = await fetch("/api/upload-archive", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMsg("تم الرفع بنجاح ✅");
        setUploadedFileUrl(data.fileUrl || "");
        setFile(null);
        setNameAr("");
        setNameEn("");
        setDescAr("");
        setDescEn("");
      } else {
        setMsg(data.error || "حدث خطأ!");
      }
    } catch (err) {
      setMsg("حدث خطأ في الاتصال!");
    }
    setUploading(false);
  };

  const toggleQR = (id) =>
    setQrVisible((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="max-w-4xl mx-auto p-4 font-cairo">
      {/* نموذج رفع ملف جديد */}
      <div className="bg-[#171f26] rounded-xl shadow-lg p-5 mb-8 border border-emerald-800">
        <h2 className="font-extrabold text-2xl mb-6 text-emerald-400 text-center drop-shadow">
          {lang === "ar" ? "إضافة ملف جديد للأرشيف" : "Add New Archive File"}
        </h2>
        <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
          <select
            className="p-3 rounded-lg border-2 border-emerald-400 bg-[#1a272f] text-emerald-200 font-bold focus:outline-emerald-500 cursor-pointer"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, val]) =>
              <option key={key} value={key}>{lang === "ar" ? val.ar : val.en}</option>
            )}
          </select>
          <input
            type="text"
            className="p-3 rounded-lg border-2 border-emerald-400 bg-[#1a272f] text-white font-bold placeholder:text-emerald-300 focus:outline-emerald-500"
            placeholder={lang === "ar" ? "اسم الملف بالعربية" : "Arabic name"}
            value={nameAr}
            onChange={e => setNameAr(e.target.value)}
            required
          />
          <input
            type="text"
            className="p-3 rounded-lg border-2 border-emerald-400 bg-[#1a272f] text-white font-bold placeholder:text-emerald-300 focus:outline-emerald-500"
            placeholder={lang === "ar" ? "اسم الملف بالإنجليزية" : "English name"}
            value={nameEn}
            onChange={e => setNameEn(e.target.value)}
            required
          />
          <input
            type="text"
            className="p-3 rounded-lg border-2 border-gray-300 bg-[#26343d] text-gray-200 font-bold placeholder:text-gray-400"
            placeholder={lang === "ar" ? "وصف بالعربية (اختياري)" : "Arabic desc (opt)"}
            value={descAr}
            onChange={e => setDescAr(e.target.value)}
          />
          <input
            type="text"
            className="p-3 rounded-lg border-2 border-gray-300 bg-[#26343d] text-gray-200 font-bold placeholder:text-gray-400"
            placeholder={lang === "ar" ? "وصف بالإنجليزية (اختياري)" : "English desc (opt)"}
            value={descEn}
            onChange={e => setDescEn(e.target.value)}
          />
          <input
            type="file"
            className="flex-1 file:rounded-lg file:bg-emerald-600 file:text-white file:font-bold file:px-3 file:py-2 file:border-0 file:cursor-pointer"
            accept="application/pdf,image/*"
            onChange={e => setFile(e.target.files[0])}
            required
          />
          <button
            type="submit"
            disabled={uploading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3 rounded-lg font-extrabold shadow-lg transition cursor-pointer"
            style={{ cursor: "pointer" }}
          >
            {uploading ? (lang === "ar" ? "جاري الرفع..." : "Uploading...") : (lang === "ar" ? "رفع" : "Upload")}
          </button>
        </form>
        {msg && <div className="text-center text-emerald-300 mt-3 font-bold">{msg}</div>}

        {/* معاينة الملف المرفوع مباشرة */}
        {uploadedFileUrl && (
          <div className="bg-emerald-50 dark:bg-[#101b15] rounded mt-4 p-3 text-center border border-emerald-300">
            <div className="mb-1 font-bold text-emerald-600">{lang === "ar" ? "رابط الملف المرفوع:" : "Uploaded file link:"}</div>
            <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline break-all font-bold">{uploadedFileUrl}</a>
            <div className="flex flex-col items-center mt-2">
              <StyledQRCode value={uploadedFileUrl} size={100} />
              <button
                className="mt-2 px-3 py-1 border-2 border-emerald-600 rounded-lg text-xs font-bold text-emerald-600 bg-white hover:bg-emerald-50 transition cursor-pointer"
                style={{ cursor: "pointer" }}
                onClick={() => window.open(uploadedFileUrl, "_blank")}
              >
                {lang === "ar" ? "فتح الملف" : "Open File"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* فلاتر التصنيفات */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {Object.keys(CATEGORY_LABELS).map((cat) => (
          <button
            key={cat}
            className={`px-6 py-3 rounded-full font-extrabold border-2 text-lg shadow-lg transition ${
              category === cat
                ? "bg-emerald-500 text-white border-emerald-700"
                : "bg-[#1a272f] text-emerald-300 border-emerald-700 hover:bg-emerald-600 hover:text-white"
            }`}
            style={{ cursor: "pointer" }}
            onClick={() => setCategory(cat)}
          >
            {lang === "ar" ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}
          </button>
        ))}
      </div>

      {/* جدول الأرشيف */}
      <div className="bg-[#1a272f] rounded-xl shadow-lg p-5 border border-emerald-900">
        <div className="text-xl font-extrabold mb-4 text-emerald-400 text-center">
          {lang === "ar"
            ? `ملفات قسم "${CATEGORY_LABELS[category].ar}"`
            : `Files in "${CATEGORY_LABELS[category].en}"`}
        </div>
        {loading ? (
          <div className="text-center py-6 font-bold text-emerald-200">{lang === "ar" ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : files.length === 0 ? (
          <div className="text-center py-6 text-gray-400 font-bold">
            {lang === "ar" ? "لا يوجد ملفات في هذا القسم." : "No files in this category."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-emerald-900 text-emerald-200 font-bold text-lg">
                  <th className="p-3">{lang === "ar" ? "الاسم" : "Name"}</th>
                  <th className="p-3">{lang === "ar" ? "الوصف" : "Description"}</th>
                  <th className="p-3">{lang === "ar" ? "الرابط" : "Link"}</th>
                  <th className="p-3">{lang === "ar" ? "QR" : "QR"}</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-b border-emerald-800 hover:bg-emerald-950 transition">
                    <td className="p-3 font-extrabold text-white">{lang === "ar" ? file.nameAr : file.nameEn}</td>
                    <td className="p-3 text-emerald-200">{lang === "ar" ? file.descAr : file.descEn}</td>
                    <td className="p-3">
                      <a
                        href={file.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 underline break-all font-bold hover:text-emerald-200 transition"
                        style={{ cursor: "pointer" }}
                      >
                        {lang === "ar" ? "فتح المستند" : "Open"}
                      </a>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        className="bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-800 focus:outline-none shadow cursor-pointer"
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleQR(file.id)}
                      >
                        {qrVisible[file.id] ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "عرض" : "Show")}
                      </button>
                      {qrVisible[file.id] && (
                        <div className="mt-3 flex flex-col items-center">
                          <StyledQRCode value={file.link} size={80} />
                          <button
                            className="mt-1 px-3 py-1 border-2 border-emerald-600 rounded-lg text-xs font-bold text-emerald-600 bg-white hover:bg-emerald-50 transition cursor-pointer"
                            style={{ cursor: "pointer" }}
                            onClick={() => window.print()}
                          >
                            {lang === "ar" ? "طباعة" : "Print"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-xs text-center text-emerald-300 mt-8 font-bold">
          {lang === "ar"
            ? "اطبع هذا الكيو آر على المستند ليتمكن أي شخص من الوصول إليه مباشرة."
            : "Print this QR on the document for instant access from any device."}
        </div>
      </div>
      {/* ستايل خط كايرو افتراضي (يمكنك تغييره لأي خط عربي تفضله) */}
      <style jsx global>{`
        body, .font-cairo { font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important; }
        button, select, input[type="file"], a { cursor:pointer !important; }
      `}</style>
    </div>
  );
}