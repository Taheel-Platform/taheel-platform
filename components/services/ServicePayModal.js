import { useState } from "react";
import {
  FaWallet, FaCreditCard, FaCoins, FaCheckCircle, FaExclamationCircle, FaTimes, FaSpinner
} from "react-icons/fa";
import { firestore } from "@/lib/firebase.client";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc, setDoc, updateDoc, increment, collection, addDoc, getDoc
} from "firebase/firestore";
import { translateText } from "@/utils/translate"; // ← إضافة الترجمة

// Stripe imports
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// دالة توليد رقم تتبع بالشكل المطلوب
function generateOrderNumber() {
  const part1 = Math.floor(100 + Math.random() * 900); // 3 أرقام
  const part2 = Math.floor(1000 + Math.random() * 9000); // 4 أرقام
  return `REQ-${part1}-${part2}`;
}

// Component for Stripe Elements Form
function StripeCardForm({ clientSecret, onSuccess, lang, orderNumber }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleStripePay(e) {
    e.preventDefault();
    setPaying(true);
    setError("");
    setSuccess(false);

    if (!stripe || !elements) {
      setError(lang === "ar" ? "بوابة الدفع غير جاهزة." : "Stripe not ready.");
      setPaying(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // لن يتم التحويل فعلياً هنا
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message);
      setPaying(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      setSuccess(true);
      if (typeof onSuccess === "function") onSuccess();
    } else {
      setError(lang === "ar" ? "تعذر إتمام الدفع." : "Payment not completed.");
    }
    setPaying(false);
  }

  return (
    <form onSubmit={handleStripePay} className="w-full flex flex-col items-center gap-3 p-2">
      <PaymentElement />
      <button
        type="submit"
        disabled={paying}
        className="w-full py-2 bg-emerald-500 text-white font-bold rounded transition hover:bg-emerald-600"
      >
        {paying ? (lang === "ar" ? "جاري الدفع..." : "Processing...") : (lang === "ar" ? "ادفع الآن" : "Pay Now")}
      </button>
      {error && <div className="text-red-600 font-bold text-xs">{error}</div>}
      {success && (
        <div className="text-emerald-700 font-bold text-sm flex flex-col items-center">
          <FaCheckCircle className="mb-1" size={20} />
          {lang === "ar" ? "تم الدفع بنجاح!" : "Payment successful!"}
          <span className="font-mono mt-1">{lang === "ar" ? "رقم الطلب:" : "Order No:"} <b>{orderNumber}</b></span>
        </div>
      )}
    </form>
  );
}

export default function ServicePayModal({
  open,
  onClose,
  serviceName,
  serviceId,
  provider,
  totalPrice,
  printingFee,
  coinsBalance,
  cashbackCoins,
  userWallet,
  lang = "ar",
  customerId,
  userId,
  userEmail,
  uploadedDocs,
  onPaid,
  clientType = "resident"
}) {
  const [useCoins, setUseCoins] = useState(false);
  const [payMethod, setPayMethod] = useState("wallet");
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [msgSuccess, setMsgSuccess] = useState(false);

  // Stripe Elements state
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripeOrderNumber, setStripeOrderNumber] = useState(null);

  // حسابات الكوينات
  const maxCoinDiscount = Math.floor(printingFee * 0.1 * 100);
  const coinDiscount = useCoins ? Math.min(coinsBalance, maxCoinDiscount) : 0;
  const coinDiscountValue = coinDiscount / 100;
  const finalPrice = totalPrice - coinDiscountValue;
  const willGetCashback = !useCoins;

  // دفع المحفظة: بدون تغيير
  async function handlePayment() { /* كما هو في كودك الحالي */ }

  // دفع بوابة الدفع (Stripe Elements)
  async function handleGatewayPayWithElements() {
    setIsPaying(true);
    setPayMsg("");
    setMsgSuccess(false);

    try {
      const uiServiceName = lang === "ar" ? serviceName : await translateText({ /* ... */ });

      // اطلب clientSecret فقط وليس url
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          serviceName: uiServiceName,
          customerId,
          userEmail,
        }),
      });

      const result = await response.json();
      if (result.clientSecret) {
        setStripeClientSecret(result.clientSecret);
        setStripeOrderNumber(result.orderNumber || "");
        // تظهر Stripe Elements في نفس المودال الآن!
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
      handleGatewayPayWithElements();
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
          <img
            src="/logo3.png"
            alt="Logo"
            className="mb-2 w-14 h-14 object-contain rounded-full shadow border border-emerald-100"
            draggable={false}
            loading="eager"
          />
          <button
            className="absolute top-3 right-4 bg-emerald-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl shadow hover:bg-emerald-700 transition cursor-pointer"
            onClick={onClose}
            aria-label={lang === "ar" ? "إغلاق" : "Close"}
            style={{ cursor: "pointer" }}
          >
            <FaTimes />
          </button>
          <div className="text-emerald-700 font-black text-lg mb-1 text-center">{lang === "ar" ? "دفع الخدمة" : "Service Payment"}</div>
          <div className="font-bold text-emerald-900 text-base mb-3 text-center">{serviceName}</div>
          <table className="w-full text-xs text-gray-700 font-bold mb-2">
            <tbody>
              <tr>
                <td>{lang === "ar" ? "إجمالي السعر" : "Total"}</td>
                <td className="text-right">{totalPrice?.toFixed(2)} د.إ</td>
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

          {/* Stripe Elements يظهر هنا بعد جلب clientSecret */}
          {payMethod === "gateway" && stripeClientSecret ? (
            <Elements stripe={stripePromise} options={{clientSecret: stripeClientSecret}}>
              <StripeCardForm
                clientSecret={stripeClientSecret}
                lang={lang}
                orderNumber={stripeOrderNumber}
                onSuccess={() => {
                  setMsgSuccess(true);
                  setPayMsg(lang === "ar" ? "تم الدفع بنجاح!" : "Payment successful!");
                  if (typeof onPaid === "function") onPaid();
                }}
              />
            </Elements>
          ) : (
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
          )}

          {payMsg && (
            <div className={`mt-2 text-center font-bold text-xs flex flex-row items-center justify-center gap-1 ${msgSuccess ? "text-emerald-700" : "text-red-600"}`}>
              {msgSuccess ? <FaCheckCircle className="text-emerald-500" size={16} /> : <FaExclamationCircle className="text-red-400" size={14} />}
              <span>{payMsg}</span>
            </div>
          )}
          <div className="w-full text-center mt-5 mb-1 flex flex-col items-center gap-1">
            <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center">
              <FaCheckCircle className="inline mr-2 text-emerald-500" />
              {lang === "ar"
                ? "جميع بياناتك مشفرة وآمنة ويتم حفظها بسرية تامة."
                : "All your data is encrypted and securely stored."}
            </div>
          </div>
          <div className="absolute -bottom-6 right-0 left-0 w-full h-7 bg-gradient-to-t from-emerald-200/70 via-white/20 to-transparent blur-2xl opacity-80 pointer-events-none"></div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}