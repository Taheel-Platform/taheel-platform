import { MdClose, MdNotificationsActive } from "react-icons/md";
import React, { useState } from "react";

const btnStyle = {
  background: "linear-gradient(90deg,#2196f3,#21cbf3)",
  color: "#fff",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(33,203,243,0.10)",
  fontWeight: "bold",
  padding: "10px 22px",
  border: "none",
  cursor: "pointer",
  transition: "background 0.2s, box-shadow 0.2s",
  fontSize: "1rem",
  display: "flex",
  alignItems: "center",
  gap: "7px"
};
const statusIcons = {
  new: "🆕",
  under_review: "🔎",
  government_processing: "🏛️",
  completed: "✅",
  rejected: "❌",
  pending_requirements: "📄",
  archived: "🗄️",
  awaiting_payment: "💵"
};
const statusLabel = {
  new: "جديد",
  under_review: "قيد المراجعة",
  government_processing: "قيد المعالجة الحكومية",
  awaiting_payment: "بانتظار دفع الرسوم الحكومية",
  completed: "مكتمل",
  rejected: "مرفوض",
  pending_requirements: "بانتظار مستندات",
  archived: "مؤرشف"
};
const statusColor = {
  new: "bg-sky-100 text-sky-800 border-sky-300",
  under_review: "bg-yellow-100 text-yellow-800 border-yellow-400",
  government_processing: "bg-indigo-100 text-indigo-900 border-indigo-400",
  awaiting_payment: "bg-teal-100 text-teal-900 border-teal-400",
  completed: "bg-green-100 text-green-800 border-green-400",
  rejected: "bg-red-100 text-red-800 border-red-400",
  pending_requirements: "bg-orange-100 text-orange-800 border-orange-400",
  archived: "bg-gray-100 text-gray-700 border-gray-400"
};

export default function OrderDetailsCard({
  order, client, service, assignedEmp, employees,
  onClose, onChangeStatus, onSendNotification, onTransferOrder
}) {
  const [notifContent, setNotifContent] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [transferTo, setTransferTo] = useState("");
  const [note, setNote] = useState(""); // أضفنا حالة للملاحظة

  if (!order) return null;
  const now = new Date();
  const created = order.createdAt ? new Date(order.createdAt) : null;
  const minutesAgo = created ? Math.floor((now - created) / 60000) : null;
  let notes = null;
  if (Array.isArray(order.statusHistory)) {
    const last = [...order.statusHistory].reverse().find(
      (h) => h.status === order.status && h.note
    );
    notes = last && last.note ? last.note : null;
  }

  const sameSpecialtyEmployees = employees.filter(
    emp => Array.isArray(order.providers) && emp.providers?.some(p => order.providers?.includes(p))
      && emp.userId !== assignedEmp?.userId
  );

  const orderAttachments = order.attachments && typeof order.attachments === "object"
    ? Object.entries(order.attachments).filter(
        ([k, att]) => att && (att.url || att.fileUrl || att.downloadUrl || att.imageUrl)
      )
    : [];
  const getFileLink = doc =>
    doc.fileUrl || doc.url || doc.downloadUrl || doc.imageUrl || "";

  // ---- تعديل: كارت ثابت الحجم وفيه شريط تمرير داخلي ----
  // الكارت نفسه يكون position:relative، زر الإغلاق ثابت أعلى اليمين
  // المحتوى داخله يكون max-height مع overflowY: auto (مثلاً 80vh)
  return (
    <div style={{
      background: "rgba(255,255,255,0.93)",
      borderRadius: "16px",
      width: 340,
      maxWidth: "96vw",
      height: "min(640px,96vh)", // يمنع الكارت من أن يكبر جداً
      maxHeight: "96vh",
      position: "relative",
      boxShadow: "0 6px 32px 0 rgba(33,150,243,0.13)",
      border: "1px solid #e3f4ff",
      fontFamily: "Cairo, Tajawal, Segoe UI, Arial",
      color: "#17427a",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* زر الإغلاق ثابت أعلى الكارت */}
      <button
        className="text-2xl text-gray-400 hover:text-gray-700 font-bold"
        style={{
          cursor: "pointer",
          position: "absolute",
          top: 13, right: 13, zIndex: 10,
          background: "rgba(255,255,255,0.6)",
          borderRadius: "50%",
          width: 32, height: 32,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}
        onClick={onClose}
      >
        <MdClose />
      </button>
      {/* محتوى الكارت قابل للتمرير */}
      <div style={{
        overflowY: "auto",
        padding: "18px 9px 14px 9px",
        marginTop: 0,
        maxHeight: "calc(96vh - 40px)",
        flex: 1
      }}>
        <div className="flex justify-between items-center mb-2" style={{paddingRight:34}}>
          <div className="font-bold text-blue-800 text-base">{service?.name || order.serviceId}</div>
        </div>
        <div className="mb-1 text-xs text-blue-900">
          <b>رقم الطلب:</b> <span className="font-mono">{order.trackingNumber || order.requestId}</span>
        </div>
        <div className="mb-1 text-xs">
          <b>الموظف الحالي:</b> <span>{assignedEmp ? assignedEmp.name : (order.assignedTo || "غير معين")}</span>
        </div>
        <div className="mb-1 text-xs">
          <b>وقت الطلب:</b>{" "}
          {created ? created.toLocaleString("ar-EG") + ` (${minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`} مضت)` : "-"}
        </div>
        {notes && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded text-yellow-700 font-semibold text-xs mb-2">
            <b>ملاحظة الموظف:</b> {notes}
          </div>
        )}

        {/* بيانات العميل الأساسية + رقم العميل */}
        <div className="bg-blue-50 rounded-xl p-2 mt-2 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <img
              src={client?.profilePic || "/default-avatar.png"}
              alt={client?.nameEn || client?.name || client?.middleName || ""}
              className="w-9 h-9 rounded-full border-2 border-blue-100 object-cover"
            />
            <div>
              <div className="font-bold text-blue-900 text-sm">{client?.nameEn || client?.name || client?.middleName || ""}</div>
              <div className="text-xs text-gray-600">
                <b>رقم العميل:</b> {client?.customerId}
              </div>
              {client?.nationality && <div className="text-xs text-gray-600"><b>الجنسية:</b> {client.nationality}</div>}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs mt-1">
            {client?.eidNumber && <div><b>رقم الهوية الإماراتية:</b> {client.eidNumber}</div>}
            {client?.eidExpiry && <div><b>انتهاء الهوية الإماراتية:</b> {client.eidExpiry}</div>}
            {client?.passportNumber && <div><b>رقم الباسبور:</b> {client.passportNumber}</div>}
            {client?.passportExpiry && <div><b>انتهاء الباسبور:</b> {client.passportExpiry}</div>}
            {client?.birthDate && <div><b>تاريخ الميلاد:</b> {client.birthDate}</div>}
            {client?.gender && <div><b>النوع:</b> {client.gender === "male" ? "ذكر" : "أنثى"}</div>}
            {client?.apartment && <div><b>الشقة:</b> {client.apartment}</div>}
            {client?.building && <div><b>المبنى:</b> {client.building}</div>}
            {client?.floor && <div><b>الدور:</b> {client.floor}</div>}
            {client?.street && <div><b>الشارع:</b> {client.street}</div>}
            {client?.district && <div><b>الحي:</b> {client.district}</div>}
            {client?.city && <div><b>المدينة:</b> {client.city}</div>}
            {client?.emirate && <div><b>الإمارة:</b> {client.emirate}</div>}
          </div>
        </div>

        {/* مرفقات الطلب */}
        <div className="bg-cyan-50 rounded-xl p-2 mt-2 mb-2">
          <div className="font-bold text-cyan-900 text-base mb-2 text-center">
            مرفقات الطلب
          </div>
          {orderAttachments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {orderAttachments.map(([docName, doc], i) => {
                const fileLink = getFileLink(doc);
                const ext = (fileLink || "").split('.').pop()?.toLowerCase();
                const isImage = fileLink && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileLink);
                return (
                  <div key={i} className="flex flex-col items-center rounded-xl bg-white border border-cyan-200 shadow p-1"
                    style={{ minWidth: "90px", maxWidth: "120px" }}>
                    <div className="font-bold text-cyan-800 text-xs mb-1" title={doc.docType || docName}>
                      {doc.docType || docName}
                    </div>
                    {isImage ? (
                      <a href={fileLink} target="_blank" rel="noopener noreferrer" title="عرض الصورة الأصلية">
                        <img src={fileLink} alt={doc.docType || docName}
                          style={{
                            width: 50, height: 50, objectFit: "cover", borderRadius: 10,
                            border: "1.5px solid #b9e4ff", boxShadow: "0 2px 8px #e0f7fa"
                          }} />
                      </a>
                    ) : (
                      <a
                        href={fileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center bg-cyan-50 rounded-lg border border-cyan-200 p-2 hover:bg-cyan-100"
                        style={{ width: 50, height: 50, marginBottom: 2, cursor: "pointer" }}
                        title="تحميل الملف"
                      >
                        <span style={{ fontSize: "1.5em", color: "#21cbf3" }}>
                          {ext === "pdf" ? "📄" : "📎"}
                        </span>
                        <span className="text-[10px] font-bold text-cyan-900 mt-1">تحميل</span>
                      </a>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 truncate" title={fileLink}>
                      {doc.name ? doc.name.slice(0, 14) : (fileLink?.split("/").pop()?.slice(0, 14) || "")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-xs text-center py-4">
              لا يوجد مرفقات لهذا الطلب.
            </div>
          )}
        </div>

        {/* حالة الطلب الجديدة ومنطق الدفع */}
        <div className="flex flex-col gap-2 mt-3 mb-2">
          <label className="font-bold text-gray-800 text-xs">تغيير الحالة:</label>
          <select
            name="status"
            defaultValue={order.status}
            className="border rounded px-2 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500 text-xs"
            onChange={e => setPendingStatus({ order, newStatus: e.target.value, note })}
          >
            {Object.keys(statusLabel).map((k) => (
              <option key={k} value={k}>
                {statusIcons[k]} {statusLabel[k]}
              </option>
            ))}
          </select>
          {pendingStatus?.newStatus === "awaiting_payment" && (
            <button
              style={{...btnStyle, background:"linear-gradient(90deg,#00bfae,#21cbf3)"}}
              onClick={() => {
                alert("تم إرسال طلب دفع الرسوم الحكومية للمدير المسؤول");
              }}
            >
              إرسال طلب دفع للمدير المسؤول
            </button>
          )}
          <input
            type="text"
            name="note"
            className="border rounded px-2 py-1 text-xs"
            placeholder="ملاحظة الموظف (اختياري)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button type="button" style={btnStyle} onClick={() => onChangeStatus({ ...pendingStatus, note })}>
            <MdNotificationsActive /> حفظ الحالة وإشعار العميل
          </button>
        </div>

        {sameSpecialtyEmployees.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 mb-2">
            <label className="font-bold text-gray-800 text-xs">تحويل الطلب لموظف آخر:</label>
            <select
              value={transferTo}
              onChange={e => setTransferTo(e.target.value)}
              className="border rounded px-2 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">اختر موظفاً</option>
              {sameSpecialtyEmployees.map(emp => (
                <option key={emp.userId} value={emp.userId}>{emp.name}</option>
              ))}
            </select>
            <button
              style={{...btnStyle, background:"linear-gradient(90deg,#f44336,#ffb300)"}}
              disabled={!transferTo}
              onClick={() => onTransferOrder(order, transferTo)}
            >
              تحويل الطلب
            </button>
          </div>
        )}
        {pendingStatus && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div style={{
              background: "rgba(255,255,255,0.97)",
              borderRadius: "16px",
              boxShadow: "0 5px 18px 0 rgba(33,150,243,0.14)",
              padding: "32px 20px",
              maxWidth: 300
            }}>
              <button className="absolute top-2 left-2 text-2xl" style={{cursor:"pointer"}} onClick={() => setPendingStatus(null)}>×</button>
              <div className={"inline-flex items-center gap-1 px-2 py-1 rounded border font-bold text-xs mb-3 " + (statusColor[pendingStatus.newStatus] || "bg-gray-100 text-gray-900 border-gray-400")}>
                <span>{statusIcons[pendingStatus.newStatus] || "❓"}</span>
                {statusLabel[pendingStatus.newStatus] || pendingStatus.newStatus}
              </div>
              <div className="mb-3">هل أنت متأكد أنك تريد تعيين هذه الحالة للطلب؟ سيتم إرسال إشعار تلقائي للعميل.</div>
              <div className="flex gap-3 w-full">
                <button style={btnStyle} className="w-full" onClick={() => onChangeStatus({ ...pendingStatus, note })}>تأكيد</button>
                <button style={{...btnStyle, background:"#f3f3f3", color:"#17427a"}} className="w-full" onClick={() => setPendingStatus(null)}>إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}