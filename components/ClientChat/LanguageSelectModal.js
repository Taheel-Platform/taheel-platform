import React, { useState } from "react";
import FlagsSelect from "react-flags-select";

export default function LanguageSelectModal({
  userName = "زائر",
  countries,
  countriesLang = {},
  onSelect
}) {
  // الدولة الافتراضية أول دولة في القائمة
  const firstCountry = Object.keys(countries)[0] || "EG";
  const [selectedCountry, setSelectedCountry] = useState(firstCountry);

  // اللغة الافتراضية بناء على الدولة المختارة
  const countryLang = countriesLang[selectedCountry] || "ar";

  // رسالة الترحيب حسب اللغة المتوقعة للدولة
  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! اختر دولتك للمتابعة. اسألني أي شيء وسأجيبك مباشرة.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Select your country to continue. Ask me anything and I'll respond right away.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Choisissez votre pays pour continuer. Posez-moi vos questions et je vous répondrai tout de suite.`
  };
  const logoAlt = countryLang === "ar" ? "تأهيل" : countryLang === "fr" ? "Taheel (FR)" : "Taheel";

  // عنوان الحقل
  const countryLabel = 
    countryLang === "ar" ? "اختيار اللغة" : 
    countryLang === "fr" ? "Choisir la langue" : 
    "Choose Language";

  return (
    <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white bg-opacity-90 font-sans">
      
<style>{`
  .flags-select__option,
  .flags-select__selected {
    color: #0b2545 !important;      /* لون كُحلي واضح */
    background: #ffffff !important; /* خلفية بيضاء */
    font-weight: 600 !important;
    font-size: 1rem !important;
  }
  
  .flags-select__option--is-selected {
    background-color: #e0f7fa !important; /* خلفية تحديد مميزة */
    color: #00695c !important;
  }

  .flags-select__option:hover {
    background-color: #f0f0f0 !important;
    color: #000 !important;
  }
`}</style>


      <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 min-w-[320px] max-w-[410px] flex flex-col items-center border-t-8 border-emerald-500 border font-sans">
        <img src="/taheel-logo.svg" alt={logoAlt} className="w-20 mb-3 drop-shadow-lg" />
        <h2 className="font-extrabold text-[1.35rem] text-emerald-800 mb-2">
          {countryLang === "ar"
            ? "اختيار اللغة"
            : countryLang === "fr"
            ? "Choisir la langue"
            : "Choose Language"}
        </h2>
        <p className="mb-4 text-center text-gray-700 font-medium leading-relaxed">
          {welcomeMessages[countryLang] || welcomeMessages["ar"]}
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
            selectedSize={18}
            optionsSize={16}
            searchable
          />
        </div>
        <button
          className="bg-gradient-to-br from-blue-600 to-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow hover:from-blue-700 hover:to-emerald-600 transition mb-2 w-full"
          style={{ letterSpacing: "0.5px" }}
          onClick={() => onSelect(countryLang, selectedCountry)}
        >
          {countryLang === "ar" ? "استمرار" : countryLang === "fr" ? "Continuer" : "Continue"}
        </button>
      </div>
    </div>
  );
}