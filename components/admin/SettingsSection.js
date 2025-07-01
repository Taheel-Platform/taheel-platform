export default function SettingsSection({ lang }) {
  return (
    <div className="bg-white/80 rounded-xl shadow p-8 text-xl font-bold text-gray-800">
      {lang === "ar" ? "الإعدادات" : "Settings"}
    </div>
  );
}