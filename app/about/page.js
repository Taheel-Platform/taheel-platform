'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ABOUT = {
  ar: {
    title: "عن تأهيل – المنصة الحكومية الذكية المعتمدة عالميًا",
    intro: "تأهيل هي البوابة الرقمية الرائدة في الإمارات لإنجاز المعاملات الحكومية بسرعة وأمان وشفافية. معتمدة من الجهات الحكومية في دبي وموثوقة عالميًا، تمكّن تأهيل الأفراد والمستثمرين والشركات من تنفيذ المعاملات الرسمية وتتبع الطلبات لحظيًا وإدارة جميع الإجراءات الحكومية بنقرة واحدة.",
    list: [
      "تتبع كامل للمعاملات (الإقامة، التأشيرات، تأسيس الشركات، التصديقات) من البداية للنهاية.",
      "منصة رقمية معتمدة حكوميًا وحاصلة على شهادات ISO ومحميّة بحقوق النشر DMCA.",
      "دعم مباشر وفوري وخدمة متعددة اللغات (العربية والإنجليزية).",
      "أمان متقدم للبيانات وأرشفة رقمية مشفرة وبنية سحابية تركز على الخصوصية.",
      "ثقة آلاف العملاء والشركات والشركاء في الإمارات والعالم."
    ],
    confidence: "مع تأهيل، أصبحت معاملاتك الحكومية رقمية وآمنة ومتاحة في أي وقت ومن أي مكان. اختبر مستقبل الحكومة الذكية — سرعة، احترافية، وثقة عالمية.",
    cta: "سجّل الآن",
    seo: "تلتزم تأهيل بالابتكار الرقمي، وحماية البيانات، وتقديم أعلى معايير الخدمات الحكومية إلكترونيًا حول العالم. المقر الرئيسي: دبي، الإمارات."
  },
  en: {
    title: "About TAHEEL – The Trusted Global Government Services Platform",
    intro: "TAHEEL is the UAE’s leading digital gateway for fast, secure, and transparent government services. Certified by Dubai authorities and trusted worldwide, TAHEEL empowers individuals, investors, and businesses to process official documents, track requests in real-time, and manage essential government transactions with just a click.",
    list: [
      "Seamless end-to-end tracking for visas, residencies, business formation, and legalizations.",
      "Government-certified, ISO-accredited, and DMCA-protected digital platform.",
      "Instant online customer support and multi-language service (Arabic & English).",
      "Advanced data security with encrypted document archiving and privacy-first cloud infrastructure.",
      "Trusted by thousands of clients and partners across the Middle East and beyond."
    ],
    confidence: "With TAHEEL, government transactions are digitized, secure, and accessible anytime, anywhere. Experience the future of e-government — fast, professional, and truly global.",
    cta: "Get Started Today",
    seo: "TAHEEL is committed to digital innovation, data privacy, and delivering the highest standards of government transaction services globally. Headquartered in Dubai, UAE."
  }
};

export default function AboutPage() {
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";
  const t = ABOUT[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "text-right" : "text-left";

  return (
    <section dir={dir} className="py-14 px-2 sm:px-4 bg-gradient-to-br from-[#17313b]/90 via-[#13242a]/95 to-[#17313b]/80 text-white text-center min-h-screen backdrop-blur-xl">
      <div className="max-w-3xl mx-auto bg-[#0b131e]/85 rounded-3xl p-6 sm:p-10 shadow-2xl border border-[#22304a]/60 space-y-8 transition-all duration-700 hover:shadow-2xl hover:scale-[1.01]">
        <div className="flex justify-center">
          <Image
            src="/logo-transparent-large.png"
            alt="TAHEEL Logo"
            width={96}
            height={96}
            className="mx-auto rounded-xl shadow-lg border-2 border-emerald-400 bg-white"
            title="TAHEEL Platform"
            priority
          />
        </div>
        <h1 className={`text-3xl md:text-4xl font-extrabold text-emerald-300 drop-shadow mb-3 ${align}`} tabIndex={0}>
          {t.title}
        </h1>
        <p className={`text-lg md:text-xl font-medium text-gray-100/90 leading-8 mb-3 ${align}`}>
          {t.intro}
        </p>
        <ul className={`text-base md:text-lg text-emerald-100/90 font-semibold leading-7 mb-6 list-inside list-disc mx-auto max-w-2xl ${align}`}>
          {t.list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <div className={`text-gray-200/90 text-base md:text-lg mt-3 ${align}`}>
          {t.confidence}
        </div>
        <div className="flex flex-wrap justify-center items-center gap-4 mt-7">
          <Image src="/logos/iso-9001.png" alt="ISO 9001" width={42} height={32} className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition" />
          <Image src="/logos/iso-27001.png" alt="ISO 27001" width={42} height={32} className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition" />
          <Image src="/logos/dmca.png" alt="DMCA Protected" width={42} height={32} className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition" />
          <Image src="/logos/google-business.png" alt="Google Business Profile" width={42} height={32} className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition" />
          <Image src="/logos/trustpilot.png" alt="Trustpilot Reviews" width={42} height={32} className="h-8 w-auto object-contain grayscale hover:grayscale-0 transition" />
        </div>
        <div className="mt-8">
          <Link href={lang === "ar" ? "/register?lang=ar" : "/register?lang=en"} aria-label={t.cta}>
            <button className="cursor-pointer px-8 py-3 text-white text-lg font-semibold bg-gradient-to-r from-emerald-700 via-emerald-500 to-green-700 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-emerald-400">
              {t.cta}
            </button>
          </Link>
        </div>
        <div className={`text-xs text-gray-400 pt-5 font-medium ${align}`}>
          {t.seo}
        </div>
      </div>
    </section>
  );
}