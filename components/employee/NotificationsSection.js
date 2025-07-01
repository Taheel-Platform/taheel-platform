"use client";
export default function NotificationsSection({ userId, lang }) {
  return (
    <div className="bg-white rounded-xl p-8 text-center shadow text-indigo-700">
      <h2 className="text-2xl font-bold mb-4">{lang === "ar" ? "إشعاراتي" : "Notifications"}</h2>
      <div>هذه الصفحة ستحتوي الإشعارات لاحقاً.</div>
    </div>
  );
}