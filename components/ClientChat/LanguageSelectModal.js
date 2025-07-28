import React, { useState } from "react";
import FlagsSelect from "react-flags-select";

export default function LanguageSelectModal({
  defaultLang = "ar",
  userName = "زائر",
  countries,
  countriesLang = {},
  onSelect
}) {
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const firstCountry = Object.keys(countries)[0] || "EG";
  const [selectedCountry, setSelectedCountry] = useState(firstCountry);

  // رسالة الترحيب حسب اللغة
  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! يمكنك اختيار اللغة والدولة للمتابعة. اسألني أي شيء وسأجيبك مباشرة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Choose your language and country to continue. Ask me anything and I'll respond right away.`,
  };
  const logoAlt = selectedLang === "ar" ? "تأهيل" : "Taheel";

  // خيارات اللغة
  const langs = [
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ];

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white bg-opacity-90 font-sans">
      <style>{`
        .flags-select__option, .flags-select__selected {
          color: #222 !important;
          font-weight: bold;
          background: transparent !important;
          font-family: Tahoma, Arial, sans-serif !important;
          font-size: 1rem !important;
        }
        .flags-select__option--is-selected {
          background: #e0f7fa !important;
        }
        .flags-select__option {
          border-bottom: 1px solid #e0e0e0 !important;
        }
        .flags-select__list {
          border: 1px solid #90cdf4 !important;
          border-radius: 10px !important;
          background: #fff;
        }
        .flags-select__selected {
          border: 1.5px solid #059669 !important;
          border-radius: 10px !important;
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 min-w-[320px] max-w-[410px] flex flex-col items-center border-t-8 border-emerald-500 border font-sans">
        <img src="/taheel-logo.svg" alt={logoAlt} className="w-20 mb-3 drop-shadow-lg" />
        <h2 className="font-extrabold text-[1.35rem] text-emerald-800 mb-2">
          {selectedLang === "ar" ? "اختيار اللغة والدولة" : "Choose Language & Country"}
        </h2>
        <p className="mb-4 text-center text-gray-700 font-medium leading-relaxed">
          {welcomeMessages[selectedLang]}
        </p>
        {/* اختيار اللغة */}
        <div className="w-full mb-3">
          <label className="block mb-1 text-emerald-700 font-semibold text-sm">
            {selectedLang === "ar" ? "اللغة" : "Language"}
          </label>
          <select
            className="w-full border border-emerald-600 rounded-md px-3 py-2 outline-none text-gray-900 font-bold bg-white"
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            style={{ direction: "ltr" }}
          >
            {langs.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        {/* اختيار الدولة */}
        <div className="w-full mb-4">
          <label className="block mb-1 text-emerald-700 font-semibold text-sm">
            {selectedLang === "ar" ? "الدولة" : "Country"}
          </label>
          <FlagsSelect
            countries={Object.keys(countries)}
            customLabels={countries}
            selected={selectedCountry}
            onSelect={code => setSelectedCountry(code)}
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
          onClick={() => onSelect(selectedLang, selectedCountry)}
        >
          {selectedLang === "ar" ? "استمرار" : "Continue"}
        </button>
      </div>
    </div>
  );
}