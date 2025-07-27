import React, { useState } from "react";
import FlagsSelect from "react-flags-select";
import countriesData from "../lib/countries-ar-en.js"; // ملف فيه كل اللغات والاعلام

export default function LanguageSelectModal({ defaultLang, onSelect }) {
  const [selectedLang, setSelectedLang] = useState(defaultLang);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black bg-opacity-20">
      <div className="bg-white rounded-2xl shadow-2xl p-7 min-w-[320px] max-w-[400px] flex flex-col items-center border-emerald-400 border">
        <img src="/taheel-logo.svg" alt="Taheel" className="w-16 mb-2" />
        <h2 className="text-emerald-900 font-bold text-lg mb-2">اختيار اللغة</h2>
        <FlagsSelect
          countries={Object.keys(countriesData)}
          customLabels={countriesData}
          selected={selectedLang}
          onSelect={setSelectedLang}
          className="mb-3"
        />
        <button
          className="bg-gradient-to-br from-emerald-600 to-emerald-400 text-white px-6 py-2 rounded-full font-bold shadow hover:from-emerald-700 hover:to-emerald-500"
          onClick={() => onSelect(selectedLang)}
        >
          موافق
        </button>
      </div>
    </div>
  );
}