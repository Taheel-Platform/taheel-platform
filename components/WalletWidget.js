"use client";
import { FaWallet } from "react-icons/fa";

export default function WalletWidget({ balance = 0, onCharge, lang = "ar" }) {
  return (
    <button
      type="button"
      className="relative flex items-center justify-center bg-transparent border-none p-0 m-0 focus:outline-none"
      title={lang === "ar" ? "رصيد المحفظة" : "Wallet Balance"}
      style={{ minWidth: 42, minHeight: 42 }}
      tabIndex={0}
      onClick={typeof onCharge === "function" ? () => onCharge(100) : undefined}
    >
      <FaWallet className="text-emerald-500 text-2xl" />
      <span className="absolute -top-2 -right-2 bg-emerald-700 text-white text-xs font-bold rounded-full px-1 shadow">
        {balance}
      </span>
    </button>
  );
}