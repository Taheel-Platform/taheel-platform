"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { FaBell } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { firestore } from "@/lib/firebase.client";
import { getDocs, query, collection, where, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";

export default function NotificationWidget({ userId, lang = "ar", darkMode = false }) {
  const [notifications, setNotifications] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [activeNotif, setActiveNotif] = useState(null);
  const menuRef = useRef();

  // جلب الإشعارات (كل إشعار أحدث من 15 يوم فقط)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const notifsSnap = await getDocs(
      query(collection(firestore, "notifications"), where("targetId", "==", userId))
    );
    // استخدم document id الحقيقي
    let clientNotifs = notifsSnap.docs.map(d => ({
      ...d.data(),
      notificationId: d.id
    }));
    const now = new Date();
    // فلترة للإشعارات الحديثة فقط
    const filtered = clientNotifs.filter(n => {
      if (!n.timestamp) return true;
      const notifDate = new Date(n.timestamp);
      return (now - notifDate) / (1000 * 60 * 60 * 24) <= 15;
    });
    // حذف إشعارات قديمة من الفايرستور (اختياري)
    for (const n of clientNotifs) {
      if (n.timestamp) {
        const notifDate = new Date(n.timestamp);
        if ((now - notifDate) / (1000 * 60 * 60 * 24) > 15 && n.notificationId) {
          try { await deleteDoc(doc(firestore, "notifications", n.notificationId)); } catch {}
        }
      }
    }
    filtered.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    setNotifications(filtered);
  }, [userId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // إغلاق المنيو عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setActiveNotif(null);
      }
    }
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // تمييز كمقروء وتحديث القائمة فوراً
  async function markNotifAsRead(notifId) {
    await updateDoc(doc(firestore, "notifications", notifId), { isRead: true });
    setNotifications(nots => nots.map(n =>
      n.notificationId === notifId ? { ...n, isRead: true } : n
    ));
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // حركة رنين الجرس يمين وشمال عند فتح المنيو فقط
  const bellVariants = {
    initial: { rotate: 0 },
    ringing: {
      rotate: [0, -30, 30, -25, 25, -15, 15, -7, 7, 0],
      transition: { duration: 0.9, ease: "easeInOut" }
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        type="button"
        className="relative flex items-center justify-center bg-transparent border-none p-0 m-0 focus:outline-none cursor-pointer"
        tabIndex={0}
        style={{ minWidth: 36, minHeight: 36 }}
        title={lang === "ar" ? "الإشعارات" : "Notifications"}
        onClick={() => setShowMenu(v => !v)}
        whileHover={{ scale: 1.18, filter: "brightness(1.15)" }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 250, damping: 18 }}
      >
        <motion.span
          variants={bellVariants}
          animate={showMenu ? "ringing" : "initial"}
          style={{ display: "inline-block" }}
        >
          <FaBell
            className={`text-[26px] sm:text-[28px] lg:text-[32px] ${darkMode ? "text-emerald-300" : "text-emerald-400"} drop-shadow-lg transition-all duration-150`}
            style={{ filter: "drop-shadow(0 2px 7px #10b98188)" }}
          />
        </motion.span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[11px] font-bold rounded-full px-[6px] py-[2px] shadow border-2 border-white/80">
            {unreadCount}
          </span>
        )}
      </motion.button>
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className={`absolute top-10 right-0 w-80 z-50 shadow-xl rounded-xl border ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"} p-4`}
            style={{ maxHeight: "340px", overflowY: "auto" }}
          >
            <div className="font-bold text-emerald-700 mb-3">{lang === "ar" ? "الإشعارات" : "Notifications"}</div>
            {notifications.length === 0 ? (
              <div className="text-gray-400 text-center">{lang === "ar" ? "لا توجد إشعارات خلال آخر 15 يوم" : "No notifications in last 15 days"}</div>
            ) : (
              <ul className="space-y-2">
                {notifications.map((notif, idx) => (
                  <li
                    key={notif.notificationId || idx}
                    className={`text-xs border-b pb-2 cursor-pointer transition-all
                      ${notif.isRead
                        ? "opacity-70 font-normal text-gray-600"
                        : "font-bold text-emerald-900"
                      }`}
                    onClick={async () => {
                      if (!notif.isRead) await markNotifAsRead(notif.notificationId);
                      setActiveNotif({ ...notif, isRead: true });
                    }}
                    title={notif.isRead ? "" : (lang === "ar" ? "اضغط لتمييز كمقروء وفتح التفاصيل" : "Mark as read and view details")}
                  >
                    <div className="font-bold text-emerald-600">{notif.title}</div>
                    <div className="text-gray-600">{notif.body}</div>
                    <div className="text-gray-400 text-[10px] mt-1">
                      {notif.timestamp ? new Date(notif.timestamp).toLocaleString(lang === "ar" ? "ar-EG" : "en-US") : ""}
                    </div>
                    {!notif.isRead && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{lang === "ar" ? "جديد" : "New"}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <AnimatePresence>
              {activeNotif && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/30`}
                  onClick={() => setActiveNotif(null)}
                  style={{ left: "0", top: "0" }}
                >
                  <div
                    className={`bg-white rounded-xl shadow-xl border p-6 relative max-w-md w-full text-gray-900`}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setActiveNotif(null)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-700 text-2xl px-2"
                    >
                      ×
                    </button>
                    <div className="font-bold text-emerald-700 mb-2">{activeNotif.title}</div>
                    <div className="text-gray-700 mb-3">{activeNotif.body}</div>
                    <div className="text-gray-500 text-xs">
                      {activeNotif.timestamp ? new Date(activeNotif.timestamp).toLocaleString(lang === "ar" ? "ar-EG" : "en-US") : ""}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}