"use client";
import { FaCoins } from "react-icons/fa";

export default function CoinsWidget({ coins = 0, lang = "ar" }) {
  return (
    <button
      type="button"
      className="relative flex items-center justify-center bg-transparent border-none p-0 m-0 focus:outline-none"
      title={lang === "ar" ? "رصيد الكوينات" : "Coins Balance"}
      style={{ minWidth: 42, minHeight: 42 }}
      tabIndex={0}
    >
      <FaCoins className="text-yellow-400 text-2xl" />
      <span className="absolute -top-2 -right-2 bg-gray-800 text-yellow-300 text-xs font-bold rounded-full px-1 shadow">
        {coins}
      </span>
    </button>
  );
}