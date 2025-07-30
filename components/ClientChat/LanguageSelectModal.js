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
  onSelect
}) {
  const [selectedLang, setSelectedLang] = useState("ar");
  const [search, setSearch] = useState("");

  // ترجمة رسالة الترحيب لكل لغة (مثال، لكن الافضل تستخدم مكتبة ترجمة أو ملف منفصل)
  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! اختر لغتك للمتابعة. اسألني أي شيء وسأجيبك مباشرة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Select your language to continue. Ask me anything and I'll respond right away.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Choisissez votre langue pour continuer. Posez-moi vos questions et je vous répondrai tout de suite.`,
    es: `¡Bienvenido ${userName} 👋 a la plataforma Taheel! Selecciona tu idioma para continuar. Pregúntame lo que quieras y te responderé al instante.`,
    de: `Willkommen ${userName} 👋 auf der Taheel-Plattform! Wähle deine Sprache aus, um fortzufahren. Frag mich alles, ich antworte sofort.`,
    pt: `Bem-vindo ${userName} 👋 à plataforma Taheel! Selecione seu idioma para continuar. Pergunte o que quiser e responderei imediatamente.`,
    ru: `Добро пожаловать, ${userName} 👋 на платформу Taheel! Выберите язык, чтобы продолжить. Задайте мне любой вопрос, я отвечу сразу.`,
    zh: `欢迎 ${userName} 👋 来到 Taheel 平台！请选择您的语言继续。随时提问，我会立即回复您。`,
    ja: `ようこそ ${userName} 👋 Taheelプラットフォームへ！言語を選択して続行してください。何でも聞いてください、すぐにお答えします。`,
    it: `Benvenuto ${userName} 👋 sulla piattaforma Taheel! Seleziona la tua lingua per continuare. Chiedimi qualsiasi cosa e ti risponderò subito.`,
    tr: `Hoş geldiniz ${userName} 👋 Taheel platformuna! Devam etmek için dilinizi seçin. Bana istediğinizi sorun, hemen cevap vereceğim.`,
    // أضف أي رسالة ترحيب بلغات أخرى أو استخدم ترجمة تلقائية من backend
  };
  const fallbackWelcome = `Welcome ${userName} 👋 to Taheel platform! Select your language to continue. Ask me anything and I'll respond right away.`;

  const logoAlt = selectedLang === "ar"
    ? "تأهيل"
    : selectedLang === "fr"
    ? "Taheel (FR)"
    : "Taheel";

  const languageLabel =
    selectedLang === "ar"
      ? "اختيار اللغة"
      : selectedLang === "fr"
      ? "Choisir la langue"
      : selectedLang === "es"
      ? "Selecciona el idioma"
      : selectedLang === "de"
      ? "Sprache wählen"
      : selectedLang === "pt"
      ? "Escolher idioma"
      : "Choose Language";

  const continueBtn =
    selectedLang === "ar"
      ? "استمرار"
      : selectedLang === "fr"
      ? "Continuer"
      : selectedLang === "es"
      ? "Continuar"
      : selectedLang === "de"
      ? "Weiter"
      : selectedLang === "pt"
      ? "Continuar"
      : "Continue";

  // بحث في اللغات
  const filteredLanguages = LANGUAGES.filter(
    lang =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="taheel-modal-bg absolute inset-0 z-[1100] flex items-center justify-center font-sans">
      <style>{`
        .taheel-modal-bg {
          background: linear-gradient(120deg, #1a2236 80%, #183d3d 100%);
        }
        .taheel-modal-box {
          background: #222a36;
          border-radius: 20px;
          box-shadow: 0 8px 40px #14b8a633;
          border-top: 8px solid #14b8a6;
          padding: 2.2rem 2rem;
          min-width: 320px;
          max-width: 420px;
        }
        .taheel-modal-title {
          color: #14b8a6;
          font-weight: 900;
          font-size: 1.32rem;
          margin-bottom: 0.7rem;
          letter-spacing: 0.01em;
          font-family: 'Tajawal', 'Cairo', Arial, Helvetica, sans-serif;
        }
        .taheel-modal-welcome {
          color: #f0f9ff;
          font-size: 1rem;
          font-weight: 500;
          background: #183d3d;
          border-radius: 8px;
          padding: 0.7em 1.1em;
          margin-bottom: 1.1em;
          text-align: center;
          box-shadow: 0 2px 8px #14b8a622;
        }
        .taheel-lang-search {
          width: 100%;
          background: #222a36;
          color: #fff;
          border: 1px solid #14b8a6;
          border-radius: 8px;
          padding: 0.6em 1.1em;
          margin-bottom: 0.9em;
          font-size: 1.06rem;
          font-family: inherit;
          outline: none;
          transition: border .18s;
        }
        .taheel-lang-search:focus {
          border-color: #22d3ee;
        }
        .taheel-lang-list {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.7em;
          width: 100%;
          margin-bottom: 1.4em;
        }
        .taheel-lang-item {
          cursor: pointer;
          background: #222a36;
          color: #fff;
          font-size: 1.08rem;
          font-weight: 700;
          border-radius: 8px;
          padding: 0.6em 1.1em;
          display: flex;
          align-items: center;
          gap: 0.8em;
          border: 2px solid transparent;
          transition: background .18s, color .18s, border .18s;
        }
        .taheel-lang-item.selected {
          background: linear-gradient(90deg, #14b8a6 60%, #2563eb 100%);
          color: #fff;
          border-color: #14b8a6;
        }
        .taheel-lang-item:hover {
          background: #2d3748;
          color: #22d3ee;
        }
        .taheel-modal-btn {
          background: linear-gradient(90deg, #2563eb 75%, #14b8a6 100%);
          color: #fff;
          font-size: 1.09rem;
          font-weight: bold;
          border-radius: 999px;
          padding: 0.65em 2em;
          box-shadow: 0 2px 12px #2563eb44;
          letter-spacing: 0.5px;
          margin-bottom: 1.1em;
          border: none;
          transition: background .18s;
        }
        .taheel-modal-btn:hover {
          background: linear-gradient(90deg, #1e40af 65%, #0f766e 100%);
        }
        ::-webkit-scrollbar {
          width: 8px;
          background: #222a36;
        }
        ::-webkit-scrollbar-thumb {
          background: #14b8a6;
          border-radius: 8px;
        }
      `}</style>
      <div className="taheel-modal-box flex flex-col items-center font-sans">
        <img src="/taheel-bot.png" alt={logoAlt} className="w-20 mb-3 drop-shadow-lg" />
        <h2 className="taheel-modal-title">{languageLabel}</h2>
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
        <button
          className="taheel-modal-btn w-full"
          onClick={() => onSelect(selectedLang)}
        >
          {continueBtn}
        </button>
      </div>
    </div>
  );
}