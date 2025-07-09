"use client";
import EmployeeMessenger from "../EmployeeMessenger";

export default function NotificationsSection({ userId, employeeName, lang }) {
  if (!userId) {
    return (
      <div className="bg-white rounded-xl p-8 text-center shadow text-indigo-700">
        <h2 className="text-2xl font-bold mb-4">
          {lang === "ar" ? "إشعاراتي" : "Notifications"}
        </h2>
        <div>...جاري تحميل بيانات الموظف</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-8 text-center shadow text-indigo-700">
      <h2 className="text-2xl font-bold mb-4">
        {lang === "ar" ? "إشعاراتي" : "Notifications"}
      </h2>
      <div>هذه المنصة ستمنحك إشعارات لاحقاً</div>
      <div className="mt-8">
        <EmployeeMessenger
          userId={userId}
          employeeName={employeeName}
          lang={lang}
        />
      </div>
    </div>
  );
}