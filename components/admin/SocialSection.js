"use client";
import { useState } from "react";
import {
  FaFacebook, FaInstagram, FaTwitter, FaYoutube, FaTiktok,
  FaSnapchat, FaLinkedin, FaPlus, FaTrash, FaEdit, FaCheck, FaTimes,
  FaRegImage, FaVideo
} from "react-icons/fa";

// --- بيانات حسابات السوشيال
const SOCIALS_META = {
  facebook:   { labelAr: "فيسبوك",   labelEn: "Facebook",   color: "bg-[#e8f0fe]", text: "text-[#1877f2]", icon: <FaFacebook /> },
  instagram:  { labelAr: "انستجرام", labelEn: "Instagram",  color: "bg-[#fce7f3]", text: "text-[#e1306c]", icon: <FaInstagram /> },
  twitter:    { labelAr: "تويتر",    labelEn: "Twitter",    color: "bg-[#e0f2fe]", text: "text-[#1da1f2]", icon: <FaTwitter /> },
  youtube:    { labelAr: "يوتيوب",   labelEn: "YouTube",    color: "bg-[#fee2e2]", text: "text-[#ff0000]", icon: <FaYoutube /> },
  tiktok:     { labelAr: "تيك توك",  labelEn: "TikTok",     color: "bg-[#f3f3f3]", text: "text-black",      icon: <FaTiktok /> },
  snapchat:   { labelAr: "سناب شات", labelEn: "Snapchat",   color: "bg-[#fef9c3]", text: "text-[#fffc00]", icon: <FaSnapchat /> },
  linkedin:   { labelAr: "لينكدإن",  labelEn: "LinkedIn",   color: "bg-[#e0e7ef]", text: "text-[#0a66c2]", icon: <FaLinkedin /> },
};

const INIT_SOCIALS = [
  { key: "facebook", url: "" },
  { key: "instagram", url: "" },
  { key: "twitter", url: "" },
  { key: "youtube", url: "" },
  { key: "tiktok", url: "" },
  { key: "snapchat", url: "" },
  { key: "linkedin", url: "" },
];

// --- الكومبوننت الرئيسي
export default function SocialSection({ lang = "ar" }) {
  // إدارة الحسابات
  const [socials, setSocials] = useState(INIT_SOCIALS);
  const [editIdx, setEditIdx] = useState(null);
  const [editUrl, setEditUrl] = useState("");
  const [newItem, setNewItem] = useState({ key: "", url: "" });

  // النشر الموحد
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // --- إدارة الحسابات (تعديل/حذف/إضافة)
  const handleSave = (idx) => {
    if (!editUrl?.trim()) return;
    setSocials(socials.map((s, i) => i === idx ? { ...s, url: editUrl } : s));
    setEditIdx(null);
    setEditUrl("");
  };
  const handleDelete = (idx) => setSocials(socials.filter((_, i) => i !== idx));
  const handleAdd = () => {
    if (!newItem.key || !newItem.url) return;
    setSocials([...socials, { ...newItem }]);
    setNewItem({ key: "", url: "" });
  };
  const getTextColor = (key) => (SOCIALS_META[key]?.text || "text-gray-700");

  // --- نشر موحد
  function handleSelectPlatform(key) {
    setPlatforms(platforms.includes(key)
      ? platforms.filter(k => k !== key)
      : [...platforms, key]
    );
  }
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMedia(file);
    setMediaType(file.type.startsWith("video") ? "video" : "image");
  }
  function handleRemoveMedia() {
    setMedia(null);
    setMediaType("");
  }
  async function handlePublish() {
    if (!text && !media) return;
    if (platforms.length === 0) return;
    setLoading(true);
    setResult(null);

    // هنا تضع كود النشر الخاص بك (API)
    setTimeout(() => {
      setLoading(false);
      setResult({ success: true, message: lang === "ar" ? "تم النشر بنجاح (تجريبي)" : "Posted successfully (mocked)" });
    }, 1500);
  }

  // --- واجهة المستخدم
  return (
    <div className="w-full max-w-5xl mx-auto px-2 py-10">
      {/* عنوان الصفحة */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-700 dark:text-emerald-300 tracking-tight mb-2">
          {lang === "ar" ? "لوحة تحكم السوشيال ميديا" : "Social Media Control Panel"}
        </h1>
        <p className="text-gray-500 dark:text-gray-300 text-lg">
          {lang === "ar"
            ? "تحكم كامل في حسابات وروابط السوشيال ميديا مع إمكانية النشر الموحد"
            : "Full control of your social media links and unified publishing"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* إدارة روابط الحسابات */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-white dark:from-[#192c2f] dark:via-[#12181d] dark:to-[#12181d] rounded-2xl shadow-lg p-6 md:p-8 border border-emerald-100 dark:border-emerald-800 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-emerald-700 dark:text-emerald-300 text-center">
            {lang === "ar" ? "إدارة حسابات وروابط السوشيال ميديا" : "Manage Social Media Links"}
          </h2>
          {/* نفس SocialSection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {socials.map((s, idx) => {
              const meta = SOCIALS_META[s.key] || {};
              return (
                <div
                  key={s.key + idx}
                  className={`flex items-center gap-3 px-4 py-4 rounded-xl shadow border transition
                    ${meta.color || "bg-gray-50"} dark:bg-[#171e24]`}
                >
                  <span className={`text-3xl ${getTextColor(s.key)}`}>{meta.icon || <FaPlus />}</span>
                  <span className="font-bold flex-1 text-lg text-gray-900 dark:text-gray-200">
                    {lang === "ar" ? meta.labelAr || s.key : meta.labelEn || s.key}
                  </span>
                  {editIdx === idx ? (
                    <>
                      <input
                        type="url"
                        className="border focus:ring-2 focus:ring-emerald-400 rounded px-2 py-1 text-xs flex-1"
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        placeholder={lang === "ar" ? "أدخل الرابط..." : "Enter URL..."}
                        style={{ minWidth: 100 }}
                      />
                      <button className="ml-1 text-green-600" title={lang==="ar"?"حفظ":"Save"} onClick={() => handleSave(idx)}>
                        <FaCheck />
                      </button>
                      <button className="ml-1 text-gray-400" title={lang==="ar"?"إلغاء":"Cancel"} onClick={() => {setEditIdx(null); setEditUrl("");}}>
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href={s.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-bold underline transition ${s.url ? "text-emerald-700 hover:text-emerald-900" : "text-gray-400 cursor-not-allowed"}`}
                        title={s.url || ""}
                      >
                        {lang === "ar" ? (s.url ? "زيارة" : "لا يوجد رابط") : (s.url ? "Visit" : "No link")}
                      </a>
                      <button
                        className="ml-1 text-blue-600 hover:text-blue-800"
                        title={lang==="ar"?"تعديل":"Edit"}
                        onClick={() => {setEditIdx(idx); setEditUrl(s.url);}}
                      ><FaEdit /></button>
                      <button
                        className="ml-1 text-red-600 hover:text-red-800"
                        title={lang==="ar"?"حذف":"Delete"}
                        onClick={() => handleDelete(idx)}
                      ><FaTrash /></button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* إضافة جديد */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 p-4 border-t bg-gradient-to-l from-emerald-50 dark:from-[#192c2f]">
            <select
              className="border rounded px-2 py-1 flex-1 bg-white dark:bg-[#12181d]"
              value={newItem.key}
              onChange={e => setNewItem({ ...newItem, key: e.target.value })}
            >
              <option value="">{lang==="ar"?"اختر الشبكة":"Select Network"}</option>
              {Object.entries(SOCIALS_META).map(([k, v]) =>
                socials.some(s => s.key === k) ? null : (
                  <option key={k} value={k}>{lang==="ar"?v.labelAr:v.labelEn}</option>
                )
              )}
            </select>
            <input
              type="url"
              className="border rounded px-2 py-1 flex-1"
              placeholder={lang==="ar"?"رابط الحساب":"Account URL"}
              value={newItem.url}
              onChange={e => setNewItem({ ...newItem, url: e.target.value })}
            />
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-bold flex items-center gap-1"
              onClick={handleAdd}
            >
              <FaPlus /> {lang==="ar"?"إضافة":"Add"}
            </button>
          </div>
          <div className="text-xs text-center text-gray-400 mt-4">
            {lang==="ar"
              ? "يمكنك تعديل أو حذف أو إضافة جميع حسابات السوشيال ميديا من هنا بكل سهولة."
              : "You can manage, edit, or add all your social media accounts easily here."
            }
          </div>
        </div>

        {/* النشر الموحد */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-white dark:from-[#192c2f] dark:via-[#12181d] dark:to-[#12181d] rounded-2xl shadow-lg p-6 md:p-8 border border-emerald-100 dark:border-emerald-800 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-emerald-700 dark:text-emerald-300 text-center">
            {lang === "ar" ? "نشر موحد على كل المنصات" : "Unified Multi-Platform Publishing"}
          </h2>
          <textarea
            className="w-full border rounded p-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-[#171e24] mb-3 focus:ring-2 focus:ring-emerald-400 font-medium"
            rows={4}
            maxLength={240}
            placeholder={lang === "ar" ? "اكتب نص البوست هنا..." : "Write your post here..."}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="mb-4">
            <div className="font-bold mb-2 text-gray-700 dark:text-gray-200">{lang === "ar" ? "اختار المنصات:" : "Choose Platforms:"}</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SOCIALS_META).map(([key, meta]) => (
                <button
                  type="button"
                  key={key}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full font-bold shadow transition text-sm border
                    ${platforms.includes(key)
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : `${meta.color} ${key === "tiktok" ? "text-black" : "text-gray-700"} border-gray-200 hover:bg-emerald-50"`}
                  `}
                  onClick={() => handleSelectPlatform(key)}
                >
                  {meta.icon} {lang === "ar" ? meta.labelAr : meta.labelEn}
                </button>
              ))}
            </div>
          </div>
          {/* صورة/فيديو */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer text-blue-700 font-bold">
                <FaRegImage /> {lang === "ar" ? "إرفاق صورة" : "Attach Image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-red-600 font-bold">
                <FaVideo /> {lang === "ar" ? "إرفاق فيديو" : "Attach Video"}
                <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
              </label>
              {media &&
                <button className="ml-2 text-gray-400 hover:text-red-600" onClick={handleRemoveMedia}>
                  <FaTimes /> {lang === "ar" ? "إزالة" : "Remove"}
                </button>
              }
            </div>
            {media &&
              <div className="mt-2">
                {mediaType === "image" &&
                  <img
                    src={URL.createObjectURL(media)}
                    alt="preview"
                    className="max-w-[180px] max-h-[120px] rounded shadow"
                  />
                }
                {mediaType === "video" &&
                  <video className="max-w-[180px] max-h-[120px] rounded shadow" controls>
                    <source src={URL.createObjectURL(media)} />
                  </video>
                }
              </div>
            }
          </div>
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-bold w-full flex items-center justify-center gap-2 text-lg transition mb-2"
            disabled={loading || (!text && !media) || platforms.length === 0}
            onClick={handlePublish}
          >
            {loading ? (lang === "ar" ? "جاري النشر..." : "Publishing...") : (lang === "ar" ? "انشر الآن" : "Publish Now")}
          </button>
          {result &&
            <div className={`mt-2 text-center font-bold ${result.success ? "text-green-700" : "text-red-700"}`}>
              {result.message}
            </div>
          }
          <div className="text-xs text-gray-400 mt-5 text-center">
            {lang === "ar"
              ? "سيتم قريبًا ربط النشر المباشر مع كل منصة تلقائيًا بمجرد ربط الـ API الخاص بك."
              : "Soon you will be able to connect each platform's API for direct publishing."}
          </div>
        </div>
      </div>
    </div>
  );
}