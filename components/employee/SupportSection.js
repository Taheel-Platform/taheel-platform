"use client";
export default function SupportSection({ employeeId, lang }) {
  return (
    <div className="bg-white rounded-xl p-8 text-center shadow text-indigo-700">
      <h2 className="text-2xl font-bold mb-4">{lang === "ar" ? "الدعم الفني" : "Support"}</h2>
      <div>هذه الصفحة ستحتوي الدعم الفني لاحقاً.</div>
    </div>
  );
}