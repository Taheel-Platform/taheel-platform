"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase.client";
import * as XLSX from "xlsx";

function formatMoney(num) {
  return Number(num || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function getDayStart() {
  const now = new Date();
  now.setHours(0,0,0,0);
  return now;
}
function getMonthStart() {
  const now = new Date();
  now.setDate(1);
  now.setHours(0,0,0,0);
  return now;
}

export default function FinanceSection({ lang = "ar" }) {
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalWallets: 0,
    totalCoins: 0,
    tax: 0,
    netProfit: 0,
    serviceAvg: 0,
    serviceSum: 0,
    pendingWallets: 0,
    usedCoins: 0,
    dailyProfit: 0,
    monthlyProfit: 0,
  });
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showClients, setShowClients] = useState({ type: null, data: [] });

  useEffect(() => {
    async function fetchData() {
      // الطلبات
      const reqSnap = await getDocs(collection(db, "requests"));
      let totalRevenue = 0, serviceSum = 0, serviceCount = 0, usedCoins = 0;
      let dailyProfit = 0, monthlyProfit = 0;
      let ordersArr = [];
      const today = getDayStart();
      const monthStart = getMonthStart();

      reqSnap.forEach(doc => {
        const d = doc.data();
        ordersArr.push({ ...d, requestId: doc.id });
        if (d.paidAmount && d.status === "completed") {
          totalRevenue += Number(d.paidAmount);
          serviceSum += Number(d.paidAmount);
          serviceCount++;
          if (d.createdAt) {
            const created = new Date(d.createdAt);
            if (created >= today) dailyProfit += Number(d.paidAmount);
            if (created >= monthStart) monthlyProfit += Number(d.paidAmount);
          }
        }
        if (d.coinsUsed) {
          usedCoins += Number(d.coinsUsed);
        }
      });

      // المستخدمين
      const usersSnap = await getDocs(collection(db, "users"));
      let totalWallets = 0, totalCoins = 0, pendingWallets = 0;
      let clientsArr = [];
      usersSnap.forEach(doc => {
        const d = doc.data();
        if (["resident", "nonresident", "nonResident", "company"].includes(d.type)) {
          totalWallets += Number(d.walletBalance || 0);
          totalCoins += Number(d.coins || 0);
          if ((d.walletBalance || 0) > 0) pendingWallets += Number(d.walletBalance);
          clientsArr.push({ ...d, userId: doc.id });
        }
      });

      let tax = totalRevenue * 0.05;
      let netProfit = totalRevenue - tax;
      let serviceAvg = serviceCount ? Math.round(serviceSum / serviceCount) : 0;

      setSummary({
        totalRevenue, totalWallets, totalCoins, tax, netProfit, serviceAvg, serviceSum,
        pendingWallets, usedCoins, dailyProfit, monthlyProfit
      });
      setClients(clientsArr);
      setOrders(ordersArr);
    }
    fetchData();
  }, []);

  function showTable(type) {
    let data = [];
    if (type === "wallets") data = clients.filter(c => (c.walletBalance || 0) > 0);
    if (type === "coins") data = clients.filter(c => (c.coins || 0) > 0);
    setShowClients({ type, data });
  }
  function exportExcel() {
    const orderData = orders.map(o => ({
      [lang === "ar" ? "العميل" : "Client"]: clients.find(c => c.userId === o.clientId)?.name || o.clientId,
      [lang === "ar" ? "رقم العميل" : "Client ID"]: o.clientId,
      [lang === "ar" ? "الخدمة" : "Service"]: o.serviceId,
      [lang === "ar" ? "المبلغ المدفوع" : "Paid Amount"]: o.paidAmount,
      [lang === "ar" ? "كوينات مستخدمة" : "Coins Used"]: o.coinsUsed || 0,
      [lang === "ar" ? "الحالة" : "Status"]: o.status,
      [lang === "ar" ? "التاريخ" : "Date"]: o.createdAt ? new Date(o.createdAt).toLocaleString() : "",
    }));
    const ws = XLSX.utils.json_to_sheet(orderData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lang === "ar" ? "الطلبات" : "Orders");
    XLSX.writeFile(wb, `finance-report-${new Date().toISOString().slice(0,7)}.xlsx`);
  }
  function resetMonthly() {
    alert(lang === "ar" ? "تم تصفير عدادات الشهر!" : "Monthly counters reset!");
    window.location.reload();
  }

  // الألوان المقترحة (تأكد من دعمها في tailwind.config)
  const cardColors = {
    emerald: { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-400" },
    cyan: { bg: "bg-cyan-100", text: "text-cyan-900", border: "border-cyan-400" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-400" },
    red: { bg: "bg-red-100", text: "text-red-900", border: "border-red-400" },
    green: { bg: "bg-green-100", text: "text-green-900", border: "border-green-400" },
    indigo: { bg: "bg-indigo-100", text: "text-indigo-900", border: "border-indigo-400" },
    gray: { bg: "bg-gray-100", text: "text-gray-900", border: "border-gray-400" },
    blue: { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-400" }
  };

  const cards = [
    { key: "totalRevenue", label: lang === "ar" ? "إجمالي الوارد" : "Total Revenue", value: summary.totalRevenue, icon: "💰", color: "emerald" },
    { key: "totalWallets", label: lang === "ar" ? "رصيد المحافظ" : "Wallets Balance", value: summary.totalWallets, icon: "👛", color: "cyan", onClick: () => showTable("wallets") },
    { key: "totalCoins", label: lang === "ar" ? "إجمالي الكوينات" : "Total Coins", value: summary.totalCoins, icon: "🪙", color: "yellow", onClick: () => showTable("coins") },
    { key: "tax", label: lang === "ar" ? "إجمالي الضريبة (5%)" : "Total Tax (5%)", value: summary.tax, icon: "🧾", color: "red" },
    { key: "netProfit", label: lang === "ar" ? "صافي الربح" : "Net Profit", value: summary.netProfit, icon: "📈", color: "green" },
    { key: "serviceAvg", label: lang === "ar" ? "متوسط سعر الخدمة" : "Service Price Avg.", value: summary.serviceAvg, icon: "⚖️", color: "indigo" },
    { key: "serviceSum", label: lang === "ar" ? "إجمالي العمليات" : "Total Transactions", value: summary.serviceSum, icon: "📄", color: "gray" },
    { key: "dailyProfit", label: lang === "ar" ? "ربح اليوم" : "Daily Profit", value: summary.dailyProfit, icon: "🗓️", color: "blue" },
    { key: "monthlyProfit", label: lang === "ar" ? "ربح هذا الشهر" : "Monthly Profit", value: summary.monthlyProfit, icon: "📆", color: "blue" }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow p-8 max-w-7xl mx-auto">
      {/* عنوان وزرين */}
      <div className="flex flex-col md:flex-row md:justify-between items-center mb-8 gap-4">
        <span className="text-3xl font-extrabold text-slate-900 text-center tracking-wide">
          {lang === "ar" ? "لوحة الماليات المتكاملة" : "Full Finance Dashboard"}
        </span>
        <div className="flex items-center gap-3">
          <button onClick={exportExcel} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-800 text-white font-bold shadow transition">
            {lang === "ar" ? "تصدير تقرير إكسل" : "Export Excel"}
          </button>
          <button onClick={resetMonthly} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-700 text-white font-bold shadow transition">
            {lang === "ar" ? "تصفير عدادات الشهر" : "Reset Monthly"}
          </button>
        </div>
      </div>
      {/* العدادات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {cards.map(card => {
          const color = cardColors[card.color];
          return (
            <div
              key={card.key}
              onClick={card.onClick}
              className={`group cursor-pointer p-6 rounded-2xl shadow ${color.bg} ${color.border} border flex flex-col justify-center items-center transition-all relative ${card.onClick ? "hover:scale-105" : "opacity-85"}`}
              style={{ minWidth: 170 }}
            >
              <span className="text-4xl mb-3">{card.icon}</span>
              <span className={`text-2xl font-extrabold ${color.text}`}>
                {formatMoney(card.value)} {["totalCoins"].includes(card.key) ? "" : "د.إ"}
              </span>
              <span className={`text-base ${color.text} font-semibold mt-2 text-center`}>
                {card.label}
              </span>
              {card.onClick && (
                <span className="absolute top-2 right-3 text-xs rounded bg-white/90 text-gray-700 px-2 py-0.5 border shadow group-hover:bg-emerald-100 group-hover:text-emerald-700">
                  {lang === "ar" ? "عرض التفاصيل" : "View details"}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* جدول العملاء عند الضغط على عداد */}
      {showClients.type && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-2 relative animate-fade-in">
            <button
              className="absolute top-3 left-3 text-gray-400 hover:text-red-700 text-3xl font-extrabold"
              onClick={() => setShowClients({ type: null, data: [] })}
              title={lang === "ar" ? "إغلاق" : "Close"}
            >×</button>
            <div className="font-bold text-xl mb-5 text-emerald-800 flex items-center gap-2">
              {showClients.type === "wallets" && (lang === "ar" ? "العملاء الذين لديهم رصيد في المحفظة" : "Clients with Wallet Balance")}
              {showClients.type === "coins" && (lang === "ar" ? "العملاء الذين لديهم كوينات" : "Clients with Coins")}
            </div>
            <table className="w-full text-center border">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="py-2 px-2 border-b text-gray-900">{lang === "ar" ? "اسم العميل" : "Client Name"}</th>
                  <th className="py-2 px-2 border-b text-gray-900">{lang === "ar" ? "رقم العميل" : "Client ID"}</th>
                  {showClients.type === "wallets" && <th className="py-2 px-2 border-b text-gray-900">{lang === "ar" ? "الرصيد" : "Wallet Balance"}</th>}
                  {showClients.type === "coins" && <th className="py-2 px-2 border-b text-gray-900">{lang === "ar" ? "عدد الكوينات" : "Coins"}</th>}
                </tr>
              </thead>
              <tbody>
                {showClients.data.map((c) => (
                  <tr key={c.userId} className="border-b hover:bg-emerald-50 transition">
                    <td className="py-2 px-2 text-gray-900">{c.name}</td>
                    <td className="py-2 px-2 text-gray-900">{c.userId}</td>
                    {showClients.type === "wallets" && <td className="py-2 px-2 text-gray-900">{formatMoney(c.walletBalance)}</td>}
                    {showClients.type === "coins" && <td className="py-2 px-2 text-gray-900">{formatMoney(c.coins)}</td>}
                  </tr>
                ))}
                {showClients.data.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-gray-400">{lang === "ar" ? "لا يوجد عملاء" : "No clients found"}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              className="mt-6 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-700 text-white font-bold w-full transition"
              onClick={() => setShowClients({ type: null, data: [] })}
            >
              {lang === "ar" ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}