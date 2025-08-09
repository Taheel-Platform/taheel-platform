import { useState } from "react";
import { FaWallet, FaCreditCard, FaCoins, FaCheckCircle, FaExclamationCircle, FaTimes, FaSpinner } from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { motion, AnimatePresence } from "framer-motion";
import { doc, setDoc, updateDoc, collection, addDoc } from "firebase/firestore";

// دالة توليد رقم تتبع بالشكل المطلوب
function generateOrderNumber() {
  const part1 = Math.floor(100 + Math.random() * 900); // 3 أرقام
  const part2 = Math.floor(1000 + Math.random() * 9000); // 4 أرقام
  return `REQ-${part1}-${part2}`;
}

export default function ServicePayModal({
  open,
  onClose,
  serviceName,
  totalPrice,
  printingFee,
  coinsBalance,
  cashbackCoins,
  userWallet,
  lang = "ar",
  userId,
  userEmail,
  uploadedDocs,
  onPaid
}) {
  const [useCoins, setUseCoins] = useState(false);
  const [payMethod, setPayMethod] = useState("wallet");
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [msgSuccess, setMsgSuccess] = useState(false);

  // حسابات الكوينات
  const maxCoinDiscount = Math.floor(printingFee * 0.1 * 100);
  const coinDiscount = useCoins ? Math.min(coinsBalance, maxCoinDiscount) : 0;
  const coinDiscountValue = coinDiscount / 100;
  const finalPrice = totalPrice - coinDiscountValue;
  const willGetCashback = !useCoins;

  // دفع المحفظة
async function handlePayment() {
  setIsPaying(true);
  setPayMsg("");
  setMsgSuccess(false);
  try {
    if (userWallet < finalPrice) {
      setPayMsg(lang === "ar" ? "رصيد المحفظة غير كافي." : "Insufficient wallet balance.");
      setIsPaying(false);
      return;
    }

    const userRef = doc(firestore, "users", userId);
    // خصم الرصيد من المحفظة
    await updateDoc(userRef, {
      walletBalance: userWallet - finalPrice
    });

    // إضافة الكوينات للمستخدم إذا يستحق مكافأة
    if (willGetCashback && cashbackCoins > 0) {
      await updateDoc(userRef, {
        coinsBalance: (coinsBalance || 0) + cashbackCoins
      });
    }

    const orderNumber = generateOrderNumber();

    await addDoc(collection(firestore, "notifications"), {
      targetId: userId,
      title: lang === "ar" ? "تم الدفع" : "Payment Successful",
      body: lang === "ar"
        ? `دفعت لخدمة ${serviceName} بقيمة ${finalPrice.toFixed(2)} د.إ${useCoins ? ` واستخدمت خصم الكوينات (${coinDiscountValue.toFixed(2)} د.إ)` : ""}.\nرقم التتبع: ${orderNumber}`
        : `You paid for ${serviceName} (${finalPrice.toFixed(2)} AED${useCoins ? `, using coins discount (${coinDiscountValue.toFixed(2)} AED)` : ""}).\nTracking No.: ${orderNumber}`,
      timestamp: new Date().toISOString(),
      isRead: false
    });

    // حفظ بيانات الطلب والمرفقات
    await setDoc(doc(firestore, "requests", orderNumber), {
      requestId: orderNumber,
      clientId: userId,
      serviceName,
      paidAmount: finalPrice,
      coinsUsed: useCoins ? coinDiscountValue : 0,
      coinsGiven: willGetCashback ? cashbackCoins : 0,
      createdAt: new Date().toISOString(),
      status: "paid",
      attachments: uploadedDocs || {}
    });

    await fetch("/api/sendOrderEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: userEmail,
        orderNumber,
        serviceName,
        price: finalPrice.toFixed(2)
      }),
    });

    setMsgSuccess(true);
    setPayMsg(lang === "ar" ? "تم الدفع بنجاح!" : "Payment successful!");
    if (typeof onPaid === "function") {
      onPaid();
    }
    setTimeout(() => onClose(), 1200);

  } catch (e) {
    setPayMsg(lang === "ar" ? "حدث خطأ أثناء الدفع." : "Payment error.");
  } finally {
    setIsPaying(false);
  }
}

  // دفع بوابة
  async function handleGatewayRedirect() {
    setIsPaying(true);
    setPayMsg("");
    setMsgSuccess(false);
    try {
      const response = await fetch("/api/create-payment-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          serviceName,
          userId,
          userEmail,
        }),
      });
      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      } else {
        setPayMsg(lang === "ar" ? "تعذر فتح بوابة الدفع." : "Failed to open payment gateway.");
      }
    } catch (e) {
      setPayMsg(lang === "ar" ? "تعذر الاتصال بالخادم." : "Failed to connect to server.");
    } finally {
      setIsPaying(false);
    }
  }

  function onPayClick() {
    if (payMethod === "wallet") {
      handlePayment();
    } else if (payMethod === "gateway") {
      handleGatewayRedirect();
    }
  }

  if (!open) return null;
  const payBtnCursor = isPaying ? "wait" : "pointer";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex justify-center items-center bg-gradient-to-br from-black/60 via-emerald-900/60 to-black/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gradient-to-br from-white via-emerald-50 to-emerald-100 rounded-3xl shadow-2xl border border-emerald-200 px-6 pt-7 pb-4 max-w-sm w-full relative flex flex-col items-center"
          initial={{ scale: 0.97, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 30 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          {/* لوجو أعلى المدوال */}
          <img
            src="/logo3.png"
            alt="Logo"
            className="mb-2 w-14 h-14 object-contain rounded-full shadow border border-emerald-100"
            draggable={false}
            loading="eager"
          />

          {/* زر إغلاق دائري */}
          <button
            className="absolute top-3 right-4 bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl shadow hover:bg-emerald-700 transition cursor-pointer"
            onClick={onClose}
            aria-label={lang === "ar" ? "إغلاق" : "Close"}
            style={{ cursor: "pointer" }}
          >
            <FaTimes />
          </button>
          {/* عنوان الخدمة */}
          <div className="text-emerald-700 font-black text-lg mb-1 text-center">{lang === "ar" ? "دفع الخدمة" : "Service Payment"}</div>
          <div className="font-bold text-emerald-900 text-base mb-3 text-center">{serviceName}</div>
          {/* جدول الأسعار */}
          <table className="w-full text-xs text-gray-700 font-bold mb-2">
            <tbody>
              <tr>
                <td>{lang === "ar" ? "إجمالي السعر" : "Total"}</td>
                <td className="text-right">{totalPrice.toFixed(2)} د.إ</td>
              </tr>
              <tr>
                <td>{lang === "ar" ? "رسوم الطباعة" : "Printing"}</td>
                <td className="text-right">{printingFee} د.إ</td>
              </tr>
              <tr>
                <td className="flex items-center gap-1">
                  <FaCoins className="text-yellow-500 mr-1" size={10} />
                  {lang === "ar" ? "خصم الكوينات" : "Coins Discount"}
                </td>
                <td className="text-right text-yellow-700">
                  {useCoins ? `-${coinDiscountValue.toFixed(2)} د.إ` : "0 د.إ"}
                </td>
              </tr>
              <tr>
                <td className="font-extrabold text-emerald-700">{lang === "ar" ? "السعر النهائي" : "Final"}</td>
                <td className="font-extrabold text-emerald-800 text-right">{finalPrice.toFixed(2)} د.إ</td>
              </tr>
            </tbody>
          </table>
          {/* خيار الكوينات */}
          <div className="w-full flex flex-row items-center justify-between mb-1">
            <label className="flex items-center gap-1 font-bold text-xs text-emerald-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useCoins}
                onChange={e => setUseCoins(e.target.checked)}
                disabled={coinsBalance < 1}
                className="accent-yellow-500 scale-90"
                style={{ marginTop: 0 }}
              />
              <FaCoins className="text-yellow-500" size={12} />
              {lang === "ar" ? "استخدم الكوينات (خصم حتى 10%)" : "Use coins (up to 10%)"}
            </label>
            <span className="font-black text-yellow-700 text-xs">
              {lang === "ar" ? "رصيدك:" : "Your coins:"} {coinsBalance}
            </span>
          </div>
          {/* طرق الدفع */}
          <div className="w-full flex flex-row items-center justify-between mb-1">
            <label className={`flex items-center gap-1 font-bold text-emerald-800 text-xs cursor-pointer ${userWallet < finalPrice ? "opacity-60" : ""}`}>
              <input
                type="radio"
                checked={payMethod === "wallet"}
                onChange={() => setPayMethod("wallet")}
                disabled={userWallet < finalPrice}
                className="accent-emerald-600 scale-90"
                style={{ marginTop: 0 }}
              />
              <FaWallet className="text-emerald-600" size={12} />
              {lang === "ar" ? "المحفظة" : "Wallet"}
              <span className="text-gray-600 font-bold ml-2">{userWallet} د.إ</span>
            </label>
            <label className="flex items-center gap-1 font-bold text-emerald-800 text-xs cursor-pointer">
              <input
                type="radio"
                checked={payMethod === "gateway"}
                onChange={() => setPayMethod("gateway")}
                className="accent-emerald-600 scale-90"
                style={{ marginTop: 0 }}
              />
              <FaCreditCard className="text-emerald-600" size={12} />
              {lang === "ar" ? "بوابة الدفع" : "Gateway"}
            </label>
          </div>
          {/* كاش باك/مكافأة */}
          <div className="w-full mb-1 text-center">
            {willGetCashback ? (
              <div className="flex flex-row items-center justify-center gap-1 text-yellow-700 font-bold text-xs">
                <FaCoins className="text-yellow-500" size={12} />
                {lang === "ar"
                  ? `ستحصل على ${cashbackCoins} كوين مكافأة`
                  : `You'll get ${cashbackCoins} coins cashback`}
              </div>
            ) : (
              <div className="text-gray-500 text-xs font-bold">
                {lang === "ar"
                  ? "لا مكافأة عند استخدام الكوينات"
                  : "No cashback if you use coins"}
              </div>
            )}
          </div>
          {/* زر الدفع */}
          <button
            onClick={onPayClick}
            disabled={isPaying}
            className={`w-full py-2 rounded-full font-black text-base shadow-lg transition
              bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 text-white
              hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-200/90
              hover:scale-105 duration-150
              focus:outline-none focus:ring-2 focus:ring-emerald-400
              ${isPaying ? "opacity-40" : ""}
            `}
            style={{ cursor: payBtnCursor }}
          >
            {isPaying ? (
              <span className="flex items-center justify-center gap-2 text-xs">
                <FaSpinner className="animate-spin" />
                {lang === "ar" ? "جاري الدفع..." : "Processing..."}
              </span>
            ) : (
              <span>{lang === "ar" ? `دفع الآن (${finalPrice.toFixed(2)} د.إ)` : `Pay Now (${finalPrice.toFixed(2)} AED)`}</span>
            )}
          </button>

          {/* رسائل الدفع */}
          {payMsg && (
            <div className={`mt-2 text-center font-bold text-xs flex flex-row items-center justify-center gap-1 ${msgSuccess ? "text-emerald-700" : "text-red-600"}`}>
              {msgSuccess ? <FaCheckCircle className="text-emerald-500" size={16} /> : <FaExclamationCircle className="text-red-400" size={14} />}
              <span>{payMsg}</span>
            </div>
          )}

          {/* رسالة أمان تحت */}
          <div className="w-full text-center mt-5 mb-1 flex flex-col items-center gap-1">
            <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center">
              <FaCheckCircle className="inline mr-2 text-emerald-500" />
              {lang === "ar"
                ? "جميع بياناتك مشفرة وآمنة ويتم حفظها بسرية تامة."
                : "All your data is encrypted and securely stored."}
            </div>
          </div>
          {/* ديكور سفلي */}
          <div className="absolute -bottom-6 right-0 left-0 w-full h-7 bg-gradient-to-t from-emerald-200/70 via-white/20 to-transparent blur-2xl opacity-80 pointer-events-none"></div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}