import { useEffect, useRef, useState } from "react";
import { FaUser, FaClipboardList, FaServicestack, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const SECTIONS = [
  {
    key: "personal",
    icon: <FaUser size={22} />,
    ar: "المعلومات الشخصية",
    en: "Personal Info",
  },
  {
    key: "orders",
    icon: <FaClipboardList size={22} />,
    ar: "الطلبات الحالية",
    en: "Current Orders",
  },
  {
    key: "services",
    icon: <FaServicestack size={22} />,
    ar: "الخدمات",
    en: "Services",
  },
];

export default function Sidebar({ selected, onSelect, lang = "ar" }) {
  const [opened, setOpened] = useState(true);
  const sidebarRef = useRef();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const headerHeight = 64; // عدل الرقم لو الهيدر أكبر أو أصغر

  // غلق القائمة عند الضغط خارجها
  useEffect(() => {
    function handleClick(e) {
      if (opened && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setOpened(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [opened]);

  return (
    <aside
      ref={sidebarRef}
      className={`fixed left-0 z-40`}
      dir={dir}
      lang={lang}
      style={{
        top: `${headerHeight}px`,
        height: `calc(100vh - ${headerHeight}px)`,
        width: opened ? "260px" : "70px",
        minWidth: opened ? "260px" : "70px",
        background: `linear-gradient(135deg, #16222c 80%, #22304a 100%), url(/wave-bg.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "40px",
        boxShadow: "0 6px 24px 0 rgba(16,185,129,0.15)",
        border: "none",
        overflow: "hidden",
        transition: "width 0.5s cubic-bezier(.4,0,.2,1), box-shadow 0.3s, background 0.5s, top 0.3s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* زر فتح/غلق القائمة */}
      <button
        className="absolute top-6 right-[-20px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg p-2 border border-emerald-200"
        style={{
          zIndex: 50,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onClick={() => setOpened(v => !v)}
        title={opened ? (lang === "ar" ? "إغلاق القائمة" : "Close sidebar") : (lang === "ar" ? "فتح القائمة" : "Open sidebar")}
      >
        {opened ? <FaChevronLeft /> : <FaChevronRight />}
      </button>

      {/* اللوجو */}
      <div className={`mt-10 mb-8 flex items-center justify-center transition-all duration-300 ${opened ? "opacity-100" : "opacity-0"}`}>
        <div className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-emerald-400">
          <img
            src="/logo-transparent-large.png"
            alt="Logo"
            className="w-12 h-12 rounded-full"
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>

      {/* قائمة التنقل */}
      <nav className="flex flex-col gap-2 mt-2">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            className={`flex flex-row items-center gap-3 px-4 py-3 rounded-full transition-all font-bold text-base group
              ${selected === section.key
                ? "bg-emerald-700/20 text-emerald-300 shadow"
                : "text-gray-100 hover:bg-emerald-400/20 hover:text-emerald-300"
              }
              `}
            onClick={() => onSelect(section.key)}
            style={{
              justifyContent: "flex-start",
              cursor: "pointer",
            }}
            tabIndex={0}
          >
            <span className={`transition-all ${opened ? "" : "mx-auto"}`}>{section.icon}</span>
            {opened && (
              <span className="whitespace-nowrap">{lang === "ar" ? section.ar : section.en}</span>
            )}
          </button>
        ))}
      </nav>

      {/* فراغ لحقوق الملكية بالأسفل */}
      <div className="flex-1" />

      {/* حقوق الملكية */}
      {opened && (
        <div className="text-xs text-gray-400 text-center mb-8 transition-opacity opacity-80 relative z-10">
          © 2025 تأهيل. جميع الحقوق محفوظة
        </div>
      )}
    </aside>
  );
}