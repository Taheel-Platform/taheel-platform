import React, { useState } from "react";
import FlagsSelect from "react-flags-select";

export default function LanguageSelectModal({
  defaultLang = "ar",
  userName = "زائر",
  countries,
  onSelect,
}) {
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const [selectedCountry, setSelectedCountry] = useState("");

  const logoAlt = selectedLang === "ar" ? "تأهيل" : "Taheel";

  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! اختر اللغة والدولة للمتابعة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Choose your language and country to continue.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Choisissez la langue et le pays pour continuer.`,
  };

  return (
    <div className="bg-white border border-emerald-400 rounded-2xl shadow-md px-4 py-4 mb-3 max-w-[350px] w-full self-center flex flex-col items-center">
      <style>{`
        .flags-select__option, .flags-select__selected {
          color: #212121 !important;
          font-weight: bold;
          background: transparent !important;
        }
        .flags-select__option--is-selected {
          background: #e0f7fa !important;
        }
      `}</style>
      <img src="/taheel-logo.svg" alt={logoAlt} className="w-16 mb-2 drop-shadow-lg" />
      <h2 className="font-bold text-[1.1rem] text-emerald-800 mb-1">
        {selectedLang === "ar" ? "اختيار اللغة والدولة" : selectedLang === "en" ? "Choose Language & Country" : "Choisissez la langue et le pays"}
      </h2>
      <p className="mb-3 text-center text-gray-700 font-medium text-[0.95rem] leading-relaxed">
        {welcomeMessages[selectedLang]}
      </p>
      <div className="w-full mb-2">
        {/* لغة */}
        <select
          className="w-full rounded border px-3 py-2 mb-2 text-gray-700"
          value={selectedLang}
          onChange={e => setSelectedLang(e.target.value)}
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
        {/* دولة */}
        <FlagsSelect
          countries={Object.keys(countries)}
          customLabels={countries}
          selected={selectedCountry}
          onSelect={setSelectedCountry}
          showSelectedLabel={true}
          showOptionLabel={true}
          alignOptions="left"
          className="w-full"
          selectedSize={18}
          optionsSize={16}
          searchable
        />
      </div>
      <button
        className="bg-gradient-to-br from-blue-600 to-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow hover:from-blue-700 hover:to-emerald-600 transition w-full"
        style={{ letterSpacing: "0.5px" }}
        onClick={() => selectedCountry && onSelect(selectedLang, selectedCountry)}
        disabled={!selectedCountry}
      >
        {selectedLang === "ar" ? "استمرار" : selectedLang === "en" ? "Continue" : "Continuer"}
      </button>
    </div>
  );
}