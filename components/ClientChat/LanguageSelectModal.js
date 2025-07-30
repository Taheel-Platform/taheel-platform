import React, { useState } from "react";
import FlagsSelect from "react-flags-select";

export default function LanguageSelectModal({
  userName = "زائر",
  countries,
  countriesLang = {},
  onSelect
}) {
  // أول دولة في القائمة
  const firstCountry = Object.keys(countries)[0] || "EG";
  const [selectedCountry, setSelectedCountry] = useState(firstCountry);

  // لغة الدولة المختارة
  const countryLang = countriesLang[selectedCountry] || "ar";

  // رسالة ترحيب حسب اللغة، ودعم الترحيب الافتراضي لأي لغة أخرى
  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! اختر دولتك للمتابعة. اسألني أي شيء وسأجيبك مباشرة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Select your country to continue. Ask me anything and I'll respond right away.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Choisissez votre pays pour continuer. Posez-moi vos questions et je vous répondrai tout de suite.`
  };
  // ترحيب افتراضي لأي لغة غير مدعومة
  const fallbackWelcome = `Welcome ${userName} 👋 to Taheel platform! Select your country to continue. Ask me anything and I'll respond right away.`;

  // شعار المنصة حسب اللغة
  const logoAlt =
    countryLang === "ar"
      ? "تأهيل"
      : countryLang === "fr"
      ? "Taheel (FR)"
      : "Taheel";

  // عنوان اختيار الدولة حسب اللغة
  const countryLabel =
    countryLang === "ar"
      ? "اختيار الدولة"
      : countryLang === "fr"
      ? "Choisir le pays"
      : "Choose Country";

  // عنوان اختيار اللغة حسب اللغة
  const languageLabel =
    countryLang === "ar"
      ? "اختيار اللغة"
      : countryLang === "fr"
      ? "Choisir la langue"
      : "Choose Language";

  // عنوان زر الاستمرار حسب اللغة
  const continueBtn =
    countryLang === "ar"
      ? "استمرار"
      : countryLang === "fr"
      ? "Continuer"
      : "Continue";

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white bg-opacity-90 font-sans">
<style>{`
  .flags-select__option,
  .flags-select__selected {
    color: #222 !important;
    background: #f9fafb !important;
    font-weight: 700 !important;
    font-size: 1.08rem !important;
    font-family: 'Tajawal', 'Segoe UI', sans-serif !important;
    direction: rtl !important;
    text-align: right !important;
    padding: 9px 20px !important;
    border-radius: 9px !important;
    letter-spacing: 0.01em;
    transition: color .2s, background .2s;
  }
  .flags-select__option--is-selected {
    background-color: #e0f7fa !important;
    color: #014d40 !important;
  }
  .flags-select__option:hover {
    background-color: #e6f7ff !important;
    color: #0057b8 !important;
  }
  .flags-select__menu {
    direction: rtl !important;
    background: #f6f8fb !important;
    border-radius: 10px !important;
    box-shadow: 0 2px 18px #b7e7e733;
    border: 1px solid #dde8e8 !important;
  }
`}</style>

      <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 min-w-[320px] max-w-[410px] flex flex-col items-center border-t-8 border-emerald-500 font-sans">
        <img src="/taheel-bot.png" alt={logoAlt} className="w-20 mb-3 drop-shadow-lg" />
        <h2 className="font-extrabold text-[1.35rem] text-emerald-800 mb-2">
          {languageLabel}
        </h2>
        <p className="mb-4 text-center text-gray-700 font-medium leading-relaxed">
          {welcomeMessages[countryLang] || fallbackWelcome}
        </p>
        {/* اختيار الدولة */}
        <div className="w-full mb-4">
          <label className="block mb-1 text-emerald-700 font-semibold text-sm">
            {countryLabel}
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
            selectedSize={22}
            optionsSize={20}
            searchable
          />
        </div>
        <button
          className="bg-gradient-to-br from-blue-600 to-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow hover:from-blue-700 hover:to-emerald-600 transition mb-2 w-full"
          style={{ letterSpacing: "0.5px", fontSize: "1.09rem" }}
          onClick={() => onSelect(countryLang, selectedCountry)}
        >
          {continueBtn}
        </button>
      </div>
    </div>
  );
}