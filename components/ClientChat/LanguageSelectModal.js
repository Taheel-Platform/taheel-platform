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

  const countryLang = countriesLang[selectedCountry] || "ar";
  const dir = countryLang === "ar" ? "rtl" : "ltr";
  const fontFamily = countryLang === "ar"
    ? "'Tajawal', 'Segoe UI', sans-serif"
    : "'Segoe UI', 'Tajawal', sans-serif";

  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! يرجى اختيار دولتك للمتابعة. ستصلك رسالة ترحيب تلقائية بلغتك.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Please select your country to continue. You will receive an instant welcome message in your language.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Veuillez choisir votre pays pour continuer. Vous recevrez un message de bienvenue instantané dans votre langue.`
  };

  const countryLabel =
    countryLang === "ar" ? "اختر دولتك" :
    countryLang === "fr" ? "Choisissez votre pays" : "Choose your Country";

  const logoAlt = countryLang === "ar" ? "تأهيل" :
    countryLang === "fr" ? "Taheel (FR)" : "Taheel";

  // ألوان عصرية وهادئة
  const navy2 = "#22304a";
  const navy3 = "#293556";
  const accent = "#1565c0";
  const white = "#fff";
  const grayText = "#b6c8e1";

  const handleContinue = () => {
    if (isLoading) return;
    setIsLoading(true);
    onSelect(countryLang, selectedCountry, userName);
  };

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      lang={countryLang}
      dir={dir}
      style={{
        fontFamily,
        background: "rgba(24,35,58,0.87)",
        transition: "background 0.3s"
      }}
    >
      <style>
      {`
        .flags-select__menu {
          position: fixed !important;
          left: 50% !important;
          top: 32% !important;
          transform: translateX(-50%) !important;
          z-index: 9999 !important;
          min-width: 270px !important;
          max-width: 380px !important;
          background: linear-gradient(120deg,#293556,#22304a) !important;
          border-radius: 14px !important;
          box-shadow: 0 6px 32px 0 #0008 !important;
        }
        .flags-select__option,
        .flags-select__selected {
          color: ${white} !important;
          background: ${navy2} !important;
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
          background-color: ${navy3} !important;
          color: #b8f7ed !important;
        }
      `}
      </style>
      <div
        className="rounded-3xl shadow-2xl px-8 py-7 min-w-[330px] max-w-[430px] flex flex-col items-center border-t-8 border-blue-700 relative font-sans"
        style={{
          boxShadow: "0 8px 32px 0 #29355633",
          borderBottom: "4px solid #22304a",
          background: "linear-gradient(120deg,#202a3c 70%,#293556 100%)",
          width: "100%",
          minWidth: "320px",
          maxWidth: "430px"
        }}
      >
        <img src="/taheel-bot.png"
          alt={logoAlt}
          className="w-20 mb-3 drop-shadow-lg animate-bounce"
          style={{ filter: "drop-shadow(0 4px 14px #0b2545a0)" }}
        />
        <h2
          className="font-extrabold text-[1.35rem] mb-2 tracking-wide"
          style={{
            color: white,
            fontFamily,
            textShadow: "0 2px 8px #29355699"
          }}
        >
          {countryLang === "ar"
            ? "اختيار الدولة"
            : countryLang === "fr"
            ? "Choisir le pays"
            : "Choose Country"}
        </h2>
        <p
          className="mb-4 text-center font-medium leading-relaxed"
          style={{
            color: grayText,
            fontFamily,
            lineHeight: "1.7"
          }}
        >
          {welcomeMessages[countryLang] || welcomeMessages["ar"]}
        </p>
        <div className="w-full mb-4">
          <label
            className="block mb-1 font-semibold text-sm"
            style={{ color: white, fontFamily }}
          >
            {countryLabel}
          </label>
          <div
            className="rounded-xl overflow-hidden shadow"
            style={{ background: navy2, borderRadius: "12px" }}
          >
            <FlagsSelect
              countries={Object.keys(countries)}
              customLabels={countries}
              selected={selectedCountry}
              onSelect={code => setSelectedCountry(code)}
              showSelectedLabel={true}
              showOptionLabel={true}
              alignOptions={dir === "rtl" ? "right" : "left"}
              className="w-full"
              selectedSize={20}
              optionsSize={16}
              searchable
            />
          </div>
        </div>
        <button
          className={`bg-gradient-to-br from-blue-700 to-blue-500 text-white px-6 py-2 rounded-full font-bold shadow hover:from-blue-900 hover:to-blue-700 transition mb-2 w-full text-lg ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
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