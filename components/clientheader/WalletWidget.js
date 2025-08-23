"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaWallet } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { firestore } from "@/lib/firebase.client";
import { doc, onSnapshot } from "firebase/firestore";

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
  customerId,
  userEmail,
}) {
  const [showModal, setShowModal] = useState(false);
  const [wallet, setWallet] = useState(balance);
  const [userCoins, setUserCoins] = useState(coins);

  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const userRef = doc(firestore, "users", userId);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWallet(Number(data.walletBalance ?? 0));
        setUserCoins(Number(data.coins ?? 0));
        if (typeof onBalanceChange === "function") onBalanceChange(Number(data.walletBalance ?? 0));
        if (typeof onCoinsChange === "function") onCoinsChange(Number(data.coins ?? 0));
      }
    });
    return () => unsubscribe();
  }, [userId, onBalanceChange, onCoinsChange]);

  const valueText =
    lang === "ar"
      ? `رصيدك في المحفظة: ${wallet} درهم\nرصيد الكوينات: ${userCoins} كوين`
      : `Your wallet balance: ${wallet} AED\nCoins: ${userCoins}`;

  function handleRechargeClick(amount, coinsBonus) {
    // مرر المعلومات اللازمة عبر localStorage أو query params
    localStorage.setItem(
      "walletRechargeData",
      JSON.stringify({
        amount,
        coinsBonus,
        userId,
        userEmail,
        lang
      })
    );
    router.push("/payment/wallet-recharge");
    setShowModal(false);
  }

  return (
    <>
      {/* زر المحفظة */}
      <motion.button
        type="button"
        className="relative flex items-center justify-center bg-transparent border-none p-0 m-0 focus:outline-none cursor-pointer"
        title={valueText}
        tabIndex={0}
        style={{ minWidth: 36, minHeight: 36 }}
        onClick={() => setShowModal(true)}
        whileHover={{ scale: 1.18, rotate: -8, filter: "brightness(1.12)" }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 250, damping: 18 }}
      >
        <FaWallet
          className="text-[27px] sm:text-[29px] lg:text-[32px] text-emerald-500 drop-shadow-lg transition-all duration-150"
          style={{ filter: "drop-shadow(0 2px 8px #05966955)" }}
        />
        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[11px] font-bold rounded-full px-[6px] py-[2px] shadow border-2 border-white/80">
          {wallet}
        </span>
      </motion.button>

      {/* مودال الشحن */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            tabIndex={-1}
            onClick={() => setShowModal(false)}
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
                className="absolute top-2 left-2 text-gray-400 hover:text-red-700 text-2xl px-2 z-20 cursor-pointer"
                title={lang === "ar" ? "إغلاق" : "Close"}
              >×</button>
              <motion.div
                className="flex flex-col items-center gap-1 cursor-pointer select-none"
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

              {/* خيارات الشحن */}
              <div className="flex flex-col gap-3 mt-2">
                {rechargeOptions.map(opt => (
                  <motion.button
                    key={opt.amount}
                    onClick={() => handleRechargeClick(opt.amount, opt.coins)}
                    className={`
                      flex justify-between items-center px-4 py-2 rounded-xl font-bold text-[15px] border
                      bg-gradient-to-r ${opt.color}
                      border-emerald-100 shadow
                      hover:scale-[1.03] active:scale-95 transition
                      cursor-pointer
                    `}
                    style={{ direction: "rtl", boxShadow: "0 4px 14px #05966910" }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="text-emerald-800 font-bold">
                      {lang === "ar" ? `شحن ${opt.amount} درهم` : `Recharge ${opt.amount} AED`}
                    </span>
                    <span className="text-yellow-700 flex items-center gap-1">
                      +{opt.coins}
                      <span className="text-xs text-gray-500">
                        {lang === "ar" ? "كوين مجانا" : "coins free"}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}