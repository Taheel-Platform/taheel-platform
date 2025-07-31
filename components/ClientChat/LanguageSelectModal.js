import React, { useState } from "react";
import FlagsSelect from "react-flags-select";

export default function LanguageSelectModal({
  userName = "زائر",
  countries,
  countriesLang = {},
  onSelect
}) {
  const firstCountry = Object.keys(countries)[0] || "EG";
  const [selectedCountry, setSelectedCountry] = useState(firstCountry);
  const [isLoading, setIsLoading] = useState(false);

  // اللغة بناء على الدولة المختارة
  const countryLang = countriesLang[selectedCountry] || "ar";
  const dir = countryLang === "ar" ? "rtl" : "ltr";
  const fontFamily = countryLang === "ar"
    ? "'Tajawal', 'Segoe UI', sans-serif"
    : "'Segoe UI', 'Tajawal', sans-serif";

  // رسائل الترحيب
  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! يرجى اختيار دولتك للمتابعة. ستصلك رسالة ترحيب تلقائية بلغتك.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Please select your country to continue. You will receive an instant welcome message in your language.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Veuillez choisir votre pays pour continuer. Vous recevrez un message de bienvenue instantané dans votre langue.`
  };

  // عنوان الحقل
  const countryLabel =
    countryLang === "ar" ? "اختر دولتك" :
    countryLang === "fr" ? "Choisissez votre pays" : "Choose your Country";

  const logoAlt = countryLang === "ar" ? "تأهيل" :
    countryLang === "fr" ? "Taheel (FR)" : "Taheel";

  // ألوان غامقة للقائمة
  const darkBg = "linear-gradient(120deg,#1A233A 70%,#22304A 100%)";
  const darkSolid = "#22304a";
  const accent = "#10b981";
  const white = "#fff";
  const grayText = "#b6c8e1";
  const optionHover = "#233A56";

  // زر الاستمرار
  const handleContinue = () => {
    if (isLoading) return;
    setIsLoading(true);
    onSelect(countryLang, selectedCountry, userName);
  };

  return (
    <div
      className="absolute inset-0 z-[1100] flex items-center justify-center"
      lang={countryLang}
      dir={dir}
      style={{
        fontFamily,
        background: "rgba(24,35,58,0.92)",
        transition: "background 0.3s"
      }}
    >
      {/* ستايل مخصص للقائمة الغامقة */}
      <style>
      {`
        .flags-select__menu {
          background: ${darkBg} !important;
          border-radius: 14px !important;
          box-shadow: 0 8px 32px 0 #22304a55 !important;
          z-index: 9999 !important;
        }
        .flags-select__option,
        .flags-select__selected {
          color: ${white} !important;
          background: ${darkSolid} !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          font-family: ${fontFamily} !important;
          direction: ${dir} !important;
          text-align: ${dir === "rtl" ? "right" : "left"} !important;
          border-radius: 8px !important;
          transition: background .2s;
        }
        .flags-select__option--is-selected {
          background-color: ${accent} !important;
          color: ${white} !important;
        }
        .flags-select__option:hover {
          background-color: ${optionHover} !important;
          color: #b8f7ed !important;
        }
        .flags-select__menu {
          direction: ${dir} !important;
        }
      `}
      </style>
      <div
        className="bg-white rounded-2xl shadow-2xl px-8 py-7 min-w-[320px] max-w-[410px] flex flex-col items-center border-t-8 border-emerald-500 font-sans"
        style={{
          boxShadow: "0 8px 32px 0 #22304a22",
          borderBottom: "4px solid #eafbf6",
          background: "linear-gradient(120deg,#eafbf6 60%,#e1f7fa 100%)",
          minWidth: "320px",
          maxWidth: "430px"
        }}
      >
        <img
          src="/taheel-bot.png"
          alt={logoAlt}
          className="w-20 h-20 mb-3 drop-shadow-lg rounded-full"
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            boxShadow: "0 4px 14px #0b2545a0"
          }}
        />
        <h2
          className="font-extrabold text-[1.35rem] text-emerald-800 mb-2"
          style={{ fontFamily }}
        >
          {countryLang === "ar"
            ? "اختيار الدولة"
            : countryLang === "fr"
            ? "Choisir le pays"
            : "Choose Country"}
        </h2>
        <p
          className="mb-4 text-center text-gray-700 font-medium leading-relaxed"
          style={{ fontFamily }}
        >
          {welcomeMessages[countryLang] || welcomeMessages["ar"]}
        </p>
        {/* اختيار الدولة */}
        <div className="w-full mb-4">
          <label
            className="block mb-1 text-emerald-700 font-semibold text-sm"
            style={{ fontFamily }}
          >
            {countryLabel}
          </label>
          <FlagsSelect
            countries={Object.keys(countries)}
            customLabels={countries}
            selected={selectedCountry}
            onSelect={code => setSelectedCountry(code)}
            showSelectedLabel={true}
            showOptionLabel={true}
            alignOptions={dir === "rtl" ? "right" : "left"}
            className="w-full"
            selectedSize={18}
            optionsSize={16}
            searchable
          />
        </div>
        <button
          className={`bg-gradient-to-br from-blue-700 to-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow hover:from-blue-900 hover:to-emerald-700 transition mb-2 w-full text-lg ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          style={{
            letterSpacing: "0.5px",
            fontFamily,
            boxShadow: "0 2px 14px 0 #194b8a77"
          }}
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading
            ? (countryLang === "ar"
                ? "جاري التحميل..."
                : countryLang === "fr"
                ? "Chargement..."
                : "Loading...")
            : (countryLang === "ar"
                ? "استمرار"
                : countryLang === "fr"
                ? "Continuer"
                : "Continue")}
        </button>
        <div className="w-full pt-2 flex items-center justify-center">
          <span className="text-xs font-semibold" style={{ color: grayText, fontFamily }}>
            {countryLang === "ar"
              ? "الاختيار يحدد لغة الرسائل والترحيب تلقائيًا"
              : countryLang === "fr"
              ? "La sélection définit automatiquement la langue des messages et de bienvenue"
              : "Your selection sets the chat & welcome message language automatically"}
          </span>
        </div>
      </div>
    </div>
  );
}