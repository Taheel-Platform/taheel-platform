"use client";
import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Image from "next/image";
import PaymentSuccessPage from "./PaymentSuccessPage";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const LANG = {
  en: {
    title: "Pay for Service",
    subtitle: "Your payment is secure and encrypted.",
    cardLabel: "Card Information",
    payBtn: "Pay Now",
    success: "Payment successful!",
    error: "Payment failed.",
    service: "Service",
    amount: "Amount",
    vat: "VAT",
    print: "Printing Fee",
    total: "Total",
    back: "Back to Home",
    processing: "Processing..."
  },
  ar: {
    title: "دفع الخدمة",
    subtitle: "مدفوعاتك محمية ومشفرة بالكامل.",
    cardLabel: "بيانات البطاقة",
    payBtn: "ادفع الآن",
    success: "تم الدفع بنجاح!",
    error: "فشل الدفع.",
    service: "الخدمة",
    amount: "المبلغ",
    vat: "ضريبة القيمة المضافة",
    print: "رسوم الطباعة",
    total: "الإجمالي",
    back: "العودة للرئيسية",
    processing: "جارٍ الدفع..."
  }
};

function CardForm({ paymentData, lang = "ar", onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [msgSuccess, setMsgSuccess] = useState(false);

  // كل البيانات قادمة من المودال (الحسابات هناك)
  const { service, price, customerId, orderNumber, clientSecret } = paymentData;
  const printingFee = service?.printingFee || 0;
  const vat = service?.vat || 0;
  const total = price + printingFee + vat;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPayMsg("");
    setMsgSuccess(false);

    // تنفيذ الدفع عبر Stripe Elements
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

    // بعد النجاح: أرسل الإيميل (اختياري)
    if (paymentIntent && paymentIntent.status === "succeeded") {
      setMsgSuccess(true);
      setPayMsg(LANG[lang].success);

      await fetch("/api/sendOrderEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: service.userEmail,
          orderNumber,
          serviceName: service.name,
          price,
          printingFee,
          vat,
          paymentId: paymentIntent.id,
          paymentMethod: "gateway",
          lang
        }),
      });

      setTimeout(() => {
        onSuccess(paymentIntent.id, orderNumber);
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
              <td className="text-gray-300">{LANG[lang].service}:</td>
              <td className="text-emerald-200 font-bold">{service.name}</td>
            </tr>
            <tr>
              <td className="text-gray-300">{LANG[lang].amount}:</td>
              <td>{price.toFixed(2)} د.إ</td>
            </tr>
            {printingFee > 0 && (
              <tr>
                <td className="text-gray-300">{LANG[lang].print}:</td>
                <td>{printingFee.toFixed(2)} د.إ</td>
              </tr>
            )}
            {vat > 0 && (
              <tr>
                <td className="text-gray-300">{LANG[lang].vat}:</td>
                <td>{vat.toFixed(2)} د.إ</td>
              </tr>
            )}
            <tr>
              <td className="font-bold text-emerald-400">{LANG[lang].total}:</td>
              <td className="font-bold text-emerald-300">{total.toFixed(2)} د.إ</td>
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
        {loading ? LANG[lang].processing : `${LANG[lang].payBtn} (${total.toFixed(2)} د.إ)`}
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

export default function CardPaymentPage() {
  const [success, setSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    // اقرأ بيانات الدفع من localStorage
    const data = JSON.parse(localStorage.getItem("paymentData"));
    setPaymentData(data);
  }, []);

  if (!paymentData || !paymentData.clientSecret) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-black text-white">
        <div className="text-xl font-bold">لم يتم العثور على بيانات الدفع. يرجى العودة للمحفظة أو إعادة المحاولة.</div>
      </div>
    );
  }

  if (success) {
    return (
      <PaymentSuccessPage
        paymentId={paymentId}
        amount={paymentData.price + (paymentData.service?.printingFee || 0) + (paymentData.service?.vat || 0)}
        serviceName={paymentData.service?.name}
        orderNumber={orderNumber}
        printingFee={paymentData.service?.printingFee || 0}
        vat={paymentData.service?.vat || 0}
        lang={paymentData.lang}
      />
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
        <CardForm
          paymentData={paymentData}
          lang={paymentData.lang}
          onSuccess={(id, orderNum) => {
            setSuccess(true);
            setPaymentId(id);
            setOrderNumber(orderNum);
          }}
        />
      </Elements>
    </div>
  );
}