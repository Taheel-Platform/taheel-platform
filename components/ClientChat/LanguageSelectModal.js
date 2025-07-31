"use client";

import { useState } from "react";
import ReactFlagsSelect from "react-flags-select";
import { countriesLang } from "@/lib/countriesLang"; // تأكد ده الملف الصح

export default function LanguageSelectModal({ onSelect }) {
  const [selectedCountry, setSelectedCountry] = useState("");

  const handleSelect = (code) => {
    setSelectedCountry(code);
    const selectedLang = countriesLang[code]?.lang || "en";
    const direction = selectedLang === "ar" ? "rtl" : "ltr";

    // تغيير اللغة والاتجاه
    document.documentElement.lang = selectedLang;
    document.documentElement.dir = direction;

    // لو فيه كول باك من الأب
    if (onSelect) onSelect({ code, lang: selectedLang });

    // حفظه في localStorage لو محتاجين
    localStorage.setItem("clientCountry", code);
    localStorage.setItem("clientLang", selectedLang);
    localStorage.setItem("direction", direction);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg relative z-[10000]">
        <h2 className="text-center text-xl font-bold mb-4 text-gray-800">
          اختر دولتك / Select Your Country
        </h2>
        <ReactFlagsSelect
          countries={Object.keys(countriesLang)}
          selected={selectedCountry}
          onSelect={handleSelect}
          searchable={true}
          fullWidth={true}
          placeholder="اختار دولتك"
          className="w-full"
        />
      </div>
    </div>
  );
}
