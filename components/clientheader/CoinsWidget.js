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
      className="relative flex items-center justify-center bg-transparent border-none p-0 m-0 focus:outline-none cursor-pointer"
      title={valueText}
      tabIndex={0}
      style={{ minWidth: 36, minHeight: 36 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      whileHover={{ scale: 1.18, rotate: -8, filter: "brightness(1.15)" }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 250, damping: 18 }}
    >
      {/* أيقونة فقط بدون دائرة */}
      <FaCoins
        className="text-[26px] sm:text-[28px] lg:text-[32px] text-yellow-400 drop-shadow-lg transition-all duration-150"
        style={{
          filter: "drop-shadow(0 2px 7px #FFD60088)"
        }}
      />
      <span className="absolute -top-2 -right-2 bg-yellow-400 text-white text-[11px] font-bold rounded-full px-[6px] py-[2px] shadow border-2 border-white/80">
        {coins}
      </span>
      <AnimatePresence>
        {showTooltip && (
          <motion.span
            className="absolute left-1/2 -translate-x-1/2 top-9 z-50 bg-yellow-50 text-emerald-700 text-xs font-bold rounded px-3 py-1 shadow-xl border border-yellow-200 whitespace-nowrap"
            style={{ pointerEvents: "none" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16 }}
          >
            {valueText}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}