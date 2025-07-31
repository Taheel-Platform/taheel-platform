import React, { useState } from "react";

// قائمة لغات عالمية مشهورة
const LANGUAGES = [
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা", flag: "🇧🇩" },
  { code: "ur", name: "اردو", flag: "🇵🇰" },
  // أضف أي لغة أخرى تحتاجها
];

export default function LanguageSelectModal({
  userName = "زائر",
  countries = {},       // الدول القادمة من البيرنت
  countriesLang = {},   // لو عندك عرض إضافي للغات البلدان
  onSelect
}) {
  const [selectedLang, setSelectedLang] = useState("ar");
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  // رسالة ترحيب مبسطة (يمكنك تخصيصها أكثر)
  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! اختر اللغة والدولة للمتابعة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Select your language and country to continue.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Choisissez votre langue et votre pays pour continuer.`,
  };
  const fallbackWelcome = `Welcome ${userName} 👋 to Taheel platform! Select your language and country to continue.`;

  // بحث في اللغات
  const filteredLanguages = LANGUAGES.filter(
    lang =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase())
  );

  // ترجمة العناوين حسب اللغة المختارة
  const titleLabel =
    selectedLang === "ar" ? "اختيار اللغة والدولة" :
    selectedLang === "fr" ? "Choisir la langue et le pays" :
    "Choose Language & Country";

  const countryLabel =
    selectedLang === "ar" ? "اختر الدولة" :
    selectedLang === "fr" ? "Choisir le pays" :
    "Choose Country";

  const continueBtn =
    selectedLang === "ar" ? "استمرار" :
    selectedLang === "fr" ? "Continuer" :
    "Continue";

  return (
    <div className="taheel-modal-bg absolute inset-0 z-[1100] flex items-center justify-center font-sans">
      <style>{`
        .taheel-modal-bg { background: linear-gradient(120deg, #1a2236 80%, #183d3d 100%); }
        .taheel-modal-box { background: #222a36; border-radius: 20px; box-shadow: 0 8px 40px #14b8a633; border-top: 8px solid #14b8a6; padding: 2.2rem 2rem; min-width: 320px; max-width: 420px; }
        .taheel-modal-title { color: #14b8a6; font-weight: 900; font-size: 1.32rem; margin-bottom: 0.7rem; letter-spacing: 0.01em; font-family: 'Tajawal', 'Cairo', Arial, Helvetica, sans-serif; }
        .taheel-modal-welcome { color: #f0f9ff; font-size: 1rem; font-weight: 500; background: #183d3d; border-radius: 8px; padding: 0.7em 1.1em; margin-bottom: 1.1em; text-align: center; box-shadow: 0 2px 8px #14b8a622; }
        .taheel-lang-search { width: 100%; background: #222a36; color: #fff; border: 1px solid #14b8a6; border-radius: 8px; padding: 0.6em 1.1em; margin-bottom: 0.9em; font-size: 1.06rem; font-family: inherit; outline: none; transition: border .18s; }
        .taheel-lang-search:focus { border-color: #22d3ee; }
        .taheel-lang-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.7em; width: 100%; margin-bottom: 1.4em; }
        .taheel-lang-item { cursor: pointer; background: #222a36; color: #fff; font-size: 1.08rem; font-weight: 700; border-radius: 8px; padding: 0.6em 1.1em; display: flex; align-items: center; gap: 0.8em; border: 2px solid transparent; transition: background .18s, color .18s, border .18s; }
        .taheel-lang-item.selected { background: linear-gradient(90deg, #14b8a6 60%, #2563eb 100%); color: #fff; border-color: #14b8a6; }
        .taheel-lang-item:hover { background: #2d3748; color: #22d3ee; }
        .taheel-modal-btn { background: linear-gradient(90deg, #2563eb 75%, #14b8a6 100%); color: #fff; font-size: 1.09rem; font-weight: bold; border-radius: 999px; padding: 0.65em 2em; box-shadow: 0 2px 12px #2563eb44; letter-spacing: 0.5px; margin-bottom: 1.1em; border: none; transition: background .18s; }
        .taheel-modal-btn:hover { background: linear-gradient(90deg, #1e40af 65%, #0f766e 100%); }
        .taheel-country-select { width: 100%; background: #222a36; color: #fff; border: 1px solid #14b8a6; border-radius: 8px; padding: 0.55em 1.1em; margin-bottom: 1.1em; font-size: 1.06rem; font-family: inherit; outline: none; }
        ::-webkit-scrollbar { width: 8px; background: #222a36; }
        ::-webkit-scrollbar-thumb { background: #14b8a6; border-radius: 8px; }
      `}</style>
      <div className="taheel-modal-box flex flex-col items-center font-sans">
        <img src="/taheel-bot.png" alt="Taheel" className="w-20 mb-3 drop-shadow-lg" />
        <h2 className="taheel-modal-title">{titleLabel}</h2>
        <p className="taheel-modal-welcome">{welcomeMessages[selectedLang] || fallbackWelcome}</p>
        {/* بحث عن اللغة */}
        <input
          className="taheel-lang-search"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={selectedLang === "ar" ? "ابحث عن اللغة..." : "Search language..."}
        />
        {/* قائمة اللغات */}
        <div className="taheel-lang-list">
          {filteredLanguages.map(lang =>
            <div
              key={lang.code}
              className={`taheel-lang-item${selectedLang === lang.code ? " selected" : ""}`}
              onClick={() => setSelectedLang(lang.code)}
            >
              <span style={{ fontSize: "1.5em" }}>{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
          )}
        </div>
        {/* اختيار الدولة */}
        <select
          className="taheel-country-select"
          value={selectedCountry}
          onChange={e => setSelectedCountry(e.target.value)}
        >
          <option value="">{countryLabel}</option>
          {Object.entries(countries).map(([code, name]) =>
            <option key={code} value={code}>{name}</option>
          )}
        </select>
        <button
          className="taheel-modal-btn w-full"
          disabled={!selectedLang || !selectedCountry}
          onClick={() => onSelect(selectedLang, selectedCountry)}
        >
          {continueBtn}
        </button>
      </div>
    </div>
  );
}