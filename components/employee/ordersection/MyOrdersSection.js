"use client";
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
  MdNotificationsActive, MdPerson
} from "react-icons/md";
import {
  FaUserTie, FaUserAlt, FaBuilding, FaUserCheck, FaUserSlash
} from "react-icons/fa";

import ClientCard from "./ClientCard";
import OrderDetailsCard from "./OrderDetailsCard";

const glassStyle = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(14px)",
  borderRadius: "20px",
  border: "1.5px solid rgba(33,150,243,0.18)",
  boxShadow: "0 8px 32px 0 rgba(33,150,243,0.10)",
};
const tableGlass = {
  background: "rgba(255,255,255,0.32)",
  backdropFilter: "blur(8px)",
  borderRadius: "14px",
  border: "1px solid rgba(33,150,243,0.12)",
};
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
const btnHover = {
  background: "linear-gradient(90deg,#21cbf3,#2196f3)",
  boxShadow: "0 4px 24px rgba(33,203,243,0.14)",
};

const statusIcons = {
  new: "🆕",
  under_review: "🔎",
  government_processing: "🏛️",
  awaiting_payment: "💵",
  completed: "✅",
  rejected: "❌",
  pending_requirements: "📄",
  archived: "🗄️"
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
const typeTabs = [
  { key: "all", label: "الكل", icon: <MdPerson /> },
  { key: "resident", label: "المقيمين", icon: <FaUserCheck /> },
  { key: "nonResident", label: "غير المقيمين", icon: <FaUserSlash /> },
  { key: "company", label: "الشركات", icon: <FaBuilding /> },
  { key: "other", label: "أخرى", icon: <FaUserAlt /> }
];

function MyOrdersSection({ employeeData, lang = "ar" }) {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState({});
  const [employees, setEmployees] = useState({});
  const [employeeArr, setEmployeeArr] = useState([]);
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

  // جلب الطلبات
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, "requests"), snap => {
      const arr = [];
      snap.forEach(docSnap => {
        arr.push({ ...docSnap.data(), requestId: docSnap.id });
      });
      setOrders(arr);
    });
    return () => unsubOrders();
  }, []);

  // جلب المستخدمين والخدمات
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
      setEmployees(usersObj);
      setEmployeeArr(empArr);
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

  // صوت الإشعار للطلبات الجديدة
  useEffect(() => {
    if (notifAudioRef.current && lastNewOrdersCount !== null && newOrders.length > lastNewOrdersCount) {
      notifAudioRef.current.play();
    }
    setLastNewOrdersCount(newOrders.length);
  }, [orders]);

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

  const employeeProviders = Array.isArray(employeeData.providers) ? employeeData.providers : [];

  const newOrders = orders
    .filter(o =>
      (!o.assignedTo || o.assignedTo === "" || o.assignedTo === null)
      &&
      (Array.isArray(o.providers) && o.providers.some(p => employeeProviders.includes(p)))
    )
    .sort((a, b) => (a.createdAt || "") > (b.createdAt || "") ? 1 : -1);

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

  // ---- فتح كارت بيانات العميل ---
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

  // ---- فتح كارت تفاصيل الطلب ----
  const handleShowOrderDetails = (order) => {
    setSelected(order);
  };

  // ---- قبول طلب جديد ----
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

  // ---- إشعار تلقائي ----
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

  // ---- تغيير حالة الطلب ----
  async function confirmChangeStatus(pendingStatusArg) {
    const ps = pendingStatusArg || pendingStatus;
    if (!ps) return;
    const { order, newStatus, note } = ps;
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

  // ---- إشعار مخصص ----
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

  // ---- تحويل الطلب ----
  async function handleTransferOrder(order, empId) {
    await updateDoc(doc(db, "requests", order.requestId), {
      assignedTo: empId,
      lastUpdated: new Date().toISOString()
    });
    setSelected(null);
    alert("تم تحويل الطلب بنجاح!");
  }

  // ---- الشريط الجانبي للطلبات الجديدة ----
  function renderNewSidebar() {
    return (
      <div className={`fixed top-0 right-0 h-full z-50`} style={{...glassStyle, width:330, maxWidth:"100%", transition:"transform 0.3s", transform: newSidebarOpen ? "translateX(0)" : "translateX(100%)"}}>
        <div className="flex justify-between items-center p-4 border-b">
          <div className="text-lg font-bold text-blue-900 flex items-center gap-2"><MdNotificationsActive /> الطلبات الجديدة</div>
          <button className="text-2xl text-gray-400 hover:text-gray-700" style={{cursor:"pointer"}} onClick={() => setNewSidebarOpen(false)}>×</button>
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
            return (
              <div
                key={order.requestId}
                className="bg-blue-50 mb-3 rounded-lg p-3 shadow hover:bg-blue-100"
                style={{cursor:"pointer"}}
                onClick={() => { handleShowOrderDetails(order); setNewSidebarOpen(false); }}
              >
                <div className="font-bold text-blue-900">
                  {order.serviceName || service?.name || order.serviceId}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  رقم الطلب: {order.requestId}
                </div>
                <div className="text-xs text-gray-800 font-bold">
                  {client?.userId || order.clientId}
                </div>
                <div className="text-xs mt-1 text-gray-600 font-bold">
                  <span className="font-bold">منذ: </span>
                  {minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`}
                </div>
                <button
                  style={btnStyle}
                  onMouseOver={e=>Object.assign(e.target.style,btnHover)}
                  onMouseOut={e=>Object.assign(e.target.style,btnStyle)}
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

  // ---- الجدول الرئيسي ----
  return (
    <div style={{fontFamily:"Cairo,Tajawal,Segoe UI,Arial", background:"linear-gradient(135deg,#e3f0ff 0%,#c9e6ff 100%) min-h-screen"}} className="relative p-4 md:p-8">
      <div style={{...glassStyle, background:"rgba(210,234,255,0.8)", color: "#114477", padding: "12px", borderRadius: "18px", marginBottom: "18px", fontWeight: 700}}>
        <div className="text-lg font-bold mb-2">إدارة الطلبات</div>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {typeTabs.map((t) => (
          <button
            key={t.key}
            style={{
              ...btnStyle,
              background: tab === t.key ? "linear-gradient(90deg,#1976d2,#2196f3)" : "rgba(255,255,255,0.27)",
              color: tab === t.key ? "#fff" : "#1976d2",
              boxShadow: tab === t.key ? btnStyle.boxShadow : "none",
              borderBottom: tab === t.key ? "3px solid #1e88e5" : "1px solid #c3e0fa",
              fontWeight:"bold",
              cursor:"pointer",
              fontSize:"1rem"
            }}
            onClick={() => setTab(t.key)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {/* Counters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          style={{...btnStyle, background:statusFilter==="all"?"linear-gradient(90deg,#2196f3,#21cbf3)":"#e3f0ff", color:statusFilter==="all"?"#fff":"#1565c0", cursor:"pointer"}}
          onClick={() => setStatusFilter("all")}
        >
          الكل <span className="font-mono">{orders.length}</span>
        </button>
        {Object.keys(statusLabel).map((k) =>
          <button key={k}
            style={{...btnStyle, background:statusFilter===k?"linear-gradient(90deg,#2196f3,#21cbf3)":"#e3f0ff", color:statusFilter===k?"#fff":"#1565c0", cursor:"pointer"}}
            onClick={() => setStatusFilter(k)}
          >
            <span>{statusIcons[k]}</span>
            {statusLabel[k]}
            <span className="font-mono">{statusCounts[k] || 0}</span>
          </button>
        )}
      </div>
      {/* Search and New Orders */}
      <div className="flex items-center mb-4 gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="بحث برقم الطلب/العميل/الخدمة/الحالة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{fontSize:"1rem", minWidth:190}}
        />
        <button
          style={btnStyle}
          onMouseOver={e=>Object.assign(e.target.style,btnHover)}
          onMouseOut={e=>Object.assign(e.target.style,btnStyle)}
          onClick={() => setNewSidebarOpen(true)}
        >
          <MdNotificationsActive /> الطلبات الجديدة <span className="font-mono">{newOrders.length}</span>
        </button>
      </div>
      {/* Table */}
      <div className="overflow-x-auto rounded-xl shadow" style={tableGlass}>
        <table className="min-w-full text-center" style={{fontSize:"1.08rem", color:"#17427a"}}>
          <thead>
            <tr className="text-blue-900 text-sm" style={{background:"rgba(33,150,243,0.08)"}}>
              <th className="py-2 px-3">رقم الطلب</th>
              <th className="py-2 px-3">الخدمة</th>
              <th className="py-2 px-3">رقم العميل</th>
              <th className="py-2 px-3">الحالة</th>
              <th className="py-2 px-3">الموظف</th>
              <th className="py-2 px-3">منذ</th>
            </tr>
          </thead>
          <tbody>
  {filteredOrders.map((o) => {
    // ربط الطلب بالعميل من users عبر clientId
    const client = clients[o.clientId]; // o.clientId مثل RES-200-9180
    const service = services[o.serviceId];
    const assignedEmp = Object.values(employees).find(e => e.uid === o.assignedTo);
    const created = o.createdAt ? new Date(o.createdAt) : null;
    const minutesAgo = created ? Math.floor((new Date() - created) / 60000) : null;
    return (
      <tr key={o.requestId} className="hover:bg-blue-50 transition border-b">
        {/* رقم الطلب */}
        <td className="font-mono font-bold text-blue-800">
          <span
            className="underline cursor-pointer"
            onClick={() => handleShowOrderDetails(o)}
          >
            {o.requestId}
          </span>
        </td>
        {/* الخدمة */}
        <td className="text-blue-900 font-extrabold">
          {o.serviceName || service?.name || o.serviceId}
        </td>
        {/* رقم العميل */}
        <td>
          {client ? (
            <span
              className="text-blue-700 font-bold underline hover:text-blue-900"
              style={{cursor:"pointer"}}
              title={`عرض بيانات العميل ${client.userId}`}
              onClick={e => {
                e.stopPropagation();
                handleShowClientCard(client);
              }}
            >
              {client.userId}
            </span>
          ) : (
            <span className="text-gray-500">{o.clientId}</span>
          )}
        </td>
        {/* الحالة */}
        <td>
          <span className={
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border cursor-default " +
            (statusColor[o.status] || "bg-gray-100 text-gray-900 border-gray-400")
          }>
            <span>{statusIcons[o.status] || "❓"}</span>
            {statusLabel[o.status] || o.status}
          </span>
        </td>
        {/* الموظف */}
        <td className="text-blue-600 font-bold">
          {assignedEmp?.employeeNumber || assignedEmp?.userId || o.assignedTo || "-"}
        </td>
        {/* منذ */}
        <td className="text-xs text-gray-700">
          {minutesAgo < 60 ? `${minutesAgo} دقيقة` : `${Math.round(minutesAgo / 60)} ساعة`}
        </td>
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
      {/* Order Details Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <OrderDetailsCard
            order={selected}
            client={clients[selected.clientId]}
            service={services[selected.serviceId]}
            assignedEmp={
              Object.values(employees).find(e => e.uid === selected.assignedTo)
            }
            employees={employeeArr}
            onClose={() => setSelected(null)}
            onChangeStatus={confirmChangeStatus}
            onSendNotification={(order) => {
              setShowNotifModal(true);
              setSelected(order);
            }}
            onTransferOrder={handleTransferOrder}
          />
        </div>
      )}
      {/* Client Card Modal */}
      {showClientCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <ClientCard
            client={showClientCard}
            clientDocs={clientDocs}
            loadingDocs={loadingDocs}
            onClose={() => setShowClientCard(false)}
          />
        </div>
      )}
      {renderNewSidebar()}
      {/* إشعار مخصص */}
      {showNotifModal && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div style={glassStyle} className="shadow-xl p-6 max-w-xs w-full relative flex flex-col items-center">
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
              style={btnStyle}
              className="w-full"
              disabled={!notifContent.trim()}
              onClick={() => sendCustomNotification(selected, notifContent)}
            >
              <MdNotificationsActive /> إرسال الإشعار
            </button>
          </div>
        </div>
      )}
      <audio ref={notifAudioRef} src="/sounds/new-order.mp3" preload="auto" />
      <style>
        {`
          .glass-card::-webkit-scrollbar, .table-glass::-webkit-scrollbar {
            width: 6px;
            background: #e6f1fd;
          }
          .glass-card::-webkit-scrollbar-thumb, .table-glass::-webkit-scrollbar-thumb {
            background: #b9dbfa;
            border-radius: 6px;
          }
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

export default MyOrdersSection;