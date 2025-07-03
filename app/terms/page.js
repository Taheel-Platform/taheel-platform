"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

const PRIVACY = {
  ar: {
    title: "سياسة الخصوصية لمنصة تأهيل",
    intro: "نحن في \"تأهيل\" ملتزمون بحماية خصوصيتك وضمان سرية وأمان معلوماتك الشخصية باستخدام أحدث التقنيات العالمية وأدوات الذكاء الاصطناعي المتقدمة. تهدف هذه السياسة إلى توضيح كيفية جمع واستخدام وحماية بياناتك، وما هي حقوقك، وكيف نلتزم بمعايير الأمان والشفافية.",
    sections: [
      {
        heading: "1. جمع المعلومات",
        content: [
          "نجمع المعلومات التي تقدمها عند التسجيل أو استخدام خدماتنا (الاسم، رقم الهوية، البريد الإلكتروني، رقم الهاتف، بيانات الشركة).",
          "يتم جمع معلومات تقنية تلقائيًا (عنوان الـIP، نوع الجهاز والمتصفح، نظام التشغيل، الموقع الجغرافي التقريبي، وملفات تعريف الارتباط Cookies).",
          "نحلل بيانات الاستخدام وسجلات التفاعل مع الموقع لغرض التحسين وتحليل الأداء.",
          "نستخدم أدوات الذكاء الاصطناعي لتحليل البيانات واكتشاف الاحتيال أو الأنشطة غير القانونية."
        ]
      },
      {
        heading: "2. استخدام البيانات",
        content: [
          "معالجة وإنجاز المعاملات الحكومية عبر المنصة.",
          "تقديم الدعم الفني، وتخصيص تجربة المستخدم.",
          "تحليل البيانات وتحسين الخدمات باستخدام الذكاء الاصطناعي.",
          "إرسال الإشعارات والتنبيهات والتحديثات المتعلقة بالخدمات.",
          "حماية الموقع والمستخدمين من الهجمات الإلكترونية أو محاولات الاحتيال."
        ]
      },
      {
        heading: "3. حماية المعلومات والأمان",
        content: [
          "تخزين ونقل البيانات يتم بتشفير قوي (AES-256، SSL/TLS).",
          "مراقبة مستمرة، واختبارات اختراق دورية، واستخدام حلول الأمن السحابي.",
          "توظيف خوارزميات ذكاء اصطناعي لرصد أي أنشطة مشبوهة بشكل لحظي.",
          "الوصول للبيانات مقيد للأشخاص المخولين فقط ووفق سياسات صارمة."
        ]
      },
      {
        heading: "4. مشاركة البيانات والإفصاح",
        content: [
          "لا نشارك بياناتك مع أي جهة خارجية إلا بموافقتك أو للمتطلبات القانونية أو مع شركاء موثوقين ملتزمين بنفس معايير الأمان والسرية.",
          "نستخدم بيانات مجمعة أو مجهولة الهوية لأغراض البحث أو الإحصاء دون كشف هويتك."
        ]
      },
      {
        heading: "5. الذكاء الاصطناعي والتحليل الآلي",
        content: [
          "تستخدم المنصة تقنيات الذكاء الاصطناعي في تحليل البيانات وأتمتة العمليات وخدمة الدعم الذكي.",
          "لا يتم اتخاذ قرارات آلية تؤثر على حقوق المستخدم مباشرة بدون تدخل بشري."
        ]
      },
      {
        heading: "6. ملفات تعريف الارتباط (Cookies) والتتبع",
        content: [
          "نستخدم ملفات الكوكيز لتحسين الأداء وتذكر تفضيلاتك وتحليل استخدام المنصة.",
          "يمكنك التحكم في الكوكيز من خلال إعدادات المتصفح."
        ]
      },
      {
        heading: "7. حماية الأطفال",
        content: [
          "خدماتنا موجهة للأشخاص فوق 18 سنة.",
          "لا نجمع عمدًا بيانات الأطفال."
        ]
      },
      {
        heading: "8. حقوق المستخدم",
        content: [
          "يمكنك الوصول إلى بياناتك أو تحديثها أو طلب حذفها في أي وقت.",
          "يحق لك الاعتراض على معالجة بياناتك أو طلب تقييد الاستخدام أو نقل بياناتك لمنصة أخرى."
        ]
      },
      {
        heading: "9. النقل الدولي للمعلومات",
        content: [
          "قد تتم معالجة بياناتك على خوادم في دول أخرى مع التزامنا بمعايير الحماية العالمية (GDPR، ISO 27001)."
        ]
      },
      {
        heading: "10. التحديثات على السياسة",
        content: [
          "قد نقوم بتحديث هذه السياسة من وقت لآخر وسيتم إشعارك بأي تغييرات جوهرية."
        ]
      },
      {
        heading: "11. التواصل معنا",
        content: [
          "لأي استفسار أو طلب بخصوص الخصوصية: info@taheel.ae"
        ]
      }
    ]
  },
  en: {
    title: "TAHEEL Privacy Policy",
    intro: "At TAHEEL, we are committed to protecting your privacy and ensuring the confidentiality and security of your personal information using world-class security and advanced artificial intelligence technologies. This policy explains how we collect, use, and protect your data, your rights, and our security and transparency standards.",
    sections: [
      {
        heading: "1. Data Collection",
        content: [
          "We collect information you provide when registering or using our services (name, ID, email, phone, company data).",
          "Technical information is automatically collected (IP address, device/browser type, operating system, approximate geolocation, and cookies).",
          "We analyze usage data and site interaction logs for performance improvement and analytics.",
          "We use AI tools to analyze data and detect fraud or illegal activities."
        ]
      },
      {
        heading: "2. Data Usage",
        content: [
          "Processing and completing government transactions through the platform.",
          "Providing technical support and personalizing user experience.",
          "Data analytics and service improvement using artificial intelligence.",
          "Sending notifications, alerts, and service updates.",
          "Protecting the site and users from cyberattacks or fraud attempts."
        ]
      },
      {
        heading: "3. Data Security & Protection",
        content: [
          "All data is stored and transmitted using strong encryption (AES-256, SSL/TLS).",
          "Continuous monitoring, regular penetration testing, and use of cloud security solutions.",
          "AI-powered algorithms monitor for suspicious activity in real-time.",
          "Data access is restricted to authorized personnel under strict policies."
        ]
      },
      {
        heading: "4. Data Sharing & Disclosure",
        content: [
          "Your data is not shared with third parties except with your consent, to comply with legal requirements, or with trusted partners who adhere to our security standards.",
          "Aggregated or anonymized data may be used for research or statistics without revealing your identity."
        ]
      },
      {
        heading: "5. Artificial Intelligence & Automated Analysis",
        content: [
          "The platform uses AI technologies for data analytics, workflow automation, and smart support.",
          "No automated decisions affecting user rights are made without human review."
        ]
      },
      {
        heading: "6. Cookies & Tracking",
        content: [
          "We use cookies to enhance performance, remember preferences, and analyze platform usage.",
          "You can control cookies via your browser settings."
        ]
      },
      {
        heading: "7. Child Protection",
        content: [
          "Our services are intended for users over 18 years old.",
          "We do not knowingly collect children’s data."
        ]
      },
      {
        heading: "8. User Rights",
        content: [
          "You may access, update, or request deletion of your data at any time.",
          "You have the right to object to processing, request restriction, or transfer your data to another platform."
        ]
      },
      {
        heading: "9. International Data Transfer",
        content: [
          "Your data may be processed on servers in other countries in compliance with global standards (GDPR, ISO 27001)."
        ]
      },
      {
        heading: "10. Policy Updates",
        content: [
          "We may update this policy periodically and will notify you of any material changes."
        ]
      },
      {
        heading: "11. Contact Us",
        content: [
          "For any privacy inquiries or requests: info@taheel.ae"
        ]
      }
    ]
  }
};

function TermsPageInner() {
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";
  const t = PRIVACY[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = lang === "ar" ? "text-right" : "text-left";

  return (
    <section dir={dir} className="py-14 px-2 sm:px-4 bg-gradient-to-br from-[#17313b]/90 via-[#13242a]/95 to-[#17313b]/80 text-white min-h-screen backdrop-blur-xl">
      <div className="max-w-3xl mx-auto bg-[#0b131e]/85 rounded-3xl p-6 sm:p-10 shadow-2xl border border-[#22304a]/60 space-y-8 transition-all duration-700 hover:shadow-2xl hover:scale-[1.01]">
        <div className="flex justify-center mb-2">
          <Image
            src="/logo-transparent-large.png"
            alt="TAHEEL Logo"
            width={88}
            height={88}
            className="mx-auto rounded-xl shadow-lg border-2 border-emerald-400 bg-white"
            title="TAHEEL Platform"
            priority
          />
        </div>
        <h1 className={`text-2xl md:text-3xl font-extrabold text-emerald-300 drop-shadow mb-3 ${align}`} tabIndex={0}>
          {t.title}
        </h1>
        <p className={`text-base md:text-lg font-medium text-gray-100/90 leading-8 mb-4 ${align}`}>
          {t.intro}
        </p>
        <div className="space-y-7">
          {t.sections.map((sec, i) => (
            <div key={i}>
              <h2 className={`text-emerald-200 text-lg font-bold mb-2 ${align}`}>{sec.heading}</h2>
              <ul className={`list-disc list-inside space-y-1 text-emerald-100/90 ${align}`}>
                {sec.content.map((line, idx) => (
                  <li key={idx} className="text-gray-200 text-base">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={`text-xs text-gray-400 pt-6 font-medium ${align}`}>
          © {new Date().getFullYear()} TAHEEL. All rights reserved.
        </div>
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={null}>
      <TermsPageInner />
    </Suspense>
  );
}