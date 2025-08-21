import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { collection, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

const glassStyle = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  borderRadius: "20px",
  border: "1.5px solid rgba(33,150,243,0.18)",
  boxShadow: "0 8px 32px 0 rgba(33,150,243,0.10)",
};

export default function ClientCard({ client, onClose }) {
  const [clientDocs, setClientDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // جلب مرفقات العميل الديناميكية عند تغيير العميل
  useEffect(() => {
    if (!client?.userId) return;
    setLoadingDocs(true);
    getDocs(collection(db, "users", client.userId, "documents"))
      .then(docsSnap => {
        const docsArr = [];
        docsSnap.forEach(doc => docsArr.push({ ...doc.data(), id: doc.id }));
        setClientDocs(docsArr);
      })
      .catch(() => setClientDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [client?.userId]);

  if (!client) return null;

  const attachments =
    client.documents && typeof client.documents === "object"
      ? Object.entries(client.documents).filter(
          ([key, att]) =>
            att &&
            (att.url || att.fileUrl || att.downloadUrl || att.imageUrl)
        )
      : [];
  const getFileLink = doc =>
    doc.fileUrl || doc.url || doc.downloadUrl || doc.imageUrl || "";

  return (
    <div style={{
      ...glassStyle,
      padding: "24px 18px",
      maxWidth: 430,
      borderRadius: "22px",
      minWidth: "280px",
      boxShadow: "0 8px 40px 0 rgba(33,150,243,0.19)"
    }} className="mb-2 rounded-xl shadow border w-full relative">
      <button style={{ cursor: "pointer" }} className="absolute top-2 left-2 text-xl text-gray-400 hover:text-emerald-700 font-bold"
        onClick={onClose}>
        <MdClose />
      </button>
      <div className="flex flex-col items-center mb-4">
        <img src={client.profilePic || "/default-avatar.png"} alt={client.nameEn || client.name || client.middleName || ""}
          className="w-16 h-16 rounded-full border-2 border-emerald-200 shadow mb-2 object-cover" />
        <div className="text-lg font-extrabold text-emerald-900"
          style={{ textShadow: "0 1px 0 #fff,0 1px 2px #666" }}>
          {client.nameEn || client.name || client.middleName || ""}
        </div>
        <div className="text-gray-700 font-mono font-bold text-xs">{client.userId || client.customerId}</div>
      </div>
      <div className="mt-2">
        {/* بيانات العميل الأصلية */}
        <div className="mb-4 bg-blue-50 rounded-xl p-3">
          <div className="font-bold text-blue-900 text-base mb-2 text-center">بيانات العميل الأساسية</div>
          <div className="flex flex-col gap-2 text-xs">
            <div><b>رقم العميل:</b> {client.userId || client.customerId}</div>
            {client.accountType && <div><b>نوع الحساب:</b> {client.accountType}</div>}
            {client.type && <div><b>تصنيف العميل:</b> {client.type}</div>}
            {client.nationality && <div><b>الجنسية:</b> {client.nationality}</div>}
            {client.gender && <div><b>النوع:</b> {client.gender === "male" ? "ذكر" : "أنثى"}</div>}
            {client.birthDate && <div><b>تاريخ الميلاد:</b> {client.birthDate}</div>}
            {client.eidNumber && <div><b>رقم الهوية الإماراتية:</b> {client.eidNumber}</div>}
            {client.eidExpiry && <div><b>انتهاء الهوية الإماراتية:</b> {client.eidExpiry}</div>}
            {client.passportNumber && <div><b>رقم الباسبور:</b> {client.passportNumber}</div>}
            {client.passportExpiry && <div><b>انتهاء الباسبور:</b> {client.passportExpiry}</div>}
            {client.phone && <div><b>الجوال:</b> {client.phone}</div>}
            {client.email && <div><b>الإيميل:</b> {client.email}</div>}
            {client.apartment && <div><b>الشقة:</b> {client.apartment}</div>}
            {client.building && <div><b>المبنى:</b> {client.building}</div>}
            {client.floor && <div><b>الدور:</b> {client.floor}</div>}
            {client.street && <div><b>الشارع:</b> {client.street}</div>}
            {client.district && <div><b>الحي:</b> {client.district}</div>}
            {client.city && <div><b>المدينة:</b> {client.city}</div>}
            {client.emirate && <div><b>الإمارة:</b> {client.emirate}</div>}
          </div>
        </div>
        {/* مرفقات العميل الأصلية */}
        <div className="font-extrabold text-emerald-900 text-base mb-2 text-center">مرفقات العميل:</div>
        {attachments.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {attachments.map(([key, doc], i) => {
              const fileLink = getFileLink(doc);
              const isImage = fileLink && fileLink.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              return (
                <div key={i} className="flex flex-col items-center rounded-xl bg-gradient-to-br from-emerald-50 via-blue-50 to-white border shadow p-2"
                  style={{ minWidth: "110px", maxWidth: "140px" }}>
                  <div className="font-bold text-emerald-800 text-xs mb-1" title={doc.docType || key}>
                    {doc.docType || key}
                  </div>
                  {isImage ? (
                    <a href={fileLink} target="_blank" rel="noopener noreferrer" title="عرض الصورة الأصلية">
                      <img src={fileLink} alt={doc.docType || key}
                        style={{
                          width: 70, height: 70, objectFit: "cover", borderRadius: 10,
                          border: "1.5px solid #b9e4ff", boxShadow: "0 2px 8px #e0f7fa"
                        }} />
                    </a>
                  ) : (
                    <a href={fileLink} target="_blank" download rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center bg-blue-50 rounded-lg border border-emerald-100 p-3 hover:bg-blue-100"
                      style={{ width: 70, height: 70, marginBottom: 3, cursor: "pointer" }}
                      title="تحميل الملف">
                      <span style={{ fontSize: "2em", color: "#1976d2" }}>📄</span>
                      <span className="text-[11px] font-bold text-blue-900 mt-1">تحميل</span>
                    </a>
                  )}
                  <span className="text-[11px] text-gray-500 mt-1 truncate" title={fileLink}>
                    {fileLink?.split("/").pop()?.slice(0, 18) || ""}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-400 text-xs text-center py-6">
            لا يوجد مرفقات لهذا العميل.
          </div>
        )}
        {/* مرفقات مجلوبة ديناميكياً من clientDocs */}
        {loadingDocs && <div className="text-xs text-blue-400 text-center">...جاري تحميل المرفقات</div>}
        {!loadingDocs && clientDocs && clientDocs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {clientDocs.map((doc, i) => (
              <div key={i} className="flex flex-col items-center rounded-xl bg-gradient-to-br from-blue-50 via-emerald-50 to-white border shadow p-2"
                style={{ minWidth: "110px", maxWidth: "140px" }}>
                <div className="font-bold text-blue-800 text-xs mb-1" title={doc.docType || doc.id}>
                  {doc.docType || doc.id}
                </div>
                {doc.imageUrl ? (
                  <a href={doc.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={doc.imageUrl} alt={doc.docType || doc.id}
                      style={{
                        width: 70, height: 70, objectFit: "cover", borderRadius: 10,
                        border: "1.5px solid #b9e4ff", boxShadow: "0 2px 8px #e0f7fa"
                      }} />
                  </a>
                ) : (
                  <a href={doc.fileUrl || doc.url || doc.downloadUrl} target="_blank" download rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center bg-blue-50 rounded-lg border border-emerald-100 p-3 hover:bg-blue-100"
                    style={{ width: 70, height: 70, marginBottom: 3, cursor: "pointer" }}
                    title="تحميل الملف">
                    <span style={{ fontSize: "2em", color: "#1976d2" }}>📄</span>
                    <span className="text-[11px] font-bold text-blue-900 mt-1">تحميل</span>
                  </a>
                )}
                <span className="text-[11px] text-gray-500 mt-1 truncate" title={doc.name}>
                  {doc.name?.slice(0, 18) || ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}