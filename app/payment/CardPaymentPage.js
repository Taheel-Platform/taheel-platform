import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Image from "next/image";
import PaymentSuccessPage from "./PaymentSuccessPage";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function CardForm({ service, price, customerId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [payMsg, setPayMsg] = useState("");

  // تفاصيل الفاتورة
  const printingFee = service.printingFee || 0;
  const vat = service.vat || 0;
  const total = price + printingFee + vat;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPayMsg("");

    // 1. إنشاء PaymentIntent
    const res = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: total,
        serviceId: service.id,
        serviceName: service.name,
        customerId,
        userEmail: service.userEmail
      })
    });
    const { clientSecret, error, orderNumber } = await res.json();

    if (!clientSecret) {
      setPayMsg(error || "خطأ في إنشاء عملية الدفع.");
      setLoading(false);
      return;
    }

    // 2. تنفيذ الدفع
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

    // 3. بعد النجاح: أرسل الإيميل
    if (paymentIntent.status === "succeeded") {
      setPayMsg("تم الدفع بنجاح!");

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
          lang: "ar"
        }),
      });

      onSuccess(paymentIntent.id, orderNumber);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center">
      <Image src="/logo3.png" width={60} height={60} alt="Logo" />
      <div className="font-bold text-lg text-emerald-700">دفع خدمة {service.name}</div>
      <div className="bg-blue-50 rounded-lg p-3 w-full mb-1 text-center">
        <table className="w-full text-sm text-right mb-2">
          <tbody>
            <tr>
              <td>رسوم الخدمة:</td>
              <td>{price.toFixed(2)} د.إ</td>
            </tr>
            <tr>
              <td>رسوم الطباعة:</td>
              <td>{printingFee.toFixed(2)} د.إ</td>
            </tr>
            <tr>
              <td>الضريبة (VAT):</td>
              <td>{vat.toFixed(2)} د.إ</td>
            </tr>
            <tr>
              <td className="font-bold text-emerald-700">الإجمالي النهائي:</td>
              <td className="font-bold text-emerald-800">{total.toFixed(2)} د.إ</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="w-full">
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 text-white font-black text-lg mt-3"
      >
        {loading ? "جارى الدفع..." : `ادفع الآن (${total.toFixed(2)} د.إ)`}
      </button>
      {payMsg && (
        <div className={`mt-2 text-center font-bold text-xs ${payMsg.includes("نجاح") ? "text-emerald-700" : "text-red-600"}`}>
          {payMsg}
        </div>
      )}
    </form>
  );
}

export default function CardPaymentPage({ service, price, customerId }) {
  const [success, setSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  if (success) {
    return (
      <PaymentSuccessPage
        paymentId={paymentId}
        amount={price + (service.printingFee || 0) + (service.vat || 0)}
        serviceName={service.name}
        orderNumber={orderNumber}
        printingFee={service.printingFee || 0}
        vat={service.vat || 0}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-emerald-50 to-white font-sans">
      <Elements stripe={stripePromise}>
        <CardForm
          service={service}
          price={price}
          customerId={customerId}
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