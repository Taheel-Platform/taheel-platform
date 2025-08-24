/**
 * حساب رسوم Stripe بدقة (الإمارات، بنك المشرق بدون رسوم بنكية)
 * @param {number} amount - المبلغ الأساسي (بالدرهم)
 * @param {Object} options - خيارات إضافية
 *   - isInternational: true لو العميل يستخدم بطاقة دولية (افتراضي false)
 *   - isCurrencyConversion: true لو هناك تحويل عملة (افتراضي false)
 * @returns {Object} - تفاصيل الرسوم والمبلغ النهائي المطلوب من العميل
 */
function calcStripeFees(amount, options = {}) {
  const percentFee = 0.029; // 2.9%
  const fixedFee = 1;       // 1 درهم لكل عملية
  const intlFee = options.isInternational ? amount * 0.01 : 0;
  const currencyFee = options.isCurrencyConversion ? amount * 0.01 : 0;

  // رسوم Stripe الكلية
  const stripeFee = (amount * percentFee) + fixedFee + intlFee + currencyFee;

  // المبلغ النهائي اللي يدفعه العميل
  const totalAmount = +(amount + stripeFee).toFixed(2);

  return {
    serviceAmount: +amount.toFixed(2),
    stripeFee: +stripeFee.toFixed(2),
    totalAmount
  };
}

export default calcStripeFees;