"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase.client";

// ===== Helper functions =====

// احسب مدة العمل بين in و out بالساعات
function getDuration(inTime, outTime) {
  if (!inTime || !outTime) return 0;
  const [h1, m1] = inTime.split(":").map(Number);
  const [h2, m2] = outTime.split(":").map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return +(mins / 60).toFixed(2); // عدد الساعات (float)
}

// تقسيم الشهر إلى أسابيع (كل أسبوع 7 أيام)
function splitToWeeks(attendanceArr) {
  // ترتيب الحضور تصاعدي حسب التاريخ
  const sorted = [...attendanceArr].sort((a, b) => a.date.localeCompare(b.date));
  // أول يوم في الشهر حسب الداتا
  if (!sorted.length) return [];
  const firstDate = new Date(sorted[0].date);
  const year = firstDate.getFullYear();
  const month = firstDate.getMonth();
  // جميع أيام الشهر
  const allDays = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    allDays.push(date);
  }
  // قسمة الأيام إلى أسابيع
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  // ربط كل يوم ببيانات الحضور لو موجود وإلا فارغ
  return weeks.map(weekDays =>
    weekDays.map(date => sorted.find(a => a.date === date) || { date, in: "", out: "" })
  );
}

// تصدير كـ CSV
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

// ======== Main AttendanceSection Component =========

function AttendanceSection({ employeeData, lang = "ar" }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // ترجمة
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
      noData: "لا يوجد حضور لهذا الشهر."
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
      noData: "No attendance for this month."
    }
  }[lang === "en" ? "en" : "ar"];

  // جلب الحضور مباشرة من الفايرستور (تحديث لحظي)
  useEffect(() => {
    if (!employeeData?.id) return;
    setLoading(true);
    const unsub = onSnapshot(doc(firestore, "users", employeeData.id), (snap) => {
      setAttendance(Array.isArray(snap.data()?.attendance) ? snap.data().attendance : []);
      setLoading(false);
    });
    return () => unsub();
  }, [employeeData?.id]);

  // تصفير الحضور أول كل شهر تلقائياً (يعمل عند أول دخول في الشهر الجديد)
  useEffect(() => {
    if (!employeeData?.id || !attendance.length) return;
    const today = new Date();
    const [last] = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    if (last && last.date) {
      const lastMonth = new Date(last.date).getMonth();
      const currentMonth = today.getMonth();
      // إذا البيانات لأكثر من شهر أو الشهر تغيّر، صفر الداتا
      if (lastMonth !== currentMonth) {
        updateDoc(doc(firestore, "users", employeeData.id), { attendance: [] });
      }
    }
  }, [employeeData?.id, attendance]);

  // تقسيم الشهر إلى أسابيع (كل أسبوع 7 أيام)
  const weeks = splitToWeeks(attendance);

  // احسب ساعات العمل الكلية لكل أسبوع ولكل الشهر
  const getWeekHours = (week) =>
    week.reduce((sum, day) => sum + getDuration(day.in, day.out), 0);
  const totalMonthHours = weeks.reduce((s, w) => s + getWeekHours(w), 0);

  // اسماء الأيام حسب اللغة
  const daysNames = lang === "ar"
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // اجعل يوم الراحة دائماً الجمعة (index 5 في week) أو غيّره كما تريد
  const isRestDay = (i) => i === 5;

  // تصدير كـ CSV
  const handleExport = () => exportToCSV(attendance, lang);

  // تصفير يدوي للشهر (زر)
  const handleReset = async () => {
    if (!employeeData?.id) return;
    if (!window.confirm(lang === "ar"
      ? "هل أنت متأكد من تصفير الحضور لهذا الشهر؟"
      : "Are you sure to reset this month's attendance?")) return;
    await updateDoc(doc(firestore, "users", employeeData.id), { attendance: [] });
  };

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

export { AttendanceSection };