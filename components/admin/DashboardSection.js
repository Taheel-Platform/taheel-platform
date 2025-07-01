import {
  FaUsers, FaBuilding, FaUserCheck, FaUserAlt, FaRegClock,
  FaShoppingCart, FaCheckCircle, FaHourglassHalf, FaTimesCircle,
  FaChartLine, FaChartPie, FaClipboardList, FaArrowUp, FaArrowDown, FaMoneyBillWave
} from "react-icons/fa";

export default function DashboardSection({ lang }) {
  // بيانات وهمية (استبدلها لاحقاً بـ API حقيقي)
  const clients = [
    { labelAr: "شركات", labelEn: "Companies", count: 120, icon: <FaBuilding className="text-blue-600" /> },
    { labelAr: "مقيمين", labelEn: "Residents", count: 800, icon: <FaUserCheck className="text-emerald-600" /> },
    { labelAr: "غير مقيمين", labelEn: "Non-Residents", count: 350, icon: <FaUserAlt className="text-purple-600" /> }
  ];

  const serviceOrders = [
    { labelAr: "طلبات خدمات مقيمين", labelEn: "Resident Service Orders", count: 42, icon: <FaUserCheck className="text-emerald-600" /> },
    { labelAr: "طلبات خدمات غير مقيمين", labelEn: "Non-Resident Service Orders", count: 17, icon: <FaUserAlt className="text-purple-600" /> },
    { labelAr: "طلبات خدمات شركات", labelEn: "Company Service Orders", count: 11, icon: <FaBuilding className="text-blue-600" /> },
    { labelAr: "طلبات أخرى", labelEn: "Other Service Orders", count: 6, icon: <FaClipboardList className="text-gray-400" /> }
  ];

  const orderStatus = [
    { labelAr: "واردة اليوم", labelEn: "Incoming Today", count: 32, icon: <FaShoppingCart className="text-indigo-600" /> },
    { labelAr: "لم يُتخذ إجراء", labelEn: "No Action Yet", count: 9, icon: <FaRegClock className="text-orange-500" /> },
    { labelAr: "ناجحة", labelEn: "Successful", count: 19, icon: <FaCheckCircle className="text-green-600" /> },
    { labelAr: "قيد الانتظار", labelEn: "Pending", count: 3, icon: <FaHourglassHalf className="text-yellow-500" /> },
    { labelAr: "مرفوضة", labelEn: "Rejected", count: 1, icon: <FaTimesCircle className="text-red-500" /> }
  ];

  // مؤشرات النمو والأرباح
  const monthlyGrowth = {
    percent: 8, // بالمئة
    up: true,
    labelAr: "النمو الشهري",
    labelEn: "Monthly Growth"
  };
  const revenue = {
    value: "95,000 د.إ",
    diff: 2200,
    up: true,
    labelAr: "إجمالي الأرباح",
    labelEn: "Total Revenue"
  };

  return (
    <div className="flex flex-col gap-8">
      {/* عنوان الإحصائيات */}
      <div className="flex items-center gap-3 mb-2">
        <FaChartLine className="text-emerald-700 text-2xl" />
        <span className="text-2xl font-extrabold text-emerald-800">
          {lang === "ar" ? "لوحة الإحصائيات التفصيلية" : "Detailed Dashboard"}
        </span>
      </div>

      {/* مؤشرات النمو والأرباح */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* النمو الشهري */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaChartLine className="text-indigo-600 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? monthlyGrowth.labelAr : monthlyGrowth.labelEn}</span>
          <span className="text-2xl font-extrabold text-emerald-800 flex items-center gap-2 mt-1">
            {monthlyGrowth.up ? <FaArrowUp className="text-green-500" /> : <FaArrowDown className="text-red-500" />}
            {monthlyGrowth.percent}%
          </span>
          <span className="text-gray-500 font-medium">{lang === "ar" ? "مقارنة بالشهر الماضي" : "vs last month"}</span>
        </div>
        {/* الأرباح */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaMoneyBillWave className="text-yellow-500 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? revenue.labelAr : revenue.labelEn}</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1">{revenue.value}</span>
          <span className={`font-bold flex items-center gap-1 ${revenue.up ? "text-green-600" : "text-red-600"}`}>
            {revenue.up ? <FaArrowUp /> : <FaArrowDown />}
            {revenue.diff > 0 ? "+" : ""}{revenue.diff} {lang === "ar" ? "اليوم" : "today"}
          </span>
        </div>
        {/* العملاء */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaUsers className="text-blue-500 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? "إجمالي العملاء" : "Total Clients"}</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1">1270</span>
        </div>
        {/* الطلبات */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center justify-center gap-2">
          <FaShoppingCart className="text-emerald-500 text-3xl" />
          <span className="text-lg font-bold text-gray-700 mt-2">{lang === "ar" ? "إجمالي الطلبات" : "Total Orders"}</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-1">76</span>
        </div>
      </div>

      {/* إحصائيات العملاء */}
      <div>
        <div className="font-bold text-emerald-700 mb-3 text-lg">
          {lang === "ar" ? "العملاء حسب الفئة" : "Clients by Category"}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {clients.map((c, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-2">
              <div className="text-3xl">{c.icon}</div>
              <div className="text-2xl font-extrabold text-emerald-800">{c.count}</div>
              <div className="text-gray-600 font-bold">{lang === "ar" ? c.labelAr : c.labelEn}</div>
            </div>
          ))}
        </div>
      </div>

      {/* إحصائيات الطلبات لكل نوع خدمة */}
      <div>
        <div className="font-bold text-emerald-700 mb-3 text-lg">
          {lang === "ar" ? "عدد الطلبات لكل خدمة اليوم" : "Orders per Service Today"}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {serviceOrders.map((s, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-2">
              <div className="text-3xl">{s.icon}</div>
              <div className="text-2xl font-extrabold text-emerald-800">{s.count}</div>
              <div className="text-gray-600 font-bold text-center">{lang === "ar" ? s.labelAr : s.labelEn}</div>
            </div>
          ))}
        </div>
      </div>

      {/* حالة الطلبات اليوم */}
      <div>
        <div className="font-bold text-emerald-700 mb-3 text-lg">
          {lang === "ar" ? "حالة الطلبات اليومية (لحظي)" : "Today's Orders Status (Live)"}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {orderStatus.map((o, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-5 flex flex-col items-center gap-2">
              <div className="text-3xl">{o.icon}</div>
              <div className="text-2xl font-extrabold text-emerald-800">{o.count}</div>
              <div className="text-gray-600 font-bold text-center">{lang === "ar" ? o.labelAr : o.labelEn}</div>
            </div>
          ))}
        </div>
      </div>

      {/* رسوم بيانية مكانها هنا مستقبلاً */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-2">
            <FaChartLine className="text-emerald-700" />
            <span className="text-lg font-bold text-gray-700">{lang === "ar" ? "النمو الشهري" : "Monthly Growth"}</span>
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-400 h-48 text-xl font-bold">
            {/* هنا تضع رسم بياني حقيقي */}
            <span>{lang === "ar" ? "رسم بياني تجريبي" : "Demo Chart"}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-2">
            <FaChartPie className="text-blue-700" />
            <span className="text-lg font-bold text-gray-700">{lang === "ar" ? "نسب توزيع الطلبات" : "Orders Distribution"}</span>
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-400 h-48 text-xl font-bold">
            {/* هنا تضع رسم بياني دائري حقيقي */}
            <span>{lang === "ar" ? "رسم بياني تجريبي" : "Demo Pie Chart"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}