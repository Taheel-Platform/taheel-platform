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
      className={`fixed top-0 ${dir === "rtl" ? "right-0" : "left-0"} h-screen z-40`}
      dir={dir}
      lang={lang}
      style={{
        transition: "width 0.4s cubic-bezier(.4,0,.2,1), box-shadow 0.3s",
        width: opened ? "260px" : "70px",
        boxShadow: opened ? "0 0 40px 0 rgba(16,185,129,0.12)" : "none",
        background: "rgba(255,255,255,0.92)",
        borderRight: dir === "ltr" ? "2px solid #d1fae5" : "none",
        borderLeft: dir === "rtl" ? "2px solid #d1fae5" : "none",
        overflow: "hidden",
      }}
    >
      {/* Toggle Button */}
      <button
        className="absolute top-5 transition-all bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-full shadow-lg p-2"
        style={{
          [dir === "rtl" ? "left" : "right"]: opened ? "-18px" : "-18px",
          zIndex: 50,
          cursor: "pointer",
          border: "1px solid #34d399",
        }}
        onClick={() => setOpened((v) => !v)}
        title={opened ? (lang === "ar" ? "إغلاق القائمة" : "Close sidebar") : (lang === "ar" ? "فتح القائمة" : "Open sidebar")}
      >
        {opened
          ? dir === "rtl"
            ? <FaChevronRight />
            : <FaChevronLeft />
          : dir === "rtl"
            ? <FaChevronLeft />
            : <FaChevronRight />
        }
      </button>
      {/* Logo */}
      <div className={`mb-8 flex items-center justify-center transition-all ${opened ? "opacity-100" : "opacity-0"}`}>
        <img
          src="/logo-transparent-large.png"
          alt="Logo"
          className="w-16 h-16 rounded-full shadow-lg border-2 border-emerald-300 transition-all"
          style={{
            opacity: opened ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />
      </div>
      {/* Navigation */}
      <nav className="flex flex-col gap-2 mt-2">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-base group
              ${selected === section.key
                ? "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 shadow-lg"
                : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
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
            {/* Icon only if closed */}
            <span className={`transition-all ${opened ? "" : "mx-auto"}`}>
              {section.icon}
            </span>
            {/* Text if opened */}
            {opened && (
              <span>
                {lang === "ar" ? section.ar : section.en}
              </span>
            )}
          </button>
        ))}
      </nav>
      {/* Fill space */}
      <div className="flex-1" />
      {/* Footer / Rights */}
      {opened && (
        <div className="text-xs text-gray-400 text-center mt-8 mb-5 transition-opacity opacity-80">
          © 2025 تأهيل. جميع الحقوق محفوظة
        </div>
      )}
    </aside>
  );
}