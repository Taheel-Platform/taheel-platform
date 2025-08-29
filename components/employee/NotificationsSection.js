import { useEffect, useState } from "react";
import EmployeeMessenger from "../EmployeeMessenger";

export default function NotificationsSection({ userId, employeeName, lang }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      // هنا ممكن تجيب الإشعارات من قاعدة البيانات وتغير loading
      setLoading(false);
    }
  }, [userId]);

  if (!userId || loading) {
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