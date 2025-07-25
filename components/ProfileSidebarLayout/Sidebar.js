import { FaUser, FaClipboardList, FaServicestack } from "react-icons/fa";

const SECTIONS = [
  {
    key: "personal",
    icon: <FaUser size={22} />,
    ar: "المعلومات الشخصية",
    en: "Personal Info"
  },
  {
    key: "orders",
    icon: <FaClipboardList size={22} />,
    ar: "الطلبات الحالية",
    en: "Current Orders"
  },
  {
    key: "services",
    icon: <FaServicestack size={22} />,
    ar: "الخدمات",
    en: "Services"
  }
];

export default function Sidebar({ selected, onSelect, lang = "ar" }) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <aside
      className="w-64 min-h-screen bg-white/90 shadow-2xl flex flex-col p-6 border-r border-emerald-100"
      dir={dir}
      lang={lang}
    >
      <div className="mb-8 flex items-center justify-center">
        <img
          src="/logo-transparent-large.png"
          alt="Logo"
          className="w-16 h-16 rounded-full shadow-lg border-2 border-emerald-300"
        />
      </div>
      <nav className="flex flex-col gap-2">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-lg ${
              selected === section.key
                ? "bg-emerald-100 text-emerald-700 shadow"
                : "text-gray-800 hover:bg-gray-100"
            }`}
            onClick={() => onSelect(section.key)}
            style={{ justifyContent: lang === "ar" ? "flex-end" : "flex-start" }}
          >
            {lang === "ar" ? (
              <>
                {section.ar} {section.icon}
              </>
            ) : (
              <>
                {section.icon} {section.en}
              </>
            )}
          </button>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="text-xs text-gray-400 text-center mt-8">
        © 2025 تأهيل. جميع الحقوق محفوظة
      </div>
    </aside>
  );
}