import React, { useEffect, useState, useRef } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef();

  // عنوان الحقل حسب اللغة
  const countryLabel =
    countryLang === "ar" ? "اختر دولتك" :
    countryLang === "fr" ? "Choisissez votre pays" :
    "Choose your Country";

  // رسالة الترحيب حسب اللغة
  const welcomeMessages = {
    ar: `مرحبًا بك ${userName} 👋 في منصة تأهيل! يرجى اختيار دولتك واللغة المناسبة للمتابعة. ستصلك رسالة ترحيب تلقائية بلغتك.`,
    en: `Welcome ${userName} 👋 to Taheel platform! Please select your country and preferred language to continue. You will receive an instant welcome message in your language.`,
    fr: `Bienvenue ${userName} 👋 sur la plateforme Taheel ! Veuillez choisir votre pays et la langue souhaitée pour continuer. Vous recevrez un message de bienvenue instantané dans votre langue.`
  };
  const logoAlt = countryLang === "ar" ? "تأهيل" : countryLang === "fr" ? "Taheel (FR)" : "Taheel";
  const dir = countryLang === "ar" ? "rtl" : "ltr";
  const fontFamily = countryLang === "ar" ? "Tajawal, Segoe UI, sans-serif" : "Segoe UI, Tajawal, sans-serif";

  // اغلاق المودال بالـ ESC
  useEffect(() => {
    const escHandler = (e) => {
      if (e.key === "Escape") {
        setIsLoading(false);
      }
    };
    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
  }, []);

  // ارسال اختيار اللغة والدولة مع حماية عند الضغط
  const handleContinue = () => {
    if (isLoading) return;
    setIsLoading(true);
    onSelect(countryLang, selectedCountry);
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-gradient-to-br from-[#e9f9f6]/85 via-[#dbeffd]/85 to-[#b8f7ed]/85 backdrop-blur-[2.5px]"
      lang={countryLang}
      dir={dir}
      style={{ fontFamily, transition: "all .25s" }}
    >
      <style>
        {`
        .flags-select__option,
        .flags-select__selected {
          color: #0b2545 !important;
          background: #ffffff !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          font-family: ${fontFamily} !important;
          direction: ${dir} !important;
          text-align: ${dir === "rtl" ? "right" : "left"} !important;
        }
        .flags-select__option--is-selected {
          background-color: #e0f7fa !important;
          color: #00695c !important;
        }
        .flags-select__option:hover {
          background-color: #f0f4f8 !important;
          color: #00897b !important;
        }
        .flags-select__menu {
          direction: ${dir} !important;
        }
        `}
      </style>
      <div className="bg-white rounded-3xl shadow-2xl px-8 py-7 min-w-[330px] max-w-[430px] flex flex-col items-center border-t-8 border-emerald-500 relative animate-fadeIn font-sans"
           style={{
             boxShadow: "0 8px 32px 0 rgba(16,185,129,0.12)",
             borderBottom: "4px solid #edf7f6"
           }}>
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
        <button
          className={`bg-gradient-to-br from-blue-600 to-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow hover:from-blue-700 hover:to-emerald-600 transition mb-2 w-full text-lg ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
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