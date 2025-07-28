import React, { useState } from "react";
import FlagsSelect from "react-flags-select";

export default function LanguageSelectModal({ defaultLang = "ar", userName = "زائر", countries, onSelect }) {
  const [selectedLang, setSelectedLang] = useState(defaultLang);

  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! يمكنك اختيار اللغة والدولة للمتابعة. اسألني أي شيء وسأجيبك مباشرة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Choose your language and country to continue. Ask me anything and I'll respond right away.`,
  };
  const logoAlt = selectedLang === "ar" ? "تأهيل" : "Taheel";

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white bg-opacity-90">
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
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 min-w-[320px] max-w-[410px] flex flex-col items-center border-t-8 border-emerald-500 border">
        <img src="/taheel-logo.svg" alt={logoAlt} className="w-20 mb-3 drop-shadow-lg" />
        <h2 className="font-extrabold text-[1.35rem] text-emerald-800 mb-2">
          {selectedLang === "ar" ? "اختيار اللغة والدولة" : "Choose Language & Country"}
        </h2>
        <p className="mb-4 text-center text-gray-700 font-medium leading-relaxed">
          {welcomeMessages[selectedLang]}
        </p>
        <div className="w-full mb-4">
          <FlagsSelect
            countries={Object.keys(countries)}
            customLabels={countries}
            selected={selectedLang}
            onSelect={setSelectedLang}
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
          className="bg-gradient-to-br from-blue-600 to-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow hover:from-blue-700 hover:to-emerald-600 transition mb-2 w-full"
          style={{ letterSpacing: "0.5px" }}
          onClick={() => onSelect(selectedLang)}
        >
          {selectedLang === "ar" ? "استمرار" : "Continue"}
        </button>
      </div>
    </div>
  );
}