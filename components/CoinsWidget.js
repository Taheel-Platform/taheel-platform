"use client";
import { FaCoins } from "react-icons/fa";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CoinsWidget({ coins = 0, lang = "ar" }) {
  // حساب الدرهم والفلس
  const dirhams = Math.floor(coins * 0.01);
  const fils = Math.round((coins * 0.01 - dirhams) * 100);

  // نص العرض
  const valueText =
    lang === "ar"
      ? `رصيدك: ${coins} كوين = ${dirhams} درهم${fils > 0 ? ` و${fils} فلس` : ""}`
      : `Your balance: ${coins} coins = ${dirhams} AED${fils > 0 ? ` and ${fils} fils` : ""}`;

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.button
      type="button"
      className="relative flex items-center justify-center bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-100 border-2 border-yellow-300 shadow-lg rounded-full w-11 h-11 transition hover:scale-105 focus:outline-none cursor-pointer"
      title={valueText}
      tabIndex={0}
      style={{ minWidth: 38, minHeight: 38 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      whileHover={{ scale: 1.11, rotate: -7 }}
      whileTap={{ scale: 0.97 }}
    >
      <FaCoins className="text-yellow-500 drop-shadow-lg text-xl" />
      <span className="absolute -top-2 -right-2 bg-emerald-500 text-yellow-100 text-[11px] font-bold rounded-full px-[6px] py-[1px] shadow border-2 border-white/80">
        {coins}
      </span>
      <AnimatePresence>
        {showTooltip && (
          <motion.span
            className="absolute left-1/2 -translate-x-1/2 top-12 z-50 bg-yellow-50 text-emerald-700 text-xs font-bold rounded px-3 py-1 shadow-xl border border-yellow-300 whitespace-nowrap"
            style={{ pointerEvents: "none" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.16 }}
          >
            {valueText}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}