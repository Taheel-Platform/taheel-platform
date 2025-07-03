"use client";
export default function CompaniesSection({ lang }) {
  return (
    <div className="bg-white/80 rounded-xl shadow p-8 text-xl font-bold text-blue-800">
      {lang === "ar" ? "إدارة الشركات" : "Companies Management"}
    </div>
  );
}