import { useEffect, useState, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";
import {
  MdClose, MdEmail, MdWhatsapp, MdNotificationsActive, MdOutlineChat,
  MdPerson, MdVolumeUp
} from "react-icons/md";
import {
  FaUserTie, FaUserAlt, FaBuilding, FaUserCheck, FaUserSlash
} from "react-icons/fa";
import ChatWidgetFull from "@/components/ChatWidgetFull";

const statusIcons = {
  new: "🆕",
  under_review: "🔎",
  government_processing: "🏛️",
  completed: "✅",
  rejected: "❌",
  pending_requirements: "📄",
  archived: "🗄️"
};
const statusLabel = {
  new: "جديد",
  under_review: "قيد المراجعة",
  government_processing: "قيد المعالجة الحكومية",
  completed: "مكتمل",
  rejected: "مرفوض",
  pending_requirements: "بانتظار مستندات",
  archived: "مؤرشف"
};
const statusColor = {
  new: "bg-sky-100 text-sky-800 border-sky-300",
  under_review: "bg-yellow-100 text-yellow-800 border-yellow-400",
  government_processing: "bg-indigo-100 text-indigo-900 border-indigo-400",
  completed: "bg-green-100 text-green-800 border-green-400",
  rejected: "bg-red-100 text-red-800 border-red-400",
  pending_requirements: "bg-orange-100 text-orange-800 border-orange-400",
  archived: "bg-gray-100 text-gray-700 border-gray-400"
};
const typeTabs = [
  { key: "all", label: "الكل", icon: <MdPerson /> },
  { key: "resident", label: "المقيمين", icon: <FaUserCheck /> },
  { key: "nonResident", label: "غير المقيمين", icon: <FaUserSlash /> },
  { key: "company", label: "الشركات", icon: <FaBuilding /> },
  { key: "other", label: "أخرى", icon: <FaUserAlt /> }
];

// --------- بيانات الموظف الحالي (يفضل جلبها من السياق أو Auth) ----------
const currentEmployee = {
  userId: typeof window !== "undefined" && window.localStorage
    ? window.localStorage.getItem("userId") || "EMP1"
    : "EMP1",
  name: typeof window !== "undefined" && window.localStorage
    ? window.localStorage.getItem("userName") || "موظف"
    : "موظف"
};

export default function OrdersSection({ lang = "ar" }) {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState({});
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState({});
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showClientCard, setShowClientCard] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [newSidebarOpen, setNewSidebarOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifContent, setNotifContent] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatPreview, setChatPreview] = useState({});
  const [playNotif, setPlayNotif] = useState(false);
  const notifAudioRef = useRef();

  // جلب الطلبات والعملاء والخدمات والموظفين من Firestore
  useEffect(() => {
    // الطلبات
    const unsubOrders = onSnapshot(collection(db, "requests"), snap => {
      const arr = [];
      snap.forEach(docSnap => arr.push({ ...docSnap.data(), requestId: docSnap.id }));
      setOrders(arr);
    });

    // العملاء والموظفين
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

    // الخدمات (تفكيك الهيكل إذا كان nested)
    const unsubServices = onSnapshot(collection(db, "servicesByClientType"), async (snap) => {
      // Firestore لا يدعم nested subcollections مباشرة مثل RTDB
      // يمكنك هنا جلب كل الخدمات لكل نوع عميل
      const flat = {};
      for (const docSnap of snap.docs) {
        const data = docSnap.data(); // نوع عميل: {serviceId: {...}, ...}
        Object.entries(data).forEach(([sid, s]) => {
          flat[sid] = { ...s, type: docSnap.id, id: sid };
        });
      }
      setServices(flat);
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubServices();
    };
  }, []);

  // جلب معاينة الشات للطلبات الجديدة + صوت إشعار (تحتاج تعديل حسب نظام الشات لديك)
  useEffect(() => {
    // هنا يمكنك تركها فارغة أو ربطها مع Firestore حسب هيكلة الشات لديك (مثلاً collection(chatRooms) => subcollection(messages))
    // setChatPreview({...});
    // setPlayNotif(true); // إذا أردت تشغيل صوت عند وصول طلب جديد
  }, [orders.length]);

  useEffect(() => {
    if (playNotif && notifAudioRef.current) {
      notifAudioRef.current.play();
      setPlayNotif(false);
    }
  }, [playNotif]);

  function getOrderType(clientId) {
    if (!clientId) return "other";
    if (clientId.startsWith("RES-")) return "resident";
    if (clientId.startsWith("NON-")) return "nonResident";
    if (clientId.startsWith("COM-")) return "company";
    return "other";
  }

  // عدادات الحالات
  const statusCounts = {};
  orders.forEach((o) => {
    const s = o.status || "new";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  // الفلترة الرئيسية
  let filteredOrders = orders.filter((o) => {
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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return searchText.includes(search.toLowerCase());
  });
  filteredOrders = filteredOrders.sort((a, b) =>
    (a.createdAt || "") > (b.createdAt || "") ? 1 : -1
  );
  const newOrders = orders
    .filter((o) => (o.status || "new") === "new")
    .sort((a, b) => (a.createdAt || "") > (b.createdAt || "") ? 1 : -1);

  // إشعار تلقائي عند تغيير الحالة
  async function sendAutoNotification(order, newStatus) {
    const client = clients[order.clientId];
    if (!client) return;
    const statusMsg = `تم تحديث حالة طلبك (${order.trackingNumber || order.requestId}) إلى: ${statusLabel[newStatus]}`;
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
        updatedBy: currentEmployee.name,
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

  async function handleAssign(order, empId) {
  const employee = employees.find(e => e.userId === empId);
  if (!employee) return;

  await updateDoc(doc(db, "requests", order.requestId), {
  assignedTo: employee.userId,          // 👈 رقم الموظف وليس الاسم
  assignedToName: employee.name || "",  // (اختياري للعرض فقط)
  lastUpdated: new Date().toISOString()
});

  setAssignModal(false);
  setSelected((s) =>
    s && s.requestId === order.requestId
      ? { ...s, assignedTo: empId, assignedToName: employee.name }
      : s
  );
}


  // إشعار مخصص
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
  }

  function renderClientCard(client) {
    if (!client) return null;
    return (
      <div className="p-5 rounded-2xl bg-white shadow-xl border w-full max-w-lg relative">
        <button className="absolute top-2 left-2 text-2xl text-gray-400 hover:text-gray-900 font-bold cursor-pointer" onClick={() => setShowClientCard(false)}>
          <MdClose />
        </button>
        <div className="flex flex-col items-center">
          <img
            src={client.profilePic || "/default-avatar.png"}
            alt={client.name}
            className="w-24 h-24 rounded-full border-4 border-emerald-100 shadow mb-2 object-cover"
          />
          <div className="text-xl font-extrabold text-emerald-800 drop-shadow" style={{textShadow: "0 1px 0 #fff, 0 1px 2px #555"}}>
            {client.name}
          </div>
          <div className="text-gray-700 font-mono font-semibold">{client.userId}</div>
          <div className="mt-2 mb-1 flex flex-wrap justify-center gap-2 text-base font-semibold">
            <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded">{client.email}</span>
            <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded">{client.phone}</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-bold text-gray-800 mb-1">مرفقات العميل:</div>
          {(client.documents && client.documents.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {client.documents.map((doc, i) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="bg-gray-100 px-3 py-1 rounded text-emerald-800 font-bold text-xs hover:bg-emerald-50 border cursor-pointer"
                >
                  {doc.type}
                </a>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-xs">لا يوجد مرفقات</div>
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
    <div
      className="
        fixed inset-0 bg-black/40 flex items-center justify-center z-50
      "
      style={{padding: "20px", boxSizing: "border-box"}}
    >
      <div
        className="
          bg-white rounded-2xl shadow-2xl border max-w-[760px] w-full
          flex flex-col md:flex-row gap-4 md:gap-6 items-stretch
          p-0 overflow-auto
        "
        style={{
          minHeight: "60vh",
          maxHeight: "90vh",
        }}
      >
        {/* الكارت الجانبي للعميل */}
        <div
          className="
            flex-none bg-white p-4 md:p-6 border-r md:min-w-[280px] md:max-w-[320px]
            flex flex-col items-center justify-center
            rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none
            shadow-none border-b md:border-b-0
          "
          style={{minWidth: 0}}
        >
          {/* كارت العميل */}
          {renderClientCard(client)}
        </div>

        {/* باقي تفاصيل الطلب */}
        <div
          className="flex-1 flex flex-col gap-4 text-base text-gray-900 font-semibold p-4 md:p-6 overflow-auto"
          style={{minWidth: 0}}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={"inline-flex items-center gap-1 px-2 py-1 rounded border font-bold text-xs " + (statusColor[order.status] || "bg-gray-100 text-gray-900 border-gray-400")}>
              {statusIcons[order.status] || "❓"} {statusLabel[order.status] || order.status}
            </div>
            <button className="text-2xl text-gray-400 hover:text-gray-900 font-bold cursor-pointer" onClick={() => setSelected(null)}>
              <MdClose />
            </button>
          </div>
          <div className="font-extrabold text-emerald-800 text-lg mb-2">{service?.name || service?.name_en || order.serviceId}</div>
          <div>
            <span className="font-bold text-gray-700">رقم الطلب:</span>{" "}
            <span className="font-mono text-indigo-700 font-bold">{order.trackingNumber || order.requestId}</span>
          </div>
          {/* عرض المرفقات */}
          {(order.fileUrl || (Array.isArray(order.attachments) && order.attachments.length > 0)) && (
            <div>
              <span className="font-bold text-gray-700">المرفقات:</span>
              <ul className="list-disc ml-6">
                {Array.isArray(order.attachments) && order.attachments.length > 0 ? (
                  order.attachments.map((att, i) => (
                    <li key={i}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline font-bold"
                        download={att.name}
                      >
                        {att.name || `مرفق ${i + 1}`}
                      </a>
                    </li>
                  ))
                ) : (
                  <li>
                    <a
                      href={order.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline font-bold"
                      download={order.fileName}
                    >
                      {order.fileName || "تحميل المستند"}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
          <div>
            <span className="font-bold text-gray-700">الموظف الحالي:</span>{" "}
            <span className="inline-flex items-center gap-1">
              <FaUserTie className="text-indigo-600" />
              {assignedEmp ? assignedEmp.name : (order.assignedTo || "غير معين")}
            </span>
          </div>
          <div>
            <span className="font-bold text-gray-700">المبلغ:</span> <span className="text-green-700">{order.paidAmount} درهم</span>
          </div>
          <div>
            <span className="font-bold text-gray-700">وقت الطلب:</span>{" "}
            {created ? created.toLocaleString("ar-EG") + ` (${minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`} مضت)` : "-"}
          </div>
          {notes && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded text-yellow-700 font-semibold">
              <span className="font-bold">ملاحظة الموظف:</span>
              <div>{notes}</div>
            </div>
          )}
          {/* تواصل مع العميل */}
          <div className="flex flex-wrap gap-2 items-center mt-2">
            <span className="font-bold text-gray-800">تواصل مع العميل:</span>
            <button className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1 rounded shadow cursor-pointer"
              onClick={() => setShowChat(!showChat)}
              disabled={!client?.userId}
              style={{cursor: client?.userId ? "pointer" : "not-allowed"}}>
              <MdOutlineChat /> شات داخلي
            </button>
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1 rounded shadow cursor-pointer"
              >
                <MdWhatsapp /> واتساب
              </a>
            )}
            {mailtoLink && (
              <a href={mailtoLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 py-1 rounded shadow cursor-pointer"
              >
                <MdEmail /> إرسال إيميل
              </a>
            )}
            <button className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-3 py-1 rounded shadow cursor-pointer"
              onClick={() => setShowNotifModal(true)}>
              <MdNotificationsActive /> إشعار مخصص
            </button>
          </div>
          {/* الشات الداخلى (الموظف كطرف مرسل) */}
          {showChat && client?.userId && (
            <div className="mt-4 border rounded-xl bg-gray-50 p-2 shadow-inner">
              <ChatWidgetFull
                userId={currentEmployee.userId}
                userName={currentEmployee.name}
                roomId={client.userId}
              />
            </div>
          )}
          {/* تغيير حالة الطلب */}
          <form
            onSubmit={e => {
              e.preventDefault();
              const status = e.target.status.value;
              const note = e.target.note.value;
              setPendingStatus({order, newStatus: status, note});
            }}
            className="flex flex-col gap-2 mt-3"
          >
            <label className="font-bold text-gray-800">تغيير الحالة:</label>
            <select name="status" defaultValue={order.status} className="border rounded px-2 py-1 cursor-pointer focus:ring-2 focus:ring-emerald-500">
              {Object.keys(statusLabel).map((k) => (
                <option key={k} value={k}>
                  {statusIcons[k]} {statusLabel[k]}
                </option>
              ))}
            </select>
            <input type="text" name="note" className="border rounded px-2 py-1" placeholder="ملاحظة الموظف (اختياري)" />
            <button type="submit" className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500 text-white px-5 py-2 rounded font-bold shadow cursor-pointer transition-all">
              <MdNotificationsActive /> حفظ الحالة وإشعار العميل
            </button>
          </form>
          <div className="mt-4">
            <button
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-400 hover:from-indigo-700 hover:to-indigo-500 text-white px-5 py-2 rounded font-bold shadow cursor-pointer transition-all"
              onClick={() => setAssignModal(true)}
            >
              <FaUserTie /> تصدير الطلب لموظف آخر
            </button>
            </div>
          </div>
        </div>
        {/* مودال اختيار الموظف */}
        {assignModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative border border-emerald-200">
      <button
        className="absolute top-2 left-2 text-2xl font-bold text-gray-700 hover:text-emerald-800 transition"
        onClick={() => setAssignModal(false)}>
        ×
      </button>
      <div className="font-bold mb-3 text-emerald-800 flex items-center gap-2 text-lg">
        <FaUserTie className="text-indigo-600" /> اختر الموظف
      </div>
      <select
        className="border-2 border-emerald-200 rounded w-full px-3 py-2 mb-3 cursor-pointer text-gray-900 font-bold bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300"
        value={assignTo}
        onChange={e => setAssignTo(e.target.value)}
      >
        <option value="">اختر الموظف</option>
        {employees.map(e => (
          <option value={e.userId} key={e.userId}>{e.name}</option>
        ))}
      </select>
      <button
        className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded font-bold w-full cursor-pointer mb-2 transition"
        disabled={!assignTo}
        onClick={() => handleAssign(order, assignTo)}
      >
        تحويل الطلب
      </button>
      <button
        className="absolute top-2 right-2 text-2xl font-bold text-gray-400 hover:text-red-500 cursor-pointer transition"
        onClick={() => setAssignModal(false)}>
        <MdClose />
      </button>
    </div>
  </div>
)}
        {/* إشعار مخصص */}
        {showNotifModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative">
              <button className="absolute top-2 left-2 text-2xl cursor-pointer" onClick={() => setShowNotifModal(false)}>×</button>
              <div className="font-bold mb-3 text-emerald-700 flex items-center gap-2"><MdNotificationsActive /> إرسال إشعار للعميل</div>
              <textarea
                className="border rounded w-full px-3 py-2 mb-3"
                rows={3}
                placeholder="محتوى الإشعار..."
                value={notifContent}
                onChange={e => setNotifContent(e.target.value)}
              />
              <button
                className="bg-yellow-600 text-white px-4 py-2 rounded font-bold w-full cursor-pointer"
                disabled={!notifContent}
                onClick={() => sendCustomNotification(order, notifContent)}
              >
                إرسال الإشعار
              </button>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-900 text-2xl font-bold cursor-pointer" onClick={() => setShowNotifModal(false)}>
                <MdClose />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderNewSidebar() {
    return (
      <div className={`fixed top-0 right-0 h-full z-50 bg-white border-l shadow-lg w-[330px] max-w-full transition-transform duration-300 ${newSidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex justify-between items-center p-4 border-b">
          <div className="text-lg font-bold text-emerald-900 flex items-center gap-2"><MdNotificationsActive /> الطلبات الجديدة</div>
          <button className="text-2xl text-gray-400 hover:text-gray-700 cursor-pointer" onClick={() => setNewSidebarOpen(false)}>×</button>
        </div>
        <div className="p-3 overflow-y-auto h-[calc(100%-60px)]">
          {newOrders.length === 0 && (
            <div className="text-center text-gray-400 mt-6">لا يوجد طلبات جديدة</div>
          )}
          {newOrders.map((order) => {
            const client = clients[order.clientId];
            const service = services[order.serviceId];
            const created = order.createdAt ? new Date(order.createdAt) : null;
            const minutesAgo = created ? Math.floor((new Date() - created) / 60000) : null;
            const chatMsg = chatPreview[order.requestId];
            return (
              <div
                key={order.requestId}
                className="bg-emerald-50 mb-3 rounded-lg p-3 shadow hover:bg-emerald-100 cursor-pointer"
                onClick={() => { setSelected(order); setNewSidebarOpen(false); }}
              >
                <div className="font-bold text-emerald-900">{service?.name || order.serviceId}</div>
                <div className="text-xs text-gray-800 font-bold">{client?.name || order.clientId}</div>
                <div className="text-xs text-gray-500 font-mono">{order.trackingNumber || order.requestId}</div>
                <div className="text-xs mt-1 text-gray-600 font-bold">
                  <span className="font-bold">منذ: </span>
                  {minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`}
                </div>
                {/* معاينة الشات */}
                {chatMsg && (
                  <div className="mt-2 flex items-center gap-1 text-xs bg-white rounded px-2 py-1 border border-emerald-100 shadow">
                    <MdOutlineChat className="text-emerald-600" />
                    <span className="font-semibold text-gray-800">{chatMsg.text}</span>
                    <span className="text-gray-400 font-mono ml-1">{chatMsg.senderName ? `(${chatMsg.senderName})` : ""}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <audio ref={notifAudioRef} src="/sounds/new-order.mp3" preload="auto" />
        {/* ضع ملف صوتي باسم new-order.mp3 داخل public/sounds */}
      </div>
    );
  }

  return (
    <div className="relative p-4 md:p-8">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {typeTabs.map((t) => (
          <button
            key={t.key}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-t-lg border-b-2 transition cursor-pointer ${
              tab === t.key
                ? "border-emerald-700 text-emerald-900 bg-white shadow"
                : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-emerald-50"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {/* عدادات الحالات */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          className={`rounded px-3 py-1 font-bold shadow transition flex items-center gap-1 cursor-pointer ${statusFilter === "all" ? "bg-emerald-700 text-white" : "bg-gray-100 text-emerald-900"}`}
          onClick={() => setStatusFilter("all")}
        >
          الكل <span className="font-mono">{orders.length}</span>
        </button>
        {Object.keys(statusLabel).map((k) =>
          <button key={k}
            className={`rounded px-3 py-1 font-bold shadow transition flex items-center gap-1 cursor-pointer ${statusFilter === k ? "bg-emerald-700 text-white" : "bg-gray-100 text-emerald-900"}`}
            onClick={() => setStatusFilter(k)}
          >
            <span>{statusIcons[k]}</span>
            {statusLabel[k]}
            <span className="font-mono">{statusCounts[k] || 0}</span>
          </button>
        )}
      </div>
      {/* بحث */}
      <div className="flex items-center mb-4 gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="بحث برقم الطلب/العميل/الخدمة/الحالة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-bold shadow transition cursor-pointer"
          onClick={() => setNewSidebarOpen(true)}
        >
          <MdNotificationsActive /> الطلبات الجديدة <span className="font-mono">{newOrders.length}</span>
        </button>
        {/* زر كتم/تشغيل الصوت للطلبات الجديدة */}
        <button
          className="ml-2 flex items-center gap-1 bg-white border border-yellow-300 hover:bg-yellow-50 text-yellow-700 px-3 py-2 rounded shadow transition cursor-pointer"
          onClick={() => { if (notifAudioRef.current) notifAudioRef.current.play(); }}
          title="تشغيل صوت الإشعار"
        >
          <MdVolumeUp /> صوت إشعار
        </button>
      </div>
      {/* جدول الطلبات */}
      <div className="overflow-x-auto rounded-xl shadow bg-white/90">
        <table className="min-w-full text-center">
          <thead>
            <tr className="bg-emerald-50 text-emerald-900 text-sm">
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
                  className="hover:bg-emerald-50 transition border-b cursor-pointer"
                  onClick={() => setSelected(o)}
                >
                  <td className="font-mono font-bold text-indigo-800">{o.trackingNumber || o.requestId}</td>
                  <td className="text-emerald-900 font-extrabold">{service?.name || o.serviceId}</td>
                  <td>
                    <span
                      className="text-emerald-700 font-bold underline hover:text-emerald-900 cursor-pointer"
                      onClick={e => { e.stopPropagation(); setShowClientCard(client); }}
                    >
                      {client?.name || o.clientId}
                    </span>
                  </td>
                  <td>
                    <span className={
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border cursor-default " +
                      (statusColor[o.status] || "bg-gray-100 text-gray-900 border-gray-400")
                    }>
                      <span>{statusIcons[o.status] || "❓"}</span>
                      {statusLabel[o.status] || o.status}
                    </span>
                  </td>
                  <td className="text-indigo-600 font-bold">{assignedEmp ? assignedEmp.name : (o.assignedTo || "-")}</td>
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
      {/* تفاصيل الطلب */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          {renderOrderDetails(selected)}
        </div>
      )}
      {/* كارت العميل */}
      {showClientCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="relative">
            {renderClientCard(showClientCard)}
          </div>
        </div>
      )}
      {/* Sidebar الطلبات الجديدة */}
      {renderNewSidebar()}

      {/* تأكيد تغيير الحالة */}
      {pendingStatus && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative flex flex-col items-center">
            <button className="absolute top-2 left-2 text-2xl cursor-pointer" onClick={() => setPendingStatus(null)}>×</button>
            <div className="text-lg font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <span className={"inline-flex items-center gap-1 px-2 py-1 rounded border font-bold text-xs " + (statusColor[pendingStatus.newStatus] || "bg-gray-100 text-gray-900 border-gray-400")}>
                <span>{statusIcons[pendingStatus.newStatus] || "❓"}</span>
                {statusLabel[pendingStatus.newStatus] || pendingStatus.newStatus}
              </span>
              تغيير حالة الطلب
            </div>
            <div className="mb-3">هل أنت متأكد أنك تريد تعيين هذه الحالة للطلب؟ سيتم إرسال إشعار تلقائي للعميل.</div>
            <div className="flex gap-3 w-full">
              <button className="bg-emerald-700 text-white px-4 py-2 rounded font-bold w-full cursor-pointer" onClick={confirmChangeStatus}>تأكيد</button>
              <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-bold w-full cursor-pointer" onClick={() => setPendingStatus(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}