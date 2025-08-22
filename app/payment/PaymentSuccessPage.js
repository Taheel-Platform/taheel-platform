import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function PaymentSuccessPage({
  paymentId,
  amount,
  serviceName,
  orderNumber,
  userEmail,
  printingFee,
  vat,
  coinsUsed
}) {
  const [count, setCount] = useState(5);
  const router = useRouter();

  // 1. إرسال الإيميل وتحديث الطلب مرة واحدة فقط عند أول تحميل
  useEffect(() => {
    // إرسال إيميل التأكيد
    fetch("/api/sendOrderEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: userEmail,
        orderNumber,
        serviceName,
        price: amount,
        paymentId,
        printingFee,
        vat,
        coinsUsed,
        paymentMethod: "gateway",
        lang: "ar"
      }),
    });

    // تحديث حالة الطلب في فايرستور
    fetch("/api/update-request-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber,
        status: "paid",
        paymentIntentId: paymentId,
        paidAmount: amount
      }),
    });
  }, []); // ← فارغ ليتم التنفيذ مرة واحدة فقط

  // 2. العد التنازلي والتحويل
  useEffect(() => {
    if (count === 0) {
      router.push("/dashboard/profile");
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-100 via-blue-50 to-white font-sans">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full flex flex-col gap-4 border border-emerald-200 items-center">
        <Image src="/logo3.png" width={60} height={60} alt="Logo" />
        <div className="font-extrabold text-xl text-emerald-800 mt-2 text-center">
          تم دفع مبلغ <span className="text-emerald-700">{amount} د.إ</span> بنجاح!
        </div>
        <div className="text-gray-600 font-bold text-center">
          رسوم خدمة: <span className="text-emerald-700">{serviceName}</span>
        </div>
        <div className="text-blue-900 font-bold text-center mt-2">
          رقم العملية: <span className="text-gray-800">{paymentId}</span>
        </div>
        <div className="text-emerald-900 font-bold text-center mt-2">
          رقم الطلب للتتبع: <span className="text-emerald-700">{orderNumber}</span>
        </div>
        <div className="text-center mt-2 text-sm text-emerald-600 font-bold">
          شكراً على ثقتكم في <span className="text-emerald-700 font-black">تأهيل</span><br />
          سيتم التعامل مع طلبكم خلال دقائق، يمكنكم متابعة حالة الطلب من الملف الشخصي
        </div>
        <div className="text-blue-900 font-bold text-center mt-2">
          سيتم تحويلك تلقائياً للملف الشخصي خلال <span className="text-emerald-700 font-black">{count}</span> ثانية
        </div>
      </div>
    </div>
  );
}