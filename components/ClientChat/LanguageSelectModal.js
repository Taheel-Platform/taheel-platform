import React, { useState } from "react";

const LANGUAGES = [
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  // يمكنك إضافة لغات أخرى حسب احتياجك
];

export default function LanguageSelectModal({
  userName = "زائر",
  onSelect
}) {
  const [selectedLang, setSelectedLang] = useState("ar");

  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! اختر لغتك للمتابعة. اسألني أي شيء وسأجيبك مباشرة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Select your language to continue. Ask me anything and I'll respond right away.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Choisissez votre langue pour continuer. Posez-moi vos questions et je vous répondrai tout de suite.`
  };
  const fallbackWelcome = `Welcome ${userName} 👋 to Taheel platform! Select your language to continue. Ask me anything and I'll respond right away.`;

  const logoAlt = selectedLang === "ar"
    ? "تأهيل"
    : selectedLang === "fr"
    ? "Taheel (FR)"
    : "Taheel";

  const languageLabel = selectedLang === "ar"
    ? "اختيار اللغة"
    : selectedLang === "fr"
    ? "Choisir la langue"
    : "Choose Language";

  const continueBtn = selectedLang === "ar"
    ? "استمرار"
    : selectedLang === "fr"
    ? "Continuer"
    : "Continue";

  return (
    <div className="taheel-modal-bg absolute inset-0 z-[1100] flex items-center justify-center font-sans">
      <style>{`
        .taheel-modal-bg {
          background: linear-gradient(120deg, #f3f6fa 65%, #eafbf6 100%);
        }
        .taheel-modal-box {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 6px 32px #00c6a233;
          border-top: 8px solid #14b8a6;
          padding: 2.2rem 2rem;
          min-width: 320px;
          max-width: 420px;
        }
        .taheel-modal-title {
          color: #0f766e;
          font-weight: 800;
          font-size: 1.32rem;
          margin-bottom: 0.7rem;
          letter-spacing: 0.01em;
          font-family: 'Tajawal', 'Cairo', Arial, Helvetica, sans-serif;
        }
        .taheel-modal-welcome {
          color: #374151;
          font-size: 1rem;
          font-weight: 500;
          background: #f6f8fa;
          border-radius: 8px;
          padding: 0.7em 1.1em;
          margin-bottom: 1.1em;
          text-align: center;
          box-shadow: 0 2px 8px #b7e7e733;
        }
        .taheel-lang-list {
          display: flex;
          flex-direction: column;
          gap: 0.7em;
          width: 100%;
          margin-bottom: 1.4em;
        }
        .taheel-lang-item {
          cursor: pointer;
          background: #f9fafb;
          color: #1e293b;
          font-size: 1.07rem;
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
          background: linear-gradient(90deg, #e0f7fa 60%, #b2f5ea 100%);
          color: #14b8a6;
          border-color: #14b8a6;
        }
        .taheel-lang-item:hover {
          background: #e6f7ff;
          color: #0e7490;
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
      `}</style>
      <div className="taheel-modal-box flex flex-col items-center font-sans">
        <img src="/taheel-bot.png" alt={logoAlt} className="w-20 mb-3 drop-shadow-lg" />
        <h2 className="taheel-modal-title">{languageLabel}</h2>
        <p className="taheel-modal-welcome">{welcomeMessages[selectedLang] || fallbackWelcome}</p>
        {/* اختيار اللغة */}
        <div className="taheel-lang-list">
          {LANGUAGES.map(lang =>
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