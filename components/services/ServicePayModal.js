import { useState } from "react";
import { FaWallet, FaCreditCard, FaCoins, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

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
}) {
  const [useCoins, setUseCoins] = useState(false);
  const [payMethod, setPayMethod] = useState("wallet");
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [msgSuccess, setMsgSuccess] = useState(false);

  // حسابات الكوينات
  const maxCoinDiscount = Math.floor(printingFee * 0.1 * 1000);
  const coinDiscount = useCoins ? Math.min(coinsBalance, maxCoinDiscount) : 0;
  const coinDiscountValue = coinDiscount / 1000;
  const finalPrice = totalPrice - coinDiscountValue;
  const willGetCashback = !useCoins;

  // دفع المحفظة
  async function handlePayment() {
    setIsPaying(true);
    setPayMsg("");
    setMsgSuccess(false);
    try {
      // هنا اربط مع الـ backend حسب احتياجك
      const response = await fetch("/api/pay-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          useCoins,
          coinDiscountValue,
          serviceName,
          userId,
          userEmail,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setMsgSuccess(true);
        setPayMsg(lang === "ar" ? "🎉 تم الدفع بنجاح! شكراً لاستخدامك منصة تأهيل." : "🎉 Payment successful! Thank you for using Taheel.");
        setTimeout(() => onClose(), 1800);
      } else {
        setPayMsg(result.error || (lang === "ar" ? "حدث خطأ أثناء الدفع." : "Payment failed."));
      }
    } catch (e) {
      setPayMsg(lang === "ar" ? "حدث خطأ في الاتصال بالخادم." : "Server error.");
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

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/50 backdrop-blur-sm animated fade-in">
      <div className="bg-gradient-to-br from-white via-emerald-50 to-emerald-100 rounded-3xl shadow-2xl border-2 border-emerald-200/80 px-6 pt-7 pb-4 max-w-lg w-full relative flex flex-col items-center animate-pop">
        {/* زر إغلاق دائري أعلى يمين */}
        <button
          className="absolute top-3 right-4 bg-emerald-600 text-white rounded-full p-1 shadow hover:bg-emerald-700 transition"
          onClick={onClose}
          aria-label={lang === "ar" ? "إغلاق" : "Close"}
        >
          ×
        </button>
        {/* عنوان الخدمة */}
        <h2 className="text-emerald-800 font-extrabold text-xl mb-2 text-center drop-shadow-lg">
          {lang === "ar" ? "دفع الخدمة" : "Service Payment"} <span className="block text-lg font-black text-emerald-600 mt-1">{serviceName}</span>
        </h2>
        {/* بيانات الدفع */}
        <div className="w-full flex flex-col gap-1 bg-white/80 rounded-2xl border border-emerald-100 shadow p-3 mb-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">{lang === "ar" ? "إجمالي السعر:" : "Total price:"}</span>
            <span className="font-black text-emerald-700 text-lg">{totalPrice.toFixed(2)} د.إ</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">{lang === "ar" ? "رسوم الطباعة:" : "Printing Fee:"}</span>
            <span className="text-emerald-700">{printingFee} د.إ</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700">{lang === "ar" ? "خصم الكوينات:" : "Coins Discount:"}</span>
            <span className="text-yellow-600">
              {useCoins ? `-${coinDiscountValue.toFixed(2)} د.إ` : "0 د.إ"}
              {useCoins && (
                <span className="ml-2 flex items-center"><FaCoins className="text-yellow-500" size={14} /> <span className="font-bold text-yellow-700 mx-1">{coinDiscount}</span></span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between font-extrabold text-lg mt-2">
            <span className="text-emerald-800">{lang === "ar" ? "السعر النهائي:" : "Final price:"}</span>
            <span className="text-emerald-900">{finalPrice.toFixed(2)} د.إ</span>
          </div>
        </div>
        {/* خيار الكوينات */}
        <div className="w-full flex flex-row items-center justify-between mb-2">
          <label className="flex items-center gap-2 font-bold text-sm text-emerald-700 cursor-pointer">
            <input
              type="checkbox"
              checked={useCoins}
              onChange={e => setUseCoins(e.target.checked)}
              disabled={coinsBalance < 1}
              className="accent-yellow-500 scale-110"
            />
            <FaCoins className="text-yellow-500" size={16} />
            {lang === "ar" ? "استخدم الكوينات للخصم (حتى 10% من رسوم الطباعة)" : "Use coins for discount (up to 10% of printing fee)"}
          </label>
          <span className="font-black text-yellow-700 text-sm">
            {lang === "ar" ? "رصيدك:" : "Your coins:"} {coinsBalance} <span className="text-gray-700">({(coinsBalance/1000).toFixed(2)} د.إ)</span>
          </span>
        </div>
        {/* طرق الدفع */}
        <div className="w-full flex flex-row items-center justify-between mb-2">
          <label className={`flex items-center gap-2 font-bold text-emerald-800 cursor-pointer ${userWallet < finalPrice ? "opacity-50" : ""}`}>
            <input
              type="radio"
              checked={payMethod === "wallet"}
              onChange={() => setPayMethod("wallet")}
              disabled={userWallet < finalPrice}
              className="accent-emerald-600 scale-110"
            />
            <FaWallet className="text-emerald-600" size={18} />
            {lang === "ar" ? "المحفظة" : "Wallet"}
            <span className="text-gray-600 font-bold ml-2">{userWallet} د.إ</span>
          </label>
          <label className="flex items-center gap-2 font-bold text-emerald-800 cursor-pointer">
            <input
              type="radio"
              checked={payMethod === "gateway"}
              onChange={() => setPayMethod("gateway")}
              className="accent-emerald-600 scale-110"
            />
            <FaCreditCard className="text-emerald-600" size={18} />
            {lang === "ar" ? "بوابة الدفع (فيزا/مدفوعات)" : "Payment Gateway"}
          </label>
        </div>
        {/* كاش باك/مكافأة */}
        <div className="w-full mb-2 text-center">
          {willGetCashback ? (
            <div className="flex flex-row items-center justify-center gap-1 text-yellow-700 font-bold text-sm">
              <FaCoins className="text-yellow-500" size={16} />
              {lang === "ar"
                ? `سيتم إضافة ${cashbackCoins} كوين كمكافأة بعد الدفع`
                : `You will get ${cashbackCoins} coins as cashback after payment`}
            </div>
          ) : (
            <div className="text-gray-500 text-sm font-bold">
              {lang === "ar"
                ? "لن تحصل على كوينات كاش باك عند استخدام الكوينات للخصم"
                : "No cashback if you use coins for discount"}
            </div>
          )}
        </div>
        {/* زر الدفع */}
        <button
          onClick={onPayClick}
          disabled={isPaying}
          className={`w-full py-2 rounded-full font-black text-lg shadow-lg transition
            bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 text-white
            hover:from-emerald-600 hover:to-emerald-500 hover:shadow-emerald-200/90
            hover:scale-105 duration-150
            focus:outline-none focus:ring-2 focus:ring-emerald-400
            ${isPaying ? "opacity-40" : ""}
          `}
        >
          {isPaying ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🔄</span>
              {lang === "ar" ? "جاري الدفع..." : "Processing..."}
            </span>
          ) : (
            <span>{lang === "ar" ? `دفع الآن (${finalPrice.toFixed(2)} د.إ)` : `Pay Now (${finalPrice.toFixed(2)} AED)`}</span>
          )}
        </button>
        {/* رسائل الدفع */}
        {payMsg && (
          <div className={`mt-3 text-center font-bold text-base flex flex-row items-center justify-center gap-2 ${msgSuccess ? "text-emerald-700" : "text-red-600"}`}>
            {msgSuccess ? <FaCheckCircle className="text-emerald-500" size={22} /> : <FaExclamationCircle className="text-red-400" size={20} />}
            <span>{payMsg}</span>
          </div>
        )}
        {/* ديكور سفلي */}
        <div className="absolute -bottom-6 right-0 left-0 w-full h-8 bg-gradient-to-t from-emerald-200/60 via-white/20 to-transparent blur-2xl opacity-80 pointer-events-none"></div>
      </div>
    </div>
  );
}