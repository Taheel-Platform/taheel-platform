"use client";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase.client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import ChatWidget from "@/components/admin/ChatWidget";
import WeatherTimeWidget from "@/components/WeatherTimeWidget";
import {
  FaUserTie, FaClipboardList, FaBell, FaComments, FaSignOutAlt,
  FaChevronRight, FaChevronLeft, FaClock, FaEnvelope
} from "react-icons/fa";

// استيراد الأقسام
import ProfileSection from "@/components/employee/ProfileSection";
import AttendanceSection from "@/components/employee/AttendanceSection";
import MyOrdersSection from "@/components/employee/MyOrdersSection";
import NotificationsSection from "@/components/employee/NotificationsSection";
import SupportSection from "@/components/employee/SupportSection";

// --- EmployeeGuard ---
function EmployeeGuard({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login?prev=/dashboard/employee");
        return;
      }
      const snap = await getDoc(doc(firestore, "users", user.uid));
      if (snap.exists() && (snap.data().role === "employee" || snap.data().type === "employee")) {
        setAllowed(true);
        setEmployeeData({ id: user.uid, ...snap.data() });
      } else {
        router.replace("/unauthorized");
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) return <div className="p-10 text-center">جاري التأكد من الصلاحية...</div>;
  if (!allowed) return null;
  return typeof children === "function" ? children(employeeData) : children;
}

const EMPLOYEE_SIDEBAR_LINKS = [
  { key: "profile", icon: <FaUserTie />, labelAr: "بياناتي", labelEn: "My Profile" },
  { key: "attendance", icon: <FaClock />, labelAr: "الحضور", labelEn: "Attendance" },
  { key: "myorders", icon: <FaClipboardList />, labelAr: "طلباتي", labelEn: "My Requests" },
  { key: "notifications", icon: <FaBell />, labelAr: "إشعاراتي", labelEn: "Notifications" },
  { key: "support", icon: <FaComments />, labelAr: "الدعم الفني", labelEn: "Support" }
];

// greeting logic
function getGreeting(lang = "ar") {
  const hour = new Date().getHours();
  if (lang === "ar") {
    if (hour >= 5 && hour < 12) return "صباح الخير";
    if (hour >= 12 && hour < 18) return "مساء الخير";
    return "مساء الخير";
  } else {
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  }
}

// --- تحديث الأونلاين/أوفلاين وسجلات الحضور ---
function useOnlineStatus(employeeData) {
  const attendanceUpdated = useRef(false);

  useEffect(() => {
    if (!employeeData?.id) return;
    const userRef = doc(firestore, "users", employeeData.id);

    // تحديث الأونلاين ووقت آخر تواجد، وتسجيل دخول اليوم
    const setUserOnline = async () => {
      await updateDoc(userRef, {
        status: "online",
        lastSeen: serverTimestamp(),
      });

      // تسجيل دخول اليوم (in) مرة واحدة فقط
      const today = new Date().toISOString().slice(0, 10);
      if (!attendanceUpdated.current) {
        let attendance = Array.isArray(employeeData.attendance) ? [...employeeData.attendance] : [];
        const idx = attendance.findIndex(a => a.date === today);
        if (idx === -1) {
          attendance.push({ date: today, in: new Date().toISOString().slice(11, 16), out: "" });
          await updateDoc(userRef, { attendance });
          attendanceUpdated.current = true;
        }
      }
    };

    setUserOnline();
    const interval = setInterval(setUserOnline, 60000); // كل دقيقة

    // عند الخروج أو إعادة تحميل الصفحة
    const handleOffline = async () => {
      await updateDoc(userRef, {
        status: "offline",
        lastSeen: serverTimestamp(),
      });
      // تسجيل وقت الخروج (out) في attendance
      const today = new Date().toISOString().slice(0, 10);
      let attendance = Array.isArray(employeeData.attendance) ? [...employeeData.attendance] : [];
      const idx = attendance.findIndex(a => a.date === today);
      if (idx > -1 && !attendance[idx].out) {
        attendance[idx].out = new Date().toISOString().slice(11, 16);
        await updateDoc(userRef, { attendance });
      }
    };

    window.addEventListener("beforeunload", handleOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleOffline);
      handleOffline();
    };
  }, [employeeData?.id]);
}

// --- Main Dashboard Page ---
function EmployeeDashboardPage({ employeeData }) {
  const [lang, setLang] = useState("ar");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("profile");
  const [openChat, setOpenChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const router = useRouter();

  useOnlineStatus(employeeData);

  const employeeName = employeeData?.name || (lang === "ar" ? "الموظف" : "Employee");
  const greeting = `${lang === "ar" ? "مرحباً" : "Welcome"}, ${employeeName} - ${getGreeting(lang)}`;
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (!employeeData?.id) return;
    const q = query(
      collection(firestore, "messages"),
      where("roomId", "==", "employee-room"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      let unread = 0;
      snap.forEach(docSnap => {
        const msg = docSnap.data();
        if (
          msg.senderId !== employeeData.id &&
          (!msg.readBy || !Array.isArray(msg.readBy) || !msg.readBy.includes(employeeData.id))
        ) {
          unread++;
        }
      });
      setUnreadMessages(unread);
    });
    return () => unsub();
  }, [employeeData?.id]);

  const handleOpenChat = () => {
    setOpenChat(true);
  };

  const handleLogout = async () => {
    const userRef = doc(firestore, "users", employeeData.id);
    await updateDoc(userRef, {
      status: "offline",
      lastSeen: serverTimestamp(),
    });
    // تحديث attendance (out)
    const today = new Date().toISOString().slice(0, 10);
    let attendance = Array.isArray(employeeData.attendance) ? [...employeeData.attendance] : [];
    const idx = attendance.findIndex(a => a.date === today);
    if (idx > -1 && !attendance[idx].out) {
      attendance[idx].out = new Date().toISOString().slice(11, 16);
      await updateDoc(userRef, { attendance });
    }
    await signOut(auth);
    router.replace("/login");
  };

  function renderSection() {
    switch (activeSection) {
      case "profile":
        return <ProfileSection employeeData={employeeData} lang={lang} />;
      case "attendance":
        return <AttendanceSection employeeData={employeeData} lang={lang} />;
      case "myorders":
        return <MyOrdersSection employeeId={employeeData.id} lang={lang} />;
      case "notifications":
        return <NotificationsSection userId={employeeData.id} lang={lang} />;
      case "support":
        return <SupportSection employeeId={employeeData.id} lang={lang} />;
      default:
        return null;
    }
  }

  // ألوان عالمية عصرية (أزرق بنفسجي رمادي)
  const MAIN_BG = "bg-gradient-to-br from-[#e7e9fb] via-[#f6f7fc] to-[#eef2fb]";
  const SIDEBAR_BG = "bg-gradient-to-b from-[#1e2746] via-[#323d5d] to-[#4f5c85]";
  const ACTIVE_LINK = "bg-white/90 text-indigo-700 font-extrabold shadow";
  const HEADER_GRADIENT = "bg-gradient-to-r from-[#2d3a55]/90 via-[#4e5fa9]/90 to-[#6b6ffe]/80";
  const FOOTER_BG = "bg-transparent";

  return (
    <div className={`min-h-screen flex font-sans ${MAIN_BG}`} dir={dir} lang={lang}>
      {/* Sidebar */}
      <aside className={`
          h-screen fixed top-0 z-30 flex flex-col
          transition-all duration-300
          ${sidebarOpen ? "w-64 left-0" : "w-16 -left-0"}
          ${SIDEBAR_BG}
          border-l border-indigo-800/50
          shadow-2xl
        `}
        style={{ minWidth: sidebarOpen ? "16rem" : "4rem", height: "100vh" }}
      >
        <div className="flex items-center gap-3 px-4 py-6">
          <Image src="/logo-transparent-large.png" alt="شعار تأهيل"
            width={sidebarOpen ? 90 : 64} height={sidebarOpen ? 90 : 64}
            className="rounded-full bg-white ring-2 ring-indigo-200 shadow" priority />
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-indigo-100 text-xl font-extrabold">تأهيل</span>
              <span className="text-indigo-200 text-lg font-bold tracking-widest">TAHEEL</span>
            </div>
          )}
        </div>
        <button
          className={`
            absolute ${lang === "ar" ? "left-full" : "right-full"}
            top-9 z-50 bg-indigo-300 hover:bg-indigo-500 text-white
            p-1 rounded-full shadow-lg transition cursor-pointer
          `}
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? (lang === "ar" ? "إخفاء القائمة" : "Hide Sidebar") : (lang === "ar" ? "عرض القائمة" : "Show Sidebar")}
        >
          {sidebarOpen
            ? lang === "ar"
              ? <FaChevronRight />
              : <FaChevronLeft />
            : lang === "ar"
              ? <FaChevronLeft />
              : <FaChevronRight />
          }
        </button>
        <nav className="flex-1 px-2 pt-3">
          <ul className="space-y-2">
            {EMPLOYEE_SIDEBAR_LINKS.map((item, i) => (
              <li key={i}>
                <button
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 rounded-lg
                    text-indigo-100 hover:bg-indigo-800/80 hover:text-white transition
                    font-bold text-base cursor-pointer
                    ${activeSection === item.key ? ACTIVE_LINK : ''}
                  `}
                  tabIndex={0}
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    color: activeSection === item.key ? "#4338ca" : undefined,
                  }}
                >
                  {item.icon}
                  {sidebarOpen && (
                    <span className="whitespace-nowrap">{lang === "ar" ? item.labelAr : item.labelEn}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-4 pb-6 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 justify-center bg-gradient-to-r from-indigo-400 to-blue-500 hover:from-indigo-600 hover:to-blue-700 text-white font-bold px-3 py-2 rounded-full shadow transition cursor-pointer"
            title={lang === "ar" ? "تسجيل الخروج" : "Logout"}
          >
            <FaSignOutAlt />
            {sidebarOpen && (lang === "ar" ? "تسجيل الخروج" : "Logout")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col relative z-10 ${sidebarOpen ? "ml-64" : "ml-16"} transition-all duration-300`}>
        {/* Header */}
        <header className={`w-full z-20 px-4 sm:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4 ${HEADER_GRADIENT} shadow border-b border-indigo-200 sticky top-0`}>
          <div className="flex items-center gap-6">
            <Image
              src="/logo-transparent-large.png"
              alt="شعار تأهيل"
              width={80}
              height={80}
              className="rounded-full bg-white ring-2 ring-indigo-200 shadow"
              priority
            />
            <div className="flex flex-col gap-2">
              <span className="text-white text-2xl font-extrabold">{greeting}</span>
              <span className="text-indigo-100 text-base font-semibold">{lang === "ar" ? "لوحة تحكم " : " Dashboard"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <WeatherTimeWidget isArabic={lang === "ar"} />
            {/* أيقونة الإشعارات */}
            <div className="relative cursor-pointer">
              <FaBell className="text-yellow-400 text-2xl hover:text-yellow-600 transition" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">1</span>
            </div>
            {/* أيقونة الرسائل الجديدة */}
            <div className="relative cursor-pointer" onClick={handleOpenChat} title={lang === "ar" ? "الرسائل" : "Messages"}>
              <FaEnvelope className="text-indigo-400 text-2xl hover:text-indigo-600 transition" />
              {unreadMessages > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
                  {unreadMessages}
                </span>
              )}
            </div>
            <button
              onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
              className="px-3 py-2 rounded-full border border-indigo-300 bg-white/5 text-indigo-100 hover:bg-indigo-400 hover:text-white text-xs font-bold shadow transition cursor-pointer"
              title={lang === "ar" ? "English" : "عربي"}
            >
              {lang === "ar" ? "ENGLISH" : "عربي"}
            </button>
          </div>
        </header>

        <div className="w-full max-w-6xl mx-auto pt-6 px-2 md:px-8">
          <h1 className="text-2xl font-extrabold text-indigo-700 mb-4">
            {lang === "ar"
              ? EMPLOYEE_SIDEBAR_LINKS.find(l => l.key === activeSection)?.labelAr
              : EMPLOYEE_SIDEBAR_LINKS.find(l => l.key === activeSection)?.labelEn}
          </h1>
        </div>

        <main className="flex-1 w-full max-w-6xl mx-auto pb-10 px-2 md:px-8 flex flex-col gap-10">
          {renderSection()}
        </main>
        <footer className={`w-full flex flex-col items-center justify-center text-center mt-8 mb-4 z-10 relative ${FOOTER_BG}`}>
          <Image
            src="/logo-transparent-large.png"
            alt="شعار تأهيل"
            width={80}
            height={80}
            className="rounded-full bg-white ring-2 ring-indigo-300 shadow mb-2"
          />
          <div className="text-gray-400 text-xs mt-1">
            © 2025 تأهيل. جميع الحقوق محفوظة
          </div>
        </footer>
      </div>
      {/* ويدجت شات الموظف */}
      {openChat && (
        <div className="fixed z-[1100] bottom-28 right-8 shadow-2xl">
          <ChatWidget
            userId={employeeData.id}
            userName={employeeName}
            roomId="employee-room"
            lang={lang}
            onClose={() => setOpenChat(false)}
          />
        </div>
      )}
      <div className="fixed z-[1000] bottom-8 right-8">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-3xl cursor-pointer transition"
          title={lang === "ar" ? "شات الموظفين" : "Staff Chat"}
          onClick={handleOpenChat}
          style={{ zIndex: 1000 }}
        >
          <FaComments />
        </button>
      </div>
      <style jsx global>{`
        .glassmorphism {
          background: rgba(255,255,255,0.25) !important;
          box-shadow: 0 8px 32px 0 rgba(31,38,135,0.12);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 1.25rem;
        }
      `}</style>
    </div>
  );
}

// --- Export ---
export default function EmployeeDashboardWrapper() {
  return (
    <EmployeeGuard>
      {(employeeData) => <EmployeeDashboardPage employeeData={employeeData} />}
    </EmployeeGuard>
  );
}