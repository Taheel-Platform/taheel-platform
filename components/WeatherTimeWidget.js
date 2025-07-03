"use client";
import { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

// مراحل القمر كإيموجي (8 مراحل رئيسية)
const moonPhases = [
  "🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"
];

// تحديد مرحلة القمر بشكل تقريبي
function getMoonPhaseEmoji(date) {
  const synodicMonth = 29.53058867;
  const knownNewMoon = new Date("2000-01-06T18:14:00Z");
  const diff = date - knownNewMoon;
  const days = diff / (1000 * 60 * 60 * 24);
  const phase = Math.floor((days % synodicMonth) / (synodicMonth / moonPhases.length));
  return moonPhases[phase];
}

// إيموجي الشمس حسب أوقات اليوم
function getSunEmoji(hour) {
  if (hour >= 5 && hour < 7) return "🌅";
  if (hour >= 7 && hour < 17) return "☀️";
  if (hour >= 17 && hour < 19) return "🌇";
  if (hour >= 19 || hour < 5) return "🌙";
  return "☀️";
}

const CITY = "Dubai";
const TIMEZONE = "Asia/Dubai";

export default function WeatherTimeWidget({ isArabic }) {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isDay, setIsDay] = useState(true);
  const [sunEmoji, setSunEmoji] = useState("☀️");
  const [moonEmoji, setMoonEmoji] = useState("🌑");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: TIMEZONE,
      };
      const dateOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        timeZone: TIMEZONE,
      };
      setCurrentTime(now.toLocaleTimeString("en-US", options));
      setCurrentDate(now.toLocaleDateString("en-US", dateOptions));
      const hour = +now.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: TIMEZONE });
      setIsDay(hour >= 6 && hour < 18);
      setSunEmoji(getSunEmoji(hour));
      setMoonEmoji(getMoonPhaseEmoji(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center px-5 py-3 rounded-2xl shadow-lg border text-gray-100 text-sm font-medium bg-gradient-to-r 
      ${isDay ? "from-blue-400 to-blue-700 border-blue-400" : "from-gray-900 to-blue-900 border-gray-700"} backdrop-blur-md`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{sunEmoji}</span>
        <span className="font-bold text-lg tracking-widest font-mono drop-shadow">{currentTime}</span>
        <span className="text-2xl">{moonEmoji}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{isArabic ? (CITY === "Dubai" ? "دبي" : CITY) : CITY}</span>
        <span className="text-gray-300">|</span>
        <span className="text-[11px]">{currentDate}</span>
        <span className="text-gray-400 text-[11px]">({TIMEZONE})</span>
      </div>
    </div>
  );
}