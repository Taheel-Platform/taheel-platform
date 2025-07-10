"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase.client";
import {
  FaUsers, FaBuilding, FaUserCheck, FaUserAlt, FaRegClock,
  FaShoppingCart, FaCheckCircle, FaHourglassHalf, FaTimesCircle,
  FaChartLine, FaChartPie, FaClipboardList, FaArrowUp, FaArrowDown, FaMoneyBillWave
} from "react-icons/fa";

// دالة مساعدة لتنسيق الرقم
function formatNumber(num) {
  return Number(num || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function DashboardSection({ lang = "ar" }) {
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // جلب العملاء
      const usersSnap = await getDocs(collection(firestore, "users"));
      const clientsArr = [];
      usersSnap.forEach(doc => {
        const d = doc.data();
        if (d.role === "client") clientsArr.push({ ...d, userId: d.userId || doc.id });
      });
      setClients(clientsArr);

      // جلب الطلبات
      const reqSnap = await getDocs(collection(firestore, "requests"));
      const ordersArr = [];
      reqSnap.forEach(doc => ordersArr.push({ ...doc.data(), requestId: doc.id }));
      setOrders(ordersArr);

      setLoading(false);
    }
    fetchData();
  }, []);

  // ----------- حساب العدادات حسب الحالة -----------
  // جميع الحالات الحقيقية الموجودة في الداتا
  const allStatuses = Array.from(new Set(orders.map(o => o.status || "unknown")));

  // حساب عدد الطلبات لكل حالة (من كل الداتا)
  const statusCounts = {};
  allStatuses.forEach(status => {
    statusCounts[status] = orders.filter(o => (o.status || "unknown") === status).length;
  });

  // ----------- حساب العدادات حسب نوع العميل لكل حالة -----------
  // أنواع العملاء الأساسية
  const clientTypes = [
    { key: "company", label: "شركات", icon: <FaBuilding className="text-blue-600" /> },
    { key: "resident", label: "مقيمين", icon: <FaUserCheck className="text-emerald-600" /> },
    { key: "nonResident", label: "غير مقيمين", icon: <FaUserAlt className="text-purple-600" /> },
    { key: "other", label: "أخرى", icon: <FaClipboardList className="text-gray-400" /> }
  ];

  // لكل حالة ولكل نوع عميل، كم طلب؟
  const statusByClientType = {};
  allStatuses.forEach(status => {
    statusByClientType[status] = {};
    clientTypes.forEach(type => {
      statusByClientType[status][type.key] = orders.filter(o => {
        const client = clients.find(c => c.userId === o.clientId);
        if (!client && type.key === "other") return (o.status || "unknown") === status;
        if (!client) return false;
        if (type.key === "nonResident") {
          return (client.type === "nonResident" || client.type === "nonresident") && (o.status || "unknown") === status;
        }
        return client.type === type.key && (o.status || "unknown") === status;
      }).length;
    });
  });

  // ----------- إحصائيات العملاء حسب الفئة -----------
  const companiesCount = clients.filter(c => c.type === "company").length;
  const residentsCount = clients.filter(c => c.type === "resident").length;
  const nonResidentsCount = clients.filter(c => c.type === "nonResident" || c.type === "nonresident").length;
  const totalClients = clients.length;

  // ----------- الأرباح (للطلبات المكتملة فقط) -----------
  const completedStatuses = ["completed", "successful", "done", "ناجحة"];
  const totalRevenue = orders.reduce(
    (sum, o) => completedStatuses.includes(o.status) && o.paidAmount ? sum + Number(o.paidAmount) : sum, 0
  );

  // ----------- إجمالي الطلبات -----------
  const totalOrders = orders.length;

  if (loading)
    return <div className="text-center my-8">...جاري تحميل البيانات</div>;

  // ----------- عرض الكروت -----------

  return (
    <div className="flex flex-col gap-8">

      <div className="flex items-center gap-3 mb-2">
        <FaChartLine className="text-emerald-700 text-2xl" />
        <span className="text-2xl font-extrabold text-emerald-800">
          {lang === "ar" ? "لوحة الإحصائيات التفصيلية" : "Detailed Dashboard"}
        </span>
      </div>

      {/* كروت رئيسية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* الأرباح */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaMoneyBillWave className="text-yellow-500 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? "إجمالي الأرباح المكتملة" : "Total Revenue"}</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1">{formatNumber(totalRevenue)} د.إ</span>
        </div>
        {/* العملاء */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaUsers className="text-blue-500 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? "إجمالي العملاء" : "Total Clients"}</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1">{formatNumber(totalClients)}</span>
        </div>
        {/* الطلبات */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaShoppingCart className="text-emerald-500 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? "إجمالي الطلبات" : "Total Orders"}</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1">{formatNumber(totalOrders)}</span>
        </div>
        {/* حالة الطلبات: مكتملة */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaCheckCircle className="text-green-600 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? "طلبات مكتملة" : "Completed Orders"}</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1">{statusCounts["completed"] || 0}</span>
        </div>
      </div>

      {/* العملاء حسب الفئة */}
      <div>
        <div className="font-bold text-emerald-700 mb-3 text-lg">
          {lang === "ar" ? "العملاء حسب الفئة" : "Clients by Category"}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-2">
            <FaBuilding className="text-blue-600 text-3xl" />
            <span className="text-2xl font-extrabold text-emerald-800">{companiesCount}</span>
            <span className="text-gray-600 font-bold">{lang === "ar" ? "شركات" : "Companies"}</span>
          </div>
          <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-2">
            <FaUserCheck className="text-emerald-600 text-3xl" />
            <span className="text-2xl font-extrabold text-emerald-800">{residentsCount}</span>
            <span className="text-gray-600 font-bold">{lang === "ar" ? "مقيمين" : "Residents"}</span>
          </div>
          <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-2">
            <FaUserAlt className="text-purple-600 text-3xl" />
            <span className="text-2xl font-extrabold text-emerald-800">{nonResidentsCount}</span>
            <span className="text-gray-600 font-bold">{lang === "ar" ? "غير مقيمين" : "Non-Residents"}</span>
          </div>
        </div>
      </div>

      {/* الطلبات حسب الحالة */}
      <div>
        <div className="font-bold text-emerald-700 mb-3 text-lg">
          {lang === "ar" ? "عدد الطلبات حسب الحالة" : "Orders by Status"}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allStatuses.map((status, i) => (
            <div key={status} className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-2">
              <div className="text-3xl">
                {status === "completed" || status === "successful" || status === "done" || status === "ناجحة"
                  ? <FaCheckCircle className="text-green-600" />
                  : status === "pending" || status === "قيد الانتظار" ? <FaHourglassHalf className="text-yellow-500" />
                  : status === "rejected" || status === "مرفوضة" ? <FaTimesCircle className="text-red-500" />
                  : <FaClipboardList className="text-gray-400" />}
              </div>
              <div className="text-2xl font-extrabold text-emerald-800">{statusCounts[status]}</div>
              <div className="text-gray-600 font-bold text-center">{lang === "ar" ? status : status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* جدول الطلبات حسب الحالة ونوع العميل */}
      <div>
        <div className="font-bold text-emerald-700 mb-3 text-lg">
          {lang === "ar" ? "عدد الطلبات لكل حالة ولكل نوع عميل" : "Orders by Status and Client Type"}
        </div>
<div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 bg-gradient-to-br from-white via-slate-50 to-gray-100">
  <table className="min-w-full text-center">
    <thead className="bg-gradient-to-r from-emerald-600 to-indigo-600 text-white sticky top-0 z-10">
      <tr>
        <th className="p-3 font-extrabold text-lg border-b border-gray-200">الحالة</th>
        {clientTypes.map(type => (
          <th key={type.key} className="p-3 font-extrabold text-lg border-b border-gray-200">{type.label}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {allStatuses.map((status, i) => (
        <tr
          key={status}
          className={`transition duration-150 hover:bg-emerald-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
        >
          <td className="px-4 py-3 font-bold text-emerald-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#10b981" }}></span>
            {status}
          </td>
          {clientTypes.map(type => (
            <td key={type.key} className="px-4 py-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-100 to-emerald-200 font-bold text-emerald-800 shadow">
                {statusByClientType[status][type.key]}
              </span>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
      </div>
    </div>
  );
}