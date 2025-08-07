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
  handlePayment,
  onGatewayRedirect,
}) {
  const [useCoins, setUseCoins] = useState(false);
  const [payMethod, setPayMethod] = useState("wallet"); // أو "gateway"
  // حساب الخصم بالكوينات (10% من رسوم الطباعة كحد أقصى)
  const maxCoinDiscount = Math.floor(printingFee * 0.1 * 1000); // بالكوينات
  const coinDiscount = useCoins ? Math.min(coinsBalance, maxCoinDiscount) : 0;
  const coinDiscountValue = coinDiscount / 1000; // بالدرهم

  // السعر النهائي بعد الخصم
  const finalPrice =
    totalPrice - coinDiscountValue;

  // لن يحصل على الكاش باك لو استخدم الكوينات في الخصم
  const willGetCashback = !useCoins;

  // عند الدفع
  async function onPayClick() {
    if (payMethod === "wallet") {
      // ادفع من المحفظة مباشرة
      await handlePayment({ useCoins, payMethod, coinDiscountValue });
      onClose();
    } else if (payMethod === "gateway") {
      // حول لبوابة الدفع
      onGatewayRedirect({ amount: finalPrice });
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
        <button onClick={onPayClick}>
          دفع الآن ({finalPrice.toFixed(2)} د.إ)
        </button>
      </div>
    </div>
  );
}