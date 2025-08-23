"use client";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Image from "next/image";
import { firestore } from "@/lib/firebase.client";
import { doc, updateDoc, getDoc, collection, addDoc } from "firebase/firestore";

// Stripe publishable key (from env)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const LANG = {
  en: {
    title: "Recharge Wallet",
    subtitle: "Your payment is secure and encrypted.",
    cardLabel: "Card Information",
    payBtn: "Recharge",
    success: "Wallet recharge successful!",
    error: "Payment failed.",
    amount: "Amount",
    coins: "Bonus Coins",
    total: "Total Recharge",
    processing: "Processing..."
  },
  ar: {
    title: "شحن المحفظة",
    subtitle: "مدفوعاتك محمية ومشفرة بالكامل.",
    cardLabel: "بيانات البطاقة",
    payBtn: "شحن الآن",
    success: "تم شحن المحفظة بنجاح!",
    error: "فشل الدفع.",
    amount: "المبلغ",
    coins: "كوينات مجانية",
    total: "إجمالي الشحن",
    processing: "جارٍ الدفع..."
  }
};

function WalletCardForm({ paymentData, lang = "ar", onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [msgSuccess, setMsgSuccess] = useState(false);

  const { amount, coinsBonus, clientSecret, customerId, userEmail } = paymentData;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPayMsg("");
    setMsgSuccess(false);

    // Stripe Payment
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    });

    if (stripeError) {
      setPayMsg(stripeError.message);
      setLoading(false);
      return;
    }

    // After success: update wallet, add coins, notification, send email
    if (paymentIntent && paymentIntent.status === "succeeded") {
      setMsgSuccess(true);
      setPayMsg(LANG[lang].success);

      // Update wallet & coins
      const userRef = doc(firestore, "users", customerId);
      const snap = await getDoc(userRef);
      let currentWallet = 0, currentCoins = 0;
      if (snap.exists()) {
        const data = snap.data();
        currentWallet = Number(data.walletBalance ?? 0);
        currentCoins = Number(data.coins ?? 0);
      }
      await updateDoc(userRef, { walletBalance: currentWallet + amount });
      await updateDoc(userRef, { coins: currentCoins + coinsBonus });

      // Notification to user
      await addDoc(collection(firestore, "notifications"), {
        targetId: customerId,
        title: lang === "ar" ? "تم شحن المحفظة" : "Wallet Recharged",
        body: lang === "ar"
          ? `تم شحن محفظتك بـ${amount} درهم، وتم إضافة ${coinsBonus} كوين!`
          : `Wallet recharged with ${amount} AED, plus ${coinsBonus} bonus coins!`,
        timestamp: new Date().toISOString(),
        isRead: false
      });

      // Send confirmation email
      await fetch("/api/sendWalletEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,
          amount,
          coinsBonus,
          walletTotal: currentWallet + amount,
          coinsTotal: currentCoins + coinsBonus,
          lang
        }),
      });

      setTimeout(() => {
        onSuccess(paymentIntent.id);
      }, 1200);
    } else {
      setPayMsg(LANG[lang].error);
    }
    setLoading(false);
  };

  return (
    <form
      dir={dir}
      lang={lang}
      onSubmit={handleSubmit}
      className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-emerald-200 p-7 flex flex-col items-center"
      style={{
        background: "linear-gradient(180deg,#0b131e 0%,#22304a 30%,#122024 60%,#1d4d40 100%)"
      }}
    >
      <Image src="/logo-transparent-large.png" width={70} height={70} alt="Logo" className="mx-auto mb-2 rounded-full bg-white shadow-lg ring-2 ring-emerald-500" />
      <div className="text-emerald-300 font-black text-xl mb-1 text-center">{LANG[lang].title}</div>
      <div className="text-gray-200 text-sm mb-4 text-center">{LANG[lang].subtitle}</div>
      <div className="bg-[#22304a]/70 rounded-xl p-4 mb-3 w-full text-center shadow">
        <table className="w-full text-sm text-right mb-2 border-separate border-spacing-y-1">
          <tbody>
            <tr>
              <td className="text-gray-300">{LANG[lang].amount}:</td>
              <td className="text-emerald-200 font-bold">{Number(amount).toFixed(2)} د.إ</td>
            </tr>
            <tr>
              <td className="text-gray-300">{LANG[lang].coins}:</td>
              <td className="text-yellow-400 font-bold">{Number(coinsBonus)} كوين</td>
            </tr>
            <tr>
              <td className="font-bold text-emerald-400">{LANG[lang].total}:</td>
              <td className="font-bold text-emerald-300">{Number(amount).toFixed(2)} د.إ</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="w-full mb-3">
        <label className="text-emerald-200 font-bold text-sm mb-1 block">{LANG[lang].cardLabel}</label>
        <div className="bg-white rounded-lg shadow p-2 border border-emerald-200">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "18px",
                  color: "#22304a",
                  fontFamily: "inherit",
                  direction: dir,
                  letterSpacing: "0.8px",
                  "::placeholder": {
                    color: "#94a3b8",
                  },
                },
                invalid: {
                  color: "#dc2626",
                  iconColor: "#dc2626"
                }
              }
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        className={`w-full py-3 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-700 text-white font-black text-lg mt-3 shadow-lg transition hover:scale-105 hover:brightness-110 ${loading ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {loading ? LANG[lang].processing : `${LANG[lang].payBtn} (${Number(amount).toFixed(2)} د.إ)`}
      </button>
      {payMsg && (
        <div className={`mt-3 text-center font-bold text-xs flex flex-row items-center justify-center gap-1 ${msgSuccess ? "text-emerald-400" : "text-red-600"}`}>
          {msgSuccess ? <span>✅</span> : <span>⚠️</span>}
          <span>{payMsg}</span>
        </div>
      )}
      <div className="w-full text-center mt-6 text-xs text-gray-400 font-semibold flex items-center justify-center gap-2">
        <span>🔒</span>
        {lang === "ar"
          ? "جميع بيانات الدفع مشفرة ومحمية عبر Stripe"
          : "All payment data is encrypted and protected via Stripe"}
      </div>
    </form>
  );
}

export default function WalletRechargePage() {
  const [success, setSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("walletRechargeData"));
    setPaymentData(data);
  }, []);

  // تأكد من وجود clientSecret (بعد إنشاء intent من السيرفر)
  if (!paymentData || !paymentData.clientSecret) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-black text-white">
        <div className="text-xl font-bold">لم يتم العثور على بيانات الشحن. يرجى العودة للمحفظة أو إعادة المحاولة.</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-black text-white">
        <div className="text-emerald-400 text-2xl font-black mb-4">{LANG[paymentData.lang].success}</div>
        <div className="text-lg mb-3">
          {LANG[paymentData.lang].amount}: {Number(paymentData.amount).toFixed(2)} د.إ
        </div>
        <div className="text-lg mb-3">
          {LANG[paymentData.lang].coins}: {Number(paymentData.coinsBonus)} كوين
        </div>
        <div className="text-lg mb-3">
          رقم العملية: {paymentId}
        </div>
        <div className="text-gray-300 mt-6">{LANG[paymentData.lang].subtitle}</div>
      </div>
    );
  }

  return (
    <div
      dir={paymentData.lang === "ar" ? "rtl" : "ltr"}
      lang={paymentData.lang}
      className="min-h-screen flex flex-col items-center justify-center font-sans"
      style={{ background: "linear-gradient(180deg, #0b131e 0%, #22304a 30%, #122024 60%, #1d4d40 100%)" }}
    >
      <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret }}>
        <WalletCardForm
          paymentData={paymentData}
          lang={paymentData.lang}
          onSuccess={(id) => {
            setSuccess(true);
            setPaymentId(id);
          }}
        />
      </Elements>
    </div>
  );
}