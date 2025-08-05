"use client";
import { useState } from "react";
import { FaWallet } from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc, getDoc } from "firebase/firestore";

// خريطة خيارات الشحن والكوينات المجانية
const rechargeOptions = [
  { amount: 100, coins: 50, color: "bg-green-100" },
  { amount: 500, coins: 250, color: "bg-teal-100" },
  { amount: 1000, coins: 500, color: "bg-yellow-100" },
  { amount: 5000, coins: 2500, color: "bg-orange-100" },
];

export default function WalletWidget({
  balance = 0,
  userId,
  coins = 0,
  lang = "ar",
  onBalanceChange,
  onCoinsChange,
}) {
  const [showModal, setShowModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [msg, setMsg] = useState("");
  const [wallet, setWallet] = useState(balance);
  const [userCoins, setUserCoins] = useState(coins);

  // تحديث القيم في الأعلى وفي الأعلى لو احتاجت
  function updateLocalBalances(newWallet, newCoins) {
    setWallet(newWallet);
    setUserCoins(newCoins);
    if (typeof onBalanceChange === "function") onBalanceChange(newWallet);
    if (typeof onCoinsChange === "function") onCoinsChange(newCoins);
  }

  // دالة الشحن
  async function handleRecharge(amount, coinsBonus) {
    if (!userId) {
      setMsg(lang === "ar" ? "برجاء تسجيل الدخول" : "Please log in");
      return;
    }
    setIsPaying(true);
    setMsg("");
    try {
      const userRef = doc(firestore, "users", userId);

      // جلب الرصيد الحالي للتأكد من التحديث الصحيح
      const snap = await getDoc(userRef);
      let currentWallet = wallet, currentCoins = userCoins;
      if (snap.exists()) {
        const data = snap.data();
        currentWallet = Number(data.walletBalance ?? 0);
        currentCoins = Number(data.coins ?? 0);
      }

      // 1. تحديث رصيد المحفظة
      await updateDoc(userRef, { walletBalance: currentWallet + amount });

      // 2. إضافة الكوينات المجانية
      await updateDoc(userRef, { coins: currentCoins + coinsBonus });

      updateLocalBalances(currentWallet + amount, currentCoins + coinsBonus);

      setMsg(
        <span className="text-green-700 font-bold">
          {lang === "ar"
            ? `تم شحن المحفظة بـ${amount} درهم + ${coinsBonus} كوين مجانًا!`
            : `Wallet recharged with ${amount} AED + ${coinsBonus} coins!`}
        </span>
      );
      setIsPaying(false);
      setTimeout(() => {
        setShowModal(false);
        setMsg("");
      }, 2000);
    } catch (err) {
      setMsg(
        <span className="text-red-600 font-bold">
          {lang === "ar" ? "حدث خطأ أثناء الشحن" : "Recharge error"}
        </span>
      );
      setIsPaying(false);
    }
  }

  // نص الرصيد
  const valueText =
    lang === "ar"
      ? `رصيدك في المحفظة: ${wallet} درهم\nرصيد الكوينات: ${userCoins} كوين`
      : `Your wallet balance: ${wallet} AED\nCoins: ${userCoins}`;

  return (
    <>
      {/* زر المحفظة */}
      <button
        type="button"
        className="relative flex items-center justify-center bg-transparent border-none p-0 m-0 focus:outline-none cursor-pointer"
        title={valueText}
        style={{ minWidth: 42, minHeight: 42 }}
        tabIndex={0}
        onClick={() => setShowModal(true)}
      >
        <FaWallet className="text-emerald-500 text-2xl" />
        <span className="absolute -top-2 -right-2 bg-emerald-700 text-white text-xs font-bold rounded-full px-1 shadow">
          {wallet}
        </span>
      </button>

      {/* مودال خيارات الشحن */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
          tabIndex={-1}
          onClick={() => !isPaying && setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-emerald-200 max-w-xs w-full p-4 relative"
            style={{ minWidth: 250, maxWidth: 340 }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 left-2 text-gray-400 hover:text-red-700 text-2xl px-2"
              title={lang === "ar" ? "إغلاق" : "Close"}
              style={{ cursor: "pointer" }}
              disabled={isPaying}
            >×</button>
            <div className="text-center mb-2 text-lg font-bold text-emerald-800">
              {lang === "ar" ? "شحن المحفظة" : "Recharge Wallet"}
            </div>
            <div className="flex flex-col gap-2 mb-3">
              {rechargeOptions.map(opt => (
                <button
                  key={opt.amount}
                  disabled={isPaying}
                  onClick={() => handleRecharge(opt.amount, opt.coins)}
                  className={`
                    flex justify-between items-center px-4 py-2 rounded-xl shadow font-bold text-[15px]
                    transition border border-emerald-200
                    ${opt.color}
                    hover:bg-emerald-100 hover:scale-105 duration-150
                    ${isPaying ? "opacity-40 pointer-events-none" : ""}
                  `}
                  style={{ direction: "rtl" }}
                >
                  <span>
                    {lang === "ar" ? `شحن ${opt.amount} درهم` : `Recharge ${opt.amount} AED`}
                  </span>
                  <span className="text-yellow-700">
                    +{opt.coins} {lang === "ar" ? "كوين" : "coins"}
                    <span className="text-xs text-gray-500 ml-1">
                      ({lang === "ar" ? "مجانا" : "free"})
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-600 text-center mb-2 whitespace-pre-line">
              {lang === "ar"
                ? "يمكنك شحن المحفظة أو الدفع مباشرة من الرصيد\nواستلام كوينات مجانية حسب قيمة الشحن"
                : "You can recharge your wallet or pay directly from the balance\nand get free coins with each recharge."}
            </div>
            <div className="text-center min-h-[24px]">{msg}</div>
          </div>
        </div>
      )}
    </>
  );
}