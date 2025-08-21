"use client";
import { useEffect, useState, useRef } from "react";
import {
  collection, doc, onSnapshot, updateDoc, addDoc, getDocs,
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";
import {
  MdClose, MdEmail, MdWhatsapp, MdNotificationsActive, MdPerson
} from "react-icons/md";
import {
  FaUserTie, FaUserAlt, FaBuilding, FaUserCheck, FaUserSlash
} from "react-icons/fa";

/* --- Modern Glass Styles --- */
const GLASS = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(16px)",
  borderRadius: "20px",
  border: "1px solid rgba(33,150,243,0.16)",
  boxShadow: "0 8px 32px 0 rgba(33,150,243,0.10)",
};
const CARD = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: "16px",
  boxShadow: "0 4px 28px rgba(33,150,243,0.15)",
  border: "1px solid #e3f4ff"
};
const BTN = {
  background: "linear-gradient(90deg,#2196f3,#21cbf3)",
  color: "#fff",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(33,203,243,0.10)",
  fontWeight: 600,
  padding: "10px 22px",
  border: "none",
  cursor: "pointer",
  transition: "background 0.2s, box-shadow 0.2s",
  fontSize: "1rem",
  display: "flex",
  alignItems: "center",
  gap: "7px"
};
const BTN_HOVER = {
  background: "linear-gradient(90deg,#21cbf3,#2196f3)",
  boxShadow: "0 4px 24px rgba(33,203,243,0.14)",
};
const TABLE_HEAD = {
  background: "rgba(33,150,243,0.11)",
  color: "#17427a",
  fontWeight: 700
};

/* --- Status Data --- */
const STATUS = {
  new: { icon: "🆕", label: "جديد", color: "bg-sky-100 text-sky-800 border-sky-300" },
  under_review: { icon: "🔎", label: "قيد المراجعة", color: "bg-yellow-100 text-yellow-800 border-yellow-400" },
  government_processing: { icon: "🏛️", label: "قيد المعالجة الحكومية", color: "bg-indigo-100 text-indigo-900 border-indigo-400" },
  completed: { icon: "✅", label: "مكتمل", color: "bg-green-100 text-green-800 border-green-400" },
  rejected: { icon: "❌", label: "مرفوض", color: "bg-red-100 text-red-800 border-red-400" },
  pending_requirements: { icon: "📄", label: "بانتظار مستندات", color: "bg-orange-100 text-orange-800 border-orange-400" },
  archived: { icon: "🗄️", label: "مؤرشف", color: "bg-gray-100 text-gray-700 border-gray-400" }
};
const TYPE_TABS = [
  { key: "all", label: "الكل", icon: <MdPerson /> },
  { key: "resident", label: "المقيمين", icon: <FaUserCheck /> },
  { key: "nonResident", label: "غير المقيمين", icon: <FaUserSlash /> },
  { key: "company", label: "الشركات", icon: <FaBuilding /> },
  { key: "other", label: "أخرى", icon: <FaUserAlt /> }
];

function MyOrdersSection({ employeeData, lang = "ar" }) {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState({});
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState({});
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showClientCard, setShowClientCard] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifContent, setNotifContent] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [newSidebarOpen, setNewSidebarOpen] = useState(false);
  const notifAudioRef = useRef(null);
  const [lastNewOrdersCount, setLastNewOrdersCount] = useState(0);
  const [clientDocs, setClientDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // --- Fetch all data ---
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, "requests"), snap => {
      const arr = [];
      snap.forEach(docSnap => arr.push({ ...docSnap.data(), requestId: docSnap.id }));
      setOrders(arr);
    });
    return () => unsubOrders();
  }, []);
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      const usersObj = {};
      const empArr = [];
      snap.forEach(docSnap => {
        const user = { ...docSnap.data(), userId: docSnap.id };
        usersObj[user.userId] = user;
        if (user.role === "employee" || user.role === "admin") empArr.push(user);
      });
      setClients(usersObj);
      setEmployees(empArr);
    });
    const unsubServices = onSnapshot(collection(db, "servicesByClientType"), async (snap) => {
      const flat = {};
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        Object.entries(data).forEach(([sid, s]) => {
          flat[sid] = { ...s, type: docSnap.id, id: sid };
        });
      }
      setServices(flat);
    });
    return () => {
      unsubUsers();
      unsubServices();
    };
  }, []);
  useEffect(() => {
    if (notifAudioRef.current && lastNewOrdersCount !== null && newOrders.length > lastNewOrdersCount) {
      notifAudioRef.current.play();
    }
    setLastNewOrdersCount(newOrders.length);
  }, [orders]);

  // --- Helper Functions ---
  function getOrderType(clientId) {
    if (!clientId) return "other";
    if (clientId.startsWith("RES-")) return "resident";
    if (clientId.startsWith("NON-")) return "nonResident";
    if (clientId.startsWith("COM-")) return "company";
    return "other";
  }
  async function acceptOrder(order) {
    if (order.assignedTo && order.assignedTo !== "") return;
    await updateDoc(doc(db, "requests", order.requestId), {
      assignedTo: employeeData.id,
      assignedToName: employeeData.name || "موظف",
      lastUpdated: new Date().toISOString()
    });
    setNewSidebarOpen(false);
    setSelected(null);
  }
  async function sendAutoNotification(order, newStatus) {
    const client = clients[order.clientId];
    if (!client) return;
    const statusMsg = `تم تحديث حالة طلبك (${order.trackingNumber || order.requestId}) إلى: ${STATUS[newStatus].label}`;
    const notifData = {
      body: statusMsg,
      notificationId: `notif-${Date.now()}`,
      relatedRequest: order.requestId,
      targetId: client.userId,
      timestamp: new Date().toISOString(),
      title: "تحديث حالة طلبك",
      type: "status",
      isRead: false
    };
    await addDoc(collection(db, "notifications"), notifData);
  }
  async function confirmChangeStatus() {
    if (!pendingStatus) return;
    const { order, newStatus, note } = pendingStatus;
    const statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const updatedHistory = [
      ...statusHistory,
      {
        status: newStatus,
        timestamp: new Date().toISOString(),
        updatedBy: employeeData.name,
        ...(note ? { note } : {})
      }
    ];
    await updateDoc(doc(db, "requests", order.requestId), {
      status: newStatus,
      statusHistory: updatedHistory
    });
    setSelected((s) =>
      s && s.requestId === order.requestId
        ? { ...s, status: newStatus, statusHistory: updatedHistory }
        : s
    );
    await sendAutoNotification(order, newStatus);
    setPendingStatus(null);
  }
  async function sendCustomNotification(order, content) {
    if (!content || !order) return;
    const client = clients[order.clientId];
    if (!client) return;
    const notifData = {
      body: content,
      notificationId: `notif-${Date.now()}`,
      relatedRequest: order.requestId,
      targetId: client.userId,
      timestamp: new Date().toISOString(),
      title: "إشعار من الدعم",
      type: "custom",
      isRead: false
    };
    await addDoc(collection(db, "notifications"), notifData);
    setShowNotifModal(false);
    setNotifContent("");
    alert("تم إرسال الإشعار بنجاح!");
  }
  // --- Client Card ---
  const handleShowClientCard = async (client) => {
    setShowClientCard(client);
    setLoadingDocs(true);
    try {
      const docsSnap = await getDocs(collection(db, "users", client.userId, "documents"));
      const docsArr = [];
      docsSnap.forEach(doc => docsArr.push({ ...doc.data(), id: doc.id }));
      setClientDocs(docsArr);
    } catch (e) {
      setClientDocs([]);
    }
    setLoadingDocs(false);
  };

  // --- Orders Data ---
  const statusCounts = {};
  orders.forEach((o) => {
    const s = o.status || "new";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const employeeProviders = Array.isArray(employeeData.providers) ? employeeData.providers : [];
  // الطلبات الجديدة الخاصة بتخصص الموظف
  const newOrders = orders
    .filter(o =>
      (!o.assignedTo || o.assignedTo === "" || o.assignedTo === null)
      &&
      (Array.isArray(o.providers) && o.providers.some(p => employeeProviders.includes(p)))
    )
    .sort((a, b) => (a.createdAt || "") > (b.createdAt || "") ? 1 : -1);

  // الطلبات المعينة لهذا الموظف فقط
  const filteredOrders = orders
    .filter((o) =>
      o.assignedTo === employeeData.id &&
      Array.isArray(o.providers) &&
      o.providers.some(p => employeeProviders.includes(p))
    )
    .filter((o) => {
      const type = getOrderType(o.clientId);
      if (tab !== "all" && type !== tab) return false;
      if (statusFilter !== "all" && (o.status || "new") !== statusFilter) return false;
      const client = clients[o.clientId] || {};
      const svc = services[o.serviceId] || {};
      const searchText =
        [
          o.trackingNumber,
          o.requestId,
          o.clientId,
          client.name,
          client.userId,
          svc.name,
          svc.name_en,
          o.status,
          client.email,
          client.phone
        ].filter(Boolean).join(" ").toLowerCase();
      return searchText.includes(search.toLowerCase());
    })
    .sort((a, b) => (a.createdAt || "") > (b.createdAt || "") ? 1 : -1);

  /* --- Render Components --- */
  function renderClientCard(client) {
    if (!client) return null;
    const attachments =
      client.documents && typeof client.documents === "object"
        ? Object.entries(client.documents).filter(
            ([key, att]) =>
              att &&
              (
                att.url ||
                att.fileUrl ||
                att.downloadUrl ||
                att.imageUrl
              )
          )
        : [];
    const getFileLink = doc =>
      doc.fileUrl ||
      doc.url ||
      doc.downloadUrl ||
      doc.imageUrl ||
      "";

    return (
      <div style={{ ...CARD, padding: "24px 18px", maxWidth: 430, minWidth: 280 }} className="mb-2 rounded-xl shadow border w-full relative">
        <button style={{ cursor: "pointer", position: "absolute", top: 12, left: 12 }} className="text-xl text-gray-400 hover:text-emerald-700 font-bold"
          onClick={() => setShowClientCard(false)}>
          <MdClose />
        </button>
        <div className="flex flex-col items-center mb-4">
          <img src={client.profilePic || "/default-avatar.png"} alt={client.name}
            className="w-16 h-16 rounded-full border-2 border-emerald-200 shadow mb-2 object-cover" />
          <div className="text-lg font-extrabold text-emerald-900">{client.name}</div>
          <div className="text-gray-700 font-mono font-bold text-xs">{client.userId}</div>
        </div>
        <div className="mt-2">
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
        </div>
      </div>
    );
  }

  function renderOrderDetails(order) {
    if (!order) return null;
    const client = clients[order.clientId];
    const service = services[order.serviceId];
    const assignedEmp = employees.find((e) => e.userId === order.assignedTo);
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
    const whatsappLink = client?.phone ? `https://wa.me/${client.phone.replace(/^0/, "971")}` : null;
    const mailtoLink = client?.email ? `mailto:${client.email}` : null;

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" style={{padding: "10px"}}>
        <div style={CARD}>
            <div className="flex justify-between items-center mb-2">
              <div className="font-bold text-blue-800 text-lg">{service?.name || order.serviceId}</div>
              <button className="text-2xl text-gray-400 hover:text-gray-700 font-bold" style={{cursor: "pointer"}} onClick={() => setSelected(null)}>
                <MdClose />
              </button>
            </div>
            <div className="mb-2 text-xs text-blue-900">
              <b>رقم الطلب:</b> <span className="font-mono">{order.trackingNumber || order.requestId}</span>
            </div>
            <div className="mb-2 text-xs">
              <b>الموظف الحالي:</b> <span>{assignedEmp ? assignedEmp.name : (order.assignedTo || "غير معين")}</span>
            </div>
            <div className="mb-2 text-xs">
              <b>وقت الطلب:</b>{" "}
              {created ? created.toLocaleString("ar-EG") + ` (${minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`} مضت)` : "-"}
            </div>
            {notes && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded text-yellow-700 font-semibold text-xs mb-2">
                <b>ملاحظة الموظف:</b> {notes}
              </div>
            )}
            {/* بيانات العميل */}
            <div className="bg-blue-50 rounded-xl p-2 mt-2 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={client?.profilePic || "/default-avatar.png"}
                  alt={client?.name}
                  className="w-10 h-10 rounded-full border-2 border-blue-100 object-cover"
                />
                <div>
                  <div className="font-bold text-blue-900 text-sm">{client?.name}</div>
                  <div className="text-xs text-gray-600">{client?.employeeNumber || client?.userId}</div>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <div><b>الجوال:</b> {client?.phone}</div>
                <div><b>الإيميل:</b> {client?.email}</div>
                <div className="flex flex-wrap gap-1">
                  <b>مرفقات:</b>{" "}
                  {client?.documents && typeof client.documents === "object" && Object.values(client.documents).length > 0
                    ? (
                      Object.values(client.documents).map((doc, i) =>
                        doc.fileUrl ? (
                          <a key={i}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-bold text-[11px] hover:bg-blue-200 border flex items-center gap-1"
                            style={{ cursor: "pointer", marginBottom: 4 }}
                          >
                            {doc.docType || "مرفق"} <span style={{fontSize:"1.1em"}}>⬇️</span>
                          </a>
                        ) : null
                      )
                    )
                    : <span className="text-gray-400">لا يوجد</span>
                  }
                </div>
              </div>
            </div>
            {/* مرفقات الطلب */}
            {order.attachments && Object.keys(order.attachments).length > 0 ? (
            <div className="bg-cyan-50 rounded-xl p-2 mt-2 mb-2">
              <div className="font-bold text-cyan-900 text-base mb-3 text-center">
                مرفقات الطلب
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(order.attachments).map(([docName, doc], i) => {
                  const fileLink = doc.url || doc.fileUrl || doc.downloadUrl || doc.imageUrl;
                  const ext = (fileLink || "").split('.').pop()?.toLowerCase();
                  const isImage = fileLink && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileLink);
                  return (
                    <div key={i} className="flex flex-col items-center rounded-xl bg-white border border-cyan-200 shadow p-2"
                      style={{ minWidth: "110px", maxWidth: "140px" }}>
                      <div className="font-bold text-cyan-800 text-xs mb-1" title={doc.docType || docName}>
                        {doc.docType || docName}
                      </div>
                      {isImage ? (
                        <a href={fileLink} target="_blank" rel="noopener noreferrer" title="عرض الصورة الأصلية">
                          <img src={fileLink} alt={doc.docType || docName}
                            style={{
                              width: 70, height: 70, objectFit: "cover", borderRadius: 10,
                              border: "1.5px solid #b9e4ff", boxShadow: "0 2px 8px #e0f7fa"
                            }} />
                        </a>
                      ) : (
                        <a
                          href={fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center bg-cyan-50 rounded-lg border border-cyan-200 p-3 hover:bg-cyan-100"
                          style={{ width: 70, height: 70, marginBottom: 3, cursor: "pointer" }}
                          title="تحميل الملف"
                        >
                          <span style={{ fontSize: "2em", color: "#21cbf3" }}>
                            {ext === "pdf" ? "📄" : "📎"}
                          </span>
                          <span className="text-[11px] font-bold text-cyan-900 mt-1">تحميل</span>
                        </a>
                      )}
                      <span className="text-[11px] text-gray-500 mt-1 truncate" title={fileLink}>
                        {doc.name ? doc.name.slice(0, 18) : (fileLink?.split("/").pop()?.slice(0, 18) || "")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-xs text-center py-6">
              لا يوجد مرفقات لهذا الطلب.
            </div>
          )}
            {/* أزرار التواصل */}
            <div className="flex flex-wrap gap-2 items-center mt-2 mb-2">
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  style={{...BTN, background:"linear-gradient(90deg,#25d366,#128c7e)", fontSize:"0.95rem"}}
                  className="shadow"
                >
                  <MdWhatsapp /> واتساب
                </a>
              )}
              {mailtoLink && (
                <a href={mailtoLink} target="_blank" rel="noopener noreferrer"
                  style={{...BTN, background:"linear-gradient(90deg,#1976d2,#64b5f6)", fontSize:"0.95rem"}}
                >
                  <MdEmail /> إرسال إيميل
                </a>
              )}
              <button style={{...BTN, background:"linear-gradient(90deg,#ffb300,#ffd54f)", color:"#444"}} onClick={() => setShowNotifModal(true)}>
                <MdNotificationsActive /> إشعار مخصص
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                const status = e.target.status.value;
                const note = e.target.note.value;
                setPendingStatus({order, newStatus: status, note});
              }}
              className="flex flex-col gap-2 mt-3"
            >
              <label className="font-bold text-gray-800 text-xs">تغيير الحالة:</label>
              <select name="status" defaultValue={order.status} className="border rounded px-2 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500 text-xs">
                {Object.keys(STATUS).map((k) => (
                  <option key={k} value={k}>
                    {STATUS[k].icon} {STATUS[k].label}
                  </option>
                ))}
              </select>
              <input type="text" name="note" className="border rounded px-2 py-1 text-xs" placeholder="ملاحظة الموظف (اختياري)" />
              <button type="submit" style={BTN}>
                <MdNotificationsActive /> حفظ الحالة وإشعار العميل
              </button>
            </form>
            {showNotifModal && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div style={GLASS} className="shadow-xl p-6 max-w-xs w-full relative flex flex-col items-center">
                  <button className="absolute top-2 left-2 text-2xl" style={{cursor:"pointer"}} onClick={() => setShowNotifModal(false)}>×</button>
                  <div className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <MdNotificationsActive /> إرسال إشعار مخصص
                  </div>
                  <textarea
                    className="w-full rounded border p-2 mb-3 text-xs"
                    rows={3}
                    placeholder="اكتب نص الإشعار هنا..."
                    value={notifContent}
                    onChange={e => setNotifContent(e.target.value)}
                  />
                  <button
                    style={BTN}
                    className="w-full"
                    disabled={!notifContent.trim()}
                    onClick={() => sendCustomNotification(order, notifContent)}
                  >
                    <MdNotificationsActive /> إرسال الإشعار
                  </button>
                </div>
              </div>
            )}
            {pendingStatus && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div style={GLASS} className="shadow-xl p-6 max-w-xs w-full relative flex flex-col items-center">
                  <button className="absolute top-2 left-2 text-2xl" style={{cursor:"pointer"}} onClick={() => setPendingStatus(null)}>×</button>
                  <div className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <MdNotificationsActive /> تأكيد تغيير الحالة
                  </div>
                  <div className="mb-3">هل أنت متأكد أنك تريد تغيير حالة الطلب؟ سيتم إشعار العميل تلقائيًا.</div>
                  <div className="flex gap-3 w-full">
                    <button style={BTN} className="w-full" onClick={confirmChangeStatus}>تأكيد</button>
                    <button style={{...BTN, background:"#f3f3f3", color:"#17427a"}} className="w-full" onClick={() => setPendingStatus(null)}>إلغاء</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

  function renderNewSidebar() {
    return (
      <div className={`fixed top-0 right-0 h-full z-50`}
        style={{
          ...GLASS,
          width: 330,
          maxWidth: "100%",
          transition: "transform 0.3s",
          transform: newSidebarOpen ? "translateX(0)" : "translateX(100%)"
        }}>
        <div className="flex justify-between items-center p-4 border-b">
          <div className="text-lg font-bold text-blue-900 flex items-center gap-2"><MdNotificationsActive /> الطلبات الجديدة</div>
          <button className="text-2xl text-gray-400 hover:text-gray-700" style={{cursor:"pointer"}} onClick={() => setNewSidebarOpen(false)}>×</button>
        </div>
        <div className="p-3 overflow-y-auto h-[calc(100%-60px)]">
          {newOrders.length === 0 && (
            <div className="text-center text-gray-400 mt-6">لا يوجد طلبات جديدة</div>
          )}
          {newOrders.filter(o => !o.assignedTo || o.assignedTo === "" || o.assignedTo === null).map((order) => {
            const client = clients[order.clientId];
            const service = services[order.serviceId];
            const created = order.createdAt ? new Date(order.createdAt) : null;
            const minutesAgo = created ? Math.floor((new Date() - created) / 60000) : null;
            return (
              <div
                key={order.requestId}
                className="bg-blue-50 mb-3 rounded-lg p-3 shadow hover:bg-blue-100"
                style={{cursor:"pointer"}}
                onClick={() => { setSelected(order); setNewSidebarOpen(false); }}
              >
                <div className="font-bold text-blue-900">
                  {order.serviceName || service?.name || order.serviceId}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  رقم الطلب: {order.requestId}
                </div>
                <div className="text-xs text-gray-800 font-bold">
                  {client?.name || order.clientId}
                </div>
                <div className="text-xs mt-1 text-gray-600 font-bold">
                  <span className="font-bold">منذ: </span>
                  {minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`}
                </div>
                <button
                  style={BTN}
                  onMouseOver={e=>Object.assign(e.target.style,BTN_HOVER)}
                  onMouseOut={e=>Object.assign(e.target.style,BTN)}
                  className="mt-2"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await acceptOrder(order);
                  }}
                >
                  قبول الطلب
                </button>
              </div>
            );
          })}
        </div>
        <audio ref={notifAudioRef} src="/sounds/new-order.mp3" preload="auto" />
      </div>
    );
  }

  /* --- Main Layout --- */
  return (
    <div style={{
      fontFamily: "Cairo,Tajawal,Segoe UI,Arial",
      background: "linear-gradient(135deg,#e3f0ff 0%,#c9e6ff 100%) min-h-screen"
    }} className="relative p-4 md:p-8">
      {/* Header Section */}
      <div style={{
        ...GLASS,
        background: "rgba(210,234,255,0.92)",
        color: "#114477",
        padding: "16px 24px",
        borderRadius: "20px",
        marginBottom: "20px",
        fontWeight: 700,
        boxShadow: "0 5px 18px 0 rgba(33,150,243,0.14)",
        position: "relative"
      }}>
        <div className="flex items-center gap-3">
          <FaUserTie style={{fontSize: "2rem", color: "#2196f3"}} />
          <span className="text-2xl font-black">إدارة الطلبات</span>
        </div>
        <span className="absolute left-5 top-6 text-xs text-blue-300 font-bold">لوحة الموظف</span>
      </div>
      {/* Type Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TYPE_TABS.map((t) => (
          <button
            key={t.key}
            style={{
              ...BTN,
              background: tab === t.key ? "linear-gradient(90deg,#1976d2,#2196f3)" : "rgba(255,255,255,0.27)",
              color: tab === t.key ? "#fff" : "#1976d2",
              boxShadow: tab === t.key ? BTN.boxShadow : "none",
              borderBottom: tab === t.key ? "3px solid #1e88e5" : "1px solid #c3e0fa",
              fontWeight:"bold", cursor:"pointer", fontSize:"1rem"
            }}
            onClick={() => setTab(t.key)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {/* Status Counters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          style={{...BTN, background:statusFilter==="all"?"linear-gradient(90deg,#2196f3,#21cbf3)":"#e3f0ff", color:statusFilter==="all"?"#fff":"#1565c0", cursor:"pointer"}}
          onClick={() => setStatusFilter("all")}
        >
          الكل <span className="font-mono">{orders.length}</span>
        </button>
        {Object.keys(STATUS).map((k) =>
          <button key={k}
            style={{
              ...BTN,
              background:statusFilter===k?"linear-gradient(90deg,#2196f3,#21cbf3)":"#e3f0ff",
              color:statusFilter===k?"#fff":"#1565c0",
              cursor:"pointer"
            }}
            onClick={() => setStatusFilter(k)}
          >
            <span>{STATUS[k].icon}</span>
            {STATUS[k].label}
            <span className="font-mono">{statusCounts[k] || 0}</span>
          </button>
        )}
      </div>
      {/* Search & New Orders Button */}
      <div className="flex items-center mb-4 gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="بحث برقم الطلب/العميل/الخدمة/الحالة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{fontSize:"1rem", minWidth:190}}
        />
        <button
          style={BTN}
          onMouseOver={e=>Object.assign(e.target.style,BTN_HOVER)}
          onMouseOut={e=>Object.assign(e.target.style,BTN)}
          onClick={() => setNewSidebarOpen(true)}
        >
          <MdNotificationsActive /> الطلبات الجديدة <span className="font-mono">{newOrders.length}</span>
        </button>
      </div>
      {/* Orders Table */}
      <div className="overflow-x-auto rounded-xl shadow" style={CARD}>
        <table className="min-w-full text-center" style={{fontSize:"1.08rem", color:"#17427a"}}>
          <thead>
            <tr className="text-blue-900 text-sm" style={TABLE_HEAD}>
              <th className="py-2 px-3">رقم الطلب</th>
              <th className="py-2 px-3">الخدمة</th>
              <th className="py-2 px-3">العميل</th>
              <th className="py-2 px-3">الحالة</th>
              <th className="py-2 px-3">الموظف</th>
              <th className="py-2 px-3">منذ</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => {
              const client = clients[o.clientId];
              const service = services[o.serviceId];
              const assignedEmp = employees.find((e) => e.userId === o.assignedTo);
              const created = o.createdAt ? new Date(o.createdAt) : null;
              const minutesAgo = created ? Math.floor((new Date() - created) / 60000) : null;
              return (
                <tr key={o.requestId}
                  className="hover:bg-blue-50 transition border-b"
                  style={{cursor:"pointer"}}
                  onClick={() => setSelected(o)}
                >
                  <td className="font-mono font-bold text-blue-800">{o.requestId}</td>
                  <td className="text-blue-900 font-extrabold">{o.serviceName || service?.name || o.serviceId}</td>
                  <td>
                    <span
                      className="text-blue-700 font-bold underline hover:text-blue-900"
                      style={{cursor:"pointer"}}
                      onClick={e => { e.stopPropagation(); handleShowClientCard(client); }}
                    >
                      {client?.name || o.clientId}
                    </span>
                  </td>
                  <td>
                    <span className={
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border cursor-default " +
                      (STATUS[o.status]?.color || "bg-gray-100 text-gray-900 border-gray-400")
                    }>
                      <span>{STATUS[o.status]?.icon || "❓"}</span>
                      {STATUS[o.status]?.label || o.status}
                    </span>
                  </td>
                  <td className="text-blue-600 font-bold">{assignedEmp ? assignedEmp.name : (o.assignedTo || "-")}</td>
                  <td className="text-xs text-gray-700">{minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`}</td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-gray-400">
                  لا يوجد طلبات بهذه البيانات.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Modals */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          {renderOrderDetails(selected)}
        </div>
      )}
      {showClientCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="relative">
            {renderClientCard(showClientCard)}
          </div>
        </div>
      )}
      {renderNewSidebar()}
      {pendingStatus && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div style={GLASS} className="shadow-xl p-6 max-w-sm w-full relative flex flex-col items-center">
            <button className="absolute top-2 left-2 text-2xl" style={{cursor:"pointer"}} onClick={() => setPendingStatus(null)}>×</button>
            <div className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
              <span className={"inline-flex items-center gap-1 px-2 py-1 rounded border font-bold text-xs " + (STATUS[pendingStatus.newStatus]?.color || "bg-gray-100 text-gray-900 border-gray-400")}>
                <span>{STATUS[pendingStatus.newStatus]?.icon || "❓"}</span>
                {STATUS[pendingStatus.newStatus]?.label || pendingStatus.newStatus}
              </span>
              تغيير حالة الطلب
            </div>
            <div className="mb-3">هل أنت متأكد أنك تريد تعيين هذه الحالة للطلب؟ سيتم إرسال إشعار تلقائي للعميل.</div>
            <div className="flex gap-3 w-full">
              <button style={BTN} className="w-full" onClick={confirmChangeStatus}>تأكيد</button>
              <button style={{...BTN, background:"#f3f3f3", color:"#17427a"}} className="w-full" onClick={() => setPendingStatus(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      <audio ref={notifAudioRef} src="/sounds/new-order.mp3" preload="auto" />
      <style>
        {`
          ::-webkit-scrollbar { width: 6px; background: #e6f1fd; }
          ::-webkit-scrollbar-thumb { background: #b9dbfa; border-radius: 6px; }
          input, select, textarea {
            font-family: inherit;
            font-size:1rem;
            color: #17427a;
            background: #f7fbff;
          }
        `}
      </style>
    </div>
  );
}

export { MyOrdersSection };