"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  FaSignOutAlt,
  FaBell,
  FaCoins,
  FaEnvelopeOpenText,
  FaWallet,
  FaWhatsapp,
  FaComments,
  FaBuilding,
  FaTag
} from "react-icons/fa";
import WeatherTimeWidget from "@/components/WeatherTimeWidget";
import { ResidentCard } from "@/components/cards/ResidentCard";
import CompanyCardGold from "@/components/cards/CompanyCard";
import ChatWidgetFull from "@/components/ClientChat/ChatWidgetFull";
import { NonResidentCard } from "@/components/cards/NonResidentCard";
import ClientOrdersTracking from "@/components/ClientOrdersTracking";
import { firestore } from "@/lib/firebase.client";
import { signOut } from "firebase/auth";
import { GlobalLoader } from "@/components/GlobalLoader";
import Sidebar from "@/components/ProfileSidebarLayout/Sidebar";
import ServiceProfileCard from "@/components/services/ServiceProfileCard";
import {
  collection, doc, getDoc, getDocs, updateDoc, setDoc, query, where, orderBy, deleteDoc
} from "firebase/firestore";
// استدعاء مكونات المحفظة والكوينز
import WalletWidget from "@/components/WalletWidget";
import CoinsWidget from "@/components/CoinsWidget";

// ========== Helper functions ==========
function getDayGreeting(lang = "ar") {
  const hour = new Date().getHours();
  if (lang === "ar") {
    if (hour >= 0 && hour < 12) return "صباح الخير";
    if (hour >= 12 && hour < 18) return "مساء الخير";
    return "مساء الخير";
  } else {
    if (hour >= 0 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  }
}

// استخدم اسم العميل من فير-بيز (firstName + middleName + lastName)
function getFullName(client, lang = "ar") {
  if (!client) return "";
  if (lang === "ar") {
    return [client.firstName, client.middleName, client.lastName]
      .filter(Boolean)
      .join(" ");
  }
  if (client.nameEn) return client.nameEn;
  return [client.firstName, client.middleName, client.lastName]
    .filter(Boolean)
    .join(" ");
}
function getWelcome(name, lang = "ar") {
  return lang === "ar" ? `مرحباً ${name || ""}` : `Welcome, ${name || ""}`;
}
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
function objectToArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object") return Object.values(obj);
  return [];
}

// ========== Section Titles ==========
const sectionTitles = {
  residentServices: { icon: "resident", color: "emerald", ar: "خدمات المقيم", en: "Resident Services" },
  companyServices: { icon: "company", color: "blue", ar: "خدمات الشركات", en: "Company Services" },
  nonresidentServices: { icon: "nonresident", color: "yellow", ar: "خدمات غير المقيم", en: "Non-Resident Services" },
  otherServices: { icon: "other", color: "gray", ar: "خدمات أخرى", en: "Other Services" },
};

function SectionTitle({ icon, color = "emerald", children }) {
  const iconMap = {
    resident: <FaComments className="text-emerald-500" />,
    company: <FaBuilding className="text-blue-500" />,
    nonresident: <FaEnvelopeOpenText className="text-yellow-500" />,
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

// ========== Main Component ==========
function ClientProfilePageInner({ userId }) {
  // ---------- States & Refs ----------
  const [lang, setLang] = useState("ar");
  const [openChat, setOpenChat] = useState(false);
  const [selectedSection, setSelectedSection] = useState("personal");
  const [client, setClient] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [services, setServices] = useState({ resident: [], nonresident: [], company: [], other: [] });
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerResident, setOwnerResident] = useState(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showCoinsMenu, setShowCoinsMenu] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showMessagesMenu, setShowMessagesMenu] = useState(false);
  const [search, setSearch] = useState("");
  const notifRef = useRef();
  const coinsRef = useRef();
  const walletRef = useRef();
  const messagesRef = useRef();
  const [reloadClient, setReloadClient] = useState(false);

  // ---------- Effects ----------
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const userDoc = await getDoc(doc(firestore, "users", userId));
      const user = userDoc.exists() ? userDoc.data() : null;
      setClient(user);

      if ((user?.type === "company" || user?.accountType === "company")) {
        setOwnerResident({
          firstName: user.ownerFirstName,
          middleName: user.ownerMiddleName,
          lastName: user.ownerLastName,
          birthDate: user.ownerBirthDate,
          gender: user.ownerGender,
          nationality: user.ownerNationality,
          phone: user.phone,
        });
      } else {
        setOwnerResident(null);
      }

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

// جلب الخدمات مباشرة من document الفئة
const types = ["resident", "company", "nonresident", "other"];
let servicesByType = {
  resident: [],
  nonresident: [],
  company: [],
  other: [],
};

for (const type of types) {
  const docRef = doc(firestore, "servicesByClientType", type);
  const snap = await getDoc(docRef);
  const data = snap.exists() ? snap.data() : {};
  // فقط الحقول التي تبدأ بـ service
  const arr = Object.entries(data)
    .filter(([key]) => key.startsWith("service"))
    .map(([key, val]) => ({ ...val, id: key }));
  // يمكنك فلترة الخدمات غير المفعلة هنا إذا أردت
  servicesByType[type] = arr.filter(srv => srv.active !== false);
}
setServices(servicesByType);

      const ordersSnap = await getDocs(
        query(
          collection(firestore, "requests"),
          where("clientId", "==", userId),
          orderBy("createdAt", "desc")
        )
      );
      setOrders(ordersSnap.docs.map(doc => doc.data()));

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

  // ---------- Data Processing ----------
  const clientType = (client?.type || client?.accountType || "").toLowerCase();
  const residentServices = objectToArray(services.resident);
  const companyServices = objectToArray(services.company);
  const nonresidentServices = objectToArray(services.nonresident);
  const otherServices = objectToArray(services.other);

  const sectionToServices = {
    residentServices,
    companyServices,
    nonresidentServices,
    otherServices,
  };

  const filterFn = typeof filterService === "function" ? filterService : () => true;
  const dir = lang === "ar" ? "rtl" : "ltr";

  // ---------- Event Handlers ----------
  function toggleLang() {
    setLang(l => (l === "ar" ? "en" : "ar"));
  }
  function handleServicePaid() {
    setReloadClient(v => !v);
  }
  async function markNotifAsRead(notifId) {
    await updateDoc(doc(firestore, "notifications", notifId), { isRead: true });
    setReloadClient(v => !v);
  }
  async function handleWalletCharge(amount) {
    if (!client) return;
    window.Paytabs.open({
      secretKey: "PUT_YOUR_SECRET_KEY",
      merchantEmail: "your@email.com",
      amount,
      currency: "AED",
      customer_phone: client.phone || "",
      customer_email: client.email || "",
      order_id: `wallet_${client.userId}_${Date.now()}`,
      site_url: window.location.origin,
      product_name: "Wallet Topup",
      onSuccess: async () => {
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
        setReloadClient(v => !v);
        alert(lang === "ar" ? "تم شحن المحفظة بنجاح!" : "Wallet charged successfully!");
      },
      onFailure: () => {
        alert(lang === "ar" ? "فشل الدفع! برجاء المحاولة مرة أخرى" : "Payment failed! Please try again.");
      }
    });
  }
  async function handleLogout() {
    if (client?.userId) {
      const msgsSnap = await getDocs(collection(firestore, "chatRooms", client.userId, "messages"));
      const deletes = [];
      msgsSnap.forEach((msg) => {
        deletes.push(deleteDoc(doc(firestore, "chatRooms", client.userId, "messages", msg.id)));
      });
      await Promise.all(deletes);
      await deleteDoc(doc(firestore, "chatRooms", client.userId));
    }
    await signOut(auth);
    router.replace("/login");
  }
  function filterService(service) {
    return (lang === "ar" ? service.name : (service.name_en || service.name))
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  }

  // ---------- Conditional Rendering ----------
  if (loading) return <GlobalLoader />;
  if (!client) {
    return (
      <div className="flex min-h-screen justify-center items-center bg-gradient-to-br from-[#0b131e] via-[#22304a] to-[#1d4d40]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 flex items-center justify-center animate-bounce">
            <Image src="/logo-transparent-large.png" alt="شعار الشركة" width={80} height={80} className="rounded-full bg-white ring-2 ring-red-400 shadow-lg" priority />
          </div>
          <span className="text-red-400 text-2xl font-bold animate-pulse">
            العميل غير موجود في قاعدة البيانات
          </span>
        </div>
      </div>
    );
  }

  // ---------- Main Render ----------
  return (
    <div
      className="min-h-screen flex font-sans bg-gradient-to-br from-[#0b131e] via-[#22304a] to-[#1d4d40] relative"
      dir={dir}
      lang={lang}
    >
      {/* Sidebar */}
      <Sidebar
        selected={selectedSection}
        onSelect={setSelectedSection}
        lang={lang}
        clientType={clientType}
      />

      <div className="flex-1 flex flex-col relative">
        {/* Decorations */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-32 -left-20 w-[280px] h-[280px] bg-emerald-400 opacity-20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-0 right-0 w-[170px] h-[170px] bg-gradient-to-br from-emerald-900 to-emerald-400 opacity-30 rounded-full blur-2xl" />
          <svg className="absolute bottom-0 left-0 w-full h-24 md:h-32 opacity-30" viewBox="0 0 500 80" fill="none">
            <path d="M0 80 Q250 0 500 80V100H0V80Z" fill="#10b981" />
          </svg>
        </div>

        {/* Header */}
        <header className="w-full z-30 bg-gradient-to-b from-[#0b131e]/95 to-[#22304a]/90 flex items-center justify-between px-2 sm:px-8 py-4 border-b border-emerald-900 shadow-xl sticky top-0">
          {/* Logo + info */}
          <div className="flex items-center gap-3 min-w-[230px]">
            <Image src="/logo-transparent-large.png" alt="شعار تأهيل" width={54} height={54} className="rounded-full bg-white ring-2 ring-emerald-400 shadow" priority />
            <div className="flex flex-col items-center text-center">
              <span className="text-emerald-400 text-2xl sm:text-3xl font-extrabold">تأهيل</span>
              <span className="text-gray-100 text-lg sm:text-xl font-bold tracking-widest">TAHEEL</span>
              <span className="text-emerald-200 text-sm sm:text-base font-semibold my-1">
                لمتابعة المعلومات والمعاملات والخدمات
              </span>
            </div>
          </div>
          {/* Greeting */}
          <div className="flex-1 flex flex-col justify-center items-center px-2">
            <span className="text-white text-base sm:text-lg font-bold whitespace-nowrap">
              {/* صباح الخير، مرحباً محمد عيد */}
              {`${getDayGreeting(lang)}, مرحباً ${getFullName(client, lang)}`}
            </span>
          </div>
          {/* Action icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Coins */}
            <div ref={coinsRef} className="relative group cursor-pointer" onClick={() => setShowCoinsMenu(v => !v)}>
              <CoinsWidget coins={client.coins || 0} lang={lang} />
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
            {/* Wallet */}
            <div ref={walletRef} className="relative group cursor-pointer" onClick={() => setShowWalletMenu(v => !v)}>
              <WalletWidget balance={client.walletBalance || 0} onCharge={handleWalletCharge} lang={lang} />
              <span className="absolute z-10 left-1/2 -translate-x-1/2 top-7 text-xs bg-black/70 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {lang === "ar" ? "المحفظة" : "Wallet"}
              </span>

            </div>
            {/* Notifications */}
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
            {/* Messages */}
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

        {/* Main Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto p-4 z-10 relative flex flex-col items-center justify-center">
          {selectedSection === "personal" && (
            <>
              {clientType === "resident" && (
                <ResidentCard client={client} lang={lang} />
              )}
              {(client.type === "nonResident" || client.type === "nonresident") && (
                <NonResidentCard client={client} lang={lang} />
              )}
              {clientType === "company" && (
                <>
                  <CompanyCardGold company={client} lang={lang} />
                  <ResidentCard
                    client={{
                      firstName: client.ownerFirstName,
                      middleName: client.ownerMiddleName,
                      lastName: client.ownerLastName,
                      birthDate: client.ownerBirthDate,
                      gender: client.ownerGender,
                      nationality: client.ownerNationality,
                      phone: client.phone,
                    }}
                    lang={lang}
                  />
                </>
              )}
            </>
          )}

          {selectedSection === "orders" && (
            <>
              <div className="w-full flex items-center my-8 select-none">
                {/* عنوان الطلبات الحالية */}
              </div>
              <ClientOrdersTracking
                clientId={client.userId}
                lang={lang}
                orders={orders}
                showStatus
              />
            </>
          )}

          {["residentServices", "companyServices", "nonresidentServices", "otherServices"].includes(selectedSection) && (
            <>
              <SectionTitle
                icon={sectionTitles[selectedSection].icon}
                color={sectionTitles[selectedSection].color}
              >
                {lang === "ar"
                  ? sectionTitles[selectedSection].ar
                  : sectionTitles[selectedSection].en}
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {sectionToServices[selectedSection].filter(filterFn).map((srv, i) => (
                  <ServiceProfileCard
  key={srv.name + i}
  category={selectedSection.replace("Services", "")}
  name={srv.name}
  name_en={srv.name_en}
  description={srv.description}
  description_en={srv.description_en}
  price={srv.price}                    // ✅ السعر الأساسي
  printingFee={srv.printingFee}        // ✅ رسوم الطباعة
  tax={srv.tax}                        // ✅ الضريبة
  clientPrice={srv.clientPrice}        // ✅ السعر النهائي (لو متوفر)
  duration={srv.duration}
  requiredDocuments={srv.requiredDocuments || srv.documents || []} // ✅ صح
  requireUpload={srv.requireUpload}
  coins={srv.coins || 0}
  lang={lang}
  userId={client.userId}
  userWallet={client.walletBalance || 0}
  userCoins={client.coins || 0}
  onPaid={handleServicePaid}
  coinsPercent={0.1}
  addNotification={addNotification}
  serviceId={srv.serviceId}
  repeatable={srv.repeatable}
  allowPaperCount={srv.allowPaperCount}
  pricePerPage={srv.pricePerPage}
  userEmail={client.email}
  longDescription={srv.longDescription}
  longDescription_en={srv.longDescription_en}
  setCoinsBalance={val => setClient(c => ({ ...c, coins: val }))}
/>
                ))}
              </div>
            </>
          )}
        </main>

        {/* الفوتر وحقوق الملكية */}
        <footer className="w-full flex flex-col items-center justify-center mt-10 mb-4 z-10">
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
      </div>

      {/* زر المحادثة العائم وزر الواتساب */}
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
            roomId={client.userId}
          />
          <button
            onClick={() => setOpenChat(false)}
            className="absolute -top-3 -left-3 bg-red-600 hover:bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
            title="إغلاق المحادثة"
            tabIndex={0}
          >×</button>
        </div>
      )}
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