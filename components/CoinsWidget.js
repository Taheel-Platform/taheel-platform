"use client";
import { FaCoins } from "react-icons/fa";

export default function CoinsWidget({ coins = 0, lang = "ar" }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white rounded-xl shadow border border-yellow-100">
      <FaCoins className="text-yellow-400 text-xl" />
      <span className="font-bold text-yellow-700">
        {lang === "ar" ? "رصيد الكوينات:" : "Coins:"}
      </span>
      <span className="font-extrabold">{coins}</span>
    </div>
  );
}