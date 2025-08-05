"use client";
import { FaCoins } from "react-icons/fa";
import { useState } from "react";

export default function CoinsWidget({ coins = 0, lang = "ar" }) {
  // حساب الدرهم والفلس
  const dirhams = Math.floor(coins * 0.01); // عدد الدراهم الصحيحة
  const fils = Math.round((coins * 0.01 - dirhams) * 100); // الفلس (0-99)

  // نص العرض
  const valueText =
    lang === "ar"
      ? `رصيدك: ${coins} كوين = ${dirhams} درهم${fils > 0 ? ` و${fils} فلس` : ""}`
      : `Your balance: ${coins} coins = ${dirhams} AED${fils > 0 ? ` and ${fils} fils` : ""}`;

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <button
      type="button"
      className="relative flex items-center justify-center bg-transparent border-none p-0 m-0 focus:outline-none"
      title={valueText}
      style={{ minWidth: 42, minHeight: 42 }}
      tabIndex={0}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <FaCoins className="text-yellow-400 text-2xl" />
      <span className="absolute -top-2 -right-2 bg-gray-800 text-yellow-300 text-xs font-bold rounded-full px-1 shadow">
        {coins}
      </span>
      {/* Tooltip custom يظهر عند الوقوف */}
      {showTooltip && (
        <span
          className="absolute left-1/2 -translate-x-1/2 top-9 z-50 bg-yellow-100 text-emerald-900 text-xs font-bold rounded px-3 py-1 shadow-xl border border-yellow-200 whitespace-nowrap"
          style={{ pointerEvents: "none" }}
        >
          {valueText}
        </span>
      )}
    </button>
  );
}