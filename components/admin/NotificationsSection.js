"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";

export default function NotificationsSection({ lang = "ar" }) {
  const [notifications, setNotifications] = useState([]);
  const [clients, setClients] = useState([]);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [loading, setLoading] = useState(false);

  // فلترة الإشعارات
  const [notifTypeFilter, setNotifTypeFilter] = useState("all"); // all, general, custom
  const [notifSearch, setNotifSearch] = useState("");
  // فلترة العملاء
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      const notifSnap = await getDocs(collection(db, "notifications"));
      const notifs = [];
      notifSnap.forEach(doc => notifs.push({ ...doc.data(), id: doc.id }));
      setNotifications(notifs.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)));

      const usersSnap = await getDocs(collection(db, "users"));
      const users = [];
      usersSnap.forEach(doc => users.push({ ...doc.data(), userId: doc.id }));
      setClients(users);
    }
    fetchData();
  }, []);

  async function sendNotification() {
    if (!message) return;
    setLoading(true);
    await addDoc(collection(db, "notifications"), {
      title: lang === "ar" ? "إشعار جديد" : "New Notification",
      body: message,
      targetId: target === "all" ? "all" : target,
      timestamp: serverTimestamp(),
      type: target === "all" ? "general" : "custom"
    });
    setMessage("");
    setTarget("all");
    setLoading(false);
    // تحديث القائمة
    const notifSnap = await getDocs(collection(db, "notifications"));
    const notifs = [];
    notifSnap.forEach(doc => notifs.push({ ...doc.data(), id: doc.id }));
    setNotifications(notifs.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)));
  }

  // أزرار الواتساب والإيميل
  function WhatsAppButton(client) {
    if (!client.phone) return null;
    const phone = client.phone.replace(/^0/, "+2"); // عدل حسب كود بلدك
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(lang === "ar" ? "مرحباً، لديك إشعار جديد من النظام." : "Hello, you have a new notification from the system.")}`;
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="mx-1">
        <span role="img" aria-label="WhatsApp" className="text-green-600 text-xl">📱</span>
      </a>
    );
  }
  function EmailButton(client) {
    if (!client.email) return null;
    const subject = encodeURIComponent(lang === "ar" ? "إشعار جديد" : "New Notification");
    const body = encodeURIComponent(lang === "ar" ? "مرحباً، لديك إشعار جديد من النظام." : "Hello, you have a new notification from the system.");
    const link = `mailto:${client.email}?subject=${subject}&body=${body}`;
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" title="Email" className="mx-1">
        <span role="img" aria-label="Email" className="text-blue-600 text-xl">✉️</span>
      </a>
    );
  }

  // فلترة الإشعارات حسب النوع/النص/العميل
  const filteredNotifications = notifications.filter(n => {
    if (notifTypeFilter !== "all" && n.type !== notifTypeFilter) return false;
    let match = true;
    if (notifSearch.trim()) {
      const client = clients.find(c => c.userId === n.targetId);
      const name = client?.name || "";
      const phone = client?.phone || "";
      const searchText = notifSearch.toLowerCase();
      match =
        (n.body?.toLowerCase().includes(searchText)) ||
        (name.toLowerCase().includes(searchText)) ||
        (phone.includes(searchText));
    }
    return match;
  });

  // فلترة العملاء
  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const searchText = clientSearch.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(searchText)) ||
      (c.phone && c.phone.includes(searchText)) ||
      (c.email && c.email.toLowerCase().includes(searchText))
    );
  });

  return (
    <div className="bg-white/90 rounded-xl shadow p-8 max-w-5xl mx-auto">
      <div className="text-2xl font-bold text-yellow-700 mb-6 text-center">
        {lang === "ar" ? "الإشعارات" : "Notifications"}
      </div>

      {/* نموذج إرسال إشعار */}
      <form onSubmit={e => { e.preventDefault(); sendNotification(); }} className="bg-yellow-50 rounded-lg p-4 flex flex-col md:flex-row gap-2 items-center mb-8 shadow">
        <textarea
          className="w-full p-2 rounded border border-yellow-300 focus:outline-yellow-400 text-gray-900"
          placeholder={lang === "ar" ? "اكتب نص الإشعار..." : "Write notification message..."}
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={1}
        />
        <select
          className="p-2 rounded border border-yellow-300 bg-white text-gray-900"
          value={target}
          onChange={e => setTarget(e.target.value)}
        >
          <option value="all">{lang === "ar" ? "كل العملاء" : "All Clients"}</option>
          {clients.map(cl => (
            <option value={cl.userId} key={cl.userId}>{cl.name} ({cl.phone})</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !message}
          className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-800 text-white font-bold shadow"
        >
          {lang === "ar" ? "إرسال إشعار" : "Send Notification"}
        </button>
      </form>

      {/* أدوات الفلترة */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 items-center">
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded ${notifTypeFilter === "all" ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-700 border border-yellow-300"} font-semibold`}
            onClick={() => setNotifTypeFilter("all")}
          >{lang === "ar" ? "الكل" : "All"}</button>
          <button
            className={`px-3 py-1 rounded ${notifTypeFilter === "general" ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-700 border border-yellow-300"} font-semibold`}
            onClick={() => setNotifTypeFilter("general")}
          >{lang === "ar" ? "عام" : "General"}</button>
          <button
            className={`px-3 py-1 rounded ${notifTypeFilter === "custom" ? "bg-yellow-600 text-white" : "bg-yellow-100 text-yellow-700 border border-yellow-300"} font-semibold`}
            onClick={() => setNotifTypeFilter("custom")}
          >{lang === "ar" ? "مخصص" : "Custom"}</button>
        </div>
        <input
          className="p-2 rounded border border-yellow-300 flex-1 min-w-[150px]"
          placeholder={lang === "ar" ? "بحث في الإشعارات أو العملاء..." : "Search notifications or clients..."}
          value={notifSearch}
          onChange={e => setNotifSearch(e.target.value)}
        />
      </div>

      {/* عرض قائمة الإشعارات */}
      <div className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-center border rounded-lg bg-white">
            <thead className="bg-yellow-100 text-yellow-800">
              <tr>
                <th className="py-2 px-2">{lang === "ar" ? "النص" : "Message"}</th>
                <th className="py-2 px-2">{lang === "ar" ? "النوع" : "Type"}</th>
                <th className="py-2 px-2">{lang === "ar" ? "إلى" : "To"}</th>
                <th className="py-2 px-2">{lang === "ar" ? "التاريخ" : "Date"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.map(n => (
                <tr key={n.id} className="border-b hover:bg-yellow-50 transition">
                  <td className="py-2 px-2 text-gray-900">{n.body}</td>
                  <td className="py-2 px-2">
                    {n.type === "general" ? (lang === "ar" ? "عام" : "General") : (lang === "ar" ? "مخصص" : "Custom")}
                  </td>
                  <td className="py-2 px-2 text-gray-900">
                    {n.targetId === "all"
                      ? (lang === "ar" ? "كل العملاء" : "All Clients")
                      : (() => {
                        const t = clients.find(c => c.userId === n.targetId);
                        return t
                          ? (
                            <span className="flex items-center justify-center gap-1">
                              <span>{t.name}</span>
                              {WhatsAppButton(t)}
                              {EmailButton(t)}
                            </span>
                          )
                          : n.targetId;
                      })()
                    }
                  </td>
                  <td className="py-2 px-2 text-gray-700 text-xs">
                    {n.timestamp?.toDate?.().toLocaleString() || ""}
                  </td>
                </tr>
              ))}
              {filteredNotifications.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-gray-400">{lang === "ar" ? "لا يوجد إشعارات" : "No notifications"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* قائمة العملاء وزر إرسال واتس/إيميل مع بحث */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-semibold text-yellow-700">{lang === "ar" ? "العملاء" : "Clients"}</span>
          <input
            className="p-1.5 rounded border border-yellow-300 min-w-[150px]"
            placeholder={lang === "ar" ? "بحث بالاسم أو الهاتف أو الإيميل..." : "Search by name, phone or email..."}
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            style={{direction: lang === "ar" ? "rtl" : "ltr"}}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredClients.map(client => (
            <div key={client.userId} className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div>
                <div className="font-bold text-gray-900">{client.name}</div>
                <div className="text-sm text-gray-600">{client.phone} | {client.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {WhatsAppButton(client)}
                {EmailButton(client)}
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="text-gray-400 text-center col-span-2">{lang === "ar" ? "لا يوجد عملاء" : "No clients found"}</div>
          )}
        </div>
      </div>
    </div>
  );
}