"use client";
import { Suspense, useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { firestore } from "@/lib/firebase.client";
import { FaWallet, FaCoins } from "react-icons/fa";

// ===== Helper functions =====

function getDuration(inTime, outTime) {
  if (!inTime || !outTime) return 0;
  const [h1, m1] = inTime.split(":").map(Number);
  const [h2, m2] = outTime.split(":").map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return +(mins / 60).toFixed(2);
}

function splitToWeeks(attendanceArr) {
  const sorted = [...attendanceArr].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const firstDate = new Date(sorted[0].date);
  const year = firstDate.getFullYear();
  const month = firstDate.getMonth();
  const allDays = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    allDays.push(date);
  }
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks.map(weekDays =>
    weekDays.map(date => sorted.find(a => a.date === date) || { date, in: "", out: "" })
  );
}

function exportToCSV(attendanceArr, lang) {
  const t = lang === "ar"
    ? ["التاريخ", "وقت الدخول", "وقت الخروج", "عدد الساعات"]
    : ["Date", "Check-in", "Check-out", "Hours"];
  const rows = attendanceArr.map(a => [
    a.date, a.in || "-", a.out || "-", getDuration(a.in, a.out)
  ]);
  const csv = [t, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "attendance.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ==== Live fetch for orders: تحديث لحظي للطلبات ====
function useLiveOrders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "requests"), (snap) => {
      const arr = [];
      snap.forEach(docSnap => arr.push(docSnap.data()));
      setOrders(arr);
    });
    return () => unsub();
  }, []);
  return orders;
}

// دالة جديدة: جلب docId الصحيح للموظف بناءً على employeeNumber أو uid
async function getEmployeeDocId(employeeData) {
  // لو employeeData.id موجود وموثق كـ UID أو docId استخدمه مباشرة
  if (employeeData?.id) return employeeData.id;
  // لو عندك employeeNumber ابحث به
  if (employeeData?.employeeNumber) {
    const q = query(collection(firestore, "users"), where("employeeNumber", "==", employeeData.employeeNumber));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  }
  return null;
}

// === أرباح الطلبات المنجزة (لحالة مكتمل أو مرفوض فقط) ===
function useEmployeeOrders({ employeeId, orders }) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  let filteredEvents = [];
  let totalEarnings = 0;
  const uniqueRequests = new Set();

  orders.forEach(o => {
    // الطلبات المسندة للموظف فقط
    if (o.assignedTo === employeeId) {
      let eligible = false;
      let earning = 0;
      let createdAt = o.createdAt;

      // لو فيه statusHistory فيه حالة مكتمل أو مرفوض في الشهر الحالي
      if (Array.isArray(o.statusHistory)) {
        const event = o.statusHistory.find(evt => {
          const d = new Date(evt.timestamp);
          return (
            (evt.status === "completed" || evt.status === "rejected") &&
            d.getMonth() + 1 === month &&
            d.getFullYear() === year
          );
        });
        if (event) {
          eligible = true;
          earning = Number(o.printingFee || 0) * 0.4;
          createdAt = event.timestamp;
        }
      }
      // أو لو الحالة الحالية مكتمل أو مرفوض في الشهر الحالي
      else if (
        (o.status === "completed" || o.status === "rejected")
      ) {
        const d = new Date(o.createdAt);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
          eligible = true;
          earning = Number(o.printingFee || 0) * 0.4;
        }
      }

      // أضف الطلب مرة واحدة فقط لو eligible
      if (eligible && !uniqueRequests.has(o.requestId)) {
        uniqueRequests.add(o.requestId);
        filteredEvents.push({
          requestId: o.requestId,
          createdAt,
          status: o.status,
          earning
        });
        totalEarnings += earning;
      }
    }
  });

  return { filteredEvents, totalEarnings };
}

// ======== Main AttendanceSection Component =========

function AttendanceSectionInner({ employeeData, lang = "ar" }) {
  const orders = useLiveOrders(); // جلب الطلبات لحظياً
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDocReady, setUserDocReady] = useState(false);
  const [docId, setDocId] = useState(null);

  const t = {
    ar: {
      title: "سجل الحضور الشهري",
      week: "الأسبوع",
      day: "اليوم",
      date: "التاريخ",
      in: "دخول",
      out: "خروج",
      duration: "ساعات العمل",
      totalHours: "إجمالي ساعات العمل",
      export: "تصدير كـ CSV",
      reset: "تصفير الشهر",
      rest: "راحة",
      noData: "لا يوجد حضور لهذا الشهر.",
      earningsTitle: "أرباحك الشهرية",
      ordersCount: "عدد الطلبات (مكتمل/مرفوض)",
      totalEarnings: "إجمالي الربح",
      orderNum: "رقم الطلب",
      createdAt: "تاريخ الإنشاء",
      yourEarning: "ربحك"
    },
    en: {
      title: "Monthly Attendance",
      week: "Week",
      day: "Day",
      date: "Date",
      in: "In",
      out: "Out",
      duration: "Work Hours",
      totalHours: "Total Hours",
      export: "Export as CSV",
      reset: "Reset Month",
      rest: "Rest",
      noData: "No attendance for this month.",
      earningsTitle: "Your Monthly Earnings",
      ordersCount: "Orders (Completed/Rejected)",
      totalEarnings: "Total Earnings",
      orderNum: "Order No.",
      createdAt: "Created At",
      yourEarning: "Your Earning"
    }
  }[lang === "en" ? "en" : "ar"];

  // جلب docId الصحيح للموظف في البداية
  useEffect(() => {
    async function fetchDocId() {
      const id = await getEmployeeDocId(employeeData);
      setDocId(id);
    }
    fetchDocId();
  }, [employeeData]);

  // تحقق وإنشاء المستخدم تلقائي لو مش موجود مع كل الحقول
  useEffect(() => {
    if (!docId) return;
    const userRef = doc(firestore, "users", docId);

    async function ensureUserDoc() {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        // إنشاء كل الحقول من employeeData + attendance فارغ
        await setDoc(userRef, {
          ...employeeData,
          attendance: []
        });
      } else {
        // لو موجود بالفعل، لو attendance مش موجود أضفه فقط
        if (!docSnap.data().attendance) {
          await updateDoc(userRef, { attendance: [] });
        }
      }
      setUserDocReady(true);
    }

    ensureUserDoc();
  }, [docId, employeeData]);

  // جلب الحضور مباشرة من الفايرستور (تحديث لحظي)
  useEffect(() => {
    if (!docId || !userDocReady) return;
    setLoading(true);
    const userRef = doc(firestore, "users", docId);
    const unsub = onSnapshot(userRef, (snap) => {
      setAttendance(Array.isArray(snap.data()?.attendance) ? snap.data().attendance : []);
      setLoading(false);
    });
    return () => unsub();
  }, [docId, userDocReady]);

  useEffect(() => {
    if (!docId || !attendance.length) return;
    const today = new Date();
    const [last] = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    if (last && last.date) {
      const lastMonth = new Date(last.date).getMonth();
      const currentMonth = today.getMonth();
      if (lastMonth !== currentMonth) {
        updateDoc(doc(firestore, "users", docId), { attendance: [] });
      }
    }
  }, [docId, attendance]);

  const weeks = splitToWeeks(attendance);
  const getWeekHours = (week) =>
    week.reduce((sum, day) => sum + getDuration(day.in, day.out), 0);
  const totalMonthHours = weeks.reduce((s, w) => s + getWeekHours(w), 0);

  const daysNames = lang === "ar"
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const isRestDay = (i) => i === 5;
  const handleExport = () => exportToCSV(attendance, lang);
  const handleReset = async () => {
    if (!docId) return;
    await updateDoc(doc(firestore, "users", docId), { attendance: [] });
  };

  // الطلبات المكتملة أو المرفوضة لهذا الموظف في هذا الشهر + الربح فقط
  const { filteredEvents, totalEarnings } = useEmployeeOrders({
    employeeId: docId,
    orders
  });

  return (
    <div className="bg-white rounded-xl p-8 text-center shadow text-indigo-700">
      <h2 className="text-2xl font-bold mb-6">{t.title}</h2>
      <div className="flex flex-wrap gap-3 justify-center mb-7">
        <button
          onClick={handleExport}
          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold px-5 py-2 rounded shadow transition"
        >
          {t.export}
        </button>
        <button
          onClick={handleReset}
          className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-5 py-2 rounded shadow transition"
        >
          {t.reset}
        </button>
      </div>

      {/* أرباح الطلبات المنجزة (مكتمل/مرفوض) */}
      <div className="mb-8 p-6 bg-indigo-50 rounded-xl shadow border max-w-2xl mx-auto text-center">
        <h3 className="text-xl font-black text-emerald-700 mb-3">{t.earningsTitle}</h3>
        <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
          <div className="flex flex-col items-center">
            <FaWallet className="text-emerald-600 mb-1" size={26} />
            <div className="text-lg font-bold text-indigo-900">
              {t.ordersCount}: <span className="mx-2 text-emerald-700">{filteredEvents.length}</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <FaCoins className="text-yellow-500 mb-1" size={26} />
            <div className="text-lg font-bold text-indigo-900">
              {t.totalEarnings}: <span className="mx-2 text-emerald-700">{totalEarnings.toFixed(2)} د.إ</span>
            </div>
          </div>
        </div>
        {/* جدول عرض التفاصيل - فقط ربح الموظف */}
        <table className="w-full text-sm border-separate border-spacing-y-1 mt-2">
          <thead>
            <tr>
              <th>{t.orderNum}</th>
              <th>{t.createdAt}</th>
              <th>{t.yourEarning}</th>
              <th>{lang === "ar" ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map(o => (
              <tr key={o.requestId + o.createdAt}>
                <td>{o.requestId}</td>
                <td>{new Date(o.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}</td>
                <td className="font-bold text-emerald-600">{o.earning.toFixed(2)} د.إ</td>
                <td className={`font-bold ${o.status === "completed" ? "text-green-600" : "text-red-600"}`}>
                  {o.status === "completed" ? (lang === "ar" ? "مكتمل" : "Completed") : (lang === "ar" ? "مرفوض" : "Rejected")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مكان فارغ لإنشاء خدمة وربطه لاحقاً */}
      <div className="my-8">
        {/* هنا سيتم إضافة كومبوننت إنشاء خدمة لاحقاً */}
      </div>

      {/* جدول الحضور */}
      {loading ? (
        <div className="text-gray-400">...</div>
      ) : !weeks.length ? (
        <div className="text-gray-400">{t.noData}</div>
      ) : (
        <div className="flex flex-col gap-10">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="mb-2 border border-indigo-100 rounded-xl shadow-sm overflow-x-auto">
              <div className="bg-indigo-50 py-2 font-bold text-lg flex justify-between px-4 items-center">
                <span>
                  {t.week} {wIdx + 1}
                </span>
                <span>
                  {t.totalHours}: <span className="text-indigo-900">{getWeekHours(week).toFixed(2)}</span>
                </span>
              </div>
              <table className="min-w-full bg-white text-base">
                <thead>
                  <tr>
                    <th className="py-2 px-3">{t.day}</th>
                    <th className="py-2 px-3">{t.date}</th>
                    <th className="py-2 px-3">{t.in}</th>
                    <th className="py-2 px-3">{t.out}</th>
                    <th className="py-2 px-3">{t.duration}</th>
                  </tr>
                </thead>
                <tbody>
                  {week.map((entry, i) => (
                    <tr key={i} className={isRestDay(i)
                      ? "bg-gray-50 text-gray-400 font-bold"
                      : "hover:bg-indigo-50 transition"}>
                      <td className="py-2 px-3">{daysNames[i % 7]}</td>
                      <td className="py-2 px-3 font-mono">{entry.date}</td>
                      <td className="py-2 px-3">{isRestDay(i) ? t.rest : (entry.in || "-")}</td>
                      <td className="py-2 px-3">{isRestDay(i) ? t.rest : (entry.out || "-")}</td>
                      <td className="py-2 px-3">
                        {isRestDay(i) ? t.rest : (getDuration(entry.in, entry.out) || "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="font-extrabold text-indigo-900 text-xl mt-4">
            {t.totalHours} الشهر: <span className="text-green-700">{totalMonthHours.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceSection(props) {
  return (
    <Suspense fallback={null}>
      <AttendanceSectionInner {...props} />
    </Suspense>
  );
}

export { AttendanceSection, AttendanceSectionInner };