"use client";
import { useEffect, useState } from "react";
import WeatherTimeWidget from "@/components/WeatherTimeWidget";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { firestore } from "@/lib/firebase.client";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { FaGlobe, FaWhatsapp } from "react-icons/fa";
import { motion } from "framer-motion";
import { GlobalLoader } from "@/components/GlobalLoader"; 

// Force dynamic rendering to prevent static export issues
export const dynamic = 'force-dynamic';

const SECTION_LABELS = {
  resident: { ar: "خدمات المقيمين", en: "Resident Services" },
  nonresident: { ar: "خدمات غير المقيمين", en: "Non-Resident Services" },
  company: { ar: "خدمات الشركات", en: "Company Services" },
  other: { ar: "خدمات أخرى", en: "Other Services" },
};

const LANGS = {
  ar: {
    services: "جميع الخدمات",
    notFound: "لا توجد خدمات متاحة",
    language: "اللغة",
    platform: "تأهيل",
    copyright: "© 2025 تأهيل. جميع الحقوق محفوظة"
  },
  en: {
    services: "All Services",
    notFound: "No services available",
    language: "Language",
    platform: "TAHEEL",
    copyright: "© 2025 TAHEEL. All rights reserved"
  },
};

const SECTIONS = ["resident", "nonresident", "company", "other"];

const ICONS = {
  resident: "/icons/resident.png",
  nonresident: "/icons/non-resident.png",
  company: "/icons/company.png",
  other: "/icons/other.png",
};

export default function ServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") === "en" ? "en" : "ar";
  const sectionFilter = searchParams.get("section") || "";

  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState("");

  // ---- (البحث) ----
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredServices, setFilteredServices] = useState({});
  function normalize(str) {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/\s+/g, "");
  }
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredServices(services);
      return;
    }
    const newFiltered = {};
    SECTIONS.forEach(sec => {
      if (services[sec]) {
        const filtered = Object.entries(services[sec]).filter(([id, service]) => {
          if (service.active === false || service.isActive === false) return false;
          const q = normalize(searchTerm);
          const nameAr = normalize(service.name);
          const nameEn = normalize(service.name_en || "");
          const descAr = normalize(service.description);
          const descEn = normalize(service.description_en || "");
          return (
            nameAr.includes(q) ||
            nameEn.includes(q) ||
            descAr.includes(q) ||
            descEn.includes(q)
          );
        });
        if (filtered.length > 0) {
          newFiltered[sec] = Object.fromEntries(filtered);
        }
      }
    });
    setFilteredServices(newFiltered);
  }, [searchTerm, services]);
  // ---- (انتهى البحث) ----

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      setFirebaseError("");
      try {
        let data = { resident: {}, nonresident: {}, company: {}, other: {} };

        for (const section of SECTIONS) {
          // جلب الدوكيومنت للفئة مباشرة
          const sectionDocRef = doc(firestore, "servicesByClientType", section);
          const sectionDocSnap = await getDoc(sectionDocRef);

          if (sectionDocSnap.exists()) {
            const docData = sectionDocSnap.data();
            // استخراج كل الحقول التي تبدأ بـ service فقط
            Object.entries(docData)
              .filter(([key]) => key.startsWith("service"))
              .forEach(([key, service]) => {
                if (service.active === false || service.isActive === false) return;
                data[section][key] = service;
              });
          }
        }

        setServices(data);
      } catch (e) {
        setFirebaseError(e?.message || "خطأ غير معروف في جلب البيانات من Firestore");
        setServices({});
      }
      setLoading(false);
    }
    fetchServices();
  }, []);

  // تغيير اللغة
  const toggleLang = () => {
    router.replace(`?lang=${lang === "ar" ? "en" : "ar"}${sectionFilter ? `&section=${sectionFilter}` : ""}`);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-b from-[#0b131e] via-[#22304a] to-[#1d4d40] font-sans`} dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* الهيدر */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#06141B]/90 to-[#253745]/80 backdrop-blur border-b border-gray-800 shadow px-2 sm:px-3 py-2 md:py-4 rounded-b-xl w-full">
        <div className="flex flex-col md:flex-row justify-between items-center w-full gap-2 md:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            {/* Logo */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-emerald-500">
              <Image
                src="/logo-transparent-large.png"
                alt="شعار تأهيل"
                width={54}
                height={54}
                className="object-contain"
              />
            </div>
            <div className="text-center space-y-0.5 sm:space-y-1 max-w-xs sm:max-w-md mx-auto">
              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white leading-tight">{LANGS[lang].platform} - TAHEEL</h1>
              <p className="text-xs text-gray-200 font-small">{lang === "ar" ? "لخدمة متابعة المعلومات" : "Information Tracking Service"}</p>
              <p className="text-xs text-gray-300">{lang === "ar" ? "منصة معتمدة لمتابعة المعلومات والمعاملات الحكومية" : "Certified Government Information & Clearance Platform"}</p>
              <p className="text-xs text-gray-400 medium">
                DOCUMENTS CLEARING AND INFORMATIONS GOVERNMENT SERVICES PLATFORM
              </p>
            </div>
          </div>
          {/* Right Side Controls */}
          <div className="flex flex-row items-center gap-2 w-full md:w-auto justify-end md:static">
            <button
              onClick={toggleLang}
              className="text-xs px-2 sm:px-3 py-1 font-semibold bg-[#253745] text-gray-100 border border-gray-700 rounded-full shadow hover:bg-[#11212D] transition transform hover:scale-105 flex items-center gap-2"
            >
              <FaGlobe className="inline-block" />
              {lang === "ar" ? (
                <>
                  🇺🇸 <span>English</span>
                </>
              ) : (
                <>
                  🇦🇪 <span>عربي</span>
                </>
              )}
            </button>
            <WeatherTimeWidget isArabic={lang === "ar"} />
          </div>
        </div>
      </header>

      {/* شريط البحث */}
      <div className="w-full max-w-3xl mx-auto px-2 mt-6 mb-4">
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={lang === "ar" ? "ابحث عن خدمة..." : "Search for a service..."}
          className="w-full py-3 px-5 rounded-full bg-[#14202e] border border-emerald-600 focus:ring-2 focus:ring-emerald-400 text-lg text-emerald-200 placeholder-gray-400 shadow-lg outline-none transition"
          style={{ direction: lang === "ar" ? "rtl" : "ltr", fontWeight: "bold" }}
        />
      </div>

      {/* العنوان */}
      <div className="py-10 text-center">
        <h1 className="text-3xl font-extrabold text-emerald-400 mb-2">{LANGS[lang].services}</h1>
        <p className="text-gray-400 max-w-xl mx-auto">{lang === "ar" ? "خدمات احترافية بأعلى جودة وموثوقية، تخدم جميع العملاء والشركات والزوار في الإمارات والعالم." : "Professional & reliable government services for residents, companies, and visitors in UAE & worldwide."}</p>
      </div>

      {firebaseError && (
        <div className="bg-red-900 text-red-200 text-center p-4 rounded-xl my-4 text-lg font-bold">
          {lang === "ar"
            ? "خطأ في الاتصال بقاعدة البيانات. الرجاء مراجعة الصلاحيات أو الاتصال بالدعم الفني."
            : "Error connecting to database. Please check permissions or contact support."}
          <br />
          <span style={{ fontSize: 12 }}>{firebaseError}</span>
        </div>
      )}

      <div className="flex-1 w-full max-w-6xl mx-auto px-2">
        {loading ? (
          <div className="text-center text-emerald-100 py-20 text-xl font-bold">
            {lang === "ar" ? "جاري تحميل الخدمات..." : "Loading services..."}
          </div>
        ) : (
          SECTIONS.map(sec => (
            <section key={sec} className="mb-16">
              <h2 className="text-xl font-bold text-emerald-300 mb-6 mt-10 text-center" id={sec}>
                {SECTION_LABELS[sec][lang]}
              </h2>
              <div className="w-full flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-7 justify-center w-full">
                  {filteredServices[sec] && Object.keys(filteredServices[sec]).length > 0 ? (
                    Object.entries(filteredServices[sec])
                      .map(([id, service], idx) => (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.07, duration: 0.45, type: "spring" }}
                          className={`
                            group relative flex flex-col items-center w-full max-w-[250px] min-h-[340px] max-h-[340px] mx-auto
                            bg-gradient-to-br from-[#23384e] via-[#19313e] to-[#112126]
                            border border-emerald-700/40 rounded-3xl shadow-xl hover:shadow-emerald-300/30
                            transition-all duration-300 ease-out
                            hover:-translate-y-2 hover:scale-[1.025] cursor-pointer
                            overflow-hidden
                          `}
                          style={{
                            backdropFilter: "blur(3px)",
                            WebkitBackdropFilter: "blur(3px)"
                          }}
                        >
                          {/* أيقونة فقط بدون دائرة ولا ظل ولا حواف */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-emerald-100">
                            <Image
                              src={ICONS[sec] || "/icons/service.png"}
                              alt={sec}
                              width={54}
                              height={54}
                              className="object-contain w-10 h-10 sm:w-14 sm:h-14"
                              draggable={false}
                            />
                          </div>
                          {/* بيانات الخدمة */}
                          <div className="flex-1 flex flex-col items-center w-full px-3 mt-10" dir={lang === "ar" ? "rtl" : "ltr"}>
                            <h3 className="text-lg font-extrabold text-emerald-300 text-center mt-1 mb-1 w-full truncate">
                              {lang === "ar" ? service.name : service.name_en}
                            </h3>
                            <p className="text-[15px] text-gray-200 text-center mb-2 mt-1 min-h-[38px] max-h-[38px] line-clamp-2 overflow-hidden">
                              {lang === "ar" ? service.description : service.description_en}
                            </p>
                            {/* المستندات المطلوبة */}
                            {service.requiredDocuments && service.requiredDocuments.length > 0 && (
                              <div className="w-full my-1 max-h-[60px] overflow-hidden">
                                <span className="block font-bold text-emerald-400 mb-1 text-sm text-center">
                                  {lang === "ar" ? "المستندات المطلوبة" : "Required Documents"}:
                                </span>
                                <ul className="list-inside list-disc text-sm text-gray-300 mx-auto w-fit text-center space-y-1">
                                  {service.requiredDocuments.map((doc, idx) => (
                                    <li key={idx}>{doc}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          {/* زر التقديم */}
                          <button
                            onClick={() => router.push("/login")}
                            className="
                              my-3 w-11/12 py-2 rounded-full font-bold
                              bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400
                              hover:from-emerald-500 hover:to-emerald-400
                              text-gray-900 text-base transition-all duration-200 shadow-md
                              group-hover:scale-105
                              border border-emerald-200/70
                              outline-none focus:ring-2 focus:ring-emerald-400
                            "
                            style={{ cursor: "pointer" }}
                            aria-label={lang === "ar" ? "تقدم الآن" : "Apply Now"}
                          >
                            {lang === "ar" ? "تقدم الآن" : "Apply Now"}
                          </button>
                          {/* Tooltip للبيانات الطويلة */}
                          <div className="absolute inset-0 z-50 items-center justify-center pointer-events-none group-hover:pointer-events-auto hidden group-hover:flex">
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-gray-900 rounded-2xl shadow-2xl p-5 border border-emerald-300 w-[320px] max-w-[95vw] max-h-[70vh] overflow-y-auto transition-all">
                              <h3 className="text-lg font-extrabold text-emerald-700 mb-2 text-center">
                                {lang === "ar" ? service.name : service.name_en}
                              </h3>
                              <p className="text-base text-gray-900 text-center mb-2">
                                {lang === "ar" ? service.description : service.description_en}
                              </p>
                              {service.requiredDocuments && (
                                <>
                                  <span className="font-bold text-emerald-500 text-sm">{lang === "ar" ? "المستندات المطلوبة" : "Required Documents"}:</span>
                                  <ul className="list-inside list-disc text-sm text-gray-700 mb-2 text-right">
                                    {service.requiredDocuments.map((doc, idx) => (
                                      <li key={idx}>{doc}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                              {/* أضف أي بيانات أخرى تريدها هنا */}
                            </div>
                          </div>
                        </motion.div>
                      ))
                  ) : (
                    <div className="text-center text-gray-400 py-10 w-full col-span-full">{LANGS[lang].notFound}</div>
                  )}
                </div>
              </div>
            </section>
          ))
        )}
      </div>

      {/* الفوتر */}
      <footer className="w-full flex flex-col items-center justify-center mt-16 mb-6">
        <Image
          src="/logo-transparent-large.png"
          alt="TAHEEL LOGO"
          width={50}
          height={50}
          className="rounded-full bg-white ring-2 ring-emerald-400 shadow mb-4"
        />
        <div className="text-sm text-gray-400 text-center font-bold">
          {LANGS[lang].copyright}
        </div>
      </footer>

      {/* زر واتساب عائم احترافي مصغر */}
      <a
        href="https://wa.me/971-567858017"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl p-2 text-xl flex items-center justify-center transition-all duration-200 border-2 border-white"
        title={lang === "ar" ? "تواصل عبر واتساب" : "Contact via WhatsApp"}
        style={{
          boxShadow:
            "0 4px 24px 0 rgba(16,185,129,0.28), 0 1.5px 4px 0 rgba(0,0,0,0.06)",
        }}
        aria-label="WhatsApp"
      >
        <FaWhatsapp />
      </a>
    </div>
  );
}