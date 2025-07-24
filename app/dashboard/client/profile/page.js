"use client";
import { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaSignOutAlt, FaBell, FaCoins, FaEnvelopeOpenText, FaWallet, FaWhatsapp, FaComments,
  FaUser, FaBuilding, FaUserTie, FaTag
} from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import WeatherTimeWidget from "@/components/WeatherTimeWidget";
import { ResidentCard } from "@/components/cards/ResidentCard";
import CompanyCardGold from "@/components/cards/CompanyCard";
import ChatWidgetFull from "@/components/ChatWidgetFull";
import { NonResidentCard } from "@/components/cards/NonResidentCard";
import ServiceProfileCard from "@/components/ServiceProfileCard";
import ClientOrdersTracking from "@/components/ClientOrdersTracking";
import { firestore } from "@/lib/firebase.client";
import { signOut } from "firebase/auth";
import { GlobalLoader } from "@/components/GlobalLoader";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy
} from "firebase/firestore";

export const dynamic = 'force-dynamic';

function getDayGreeting(lang = "ar") {
  const hour = new Date().getHours();
  if (lang === "ar") {
    if (hour >= 0 && hour < 12) return "صباح الخير";
    // من 12 الظهر لـ 6 المغرب
    if (hour >= 12 && hour < 18) return "مساء الخير";
    // من 6 المغرب لفجر اليوم التالي
    return "مساء الخير";
  } else {
    if (hour >= 0 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  }
}

function getWelcome(name, lang = "ar") {
  if (lang === "ar") {
    return `مرحباً ${name || ""}`;
  } else {
    return `Welcome, ${name || ""}`;
  }
}

function SectionTitle({ icon, color = "emerald", children }) {
  const iconMap = {
    resident: <FaUser className={`text-emerald-500`} />,
    company: <FaBuilding className={`text-blue-500`} />,
    nonresident: <FaUserTie className={`text-yellow-500`} />,
    other: <FaTag className="text-gray-500" />,
  };
  return (
    <div className="w-full flex items-center my-10 select-none">
      <div className={`flex-1 h-px bg-gradient-to-l from-${color}-300 via-${color}-100 to-transparent`} />
      <span className={`flex items-center gap-2 px-4 py-1 bg-white/80 rounded-full shadow text-${color}-900 font-extrabold text-lg border border-${color}-100`}>
        {iconMap[icon]} {children}
      </span>
      <div className={`flex-1 h-px bg-gradient-to-r from-${color}-300 via-${color}-100 to-transparent`} />
    </div>
  );
}

// دالة عامة لإضافة إشعار (Firestore فقط)
async function addNotification(userId, title, body, type = "wallet") {
  const notif = {
    notificationId: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    targetId: userId,
    title,
    body,
    isRead: false,
    type,
    timestamp: new Date().toISOString()
  };
  await setDoc(doc(firestore, "notifications", notif.notificationId), notif);
}

function ClientProfilePageInner({ userId }) {
  
  const [lang, setLang] = useState("ar");
  const [openChat, setOpenChat] = useState(false);

  // States for data from database
  const [client, setClient] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [services, setServices] = useState({ resident: [], nonresident: [], company: [], other: [] });
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Popups for header icons
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showCoinsMenu, setShowCoinsMenu] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showMessagesMenu, setShowMessagesMenu] = useState(false);

  // محرك بحث للخدمات (ينطبق على كل الأقسام)
  const [search, setSearch] = useState("");

  // refs for closing popups when clicking outside
  const notifRef = useRef();
  const coinsRef = useRef();
  const walletRef = useRef();
  const messagesRef = useRef();

  // لإجبار إعادة تحميل بيانات العميل بعد الدفع (الكاش باك)
  const [reloadClient, setReloadClient] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. جلب العميل الحالي
      const userDoc = await getDoc(doc(firestore, "users", userId));
      const user = userDoc.exists() ? userDoc.data() : null;
      setClient(user);

      // 2. جلب الشركات المرتبطة بالعميل (لو النوع مقيم فقط)
      let relatedCompanies = [];
      if (user?.type === "resident" && user?.userId) {
        const companiesSnap = await getDocs(
          query(
            collection(firestore, "users"),
            where("type", "==", "company"),
            where("owner", "in", [user.name, user.userId])
          )
        );
        relatedCompanies = companiesSnap.docs.map(doc => doc.data());
      }
      setCompanies(relatedCompanies);

      // 3. جلب كل الخدمات (التصحيح هنا)
      const servicesSnap = await getDocs(collection(firestore, "services"));
      let arr = [];
      servicesSnap.forEach(doc => arr.push({ ...doc.data(), id: doc.id }));

      let servicesByType = {
        resident: [],
        nonresident: [],
        company: [],
        other: [],
      };

      arr.forEach(srv => {
        if (srv.active === false) return; // أو إذا عندك حقل active
        if (srv.category === "resident") servicesByType.resident.push(srv);
        else if (srv.category === "nonresident") servicesByType.nonresident.push(srv);
        else if (srv.category === "company") servicesByType.company.push(srv);
        else if (srv.category === "other") servicesByType.other.push(srv);
      });

      setServices({
        resident: servicesByType.resident || [],
        nonresident: servicesByType.nonresident || [],
        company: servicesByType.company || [],
        other: servicesByType.other || [],
      });

      // 4. جلب الطلبات الخاصة بالعميل
      const ordersSnap = await getDocs(
        query(
          collection(firestore, "requests"),
          where("clientId", "==", userId),
          orderBy("createdAt", "desc")
        )
      );
      let clientOrders = ordersSnap.docs.map(doc => doc.data());
      setOrders(clientOrders);

      // 5. جلب الإشعارات
      const notifsSnap = await getDocs(
        query(
          collection(firestore, "notifications"),
          where("targetId", "==", userId)
        )
      );
      let clientNotifs = notifsSnap.docs.map(d => d.data());
      clientNotifs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setNotifications(clientNotifs);

      setLoading(false);
    }
    fetchData();
  }, [userId, reloadClient]);

  // اغلاق القوائم عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifMenu(false);
      if (coinsRef.current && !coinsRef.current.contains(event.target)) setShowCoinsMenu(false);
      if (walletRef.current && !walletRef.current.contains(event.target)) setShowWalletMenu(false);
      if (messagesRef.current && !messagesRef.current.contains(event.target)) setShowMessagesMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleLang() {
    setLang((l) => (l === "ar" ? "en" : "ar"));
  }

  async function handleLogout() {
    // حذف جميع رسائل الشات
    if (client?.userId) {
      const msgsSnap = await getDocs(collection(firestore, "chatRooms", client.userId, "messages"));
      const deletes = [];
      msgsSnap.forEach((msg) => {
        deletes.push(deleteDoc(doc(firestore, "chatRooms", client.userId, "messages", msg.id)));
      });
      await Promise.all(deletes);
      // حذف غرفة الشات نفسها
      await deleteDoc(doc(firestore, "chatRooms", client.userId));
    }
    // تسجيل الخروج من Firebase
    await signOut(auth);
    router.replace("/login");
  }

  function filterService(service) {
    return (lang === "ar" ? service.name : (service.name_en || service.name))
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  }

  const dir = lang === "ar" ? "rtl" : "ltr";

  // كول باك بعد الدفع: إعادة تحميل بيانات العميل لعرض الكوينات الجديدة
  function handleServicePaid() {
    setReloadClient((v) => !v);
  }

  // تحديث الإشعار كمقروء عند الضغط عليه (Firestore)
  async function markNotifAsRead(notifId) {
    await updateDoc(doc(firestore, "notifications", notifId), { isRead: true });
    setReloadClient((v) => !v);
  }

  // دالة شحن المحفظة (مع كوينات البونص وإشعار) - Firestore فقط
  async function handleWalletCharge(amount) {
    if (!client) return;

    // PayTabs JS
    window.Paytabs.open({
      secretKey: "PUT_YOUR_SECRET_KEY",
      merchantEmail: "your@email.com",
      amount: amount,
      currency: "AED",
      customer_phone: client.phone || "",
      customer_email: client.email || "",
      order_id: `wallet_${client.userId}_${Date.now()}`,
      site_url: window.location.origin,
      product_name: "Wallet Topup",

      onSuccess: async (response) => {
        let bonus = 0;
        if (amount === 100) bonus = 50;
        else if (amount === 500) bonus = 250;
        else if (amount === 1000) bonus = 500;
        else if (amount === 5000) bonus = 2500;

        const newWallet = (client.walletBalance || 0) + amount;
        const newCoins = (client.coins || 0) + bonus;

        await updateDoc(doc(firestore, "users", client.userId), { walletBalance: newWallet });
        await addNotification(
          client.userId,
          lang === "ar" ? "تم شحن المحفظة" : "Wallet Charged",
          lang === "ar" ? `تم شحن محفظتك بمبلغ ${amount} درهم.` : `Your wallet was charged with ${amount} AED.`
        );

        if (bonus > 0) {
          await updateDoc(doc(firestore, "users", client.userId), { coins: newCoins });
          await addNotification(
            client.userId,
            lang === "ar" ? "تم إضافة كوينات" : "Coins Added",
            lang === "ar"
              ? `تم إضافة ${bonus} كوين لرصيدك كمكافأة شحن المحفظة.`
              : `You received ${bonus} coins as wallet charge bonus.`
          );
        }

        setReloadClient((v) => !v);
        alert(lang === "ar" ? "تم شحن المحفظة بنجاح!" : "Wallet charged successfully!");
      },

      onFailure: (error) => {
        alert(lang === "ar" ? "فشل الدفع! برجاء المحاولة مرة أخرى" : "Payment failed! Please try again.");
      }
    });
  }

  if (loading) {
  return <GlobalLoader />;
}

if (!client) {
  return (
    <div className="flex min-h-screen justify-center items-center bg-gradient-to-br from-[#0b131e] via-[#22304a] to-[#1d4d40]">
      <div className="flex flex-col items-center gap-6">
        <div className="w-20 h-20 flex items-center justify-center animate-bounce">
          <Image
            src="/logo-transparent-large.png"
            alt="شعار الشركة"
            width={80}
            height={80}
            className="rounded-full bg-white ring-2 ring-red-400 shadow-lg"
            priority
          />
        </div>
        <span className="text-red-400 text-2xl font-bold animate-pulse">
          العميل غير موجود في قاعدة البيانات
        </span>
      </div>
    </div>
  );
}

// بعد التأكد أن client موجود:
const clientType = (client.type || client.accountType || "").toLowerCase();

if (clientType === "resident") {
  // Render resident-specific content
} else if (clientType === "nonresident") {
  // Render non-resident-specific content
} else if (clientType === "company") {
  // Render company-specific content
}

  return (
    <div
      className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#0b131e] via-[#22304a] to-[#1d4d40] relative"
      dir={dir}
      lang={lang}
    >

      {/* HEADER */}
      <header className="w-full z-30 bg-gradient-to-b from-[#0b131e]/95 to-[#22304a]/90 flex items-center justify-between px-2 sm:px-8 py-4 border-b border-emerald-900 shadow-xl sticky top-0">
        <div className="flex items-center gap-3 min-w-[230px]">
          <Image
            src="/logo-transparent-large.png"
            alt="شعار تأهيل"
            width={54}
            height={54}
            className="rounded-full bg-white ring-2 ring-emerald-400 shadow"
            priority
          />
          <div className="flex flex-col items-center text-center">
            <span className="text-emerald-400 text-2xl sm:text-3xl font-extrabold">تأهيل</span>
            <span className="text-gray-100 text-lg sm:text-xl font-bold tracking-widest">TAHEEL</span>
            <span className="text-emerald-200 text-sm sm:text-base font-semibold my-1">
              لمتابعة المعلومات والمعاملات والخدمات
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center px-2">
          <span className="text-white text-base sm:text-lg font-bold whitespace-nowrap">
            {getDayGreeting(lang)}
          </span>
          <span className="text-emerald-200 text-base sm:text-lg font-bold whitespace-nowrap mt-1">
            {getWelcome(client?.name, lang)}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* إشعارات */}
          <div ref={notifRef} className="relative group cursor-pointer" onClick={() => setShowNotifMenu(v => !v)}>
            <FaBell size={22} className="text-emerald-300 hover:text-emerald-400 transition" />
            {notifications.some(n => !n.isRead) && (
              <span className="absolute -top-2 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full px-1 shadow">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
            <span className="absolute z-10 left-1/2 -translate-x-1/2 top-7 text-xs bg-black/70 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {lang === "ar" ? "الإشعارات" : "Notifications"}
            </span>
            {showNotifMenu && (
              <div className="absolute top-10 right-0 w-72 bg-white shadow-xl rounded-lg p-4 z-50">
                <div className="font-bold text-emerald-700 mb-3">{lang === "ar" ? "الإشعارات" : "Notifications"}</div>
                {notifications.length === 0 ? (
                  <div className="text-gray-400 text-center">{lang === "ar" ? "لا توجد إشعارات" : "No notifications"}</div>
                ) : (
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.map((notif, idx) => (
                      <li
                        key={notif.notificationId || idx}
                        className={`text-xs border-b pb-2 cursor-pointer ${notif.isRead ? "opacity-70" : "font-bold text-emerald-900"}`}
                        onClick={() => markNotifAsRead(notif.notificationId)}
                        title={notif.isRead ? "" : (lang === "ar" ? "اضغط لتمييز كمقروء" : "Mark as read")}
                        style={{ transition: "opacity 0.2s" }}
                      >
                        <div className="font-bold text-emerald-600">{notif.title}</div>
                        <div className="text-gray-500">{notif.body}</div>
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
              </div>
            )}
          </div>
          {/* كوينات */}
          <div ref={coinsRef} className="relative group cursor-pointer" onClick={() => setShowCoinsMenu(v => !v)}>
            <FaCoins size={22} className="text-yellow-300 hover:text-yellow-400 transition" />
            <span className="absolute -top-2 -right-1 bg-gray-800 text-yellow-300 text-[10px] font-bold rounded-full px-1 shadow">{client.coins || 0}</span>
            <span className="absolute z-10 left-1/2 -translate-x-1/2 top-7 text-xs bg-black/70 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {lang === "ar" ? "الرصيد" : "Coins"}
            </span>
            {showCoinsMenu && (
              <div className="absolute top-10 right-0 w-56 bg-white shadow-xl rounded-lg p-4 z-50">
                <div className="font-bold text-yellow-600 mb-2">{lang === "ar" ? "رصيد الكوينات" : "Coins Balance"}</div>
                <div className="text-2xl font-black text-yellow-500">{client.coins || 0}</div>
                <div className="text-xs text-gray-600 mt-2">
                  {lang === "ar"
                    ? "يمكنك استخدام الكوينات في خدمات مختارة."
                    : "You can use coins in selected services."}
                </div>
              </div>
            )}
          </div>
          {/* المحفظة */}
          <div ref={walletRef} className="relative group cursor-pointer" onClick={() => setShowWalletMenu(v => !v)}>
            <FaWallet size={22} className="text-emerald-400 hover:text-emerald-600 transition" />
            <span className="absolute -top-2 -right-1 bg-emerald-700 text-white text-[10px] font-bold rounded-full px-1 shadow">
              {client.walletBalance || 0}
            </span>
            <span className="absolute z-10 left-1/2 -translate-x-1/2 top-7 text-xs bg-black/70 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {lang === "ar" ? "المحفظة" : "Wallet"}
            </span>
            {showWalletMenu && (
              <div className="absolute top-10 right-0 w-64 bg-white shadow-xl rounded-lg p-4 z-50">
                <div className="font-bold text-emerald-700 mb-2">{lang === "ar" ? "رصيد المحفظة" : "Wallet Balance"}</div>
                <div className="text-2xl font-black text-emerald-600">{client.walletBalance || 0}</div>
                <div className="text-xs text-gray-600 mt-2 mb-4">
                  {lang === "ar"
                    ? "يمكنك شحن المحفظة أو الدفع مباشرة من الرصيد."
                    : "You can top-up or pay directly from your wallet balance."}
                </div>
                <div className="flex flex-col gap-2 mb-2">
                  {/* أزرار الشحن */}
                  <button
                    className="w-full py-2 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold shadow"
                    onClick={() => handleWalletCharge(100)}
                  >
                    {lang === "ar" ? "شحن 100 درهم+(50 كوين مجانا)" : "Charge 100 AED (+50 coins)"}
                  </button>
                  <button
                    className="w-full py-2 rounded-full bg-emerald-200 hover:bg-emerald-300 text-emerald-900 font-bold shadow"
                    onClick={() => handleWalletCharge(500)}
                  >
                    {lang === "ar" ? "شحن 500 درهم+(250 كوين مجانا)" : "Charge 500 AED (+250 coins)"}
                  </button>
                  <button
                    className="w-full py-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold shadow"
                    onClick={() => handleWalletCharge(1000)}
                  >
                    {lang === "ar" ? "شحن 1000 درهم+(500 كوين مجانا)" : "Charge 1000 AED (+500 coins)"}
                  </button>
                  <button
                    className="w-full py-2 rounded-full bg-yellow-200 hover:bg-yellow-300 text-yellow-900 font-bold shadow"
                    onClick={() => handleWalletCharge(5000)}
                  >
                    {lang === "ar" ? "شحن 5000 درهم+(2500 كوين مجانا)" : "Charge 5000 AED (+2500 coins)"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* الرسائل */}
          <div ref={messagesRef} className="relative group cursor-pointer" onClick={() => setShowMessagesMenu(v => !v)}>
            <FaEnvelopeOpenText size={22} className="text-cyan-200 hover:text-cyan-300 transition" />
            {client.unreadMessages > 0 && (
              <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow">
                {client.unreadMessages}
              </span>
            )}
            <span className="absolute z-10 left-1/2 -translate-x-1/2 top-7 text-xs bg-black/70 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {lang === "ar" ? "الرسائل الواردة" : "Admin Messages"}
            </span>
            {showMessagesMenu && (
              <div className="absolute top-10 right-0 w-64 bg-white shadow-xl rounded-lg p-4 z-50">
                <div className="font-bold text-cyan-800 mb-2">{lang === "ar" ? "الرسائل" : "Messages"}</div>
                {client.messages && client.messages.length > 0 ? (
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {client.messages.map((msg, i) => (
                      <li key={i} className="border-b pb-2">
                        <div className="font-bold text-cyan-700">{msg.title || ""}</div>
                        <div className="text-gray-700">{msg.body || ""}</div>
                        <div className="text-gray-400 text-[10px] mt-1">{msg.time || ""}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-400 text-center">
                    {lang === "ar" ? "لا توجد رسائل" : "No messages"}
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="hidden sm:inline">
            <WeatherTimeWidget isArabic={lang === "ar"} />
          </span>
          <button
            onClick={toggleLang}
            className="px-3 py-1.5 rounded-full border border-emerald-500 bg-[#16222c] text-emerald-200 hover:bg-emerald-500 hover:text-white text-xs sm:text-sm font-bold shadow transition cursor-pointer"
            title={lang === "ar" ? "English" : "عربي"}
          >
            {lang === "ar" ? "ENGLISH" : "عربي"}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full shadow transition cursor-pointer"
            title={lang === "ar" ? "تسجيل الخروج" : "Logout"}
          >
            <FaSignOutAlt /> {lang === "ar" ? "تسجيل الخروج" : "Logout"}
          </button>
        </div>
      </header>

      {/* خلفيات زخرفية */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-20 w-[280px] h-[280px] bg-emerald-400 opacity-20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-0 right-0 w-[170px] h-[170px] bg-gradient-to-br from-emerald-900 to-emerald-400 opacity-30 rounded-full blur-2xl" />
        <svg className="absolute bottom-0 left-0 w-full h-24 md:h-32 opacity-30" viewBox="0 0 500 80" fill="none">
          <path d="M0 80 Q250 0 500 80V100H0V80Z" fill="#10b981" />
        </svg>
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 z-10 relative flex flex-col items-center justify-center">
        {/* كارت العميل */}
        {clientType === "resident" && (
          <div className="min-w-[320px] max-w-[380px] mb-6">
            <ResidentCard client={client} lang={lang} />
          </div>
        )}
        {client.type === "nonResident" || client.type === "nonresident" ? (
          <div className="min-w-[320px] max-w-[380px] mb-6">
            <NonResidentCard client={client} lang={lang} />
          </div>
        ) : null}
        {/* الشركات إن وجدت */}
        {clientType === "resident" && companies.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 w-full my-6">
            {companies.map((company) => (
              <div key={company.userId || company.companyId} className="min-w-[320px] max-w-[380px]">
                <CompanyCardGold company={company} lang={lang} />
              </div>
            ))}
          </div>
        )}

        {/* تتبع الطلبات مع الحالة */}
        <div className="w-full flex items-center my-8 select-none">
          <div className="flex-1 h-px bg-gradient-to-l from-emerald-300 via-emerald-100 to-transparent" />
          <span className="flex items-center gap-2 px-4 py-1 bg-white/80 rounded-full shadow text-emerald-900 font-extrabold text-lg border border-emerald-100">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path fill="#059669" d="M13 2.05v2.02A7.003 7.003 0 0 1 19.93 11H22a1 1 0 1 1 0 2h-2.07a7.003 7.003 0 0 1-6.93 6.93v2.02a1 1 0 1 1-2 0v-2.02A7.003 7.003 0 0 1 4.07 13H2a1 1 0 1 1 0-2h2.07A7.003 7.003 0 0 1 11 4.07V2.05a1 1 0 1 1 2 0Zm-1 4c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Zm0 3a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Z"/>
            </svg>
            {lang === "ar" ? "الطلبات الحالية" : "Current Orders"}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-emerald-300 via-emerald-100 to-transparent" />
        </div>
        <ClientOrdersTracking
          clientId={client.userId}
          lang={lang}
          orders={orders}
          showStatus // <-- براميتر جديد ليظهر الحالة داخل كارت التتبع
        />

        {/* فاصل */}
        <div className="flex items-center my-12 w-full">
          <div className="flex-1 h-px bg-gradient-to-l from-emerald-300 via-emerald-100 to-transparent" />
          <span className="flex items-center gap-2 px-4 py-1 bg-white/80 rounded-full shadow text-emerald-900 font-extrabold text-lg border border-emerald-100">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path fill="#059669" d="M4 12h16M12 4v16" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {lang === "ar" ? "الخدمات المتاحة" : "Available Services"}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-emerald-300 via-emerald-100 to-transparent" />
        </div>

        {/* محرك بحث */}
        <div className="w-full flex items-center justify-center mb-10">
          <div
            className={`
              flex items-center gap-2 w-full max-w-lg bg-white/80
              rounded-full px-5 py-3 shadow-xl ring-1 ring-emerald-200
              backdrop-blur-2xl border border-emerald-100/50
              transition-all duration-200
              focus-within:ring-2 focus-within:ring-emerald-400
            `}
            style={{
              boxShadow: "0 4px 24px #05966922",
            }}
          >
            <svg className="text-emerald-500 text-lg" width="20" height="20" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke="#059669" strokeWidth="2"/>
              <path d="M21 21l-3.5-3.5" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none border-none text-emerald-900 text-base placeholder-gray-400 font-bold"
              style={{ direction: dir }}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "ابحث عن خدمة..." : "Search for a service..."}
            />
          </div>
        </div>

        {/* ----------- خدمات المقيم ----------- */}
        {clientType === "resident" && services.resident.length > 0 && (
          <>
            <SectionTitle icon="resident" color="emerald">
              {lang === "ar" ? "خدمات المقيم" : "Resident Services"}
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {services.resident.filter(filterService).map((srv, i) => (
                <ServiceProfileCard
                  key={srv.name + i}
                  category="resident"
                  name={srv.name}
                  description={srv.description}
                  price={srv.price}
                  duration={srv.duration}
                  requiredDocs={srv.documents || []}
                  requireUpload={srv.requireUpload}
                  coins={srv.coins || 0}
                  lang={lang}
                  userId={client.userId}
                  userWallet={client.walletBalance || 0}
                  userCoins={client.coins || 0}
                  onPaid={handleServicePaid}
                  coinsPercent={0.1}
                  addNotification={addNotification}
                />
              ))}
            </div>
          </>
        )}

        {/* ----------- خدمات الشركات ----------- */}
        {clientType === "company" && companies.length > 0 && services.company.length > 0 && (
          <>
            <SectionTitle icon="company" color="blue">
              {lang === "ar" ? "خدمات الشركات" : "Company Services"}
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {services.company.filter(filterService).map((srv, i) => (
                <ServiceProfileCard
                  key={srv.name + i}
                  category="company"
                  name={srv.name}
                  description={srv.description}
                  price={srv.price}
                  duration={srv.duration}
                  requiredDocs={srv.documents || []}
                  requireUpload={srv.requireUpload}
                  coins={srv.coins || 0}
                  lang={lang}
                  userId={client.userId}
                  userWallet={client.walletBalance || 0}
                  userCoins={client.coins || 0}
                  onPaid={handleServicePaid}
                  coinsPercent={0.1}
                  addNotification={addNotification}
                />
              ))}
            </div>
          </>
        )}

        {/* ----------- خدمات غير المقيم ----------- */}
        {clientType === "nonresident" && services.nonresident.length > 0 && (

          <>
            <SectionTitle icon="nonresident" color="yellow">
              {lang === "ar" ? "خدمات غير المقيم" : "Non-Resident Services"}
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {services.nonresident.filter(filterService).map((srv, i) => (
                <ServiceProfileCard
                  key={srv.name + i}
                  category="nonresident"
                  name={srv.name}
                  description={srv.description}
                  price={srv.price}
                  duration={srv.duration}
                  requiredDocs={srv.documents || []}
                  requireUpload={srv.requireUpload}
                  coins={srv.coins || 0}
                  lang={lang}
                  userId={client.userId}
                  userWallet={client.walletBalance || 0}
                  userCoins={client.coins || 0}
                  onPaid={handleServicePaid}
                  coinsPercent={0.1}
                  addNotification={addNotification}
                />
              ))}
            </div>
          </>
        )}

        {/* ----------- خدمات أخرى (دائمًا آخر الصفحة) ----------- */}
        {services.other.length > 0 && (
          <>
            <SectionTitle icon="other" color="gray">
              {lang === "ar" ? "خدمات أخرى" : "Other Services"}
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {services.other.filter(filterService).map((srv, i) => (
                <ServiceProfileCard
                  key={srv.name + i}
                  category="other"
                  name={srv.name}
                  description={srv.description}
                  price={srv.price}
                  duration={srv.duration}
                  requiredDocs={srv.documents || []}
                  requireUpload={srv.requireUpload}
                  coins={srv.coins || 0}
                  lang={lang}
                  userId={client.userId}
                  userWallet={client.walletBalance || 0}
                  userCoins={client.coins || 0}
                  onPaid={handleServicePaid}
                  coinsPercent={0.1}
                  addNotification={addNotification}
                />
              ))}
            </div>
          </>
        )}

        {/* FOOTER */}
        <footer className="w-full flex flex-col items-center justify-center mt-10 mb-4 z-10 relative">
          <Image
            src="/logo-transparent-large.png"
            alt="شعار تأهيل"
            width={48}
            height={48}
            className="rounded-full bg-white ring-2 ring-emerald-400 shadow mb-3"
          />
          <div className="text-gray-400 text-xs mt-2">
            © 2025 تأهيل. جميع الحقوق محفوظة
          </div>
        </footer>

        {/* زرار المحادثة الداخلية + زر الواتساب العائم */}
        <div className="fixed z-50 bottom-6 right-6 flex flex-col items-end gap-3">
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-3xl cursor-pointer transition"
            title={lang === "ar" ? "محادثة موظف خدمة العملاء" : "Chat with Support"}
            onClick={() => setOpenChat(true)}
          >
            <FaComments />
          </button>
          <a
            href="https://wa.me/9665XXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-3xl cursor-pointer transition"
            title={lang === "ar" ? "تواصل واتساب" : "WhatsApp"}
          >
            <FaWhatsapp />
          </a>
        </div>

        {openChat && (
          <div className="fixed z-[100] bottom-28 right-6 shadow-2xl">
            <ChatWidgetFull
  userId={client.userId}
  userName={client.name}
  roomId={client.userId} // ثابت، نفس اسم غرفة العميل
/>
            <button
              onClick={() => setOpenChat(false)}
              className="absolute -top-3 -left-3 bg-red-600 hover:bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
              title="إغلاق المحادثة"
              tabIndex={0}
            >×</button>
          </div>
        )}
      </main>
    </div>
  );
}
export default function ClientProfilePage(props) {
  const searchParams = useSearchParams();

  return (
    <Suspense fallback={null}>
      <ClientProfilePageInner {...props} userId={searchParams.get("userId")} />
    </Suspense>
  );
}