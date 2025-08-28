import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { collection, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

const glassStyle = {
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(10px)",
  borderRadius: "18px",
  border: "1px solid #bce0fa",
  boxShadow: "0 4px 24px 0 rgba(33,150,243,0.10)",
};

export default function ClientCard({ client, onClose }) {
  const [clientDocs, setClientDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (!client?.customerId) return;
    setLoadingDocs(true);
    getDocs(collection(db, "users", client.customerId, "documents"))
      .then(docsSnap => {
        const docsArr = [];
        docsSnap.forEach(doc => docsArr.push({ ...doc.data(), id: doc.id }));
        setClientDocs(docsArr);
      })
      .catch(() => setClientDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [client?.customerId]);

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

  // ---- تعديل: كارت ثابت الحجم وفيه شريط تمرير داخلي ----
  // الكارت نفسه يكون position:relative، زر الإغلاق ثابت أعلى اليسار
  // المحتوى داخله يكون max-height مع overflowY: auto (مثلاً 80vh)
  return (
    <div
      style={{
        ...glassStyle,
        padding: "20px 14px",
        maxWidth: 340,
        minWidth: "220px",
        borderRadius: "18px",
        boxShadow: "0 6px 32px 0 rgba(33,150,243,0.13)",
        fontFamily: "Cairo, Tajawal, Segoe UI, Arial",
        color: "#17427a",
        position: "relative",
        height: "min(600px,96vh)",
        maxHeight: "96vh",
        display: "flex",
        flexDirection: "column"
      }}
      className="mb-2 rounded-xl shadow border w-full relative"
    >
      {/* زر الإغلاق ثابت أعلى الكارت */}
      <button
        style={{
          cursor: "pointer",
          fontSize: "1.4em",
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "rgba(255,255,255,0.6)",
          borderRadius: "50%",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        className="absolute top-2 left-2 text-xl text-gray-400 hover:text-emerald-700 font-bold"
        onClick={onClose}
      >
        <MdClose />
      </button>
      {/* محتوى الكارت قابل للتمرير */}
      <div
        style={{
          overflowY: "auto",
          padding: "8px 0 10px 0",
          marginTop: 0,
          maxHeight: "calc(96vh - 40px)",
          flex: 1
        }}
      >
        <div className="flex flex-col items-center mb-3">
          <img
            src={client.profilePic || "/default-avatar.png"}
            alt={client.nameEn || client.name || client.middleName || ""}
            className="w-14 h-14 rounded-full border-2 border-emerald-200 shadow mb-1 object-cover"
          />
          <div
            className="text-base font-extrabold text-emerald-900"
            style={{ textShadow: "0 1px 0 #fff,0 1px 2px #666" }}
          >
            {client.nameEn || client.name || client.middleName || ""}
          </div>
          <div className="text-blue-800 font-mono font-bold text-xs mt-1">{client.customerId}</div>
        </div>
        <div className="mt-1">
          {/* بيانات العميل الأصلية */}
          <div className="mb-3 bg-blue-50 rounded-xl p-2">
            <div className="font-bold text-blue-900 text-base mb-2 text-center">
              بيانات العميل الأساسية
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <div>
                <b>رقم العميل:</b> {client.customerId}
              </div>
              {client.accountType && <div><b>نوع الحساب:</b> {client.accountType}</div>}
              {client.type && <div><b>تصنيف العميل:</b> {client.type}</div>}
              {client.nationality && <div><b>الجنسية:</b> {client.nationality}</div>}
              {client.gender && (
                <div>
                  <b>النوع:</b> {client.gender === "male" ? "ذكر" : "أنثى"}
                </div>
              )}
              {client.birthDate && <div><b>تاريخ الميلاد:</b> {client.birthDate}</div>}
              {client.eidNumber && <div><b>رقم الهوية الإماراتية:</b> {client.eidNumber}</div>}
              {client.eidExpiry && <div><b>انتهاء الهوية الإماراتية:</b> {client.eidExpiry}</div>}
              {client.passportNumber && <div><b>رقم الباسبور:</b> {client.passportNumber}</div>}
              {client.passportExpiry && <div><b>انتهاء الباسبور:</b> {client.passportExpiry}</div>}
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
          <div className="font-extrabold text-emerald-900 text-base mb-2 text-center">
            مرفقات العميل:
          </div>
          {attachments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {attachments.map(([key, doc], i) => {
                const fileLink = getFileLink(doc);
                const isImage = fileLink && fileLink.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center rounded bg-gradient-to-br from-emerald-50 via-blue-50 to-white border shadow p-1"
                    style={{ minWidth: "90px", maxWidth: "120px" }}
                  >
                    <div
                      className="font-bold text-emerald-800 text-xs mb-1"
                      title={doc.docType || key}
                    >
                      {doc.docType || key}
                    </div>
                    {isImage ? (
                      <a href={fileLink} target="_blank" rel="noopener noreferrer" title="عرض الصورة الأصلية">
                        <img
                          src={fileLink}
                          alt={doc.docType || key}
                          style={{
                            width: 50,
                            height: 50,
                            objectFit: "cover",
                            borderRadius: 10,
                            border: "1.5px solid #b9e4ff",
                            boxShadow: "0 2px 8px #e0f7fa"
                          }}
                        />
                      </a>
                    ) : (
                      <a
                        href={fileLink}
                        target="_blank"
                        download
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center bg-blue-50 rounded-lg border border-emerald-100 p-2 hover:bg-blue-100"
                        style={{ width: 50, height: 50, marginBottom: 2, cursor: "pointer" }}
                        title="تحميل الملف"
                      >
                        <span style={{ fontSize: "1.5em", color: "#1976d2" }}>📄</span>
                        <span className="text-[10px] font-bold text-blue-900 mt-1">تحميل</span>
                      </a>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 truncate" title={fileLink}>
                      {fileLink?.split("/").pop()?.slice(0, 14) || ""}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-xs text-center py-4">
              لا يوجد مرفقات لهذا العميل.
            </div>
          )}
          {/* مرفقات مجلوبة ديناميكياً من clientDocs */}
          {loadingDocs && (
            <div className="text-xs text-blue-400 text-center">...جاري تحميل المرفقات</div>
          )}
          {!loadingDocs && clientDocs && clientDocs.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {clientDocs.map((doc, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded bg-gradient-to-br from-blue-50 via-emerald-50 to-white border shadow p-1"
                  style={{ minWidth: "90px", maxWidth: "120px" }}
                >
                  <div
                    className="font-bold text-blue-800 text-xs mb-1"
                    title={doc.docType || doc.id}
                  >
                    {doc.docType || doc.id}
                  </div>
                  {doc.imageUrl ? (
                    <a href={doc.imageUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={doc.imageUrl}
                        alt={doc.docType || doc.id}
                        style={{
                          width: 50,
                          height: 50,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "1.5px solid #b9e4ff",
                          boxShadow: "0 2px 8px #e0f7fa"
                        }}
                      />
                    </a>
                  ) : (
                    <a
                      href={doc.fileUrl || doc.url || doc.downloadUrl}
                      target="_blank"
                      download
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center bg-blue-50 rounded-lg border border-emerald-100 p-2 hover:bg-blue-100"
                      style={{ width: 50, height: 50, marginBottom: 2, cursor: "pointer" }}
                      title="تحميل الملف"
                    >
                      <span style={{ fontSize: "1.5em", color: "#1976d2" }}>📄</span>
                      <span className="text-[10px] font-bold text-blue-900 mt-1">تحميل</span>
                    </a>
                  )}
                  <span className="text-[10px] text-gray-500 mt-1 truncate" title={doc.name}>
                    {doc.name?.slice(0, 14) || ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}