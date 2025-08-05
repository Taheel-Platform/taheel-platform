"use client";
import { useState } from "react";
import { FaWallet } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc, getDoc } from "firebase/firestore";

// خيارات الشحن والكوينات المجانية
const rechargeOptions = [
  { amount: 100, coins: 50, color: "from-emerald-200 to-emerald-50" },
  { amount: 500, coins: 250, color: "from-emerald-300 to-yellow-50" },
  { amount: 1000, coins: 500, color: "from-yellow-200 to-yellow-50" },
  { amount: 5000, coins: 2500, color: "from-orange-200 to-emerald-50" },
];

export default function WalletWidget({
  balance = 0,
  userId,
  coins = 0,
  lang = "ar",
  onBalanceChange,
  onCoinsChange,
  onPayGateway, // دالة تفتح بوابة الدفع (تستدعيها عند الضغط على الرصيد)
}) {
  const [showModal, setShowModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [msg, setMsg] = useState("");
  const [wallet, setWallet] = useState(balance);
  const [userCoins, setUserCoins] = useState(coins);

  function updateLocalBalances(newWallet, newCoins) {
    setWallet(newWallet);
    setUserCoins(newCoins);
    if (typeof onBalanceChange === "function") onBalanceChange(newWallet);
    if (typeof onCoinsChange === "function") onCoinsChange(newCoins);
  }

  // دالة الشحن الداخلي (اختياري لو فيه بايمنت داخلي)
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
      }, 1800);
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
      <motion.button
        type="button"
        className="relative flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-700 border-2 border-emerald-200 shadow-lg rounded-full w-14 h-14 transition hover:scale-105"
        title={valueText}
        tabIndex={0}
        onClick={() => setShowModal(true)}
        whileHover={{ scale: 1.07, rotate: -3 }}
      >
        <FaWallet className="text-white text-3xl drop-shadow-lg" />
        <span
          className="absolute -top-2 -right-2 bg-yellow-400 text-white text-xs font-black rounded-full px-2 shadow border-2 border-white/70"
          style={{ minWidth: 32 }}
        >
          {wallet}
        </span>
      </motion.button>

      {/* مودال الشحن مع موشن وانسدال */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            tabIndex={-1}
            onClick={() => !isPaying && setShowModal(false)}
            style={{ backdropFilter: "blur(3px)" }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-200 max-w-xs w-full p-5 relative flex flex-col gap-4"
              style={{
                minWidth: 240,
                maxWidth: 340,
                boxShadow: "0 12px 32px 8px #05966922",
                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)",
              }}
              initial={{ y: -60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-2 left-2 text-gray-400 hover:text-red-700 text-2xl px-2 z-20"
                title={lang === "ar" ? "إغلاق" : "Close"}
                style={{ cursor: "pointer" }}
                disabled={isPaying}
              >×</button>

              {/* رصيد المحفظة (قابل للضغط لفتح بوابة الدفع) */}
              <motion.div
                className="flex flex-col items-center gap-1 cursor-pointer select-none"
                onClick={() => {
                  if (onPayGateway) onPayGateway();
                  // يمكنك هنا فتح مودال الدفع الفعلي أو Paytabs
                }}
                whileTap={{ scale: 0.97 }}
                title={lang === "ar" ? "اضغط لإعادة الشحن ببوابة الدفع" : "Click to recharge with payment gateway"}
              >
                <span className="text-xl font-extrabold text-emerald-700 drop-shadow-sm flex items-center gap-2">
                  {wallet}
                  <span className="text-[14px] text-gray-500 font-bold">
                    {lang === "ar" ? "درهم" : "AED"}
                  </span>
                </span>
                <span className="text-xs text-emerald-600 font-bold">
                  {lang === "ar" ? "رصيد المحفظة" : "Wallet Balance"}
                </span>
                <span className="text-xs text-yellow-600 font-bold">
                  {lang === "ar" ? `كوينات: ${userCoins}` : `Coins: ${userCoins}`}
                </span>
                <span className="text-xs text-blue-400 font-bold animate-pulse">
                  {lang === "ar" ? "اضغط لإعادة الشحن بوسيلة دفع إلكترونية" : "Click to recharge via payment gateway"}
                </span>
              </motion.div>

              {/* خيارات الشحن السريعة */}
              <div className="flex flex-col gap-3 mt-2">
                {rechargeOptions.map(opt => (
                  <motion.button
                    key={opt.amount}
                    disabled={isPaying}
                    onClick={() => handleRecharge(opt.amount, opt.coins)}
                    className={`
                      flex justify-between items-center px-4 py-2 rounded-xl font-bold text-[15px] border
                      bg-gradient-to-r ${opt.color}
                      border-emerald-100 shadow
                      hover:scale-[1.03] active:scale-95 transition
                      ${isPaying ? "opacity-40 pointer-events-none" : ""}
                    `}
                    style={{ direction: "rtl", boxShadow: "0 4px 14px #05966910" }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
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
                  </motion.button>
                ))}
              </div>

              <div className="text-xs text-gray-500 text-center mb-0 whitespace-pre-line mt-1">
                {lang === "ar"
                  ? "يمكنك شحن المحفظة أو الدفع مباشرة من الرصيد\nواستلام كوينات مجانية حسب قيمة الشحن"
                  : "You can recharge your wallet or pay directly from the balance\nand get free coins with each recharge."}
              </div>
              <div className="text-center min-h-[24px]">{msg}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}