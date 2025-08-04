"use client";
import { useState, useEffect } from "react";
import { FaWallet } from "react-icons/fa";

export default function WalletWidget({ balance = 0, onCharge, lang = "ar" }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white rounded-xl shadow border border-emerald-100">
      <FaWallet className="text-emerald-500 text-xl" />
      <span className="font-bold text-emerald-700">
        {lang === "ar" ? "المحفظة:" : "Wallet:"}
      </span>
      <span className="font-extrabold">{balance} AED</span>
      {typeof onCharge === "function" && (
        <button
          className="ml-4 px-4 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200 transition"
          onClick={() => onCharge(100)}
        >
          {lang === "ar" ? "شحن" : "Charge"}
        </button>
      )}
    </div>
  );
}