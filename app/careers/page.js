"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const CAREERS = {
  ar: {
    title: "انضم إلى فريق تأهيل",
    intro: "نحن نبحث دائمًا عن المواهب الشغوفة والاحترافية للانضمام إلى رحلة التحول الرقمي الحكومي مع تأهيل. إذا كنت تؤمن بالابتكار، الجودة، وأعلى معايير الأمان، فمكانك معنا!",
    whyUsTitle: "لماذا العمل معنا؟",
    whyUsList: [
      "بيئة عمل رقمية حديثة تدعم التطور الشخصي والمهني.",
      "رواتب تنافسية وحوافز أداء، مع فرص للتطوير المستمر.",
      "مشاريع تقنية متقدمة قائمة على الذكاء الاصطناعي والتحول الرقمي.",
      "ثقافة التنوع والإنصاف والعمل الجماعي.",
      "مقرات في دبي ودول مجلس التعاون الخليجي، مع خيارات عمل عن بعد.",
      "إمكانية التأثير الفعلي في مستقبل الخدمات الحكومية الرقمية.",
    ],
    jobsTitle: "الوظائف المتاحة حالياً",
    jobsEmpty: "لا توجد وظائف شاغرة حالياً. تابعنا دائماً أو أرسل سيرتك الذاتية وسنتواصل عند توفر الفرص.",
    cta: "أرسل سيرتك الذاتية",
    email: "careers@taheel.ae",
    note: "جميع الطلبات سرية وتخضع لمعايير حماية البيانات وأعلى درجات الأمان."
  },
  en: {
    title: "Join the TAHEEL Team",
    intro: "We are always on the lookout for passionate, professional talents to join TAHEEL’s journey in digital government transformation. If you believe in innovation, quality, and the highest standards of security, you belong with us!",
    whyUsTitle: "Why Work With Us?",
    whyUsList: [
      "Modern digital workplace supporting personal and professional growth.",
      "Competitive salaries, performance incentives, and continuous upskilling.",
      "Cutting-edge projects in AI and digital transformation.",
      "Diverse, inclusive, and collaborative team culture.",
      "Locations in Dubai and GCC, plus remote opportunities.",
      "A real chance to shape the future of digital government services.",
    ],
    jobsTitle: "Current Openings",
    jobsEmpty: "No vacancies at the moment. Keep checking or send your CV and we'll contact you when opportunities arise.",
    cta: "Send Your CV",
    email: "careers@taheel.ae",
    note: "All applications are confidential and processed under strict data protection and security standards."
  }
};

export default function CareersPage() {
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";
  const t = CAREERS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "text-right" : "text-left";

  return (
    <section
      dir={dir}
      className="py-14 px-2 sm:px-4 bg-gradient-to-br from-[#17313b]/90 via-[#13242a]/95 to-[#17313b]/80 text-white min-h-screen backdrop-blur-xl"
    >
      <div className="max-w-3xl mx-auto bg-[#0b131e]/90 rounded-3xl p-6 sm:p-10 shadow-2xl border border-[#22304a]/60 space-y-8 transition-all duration-700 hover:shadow-2xl hover:scale-[1.01]">
        <div className="flex justify-center mb-3">
          <Image
            src="/logo-transparent-large.png"
            alt="TAHEEL Logo"
            width={90}
            height={90}
            className="mx-auto rounded-xl shadow-lg border-2 border-emerald-400 bg-white"
            title="TAHEEL Platform"
            priority
          />
        </div>
        <h1 className={`text-3xl md:text-4xl font-extrabold text-emerald-300 drop-shadow mb-2 ${align}`}>
          {t.title}
        </h1>
        <p className={`text-lg md:text-xl font-medium text-gray-100/90 leading-8 mb-4 ${align}`}>{t.intro}</p>

        <div>
          <h2 className={`text-lg sm:text-xl text-emerald-200 font-bold mb-2 ${align}`}>{t.whyUsTitle}</h2>
          <ul className={`list-inside list-disc text-base md:text-lg text-emerald-100/90 font-semibold leading-8 max-w-2xl mx-auto ${align}`}>
            {t.whyUsList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={`text-lg sm:text-xl text-emerald-200 font-bold mb-2 ${align}`}>{t.jobsTitle}</h2>
          <div className="bg-[#13242a]/70 border border-emerald-800/30 text-gray-300 text-base rounded-xl px-5 py-4 mb-4 text-center">
            {t.jobsEmpty}
          </div>
        </div>

        <div className="text-center mt-8">
          <a
            href={`mailto:${t.email}`}
            className="inline-block px-8 py-3 text-white text-lg font-semibold bg-gradient-to-r from-emerald-700 via-emerald-500 to-green-700 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-emerald-400"
            aria-label={t.cta}
          >
            {t.cta}
          </a>
          <div className="text-xs text-gray-400 mt-3">{t.note}</div>
        </div>

        <div className={`text-xs text-gray-400 pt-5 font-medium ${align}`}>
          © {new Date().getFullYear()} TAHEEL. All rights reserved.
        </div>
      </div>
    </section>
  );
}