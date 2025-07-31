import React, { useState } from "react";
import FlagsSelect from "react-flags-select";
import countriesLang from "@/lib/countriesLang";

export default function LanguageSelectModal({ userName = "زائر", onSelect }) {
  const firstCountry = Object.keys(countriesLang)[0] || "EG";
  const [selectedCountry, setSelectedCountry] = useState(firstCountry);
  const [isLoading, setIsLoading] = useState(false);

  const countryLang = countriesLang[selectedCountry]?.lang || "ar";
  const dir = countryLang === "ar" ? "rtl" : "ltr";
  const fontFamily =
    countryLang === "ar"
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

  const handleContinue = () => {
    if (isLoading) return;
    setIsLoading(true);
    // تمرير كل القيم المطلوبة
    onSelect(countryLang, selectedCountry, countriesLang[selectedCountry]?.name, userName);
  };

  return (
    <div
      className="absolute inset-0 z-[1200] flex items-center justify-center"
      lang={countryLang}
      dir={dir}
      style={{
        fontFamily,
        background: "linear-gradient(120deg, #212a3a 70%, #18233a 100%)",
        transition: "background 0.3s",
        overflow: "visible",       
        zIndex: 9999              
      }}
    >
      <style>
        {`
          [class^="ReactFlagsSelect-module_menu_"] {
            background: linear-gradient(120deg,#18233a 70%,#22304a 100%) !important;
            border-radius: 14px !important;
            box-shadow: 0 8px 32px 0 #18233a99 !important;
            z-index: 9999 !important;
            direction: ${dir} !important;
          }
          [class^="ReactFlagsSelect-module_option_"],
          [class^="ReactFlagsSelect-module_selected_"] {
            color: #fff !important;
            background: #22304a !important;
            font-weight: 600 !important;
            font-size: 1rem !important;
            font-family: ${fontFamily} !important;
            direction: ${dir} !important;
            text-align: ${dir === "rtl" ? "right" : "left"} !important;
            border-radius: 10px !important;
            transition: background .2s;
          }
          [class^="ReactFlagsSelect-module_label_"] {
            background: #22304a !important;
            color: #fff !important;
            padding: 2px 8px !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 1rem !important;
            font-family: ${fontFamily} !important;
            direction: ${dir} !important;
            text-align: ${dir === "rtl" ? "right" : "left"} !important;
            display: inline-block !important;
          }
          [class^="ReactFlagsSelect-module_option_--is-selected"] {
            background-color: #10b981 !important;
            color: #fff !important;
          }
          [class^="ReactFlagsSelect-module_option_"]:hover,
          [class^="ReactFlagsSelect-module_label_"]:hover {
            background-color: #293556 !important;
            color: #b8f7ed !important;
          }
          [class^="ReactFlagsSelect-module_search_"] {
            background: #22304a !important;
            color: #fff !important;
            border-radius: 8px !important;
            font-size: 1rem !important;
            margin-bottom: 6px !important;
            border: 1px solid #293556 !important;
            direction: ${dir} !important;
            text-align: ${dir === "rtl" ? "right" : "left"} !important;
          }
        `}
      </style>
      <div
        className="rounded-2xl shadow-2xl px-8 py-7 min-w-[320px] max-w-[410px] flex flex-col items-center border-t-8 border-emerald-500 font-sans"
        style={{
          boxShadow: "0 8px 32px 0 #22304a22",
          borderBottom: "4px solid #10b981",
          background: "linear-gradient(120deg, #212a3a 70%, #18233a 100%)",
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
          className="font-extrabold text-[1.35rem] text-emerald-400 mb-2"
          style={{ fontFamily, textShadow: "0 2px 8px #22304a99" }}
        >
          {countryLang === "ar"
            ? "اختيار الدولة"
            : countryLang === "fr"
            ? "Choisir le pays"
            : "Choose Country"}
        </h2>
        <p
          className="mb-4 text-center"
          style={{
            color: "#b6c8e1",
            fontFamily,
            fontWeight: 500,
            lineHeight: "1.7"
          }}
        >
          {welcomeMessages[countryLang] || welcomeMessages["ar"]}
        </p>
        <div className="w-full mb-4">
          <label
            className="block mb-1 text-emerald-400 font-semibold text-sm"
            style={{ fontFamily }}
          >
            {countryLabel}
          </label>
          <FlagsSelect
            countries={Object.keys(countriesLang)}
            customLabels={Object.fromEntries(
              Object.entries(countriesLang).map(([code, obj]) => [code, obj.name])
            )}
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
          className={`bg-gradient-to-br from-emerald-600 to-blue-700 text-white px-6 py-2 rounded-full font-bold shadow hover:from-emerald-700 hover:to-blue-900 transition mb-2 w-full text-lg ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
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
          <span className="text-xs font-semibold" style={{ color: "#b6c8e1", fontFamily }}>
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