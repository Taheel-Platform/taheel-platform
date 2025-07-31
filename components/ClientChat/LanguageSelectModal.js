import React, { useEffect, useState } from "react";
import FlagsSelect from "react-flags-select";

export default function LanguageSelectModal({
  userName = "زائر",
  countries,
  countriesLang = {},
  onSelect
}) {
  const firstCountry = Object.keys(countries)[0] || "EG";
  const [selectedCountry, setSelectedCountry] = useState(firstCountry);
  const countryLang = countriesLang[selectedCountry] || "ar";
  const [isLoading, setIsLoading] = useState(false);

  const countryLabel =
    countryLang === "ar" ? "اختر دولتك" :
    countryLang === "fr" ? "Choisissez votre pays" :
    "Choose your Country";

  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! يرجى اختيار دولتك واللغة المناسبة للمتابعة. ستصلك رسالة ترحيب تلقائية بلغتك.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Please select your country and preferred language to continue. You will receive an instant welcome message in your language.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Veuillez choisir votre pays et la langue souhaitée pour continuer. Vous recevrez un message de bienvenue instantané dans votre langue.`
  };
  const logoAlt = countryLang === "ar" ? "تأهيل" : countryLang === "fr" ? "Taheel (FR)" : "Taheel";
  const dir = countryLang === "ar" ? "rtl" : "ltr";
  const fontFamily = countryLang === "ar" ? "Tajawal, Segoe UI, sans-serif" : "Segoe UI, Tajawal, sans-serif";

  // ألوان داكنة جدا للقائمة
  const selectMenuBg = "linear-gradient(120deg,#113c3c 60%,#134d4d 100%)";
  const selectOptionBg = "#134d4d";
  const selectOptionHoverBg = "#157264";
  const selectOptionColor = "#fff";

  // عند الضغط على استمرار يرسل كل البيانات المطلوبة للـ onSelect
  const handleContinue = () => {
    if (isLoading) return;
    setIsLoading(true);
    // يرسل اللغة، الدولة، الاسم
    onSelect(countryLang, selectedCountry, userName);
  };

  return (
    <div
      className="absolute inset-0 z-[1200] flex items-center justify-center"
      lang={countryLang}
      dir={dir}
      style={{
        background: "transparent",
        pointerEvents: "auto",
        fontFamily,
      }}
    >
      <style>
        {`
        .flags-select__option,
        .flags-select__selected {
          color: ${selectOptionColor} !important;
          background: ${selectOptionBg} !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          font-family: ${fontFamily} !important;
          direction: ${dir} !important;
          text-align: ${dir === "rtl" ? "right" : "left"} !important;
          border-radius: 8px !important;
        }
        .flags-select__menu {
          background: ${selectMenuBg} !important;
          border-radius: 12px !important;
          box-shadow: 0 6px 32px 0 #135d6b22;
        }
        .flags-select__option--is-selected {
          background-color: #10b981 !important;
          color: #ffffff !important;
        }
        .flags-select__option:hover {
          background-color: ${selectOptionHoverBg} !important;
          color: #b8f7ed !important;
        }
        `}
      </style>
      <div
        className="rounded-3xl shadow-2xl px-8 py-7 min-w-[330px] max-w-[430px] flex flex-col items-center border-t-8 border-emerald-500 relative animate-fadeIn font-sans"
        style={{
          boxShadow: "0 8px 32px 0 #10b98122",
          borderBottom: "4px solid #edf7f6",
          background: "linear-gradient(120deg,#eafbf6 60%,#e1f7fa 100%)",
          maxWidth: "430px",
          width: "100%",
          minWidth: "320px"
        }}
      >
        <img src="/taheel-bot.png"
             alt={logoAlt}
             className="w-20 mb-3 drop-shadow-lg animate-bounce"
             style={{ filter: "drop-shadow(0 4px 14px #0b2545a0)" }}
        />
        <h2 className="font-extrabold text-[1.35rem] text-emerald-800 mb-2 tracking-wide" style={{ fontFamily }}>
          {countryLang === "ar"
            ? "اختيار اللغة والدولة"
            : countryLang === "fr"
            ? "Choisir la langue et le pays"
            : "Choose Language & Country"}
        </h2>
        <p className="mb-4 text-center text-gray-700 font-medium leading-relaxed" style={{ fontFamily }}>
          {welcomeMessages[countryLang] || welcomeMessages["ar"]}
        </p>
        {/* اختيار الدولة */}
        <div className="w-full mb-4">
          <label className="block mb-1 text-emerald-700 font-semibold text-sm" style={{ fontFamily }}>
            {countryLabel}
          </label>
          <div className="rounded-xl overflow-hidden shadow" style={{ background: selectMenuBg }}>
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
          className={`bg-gradient-to-br from-emerald-600 to-blue-500 text-white px-6 py-2 rounded-full font-bold shadow hover:from-emerald-700 hover:to-blue-600 transition mb-2 w-full text-lg ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          style={{
            letterSpacing: "0.5px",
            fontFamily,
            boxShadow: "0 2px 14px 0 #10b98142"
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
          <span className="text-xs text-gray-400 font-semibold" style={{ fontFamily }}>
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