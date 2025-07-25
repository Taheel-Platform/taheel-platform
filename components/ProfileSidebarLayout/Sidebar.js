import { FaUser, FaClipboardList, FaServicestack, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useState } from "react";

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
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <aside
      className={`fixed top-[80px] left-0 h-[calc(100vh-80px)] z-40 transition-all`}
      dir={dir}
      lang={lang}
      style={{
        width: opened ? "260px" : "72px",
        minWidth: opened ? "260px" : "72px",
        background: "linear-gradient(135deg, #16222c 60%, #22304a 100%)",
        borderRadius: "32px 0 32px 0",
        boxShadow: opened ? "0 4px 40px 0 rgba(16,185,129,0.12)" : "none",
        borderRight: "2px solid #10b98122",
        overflow: "hidden",
        transition: "width 0.45s cubic-bezier(.4,0,.2,1), box-shadow 0.3s, background 0.35s",
      }}
    >
      {/* نقش زخرفة SVG */}
      <svg
        width="100%" height="100"
        viewBox="0 0 260 100"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1, opacity: 0.07 }}
      >
        <circle cx="130" cy="50" r="40" fill="#10b981" />
        <circle cx="60" cy="30" r="20" fill="#10b981" />
      </svg>

      {/* زر فتح/غلق السايدبار */}
      <button
        className="absolute top-5 right-[-18px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg p-2 border border-emerald-300 transition-all"
        style={{
          zIndex: 50,
          cursor: "pointer",
        }}
        onClick={() => setOpened((v) => !v)}
        title={opened ? (lang === "ar" ? "إغلاق القائمة" : "Close sidebar") : (lang === "ar" ? "فتح القائمة" : "Open sidebar")}
      >
        {opened ? <FaChevronLeft /> : <FaChevronRight />}
      </button>

      {/* اللوجو */}
      <div className={`mb-8 flex items-center justify-center transition-all ${opened ? "opacity-100" : "opacity-0"} mt-8`}>
        <img
          src="/logo-transparent-large.png"
          alt="Logo"
          className="w-16 h-16 rounded-full shadow-xl border-2 border-emerald-400 transition-all"
          style={{
            opacity: opened ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />
      </div>

      {/* قائمة التنقل */}
      <nav className="flex flex-col gap-2 mt-2 relative z-10">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-base group
              ${selected === section.key
                ? "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-300 shadow-lg"
                : "text-gray-100 hover:bg-emerald-700/20 hover:text-emerald-300"
              }
              `}
            onClick={() => onSelect(section.key)}
            style={{
              justifyContent: lang === "ar" ? "flex-end" : "flex-start",
              cursor: "pointer",
              transition: "background 0.25s, color 0.25s",
            }}
            tabIndex={0}
          >
            <span className={`transition-all ${opened ? "" : "mx-auto"}`}>{section.icon}</span>
            {opened && (
              <span className="whitespace-nowrap">
                {lang === "ar" ? section.ar : section.en}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* فراغ لتمديد القائمة للأسفل */}
      <div className="flex-1" />

      {/* حقوق الملكية */}
      {opened && (
        <div className="text-xs text-gray-400 text-center mt-8 mb-5 transition-opacity opacity-80 relative z-10">
          © 2025 تأهيل. جميع الحقوق محفوظة
        </div>
      )}
    </aside>
  );
}