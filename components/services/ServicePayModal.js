import { useState } from "react";

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
}) {
  const [useCoins, setUseCoins] = useState(false);
  const [payMethod, setPayMethod] = useState("wallet");
  const [isPaying, setIsPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");

  const maxCoinDiscount = Math.floor(printingFee * 0.1 * 1000);
  const coinDiscount = useCoins ? Math.min(coinsBalance, maxCoinDiscount) : 0;
  const coinDiscountValue = coinDiscount / 1000;

  const finalPrice = totalPrice - coinDiscountValue;
  const willGetCashback = !useCoins;

  // دالة دفع من المحفظة
  async function handlePayment() {
    setIsPaying(true);
    setPayMsg("");
    try {
      const response = await fetch("/api/pay-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          useCoins,
          coinDiscountValue,
          serviceName,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setPayMsg(lang === "ar" ? "تم الدفع بنجاح!" : "Payment successful!");
        setTimeout(() => onClose(), 1200);
      } else {
        setPayMsg(result.error || (lang === "ar" ? "حدث خطأ أثناء الدفع." : "Payment failed."));
      }
    } catch (e) {
      setPayMsg(lang === "ar" ? "حدث خطأ في الاتصال بالخادم." : "Server error.");
    } finally {
      setIsPaying(false);
    }
  }

  // دالة التحويل للبوابة
  async function handleGatewayRedirect() {
    setIsPaying(true);
    setPayMsg("");
    try {
      const response = await fetch("/api/create-payment-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          serviceName,
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

  return open && (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/40">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <button onClick={onClose}>إغلاق</button>
        <h2>دفع الخدمة: {serviceName}</h2>
        <div>إجمالي السعر: {totalPrice.toFixed(2)} د.إ</div>
        <div>رسوم الطباعة: {printingFee} د.إ</div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={useCoins}
              onChange={e => setUseCoins(e.target.checked)}
              disabled={coinsBalance < 1}
            />
            استخدام الكوينات للخصم (خصم حتى 10% من رسوم الطباعة)
          </label>
          <div>
            رصيد الكوينات: {coinsBalance} ({(coinsBalance/1000).toFixed(2)} د.إ)
          </div>
          {useCoins && (
            <div>
              سيتم الخصم: {coinDiscount} كوين = {coinDiscountValue.toFixed(2)} د.إ
            </div>
          )}
        </div>
        <div>
          طرق الدفع:
          <label>
            <input
              type="radio"
              checked={payMethod === "wallet"}
              onChange={() => setPayMethod("wallet")}
              disabled={userWallet < finalPrice}
            />
            المحفظة (رصيدك: {userWallet} د.إ)
          </label>
          <label>
            <input
              type="radio"
              checked={payMethod === "gateway"}
              onChange={() => setPayMethod("gateway")}
            />
            بوابة الدفع (فيزا/مدفوعات)
          </label>
        </div>
        <div>
          {willGetCashback
            ? `سيتم إضافة ${cashbackCoins} كوين لرصيدك بعد الدفع`
            : "لن تحصل على كوينات كاش باك عند استخدام الكوينات للخصم"}
        </div>
        <button onClick={onPayClick} disabled={isPaying}>
          {isPaying ? "جاري الدفع..." : `دفع الآن (${finalPrice.toFixed(2)} د.إ)`}
        </button>
        {payMsg && <div className="mt-2 text-red-600">{payMsg}</div>}
      </div>
    </div>
  );
}